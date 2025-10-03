/**
 * 聊天记录表迁移
 */
exports.up = function (knex) {
  return knex.schema.createTable('chat_messages', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('room_id').notNullable().references('id').inTable('game_rooms');
    table.uuid('user_id').notNullable().references('id').inTable('users');
    table.text('message').notNullable();
    table.enum('message_type', ['user', 'system']).defaultTo('user');
    table.timestamp('sent_at').defaultTo(knex.fn.now());
    table.timestamps(true, true);

    // 索引
    table.index(['room_id']);
    table.index(['user_id']);
    table.index(['sent_at']);
    table.index(['message_type']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('chat_messages');
};
