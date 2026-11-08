const db = require('../db');
const { ensurePromoSchema } = require('./promoSchema');
const { formatVND } = require('../utils/format');

let cache = null;
let cacheAt = 0;

function inWindow(p, now) {
  if (p.starts_at && now < new Date(p.starts_at + 'T00:00:00')) return false;
  if (p.expires_at && now > new Date(p.expires_at + 'T23:59:59')) return false;
  return true;
}

// Active promotions right now (cached for a few seconds).
async function getActive() {
  const now = Date.now();
  if (!cache || now - cacheAt > 5000) {
    try {
      await ensurePromoSchema();
      cache = await db('promotions').where({ is_active: true }).orderBy('sort_order').orderBy('id');
      cacheAt = now;
    } catch (err) {
      return [];
    }
  }
  const d = new Date();
  return cache.filter((p) => inWindow(p, d));
}

function clearCache() { cache = null; }

function localName(p, locale) {
  return (locale === 'en' && p.name_en) || p.name_vi;
}

function valueText(p) {
  return p.discount_type === 'fixed' ? formatVND(p.value) : p.value + '%';
}

function autoText(p, locale) {
  const en = locale === 'en';
  if (p.kind === 'freeship') {
    return p.min_order_total
      ? (en ? 'Free shipping on orders from ' : 'Freeship cho đơn từ ') + formatVND(p.min_order_total)
      : (en ? 'Free shipping on all orders' : 'Freeship cho mọi đơn hàng');
  }
  if (p.kind === 'quantity_discount') {
    return (en ? 'Buy ' + (p.min_quantity || 2) + '+ items, get ' + valueText(p) + ' off'
              : 'Mua từ ' + (p.min_quantity || 2) + ' sản phẩm giảm ' + valueText(p));
  }
  if (p.min_order_total) {
    return (en ? valueText(p) + ' off orders from ' + formatVND(p.min_order_total)
              : 'Giảm ' + valueText(p) + ' cho đơn từ ' + formatVND(p.min_order_total));
  }
  return (en ? valueText(p) + ' off' : 'Giảm ' + valueText(p));
}

// Lines for the announcement bar: automatic promos only (or a promo with custom text).
async function announcements(locale) {
  const list = await getActive();
  const out = [];
  list.forEach((p) => {
    const custom = locale === 'en' ? (p.bar_text_en || p.bar_text_vi) : p.bar_text_vi;
    if (custom) out.push(custom);
    else if (!p.require_code) out.push(autoText(p, locale));
  });
  return out.slice(0, 4);
}

module.exports = { getActive, announcements, autoText, localName, clearCache };
