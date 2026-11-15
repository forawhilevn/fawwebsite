const fs = require('fs');
const storage = require('../../utils/storage');
const path = require('path');
const { body, validationResult } = require('express-validator');
const db = require('../../db');
const { slugify } = require('../../utils/slug');
const { cropToFixedSize } = require('../../utils/imageProcess');
const { getLookbookImages } = require('../../utils/assets');
const stock = require('../../services/productStock');

const IMAGE_ERROR_MESSAGE = 'Ảnh không hợp lệ hoặc bị lỗi khi xử lý. Vui lòng thử lại với file JPG/PNG/GIF/WEBP khác.';

function stockLabelOf(b) {
  return b && (b.stockLabel === 'low' || b.stockLabel === 'soldout') ? b.stockLabel : null;
}

function lowThresholdOf(b) {
  const n = parseInt(String((b && b.lowThreshold) || '').replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

// the form posts camelCase fields but the template reads DB-style columns:
// map them so nothing typed is lost when the form is shown again after an error
function formToProduct(b, base) {
  b = b || {};
  return Object.assign({}, base || {}, {
    name_vi: b.nameVi || '',
    name_en: b.nameEn || '',
    category_id: b.categoryId ? Number(b.categoryId) : null,
    price: b.price || '',
    sale_price: b.salePrice || '',
    sku: b.sku || '',
    description_vi: b.descriptionVi || '',
    description_en: b.descriptionEn || '',
    is_featured: b.isFeatured === 'on',
    is_active: b.isActive === 'on' || b.isActive === 'true',
    stock_label: stockLabelOf(b),
    low_threshold: b.lowThreshold === undefined || b.lowThreshold === '' ? null : b.lowThreshold
  });
}

function removeUploadedFile(imageUrl) {
  if (imageUrl && imageUrl.startsWith('/images/uploads/')) {
    const filePath = path.join(storage.STORAGE_DIR, imageUrl);
    fs.unlink(filePath, () => {});
  }
}

async function listProducts(req, res, next) {
  try {
    await stock.ensureProductStockSchema();
    const mode = req.query.mode === 'shop' ? 'shop' : 'home';
    const products = await stock.orderProducts(
      db('products')
        .join('categories', 'products.category_id', 'categories.id')
        .select('products.*', 'categories.name_vi as category_name'),
      mode
    );

    res.render('admin/products', {
      title: 'Quản lý sản phẩm - FAW Admin',
      products: await stock.attachStatus(products),
      mode
    });
  } catch (err) {
    next(err);
  }
}

async function newProductForm(req, res, next) {
  try {
    const categories = await db('categories').orderBy('sort_order');
    res.render('admin/product-form', {
      title: 'Thêm sản phẩm - FAW Admin',
      categories,
      product: {},
      errors: [],
      isEdit: false,
      galleryImages: [],
      variants: [],
      lookbookImages: []
    });
  } catch (err) {
    next(err);
  }
}

const productValidators = [
  body('nameVi').trim().notEmpty().withMessage('Vui lòng nhập tên sản phẩm (VI)'),
  body('nameEn').trim().notEmpty().withMessage('Vui lòng nhập tên sản phẩm (EN)'),
  body('categoryId').isInt().withMessage('Vui lòng chọn danh mục'),
  body('price').isInt({ min: 0 }).withMessage('Giá phải là số nguyên >= 0'),
  body('salePrice').optional({ checkFalsy: true }).isInt({ min: 0 }).withMessage('Giá khuyến mãi không hợp lệ')
];

async function createProduct(req, res, next) {
  try {
    const errors = validationResult(req);
    const categories = await db('categories').orderBy('sort_order');

    if (!errors.isEmpty()) {
      if (req.file) removeUploadedFile('/images/uploads/products/' + req.file.filename);
      return res.status(400).render('admin/product-form', {
        title: 'Thêm sản phẩm - FAW Admin',
        categories,
        product: formToProduct(req.body),
        errors: errors.array(),
        isEdit: false,
        galleryImages: [],
        variants: [],
        lookbookImages: []
      });
    }

    const slugBase = slugify(req.body.nameEn);
    let slug = slugBase;
    let suffix = 1;
    while (await db('products').where('slug', slug).first()) {
      slug = `${slugBase}-${suffix++}`;
    }

    let coverImageUrl = null;
    if (req.file) {
      const destPath = path.join(storage.STORAGE_DIR, 'images', 'uploads', 'products', req.file.filename);
      try {
        await cropToFixedSize(destPath, 'product');
      } catch (imgErr) {
        // could not crop: keep the original upload instead of failing the whole product
        console.warn('cover crop failed, keeping original:', imgErr && imgErr.message);
      }
      coverImageUrl = '/images/uploads/products/' + req.file.filename;
    }

    await stock.ensureProductStockSchema();
    // new products go to the top of both orders
    const mins = (await db('products').min({ h: 'home_order', s: 'shop_order' }).first()) || {};
    const [productId] = await db('products')
      .insert({
        home_order: (Number(mins.h) || 0) - 1,
        shop_order: (Number(mins.s) || 0) - 1,
        category_id: Number(req.body.categoryId),
        name_vi: req.body.nameVi,
        name_en: req.body.nameEn,
        slug,
        description_vi: req.body.descriptionVi || null,
        description_en: req.body.descriptionEn || null,
        sku: req.body.sku || null,
        price: Number(req.body.price),
        sale_price: req.body.salePrice ? Number(req.body.salePrice) : null,
        cover_image_url: coverImageUrl,
        is_featured: req.body.isFeatured === 'on',
        is_active: req.body.isActive === 'on',
        stock_label: stockLabelOf(req.body),
        low_threshold: lowThresholdOf(req.body)
      })
      .returning('id');

    const insertedId = typeof productId === 'object' ? productId.id : productId;
    res.redirect(`/admin/san-pham/${insertedId}/sua`);
  } catch (err) {
    next(err);
  }
}

async function editProductForm(req, res, next) {
  try {
    const product = await db('products').where('id', req.params.id).first();
    if (!product) return res.redirect('/admin/san-pham');

    const categories = await db('categories').orderBy('sort_order');
    const galleryImages = await db('product_images').where('product_id', product.id).orderBy('sort_order');
    const variants = await db('product_variants').where('product_id', product.id).orderBy('id');
    const lookbookImages = getLookbookImages(product.slug);

    res.render('admin/product-form', {
      title: 'Sửa sản phẩm - FAW Admin',
      categories,
      product,
      errors: [],
      isEdit: true,
      galleryImages,
      variants,
      lookbookImages
    });
  } catch (err) {
    next(err);
  }
}

async function updateProduct(req, res, next) {
  try {
    const product = await db('products').where('id', req.params.id).first();
    if (!product) return res.redirect('/admin/san-pham');

    const errors = validationResult(req);
    const categories = await db('categories').orderBy('sort_order');
    const galleryImages = await db('product_images').where('product_id', product.id).orderBy('sort_order');
    const variants = await db('product_variants').where('product_id', product.id).orderBy('id');
    const lookbookImages = getLookbookImages(product.slug);

    if (!errors.isEmpty()) {
      if (req.file) removeUploadedFile('/images/uploads/products/' + req.file.filename);
      return res.status(400).render('admin/product-form', {
        title: 'Sửa sản phẩm - FAW Admin',
        categories,
        product: formToProduct(req.body, product),
        errors: errors.array(),
        isEdit: true,
        galleryImages,
        variants,
        lookbookImages
      });
    }

    let coverImageUrl = product.cover_image_url;
    if (req.file) {
      const destPath = path.join(storage.STORAGE_DIR, 'images', 'uploads', 'products', req.file.filename);
      try {
        await cropToFixedSize(destPath, 'product');
      } catch (imgErr) {
        // could not crop: keep the original upload instead of failing the whole product
        console.warn('cover crop failed, keeping original:', imgErr && imgErr.message);
      }
      removeUploadedFile(product.cover_image_url);
      coverImageUrl = '/images/uploads/products/' + req.file.filename;
    }

    await stock.ensureProductStockSchema();
    await db('products')
      .where('id', product.id)
      .update({
        category_id: Number(req.body.categoryId),
        name_vi: req.body.nameVi,
        name_en: req.body.nameEn,
        description_vi: req.body.descriptionVi || null,
        description_en: req.body.descriptionEn || null,
        sku: req.body.sku || null,
        price: Number(req.body.price),
        sale_price: req.body.salePrice ? Number(req.body.salePrice) : null,
        cover_image_url: coverImageUrl,
        is_featured: req.body.isFeatured === 'on',
        is_active: req.body.isActive === 'on',
        stock_label: stockLabelOf(req.body),
        low_threshold: lowThresholdOf(req.body)
      });

    res.redirect(`/admin/san-pham/${product.id}/sua`);
  } catch (err) {
    next(err);
  }
}

// POST /admin/san-pham/thu-tu  { mode: home|shop, ids: "3,1,2" }
async function reorderProducts(req, res, next) {
  try {
    await stock.ensureProductStockSchema();
    const col = req.body.mode === 'shop' ? 'shop_order' : 'home_order';
    const ids = String(req.body.ids || '').split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0);
    await db.transaction(async (trx) => {
      for (let i = 0; i < ids.length; i++) {
        await trx('products').where('id', ids[i]).update({ [col]: i + 1 });
      }
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

async function deleteProduct(req, res, next) {
  try {
    const product = await db('products').where('id', req.params.id).first();
    const images = await db('product_images').where('product_id', req.params.id);
    await db('products').where('id', req.params.id).del();
    if (product) removeUploadedFile(product.cover_image_url);
    images.forEach((img) => removeUploadedFile(img.image_url));
    res.redirect('/admin/san-pham');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listProducts,
  newProductForm,
  productValidators,
  createProduct,
  editProductForm,
  updateProduct,
  reorderProducts,
  deleteProduct
};
