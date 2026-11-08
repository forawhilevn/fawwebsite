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
const sizeChartController = require('../controllers/admin/sizeChartController');
const storeController = require('../controllers/admin/storeController');
const promoController = require('../controllers/admin/promoController');
const pageAdminController = require('../controllers/admin/pageAdminController');
const settingsController = require('../controllers/admin/settingsController');
const subBannerController = require('../controllers/admin/subBannerController');
const inventoryController = require('../controllers/admin/inventoryController');
const backgroundController = require('../controllers/admin/backgroundController');

const uploadProductImage = makeUploader('products');
const uploadBannerImage = makeUploader('banners');
const uploadStoreImage = makeUploader('stores');
const uploadPageImage = makeUploader('pages');
const uploadBackgroundImage = makeUploader('backgrounds');
const uploadLookbookImage = makeSlugUploader('lookbook');

router.use(authController.flashMiddleware);

router.get('/login', redirectIfAdmin, authController.showLogin);
router.post('/login', redirectIfAdmin, authController.login);
router.post('/logout', authController.logout);

// Quen mat khau (OTP qua Gmail)
router.get('/quen-mat-khau', redirectIfAdmin, authController.showForgot);
router.post('/quen-mat-khau', redirectIfAdmin, authController.requestReset);
router.post('/quen-mat-khau/gui-lai', redirectIfAdmin, authController.resendReset);
router.post('/quen-mat-khau/xac-nhan', redirectIfAdmin, authController.confirmReset);

router.use(requireAdmin);

// Doi mat khau (OTP qua Gmail)
router.get('/doi-mat-khau', authController.showChange);
router.post('/doi-mat-khau', authController.requestChange);
router.post('/doi-mat-khau/gui-lai', authController.resendChange);
router.post('/doi-mat-khau/xac-nhan', authController.confirmChange);
router.post('/doi-mat-khau/huy', authController.cancelChange);

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

router.post('/san-pham/:id/bien-the/luu', productVariantController.saveMatrix);
router.post('/san-pham/:id/bien-the', productVariantController.createVariant);
router.post('/san-pham/:id/bien-the/:variantId/sua', productVariantController.updateVariant);
router.post('/san-pham/:id/bien-the/:variantId/xoa', productVariantController.deleteVariant);

router.post('/san-pham/:id/anh', uploadProductImage.array('images', 10), productGalleryController.uploadImages);
router.post('/san-pham/:id/anh/:imageId/xoa', productGalleryController.deleteImage);

router.post('/san-pham/:id/lookbook', uploadLookbookImage.array('lookbookImages', 10), lookbookController.uploadImages);
router.post('/san-pham/:id/lookbook/:filename/xoa', lookbookController.deleteImage);

router.post('/san-pham/:id/size-chart', sizeChartController.uploadSizeChart);
router.post('/san-pham/:id/size-chart/xoa', sizeChartController.deleteSizeChart);

router.get('/don-hang', orderAdminController.listOrders);
router.get('/don-hang/:id', orderAdminController.showOrder);
router.post('/don-hang/:id/trang-thai', orderAdminController.updateStatus);
router.post('/don-hang/:id/thanh-toan', orderAdminController.markPaid);
router.post('/don-hang/:id/huy-thanh-toan', orderAdminController.markUnpaid);

router.get('/ton-kho', inventoryController.showInventory);
router.post('/ton-kho/luu', inventoryController.saveInventory);

router.get('/banner', bannerController.listBanners);
const heroUpload = uploadBannerImage.fields([{ name: 'imageDesktop', maxCount: 1 }, { name: 'imageMobile', maxCount: 1 }]);
router.post('/banner/chinh', heroUpload, bannerController.createHeroBanner);
router.post('/banner/chinh/:id/anh', heroUpload, bannerController.updateHeroImages);
router.post('/banner/chinh/:id/anh-mobile/xoa', bannerController.removeHeroMobile);
router.post('/banner/chinh/:id/anh-desktop/xoa', bannerController.removeHeroDesktop);
router.post('/banner/chinh/:id/tieu-de', bannerController.updateHeroTitle);
router.post('/banner/chinh/:id/an-hien', bannerController.toggleHeroBanner);
router.post('/banner/chinh/:id/len', bannerController.moveHeroBanner('up'));
router.post('/banner/chinh/:id/xuong', bannerController.moveHeroBanner('down'));
router.post('/banner/chinh/:id/xoa', bannerController.deleteHeroBanner);
router.post('/banner/noi-bat', uploadBannerImage.single('image'), bannerController.uploadFeaturedBanner);
router.post('/banner/archive', uploadBannerImage.single('image'), bannerController.createArchiveBanner);
router.post('/banner/archive/:id/xoa', bannerController.deleteArchiveBanner);

router.get('/dai-ly', storeController.listStores);
router.post('/dai-ly/moi', uploadStoreImage.array('images', 5), storeController.createStore);
router.post('/dai-ly/:id/sua', uploadStoreImage.array('images', 5), storeController.updateStore);
router.post('/dai-ly/:id/an-hien', storeController.toggleStore);
router.post('/dai-ly/:id/len', storeController.moveStore('up'));
router.post('/dai-ly/:id/xuong', storeController.moveStore('down'));
router.post('/dai-ly/:id/xoa', storeController.deleteStore);

router.get('/khuyen-mai', promoController.listPromos);
router.post('/khuyen-mai/phi-ship', promoController.saveShipping);
router.post('/khuyen-mai/moi', promoController.createPromo);
router.post('/khuyen-mai/:id/sua', promoController.updatePromo);
router.post('/khuyen-mai/:id/an-hien', promoController.togglePromo);
router.post('/khuyen-mai/:id/xoa', promoController.deletePromo);

router.get('/chinh-sach', pageAdminController.listPages);
router.get('/chinh-sach/moi', pageAdminController.showForm);
router.post('/chinh-sach/moi', uploadPageImage.single('image'), pageAdminController.savePage);
router.get('/chinh-sach/:slug/sua', pageAdminController.showForm);
router.post('/chinh-sach/:slug/sua', uploadPageImage.single('image'), pageAdminController.savePage);
router.post('/chinh-sach/:slug/mac-dinh', pageAdminController.resetPage);
router.post('/chinh-sach/:slug/xoa', pageAdminController.deletePage);

router.get('/ma-giam-gia', discountAdminController.listCodes);
router.post('/ma-giam-gia/moi', discountAdminController.createCode);
router.post('/ma-giam-gia/:id/an-hien', discountAdminController.toggleCode);
router.post('/ma-giam-gia/:id/xoa', discountAdminController.deleteCode);

router.get('/banner-phu', subBannerController.showSubBanners);
router.post('/banner-phu/luu', subBannerController.saveAll);
router.get('/hinh-nen', backgroundController.showBackground);
router.post('/hinh-nen/luu', backgroundController.saveBackground(uploadBackgroundImage.single('image')));
router.get('/cai-dat', settingsController.showSettings);
router.post('/cai-dat/dong-mo-web', settingsController.toggleSite);
router.post('/cai-dat/thong-bao', settingsController.saveClosedMessage);
router.post('/cai-dat/dong-web/:device/tai-len', settingsController.uploadClosedMedia);
router.post('/cai-dat/dong-web/:device/xoa', settingsController.removeClosedMedia);
router.post('/cai-dat/video/tuy-chon', settingsController.saveIntroOptions);
router.post('/cai-dat/video/:device/tai-len', settingsController.uploadIntroVideo);
router.post('/cai-dat/video/:device/:kind/xoa', settingsController.removeIntroVideo);

module.exports = router;
