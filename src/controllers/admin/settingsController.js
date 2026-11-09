const path = require('path');
const storage = require('../../utils/storage');
const fs = require('fs');
const multer = require('multer');
const settings = require('../../services/settings');
const intro = require('../../services/intro');

const VIDEO_DIR = path.join(storage.STORAGE_DIR, 'video', 'uploads');
const VIDEO_EXT = ['.webm', '.mp4', '.m4v', '.mov'];
const videoUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      fs.mkdirSync(VIDEO_DIR, { recursive: true });
      cb(null, VIDEO_DIR);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, 'intro-' + req.params.device + '-' + Date.now() + ext);
    }
  }),
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!VIDEO_EXT.includes(ext)) return cb(new Error('Chỉ nhận video .webm, .mp4, .m4v, .mov'));
    cb(null, true);
  },
  limits: { fileSize: 500 * 1024 * 1024, files: 4 }
}).array('videos', 4);

// Banner image / video shown on the "website closed" page (one per device)
const CLOSED_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.mp4', '.webm', '.m4v', '.mov'];
const closedUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      fs.mkdirSync(VIDEO_DIR, { recursive: true });
      cb(null, VIDEO_DIR);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, 'closed-' + req.params.device + '-' + Date.now() + ext);
    }
  }),
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!CLOSED_EXT.includes(ext)) return cb(new Error('Chỉ nhận ảnh (.jpg .png .webp .gif) hoặc video (.mp4 .webm .mov)'));
    cb(null, true);
  },
  limits: { fileSize: 500 * 1024 * 1024, files: 1 }
}).single('media');

function deviceOf(req) {
  return req.params.device === 'mobile' ? 'mobile' : 'desktop';
}

function clean(value, max) {
  return String(value || '').trim().slice(0, max);
}

async function showSettings(req, res, next) {
  try {
    const s = await settings.getAll();
    res.render('admin/settings', {
      title: 'Cài đặt website - FAW Admin',
      s,
      introConfig: intro.buildConfig(s),
      saved: req.query.saved || null,
      msg: String(req.query.msg || '').slice(0, 200)
    });
  } catch (err) {
    next(err);
  }
}

// Close / re-open the whole storefront with one button.
async function toggleSite(req, res, next) {
  try {
    const s = await settings.getAll();
    const closing = s.site_closed !== '1';
    await settings.setMany({
      site_closed: closing ? '1' : '0',
      closed_at: closing ? new Date().toISOString() : ''
    });
    res.redirect('/admin/cai-dat?saved=' + (closing ? 'closed' : 'opened'));
  } catch (err) {
    next(err);
  }
}

async function saveClosedMessage(req, res, next) {
  try {
    await settings.setMany({
      closed_title_vi: clean(req.body.titleVi, 120),
      closed_title_en: clean(req.body.titleEn, 120),
      closed_message_vi: clean(req.body.messageVi, 500),
      closed_message_en: clean(req.body.messageEn, 500),
      closed_show_text: req.body.showText === '1' ? '1' : '0'
    });
    res.redirect('/admin/cai-dat?saved=message');
  } catch (err) {
    next(err);
  }
}

// Upload intro video(s) for one device. Files are sorted into slots by extension:
// .webm -> transparent slot, .mp4/.m4v/.mov -> Safari/iPhone + fallback slot.
function uploadIntroVideo(req, res) {
  req.params.device = deviceOf(req);
  videoUpload(req, res, async (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'File quá lớn (tối đa 500MB mỗi file)' : err.message;
      return res.redirect('/admin/cai-dat?saved=videoerror&msg=' + encodeURIComponent(msg));
    }
    try {
      const device = deviceOf(req);
      const files = req.files || [];
      if (!files.length) return res.redirect('/admin/cai-dat?saved=videoerror&msg=' + encodeURIComponent('Bạn chưa chọn file nào'));
      const s = await settings.getAll();
      const values = {};
      files.forEach((f) => {
        const ext = path.extname(f.filename).toLowerCase();
        const kind = ext === '.webm' ? 'webm' : 'mp4';
        const key = 'intro_' + device + '_' + kind;
        // a later file in the same upload wins; the replaced file is deleted
        const old = values[key] || s[key];
        if (old && old !== '/video/uploads/' + f.filename) intro.removeFile(old);
        values[key] = '/video/uploads/' + f.filename;
      });
      await settings.setMany(values);
      res.redirect('/admin/cai-dat?saved=video');
    } catch (e) {
      res.redirect('/admin/cai-dat?saved=videoerror&msg=' + encodeURIComponent(e.message));
    }
  });
}

async function removeIntroVideo(req, res, next) {
  try {
    const device = deviceOf(req);
    const kind = req.params.kind === 'webm' ? 'webm' : 'mp4';
    const key = 'intro_' + device + '_' + kind;
    const s = await settings.getAll();
    intro.removeFile(s[key]);
    await settings.setMany({ [key]: '' });
    res.redirect('/admin/cai-dat?saved=video');
  } catch (err) {
    next(err);
  }
}

