const { body, validationResult } = require('express-validator');
const db = require('../db');
const cartService = require('../services/cart');
const paymentService = require('../services/payment');
const discountService = require('../services/discount');
const pricingService = require('../services/pricing');
const { ensurePromoSchema } = require('../services/promoSchema');
const { generateOrderCode } = require('../utils/format');

async function showCheckout(req, res, next) {
  try {
    const cart = await cartService.getCartDetails(req, res.locals.locale);
    if (cart.items.length === 0) {
      return res.redirect('/cart');
    }
    const pricing = await pricingService.computePricing({ cart, zone: null, codeInput: '', locale: res.locals.locale });

    res.render('checkout', {
      title: `${res.locals.t('checkout.title')} — FOR A WHILE`,
      bodyClass: 'page-checkout',
      cart,
      pricing,
      methods: paymentService.listMethods(res.locals.t),
      errors: [],
      formData: {},
      discount: null
    });
  } catch (err) {
    next(err);
  }
}

// Live totals while the customer picks a shipping zone / types a code.
async function quote(req, res, next) {
  try {
    const cart = await cartService.getCartDetails(req, res.locals.locale);
    if (cart.items.length === 0) return res.json({ ok: false });
    const pricing = await pricingService.computePricing({
      cart,
      zone: req.query.zone,
      codeInput: req.query.code,
      locale: res.locals.locale
    });
    const html = await new Promise((resolve, reject) => {
      res.render('partials/checkout-totals', { pricing }, (err, out) => (err ? reject(err) : resolve(out)));
    });
    res.json({ ok: true, html });
  } catch (err) {
    next(err);
  }
}

const checkoutValidators = [
  body('customerName').trim().notEmpty().isLength({ max: 150 }),
  body('phone').trim().matches(/^(0\d{9}|\+84\d{9})$/),
  body('address').trim().notEmpty().isLength({ max: 300 }),
  body('paymentMethod').isIn(['cod', 'vietqr'])
];

async function submitOrder(req, res, next) {
  try {
    await ensurePromoSchema();
    const cart = await cartService.getCartDetails(req, res.locals.locale);
    if (cart.items.length === 0) {
      return res.redirect('/cart');
    }

    const errors = validationResult(req).array();
    if (pricingService.ZONES.indexOf(req.body.shippingZone) === -1) {
      errors.push({ path: 'shippingZone', msg: res.locals.t('checkout.zoneRequired') });
    }

    const pricing = await pricingService.computePricing({
      cart,
      zone: req.body.shippingZone,
      codeInput: req.body.discountCode,
      locale: res.locals.locale
    });

    if (errors.length > 0) {
      return res.status(400).render('checkout', {
        title: `${res.locals.t('checkout.title')} — FOR A WHILE`,
        bodyClass: 'page-checkout',
        cart,
        pricing,
        methods: paymentService.listMethods(res.locals.t),
        errors,
        formData: req.body,
        discount: null
      });
    }

    const orderCode = generateOrderCode();

    const [orderId] = await db('orders')
      .insert({
        order_code: orderCode,
        customer_name: req.body.customerName,
        phone: req.body.phone,
        email: req.body.email || null,
        address: req.body.address,
        note: req.body.note || null,
        payment_method: req.body.paymentMethod,
        payment_status: 'unpaid',
        status: 'pending',
        discount_code_id: pricing.codeRow ? pricing.codeRow.id : null,
        discount_amount: pricing.discountAmount,
        subtotal: cart.subtotal,
        shipping_fee: pricing.shippingFee || 0,
        shipping_zone: pricing.zone,
        promo_note: pricing.note || null,
        total: pricing.total,
        locale: res.locals.locale
      })
      .returning('id');
    const insertedOrderId = typeof orderId === 'object' ? orderId.id : orderId;

    for (const item of cart.items) {
      await db('order_items').insert({
        order_id: insertedOrderId,
        product_id: item.product.id,
        variant_id: item.variant.id,
        product_name: item.productName,
        variant_label: item.variantLabel,
        price: item.unitPrice,
        quantity: item.quantity
      });
    }

    if (pricing.codeRow) {
      await discountService.markUsed(pricing.codeRow.id);
    }

    cartService.clearCart(req);

    const prefix = res.locals.locale === 'en' ? '/en' : '';
    res.redirect(`${prefix}/order/${orderCode}`);
  } catch (err) {
    next(err);
  }
}

async function showConfirmation(req, res, next) {
  try {
    const order = await db('orders').where({ order_code: req.params.code }).first();
    if (!order) {
      return res.status(404).render('error', {
        title: res.locals.t('error.notFoundTitle'),
        statusCode: 404,
        message: res.locals.t('error.notFoundMessage')
      });
    }

    const items = await db('order_items').where({ order_id: order.id });
    const instructions = paymentService.getInstructions(order, res.locals.t);

    res.render('order-confirmation', {
      title: `${res.locals.t('order.confirmationTitle')} — FOR A WHILE`,
      bodyClass: 'page-order-confirmation',
      order,
      items,
      instructions
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { showCheckout, quote, checkoutValidators, submitOrder, showConfirmation };
