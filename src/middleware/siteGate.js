// When the admin has closed the website, visitors see the maintenance page
// (HTTP 503). A logged-in admin can still browse the whole site as a preview.
function siteGate(req, res, next) {
  const settings = res.locals.siteSettings;
  if (!settings || settings.site_closed !== '1') return next();

  if (req.session && req.session.adminId) {
    res.locals.siteClosedPreview = true;
    return next();
  }

  const isEn = res.locals.locale === 'en';
  const wantsJson = req.xhr || /application\/json/.test(req.get('accept') || '');
  if (wantsJson) return res.status(503).json({ ok: false, closed: true });

  res.set('Retry-After', '3600');
  res.set('Cache-Control', 'no-store');
  return res.status(503).render('maintenance', {
    title: 'FOR A WHILE',
    bodyClass: 'page-maintenance',
    closedTitle: (isEn ? settings.closed_title_en : settings.closed_title_vi) || settings.closed_title_vi,
    closedMessage: (isEn ? settings.closed_message_en : settings.closed_message_vi) || settings.closed_message_vi
  });
}

module.exports = siteGate;
