const db = require('../db');
const { localizeProduct, localizeBanner } = require('../utils/i18n');
const { getLookbookImages } = require('../utils/assets');

async function showHome(req, res, next) {
  try {
    const locale = res.locals.locale;

    const heroBanners = await db('banners')
      .where({ type: 'hero', is_active: true })
      .orderBy('sort_order');

    const newArrivals = await db('products')
      .where({ is_active: true })
      .orderBy('created_at', 'desc')
      .limit(8);

    const lookbookImages = newArrivals
      .map((p) => getLookbookImages(p.slug)[0])
      .filter(Boolean)
      .slice(0, 4);

    res.render('home', {
      title: 'FOR A WHILE — FROM ANOTHER WORLD',
      bodyClass: 'page-home',
      heroBanners: heroBanners.map((b) => localizeBanner(b, locale)),
      newArrivals: newArrivals.map((p) => localizeProduct(p, locale)),
      lookbookImages
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { showHome };
