// Gui email qua SMTP Gmail (SSL cong 465) - khong can cai them thu vien.
// Can: SMTP_USER (dia chi Gmail gui), SMTP_PASS (Mat khau ung dung 16 ky tu cua Google).
const tls = require('tls');
const crypto = require('crypto');

function isConfigured() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

function encodeHeader(text) {
  return '=?UTF-8?B?' + Buffer.from(String(text), 'utf8').toString('base64') + '?=';
}

function buildMessage({ from, fromName, to, subject, text }) {
  const body = Buffer.from(text, 'utf8').toString('base64').replace(/(.{76})/g, '$1\r\n');
  return [
    'From: ' + encodeHeader(fromName) + ' <' + from + '>',
    'To: <' + to + '>',
    'Subject: ' + encodeHeader(subject),
    'Date: ' + new Date().toUTCString(),
    'Message-ID: <' + crypto.randomBytes(12).toString('hex') + '@' + (from.split('@')[1] || 'faw') + '>',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    body,
    ''
  ].join('\r\n');
}

// conn (tuy chon) chi dung khi kiem thu: { host, port, tlsOptions }
function sendMail({ to, subject, text }, conn = {}) {
  return new Promise((resolve, reject) => {
    if (!isConfigured()) return reject(new Error('SMTP chua duoc cau hinh'));
    const user = process.env.SMTP_USER;
    const pass = String(process.env.SMTP_PASS).replace(/\s+/g, '');
    const host = conn.host || process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(conn.port || process.env.SMTP_PORT || 465);

    const socket = tls.connect(Object.assign({ host, port, servername: host }, conn.tlsOptions || {}));
    socket.setEncoding('utf8');
    socket.setTimeout(20000);

    let buffer = '';
    let lines = [];
    const responses = [];
    const waiters = [];
    let finished = false;

    function fail(err) {
      if (finished) return;
      finished = true;
      socket.destroy();
      reject(err);
    }

    function deliver(resp) {
      const waiter = waiters.shift();
      if (waiter) waiter(resp);
      else responses.push(resp);
    }

    socket.on('data', (chunk) => {
      buffer += chunk;
      let idx;
      while ((idx = buffer.indexOf('\r\n')) >= 0) {
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        lines.push(line);
        if (/^\d{3}( |$)/.test(line)) {
          deliver({ code: Number(line.slice(0, 3)), text: lines.join('\n') });
          lines = [];
        }
      }
    });
    socket.on('error', fail);
    socket.on('timeout', () => fail(new Error('SMTP timeout')));
    socket.on('close', () => fail(new Error('SMTP ket noi bi dong')));

    function read() {
      return new Promise((res) => {
        const queued = responses.shift();
        if (queued) res(queued);
        else waiters.push(res);
      });
    }

    async function expect(codes, command) {
      if (command !== undefined) socket.write(command + '\r\n');
      const resp = await read();
      if (codes.indexOf(resp.code) === -1) {
        throw new Error('SMTP ' + resp.code + ': ' + resp.text.replace(/\s+/g, ' ').slice(0, 200));
      }
      return resp;
    }

    socket.once('secureConnect', async () => {
      try {
        await expect([220]);
        await expect([250], 'EHLO faw.local');
        await expect([334], 'AUTH LOGIN');
        await expect([334], Buffer.from(user).toString('base64'));
        await expect([235], Buffer.from(pass).toString('base64'));
        await expect([250], 'MAIL FROM:<' + user + '>');
        await expect([250, 251], 'RCPT TO:<' + to + '>');
        await expect([354], 'DATA');
        const message = buildMessage({ from: user, fromName: 'FAW Admin', to, subject, text });
        await expect([250], message + '\r\n.');
        socket.write('QUIT\r\n');
        finished = true;
        socket.end();
        resolve();
      } catch (err) {
        fail(err);
      }
    });
  });
}

// ===== New-order e-mails (nodemailer) =====
// New-order e-mails: one to the shop owner (Gmail) and one confirmation to the customer.
// Needs the `nodemailer` package and these environment variables (set them on Hostinger, never in git):
//   MAIL_USER  = Gmail address that sends the mails
//   MAIL_PASS  = Gmail "App password" (16 characters, needs 2-step verification)
//   MAIL_TO    = address that receives the "new order" mail (defaults to MAIL_USER)
//   SITE_URL   = https://forawhile.world   (used for the order link; optional)
// If anything is missing the site keeps working and just logs why no mail was sent.
const db = require('../db');
const { formatVND } = require('../utils/format');

