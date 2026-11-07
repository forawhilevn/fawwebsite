const db = require('../db');

const DEFAULTS = {
  site_closed: '0',
  closed_title_vi: 'ĐANG CẬP NHẬT',
  closed_title_en: 'BE RIGHT BACK',
  closed_message_vi: 'FAW đang chuẩn bị cho collection mới. Hẹn gặp lại bạn sớm.',
  closed_message_en: 'FAW is getting ready for a new collection. See you soon.',
  closed_at: ''
};

let tableReady = false;
let cache = null;
let cacheAt = 0;
const CACHE_MS = 3000;

// Creates the table on first use so the site keeps working even if
// `npm run migrate` has not been run yet.
async function ensureTable() {
  if (tableReady) return;
  if (!(await db.schema.hasTable('site_settings'))) {
    await db.schema.createTable('site_settings', (table) => {
      table.string('key', 100).primary();
      table.text('value').nullable();
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
  }
  tableReady = true;
}

async function getAll() {
  const now = Date.now();
  if (cache && now - cacheAt < CACHE_MS) return cache;
  try {
    await ensureTable();
    const rows = await db('site_settings');
    const out = Object.assign({}, DEFAULTS);
    rows.forEach((r) => {
      if (r.value !== null && r.value !== undefined) out[r.key] = r.value;
    });
    cache = out;
    cacheAt = now;
    return out;
  } catch (err) {
    // never take the storefront down because of the settings table
    return Object.assign({}, DEFAULTS);
  }
}

async function setMany(values) {
  await ensureTable();
  for (const key of Object.keys(values)) {
    const value = String(values[key] === undefined || values[key] === null ? '' : values[key]);
    const updated = await db('site_settings').where({ key }).update({ value, updated_at: db.fn.now() });
    if (!updated) await db('site_settings').insert({ key, value });
  }
  cache = null;
}

module.exports = { getAll, setMany, DEFAULTS };
