const settings = require('../../services/settings');

function clean(value, max) {
  return String(value || '').trim().slice(0, max);
}

async function showSettings(req, res, next) {
  try {
    const s = await settings.getAll();
    res.render('admin/settings', {
      title: 'Cài đặt website - FAW Admin',
      s,
      saved: req.query.saved || null
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
      closed_message_en: clean(req.body.messageEn, 500)
    });
    res.redirect('/admin/cai-dat?saved=message');
  } catch (err) {
    next(err);
  }
}

module.exports = { showSettings, toggleSite, saveClosedMessage };
