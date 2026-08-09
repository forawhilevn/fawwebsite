const vi = require('../i18n/vi.json');
const en = require('../i18n/en.json');

const DICTS = { vi, en };

function makeTranslator(locale) {
  const dict = DICTS[locale] || DICTS.vi;
  return function t(key) {
    return dict[key] || DICTS.vi[key] || key;
  };
}

function localizeRow(row, locale, field) {
  if (!row) return row;
  if (locale === 'en' && row[`${field}_en`]) return row[`${field}_en`];
  return row[`${field}_vi`];
}

function localizeProduct(product, locale) {
  if (!product) return product;
  return {
    ...product,
    name: localizeRow(product, locale, 'name'),
    description: localizeRow(product, locale, 'description')
  };
}

function localizeCategory(category, locale) {
  if (!category) return category;
  return {
    ...category,
    name: localizeRow(category, locale, 'name')
  };
}

function localizeBanner(banner, locale) {
  if (!banner) return banner;
  return {
    ...banner,
    title: localizeRow(banner, locale, 'title')
  };
}

module.exports = {
  makeTranslator,
  localizeRow,
  localizeProduct,
  localizeCategory,
  localizeBanner
};
