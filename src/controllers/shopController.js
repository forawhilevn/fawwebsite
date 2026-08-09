const db = require('../db');
const { localizeProduct, localizeCategory } = require('../utils/i18n');

async function showShop(req, res, next) {
  try {
    const locale = res.locals.locale;
    const { categorySlug } = req.params;
    const { size, sort } = req.query;

    let category = null;
    let query = db('products').where({ is_active: true });

    if (categorySlug) {
      category = await db('categories').where({ slug: categorySlug }).first();
      if (!category) {
        return res.status(404).render('error', {
          title: res.locals.t('error.notFoundTitle'),
          statusCode: 404,
          message: res.locals.t('error.notFoundMessage')
        });
      }
      query = query.andWhere({ category_id: category.id });
    }

    if (size) {
      const variantProductIds = await db('product_variants').where({ size }).distinct('product_id');
      query = query.whereIn(
        'id',
        variantProductIds.map((v) => v.product_id)
      );
    }

    if (sort === 'price-asc') query = query.orderBy('price', 'asc');
    else if (sort === 'price-desc') query = query.orderBy('price', 'desc');
    else query = query.orderBy('created_at', 'desc');

    const products = await query;
    const productIds = products.map((p) => p.id);

    const variants = productIds.length
      ? await db('product_variants').whereIn('product_id', productIds)
      : [];
    const stockByProduct = new Map();
    for (const v of variants) {
      stockByProduct.set(v.product_id, (stockByProduct.get(v.product_id) || 0) + v.stock);
    }

    const categories = await db('categories').orderBy('sort_order');
    const allSizes = [...new Set(variants.map((v) => v.size))];

    res.render('shop', {
      title: `${res.locals.t('shop.title')} — FOR A WHILE`,
      bodyClass: 'page-shop',
      products: products.map((p) => ({
        ...localizeProduct(p, locale),
        inStock: (stockByProduct.get(p.id) || 0) > 0
      })),
      categories: categories.map((c) => localizeCategory(c, locale)),
      activeCategory: category ? localizeCategory(category, locale) : null,
      allSizes,
      activeSize: size || '',
      activeSort: sort || 'newest'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { showShop };
