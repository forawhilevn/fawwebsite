const db = require('../db');
const { ensureStoreSchema } = require('../services/storeSchema');
const { prepare } = require('../utils/stores');

async function showStores(req, res, next) {
  try {
    await ensureStoreSchema();
    const rows = await db('stores').where({ is_active: true }).orderBy('sort_order').orderBy('id');
    const stores = rows.map((r) => prepare(r, res.locals.locale));
    const cities = [];
    stores.forEach((s) => { if (s.city && cities.indexOf(s.city) === -1) cities.push(s.city); });
    res.render('stores', {
      title: res.locals.t('stores.title') + ' \u2014 FOR A WHILE',
      bodyClass: 'page-stores',
      stores,
      cities
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { showStores };
