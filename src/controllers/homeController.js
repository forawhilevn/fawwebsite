const db = require('../db');
const { localizeProduct, localizeBanner } = require('../utils/i18n');
const lifestyle = require('../services/lifestyle');
const stock = require('../services/productStock');

async function showHome(req, res, next) {
  try {
    const locale = res.locals.locale;

    const heroBanners = await db('banners')
      .where({ type: 'hero', is_active: true })
      .orderBy('sort_order');

    await stock.ensureProductStockSchema();
    const newArrivals = await stock.orderProducts(db('products').where({ is_active: true }), 'home');

    const lifestyleSets = await lifestyle.listPublic(locale);

    res.render('home', {
      title: 'FOR A WHILE — FROM ANOTHER WORLD',
      bodyClass: 'page-home',
      heroBanners: heroBanners.map((b) => localizeBanner(b, locale)),
      newArrivals: await stock.attachStatus(newArrivals.map((p) => localizeProduct(p, locale))),
      lifestyleSets,
      homeLimit: 9
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { showHome };
