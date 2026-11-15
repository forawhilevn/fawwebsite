const lifestyle = require('../services/lifestyle');
const pageController = require('./pageController');

async function showArchive(req, res, next) {
  try {
    const sets = await lifestyle.listPublic(res.locals.locale);
    res.render('archive', {
      title: `${res.locals.lifeTitle} — FOR A WHILE`,
      bodyClass: 'page-archive',
      sets
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
