/**
* @param { import("knex").Knex } knex
* @returns { Promise<void> }
*/
export async function up(knex) {
  await knex.schema.createTable('orders', table => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.enu('type', ['BUY', 'SELL']).notNullable();
    table.decimal('price', 20, 2);
    table.decimal('amount', 20, 8);
    table.decimal('remaining_amount', 20, 8);
    table.enu('status', ['QUEUED', 'OPEN', 'PARTIAL', 'COMPLETED', 'CANCELLED']).defaultTo('QUEUED');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.foreign('user_id').references('users.id');
    table.index(['type', 'status', 'price', 'created_at']);
    table.index(['user_id', 'status']);
  });
}

/**
* @param { import("knex").Knex } knex
* @returns { Promise<void> }
*/
export async function down(knex) {
  await knex.schema.dropTable('orders');
}