let transport = null;
// order mails reuse the admin OTP Gmail (SMTP_USER / SMTP_PASS) when MAIL_USER / MAIL_PASS are not set
function mailUser() { return process.env.MAIL_USER || process.env.SMTP_USER || ''; }
let warned = false;

function warnOnce(msg) {
  if (warned) return;
  warned = true;
  console.warn('[mailer] ' + msg);
}

function getTransport() {
  if (transport) return transport;
  const user = mailUser();
  const pass = String(process.env.MAIL_PASS || process.env.SMTP_PASS || '').replace(/\s+/g, '');
  if (!user || !pass) { warnOnce('MAIL_USER / MAIL_PASS chưa được cấu hình, bỏ qua gửi email.'); return null; }
  let nodemailer;
  try { nodemailer = require('nodemailer'); } catch (e) { warnOnce('Chưa cài package "nodemailer" (chạy npm install), bỏ qua gửi email.'); return null; }
  transport = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass }
  });
  return transport;
}

function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const COPY = {
  vi: {
    payCod: 'Thanh toán khi nhận hàng (COD)', payQr: 'Chuyển khoản QR',
    item: 'Sản phẩm', qty: 'SL', price: 'Giá', subtotal: 'Tạm tính', ship: 'Phí vận chuyển', discount: 'Giảm giá', total: 'Tổng cộng',
    name: 'Họ tên', phone: 'Điện thoại', email: 'Email', address: 'Địa chỉ', note: 'Ghi chú', payment: 'Thanh toán',
    custSubject: (c) => 'FAW — Xác nhận đơn hàng ' + c,
    custTitle: 'Cảm ơn bạn đã đặt hàng!',
    custIntro: 'FOR A WHILE đã nhận được đơn của bạn. Chúng mình sẽ liên hệ xác nhận và giao hàng sớm nhất.',
    viewOrder: 'Xem đơn hàng',
    adminTitle: 'Có đơn hàng mới'
  },
  en: {
    payCod: 'Cash on delivery (COD)', payQr: 'QR bank transfer',
    item: 'Item', qty: 'Qty', price: 'Price', subtotal: 'Subtotal', ship: 'Shipping', discount: 'Discount', total: 'Total',
    name: 'Name', phone: 'Phone', email: 'Email', address: 'Address', note: 'Note', payment: 'Payment',
    custSubject: (c) => 'FAW — Order confirmation ' + c,
    custTitle: 'Thank you for your order!',
    custIntro: 'FOR A WHILE has received your order. We will contact you to confirm and ship it as soon as possible.',
    viewOrder: 'View your order',
    adminTitle: 'New order'
  }
};

