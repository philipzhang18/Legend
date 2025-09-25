/**
 * 游戏记录表迁移
 */
exports.up = function(knex) {
  return knex.schema.createTable('game_records', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('room_id').notNullable().references('id').inTable('game_rooms');
    table.uuid('black_player_id').notNullable().references('id').inTable('users');
    table.uuid('white_player_id').notNullable().references('id').inTable('users');
    table.uuid('winner_id').references('id').inTable('users');
    table.enum('result', ['black_win', 'white_win', 'draw', 'abandoned']).notNullable();
    table.json('moves').notNullable(); // 存储棋谱
    table.integer('total_moves').notNullable();
    table.integer('game_duration_seconds').notNullable();
    table.timestamp('started_at').notNullable();
    table.timestamp('finished_at').notNullable();
    table.timestamps(true, true);

    // 索引
    table.index(['room_id']);
    table.index(['black_player_id']);
    table.index(['white_player_id']);
    table.index(['winner_id']);
    table.index(['result']);
    table.index(['started_at']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('game_records');
};