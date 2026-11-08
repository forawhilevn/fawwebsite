const db = require('../db');
const { localizeProduct } = require('../utils/i18n');
const { getLookbookImages } = require('../utils/assets');
const pageController = require('./pageController');

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
      title: `Lookbook — FOR A WHILE`,
      bodyClass: 'page-archive',
      banners,
      lookbookSections
    });
  } catch (err) {
    next(err);
  }
}

function showAbout(req, res, next) {
  pageController.managed('about', req, res, next, () => {
    res.render('about', {
      title: `About — FOR A WHILE`,
      bodyClass: 'page-about'
    });
  });
}

function showShippingPolicy(req, res, next) {
  pageController.managed('shipping-policy', req, res, next, () => {
    res.render('shipping-policy', {
      title: `${res.locals.t('nav.shippingPolicy')} — FOR A WHILE`,
      bodyClass: 'page-policy'
    });
  });
}

function showReturnPolicy(req, res, next) {
  pageController.managed('return-policy', req, res, next, () => {
    res.render('return-policy', {
      title: `${res.locals.t('nav.returnPolicy')} — FOR A WHILE`,
      bodyClass: 'page-policy'
    });
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
  showAbout,
  showShippingPolicy,
  showReturnPolicy,
  showContact
};
