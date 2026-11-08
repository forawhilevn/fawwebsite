const db = require('../db');

// Creates the stores table on first use, so no manual migration is needed.
let ready = null;

function ensureStoreSchema() {
  if (!ready) {
    ready = db.schema.hasTable('stores').then((has) => {
      if (has) {
        return db.schema.hasColumn('stores', 'images').then((h) => {
          if (h) return null;
          return db.schema.alterTable('stores', (t) => { t.text('images').nullable(); });
        });
      }
      return db.schema.createTable('stores', (t) => {
        t.increments('id');
        t.string('type', 20).notNullable().defaultTo('agent'); // agent | store
        t.string('name_vi', 200).notNullable();
        t.string('name_en', 200).nullable();
        t.string('city', 100).nullable();
        t.string('address', 400).nullable();
        t.string('phone', 50).nullable();
        t.string('hours', 200).nullable();
        t.string('maps_url', 600).nullable();
        t.string('lat_lng', 60).nullable();
        t.string('instagram', 200).nullable();
        t.string('facebook', 300).nullable();
        t.text('note_vi').nullable();
        t.text('note_en').nullable();
        t.string('image_url', 500).nullable();
        t.text('images').nullable(); // JSON array of image urls
        t.integer('sort_order').notNullable().defaultTo(0);
        t.boolean('is_active').notNullable().defaultTo(true);
        t.boolean('is_closed').notNullable().defaultTo(false);
        t.timestamp('created_at').defaultTo(db.fn.now());
      });
    }).catch((err) => {
      ready = null;
      throw err;
    });
  }
  return ready;
}

module.exports = { ensureStoreSchema };
