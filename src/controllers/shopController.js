const db = require('../db');
const { localizeProduct, localizeCategory } = require('../utils/i18n');
const stock = require('../services/productStock');

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

    await stock.ensureProductStockSchema();
    query = stock.orderProducts(query, 'shop');

    const products = await query;
    const withStatus = await stock.attachStatus(products);

    res.render('shop', {
      title: `${res.locals.t('shop.title')} — FOR A WHILE`,
      bodyClass: 'page-shop',
      products: withStatus.map((p) => localizeProduct(p, locale)),
      activeCategory: category ? localizeCategory(category, locale) : null
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { showShop };
