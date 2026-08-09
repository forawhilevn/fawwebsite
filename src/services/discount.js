const db = require('../db');

async function findValidCode(code, subtotal) {
  if (!code) return null;
  const row = await db('discount_codes').where({ code: code.trim().toUpperCase() }).first();
  if (!row || !row.is_active) return null;

  const now = new Date();
  if (row.starts_at && new Date(row.starts_at) > now) return null;
  if (row.expires_at && new Date(row.expires_at) < now) return null;
  if (row.max_uses && row.used_count >= row.max_uses) return null;
  if (row.min_order_total && subtotal < row.min_order_total) return null;

  return row;
}

function computeDiscountAmount(discountRow, subtotal) {
  if (!discountRow) return 0;
  if (discountRow.type === 'percent') {
    return Math.round((subtotal * discountRow.value) / 100);
  }
  return Math.min(discountRow.value, subtotal);
}

async function markUsed(discountId) {
  if (!discountId) return;
  await db('discount_codes').where({ id: discountId }).increment('used_count', 1);
}

module.exports = { findValidCode, computeDiscountAmount, markUsed };
