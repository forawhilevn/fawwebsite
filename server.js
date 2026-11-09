require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');
const KnexSessionStore = require('connect-session-knex')(session);

const db = require('./src/db');
const attachLocals = require('./src/middleware/locals');
const siteGate = require('./src/middleware/siteGate');
const { setLocale } = require('./src/middleware/locale');
const { notFoundHandler, errorHandler } = require('./src/middleware/errorHandler');
const indexRoutes = require('./src/routes/index');
const adminRoutes = require('./src/routes/admin');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', 1);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// admin uploads live outside the app folder in production (see src/utils/storage.js)
const storage = require('./src/utils/storage');
if (storage.SEPARATE) app.use(express.static(storage.STORAGE_DIR, { index: false }));
app.use(
  express.static(path.join(__dirname, 'public'), {
    // CSS / JS are always revalidated (cheap 304 when unchanged) so edits show up right away
    setHeaders(res, filePath) {
      if (/\.(css|js)$/.test(filePath)) res.setHeader('Cache-Control', 'no-cache');
    }
  })
);

const sessionStore = new KnexSessionStore({
  knex: db,
  createtable: true,
  tablename: 'sessions'
});

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'faw-dev-secret',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    }
  })
);

app.use('/admin', setLocale('vi'), attachLocals, adminRoutes);
app.use('/en', setLocale('en'), attachLocals, siteGate, indexRoutes);
app.use('/', setLocale(process.env.DEFAULT_LOCALE || 'vi'), attachLocals, siteGate, indexRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

// On the production server (no SSH needed): create the tables and the first admin account.
// Migrations are safe to repeat; the admin is only created while there is no admin yet.
async function bootstrap() {
  if (process.env.NODE_ENV !== 'production' && process.env.AUTO_MIGRATE !== '1') return;
  await db.migrate.latest({ directory: path.join(__dirname, 'migrations') });
  const adopted = storage.adoptPublicUploads();
  if (adopted) console.log('Da chuyen ' + adopted + ' file upload sang ' + storage.STORAGE_DIR);
  console.log('Thu muc luu file upload: ' + storage.STORAGE_DIR);
  const hasAdmin = await db('admin_users').first();
  if (!hasAdmin && process.env.ADMIN_DEFAULT_PASSWORD) {
    const bcrypt = require('bcryptjs');
    await db('admin_users').insert({
      username: process.env.ADMIN_DEFAULT_USERNAME || 'admin',
      password_hash: bcrypt.hashSync(process.env.ADMIN_DEFAULT_PASSWORD, 10)
    });
    console.log('Da tao tai khoan admin dau tien.');
  }
}

const PORT = process.env.PORT || 3000;
bootstrap()
  .catch((err) => console.error('Khoi tao database that bai:', err.message))
  .then(() => {
    app.listen(PORT, () => {
      console.log(`FAW dang chay tai http://localhost:${PORT}`);
    });
  });
