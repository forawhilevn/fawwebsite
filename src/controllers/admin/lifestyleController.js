const db = require('../../db');
const storage = require('../../utils/storage');
const lifestyle = require('../../services/lifestyle');
const settings = require('../../services/settings');

const MAX_SETS = 60;
const MAX_IMAGES = 40;

function urlOf(file) { return '/images/uploads/lifestyle/' + file.filename; }
function removeFile(url) {
  if (url && url.indexOf('/images/uploads/lifestyle/') === 0) storage.remove(url);
}
function clean(v, n) { return String(v || '').trim().slice(0, n) || null; }
function productIdOf(v) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

async function list(req, res, next) {
  try {
    res.render('admin/lifestyle', {
      title: 'Lifestyle - FAW Admin',
      sets: await lifestyle.listAll(),
      error: req.query.loi || '',
      names: await settings.getAll(),
      namesSaved: req.query.ten === '1'
    });
  } catch (err) { next(err); }
}

// section / page / menu names shown on the site
async function saveNames(req, res, next) {
  try {
    const v = (x, fb) => String(x || '').trim().slice(0, 60) || fb;
    await settings.setMany({
      lifestyle_title_vi: v(req.body.titleVi, 'Lifestyle'),
      lifestyle_title_en: v(req.body.titleEn, 'Lifestyle'),
      lifestyle_menu_vi: v(req.body.menuVi, v(req.body.titleVi, 'Lifestyle')),
      lifestyle_menu_en: v(req.body.menuEn, v(req.body.titleEn, 'Lifestyle'))
    });
    res.redirect('/admin/lifestyle?ten=1');
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    await lifestyle.ensureSchema();
    const file = req.file;
    if (!file) return res.redirect('/admin/lifestyle?loi=thumb');
    const count = await db('lifestyle_sets').count('id as n').first();
    if (Number(count.n) >= MAX_SETS) {
      removeFile(urlOf(file));
      return res.redirect('/admin/lifestyle?loi=max');
    }
    // new sets go to the top
    const min = await db('lifestyle_sets').min('sort_order as m').first();
    const inserted = await db('lifestyle_sets').insert({
      title_vi: clean(req.body.titleVi, 200),
      title_en: clean(req.body.titleEn, 200),
      thumb_url: urlOf(file),
      is_active: true,
      sort_order: (Number(min.m) || 0) - 1
    });
    const first = Array.isArray(inserted) ? inserted[0] : inserted;
    const id = typeof first === 'object' && first !== null ? first.id : first;
    res.redirect('/admin/lifestyle/' + id + '/sua');
  } catch (err) { next(err); }
}

async function editForm(req, res, next) {
  try {
    const set = await lifestyle.getSet(Number(req.params.id));
    if (!set) return res.redirect('/admin/lifestyle');
    const products = await db('products').select('id', 'name_vi').orderBy('name_vi');
    res.render('admin/lifestyle-form', { title: 'Sửa Lifestyle - FAW Admin', set, products, saved: req.query.ok === '1' });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const set = await lifestyle.getSet(Number(req.params.id));
    if (!set) return res.redirect('/admin/lifestyle');
    const patch = {
      title_vi: clean(req.body.titleVi, 200),
      title_en: clean(req.body.titleEn, 200),
      product_id: productIdOf(req.body.productId),
      is_active: req.body.isActive === 'on'
    };
    if (req.file) {
      patch.thumb_url = urlOf(req.file);
      removeFile(set.thumb_url);
    }
    await db('lifestyle_sets').where({ id: set.id }).update(patch);
    res.redirect('/admin/lifestyle/' + set.id + '/sua?ok=1');
  } catch (err) { next(err); }
}

async function addImages(req, res, next) {
  try {
    const set = await lifestyle.getSet(Number(req.params.id));
    if (!set) return res.redirect('/admin/lifestyle');
    const files = req.files || [];
    let room = MAX_IMAGES - set.images.length;
    const max = await db('lifestyle_images').where({ set_id: set.id }).max('sort_order as m').first();
    let sort = Number(max.m) || 0;
    for (const f of files) {
      if (room <= 0) { removeFile(urlOf(f)); continue; }
      sort += 1; room -= 1;
      await db('lifestyle_images').insert({ set_id: set.id, image_url: urlOf(f), sort_order: sort });
    }
    res.redirect('/admin/lifestyle/' + set.id + '/sua?ok=1');
  } catch (err) { next(err); }
}

async function deleteImage(req, res, next) {
  try {
    const row = await db('lifestyle_images').where({ id: Number(req.params.imageId), set_id: Number(req.params.id) }).first();
    if (row) {
      await db('lifestyle_images').where({ id: row.id }).del();
      removeFile(row.image_url);
    }
    res.redirect('/admin/lifestyle/' + req.params.id + '/sua');
  } catch (err) { next(err); }
}

async function reorderImages(req, res, next) {
  try {
    const ids = String(req.body.ids || '').split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0);
    await db.transaction(async (trx) => {
      for (let i = 0; i < ids.length; i += 1) {
        await trx('lifestyle_images').where({ id: ids[i], set_id: Number(req.params.id) }).update({ sort_order: i + 1 });
      }
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
}

async function reorderSets(req, res, next) {
  try {
    await lifestyle.ensureSchema();
    const ids = String(req.body.ids || '').split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0);
    await db.transaction(async (trx) => {
      for (let i = 0; i < ids.length; i += 1) {
        await trx('lifestyle_sets').where({ id: ids[i] }).update({ sort_order: i + 1 });
      }
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
}

async function deleteSet(req, res, next) {
  try {
    const set = await lifestyle.getSet(Number(req.params.id));
    if (set) {
      await db('lifestyle_images').where({ set_id: set.id }).del();
      await db('lifestyle_sets').where({ id: set.id }).del();
      removeFile(set.thumb_url);
      set.images.forEach((i) => removeFile(i.image_url));
    }
    res.redirect('/admin/lifestyle');
  } catch (err) { next(err); }
}

module.exports = { list, saveNames, create, editForm, update, addImages, deleteImage, reorderImages, reorderSets, deleteSet };
