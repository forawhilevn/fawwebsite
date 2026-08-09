const db = require('../db');

function ensureCart(req) {
  if (!req.session.cart) {
    req.session.cart = {};
  }
  return req.session.cart;
}

function addItem(req, variantId, quantity) {
  const cart = ensureCart(req);
  const id = String(variantId);
  cart[id] = (cart[id] || 0) + quantity;
  if (cart[id] < 1) delete cart[id];
}

function setQuantity(req, variantId, quantity) {
  const cart = ensureCart(req);
  const id = String(variantId);
  if (quantity <= 0) {
    delete cart[id];
  } else {
    cart[id] = quantity;
  }
}

function removeItem(req, variantId) {
  const cart = ensureCart(req);
  delete cart[String(variantId)];
}

function clearCart(req) {
  req.session.cart = {};
}

function cartCount(req) {
  const cart = req.session.cart || {};
  return Object.values(cart).reduce((sum, qty) => sum + qty, 0);
}

async function getCartDetails(req, locale) {
  const cart = ensureCart(req);
  const variantIds = Object.keys(cart).map(Number).filter(Boolean);
  if (variantIds.length === 0) {
    return { items: [], subtotal: 0, count: 0 };
  }

  const variants = await db('product_variants').whereIn('id', variantIds);
  const productIds = [...new Set(variants.map((v) => v.product_id))];
  const products = await db('products').whereIn('id', productIds);
  const productMap = new Map(products.map((p) => [p.id, p]));
  const variantMap = new Map(variants.map((v) => [v.id, v]));

  const images = await db('product_images')
    .whereIn('product_id', productIds)
    .orderBy('sort_order');
  const firstImageByProduct = new Map();
  for (const img of images) {
    if (!firstImageByProduct.has(img.product_id)) {
      firstImageByProduct.set(img.product_id, img.image_url);
    }
  }

  const items = [];
  let subtotal = 0;
  let count = 0;

  for (const [idStr, qty] of Object.entries(cart)) {
    const variant = variantMap.get(Number(idStr));
    if (!variant) continue;
    const product = productMap.get(variant.product_id);
    if (!product) continue;

    const unitPrice = variant.price_override || product.sale_price || product.price;
    const lineTotal = unitPrice * qty;
    subtotal += lineTotal;
    count += qty;

    const name = locale === 'en' && product.name_en ? product.name_en : product.name_vi;
    const variantLabel = [variant.size, variant.color].filter(Boolean).join(' / ');

    items.push({
      variant,
      product,
      productName: name,
      variantLabel,
      quantity: qty,
      unitPrice,
      lineTotal,
      image: product.cover_image_url || firstImageByProduct.get(product.id) || null
    });
  }

  return { items, subtotal, count };
}

module.exports = {
  addItem,
  setQuantity,
  removeItem,
  clearCart,
  cartCount,
  getCartDetails
};
