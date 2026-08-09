const db = require('../db');
const { localizeProduct, localizeCategory } = require('../utils/i18n');

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

    const related = await db('products')
      .where({ category_id: product.category_id, is_active: true })
      .andWhereNot({ id: product.id })
      .limit(4);

    res.render('product', {
      title: `${locale === 'en' ? product.name_en : product.name_vi} — FOR A WHILE`,
      bodyClass: 'page-product',
      product: localizeProduct(product, locale),
      variants,
      sizes,
      colors,
      images: images.length ? images : [{ image_url: product.cover_image_url, sort_order: 0 }],
      category: category ? localizeCategory(category, locale) : null,
      relatedProducts: related.map((p) => localizeProduct(p, locale))
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { showProduct };
