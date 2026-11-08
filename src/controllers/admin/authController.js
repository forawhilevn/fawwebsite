const bcrypt = require('bcryptjs');
const db = require('../../db');
const adminAuth = require('../../services/adminAuth');

const REMEMBER_MS = 30 * 24 * 60 * 60 * 1000;
const LOGIN_TITLE = 'Đăng nhập quản trị - FAW Admin';

function reqInfo(req) {
  return { ip: req.ip };
}

// ---- Thong bao (flash) luu trong session, doc 1 lan ----
function flashMiddleware(req, res, next) {
  res.locals.flash = (req.session && req.session.flash) || null;
  if (req.session && req.session.flash) delete req.session.flash;
  next();
}

function redirectWithFlash(req, res, url, type, message) {
  req.session.flash = { type, message };
  req.session.save(() => res.redirect(url));
}

function renderLogin(res, status, error) {
  res.status(status).render('admin/login', { title: LOGIN_TITLE, error: error || null });
}

// ---- Dang nhap ----
function showLogin(req, res) {
  res.render('admin/login', { title: LOGIN_TITLE, error: null });
}

async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    const remember = req.body.remember === '1' || req.body.remember === 'on';
    const admin = await db('admin_users').where('username', username).first();
    const ok = admin ? await bcrypt.compare(password || '', admin.password_hash) : false;
    if (!ok) return renderLogin(res, 401, 'Sai tên đăng nhập hoặc mật khẩu.');

    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.adminId = admin.id;
      req.session.adminUsername = admin.username;
      if (remember) req.session.cookie.maxAge = REMEMBER_MS;
      else req.session.cookie.expires = false; // het han khi dong trinh duyet
      req.session.save((saveErr) => {
        if (saveErr) return next(saveErr);
        res.redirect('/admin');
      });
    });
  } catch (err) {
    next(err);
  }
}

function logout(req, res, next) {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.redirect('/admin/login');
  });
}

// ---- Quen mat khau ----
function renderForgot(res, status, extra) {
  res.status(status).render('admin/forgot-password', Object.assign({
    title: 'Quên mật khẩu - FAW Admin',
    step: 'request',
    error: null,
    notice: null,
    maskedEmail: adminAuth.maskEmail(adminAuth.adminEmail())
  }, extra));
}

function showForgot(req, res) {
  if (req.query.lai === '1') {
    delete req.session.reset;
    return req.session.save(() => res.redirect('/admin/quen-mat-khau'));
  }
  renderForgot(res, 200, { step: req.session.reset ? 'verify' : 'request' });
}

async function requestReset(req, res, next) {
  try {
    const username = String(req.body.username || '').trim();
    const admin = username ? await db('admin_users').where('username', username).first() : null;
    // Khong tiet lo tai khoan co ton tai hay khong
    if (!admin) {
      req.session.reset = { adminId: 0 };
      return req.session.save(() =>
        renderForgot(res, 200, { step: 'verify', notice: 'Nếu tài khoản tồn tại, mã OTP đã được gửi tới Gmail quản trị.' })
      );
    }
    const result = await adminAuth.sendOtp(admin.id, 'reset', reqInfo(req));
    if (!result.ok) return renderForgot(res, 200, { step: 'request', error: result.error });
    req.session.reset = { adminId: admin.id };
    req.session.save(() =>
      renderForgot(res, 200, {
        step: 'verify',
        notice: 'Đã gửi mã OTP tới ' + adminAuth.maskEmail(adminAuth.adminEmail()) + '. Mã có hiệu lực 10 phút.' +
          (result.devCode ? ' (Chế độ dev: xem mã trong terminal.)' : '')
      })
    );
  } catch (err) {
    next(err);
  }
}

async function resendReset(req, res, next) {
  try {
    const state = req.session.reset;
    if (!state) return res.redirect('/admin/quen-mat-khau');
    if (!state.adminId) return renderForgot(res, 200, { step: 'verify', notice: 'Nếu tài khoản tồn tại, mã OTP mới đã được gửi.' });
    const result = await adminAuth.sendOtp(state.adminId, 'reset', reqInfo(req));
    if (!result.ok) return renderForgot(res, 200, { step: 'verify', error: result.error });
    renderForgot(res, 200, { step: 'verify', notice: 'Đã gửi lại mã OTP mới tới Gmail quản trị.' });
  } catch (err) {
    next(err);
  }
}

