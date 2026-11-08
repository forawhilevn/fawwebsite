const db = require('../../db');
const settings = require('../../services/settings');
const promotions = require('../../services/promotions');
const { ensurePromoSchema } = require('../../services/promoSchema');

const KINDS = {
  freeship: 'Freeship',
  order_discount: 'Giảm theo giá trị đơn',
  quantity_discount: 'Mua nhiều giảm nhiều',
  product_discount: 'Giảm theo sản phẩm / danh mục'
};

function clean(v, max) { return String(v || '').trim().slice(0, max); }
function intOrNull(v) {
  const n = parseInt(String(v || '').replace(/\D/g, ''), 10);
  return isFinite(n) && n > 0 ? n : null;
}
function dateOrNull(v) { return /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? v : null; }
function list(v) { return Array.isArray(v) ? v : (v ? [v] : []); }

function fromBody(b) {
  const kind = KINDS[b.kind] ? b.kind : 'order_discount';
  const isFree = kind === 'freeship';
  const type = b.discountType === 'fixed' ? 'fixed' : 'percent';
  let value = isFree ? 0 : (intOrNull(b.value) || 0);
  if (!isFree && type === 'percent') value = Math.min(value, 100);
  const scopeType = kind === 'product_discount' && ['category', 'product'].includes(b.scopeType) ? b.scopeType : 'all';
  const ids = scopeType === 'category' ? list(b.scopeCategories) : scopeType === 'product' ? list(b.scopeProducts) : [];
  const requireCode = b.requireCode === '1';
  return {
    kind,
    name_vi: clean(b.nameVi, 200),
    name_en: clean(b.nameEn, 200) || null,
    discount_type: type,
    value,
    min_order_total: intOrNull(b.minOrderTotal),
    min_quantity: kind === 'quantity_discount' ? (intOrNull(b.minQuantity) || 2) : intOrNull(b.minQuantity),
    scope_type: scopeType,
    scope_ids: ids.map((x) => String(x).replace(/\D/g, '')).filter(Boolean).join(',') || null,
    require_code: requireCode,
    code: requireCode ? clean(b.code, 60).toUpperCase() || null : null,
    starts_at: dateOrNull(b.startsAt),
    expires_at: dateOrNull(b.expiresAt),
    bar_text_vi: clean(b.barTextVi, 300) || null,
    bar_text_en: clean(b.barTextEn, 300) || null
  };
}

async function render(res, extra) {
  await ensurePromoSchema();
  const [rows, categories, products, s] = await Promise.all([
    db('promotions').orderBy('sort_order').orderBy('id'),
    db('categories').orderBy('sort_order'),
    db('products').orderBy('name_vi'),
    settings.getAll()
  ]);
  res.render('admin/promotions', Object.assign({
    title: 'Khuyến mãi - FAW Admin',
    promos: rows,
    categories,
    products,
    s,
    kinds: KINDS,
    editing: null,
    error: null,
    saved: null
  }, extra || {}));
}

async function listPromos(req, res, next) {
  try {
    let editing = null;
    if (req.query.sua) {
      await ensurePromoSchema();
      editing = await db('promotions').where({ id: req.query.sua }).first() || null;
    }
    await render(res, { editing, saved: req.query.saved || null });
  } catch (err) {
    next(err);
  }
}

function validate(data) {
  if (!data.name_vi) return 'Vui lòng nhập tên chương trình.';
  if (data.kind !== 'freeship' && !data.value) return 'Vui lòng nhập mức giảm.';
  if (data.kind === 'freeship' && !data.min_order_total && !data.min_quantity && false) return '';
  if (data.require_code && !data.code) return 'Vui lòng nhập mã khi chọn "cần nhập mã".';
  if (data.scope_type !== 'all' && !data.scope_ids) return 'Vui lòng chọn ít nhất một sản phẩm / danh mục.';
  return null;
}

async function createPromo(req, res, next) {
  try {
    await ensurePromoSchema();
    const data = fromBody(req.body);
    const error = validate(data);
    if (error) return render(res, { error });
    const max = await db('promotions').max({ m: 'sort_order' }).first();
    data.sort_order = ((max && max.m) || 0) + 1;
    data.is_active = true;
    await db('promotions').insert(data);
    promotions.clearCache();
    res.redirect('/admin/khuyen-mai?saved=1');
  } catch (err) {
    next(err);
  }
}

async function updatePromo(req, res, next) {
  try {
    await ensurePromoSchema();
    const promo = await db('promotions').where({ id: req.params.id }).first();
    if (!promo) return res.redirect('/admin/khuyen-mai');
    const data = fromBody(req.body);
    const error = validate(data);
    if (error) return render(res, { error, editing: promo });
    await db('promotions').where({ id: promo.id }).update(data);
    promotions.clearCache();
    res.redirect('/admin/khuyen-mai?saved=1');
  } catch (err) {
    next(err);
  }
}

async function togglePromo(req, res, next) {
  try {
    const p = await db('promotions').where({ id: req.params.id }).first();
    if (p) await db('promotions').where({ id: p.id }).update({ is_active: !p.is_active });
    promotions.clearCache();
    res.redirect('/admin/khuyen-mai');
  } catch (err) {
    next(err);
  }
}

async function deletePromo(req, res, next) {
  try {
    await db('promotions').where({ id: req.params.id }).del();
    promotions.clearCache();
    res.redirect('/admin/khuyen-mai');
  } catch (err) {
    next(err);
  }
}

async function saveShipping(req, res, next) {
  try {
    const n = (v) => String(parseInt(String(v || '').replace(/\D/g, ''), 10) || 0);
    await settings.setMany({ ship_fee_hcm: n(req.body.feeHcm), ship_fee_other: n(req.body.feeOther) });
    res.redirect('/admin/khuyen-mai?saved=ship');
  } catch (err) {
    next(err);
  }
}

module.exports = { listPromos, createPromo, updatePromo, togglePromo, deletePromo, saveShipping, KINDS };
