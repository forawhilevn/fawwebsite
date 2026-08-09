# FOR A WHILE (FAW)

Website streetwear thuần street art. Node.js + Express + EJS, dữ liệu qua Knex.js (SQLite khi phát triển local, MySQL khi chạy production trên Hostinger). Song ngữ Việt/Anh, thanh toán VietQR + COD, hiệu ứng trang chủ bằng GSAP + Lenis + Barba.js.

## Tính năng

- Trang chủ: hero banner, parallax + scroll reveal, preloader, page transition mượt giữa các route (Barba.js).
- Shop: danh sách sản phẩm lọc theo danh mục/size, trang chi tiết sản phẩm với gallery, chọn size/màu (biến thể), bảng size.
- Wishlist (lưu trên trình duyệt, không cần tài khoản), Archive/Lookbook.
- Giỏ hàng (session, theo biến thể), Checkout: COD hoặc VietQR (hiện mã QR chuyển khoản, xác nhận thanh toán thủ công qua admin).
- Song ngữ: mặc định tiếng Việt (`/`), tiếng Anh (`/en`).
- Trang quản trị `/admin`: đăng nhập, quản lý sản phẩm (biến thể size/màu, thư viện ảnh), danh mục, đơn hàng (trạng thái + xác nhận thanh toán), banner (hero/featured/archive), mã giảm giá.

## Ảnh upload từ trang quản trị

Ảnh banner và ảnh sản phẩm tải lên qua admin được lưu tại `public/images/uploads/`. Thư mục này **không nằm trong git** vì là dữ liệu runtime. Khi deploy lên Hostinger, đây là dữ liệu cần **backup/giữ lại riêng** qua các lần cập nhật code — xem lưu ý trong [DEPLOY.md](DEPLOY.md).

## Cài đặt & chạy local

Yêu cầu: Node.js 18+.

```bash
npm install
cp .env.example .env
npm run migrate
npm run seed
npm run dev
```

Mở `http://localhost:3000` (hoặc `PORT` khai báo trong `.env`). Mặc định `.env` dùng `NODE_ENV=development` nên chạy trên SQLite (file `dev.sqlite3`, tự tạo), không cần cài MySQL để phát triển.

Tài khoản admin mặc định (đổi ngay sau khi deploy thật): xem `ADMIN_DEFAULT_USERNAME` / `ADMIN_DEFAULT_PASSWORD` trong `.env`. Đăng nhập tại `/admin/login`.

## Cấu trúc thư mục

```
server.js              Điểm khởi động Express, mount /admin, /en, /
knexfile.js             Cấu hình Knex (development = sqlite, production = mysql2)
migrations/, seeds/     Schema và dữ liệu mẫu (3 sản phẩm thật từ bộ nhận diện FAW)
src/
  db.js                 Kết nối Knex
  controllers/          Xử lý request (khách hàng + admin/)
  routes/                index.js (khách), admin.js (quản trị)
  middleware/            auth, locale (VI/EN theo prefix /en), locals, upload, errorHandler
  services/               cart.js (giỏ hàng theo biến thể), payment.js (VietQR/COD), discount.js
  utils/                  format, slug, imageProcess (auto-crop ảnh), i18n (localize theo _vi/_en)
  i18n/                   vi.json, en.json — từ điển UI
views/                  Template EJS (partials/, admin/)
public/
  css/style.css          Design tokens (đỏ/đen/trắng/cam), style storefront + admin
  js/vendor/              GSAP, ScrollTrigger, Lenis, Barba.js (tự host, không dùng CDN)
  js/motion/              preloader, smooth-scroll, scroll-reveal, parallax, page-transitions
  fonts/                  Be Vietnam Pro (self-hosted, theo file gốc trong bộ nhận diện)
```

## Đổi dữ liệu sản phẩm

Sản phẩm mẫu trong `seeds/001_seed_data.js` là 3 sản phẩm thật (Cranky Boy Long Sleeve, FAW Double Knee, Love Again Tshirt) lấy từ bộ ảnh sản phẩm gốc. Sau khi deploy, dùng trang quản trị `/admin/san-pham` để thêm/sửa sản phẩm thật, hoặc sửa file seed rồi chạy lại `npm run seed` (**seed sẽ xóa sạch dữ liệu cũ**, chỉ dùng cho môi trường dev).

## Thanh toán

VietQR (ảnh QR tạo qua VietQR.io quick-link API, không cần tài khoản merchant — cấu hình `VIETQR_BANK_ID`, `VIETQR_ACCOUNT_NO`, `VIETQR_ACCOUNT_NAME` trong `.env`) và COD. Xác nhận thanh toán VietQR hiện làm thủ công: admin kiểm tra tài khoản ngân hàng rồi bấm "Đánh dấu đã thanh toán" trong `/admin/don-hang/:id`. Muốn nối cổng thanh toán tự động (VNPay/Momo...), sửa `src/services/payment.js`.

## Deploy

Xem hướng dẫn deploy lên Hostinger + GitHub trong [DEPLOY.md](DEPLOY.md).