async function confirmReset(req, res, next) {
  try {
    const state = req.session.reset;
    if (!state) return res.redirect('/admin/quen-mat-khau');
    const { otp, password, confirm } = req.body;
    const admin = state.adminId ? await db('admin_users').where('id', state.adminId).first() : null;
    if (!admin) return renderForgot(res, 200, { step: 'verify', error: 'Mã OTP không đúng hoặc đã hết hạn.' });

    const pwError = adminAuth.validatePassword(password, admin.username);
    if (pwError) return renderForgot(res, 200, { step: 'verify', error: pwError });
    if (password !== confirm) return renderForgot(res, 200, { step: 'verify', error: 'Mật khẩu xác nhận không khớp.' });

    const check = await adminAuth.verifyOtp(admin.id, 'reset', otp);
    if (!check.ok) return renderForgot(res, 200, { step: 'verify', error: check.error });

    await db('admin_users').where('id', admin.id).update({ password_hash: bcrypt.hashSync(password, 10) });
    adminAuth.notifyPasswordChanged(reqInfo(req), 'đặt lại bằng chức năng Quên mật khẩu');
    delete req.session.reset;
    redirectWithFlash(req, res, '/admin/login', 'success', 'Đặt lại mật khẩu thành công. Hãy đăng nhập bằng mật khẩu mới.');
  } catch (err) {
    next(err);
  }
}

// ---- Doi mat khau (da dang nhap) ----
function renderChange(res, status, extra) {
  res.status(status).render('admin/change-password', Object.assign({
    title: 'Đổi mật khẩu - FAW Admin',
    step: 'form',
    error: null,
    notice: null,
    maskedEmail: adminAuth.maskEmail(adminAuth.adminEmail())
  }, extra));
}

function showChange(req, res) {
  renderChange(res, 200, { step: req.session.pwChange ? 'verify' : 'form' });
}

async function requestChange(req, res, next) {
  try {
    const { current, password, confirm } = req.body;
    const admin = await db('admin_users').where('id', req.session.adminId).first();
    if (!admin) return res.redirect('/admin/login');

    if (!(await bcrypt.compare(current || '', admin.password_hash))) {
      return renderChange(res, 200, { error: 'Mật khẩu hiện tại không đúng.' });
    }
    const pwError = adminAuth.validatePassword(password, admin.username);
    if (pwError) return renderChange(res, 200, { error: pwError });
    if (password !== confirm) return renderChange(res, 200, { error: 'Mật khẩu xác nhận không khớp.' });
    if (password === current) return renderChange(res, 200, { error: 'Mật khẩu mới phải khác mật khẩu hiện tại.' });

    const result = await adminAuth.sendOtp(admin.id, 'change', reqInfo(req));
    if (!result.ok) return renderChange(res, 200, { error: result.error });

    req.session.pwChange = { hash: bcrypt.hashSync(password, 10) };
    req.session.save(() =>
      renderChange(res, 200, {
        step: 'verify',
        notice: 'Đã gửi mã OTP tới ' + adminAuth.maskEmail(adminAuth.adminEmail()) + '. Mã có hiệu lực 10 phút.' +
          (result.devCode ? ' (Chế độ dev: xem mã trong terminal.)' : '')
      })
    );
  } catch (err) {
    next(err);
  }
}

async function resendChange(req, res, next) {
  try {
    if (!req.session.pwChange) return res.redirect('/admin/doi-mat-khau');
    const result = await adminAuth.sendOtp(req.session.adminId, 'change', reqInfo(req));
    if (!result.ok) return renderChange(res, 200, { step: 'verify', error: result.error });
    renderChange(res, 200, { step: 'verify', notice: 'Đã gửi lại mã OTP mới tới Gmail quản trị.' });
  } catch (err) {
    next(err);
  }
}

async function confirmChange(req, res, next) {
  try {
    const pending = req.session.pwChange;
    if (!pending) return res.redirect('/admin/doi-mat-khau');
    const check = await adminAuth.verifyOtp(req.session.adminId, 'change', req.body.otp);
    if (!check.ok) return renderChange(res, 200, { step: 'verify', error: check.error });

    await db('admin_users').where('id', req.session.adminId).update({ password_hash: pending.hash });
    adminAuth.notifyPasswordChanged(reqInfo(req), 'đổi trong trang quản trị');
    delete req.session.pwChange;
    redirectWithFlash(req, res, '/admin/doi-mat-khau', 'success', 'Đổi mật khẩu thành công. Một email thông báo đã được gửi tới Gmail quản trị.');
  } catch (err) {
    next(err);
  }
}

async function cancelChange(req, res) {
  delete req.session.pwChange;
  try {
    await adminAuth.clearOtp(req.session.adminId, 'change');
  } catch (err) {
    /* bo qua */
  }
  req.session.save(() => res.redirect('/admin/doi-mat-khau'));
}

module.exports = {
  flashMiddleware,
  showLogin,
  login,
  logout,
  showForgot,
  requestReset,
  resendReset,
  confirmReset,
  showChange,
  requestChange,
  resendChange,
  confirmChange,
  cancelChange
};
