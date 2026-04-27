/**
* @param { import("knex").Knex } knex
* @returns { Promise<void> }
*/
export async function up(knex) {
  await knex.schema.createTable('users', table => {
    table.increments('id').primary();
    table.string('username').notNullable().unique();
    table.decimal('usd_balance', 20, 2).defaultTo(100000);
    table.decimal('reserved_usd', 20, 2).defaultTo(0);
    table.decimal('btc_balance', 20, 8).defaultTo(100);
    table.decimal('reserved_btc', 20, 8).defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

/**
* @param { import("knex").Knex } knex
* @returns { Promise<void> }
*/
export async function down(knex) {
  await knex.schema.dropTable('users');
}
