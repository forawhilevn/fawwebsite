const db = require('../../db');

async function listCodes(req, res, next) {
  try {
    const codes = await db('discount_codes').orderBy('created_at', 'desc');
    res.render('admin/discounts', {
      title: 'Mã giảm giá - FAW Admin',
      codes,
      errors: []
    });
  } catch (err) {
    next(err);
  }
}

async function createCode(req, res, next) {
  try {
    const code = (req.body.code || '').trim().toUpperCase();
    if (!code) {
      const codes = await db('discount_codes').orderBy('created_at', 'desc');
      return res.status(400).render('admin/discounts', {
        title: 'Mã giảm giá - FAW Admin',
        codes,
        errors: [{ msg: 'Vui lòng nhập mã giảm giá.' }]
      });
    }

    await db('discount_codes').insert({
      code,
      type: req.body.type === 'fixed' ? 'fixed' : 'percent',
      value: Number(req.body.value) || 0,
      min_order_total: req.body.minOrderTotal ? Number(req.body.minOrderTotal) : null,
      max_uses: req.body.maxUses ? Number(req.body.maxUses) : null,
      starts_at: req.body.startsAt || null,
      expires_at: req.body.expiresAt || null,
      is_active: true
    });

    res.redirect('/admin/ma-giam-gia');
  } catch (err) {
    next(err);
  }
}

async function toggleCode(req, res, next) {
  try {
    const row = await db('discount_codes').where('id', req.params.id).first();
    if (row) {
      await db('discount_codes').where('id', row.id).update({ is_active: !row.is_active });
    }
    res.redirect('/admin/ma-giam-gia');
  } catch (err) {
    next(err);
  }
}

async function deleteCode(req, res, next) {
  try {
    await db('discount_codes').where('id', req.params.id).del();
    res.redirect('/admin/ma-giam-gia');
  } catch (err) {
    next(err);
  }
}

module.exports = { listCodes, createCode, toggleCode, deleteCode };
