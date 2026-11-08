const db = require('../db');

// Creates the promotions table and the extra order columns on first use,
// so no manual migration is needed.
let ready = null;

async function run() {
  if (!(await db.schema.hasTable('promotions'))) {
    await db.schema.createTable('promotions', (t) => {
      t.increments('id');
      t.string('kind', 30).notNullable();            // freeship | order_discount | quantity_discount | product_discount
      t.string('name_vi', 200).notNullable();
      t.string('name_en', 200).nullable();
      t.string('discount_type', 10).notNullable().defaultTo('percent'); // percent | fixed
      t.integer('value').notNullable().defaultTo(0);
      t.integer('min_order_total').nullable();
      t.integer('min_quantity').nullable();
      t.string('scope_type', 20).notNullable().defaultTo('all');        // all | category | product
      t.text('scope_ids').nullable();                // comma separated ids
      t.boolean('require_code').notNullable().defaultTo(false);
      t.string('code', 60).nullable();
      t.string('starts_at', 20).nullable();          // YYYY-MM-DD
      t.string('expires_at', 20).nullable();         // YYYY-MM-DD
      t.string('bar_text_vi', 300).nullable();
      t.string('bar_text_en', 300).nullable();
      t.boolean('is_active').notNullable().defaultTo(true);
      t.integer('sort_order').notNullable().defaultTo(0);
      t.timestamp('created_at').defaultTo(db.fn.now());
    });
  }
  const cols = [
    ['shipping_fee', (t) => t.integer('shipping_fee').notNullable().defaultTo(0)],
    ['shipping_zone', (t) => t.string('shipping_zone', 20).nullable()],
    ['promo_note', (t) => t.string('promo_note', 500).nullable()]
  ];
  for (const [name, add] of cols) {
    if (!(await db.schema.hasColumn('orders', name))) {
      await db.schema.alterTable('orders', (t) => { add(t); });
    }
  }
}

function ensurePromoSchema() {
  if (!ready) {
    ready = run().catch((err) => { ready = null; throw err; });
  }
  return ready;
}

module.exports = { ensurePromoSchema };
