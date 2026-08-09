const express = require('express');
const router = express.Router();

const homeController = require('../controllers/homeController');
const shopController = require('../controllers/shopController');
const productController = require('../controllers/productController');
const cartController = require('../controllers/cartController');
const checkoutController = require('../controllers/checkoutController');
const pagesController = require('../controllers/pagesController');

router.get('/', homeController.showHome);

router.get('/shop', shopController.showShop);
router.get('/shop/:categorySlug', shopController.showShop);
router.get('/product/:slug', productController.showProduct);

router.get('/archive', pagesController.showArchive);
router.get('/wishlist', pagesController.showWishlist);
router.get('/about', pagesController.showAbout);
router.get('/shipping-policy', pagesController.showShippingPolicy);
router.get('/return-policy', pagesController.showReturnPolicy);
router.get('/contact', pagesController.showContact);

router.get('/cart', cartController.showCart);
router.post('/cart/add', cartController.addToCart);
router.post('/cart/update', cartController.updateCart);
router.post('/cart/remove', cartController.removeFromCart);

router.get('/checkout', checkoutController.showCheckout);
router.post('/checkout', checkoutController.checkoutValidators, checkoutController.submitOrder);
router.get('/order/:code', checkoutController.showConfirmation);

module.exports = router;
