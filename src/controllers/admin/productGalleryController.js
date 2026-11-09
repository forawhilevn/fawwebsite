const fs = require('fs');
const storage = require('../../utils/storage');
const path = require('path');
const db = require('../../db');
const { cropToFixedSize } = require('../../utils/imageProcess');

const MAX_IMAGES = 10;

function removeUploadedFile(imageUrl) {
  if (imageUrl && imageUrl.startsWith('/images/uploads/')) {
    const filePath = path.join(storage.STORAGE_DIR, imageUrl);
    fs.unlink(filePath, () => {});
  }
}

async function uploadImages(req, res, next) {
  try {
    const product = await db('products').where('id', req.params.id).first();
    if (!product) return res.redirect('/admin/san-pham');

    const files = req.files || [];
    if (files.length === 0) return res.redirect('/admin/san-pham/' + product.id + '/sua');

    const existingCount = await db('product_images').where('product_id', product.id).count('id as count').first();
    const remaining = MAX_IMAGES - Number(existingCount.count);

    const maxSort = await db('product_images').where('product_id', product.id).max('sort_order as max').first();
    let nextSort = (maxSort.max || 0) + 1;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (i >= remaining) {
        removeUploadedFile('/images/uploads/products/' + file.filename);
        continue;
      }
      const destPath = path.join(storage.STORAGE_DIR, 'images', 'uploads', 'products', file.filename);
      try {
        await cropToFixedSize(destPath, 'product');
      } catch (imgErr) {
        removeUploadedFile('/images/uploads/products/' + file.filename);
        continue;
      }

      await db('product_images').insert({
        product_id: product.id,
        variant_id: req.body.variantId ? Number(req.body.variantId) : null,
        image_url: '/images/uploads/products/' + file.filename,
        sort_order: nextSort++
      });
    }

    res.redirect('/admin/san-pham/' + product.id + '/sua');
  } catch (err) {
    next(err);
  }
}

async function deleteImage(req, res, next) {
  try {
    const image = await db('product_images').where('id', req.params.imageId).where('product_id', req.params.id).first();
    if (image) {
      await db('product_images').where('id', image.id).del();
      removeUploadedFile(image.image_url);
    }
    res.redirect('/admin/san-pham/' + req.params.id + '/sua');
  } catch (err) {
    next(err);
  }
}

function fail(res, status, error) {
  return res.status(status).json({ ok: false, error });
}

// One photo at a time (used by the admin page's "Lưu" button, which uploads them in sequence).
async function addImage(req, res) {
  const file = req.file;
  try {
    const product = await db('products').where('id', req.params.id).first();
    if (!product) {
      if (file) removeUploadedFile('/images/uploads/products/' + file.filename);
      return fail(res, 404, 'Sản phẩm không tồn tại.');
    }
    if (!file) return fail(res, 400, 'Không nhận được file ảnh.');

    const count = await db('product_images').where('product_id', product.id).count('id as count').first();
    if (Number(count.count) >= MAX_IMAGES) {
      removeUploadedFile('/images/uploads/products/' + file.filename);
      return fail(res, 400, 'Mỗi sản phẩm tối đa ' + MAX_IMAGES + ' ảnh.');
    }

    const destPath = path.join(storage.STORAGE_DIR, 'images', 'uploads', 'products', file.filename);
    try {
      await cropToFixedSize(destPath, 'product');
    } catch (imgErr) {
      console.error('Xu ly anh san pham that bai:', file.originalname, imgErr.message);
      removeUploadedFile('/images/uploads/products/' + file.filename);
      return fail(res, 422, 'Không đọc được ảnh "' + file.originalname + '". Hãy dùng ảnh JPG hoặc PNG.');
    }

    const maxSort = await db('product_images').where('product_id', product.id).max('sort_order as max').first();
    const url = '/images/uploads/products/' + file.filename;
    const inserted = await db('product_images').insert({
      product_id: product.id,
      variant_id: null,
      image_url: url,
      sort_order: (maxSort.max || 0) + 1
    });
    const first = Array.isArray(inserted) ? inserted[0] : inserted;
    const id = typeof first === 'object' && first !== null ? first.id : first;
    res.json({ ok: true, id, url });
  } catch (err) {
    console.error(err);
    if (file) removeUploadedFile('/images/uploads/products/' + file.filename);
    fail(res, 500, 'Lỗi máy chủ khi lưu ảnh.');
  }
}

// Saves the order of the gallery and deletes the photos taken out of it.
async function saveOrder(req, res) {
  try {
    const product = await db('products').where('id', req.params.id).first();
    if (!product) return fail(res, 404, 'Sản phẩm không tồn tại.');
    const toIds = (list) => (Array.isArray(list) ? list : []).map(Number).filter((n) => Number.isInteger(n) && n > 0);
    const order = toIds(req.body.order);
    const remove = toIds(req.body.remove);

    if (remove.length) {
      const rows = await db('product_images').where('product_id', product.id).whereIn('id', remove);
      await db('product_images').where('product_id', product.id).whereIn('id', remove).del();
      rows.forEach((row) => removeUploadedFile(row.image_url));
    }
    for (let i = 0; i < order.length; i += 1) {
      await db('product_images').where({ id: order[i], product_id: product.id }).update({ sort_order: i + 1 });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    fail(res, 500, 'Lỗi máy chủ khi lưu thứ tự ảnh.');
  }
}

module.exports = { uploadImages, deleteImage, addImage, saveOrder, MAX_IMAGES };
