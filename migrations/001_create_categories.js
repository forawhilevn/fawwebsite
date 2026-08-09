exports.up = function (knex) {
  return knex.schema.createTable('categories', (table) => {
    table.increments('id').primary();
    table.string('slug', 50).notNullable().unique();
    table.string('name_vi', 100).notNullable();
    table.string('name_en', 100).notNullable();
    table.integer('sort_order').unsigned().notNullable().defaultTo(0);
    table.string('image_url', 500).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('categories');
};
