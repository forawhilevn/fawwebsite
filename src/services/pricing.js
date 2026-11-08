const settings = require('./settings');
const promotions = require('./promotions');
const discountService = require('./discount');

const ZONES = ['hcm', 'other'];

function fee(s, zone) {
  const n = Number(zone === 'hcm' ? s.ship_fee_hcm : s.ship_fee_other);
  return isFinite(n) && n >= 0 ? n : 0;
}

function promoAmount(p, cart) {
  let base = cart.subtotal;
  if (p.kind === 'product_discount' && p.scope_type !== 'all') {
    const ids = String(p.scope_ids || '').split(',').map((x) => x.trim()).filter(Boolean);
    base = cart.items.reduce((sum, i) => {
      const key = p.scope_type === 'category' ? i.product.category_id : i.product.id;
      return ids.indexOf(String(key)) !== -1 ? sum + i.lineTotal : sum;
    }, 0);
  }
  if (base <= 0) return 0;
  if (p.discount_type === 'fixed') return Math.min(p.value, base);
  return Math.round((base * p.value) / 100);
}

function eligible(p, cart) {
  if (p.min_order_total && cart.subtotal < p.min_order_total) return false;
  if (p.min_quantity && cart.count < p.min_quantity) return false;
  return true;
}

// One place that works out discounts, free shipping, shipping fee and total.
// Rule: only the best single discount applies; free shipping stacks on top.
async function computePricing({ cart, zone, codeInput, locale }) {
  const s = await settings.getAll();
  const code = String(codeInput || '').trim().toUpperCase();
  const promos = await promotions.getActive();

  const candidates = [];
  let freeship = null;
  let codeMatched = false;

  promos.forEach((p) => {
    if (p.require_code) {
      if (!code || String(p.code || '').toUpperCase() !== code) return;
      codeMatched = true;
    }
    if (!eligible(p, cart)) return;
    if (p.kind === 'freeship') {
      if (!freeship) freeship = p;
      return;
    }
    const amount = promoAmount(p, cart);
    if (amount > 0) candidates.push({ amount, label: promotions.localName(p, locale), promo: p });
  });

  let codeRow = null;
  if (code) {
    codeRow = await discountService.findValidCode(code, cart.subtotal);
    if (codeRow) {
      codeMatched = true;
      const amount = discountService.computeDiscountAmount(codeRow, cart.subtotal);
      if (amount > 0) candidates.push({ amount, label: codeRow.code, codeRow });
    }
  }

  candidates.sort((a, b) => b.amount - a.amount);
  const best = candidates[0] || null;
  const discountAmount = best ? Math.min(best.amount, cart.subtotal) : 0;

  const zoneOk = ZONES.indexOf(zone) !== -1;
  const baseFee = zoneOk ? fee(s, zone) : null;
  const shippingFee = zoneOk ? (freeship ? 0 : baseFee) : null;

  // progress toward the nearest automatic free-shipping promo
  let progress = null;
  const autoFree = promos.filter((p) => p.kind === 'freeship' && !p.require_code);
  if (autoFree.length) {
    if (autoFree.some((p) => eligible(p, cart))) {
      progress = { reached: true };
    } else {
      const pending = autoFree
        .filter((p) => p.min_order_total && !p.min_quantity)
        .sort((a, b) => a.min_order_total - b.min_order_total)[0];
      if (pending) {
        const need = pending.min_order_total - cart.subtotal;
        progress = { reached: false, need, percent: Math.max(0, Math.min(100, Math.round((cart.subtotal / pending.min_order_total) * 100))) };
      }
    }
  }

  // nearest upcoming automatic discount promo that would beat the current discount
  let nextPromo = null;
  promos.forEach((p) => {
    if (p.require_code || p.kind === 'freeship') return;
    if (!p.min_order_total || p.min_quantity || p.scope_type === 'category' || p.scope_type === 'product') return;
    if (cart.subtotal >= p.min_order_total) return;
    const hypothetical = { subtotal: p.min_order_total, items: cart.items, count: cart.count };
    if (promoAmount(p, hypothetical) <= discountAmount) return;
    const need = p.min_order_total - cart.subtotal;
    if (!nextPromo || need < nextPromo.need) {
      nextPromo = { need, min: p.min_order_total, text: promotions.autoText(p, locale), promo: p };
    }
  });
  if (nextPromo) nextPromo = { need: nextPromo.need, min: nextPromo.min, text: nextPromo.text };

  const total = Math.max(0, cart.subtotal - discountAmount) + (shippingFee || 0);
  const notes = [];
  if (best) notes.push(best.label + ' (-' + best.amount + ')');
  if (freeship) notes.push(promotions.localName(freeship, locale));

  return {
    subtotal: cart.subtotal,
    discountAmount,
    discountLabel: best ? best.label : '',
    codeRow: best && best.codeRow ? best.codeRow : null,
    freeship: !!freeship,
    freeshipLabel: freeship ? promotions.localName(freeship, locale) : '',
    zone: zoneOk ? zone : null,
    baseFee,
    shippingFee,
    total,
    progress,
    nextPromo,
    codeInvalid: !!code && !codeMatched,
    note: notes.join('; ').slice(0, 480)
  };
}

module.exports = { computePricing, ZONES };
