const fs = require('fs');
const path = require('path');
const db = require('../db');
const settings = require('../services/settings');
const intro = require('../services/intro');
const promotions = require('../services/promotions');
const pagesService = require('../services/pages');
const { getSizeChartUrl } = require('../utils/assets');
const gridBackground = require('../services/gridBackground');

// Cache-busting token: changes whenever the CSS / JS files change on disk,
// so browsers never keep showing an old stylesheet after an edit.
function assetVersion() {
  try {
    const dir = path.join(__dirname, '..', '..', 'public');
    const files = ['css/style.css', 'js/main.js', 'js/product.js'];
    return String(Math.max.apply(null, files.map((f) => Math.floor(fs.statSync(path.join(dir, f)).mtimeMs))));
  } catch (err) {
    return String(Date.now());
  }
}
const cartService = require('../services/cart');
const { formatVND, discountPercent } = require('../utils/format');
const { localizeCategory } = require('../utils/i18n');

async function attachLocals(req, res, next) {
  try {
    const locale = res.locals.locale || 'vi';
    const categories = await db('categories').orderBy('sort_order');
    res.locals.categories = categories.map((c) => localizeCategory(c, locale));
    res.locals.cartCount = cartService.cartCount(req);
    res.locals.siteSettings = await settings.getAll();
    res.locals.promoBar = res.locals.siteClosed || req.originalUrl.indexOf('/admin') === 0 ? [] : await promotions.announcements(locale);
    res.locals.footerPages = await pagesService.footerPages(locale);
    res.locals.getSizeChartUrl = getSizeChartUrl;
    res.locals.introConfig = intro.buildConfig(res.locals.siteSettings);
    res.locals.gridBgCss = gridBackground.buildCss(res.locals.siteSettings);
    res.locals.siteClosed = res.locals.siteSettings.site_closed === '1';
    res.locals.assetVersion = assetVersion();
    res.locals.storeName = 'FOR A WHILE';
    res.locals.hotline = process.env.STORE_HOTLINE || '';
    res.locals.currentPath = req.path;
    res.locals.siteUrl = (process.env.SITE_URL || (req.protocol + '://' + req.get('host'))).replace(/\/$/, '');
    res.locals.pageUrl = res.locals.siteUrl + req.originalUrl.split('?')[0];
    res.locals.formatVND = formatVND;
    res.locals.discountPercent = discountPercent;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = attachLocals;
