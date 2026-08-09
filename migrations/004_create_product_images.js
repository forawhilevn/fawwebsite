exports.up = function (knex) {
  return knex.schema.createTable('product_images', (table) => {
    table.increments('id').primary();
    table
      .integer('product_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('products')
      .onDelete('CASCADE');
    table
      .integer('variant_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('product_variants')
      .onDelete('SET NULL');
    table.string('image_url', 500).notNullable();
    table.integer('sort_order').unsigned().notNullable().defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['product_id']);
    table.index(['variant_id']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('product_images');
};
