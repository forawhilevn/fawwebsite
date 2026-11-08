const path = require('path');
const fs = require('fs');
const multer = require('multer');
const settings = require('../../services/settings');
const intro = require('../../services/intro');

const DIR = path.join(intro.PUBLIC_DIR, 'video', 'uploads');
const EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.mp4', '.webm', '.m4v', '.mov'];
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => { fs.mkdirSync(DIR, { recursive: true }); cb(null, DIR); },
    filename: (req, file, cb) => cb(null, 'sub-' + file.fieldname.replace('media', '') + '-' + Date.now() + path.extname(file.originalname).toLowerCase())
  }),
  fileFilter: (req, file, cb) => {
    if (!EXT.includes(path.extname(file.originalname).toLowerCase())) return cb(new Error('Chỉ nhận ảnh (.jpg .png .webp .gif) hoặc video (.mp4 .webm .mov)'));
    cb(null, true);
  },
  limits: { fileSize: 100 * 1024 * 1024, files: 2 }
}).fields([{ name: 'media1', maxCount: 1 }, { name: 'media2', maxCount: 1 }]);

async function showSubBanners(req, res, next) {
  try {
    const s = await settings.getAll();
    res.render('admin/sub-banners', {
      title: 'Banner phụ - FAW Admin',
      s,
      saved: req.query.saved || null,
      msg: String(req.query.msg || '').slice(0, 200)
    });
  } catch (err) { next(err); }
}

// One "Luu" button saves everything: options, links, new files and removals.
function saveAll(req, res) {
  upload(req, res, async (err) => {
    const back = (saved, msg) => res.redirect('/admin/banner-phu?saved=' + saved + (msg ? '&msg=' + encodeURIComponent(msg) : ''));
    if (err) return back('error', err.code === 'LIMIT_FILE_SIZE' ? 'File quá lớn (tối đa 100MB, nên dưới 10MB)' : err.message);
    try {
      const s = await settings.getAll();
      const link = (v) => String(v || '').trim().slice(0, 500);
      const values = {
        subbanner_enabled: req.body.enabled === '1' ? '1' : '0',
        subbanner_home: req.body.home === '1' ? '1' : '0',
        subbanner_shop: req.body.shop === '1' ? '1' : '0',
        subbanner_1_link: link(req.body.link1),
        subbanner_2_link: link(req.body.link2)
      };
      [1, 2].forEach((n) => {
        const key = 'subbanner_' + n + '_media';
        const file = req.files && req.files['media' + n] && req.files['media' + n][0];
        if (file) {
          if (s[key]) intro.removeFile(s[key]);
          values[key] = '/video/uploads/' + file.filename;
        } else if (req.body['remove' + n] === '1') {
          intro.removeFile(s[key]);
          values[key] = '';
        }
      });
      await settings.setMany(values);
      back('ok');
    } catch (e) { back('error', e.message); }
  });
}

module.exports = { showSubBanners, saveAll };
