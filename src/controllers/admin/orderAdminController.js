const db = require('../../db');

const STATUSES = ['pending', 'confirmed', 'shipping', 'completed', 'cancelled'];

async function listOrders(req, res, next) {
  try {
    const orders = await db('orders').orderBy('created_at', 'desc');
    res.render('admin/orders', {
      title: 'Quản lý đơn hàng - FAW Admin',
      orders,
      statuses: STATUSES
    });
  } catch (err) {
    next(err);
  }
}

async function showOrder(req, res, next) {
  try {
    const order = await db('orders').where('id', req.params.id).first();
    if (!order) return res.redirect('/admin/don-hang');

    const items = await db('order_items').where('order_id', order.id);

    res.render('admin/order-detail', {
      title: `Đơn hàng ${order.order_code} - FAW Admin`,
      order,
      items,
      statuses: STATUSES
    });
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!STATUSES.includes(status)) {
      return res.redirect('/admin/don-hang');
    }
    await db('orders').where('id', req.params.id).update({ status });
    res.redirect(req.body.redirectTo || `/admin/don-hang/${req.params.id}`);
  } catch (err) {
    next(err);
  }
}

async function markPaid(req, res, next) {
  try {
    await db('orders').where('id', req.params.id).update({ payment_status: 'paid' });
    res.redirect(req.body.redirectTo || `/admin/don-hang/${req.params.id}`);
  } catch (err) {
    next(err);
  }
}

async function markUnpaid(req, res, next) {
  try {
    await db('orders').where('id', req.params.id).update({ payment_status: 'unpaid' });
    res.redirect(req.body.redirectTo || `/admin/don-hang/${req.params.id}`);
  } catch (err) {
    next(err);
  }
}

module.exports = { listOrders, showOrder, updateStatus, markPaid, markUnpaid };
