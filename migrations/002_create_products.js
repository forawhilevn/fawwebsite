exports.up = function (knex) {
  return knex.schema.createTable('products', (table) => {
    table.increments('id').primary();
    table
      .integer('category_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('categories')
      .onDelete('CASCADE');
    table.string('name_vi', 200).notNullable();
    table.string('name_en', 200).notNullable();
    table.string('slug', 220).notNullable().unique();
    table.text('description_vi').nullable();
    table.text('description_en').nullable();
    table.string('sku', 50).nullable();
    table.integer('price').unsigned().notNullable();
    table.integer('sale_price').unsigned().nullable();
    table.string('cover_image_url', 500).nullable();
    table.boolean('is_featured').notNullable().defaultTo(false);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['category_id']);
    table.index(['is_active']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('products');
};
