const db = require('../db');
const { localizeProduct, localizeCategory } = require('../utils/i18n');

async function showShop(req, res, next) {
  try {
    const locale = res.locals.locale;
    const { categorySlug } = req.params;
    
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

    query = query.orderBy('created_at', 'desc');

    const products = await query;
    const productIds = products.map((p) => p.id);

    const variants = productIds.length
      ? await db('product_variants').whereIn('product_id', productIds)
      : [];
    const stockByProduct = new Map();
    for (const v of variants) {
      stockByProduct.set(v.product_id, (stockByProduct.get(v.product_id) || 0) + v.stock);
    }


    res.render('shop', {
      title: `${res.locals.t('shop.title')} — FOR A WHILE`,
      bodyClass: 'page-shop',
      products: products.map((p) => ({
        ...localizeProduct(p, locale),
        inStock: (stockByProduct.get(p.id) || 0) > 0
      })),
      activeCategory: category ? localizeCategory(category, locale) : null
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { showShop };
