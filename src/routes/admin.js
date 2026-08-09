const express = require('express');
const router = express.Router();

const { requireAdmin, redirectIfAdmin } = require('../middleware/auth');
const { makeUploader, makeSlugUploader } = require('../middleware/upload');
const authController = require('../controllers/admin/authController');
const dashboardController = require('../controllers/admin/dashboardController');
const categoryAdminController = require('../controllers/admin/categoryAdminController');
const productAdminController = require('../controllers/admin/productAdminController');
const productVariantController = require('../controllers/admin/productVariantController');
const productGalleryController = require('../controllers/admin/productGalleryController');
const lookbookController = require('../controllers/admin/lookbookController');
const orderAdminController = require('../controllers/admin/orderAdminController');
const bannerController = require('../controllers/admin/bannerController');
const discountAdminController = require('../controllers/admin/discountAdminController');

const uploadProductImage = makeUploader('products');
const uploadBannerImage = makeUploader('banners');
const uploadLookbookImage = makeSlugUploader('lookbook');

router.get('/login', redirectIfAdmin, authController.showLogin);
router.post('/login', redirectIfAdmin, authController.login);
router.post('/logout', authController.logout);

router.use(requireAdmin);

router.get('/', dashboardController.showDashboard);

router.get('/danh-muc', categoryAdminController.listCategories);
router.post('/danh-muc/moi', categoryAdminController.createCategory);
router.post('/danh-muc/:id/sua', categoryAdminController.updateCategory);
router.post('/danh-muc/:id/xoa', categoryAdminController.deleteCategory);

router.get('/san-pham', productAdminController.listProducts);
router.get('/san-pham/moi', productAdminController.newProductForm);
router.post(
  '/san-pham/moi',
  uploadProductImage.single('coverImage'),
  productAdminController.productValidators,
  productAdminController.createProduct
);
router.get('/san-pham/:id/sua', productAdminController.editProductForm);
router.post(
  '/san-pham/:id/sua',
  uploadProductImage.single('coverImage'),
  productAdminController.productValidators,
  productAdminController.updateProduct
);
router.post('/san-pham/:id/xoa', productAdminController.deleteProduct);

router.post('/san-pham/:id/bien-the', productVariantController.createVariant);
router.post('/san-pham/:id/bien-the/:variantId/sua', productVariantController.updateVariant);
router.post('/san-pham/:id/bien-the/:variantId/xoa', productVariantController.deleteVariant);

router.post('/san-pham/:id/anh', uploadProductImage.array('images', 10), productGalleryController.uploadImages);
router.post('/san-pham/:id/anh/:imageId/xoa', productGalleryController.deleteImage);

router.post('/san-pham/:id/lookbook', uploadLookbookImage.array('lookbookImages', 10), lookbookController.uploadImages);
router.post('/san-pham/:id/lookbook/:filename/xoa', lookbookController.deleteImage);

router.get('/don-hang', orderAdminController.listOrders);
router.get('/don-hang/:id', orderAdminController.showOrder);
router.post('/don-hang/:id/trang-thai', orderAdminController.updateStatus);
router.post('/don-hang/:id/thanh-toan', orderAdminController.markPaid);
router.post('/don-hang/:id/huy-thanh-toan', orderAdminController.markUnpaid);

router.get('/banner', bannerController.listBanners);
router.post('/banner/chinh', uploadBannerImage.single('image'), bannerController.createHeroBanner);
router.post('/banner/chinh/:id/an-hien', bannerController.toggleHeroBanner);
router.post('/banner/chinh/:id/xoa', bannerController.deleteHeroBanner);
router.post('/banner/noi-bat', uploadBannerImage.single('image'), bannerController.uploadFeaturedBanner);
router.post('/banner/archive', uploadBannerImage.single('image'), bannerController.createArchiveBanner);
router.post('/banner/archive/:id/xoa', bannerController.deleteArchiveBanner);

router.get('/ma-giam-gia', discountAdminController.listCodes);
router.post('/ma-giam-gia/moi', discountAdminController.createCode);
router.post('/ma-giam-gia/:id/an-hien', discountAdminController.toggleCode);
router.post('/ma-giam-gia/:id/xoa', discountAdminController.deleteCode);

module.exports = router;
