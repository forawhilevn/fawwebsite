const db = require('../db');

// Adds banners.image_mobile_url on first use, so no manual migration is needed.
let ready = null;

function ensureBannerSchema() {
  if (!ready) {
    ready = db.schema.hasColumn('banners', 'image_mobile_url').then((has) => {
      if (has) return null;
      return db.schema.alterTable('banners', (t) => {
        t.string('image_mobile_url', 500).nullable();
      });
    }).catch((err) => {
      ready = null;
      throw err;
    });
  }
  return ready;
}

module.exports = { ensureBannerSchema };
