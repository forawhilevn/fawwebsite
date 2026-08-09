const fs = require('fs');
const path = require('path');
const { body, validationResult } = require('express-validator');
const db = require('../../db');
const { slugify } = require('../../utils/slug');
const { cropToFixedSize } = require('../../utils/imageProcess');
const { getLookbookImages } = require('../../utils/assets');

const IMAGE_ERROR_MESSAGE = 'Ảnh không hợp lệ hoặc bị lỗi khi xử lý. Vui lòng thử lại với file JPG/PNG/GIF/WEBP khác.';

function removeUploadedFile(imageUrl) {
  if (imageUrl && imageUrl.startsWith('/images/uploads/')) {
    const filePath = path.join(__dirname, '..', '..', '..', 'public', imageUrl);
    fs.unlink(filePath, () => {});
  }
}

async function listProducts(req, res, next) {
  try {
    const products = await db('products')
      .join('categories', 'products.category_id', 'categories.id')
      .select('products.*', 'categories.name_vi as category_name')
      .orderBy('products.created_at', 'desc');

    res.render('admin/products', {
      title: 'Quản lý sản phẩm - FAW Admin',
      products
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
        product: req.body,
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
      const destPath = path.join(__dirname, '..', '..', '..', 'public', 'images', 'uploads', 'products', req.file.filename);
      try {
        await cropToFixedSize(destPath, 'product');
      } catch (imgErr) {
        removeUploadedFile('/images/uploads/products/' + req.file.filename);
        return res.status(400).render('admin/product-form', {
          title: 'Thêm sản phẩm - FAW Admin',
          categories,
          product: req.body,
          errors: [{ msg: IMAGE_ERROR_MESSAGE }],
          isEdit: false,
          galleryImages: [],
          variants: [],
          lookbookImages: []
        });
      }
      coverImageUrl = '/images/uploads/products/' + req.file.filename;
    }

    const [productId] = await db('products')
      .insert({
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
        is_active: req.body.isActive !== 'off'
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
        product: { ...product, ...req.body, id: product.id },
        errors: errors.array(),
        isEdit: true,
        galleryImages,
        variants,
        lookbookImages
      });
    }

    let coverImageUrl = product.cover_image_url;
    if (req.file) {
      const destPath = path.join(__dirname, '..', '..', '..', 'public', 'images', 'uploads', 'products', req.file.filename);
      try {
        await cropToFixedSize(destPath, 'product');
      } catch (imgErr) {
        removeUploadedFile('/images/uploads/products/' + req.file.filename);
        return res.status(400).render('admin/product-form', {
          title: 'Sửa sản phẩm - FAW Admin',
          categories,
          product: { ...product, ...req.body, id: product.id },
          errors: [{ msg: IMAGE_ERROR_MESSAGE }],
          isEdit: true,
          galleryImages,
          variants,
          lookbookImages
        });
      }
      removeUploadedFile(product.cover_image_url);
      coverImageUrl = '/images/uploads/products/' + req.file.filename;
    }

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
        is_active: req.body.isActive !== 'off'
      });

    res.redirect(`/admin/san-pham/${product.id}/sua`);
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
  deleteProduct
};
