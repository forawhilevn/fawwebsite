const db = require('../db');
const cartService = require('../services/cart');

async function showCart(req, res, next) {
  try {
    const cart = await cartService.getCartDetails(req, res.locals.locale);
    res.render('cart', {
      title: `${res.locals.t('cart.title')} — FOR A WHILE`,
      bodyClass: 'page-cart',
      cart
    });
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
      return res.status(404).redirect('/shop');
    }

    cartService.addItem(req, variantId, quantity);
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
    res.redirect('/cart');
  } catch (err) {
    next(err);
  }
}

module.exports = { showCart, addToCart, updateCart, removeFromCart };
