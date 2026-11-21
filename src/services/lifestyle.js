// Lifestyle sets: one thumbnail + any number of extra photos + any number of linked products.
const db = require('../db');
const { formatVND } = require('../utils/format');
const stock = require('./productStock');

let ready = null;
function ensureSchema() {
  if (!ready) {
    ready = (async () => {
      if (!(await db.schema.hasTable('lifestyle_sets'))) {
        await db.schema.createTable('lifestyle_sets', (t) => {
          t.increments('id');
          t.string('title_vi', 200).nullable();
          t.string('title_en', 200).nullable();
          t.string('thumb_url', 500).notNullable();
          t.integer('product_id').nullable();
          t.boolean('is_active').notNullable().defaultTo(true);
          t.integer('sort_order').notNullable().defaultTo(0);
          t.timestamp('created_at').defaultTo(db.fn.now());
        });
      }
      if (!(await db.schema.hasTable('lifestyle_images'))) {
        await db.schema.createTable('lifestyle_images', (t) => {
          t.increments('id');
          t.integer('set_id').notNullable();
          t.string('image_url', 500).notNullable();
          t.integer('sort_order').notNullable().defaultTo(0);
        });
      }
      // products shown next to the photos (many per set, ordered)
      if (!(await db.schema.hasTable('lifestyle_set_products'))) {
        await db.schema.createTable('lifestyle_set_products', (t) => {
          t.increments('id');
          t.integer('set_id').notNullable();
          t.integer('product_id').notNullable();
          t.integer('sort_order').notNullable().defaultTo(0);
        });
      }
      // extra text: short description (VI/EN) and credit line (photographer, artist, @instagram...)
      for (const col of ['desc_vi', 'desc_en', 'credit']) {
        if (!(await db.schema.hasColumn('lifestyle_sets', col))) {
          await db.schema.alterTable('lifestyle_sets', (t) => { t.text(col).nullable(); });
        }
      }
    })().catch((err) => { ready = null; throw err; });
  }
  return ready;
}

async function listAll() {
  await ensureSchema();
  const sets = await db('lifestyle_sets').orderBy('sort_order').orderBy('id');
  const counts = await db('lifestyle_images').select('set_id').count('id as n').groupBy('set_id');
  const map = {};
  counts.forEach((c) => { map[c.set_id] = Number(c.n); });
  return sets.map((s) => Object.assign({}, s, { imageCount: map[s.id] || 0 }));
}

async function getSet(id) {
  await ensureSchema();
  const set = await db('lifestyle_sets').where({ id }).first();
  if (!set) return null;
  set.images = await db('lifestyle_images').where({ set_id: id }).orderBy('sort_order').orderBy('id');
  set.productIds = await productIdsOf(id, set.product_id);
  return set;
}

// product ids of a set in display order (falls back to the old single product link)
async function productIdsOf(setId, legacyId) {
  const rows = await db('lifestyle_set_products').where({ set_id: setId }).orderBy('sort_order').orderBy('id');
  const ids = rows.map((r) => r.product_id);
  if (!ids.length && legacyId) ids.push(legacyId);
  return ids;
}

// replaces the products of a set (ids in the wanted order)
async function setProducts(setId, ids) {
  await ensureSchema();
  const clean = [];
  (ids || []).forEach((n) => { n = Number(n); if (Number.isInteger(n) && n > 0 && clean.indexOf(n) === -1) clean.push(n); });
  await db.transaction(async (trx) => {
    await trx('lifestyle_set_products').where({ set_id: setId }).del();
    for (let i = 0; i < clean.length; i += 1) {
      await trx('lifestyle_set_products').insert({ set_id: setId, product_id: clean[i], sort_order: i + 1 });
    }
    await trx('lifestyle_sets').where({ id: setId }).update({ product_id: clean[0] || null });
  });
}

// Public: active sets with their photos (thumb first) and the product link in the right language.
async function listPublic(locale) {
  await ensureSchema();
  const sets = await db('lifestyle_sets').where({ is_active: true }).orderBy('sort_order').orderBy('id');
  if (!sets.length) return [];
  const ids = sets.map((s) => s.id);
  const imgs = await db('lifestyle_images').whereIn('set_id', ids).orderBy('sort_order').orderBy('id');
  const links = await db('lifestyle_set_products').whereIn('set_id', ids).orderBy('sort_order').orderBy('id');
  const bySet = {};
  links.forEach((l) => { (bySet[l.set_id] = bySet[l.set_id] || []).push(l.product_id); });
  sets.forEach((s) => { if (!(bySet[s.id] && bySet[s.id].length) && s.product_id) bySet[s.id] = [s.product_id]; });
  const pids = Array.from(new Set([].concat.apply([], Object.keys(bySet).map((k) => bySet[k]))));
  await stock.ensureProductStockSchema();
  const rows = pids.length ? await db('products').whereIn('id', pids).where({ is_active: true }) : [];
  const withStatus = await stock.attachStatus(rows);
  const pmap = {};
  withStatus.forEach((p) => { pmap[p.id] = p; });
  const en = locale === 'en';
  const base = en ? '/en/product/' : '/product/';
  return sets.map((s) => {
    const prods = (bySet[s.id] || []).map((pid) => pmap[pid]).filter(Boolean).map((p) => ({
      name: (en ? p.name_en || p.name_vi : p.name_vi || p.name_en) || '',
      url: base + p.slug,
      image: p.cover_image_url || '',
      price: formatVND(p.sale_price || p.price),
      was: p.sale_price && p.sale_price < p.price ? formatVND(p.price) : '',
      soldOut: p.stockStatus === 'soldout'
    }));
    const extra = imgs.filter((i) => i.set_id === s.id).map((i) => i.image_url);
    return {
      id: s.id,
      title: (en ? s.title_en || s.title_vi : s.title_vi || s.title_en) || '',
      thumb: s.thumb_url,
      // the thumb is the cover only; the pop up shows the extra photos (the thumb itself if there are none)
      images: extra.length ? extra : [s.thumb_url],
      desc: (en ? s.desc_en || s.desc_vi : s.desc_vi || s.desc_en) || '',
      credit: s.credit || '',
      products: prods
    };
  });
}

module.exports = { ensureSchema, listAll, getSet, listPublic, setProducts };
