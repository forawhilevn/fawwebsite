const pages = require('../services/pages');

// Renders an admin-edited page (system pages fall back to their built-in view elsewhere).
function pickImage(row, meta) {
  if (row.image_url === 'none') return '';
  if (row.image_url) return row.image_url;
  return (meta && meta.mascot) || '';
}

function renderPage(res, row, meta) {
  const en = res.locals.locale === 'en';
  const title = (en && row.title_en) || row.title_vi;
  const html = (en ? (row.content_en || row.content_vi) : (row.content_vi || row.content_en)) || '';
  res.render('page', {
    title: title + ' — FOR A WHILE',
    bodyClass: meta && meta.layout === 'about' ? 'page-about' : 'page-policy',
    pageTitle: title,
    pageHtml: html,
    layout: meta ? meta.layout : 'policy',
    mascot: pickImage(row, meta),
    namespace: row.slug
  });
}

// For the built-in pages: show the admin's version if one was saved.
async function managed(slug, req, res, next, fallback) {
  try {
    const row = await pages.getPage(slug);
    const en = res.locals.locale === 'en';
    const has = row && row.is_active && (en ? (row.content_en || row.content_vi) : (row.content_vi || row.content_en));
    if (has) return renderPage(res, row, pages.SYSTEM[slug]);
    return fallback();
  } catch (err) {
    return fallback();
  }
}

async function showCustom(req, res, next) {
  try {
    const row = await pages.getPage(req.params.slug);
    if (!row || row.is_system || !row.is_active) {
      return res.status(404).render('error', {
        title: res.locals.t('error.notFoundTitle'),
        statusCode: 404,
        message: res.locals.t('error.notFoundMessage')
      });
    }
    renderPage(res, row, { layout: 'policy', mascot: '' });
  } catch (err) {
    next(err);
  }
}

module.exports = { managed, showCustom };
