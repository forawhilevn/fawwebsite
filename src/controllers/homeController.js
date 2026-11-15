const db = require('../db');
const { localizeProduct, localizeBanner } = require('../utils/i18n');
const { getLookbookImages } = require('../utils/assets');
const stock = require('../services/productStock');

async function showHome(req, res, next) {
  try {
    const locale = res.locals.locale;

    const heroBanners = await db('banners')
      .where({ type: 'hero', is_active: true })
      .orderBy('sort_order');

    await stock.ensureProductStockSchema();
    const newArrivals = await stock.orderProducts(db('products').where({ is_active: true }), 'home')
      .limit(8);

    const lookbookImages = newArrivals
      .map((p) => getLookbookImages(p.slug)[0])
      .filter(Boolean)
      .slice(0, 4);

    res.render('home', {
      title: 'FOR A WHILE — FROM ANOTHER WORLD',
      bodyClass: 'page-home',
      heroBanners: heroBanners.map((b) => localizeBanner(b, locale)),
      newArrivals: await stock.attachStatus(newArrivals.map((p) => localizeProduct(p, locale))),
      lookbookImages
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { showHome };
