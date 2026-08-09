const db = require('../db');
const cartService = require('../services/cart');
const { formatVND, discountPercent } = require('../utils/format');
const { localizeCategory } = require('../utils/i18n');

async function attachLocals(req, res, next) {
  try {
    const locale = res.locals.locale || 'vi';
    const categories = await db('categories').orderBy('sort_order');
    res.locals.categories = categories.map((c) => localizeCategory(c, locale));
    res.locals.cartCount = cartService.cartCount(req);
    res.locals.storeName = 'FOR A WHILE';
    res.locals.hotline = process.env.STORE_HOTLINE || '';
    res.locals.currentPath = req.path;
    res.locals.formatVND = formatVND;
    res.locals.discountPercent = discountPercent;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = attachLocals;
