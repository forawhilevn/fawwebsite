const db = require('../../db');

async function showDashboard(req, res, next) {
  try {
    const [{ count: productCount }] = await db('products').count('id as count');
    const [{ count: orderCount }] = await db('orders').count('id as count');
    const [{ count: pendingCount }] = await db('orders').where('status', 'pending').count('id as count');
    const [{ count: unpaidCount }] = await db('orders').where('payment_status', 'unpaid').count('id as count');

    const recentOrders = await db('orders').orderBy('created_at', 'desc').limit(5);

    res.render('admin/dashboard', {
      title: 'Bảng điều khiển - FAW Admin',
      stats: {
        productCount: Number(productCount),
        orderCount: Number(orderCount),
        pendingCount: Number(pendingCount),
        unpaidCount: Number(unpaidCount)
      },
      recentOrders
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { showDashboard };
