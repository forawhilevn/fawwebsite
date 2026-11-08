const fs = require('fs');
const storage = require('../../utils/storage');
const path = require('path');
const db = require('../../db');
const { cropToFixedSize } = require('../../utils/imageProcess');
const { ensureStoreSchema } = require('../../services/storeSchema');
const { imageList } = require('../../utils/stores');

const MAX_IMAGES = 5;

function clean(v, max) {
  return String(v || '').trim().slice(0, max);
}

function removeUploadedFile(url) {
  if (url && url.startsWith('/images/uploads/')) {
    storage.remove(url);
  }
}

function fromBody(b) {
  return {
    type: 'store',
    name_vi: clean(b.nameVi, 200),
    name_en: clean(b.nameEn, 200) || null,
    city: clean(b.city, 100) || null,
    address: clean(b.address, 400) || null,
    phone: clean(b.phone, 50) || null,
    hours: clean(b.hours, 200) || null,
    maps_url: clean(b.mapsUrl, 600) || null,
    lat_lng: clean(b.latLng, 60) || null,
    instagram: clean(b.instagram, 200) || null,
    facebook: clean(b.facebook, 300) || null,
    note_vi: clean(b.noteVi, 600) || null,
    note_en: clean(b.noteEn, 600) || null,
    is_closed: b.isClosed === '1'
  };
}

async function render(res, extra) {
  await ensureStoreSchema();
  const stores = await db('stores').orderBy('sort_order').orderBy('id');
  res.render('admin/stores', Object.assign({
    title: 'Cửa hàng - FAW Admin',
    stores,
    editing: null,
    error: null
  }, extra || {}));
}

async function listStores(req, res, next) {
  try {
    let editing = null;
    if (req.query.sua) {
      await ensureStoreSchema();
      editing = await db('stores').where({ id: req.query.sua }).first() || null;
    }
    await render(res, { editing });
  } catch (err) {
    next(err);
  }
}

function filesOf(req) { return Array.isArray(req.files) ? req.files : []; }

function discard(files) {
  files.forEach((f) => removeUploadedFile('/images/uploads/stores/' + f.filename));
}

// Crops the new uploads (4:5) and merges them with the images kept from before.
async function buildImages(existing, files, removeList) {
  const keep = existing.filter((u) => removeList.indexOf(u) === -1);
  const added = [];
  for (const f of files) {
    await cropToFixedSize(f.path, 'store');
    added.push('/images/uploads/stores/' + f.filename);
  }
  const all = keep.concat(added);
  if (all.length > MAX_IMAGES) {
    added.forEach(removeUploadedFile);
    const err = new Error('too_many');
    err.code = 'TOO_MANY';
    throw err;
  }
  return all;
}

function imageFields(all) {
  return { images: all.length ? JSON.stringify(all) : null, image_url: all[0] || null };
}

function imageError(err) {
  return err && err.code === 'TOO_MANY'
    ? 'Tối đa ' + MAX_IMAGES + ' ảnh cho mỗi cửa hàng. Hãy xoá bớt ảnh cũ hoặc chọn ít ảnh hơn.'
    : 'Ảnh không hợp lệ, hãy dùng JPG/PNG/WEBP khác.';
}

async function createStore(req, res, next) {
  const files = filesOf(req);
  try {
    await ensureStoreSchema();
    const data = fromBody(req.body);
    if (!data.name_vi) {
      discard(files);
      return render(res, { error: 'Vui lòng nhập tên cửa hàng.' });
    }
    try {
      Object.assign(data, imageFields(await buildImages([], files, [])));
    } catch (e) {
      discard(files);
      return render(res, { error: imageError(e) });
    }
    const max = await db('stores').max({ m: 'sort_order' }).first();
    data.sort_order = ((max && max.m) || 0) + 1;
    data.is_active = true;
    await db('stores').insert(data);
    res.redirect('/admin/dai-ly');
  } catch (err) {
    discard(files);
    next(err);
  }
}

async function updateStore(req, res, next) {
  const files = filesOf(req);
  try {
    await ensureStoreSchema();
    const store = await db('stores').where({ id: req.params.id }).first();
    if (!store) { discard(files); return res.redirect('/admin/dai-ly'); }
    const data = fromBody(req.body);
    if (!data.name_vi) {
      discard(files);
      return render(res, { editing: store, error: 'Vui lòng nhập tên cửa hàng.' });
    }
    const existing = imageList(store);
    let removeList = req.body.removeImg || [];
    if (!Array.isArray(removeList)) removeList = [removeList];
    let all;
    try {
      all = await buildImages(existing, files, removeList);
    } catch (e) {
      discard(files);
      return render(res, { editing: store, error: imageError(e) });
    }
    existing.filter((u) => all.indexOf(u) === -1).forEach(removeUploadedFile);
    Object.assign(data, imageFields(all));
    await db('stores').where({ id: store.id }).update(data);
    res.redirect('/admin/dai-ly');
  } catch (err) {
    discard(files);
    next(err);
  }
}

async function toggleStore(req, res, next) {
  try {
    const store = await db('stores').where({ id: req.params.id }).first();
    if (store) await db('stores').where({ id: store.id }).update({ is_active: !store.is_active });
    res.redirect('/admin/dai-ly');
  } catch (err) {
    next(err);
  }
}

async function deleteStore(req, res, next) {
  try {
    const store = await db('stores').where({ id: req.params.id }).first();
    if (store) {
      imageList(store).forEach(removeUploadedFile);
      await db('stores').where({ id: store.id }).del();
    }
    res.redirect('/admin/dai-ly');
  } catch (err) {
    next(err);
  }
}

function moveStore(direction) {
  return async function (req, res, next) {
    try {
      const rows = await db('stores').orderBy('sort_order').orderBy('id');
      const i = rows.findIndex((r) => String(r.id) === String(req.params.id));
      const j = direction === 'up' ? i - 1 : i + 1;
      if (i >= 0 && j >= 0 && j < rows.length) {
        const copy = rows.slice();
        const tmp = copy[i]; copy[i] = copy[j]; copy[j] = tmp;
        for (let k = 0; k < copy.length; k++) {
          await db('stores').where({ id: copy[k].id }).update({ sort_order: k + 1 });
        }
      }
      res.redirect('/admin/dai-ly');
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { listStores, createStore, updateStore, toggleStore, deleteStore, moveStore };
