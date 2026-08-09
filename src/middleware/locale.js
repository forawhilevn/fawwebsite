const { makeTranslator } = require('../utils/i18n');

function setLocale(locale) {
  return function (req, res, next) {
    req.locale = locale;
    res.locals.locale = locale;
    res.locals.t = makeTranslator(locale);

    const otherLocale = locale === 'en' ? 'vi' : 'en';
    const currentPath = req.originalUrl.replace(/^\/en/, '') || '/';
    res.locals.altLocaleUrl = otherLocale === 'en' ? `/en${currentPath}` : currentPath;
    res.locals.otherLocale = otherLocale;

    next();
  };
}

module.exports = { setLocale };
