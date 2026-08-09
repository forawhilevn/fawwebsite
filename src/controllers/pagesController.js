const db = require('../db');
const { localizeProduct } = require('../utils/i18n');
const { getLookbookImages } = require('../utils/assets');

async function showArchive(req, res, next) {
  try {
    const locale = res.locals.locale;
    const banners = await db('banners').where({ type: 'archive', is_active: true }).orderBy('sort_order');
    const products = await db('products').where({ is_active: true }).orderBy('created_at', 'desc');

    const lookbookSections = products
      .map((p) => ({
        product: localizeProduct(p, locale),
        images: getLookbookImages(p.slug)
      }))
      .filter((section) => section.images.length > 0);

    res.render('archive', {
      title: `Archive — FOR A WHILE`,
      bodyClass: 'page-archive',
      banners,
      lookbookSections
    });
  } catch (err) {
    next(err);
  }
}

function showWishlist(req, res) {
  res.render('wishlist', {
    title: `${res.locals.t('wishlist.title')} — FOR A WHILE`,
    bodyClass: 'page-wishlist'
  });
}

function showAbout(req, res) {
  res.render('about', {
    title: `About — FOR A WHILE`,
    bodyClass: 'page-about'
  });
}

function showShippingPolicy(req, res) {
  res.render('shipping-policy', {
    title: `${res.locals.t('nav.shippingPolicy')} — FOR A WHILE`,
    bodyClass: 'page-policy'
  });
}

function showReturnPolicy(req, res) {
  res.render('return-policy', {
    title: `${res.locals.t('nav.returnPolicy')} — FOR A WHILE`,
    bodyClass: 'page-policy'
  });
}

function showContact(req, res) {
  res.render('contact', {
    title: `Contact — FOR A WHILE`,
    bodyClass: 'page-contact'
  });
}

module.exports = {
  showArchive,
  showWishlist,
  showAbout,
  showShippingPolicy,
  showReturnPolicy,
  showContact
};