async function saveIntroOptions(req, res, next) {
  try {
    const num = (v) => {
      const n = parseFloat(String(v || '').replace(',', '.'));
      return isFinite(n) && n >= 0 && n <= 60 ? String(n) : '3.5';
    };
    await settings.setMany({
      intro_enabled: req.body.enabled === '1' ? '1' : '0',
      intro_desktop_reveal: num(req.body.revealDesktop),
      intro_mobile_reveal: num(req.body.revealMobile)
    });
    res.redirect('/admin/cai-dat?saved=video');
  } catch (err) {
    next(err);
  }
}

function uploadClosedMedia(req, res) {
  req.params.device = deviceOf(req);
  closedUpload(req, res, async (err) => {
    const back = (saved, msg) => res.redirect('/admin/cai-dat?saved=' + saved + (msg ? '&msg=' + encodeURIComponent(msg) : '') + '#closed-media');
    if (err) return back('closedmediaerror', err.code === 'LIMIT_FILE_SIZE' ? 'File quá lớn (tối đa 500MB)' : err.message);
    try {
      if (!req.file) return back('closedmediaerror', 'Bạn chưa chọn file nào');
      const key = 'closed_media_' + deviceOf(req);
      const s = await settings.getAll();
      const url = '/video/uploads/' + req.file.filename;
      if (s[key] && s[key] !== url) intro.removeFile(s[key]);
      await settings.setMany({ [key]: url });
      back('closedmedia');
    } catch (e) {
      back('closedmediaerror', e.message);
    }
  });
}

async function removeClosedMedia(req, res, next) {
  try {
    const key = 'closed_media_' + deviceOf(req);
    const s = await settings.getAll();
    intro.removeFile(s[key]);
    await settings.setMany({ [key]: '' });
    res.redirect('/admin/cai-dat?saved=closedmedia#closed-media');
  } catch (err) {
    next(err);
  }
}

// Xoa sach noi dung cua hang (san pham, danh muc, banner, lookbook, anh/video da tai len).
// Giu lai: don hang, tai khoan admin, cai dat chung.
async function wipeContent(req, res, next) {
  try {
    if (String(req.body.confirm || '').trim().toUpperCase() !== 'XOA') {
      return res.redirect('/admin/cai-dat?saved=wipeerror&msg=' + encodeURIComponent('Hãy gõ đúng chữ XOA để xác nhận.'));
    }
    const db = require('../../db');
    const tryDel = async (table, fn) => {
      try {
        if (await db.schema.hasTable(table)) await (fn ? fn(db(table)) : db(table).del());
      } catch (err) {
        console.error('Xoa ' + table + ' that bai:', err.message);
      }
    };
    if (await db.schema.hasTable('orders')) {
      try { await db('orders').update({ discount_code_id: null }); } catch (e) { /* bo qua */ }
    }
    for (const t of ['lookbook_images', 'product_images', 'banners', 'promotions', 'stores', 'pages', 'discount_codes']) {
      await tryDel(t);
    }
    // san pham/bien the da co don hang thi giu lai (an di) de khong hong don
    let used = [];
    let usedVariants = [];
    if (await db.schema.hasTable('order_items')) {
      used = (await db('order_items').distinct('product_id')).map((x) => x.product_id).filter(Boolean);
      usedVariants = (await db('order_items').distinct('variant_id')).map((x) => x.variant_id).filter(Boolean);
    }
    await tryDel('product_variants', (q) => q.whereNotIn('id', usedVariants).del());
    await tryDel('products', (q) => q.whereNotIn('id', used).del());
    if (used.length) {
      try { await db('products').update({ is_active: 0 }); } catch (e) { /* bo qua */ }
    }
    await tryDel('categories', (q) => q.whereNotIn('id', db('products').select('category_id').whereNotNull('category_id')).del());

    const fs2 = require('fs');
    const path2 = require('path');
    const dirs = [['images', 'uploads'], ['video', 'uploads']];
    if (storage.SEPARATE) dirs.push(['images', 'lookbook'], ['images', 'sizecharts']);
    dirs.forEach((d) => {
      const dir = path2.join(storage.STORAGE_DIR, ...d);
      try { fs2.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* bo qua */ }
    });

    const all = await settings.getAll();
    const clear = {};
    Object.keys(all).forEach((k) => {
      if (/^(intro_(desktop|mobile)_(webm|mp4)|closed_.*(image|video|media|url))$/.test(k)) clear[k] = '';
    });
    if (Object.keys(clear).length) await settings.setMany(clear);
    res.redirect('/admin/cai-dat?saved=wiped&msg=' + encodeURIComponent(used.length ? 'Một số sản phẩm đã có đơn hàng nên chỉ bị ẩn.' : ''));
  } catch (err) {
    next(err);
  }
}

module.exports = { wipeContent, uploadClosedMedia, removeClosedMedia, showSettings, toggleSite, saveClosedMessage, uploadIntroVideo, removeIntroVideo, saveIntroOptions };
