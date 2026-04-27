/**
* @param { import("knex").Knex } knex
* @returns { Promise<void> }
*/
export async function up(knex) {
  await knex.schema.createTable('trades', table => {
    table.increments('id').primary();
    table.integer('buy_order_id').unsigned().notNullable();
    table.integer('sell_order_id').unsigned().notNullable();
    table.integer('maker_order_id').unsigned().notNullable();
    table.integer('taker_order_id').unsigned().notNullable();
    table.decimal('price', 20, 2);
    table.decimal('amount', 20, 8);
    table.decimal('maker_fee', 20, 8).defaultTo(0);
    table.decimal('taker_fee', 20, 8).defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.foreign('buy_order_id').references('orders.id');
    table.foreign('sell_order_id').references('orders.id');
    table.foreign('maker_order_id').references('orders.id');
    table.foreign('taker_order_id').references('orders.id');
    table.index('created_at');
  });
}

/**
* @param { import("knex").Knex } knex
* @returns { Promise<void> }
*/
export async function down(knex) {
  await knex.schema.dropTable('trades');
}
