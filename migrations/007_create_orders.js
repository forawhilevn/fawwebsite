exports.up = function (knex) {
  return knex.schema.createTable('orders', (table) => {
    table.increments('id').primary();
    table.string('order_code', 20).notNullable().unique();
    table.string('customer_name', 150).notNullable();
    table.string('phone', 20).notNullable();
    table.string('email', 150).nullable();
    table.string('address', 300).notNullable();
    table.text('note').nullable();
    table
      .enu('payment_method', ['cod', 'vietqr'], { useNative: false, enumName: 'payment_method' })
      .notNullable();
    table
      .enu('payment_status', ['unpaid', 'paid'], { useNative: false, enumName: 'payment_status' })
      .notNullable()
      .defaultTo('unpaid');
    table
      .enu('status', ['pending', 'confirmed', 'shipping', 'completed', 'cancelled'], {
        useNative: false,
        enumName: 'order_status'
      })
      .notNullable()
      .defaultTo('pending');
    table
      .integer('discount_code_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('discount_codes')
      .onDelete('SET NULL');
    table.integer('discount_amount').unsigned().notNullable().defaultTo(0);
    table.integer('subtotal').unsigned().notNullable();
    table.integer('total').unsigned().notNullable();
    table
      .enu('locale', ['vi', 'en'], { useNative: false, enumName: 'order_locale' })
      .notNullable()
      .defaultTo('vi');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['status']);
    table.index(['payment_status']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('orders');
};
