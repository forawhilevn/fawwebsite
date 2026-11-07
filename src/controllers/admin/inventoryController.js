const db = require('../../db');

const LOW_STOCK = 5;

async function showInventory(req, res, next) {
  try {
    const products = await db('products')
      .join('categories', 'products.category_id', 'categories.id')
      .select('products.id', 'products.name_vi', 'products.cover_image_url', 'products.is_active', 'categories.name_vi as category_name')
      .orderBy('products.name_vi');
    const variants = await db('product_variants').orderBy(['product_id', 'id']);

    const byProduct = new Map();
    variants.forEach((v) => {
      if (!byProduct.has(v.product_id)) byProduct.set(v.product_id, []);
      byProduct.get(v.product_id).push(v);
    });

    let totalUnits = 0;
    let soldOut = 0;
    let low = 0;
    const rows = products.map((p) => {
      const list = byProduct.get(p.id) || [];
      const total = list.reduce((sum, v) => sum + (v.stock || 0), 0);
      totalUnits += total;
      list.forEach((v) => {
        if (v.stock <= 0) soldOut += 1;
        else if (v.stock <= LOW_STOCK) low += 1;
      });
      return Object.assign({}, p, { variants: list, total });
    });

    res.render('admin/inventory', {
      title: 'Tồn kho - FAW Admin',
      rows,
      summary: { products: products.length, variants: variants.length, totalUnits, soldOut, low },
      lowStock: LOW_STOCK
    });
  } catch (err) {
    next(err);
  }
}

// Body fields look like stock_<variantId>=<number>
async function saveInventory(req, res, next) {
  try {
    const updates = [];
    Object.keys(req.body || {}).forEach((key) => {
      const m = /^stock_(\d+)$/.exec(key);
      if (!m) return;
      const stock = Math.max(0, parseInt(String(req.body[key]).replace(/\D/g, ''), 10) || 0);
      updates.push({ id: Number(m[1]), stock });
    });
    await db.transaction(async (trx) => {
      for (const u of updates) {
        await trx('product_variants').where('id', u.id).update({ stock: u.stock });
      }
    });
    res.redirect('/admin/ton-kho');
  } catch (err) {
    next(err);
  }
}

module.exports = { showInventory, saveInventory };
