const settings = require('../../services/settings');
const storage = require('../../utils/storage');
const fs = require('fs');
const path = require('path');
const intro = require('../../services/intro');
const gridBackground = require('../../services/gridBackground');

// deletes a previously uploaded background (never the built-in default image)
function removeUpload(url) {
  if (!/^\/images\/uploads\/backgrounds\/[\w.-]+$/.test(url || '')) return;
  storage.remove(url);
}

async function showBackground(req, res, next) {
  try {
    const s = await settings.getAll();
    res.render('admin/background', {
      title: 'Hình nền sản phẩm - FAW Admin',
      bg: gridBackground.resolve(s),
      defaultImage: gridBackground.DEFAULT_IMAGE,
      saved: req.query.saved || null,
      msg: String(req.query.msg || '').slice(0, 200)
    });
  } catch (err) { next(err); }
}

// One "Luu" saves mode, colour, fixed effect, a new image or removal of the uploaded one.
function saveBackground(upload) {
  return (req, res) => {
    upload(req, res, async (err) => {
      const back = (saved, msg) => res.redirect('/admin/hinh-nen?saved=' + saved + (msg ? '&msg=' + encodeURIComponent(msg) : ''));
      if (err) return back('error', err.code === 'LIMIT_FILE_SIZE' ? 'Ảnh quá lớn (tối đa 8MB)' : err.message);
      try {
        const s = await settings.getAll();
        const values = {
          gridbg_mode: req.body.mode === 'color' ? 'color' : 'image',
          gridbg_color: gridBackground.cleanColor(req.body.color),
          gridbg_fixed: req.body.fixed === '1' ? '1' : '0'
        };
        if (req.file) {
          if (s.gridbg_image) removeUpload(s.gridbg_image);
          values.gridbg_image = '/images/uploads/backgrounds/' + req.file.filename;
          values.gridbg_mode = 'image';
        } else if (req.body.remove === '1') {
          if (s.gridbg_image) removeUpload(s.gridbg_image);
          values.gridbg_image = '';
        }
        await settings.setMany(values);
        back('ok');
      } catch (e) { back('error', e.message); }
    });
  };
}

module.exports = { showBackground, saveBackground };
