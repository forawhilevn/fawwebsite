const lookbookLibrary = require('../services/lookbookLibrary');
const pageController = require('./pageController');

async function showArchive(req, res, next) {
  try {
    const locale = res.locals.locale;
    const rows = await lookbookLibrary.listPublic();
    const items = rows.map((row) => ({
      url: row.image_url,
      caption: (locale === 'en' ? row.caption_en || row.caption_vi : row.caption_vi || row.caption_en) || '',
      href: row.product ? (locale === 'en' ? '/en/product/' : '/product/') + row.product.slug : ''
    }));

    res.render('archive', {
      title: `Lookbook — FOR A WHILE`,
      bodyClass: 'page-archive',
      items
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
