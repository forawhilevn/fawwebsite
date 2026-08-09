exports.up = function (knex) {
  return knex.schema.createTable('banners', (table) => {
    table.increments('id').primary();
    table.string('image_url', 500).notNullable();
    table.string('link_url', 500).nullable();
    table
      .enu('type', ['hero', 'featured', 'archive'], { useNative: false, enumName: 'banner_type' })
      .notNullable()
      .defaultTo('hero');
    table.string('title_vi', 200).nullable();
    table.string('title_en', 200).nullable();
    table.integer('sort_order').unsigned().notNullable().defaultTo(0);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['type', 'is_active']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('banners');
};
