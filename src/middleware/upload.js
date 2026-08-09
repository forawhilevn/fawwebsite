const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../db');

const IMAGE_FILE_FILTER = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowed.includes(ext)) {
    return cb(new Error('Chỉ chấp nhận file ảnh (jpg, png, gif, webp)'));
  }
  cb(null, true);
};

function makeSlugUploader(baseFolder) {
  const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
      try {
        const product = await db('products').where({ id: req.params.id }).first();
        if (!product) return cb(new Error('Sản phẩm không tồn tại'));
        const destDir = path.join(__dirname, '..', '..', 'public', 'images', baseFolder, product.slug);
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
    limits: { fileSize: 10 * 1024 * 1024 }
  });
}

function makeUploader(subfolder) {
  const destDir = path.join(__dirname, '..', '..', 'public', 'images', 'uploads', subfolder);
  fs.mkdirSync(destDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, destDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const stamp = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, stamp + ext);
    }
  });

  const fileFilter = (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
      return cb(new Error('Chỉ chấp nhận file ảnh (jpg, png, gif, webp)'));
    }
    cb(null, true);
  };

  return multer({
    storage,
    fileFilter,
    limits: { fileSize: 8 * 1024 * 1024 }
  });
}

module.exports = { makeUploader, makeSlugUploader };
