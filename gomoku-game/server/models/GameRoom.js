const knex = require('../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * 游戏房间模型
 */
class GameRoom {
  static tableName = 'game_rooms';

  /**
   * 创建游戏房间
   */
  static async create(roomData) {
    const room = {
      id: uuidv4(),
      room_code: roomData.roomCode || this.generateRoomCode(),
      name: roomData.name || `${roomData.creatorUsername}'s Room`,
      creator_id: roomData.creatorId,
      status: 'waiting',
      is_private: roomData.isPrivate || false,
      time_limit_minutes: roomData.timeLimit || 30,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const [insertedRoom] = await knex(this.tableName)
      .insert(room)
      .returning('*');

    return insertedRoom;
  }

  /**
   * 通过房间代码查找房间
   */
  static async findByRoomCode(roomCode) {
    return await knex(this.tableName)
      .where({ room_code: roomCode })
      .first();
  }

  /**
   * 通过ID查找房间
   */
  static async findById(id) {
    return await knex(this.tableName)
      .where({ id })
      .first();
  }

  /**
   * 更新房间信息
   */
  static async update(id, updateData) {
    const [updatedRoom] = await knex(this.tableName)
      .where({ id })
      .update({
        ...updateData,
        updated_at: new Date(),
      })
      .returning('*');

    return updatedRoom;
  }

  /**
   * 删除房间
   */
  static async delete(id) {
    return await knex(this.tableName)
      .where({ id })
      .del();
  }

  /**
   * 生成房间代码
   */
  static generateRoomCode() {
    return Math.random().toString(36).substr(2, 8).toUpperCase();
  }

  /**
   * 获取用户活跃房间
   */
  static async getUserActiveRoom(userId) {
    return await knex(this.tableName)
      .where(function() {
        this.where({ creator_id: userId })
          .orWhere({ black_player_id: userId })
          .orWhere({ white_player_id: userId });
      })
      .whereIn('status', ['waiting', 'playing'])
      .first();
  }

  /**
   * 获取公开房间列表
   */
  static async getPublicRooms(limit = 20) {
    return await knex(this.tableName)
      .select([
        'game_rooms.*',
        'creator.username as creator_username',
        'black_player.username as black_player_username',
        'white_player.username as white_player_username'
      ])
      .leftJoin('users as creator', 'game_rooms.creator_id', 'creator.id')
      .leftJoin('users as black_player', 'game_rooms.black_player_id', 'black_player.id')
      .leftJoin('users as white_player', 'game_rooms.white_player_id', 'white_player.id')
      .where({ is_private: false })
      .whereIn('status', ['waiting', 'playing'])
      .orderBy('created_at', 'desc')
      .limit(limit);
  }
}

module.exports = GameRoom;