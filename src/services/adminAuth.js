// OTP cho doi mat khau / quen mat khau cua admin.
// Ma OTP chi luu dang bam (HMAC), het han sau 10 phut, toi da 5 lan thu.
const crypto = require('crypto');
const db = require('../db');
const mailer = require('./mailer');

const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_PER_HOUR = 5;

let schemaPromise = null;
function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const exists = await db.schema.hasTable('admin_otps');
      if (!exists) {
        await db.schema.createTable('admin_otps', (t) => {
          t.increments('id').primary();
          t.integer('admin_id').notNullable();
          t.string('purpose', 20).notNullable();
          t.string('code_hash', 100).notNullable();
          t.bigInteger('expires_at').notNullable();
          t.bigInteger('created_at').notNullable();
          t.integer('attempts').notNullable().defaultTo(0);
        });
      }
    })().catch((err) => {
      schemaPromise = null;
      throw err;
    });
  }
  return schemaPromise;
}

function adminEmail() {
  return (process.env.ADMIN_EMAIL || process.env.SMTP_USER || '').trim();
}

function maskEmail(email) {
  const [name, domain] = String(email).split('@');
  if (!domain) return '';
  const shown = name.slice(0, Math.min(2, name.length));
  return shown + '*'.repeat(Math.max(2, name.length - shown.length)) + '@' + domain;
}

function hashCode(adminId, purpose, code) {
  const secret = process.env.SESSION_SECRET || 'faw-dev-secret';
  return crypto.createHmac('sha256', secret).update(adminId + ':' + purpose + ':' + code).digest('hex');
}

function validatePassword(password, username) {
  if (typeof password !== 'string' || password.length < 8) return 'Mật khẩu mới phải có ít nhất 8 ký tự.';
  if (password.length > 72) return 'Mật khẩu mới tối đa 72 ký tự.';
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return 'Mật khẩu mới cần có cả chữ và số.';
  if (username && password.toLowerCase() === String(username).toLowerCase()) return 'Mật khẩu không được trùng tên đăng nhập.';
  return null;
}

// Tao ma moi, gui qua Gmail. Tra ve { ok, error?, devCode? }
async function sendOtp(adminId, purpose, reqInfo) {
  await ensureSchema();
  const to = adminEmail();
  const configured = mailer.isConfigured() && to;
  const isProd = process.env.NODE_ENV === 'production';
  if (!configured && isProd) {
    return { ok: false, error: 'Chưa cấu hình Gmail để gửi mã OTP (cần SMTP_USER, SMTP_PASS, ADMIN_EMAIL).' };
  }

  const now = Date.now();
  const last = await db('admin_otps').where({ admin_id: adminId, purpose }).orderBy('created_at', 'desc').first();
  if (last && now - Number(last.created_at) < RESEND_COOLDOWN_MS) {
    const wait = Math.ceil((RESEND_COOLDOWN_MS - (now - Number(last.created_at))) / 1000);
    return { ok: false, error: 'Vui lòng đợi ' + wait + ' giây rồi gửi lại mã.' };
  }
  const sentLastHour = await db('admin_otps')
    .where({ purpose })
    .andWhere('created_at', '>', now - 3600 * 1000)
    .count({ n: '*' })
    .first();
  if (Number(sentLastHour.n) >= MAX_PER_HOUR) {
    return { ok: false, error: 'Đã gửi quá nhiều mã trong 1 giờ. Vui lòng thử lại sau.' };
  }

  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  await db('admin_otps').where('created_at', '<', now - 24 * 3600 * 1000).del();
  const inserted = await db('admin_otps').insert({
    admin_id: adminId,
    purpose,
    code_hash: hashCode(adminId, purpose, code),
    expires_at: now + OTP_TTL_MS,
    created_at: now,
    attempts: 0
  });
  const otpId = Array.isArray(inserted) ? inserted[0] : inserted;

  const title = purpose === 'reset' ? 'đặt lại mật khẩu' : 'đổi mật khẩu';
  const text = [
    'Mã OTP ' + title + ' FAW Admin của bạn là:',
    '',
    '    ' + code,
    '',
    'Mã có hiệu lực trong 10 phút. Không chia sẻ mã này cho bất kỳ ai.',
    '',
    'Yêu cầu từ IP: ' + (reqInfo && reqInfo.ip ? reqInfo.ip : 'không rõ'),
    'Thời gian: ' + new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
    '',
    'Nếu không phải bạn yêu cầu, hãy bỏ qua email này.'
  ].join('\n');

  if (!configured) {
    console.log('[DEV] Ma OTP (' + purpose + '): ' + code);
    return { ok: true, devCode: code };
  }
  try {
    await mailer.sendMail({ to, subject: 'Mã OTP ' + title + ' FAW Admin', text });
  } catch (err) {
    console.error('Gui OTP that bai:', err.message);
    await db('admin_otps').where({ id: otpId }).del();
    return { ok: false, error: 'Không gửi được email. Kiểm tra lại cấu hình Gmail (SMTP_USER / SMTP_PASS).' };
  }
  return { ok: true };
}

// Kiem tra ma. Tra ve { ok, error? }. Ma dung se bi xoa (dung 1 lan).
async function verifyOtp(adminId, purpose, input) {
  await ensureSchema();
  const code = String(input || '').replace(/\s+/g, '');
  const row = await db('admin_otps').where({ admin_id: adminId, purpose }).orderBy('created_at', 'desc').first();
  if (!row) return { ok: false, error: 'Mã OTP không còn hiệu lực. Vui lòng gửi lại mã.' };
  if (Date.now() > Number(row.expires_at)) {
    await db('admin_otps').where({ id: row.id }).del();
    return { ok: false, error: 'Mã OTP đã hết hạn. Vui lòng gửi lại mã.' };
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    await db('admin_otps').where({ id: row.id }).del();
    return { ok: false, error: 'Nhập sai quá nhiều lần. Vui lòng gửi lại mã mới.' };
  }
  const expected = Buffer.from(row.code_hash);
  const actual = Buffer.from(hashCode(adminId, purpose, code));
  const match = expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  if (!match) {
    await db('admin_otps').where({ id: row.id }).increment('attempts', 1);
    return { ok: false, error: 'Mã OTP không đúng.' };
  }
  await db('admin_otps').where({ admin_id: adminId, purpose }).del();
  return { ok: true };
}

async function clearOtp(adminId, purpose) {
  await ensureSchema();
  await db('admin_otps').where({ admin_id: adminId, purpose }).del();
}

// Email bao "mat khau da thay doi" (khong chan luong chinh neu loi)
async function notifyPasswordChanged(reqInfo, how) {
  const to = adminEmail();
  if (!mailer.isConfigured() || !to) return;
  try {
    await mailer.sendMail({
      to,
      subject: 'Mật khẩu FAW Admin đã được thay đổi',
      text: [
        'Mật khẩu quản trị FAW vừa được ' + how + '.',
        '',
        'Thời gian: ' + new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
        'IP: ' + (reqInfo && reqInfo.ip ? reqInfo.ip : 'không rõ'),
        '',
        'Nếu không phải bạn thực hiện, hãy dùng "Quên mật khẩu" để đặt lại ngay.'
      ].join('\n')
    });
  } catch (err) {
    console.error('Gui thong bao doi mat khau that bai:', err.message);
  }
}

module.exports = {
  sendOtp,
  verifyOtp,
  clearOtp,
  adminEmail,
  maskEmail,
  validatePassword,
  notifyPasswordChanged,
  ensureSchema
};
