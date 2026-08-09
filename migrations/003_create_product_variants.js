exports.up = function (knex) {
  return knex.schema.createTable('product_variants', (table) => {
    table.increments('id').primary();
    table
      .integer('product_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('products')
      .onDelete('CASCADE');
    table.string('size', 20).notNullable();
    table.string('color', 50).nullable();
    table.string('color_hex', 7).nullable();
    table.string('sku', 100).nullable();
    table.integer('stock').unsigned().notNullable().defaultTo(0);
    table.integer('price_override').unsigned().nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['product_id']);
    table.unique(['product_id', 'size', 'color']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('product_variants');
};
