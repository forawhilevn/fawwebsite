exports.up = function (knex) {
  return knex.schema.createTable('discount_codes', (table) => {
    table.increments('id').primary();
    table.string('code', 50).notNullable().unique();
    table
      .enu('type', ['percent', 'fixed'], { useNative: false, enumName: 'discount_type' })
      .notNullable();
    table.integer('value').unsigned().notNullable();
    table.integer('min_order_total').unsigned().nullable();
    table.integer('max_uses').unsigned().nullable();
    table.integer('used_count').unsigned().notNullable().defaultTo(0);
    table.datetime('starts_at').nullable();
    table.datetime('expires_at').nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('discount_codes');
};
