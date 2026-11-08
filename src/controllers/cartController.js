const db = require('../db');
const cartService = require('../services/cart');
const pricingService = require('../services/pricing');

function wantsJson(req) {
  return req.xhr || /application\/json/.test(req.get('accept') || '');
}

// Cart snapshot for AJAX callers: counts, which variants are in the cart, and
// the rendered mini-cart panel (views/partials/mini-cart.ejs).
async function buildCartPayload(req, res) {
  const cart = await cartService.getCartDetails(req, res.locals.locale);
  const html = await new Promise((resolve, reject) => {
    res.render('partials/mini-cart', { cart }, (err, out) => (err ? reject(err) : resolve(out)));
  });
  return {
    ok: true,
    count: cart.count,
    items: cart.items.map((i) => ({ variantId: i.variant.id, quantity: i.quantity })),
    html
  };
}

async function showCart(req, res, next) {
  try {
    const cart = await cartService.getCartDetails(req, res.locals.locale);
    const pricing = cart.items.length
      ? await pricingService.computePricing({ cart, zone: null, codeInput: '', locale: res.locals.locale })
      : null;
    res.render('cart', {
      title: `${res.locals.t('cart.title')} — FOR A WHILE`,
      bodyClass: 'page-cart',
      cart,
      pricing
    });
  } catch (err) {
    next(err);
  }
}

async function showMiniCart(req, res, next) {
  try {
    res.json(await buildCartPayload(req, res));
  } catch (err) {
    next(err);
  }
}

async function addToCart(req, res, next) {
  try {
    const variantId = Number(req.body.variantId);
    const quantity = Math.max(1, Number(req.body.quantity) || 1);

    const variant = await db('product_variants').where({ id: variantId }).first();
    if (!variant) {
      if (wantsJson(req)) return res.status(404).json({ ok: false });
      return res.status(404).redirect('/shop');
    }
    if (variant.stock <= 0) {
      if (wantsJson(req)) return res.status(409).json({ ok: false });
      return res.redirect(req.get('Referer') || '/shop');
    }

    cartService.addItem(req, variantId, quantity);

    if (wantsJson(req)) {
      return res.json(await buildCartPayload(req, res));
    }
    res.redirect(req.body.redirectTo || '/cart');
  } catch (err) {
    next(err);
  }
}

async function updateCart(req, res, next) {
  try {
    const variantId = Number(req.body.variantId);
    const quantity = Number(req.body.quantity);
    cartService.setQuantity(req, variantId, quantity);
    res.redirect('/cart');
  } catch (err) {
    next(err);
  }
}

async function removeFromCart(req, res, next) {
  try {
    const variantId = Number(req.body.variantId);
    cartService.removeItem(req, variantId);

    if (wantsJson(req)) {
      return res.json(await buildCartPayload(req, res));
    }
    res.redirect('/cart');
  } catch (err) {
    next(err);
  }
}

module.exports = { showCart, showMiniCart, addToCart, updateCart, removeFromCart };
