const knex = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// 内存存储（当数据库不可用时）
const memoryRooms = new Map();

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

    // 检查creator_id是否为有效的UUID格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isGuestUser = !uuidRegex.test(roomData.creatorId);

    // 如果数据库未连接，或者是游客用户，使用内存存储
    if (!knex.isConnected || !knex.isConnected() || isGuestUser) {
      memoryRooms.set(room.room_code, room);
      return room;
    }

    const [insertedRoom] = await knex(this.tableName)
      .insert(room)
      .returning('*');

    return insertedRoom;
  }

  /**
   * 通过房间代码查找房间
   */
  static async findByRoomCode(roomCode) {
    // 先检查内存中是否有这个房间（游客房间）
    const memoryRoom = memoryRooms.get(roomCode);
    if (memoryRoom) {
      return memoryRoom;
    }

    // 如果数据库未连接，返回null
    if (!knex.isConnected || !knex.isConnected()) {
      return null;
    }

    // 在数据库中查找
    return await knex(this.tableName)
      .where({ room_code: roomCode })
      .first();
  }

  /**
   * 通过ID查找房间
   */
  static async findById(id) {
    // 先检查内存中是否有这个房间（游客房间）
    for (const room of memoryRooms.values()) {
      if (room.id === id) return room;
    }

    // 如果数据库未连接，返回null
    if (!knex.isConnected || !knex.isConnected()) {
      return null;
    }

    // 在数据库中查找
    return await knex(this.tableName)
      .where({ id })
      .first();
  }

  /**
   * 更新房间信息
   */
  static async update(id, updateData) {
    // 先检查内存中是否有这个房间（游客房间）
    for (const [code, room] of memoryRooms.entries()) {
      if (room.id === id) {
        Object.assign(room, updateData, { updated_at: new Date() });
        memoryRooms.set(code, room);
        return room;
      }
    }

    // 如果数据库未连接，返回null
    if (!knex.isConnected || !knex.isConnected()) {
      return null;
    }

    // 检查更新数据中是否包含游客用户ID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const hasGuestUser = (updateData.creator_id && !uuidRegex.test(updateData.creator_id)) ||
                         (updateData.black_player_id && !uuidRegex.test(updateData.black_player_id)) ||
                         (updateData.white_player_id && !uuidRegex.test(updateData.white_player_id));

    if (hasGuestUser) {
      // 如果更新数据包含游客ID，不能写入数据库，返回null
      return null;
    }

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
    // 先检查内存中是否有这个房间（游客房间）
    for (const [code, room] of memoryRooms.entries()) {
      if (room.id === id) {
        memoryRooms.delete(code);
        return 1;
      }
    }

    // 如果数据库未连接，返回0
    if (!knex.isConnected || !knex.isConnected()) {
      return 0;
    }

    // 在数据库中删除
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
    // 检查userId是否为有效的UUID格式（游客ID不是UUID）
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isGuestUser = !uuidRegex.test(userId);

    if (!knex.isConnected || !knex.isConnected() || isGuestUser) {
      for (const room of memoryRooms.values()) {
        if ((room.creator_id === userId ||
             room.black_player_id === userId ||
             room.white_player_id === userId) &&
            (room.status === 'waiting' || room.status === 'playing')) {
          return room;
        }
      }
      return null;
    }

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
    if (!knex.isConnected || !knex.isConnected()) {
      const rooms = Array.from(memoryRooms.values())
        .filter(room => !room.is_private &&
                       (room.status === 'waiting' || room.status === 'playing'))
        .sort((a, b) => b.created_at - a.created_at)
        .slice(0, limit);
      return rooms;
    }

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