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

module.exports = { createVariant, updateVariant, deleteVariant };
