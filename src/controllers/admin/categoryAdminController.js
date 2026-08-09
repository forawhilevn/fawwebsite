const db = require('../../db');
const { slugify } = require('../../utils/slug');

async function listCategories(req, res, next) {
  try {
    const categories = await db('categories').orderBy('sort_order');
    res.render('admin/categories', {
      title: 'Quản lý danh mục - FAW Admin',
      categories,
      errors: []
    });
  } catch (err) {
    next(err);
  }
}

async function createCategory(req, res, next) {
  try {
    const nameVi = (req.body.nameVi || '').trim();
    const nameEn = (req.body.nameEn || '').trim();
    if (!nameVi || !nameEn) {
      const categories = await db('categories').orderBy('sort_order');
      return res.status(400).render('admin/categories', {
        title: 'Quản lý danh mục - FAW Admin',
        categories,
        errors: [{ msg: 'Vui lòng nhập tên danh mục (VI và EN).' }]
      });
    }

    const slugBase = slugify(nameEn);
    let slug = slugBase;
    let suffix = 1;
    while (await db('categories').where('slug', slug).first()) {
      slug = `${slugBase}-${suffix++}`;
    }

    const maxSort = await db('categories').max('sort_order as max').first();

    await db('categories').insert({
      slug,
      name_vi: nameVi,
      name_en: nameEn,
      sort_order: (maxSort.max || 0) + 1
    });

    res.redirect('/admin/danh-muc');
  } catch (err) {
    next(err);
  }
}

async function updateCategory(req, res, next) {
  try {
    await db('categories')
      .where('id', req.params.id)
      .update({
        name_vi: req.body.nameVi,
        name_en: req.body.nameEn,
        sort_order: Number(req.body.sortOrder) || 0
      });
    res.redirect('/admin/danh-muc');
  } catch (err) {
    next(err);
  }
}

async function deleteCategory(req, res, next) {
  try {
    await db('categories').where('id', req.params.id).del();
    res.redirect('/admin/danh-muc');
  } catch (err) {
    next(err);
  }
}

module.exports = { listCategories, createCategory, updateCategory, deleteCategory };
