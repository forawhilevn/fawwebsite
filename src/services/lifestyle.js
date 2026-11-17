// Lifestyle sets: one thumbnail + any number of extra photos, optional product link.
const db = require('../db');

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
  return set;
}

// Public: active sets with their photos (thumb first) and the product link in the right language.
async function listPublic(locale) {
  await ensureSchema();
  const sets = await db('lifestyle_sets').where({ is_active: true }).orderBy('sort_order').orderBy('id');
  if (!sets.length) return [];
  const ids = sets.map((s) => s.id);
  const imgs = await db('lifestyle_images').whereIn('set_id', ids).orderBy('sort_order').orderBy('id');
  const pids = Array.from(new Set(sets.map((s) => s.product_id).filter(Boolean)));
  const products = pids.length ? await db('products').whereIn('id', pids).where({ is_active: true }) : [];
  const pmap = {};
  products.forEach((p) => { pmap[p.id] = p; });
  const en = locale === 'en';
  return sets.map((s) => {
    const p = s.product_id ? pmap[s.product_id] : null;
    return {
      id: s.id,
      title: (en ? s.title_en || s.title_vi : s.title_vi || s.title_en) || '',
      thumb: s.thumb_url,
      images: [s.thumb_url].concat(imgs.filter((i) => i.set_id === s.id).map((i) => i.image_url)),
      product: p ? { name: en ? p.name_en || p.name_vi : p.name_vi || p.name_en, url: (en ? '/en/product/' : '/product/') + p.slug } : null
    };
  });
}

module.exports = { ensureSchema, listAll, getSet, listPublic };
