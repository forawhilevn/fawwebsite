// One-time import of the data exported from the local machine (data-import/data.json + data-import/files).
// Runs on production start-up. It replaces the shop content (categories, products, variants, images,
// banners, promotions, stores, pages, discount codes) and merges the site settings.
// Admin accounts, sessions and orders are never touched. A marker in site_settings makes sure the
// same bundle is only imported once.
const fs = require('fs');
const path = require('path');
const db = require('../db');
const settings = require('./settings');
const { ensureBannerSchema } = require('./bannerSchema');
const { ensureStoreSchema } = require('./storeSchema');
const { ensurePromoSchema } = require('./promoSchema');
const { ensurePagesSchema } = require('./pages');

const ROOT = path.join(__dirname, '..', '..');
const BUNDLE_DIR = path.join(ROOT, 'data-import');
const storage = require('../utils/storage');
const PUBLIC_DIR = storage.STORAGE_DIR; // uploads live outside the app folder in production

// insert order (parents first); deletion runs in reverse
const TABLES = ['categories', 'products', 'product_variants', 'product_images', 'banners', 'promotions', 'stores', 'pages', 'discount_codes'];

function copyDir(src, dest, onlyMissing) {
  if (!fs.existsSync(src)) return 0;
  let count = 0;
  fs.readdirSync(src, { withFileTypes: true }).forEach((entry) => {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(to, { recursive: true });
      count += copyDir(from, to, onlyMissing);
    } else {
      if (onlyMissing && fs.existsSync(to)) return;
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.copyFileSync(from, to);
      count += 1;
    }
  });
  return count;
}

async function runDataImport() {
  const file = path.join(BUNDLE_DIR, 'data.json');
  if (!fs.existsSync(file)) return;
  const bundle = JSON.parse(fs.readFileSync(file, 'utf8'));
  const current = await settings.getAll();
  if (current.data_import_id === bundle.id) {
    // already imported: only put back photos/videos a redeploy may have wiped
    const restored = copyDir(path.join(BUNDLE_DIR, 'files'), PUBLIC_DIR, true);
    if (restored) console.log('Khoi phuc ' + restored + ' file anh/video tu data-import.');
    return;
  }

  console.log('Nhap du lieu tu may (' + bundle.id + ')...');
  await ensureBannerSchema();
  await ensureStoreSchema();
  await ensurePromoSchema();
  await ensurePagesSchema();

  const copied = copyDir(path.join(BUNDLE_DIR, 'files'), PUBLIC_DIR);

  await db.transaction(async (trx) => {
    for (const table of TABLES.slice().reverse()) {
      if (await trx.schema.hasTable(table)) await trx(table).del();
    }
    for (const table of TABLES) {
      const rows = (bundle.tables && bundle.tables[table]) || [];
      if (!rows.length || !(await trx.schema.hasTable(table))) continue;
      const columns = Object.keys(await trx(table).columnInfo());
      const clean = rows.map((row) => {
        const out = {};
        columns.forEach((col) => { if (row[col] !== undefined) out[col] = row[col]; });
        return out;
      });
      for (let i = 0; i < clean.length; i += 50) await trx(table).insert(clean.slice(i, i + 50));
    }
  });

  await settings.setMany(Object.assign({}, bundle.settings || {}, { data_import_id: bundle.id }));
  const counts = TABLES.map((t) => t + ' ' + ((bundle.tables && bundle.tables[t]) || []).length).join(', ');
  console.log('Da nhap du lieu: ' + counts + ', ' + copied + ' file anh/video.');
}

module.exports = { runDataImport };
