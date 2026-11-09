// Lookbook page images: one independent library (not tied to a product).
const db = require('../db');

let ready = null;
function ensureSchema() {
  if (!ready) {
    ready = (async () => {
      if (await db.schema.hasTable('lookbook_images')) return;
      await db.schema.createTable('lookbook_images', (t) => {
        t.increments('id');
        t.string('image_url', 500).notNullable();
        t.string('caption_vi', 200).nullable();
        t.string('caption_en', 200).nullable();
        t.integer('product_id').nullable();
        t.boolean('is_active').notNullable().defaultTo(true);
        t.integer('sort_order').notNullable().defaultTo(0);
        t.timestamp('created_at').defaultTo(db.fn.now());
      });
      // one-time: carry over the extra images that used to be added as "archive banners"
      if (await db.schema.hasTable('banners')) {
        const old = await db('banners').where({ type: 'archive' }).orderBy('sort_order');
        for (let i = 0; i < old.length; i += 1) {
          if (!old[i].image_url) continue;
          await db('lookbook_images').insert({
            image_url: old[i].image_url,
            caption_vi: old[i].title_vi || null,
            caption_en: old[i].title_en || null,
            is_active: !!old[i].is_active,
            sort_order: i + 1
          });
        }
      }
    })().catch((err) => {
      ready = null;
      throw err;
    });
  }
  return ready;
}

async function listAll() {
  await ensureSchema();
  return db('lookbook_images').orderBy('sort_order').orderBy('id');
}

// Public page: active images with the linked product's slug / name when there is one.
async function listPublic() {
  await ensureSchema();
  const rows = await db('lookbook_images').where({ is_active: true }).orderBy('sort_order').orderBy('id');
  const ids = Array.from(new Set(rows.map((r) => r.product_id).filter(Boolean)));
  const products = ids.length ? await db('products').whereIn('id', ids).where({ is_active: true }) : [];
  const map = {};
  products.forEach((p) => { map[p.id] = p; });
  return rows.map((r) => Object.assign({}, r, { product: r.product_id ? map[r.product_id] || null : null }));
}

module.exports = { ensureSchema, listAll, listPublic };
