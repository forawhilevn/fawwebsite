// Key/value store for site-wide settings (e.g. "website closed" mode).
exports.up = async function (knex) {
  if (await knex.schema.hasTable('site_settings')) return;
  await knex.schema.createTable('site_settings', (table) => {
    table.string('key', 100).primary();
    table.text('value').nullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('site_settings');
};
