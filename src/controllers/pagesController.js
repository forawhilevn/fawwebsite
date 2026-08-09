const db = require('../db');

async function showArchive(req, res, next) {
  try {
    const banners = await db('banners').where({ type: 'archive', is_active: true }).orderBy('sort_order');
    res.render('archive', {
      title: `Archive — FOR A WHILE`,
      bodyClass: 'page-archive',
      banners
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
