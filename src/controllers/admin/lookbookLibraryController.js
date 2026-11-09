const fs = require('fs');
const path = require('path');
const db = require('../../db');
const storage = require('../../utils/storage');
const library = require('../../services/lookbookLibrary');

const MAX_ITEMS = 60;

function fail(res, status, error) {
  return res.status(status).json({ ok: false, error });
}

function removeFile(url) {
  if (url && url.indexOf('/images/uploads/lookbook/') === 0) storage.remove(url);
}

async function show(req, res, next) {
  try {
    const items = await library.listAll();
    const products = await db('products').select('id', 'name_vi').orderBy('name_vi');
    res.render('admin/lookbook', {
      title: 'Lookbook - FAW Admin',
      items,
      products
    });
  } catch (err) {
    next(err);
  }
}

// One photo (multer stored it in images/uploads/lookbook). JSON reply.
async function addImage(req, res) {
  const file = req.file;
  try {
    await library.ensureSchema();
    if (!file) return fail(res, 400, 'Không nhận được file ảnh.');
    const url = '/images/uploads/lookbook/' + file.filename;
    const count = await db('lookbook_images').count('id as count').first();
    if (Number(count.count) >= MAX_ITEMS) {
      removeFile(url);
      return fail(res, 400, 'Tối đa ' + MAX_ITEMS + ' ảnh trong Lookbook.');
    }
    const max = await db('lookbook_images').max('sort_order as max').first();
    const inserted = await db('lookbook_images').insert({ image_url: url, sort_order: (max.max || 0) + 1, is_active: true });
    const first = Array.isArray(inserted) ? inserted[0] : inserted;
    const id = typeof first === 'object' && first !== null ? first.id : first;
    res.json({ ok: true, id, url });
  } catch (err) {
    console.error(err);
    if (file) removeFile('/images/uploads/lookbook/' + file.filename);
    fail(res, 500, 'Lỗi máy chủ khi lưu ảnh.');
  }
}

// body: { items: [{ id, captionVi, captionEn, productId, active }] in display order, remove: [ids] }
async function saveAll(req, res) {
  try {
    await library.ensureSchema();
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    const remove = (Array.isArray(req.body.remove) ? req.body.remove : []).map(Number).filter((n) => Number.isInteger(n) && n > 0);

    if (remove.length) {
      const rows = await db('lookbook_images').whereIn('id', remove);
      await db('lookbook_images').whereIn('id', remove).del();
      rows.forEach((row) => removeFile(row.image_url));
    }
    for (let i = 0; i < items.length; i += 1) {
      const it = items[i] || {};
      const id = Number(it.id);
      if (!Number.isInteger(id) || id <= 0) continue;
      const productId = Number(it.productId);
      await db('lookbook_images').where({ id }).update({
        caption_vi: String(it.captionVi || '').trim().slice(0, 200) || null,
        caption_en: String(it.captionEn || '').trim().slice(0, 200) || null,
        product_id: Number.isInteger(productId) && productId > 0 ? productId : null,
        is_active: it.active === false || it.active === '0' ? false : true,
        sort_order: i + 1
      });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    fail(res, 500, 'Lỗi máy chủ khi lưu Lookbook.');
  }
}

module.exports = { show, addImage, saveAll };
