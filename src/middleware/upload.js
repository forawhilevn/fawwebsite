const path = require('path');
const uploadStore = require('../utils/storage');
const fs = require('fs');
const multer = require('multer');
const db = require('../db');

const ALLOWED_EXT = ['.jpg', '.jpeg', '.jpe', '.jfif', '.png', '.gif', '.webp', '.heic', '.heif', '.avif'];
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;

function badImage(cb) {
  const err = new Error('Chỉ chấp nhận file ảnh (jpg, png, gif, webp, heic).');
  err.status = 400;
  err.publicMessage = err.message;
  cb(err);
}

const IMAGE_FILE_FILTER = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) return badImage(cb);
  cb(null, true);
};

function makeSlugUploader(baseFolder) {
  const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
      try {
        const product = await db('products').where({ id: req.params.id }).first();
        if (!product) return cb(new Error('Sản phẩm không tồn tại'));
        const destDir = path.join(uploadStore.STORAGE_DIR, 'images', baseFolder, product.slug);
        fs.mkdirSync(destDir, { recursive: true });
        req.__productSlug = product.slug;
        cb(null, destDir);
      } catch (err) {
        cb(err);
      }
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const stamp = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, stamp + ext);
    }
  });

  return multer({
    storage,
    fileFilter: IMAGE_FILE_FILTER,
    limits: { fileSize: MAX_IMAGE_BYTES }
  });
}

function makeUploader(subfolder) {
  const destDir = path.join(uploadStore.STORAGE_DIR, 'images', 'uploads', subfolder);
  fs.mkdirSync(destDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, destDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const stamp = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, stamp + ext);
    }
  });

  return multer({
    storage,
    fileFilter: IMAGE_FILE_FILTER,
    limits: { fileSize: MAX_IMAGE_BYTES }
  });
}

module.exports = { makeUploader, makeSlugUploader };
