const fs = require('fs');
const path = require('path');
const db = require('../../db');

const LOOKBOOK_DIR = path.join(__dirname, '..', '..', '..', 'public', 'images', 'lookbook');

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
      fs.unlink(filePath, () => {});
    }

    res.redirect('/admin/san-pham/' + product.id + '/sua');
  } catch (err) {
    next(err);
  }
}

module.exports = { uploadImages, deleteImage };
