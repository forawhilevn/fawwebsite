const { body, validationResult } = require('express-validator');
const db = require('../db');
const cartService = require('../services/cart');
const paymentService = require('../services/payment');
const discountService = require('../services/discount');
const { generateOrderCode } = require('../utils/format');

async function showCheckout(req, res, next) {
  try {
    const cart = await cartService.getCartDetails(req, res.locals.locale);
    if (cart.items.length === 0) {
      return res.redirect('/cart');
    }

    res.render('checkout', {
      title: `${res.locals.t('checkout.title')} — FOR A WHILE`,
      bodyClass: 'page-checkout',
      cart,
      methods: paymentService.listMethods(res.locals.t),
      errors: [],
      formData: {},
      discount: null
    });
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
    const cart = await cartService.getCartDetails(req, res.locals.locale);
    if (cart.items.length === 0) {
      return res.redirect('/cart');
    }

    const errors = validationResult(req);

    const discountCode = (req.body.discountCode || '').trim();
    const discountRow = discountCode
      ? await discountService.findValidCode(discountCode, cart.subtotal)
      : null;
    const discountAmount = discountService.computeDiscountAmount(discountRow, cart.subtotal);

    if (!errors.isEmpty()) {
      return res.status(400).render('checkout', {
        title: `${res.locals.t('checkout.title')} — FOR A WHILE`,
        bodyClass: 'page-checkout',
        cart,
        methods: paymentService.listMethods(res.locals.t),
        errors: errors.array(),
        formData: req.body,
        discount: discountRow ? { code: discountRow.code, amount: discountAmount } : null
      });
    }

    const orderCode = generateOrderCode();
    const total = Math.max(0, cart.subtotal - discountAmount);

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
        discount_code_id: discountRow ? discountRow.id : null,
        discount_amount: discountAmount,
        subtotal: cart.subtotal,
        total,
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

    if (discountRow) {
      await discountService.markUsed(discountRow.id);
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

module.exports = { showCheckout, checkoutValidators, submitOrder, showConfirmation };
