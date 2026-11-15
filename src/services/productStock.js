const db = require('../db');

// Adds products.stock_label / low_threshold on first use, so no manual migration is needed.
let ready = null;

function ensureProductStockSchema() {
  if (!ready) {
    ready = (async () => {
      if (!(await db.schema.hasColumn('products', 'stock_label'))) {
        await db.schema.alterTable('products', (t) => { t.string('stock_label', 10).nullable(); });
      }
      if (!(await db.schema.hasColumn('products', 'low_threshold'))) {
        await db.schema.alterTable('products', (t) => { t.integer('low_threshold').nullable(); });
      }
      // manual display order (home page / shop page)
      if (!(await db.schema.hasColumn('products', 'home_order'))) {
        await db.schema.alterTable('products', (t) => { t.integer('home_order').nullable(); });
      }
      if (!(await db.schema.hasColumn('products', 'shop_order'))) {
        await db.schema.alterTable('products', (t) => { t.integer('shop_order').nullable(); });
      }
    })().catch((err) => { ready = null; throw err; });
  }
  return ready;
}

const DEFAULT_LOW = 5;

// manual order first (smallest number on top), products never ordered by hand go last, newest first
function orderProducts(query, mode) {
  const col = mode === 'shop' ? 'products.shop_order' : 'products.home_order';
  return query.orderByRaw('CASE WHEN ' + col + ' IS NULL THEN 1 ELSE 0 END, ' + col + ' ASC, products.created_at DESC');
}

// 'soldout' | 'low' | 'ok'
//  stock_label: 'soldout' / 'low' = set by hand in admin, anything else = automatic
function computeStatus(product, variants) {
  const total = (variants || []).reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
  const label = product && product.stock_label;
  if (label === 'soldout') return 'soldout';
  if (!variants || !variants.length || total <= 0) return 'soldout';
  if (label === 'low') return 'low';
  const raw = product && product.low_threshold;
  const threshold = raw === null || raw === undefined || raw === '' ? DEFAULT_LOW : Number(raw);
  if (threshold > 0 && total <= threshold) return 'low';
  return 'ok';
}

// adds stockStatus (+ stockTotal) to every product in the list
async function attachStatus(products) {
  const list = products || [];
  const ids = list.map((p) => p.id);
  const variants = ids.length ? await db('product_variants').whereIn('product_id', ids) : [];
  const by = new Map();
  variants.forEach((v) => {
    if (!by.has(v.product_id)) by.set(v.product_id, []);
    by.get(v.product_id).push(v);
  });
  return list.map((p) => {
    const vs = by.get(p.id) || [];
    return Object.assign({}, p, {
      stockStatus: computeStatus(p, vs),
      stockTotal: vs.reduce((sum, v) => sum + (Number(v.stock) || 0), 0)
    });
  });
}

module.exports = { ensureProductStockSchema, computeStatus, attachStatus, orderProducts, DEFAULT_LOW };