function build(order, items, lang, kind) {
  const c = COPY[lang] || COPY.vi;
  const base = String(process.env.SITE_URL || 'https://forawhile.world').replace(/\/+$/, '');
  const link = base + (order.locale === 'en' ? '/en' : '') + '/order/' + order.order_code;
  const pay = order.payment_method === 'vietqr' ? c.payQr : c.payCod;
  const row = (a, b) => '<tr><td style="padding:4px 12px 4px 0;color:#777;vertical-align:top;">' + esc(a) + '</td><td style="padding:4px 0;">' + b + '</td></tr>';
  const lines = items.map((i) =>
    '<tr><td style="padding:8px 0;border-bottom:1px solid #eee;">' + esc(i.product_name) + (i.variant_label ? '<br><span style="color:#777;font-size:12px;">' + esc(i.variant_label) + '</span>' : '') +
    '</td><td style="padding:8px 8px;border-bottom:1px solid #eee;text-align:center;">' + esc(i.quantity) +
    '</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap;">' + esc(formatVND(i.price * i.quantity)) + '</td></tr>'
  ).join('');
  const tot = (a, b, bold) => '<tr><td colspan="2" style="padding:4px 8px 4px 0;text-align:right;' + (bold ? 'font-weight:700;' : 'color:#555;') + '">' + esc(a) + '</td><td style="padding:4px 0;text-align:right;white-space:nowrap;' + (bold ? 'font-weight:700;' : '') + '">' + esc(b) + '</td></tr>';
  const html =
    '<div style="font-family:Arial,Helvetica,sans-serif;color:#111;max-width:560px;margin:0 auto;padding:24px;">' +
    '<h1 style="font-size:20px;margin:0 0 4px;color:#eb252a;">FOR A WHILE</h1>' +
    '<h2 style="font-size:18px;margin:0 0 12px;">' + esc(kind === 'admin' ? c.adminTitle + ' — ' + order.order_code : c.custTitle) + '</h2>' +
    (kind === 'customer' ? '<p style="margin:0 0 16px;line-height:1.5;">' + esc(c.custIntro) + '</p><p style="margin:0 0 16px;"><b>' + esc(order.order_code) + '</b></p>' : '') +
    '<table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px;">' +
      row(c.name, esc(order.customer_name)) + row(c.phone, esc(order.phone)) + (order.email ? row(c.email, esc(order.email)) : '') +
      row(c.address, esc(order.address)) + (order.note ? row(c.note, esc(order.note)) : '') + row(c.payment, esc(pay)) +
    '</table>' +
    '<table style="width:100%;border-collapse:collapse;font-size:14px;"><tr><th style="text-align:left;padding:6px 0;border-bottom:2px solid #111;">' + esc(c.item) + '</th><th style="padding:6px 8px;border-bottom:2px solid #111;">' + esc(c.qty) + '</th><th style="text-align:right;padding:6px 0;border-bottom:2px solid #111;">' + esc(c.price) + '</th></tr>' +
      lines +
      tot(c.subtotal, formatVND(order.subtotal)) +
      tot(c.ship, formatVND(order.shipping_fee || 0)) +
      (order.discount_amount ? tot(c.discount, '-' + formatVND(order.discount_amount)) : '') +
      tot(c.total, formatVND(order.total), true) +
    '</table>' +
    '<p style="margin:20px 0 0;"><a href="' + esc(link) + '" style="display:inline-block;padding:10px 18px;background:#111;color:#fff;text-decoration:none;border-radius:999px;font-size:13px;">' + esc(c.viewOrder) + '</a></p>' +
    '</div>';
  const text = [
    kind === 'admin' ? c.adminTitle + ' ' + order.order_code : c.custTitle + ' ' + order.order_code,
    c.name + ': ' + order.customer_name, c.phone + ': ' + order.phone, c.address + ': ' + order.address, c.payment + ': ' + pay, '',
    items.map((i) => '- ' + i.product_name + (i.variant_label ? ' (' + i.variant_label + ')' : '') + ' x' + i.quantity + ' = ' + formatVND(i.price * i.quantity)).join('\n'),
    '', c.total + ': ' + formatVND(order.total), link
  ].join('\n');
  return { html, text, subject: kind === 'admin' ? '[FAW] ' + c.adminTitle + ' ' + order.order_code + ' — ' + formatVND(order.total) : c.custSubject(order.order_code) };
}

// Called after an order is saved. Never throws: a mail problem must not break checkout.
async function sendNewOrder(orderId) {
  try {
    const t = getTransport();
    if (!t) return;
    const order = await db('orders').where({ id: orderId }).first();
    if (!order) return;
    const items = await db('order_items').where({ order_id: order.id });
    const from = '"FOR A WHILE" <' + mailUser() + '>';
    const jobs = [];
    const adminTo = process.env.MAIL_TO || process.env.ADMIN_EMAIL || mailUser();
    const a = build(order, items, 'vi', 'admin');
    jobs.push(t.sendMail({ from, to: adminTo, subject: a.subject, html: a.html, text: a.text, replyTo: order.email || undefined }));
    if (order.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(order.email)) {
      const lang = order.locale === 'en' ? 'en' : 'vi';
      const c = build(order, items, lang, 'customer');
      jobs.push(t.sendMail({ from, to: order.email, subject: c.subject, html: c.html, text: c.text }));
    }
    const results = await Promise.allSettled(jobs);
    results.forEach((r) => { if (r.status === 'rejected') console.error('[mailer] gửi email lỗi:', r.reason && r.reason.message ? r.reason.message : r.reason); });
  } catch (err) {
    console.error('[mailer]', err && err.message ? err.message : err);
  }
}

module.exports = { sendMail, isConfigured, buildMessage, sendNewOrder };
