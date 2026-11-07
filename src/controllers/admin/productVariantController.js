const db = require('../../db');

async function createVariant(req, res, next) {
  try {
    const productId = Number(req.params.id);
    const product = await db('products').where('id', productId).first();
    if (!product) return res.redirect('/admin/san-pham');

    const size = (req.body.size || '').trim();
    if (!size) return res.redirect(`/admin/san-pham/${productId}/sua`);

    await db('product_variants').insert({
      product_id: productId,
      size,
      color: req.body.color || null,
      color_hex: req.body.colorHex || null,
      sku: req.body.sku || null,
      stock: Number(req.body.stock) || 0,
      price_override: req.body.priceOverride ? Number(req.body.priceOverride) : null
    });

    res.redirect(`/admin/san-pham/${productId}/sua`);
  } catch (err) {
    next(err);
  }
}

async function updateVariant(req, res, next) {
  try {
    const productId = Number(req.params.id);
    await db('product_variants')
      .where({ id: req.params.variantId, product_id: productId })
      .update({
        size: req.body.size,
        color: req.body.color || null,
        color_hex: req.body.colorHex || null,
        sku: req.body.sku || null,
        stock: Number(req.body.stock) || 0,
        price_override: req.body.priceOverride ? Number(req.body.priceOverride) : null
      });
    res.redirect(`/admin/san-pham/${productId}/sua`);
  } catch (err) {
    next(err);
  }
}

async function deleteVariant(req, res, next) {
  try {
    const productId = Number(req.params.id);
    await db('product_variants').where({ id: req.params.variantId, product_id: productId }).del();
    res.redirect(`/admin/san-pham/${productId}/sua`);
  } catch (err) {
    next(err);
  }
}

// Save the whole colour x size matrix of a product in one go.
// Existing variants are updated, missing ones are created, removed ones deleted.
async function saveMatrix(req, res, next) {
  try {
    const productId = Number(req.params.id);
    const product = await db('products').where('id', productId).first();
    if (!product) return res.redirect('/admin/san-pham');

    let matrix = {};
    try { matrix = JSON.parse(req.body.matrix || '{}'); } catch (e) { matrix = {}; }

    const sizes = [];
    (Array.isArray(matrix.sizes) ? matrix.sizes : []).forEach((s) => {
      const v = String(s || '').trim();
      if (v && !sizes.some((x) => x.toLowerCase() === v.toLowerCase())) sizes.push(v);
    });

    let colors = (Array.isArray(matrix.colors) ? matrix.colors : []).map((c) => ({
      name: String((c && c.name) || '').trim(),
      hex: /^#[0-9a-fA-F]{6}$/.test((c && c.hex) || '') ? c.hex : null
    }));
    const stockRows = Array.isArray(matrix.stock) ? matrix.stock : [];
    // keep each colour's stock row aligned before we filter
    colors = colors.map((c, i) => Object.assign(c, { row: Array.isArray(stockRows[i]) ? stockRows[i] : [] }));
    if (colors.length === 0) colors = [{ name: '', hex: null, row: Array.isArray(stockRows[0]) ? stockRows[0] : [] }];

    const wanted = new Map();
    colors.forEach((c) => {
      sizes.forEach((size, si) => {
        const key = c.name.toLowerCase() + '|' + size.toLowerCase();
        if (wanted.has(key)) return;
        wanted.set(key, {
          size,
          color: c.name || null,
          color_hex: c.name ? c.hex : null,
          stock: Math.max(0, parseInt(String(c.row[si] == null ? 0 : c.row[si]).replace(/\D/g, ''), 10) || 0)
        });
      });
    });

    const existing = await db('product_variants').where('product_id', productId);
    const seen = new Set();
    for (const v of existing) {
      const key = (v.color || '').toLowerCase() + '|' + String(v.size).toLowerCase();
      const target = wanted.get(key);
      if (target && !seen.has(key)) {
        seen.add(key);
        await db('product_variants').where('id', v.id).update(target);
      } else {
        try {
          await db('product_variants').where('id', v.id).del();
        } catch (e) {
          await db('product_variants').where('id', v.id).update({ stock: 0 });
        }
      }
    }
    for (const [key, target] of wanted) {
      if (!seen.has(key)) await db('product_variants').insert(Object.assign({ product_id: productId }, target));
    }

    res.redirect(`/admin/san-pham/${productId}/sua`);
  } catch (err) {
    next(err);
  }
}

module.exports = { createVariant, updateVariant, deleteVariant, saveMatrix };
