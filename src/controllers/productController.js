const db = require('../db');
const { localizeProduct, localizeCategory } = require('../utils/i18n');
const { getLookbookImages, getSizeChartUrl } = require('../utils/assets');
const { formatVND } = require('../utils/format');

// Fallback swatch colours when the admin has not picked a hex code yet.
const COLOR_FALLBACK = {
  black: '#111111', white: '#f5f5f5', grey: '#6b6b63', gray: '#6b6b63', navy: '#31394a',
  orange: '#f4791d', red: '#eb252a', blue: '#2f5fd0', green: '#2f7d4f', brown: '#6b4a32',
  beige: '#d9c7a3', cream: '#efe6d2', pink: '#f08bb0', purple: '#7a4fb0', yellow: '#f2c230'
};

function swatchHex(color, hex) {
  if (/^#[0-9a-fA-F]{3,8}$/.test(hex || '')) return hex;
  return COLOR_FALLBACK[String(color || '').trim().toLowerCase()] || '#8a8a8a';
}

async function showProduct(req, res, next) {
  try {
    const locale = res.locals.locale;
    const { slug } = req.params;

    const product = await db('products').where({ slug, is_active: true }).first();
    if (!product) {
      return res.status(404).render('error', {
        title: res.locals.t('error.notFoundTitle'),
        statusCode: 404,
        message: res.locals.t('error.notFoundMessage')
      });
    }

    const [variants, images, category] = await Promise.all([
      db('product_variants').where({ product_id: product.id }).orderBy('id'),
      db('product_images').where({ product_id: product.id }).orderBy('sort_order'),
      db('categories').where({ id: product.category_id }).first()
    ]);

    const sizes = [...new Set(variants.map((v) => v.size))];
    const colors = [...new Set(variants.map((v) => v.color).filter(Boolean))];
    const hasColors = colors.length > 1;

    // Public variant payload for the product page script: effective price,
    // stock and whether the variant is already in this visitor's cart.
    const cartMap = (req.session && req.session.cart) || {};
    const variantData = variants.map((v) => {
      const unit = v.price_override || product.sale_price || product.price;
      return {
        id: v.id,
        size: v.size,
        color: v.color || null,
        hex: v.color ? swatchHex(v.color, v.color_hex) : null,
        stock: v.stock,
        price: unit,
        priceLabel: formatVND(unit),
        override: !!v.price_override,
        inCart: Number(cartMap[String(v.id)] || 0) > 0
      };
    });

    const defaultVariant = variantData.find((v) => v.stock > 0) || variantData[0] || null;

    // Initial (server-rendered) state of the size / colour buttons.
    const sizeOptions = sizes.map((size) => ({
      value: size,
      selected: !!defaultVariant && defaultVariant.size === size,
      soldOut: !variantData.some(
        (v) =>
          v.size === size &&
          v.stock > 0 &&
          (!hasColors || !defaultVariant || v.color === defaultVariant.color)
      )
    }));
    const colorOptions = hasColors
      ? colors.map((color) => ({
          value: color,
          hex: (variantData.find((v) => v.color === color) || {}).hex || '#8a8a8a',
          selected: !!defaultVariant && defaultVariant.color === color,
          soldOut: !variantData.some(
            (v) => v.color === color && v.stock > 0 && (!defaultVariant || v.size === defaultVariant.size)
          )
        }))
      : [];

    const related = await db('products')
      .where({ is_active: true })
      .andWhereNot({ id: product.id })
      .orderBy('created_at', 'desc')
      .limit(4);

    res.render('product', {
      title: `${locale === 'en' ? product.name_en : product.name_vi} — FOR A WHILE`,
      bodyClass: 'page-product',
      product: localizeProduct(product, locale),
      variantData,
      defaultVariant,
      sizeOptions,
      colorOptions,
      hasColors,
      images: images.length ? images : [{ image_url: product.cover_image_url, sort_order: 0 }],
      category: category ? localizeCategory(category, locale) : null,
      relatedProducts: related.map((p) => localizeProduct(p, locale)),
      lookbookImages: getLookbookImages(product.slug),
      sizeChartUrl: getSizeChartUrl(product.slug)
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { showProduct };
