const fs = require('fs');
const storage = require('../../utils/storage');
const path = require('path');
const db = require('../../db');

const LOOKBOOK_DIR = path.join(storage.STORAGE_DIR, 'images', 'lookbook');
const MAX_LOOKBOOK = 20;
const IMG = /\.(jpe?g|png|webp)$/i;

function fail(res, status, error) {
  return res.status(status).json({ ok: false, error });
}

function listFiles(slug) {
  const names = new Set();
  [storage.STORAGE_DIR, storage.PUBLIC_DIR].forEach((base) => {
    try {
      fs.readdirSync(path.join(base, 'images', 'lookbook', slug)).forEach((f) => {
        if (IMG.test(f)) names.add(f);
      });
    } catch (err) { /* folder does not exist yet */ }
  });
  return Array.from(names);
}

// legacy: plain form post (kept so old pages keep working)
async function uploadImages(req, res, next) {
  try {
    const product = await db('products').where({ id: req.params.id }).first();
    if (!product) return res.redirect('/admin/san-pham');
    res.redirect('/admin/san-pham/' + product.id + '/sua');
  } catch (err) {
    next(err);
  }
}

async function deleteImage(req, res, next) {
  try {
    const product = await db('products').where({ id: req.params.id }).first();
    if (!product) return res.redirect('/admin/san-pham');

    const filename = path.basename(req.params.filename);
    const filePath = path.join(LOOKBOOK_DIR, product.slug, filename);
    if (filePath.startsWith(path.join(LOOKBOOK_DIR, product.slug))) {
      storage.remove('/images/lookbook/' + product.slug + '/' + filename);
    }

    res.redirect('/admin/san-pham/' + product.id + '/sua');
  } catch (err) {
    next(err);
  }
}

// One photo (multer already stored it in the product's lookbook folder). JSON reply.
async function addImage(req, res) {
  const file = req.file;
  try {
    const product = await db('products').where({ id: req.params.id }).first();
    if (!product) return fail(res, 404, 'Sản phẩm không tồn tại.');
    if (!file) return fail(res, 400, 'Không nhận được file ảnh.');
    if (!IMG.test(file.filename)) {
      storage.remove('/images/lookbook/' + product.slug + '/' + file.filename);
      return fail(res, 422, 'Ảnh lookbook cần là JPG, PNG hoặc WEBP.');
    }
    if (listFiles(product.slug).length > MAX_LOOKBOOK) {
      storage.remove('/images/lookbook/' + product.slug + '/' + file.filename);
      return fail(res, 400, 'Mỗi sản phẩm tối đa ' + MAX_LOOKBOOK + ' ảnh lookbook.');
    }
    res.json({ ok: true, id: file.filename, url: '/images/lookbook/' + product.slug + '/' + file.filename });
  } catch (err) {
    console.error(err);
    fail(res, 500, 'Lỗi máy chủ khi lưu ảnh lookbook.');
  }
}

// Order = file name prefix (001_..., 002_...) because the storefront lists files by name.
function baseName(name) {
  return name.replace(/^\d{3}_/, '');
}

async function saveOrder(req, res) {
  try {
    const product = await db('products').where({ id: req.params.id }).first();
    if (!product) return fail(res, 404, 'Sản phẩm không tồn tại.');
    const clean = (list) => (Array.isArray(list) ? list : []).map((n) => path.basename(String(n))).filter((n) => IMG.test(n));
    const order = clean(req.body.order);
    const remove = clean(req.body.remove);
    const dir = path.join(LOOKBOOK_DIR, product.slug);

    remove.forEach((name) => storage.remove('/images/lookbook/' + product.slug + '/' + name));

    fs.mkdirSync(dir, { recursive: true });
    const publicDir = path.join(storage.PUBLIC_DIR, 'images', 'lookbook', product.slug);
    const result = [];
    order.forEach((name, i) => {
      const from = path.join(dir, name);
      if (!fs.existsSync(from)) {
        // a file that only exists in the app's own public/ folder: bring it into storage first
        const shipped = path.join(publicDir, name);
        if (!fs.existsSync(shipped)) return;
        fs.copyFileSync(shipped, from);
        try { fs.unlinkSync(shipped); } catch (e) { /* keep the copy if it cannot be removed */ }
      }
      const target = String(i + 1).padStart(3, '0') + '_' + baseName(name);
      if (target !== name) fs.renameSync(from, path.join(dir, target));
      result.push(target);
    });
    res.json({ ok: true, files: result });
  } catch (err) {
    console.error(err);
    fail(res, 500, 'Lỗi máy chủ khi lưu thứ tự ảnh lookbook.');
  }
}

module.exports = { uploadImages, deleteImage, addImage, saveOrder };
