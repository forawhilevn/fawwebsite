const fs = require('fs');
const path = require('path');
const multer = require('multer');
const db = require('../../db');

const DIR = path.join(__dirname, '..', '..', '..', 'public', 'images', 'sizecharts');
const EXTS = ['.jpg', '.jpeg', '.png', '.webp'];

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      fs.mkdirSync(DIR, { recursive: true });
      cb(null, DIR);
    },
    // written under a temp name first; renamed to <slug>.<ext> once the product is known
    filename: (req, file, cb) => cb(null, 'tmp-' + Date.now() + path.extname(file.originalname).toLowerCase())
  }),
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!EXTS.includes(ext)) return cb(new Error('Chỉ nhận ảnh jpg, png, webp'));
    cb(null, true);
  },
  limits: { fileSize: 20 * 1024 * 1024 }
}).single('sizeChart');

function removeAll(slug) {
  EXTS.forEach((ext) => {
    try { fs.unlinkSync(path.join(DIR, slug + ext)); } catch (e) { /* none */ }
  });
}

function uploadSizeChart(req, res) {
  upload(req, res, async (err) => {
    try {
      const product = await db('products').where({ id: req.params.id }).first();
      if (!product) return res.redirect('/admin/san-pham');
      if (err || !req.file) {
        if (req.file) fs.unlink(req.file.path, () => {});
        return res.redirect('/admin/san-pham/' + product.id + '/sua');
      }
      removeAll(product.slug);
      const ext = path.extname(req.file.filename).toLowerCase();
      fs.renameSync(req.file.path, path.join(DIR, product.slug + ext));
      res.redirect('/admin/san-pham/' + product.id + '/sua');
    } catch (e) {
      res.redirect('/admin/san-pham');
    }
  });
}

async function deleteSizeChart(req, res, next) {
  try {
    const product = await db('products').where({ id: req.params.id }).first();
    if (!product) return res.redirect('/admin/san-pham');
    removeAll(product.slug);
    res.redirect('/admin/san-pham/' + product.id + '/sua');
  } catch (err) {
    next(err);
  }
}

module.exports = { uploadSizeChart, deleteSizeChart };
