/**
 * 游戏房间表迁移
 */
exports.up = function(knex) {
  return knex.schema.createTable('game_rooms', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('room_code', 20).notNullable().unique();
    table.string('name', 100).notNullable();
    table.uuid('creator_id').notNullable().references('id').inTable('users');
    table.uuid('black_player_id').references('id').inTable('users');
    table.uuid('white_player_id').references('id').inTable('users');
    table.enum('status', ['waiting', 'playing', 'finished', 'abandoned']).defaultTo('waiting');
    table.boolean('is_private').defaultTo(false);
    table.integer('max_players').defaultTo(2);
    table.integer('time_limit_minutes').defaultTo(30);
    table.timestamps(true, true);

    // 索引
    table.index(['room_code']);
    table.index(['creator_id']);
    table.index(['status']);
    table.index(['is_private']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('game_rooms');
};