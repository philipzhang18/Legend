const knex = require('knex');

/**
 * 用户表迁移
 */
exports.up = function(knex) {
  return knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('username', 50).notNullable().unique();
    table.string('email', 100).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.string('nickname', 100);
    table.string('avatar_url', 255);
    table.integer('rating').defaultTo(1200);
    table.integer('games_played').defaultTo(0);
    table.integer('games_won').defaultTo(0);
    table.integer('games_lost').defaultTo(0);
    table.integer('games_drawn').defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.boolean('is_premium').defaultTo(false);
    table.timestamp('last_login_at');
    table.timestamps(true, true);

    // 索引
    table.index(['username']);
    table.index(['email']);
    table.index(['rating']);
    table.index(['is_active']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('users');
};