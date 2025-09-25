const knex = require('../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

/**
 * 用户模型
 */
class User {
  static tableName = 'users';

  /**
   * 创建新用户
   */
  static async create(userData) {
    const { username, email, password, nickname } = userData;

    // 密码加密
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const user = {
      id: uuidv4(),
      username,
      email: email.toLowerCase(),
      password_hash: passwordHash,
      nickname: nickname || username,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const [insertedUser] = await knex(this.tableName)
      .insert(user)
      .returning(['id', 'username', 'email', 'nickname', 'rating', 'games_played', 'games_won', 'games_lost', 'games_drawn', 'is_active', 'is_premium', 'created_at']);

    return insertedUser;
  }

  /**
   * 通过用户名查找用户
   */
  static async findByUsername(username) {
    return await knex(this.tableName)
      .where({ username })
      .first();
  }

  /**
   * 通过邮箱查找用户
   */
  static async findByEmail(email) {
    return await knex(this.tableName)
      .where({ email: email.toLowerCase() })
      .first();
  }

  /**
   * 通过ID查找用户
   */
  static async findById(id) {
    return await knex(this.tableName)
      .where({ id })
      .select(['id', 'username', 'email', 'nickname', 'avatar_url', 'rating', 'games_played', 'games_won', 'games_lost', 'games_drawn', 'is_active', 'is_premium', 'last_login_at', 'created_at'])
      .first();
  }

  /**
   * 验证密码
   */
  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * 更新用户信息
   */
  static async update(id, updateData) {
    const updatedUser = await knex(this.tableName)
      .where({ id })
      .update({
        ...updateData,
        updated_at: new Date(),
      })
      .returning(['id', 'username', 'email', 'nickname', 'avatar_url', 'rating', 'games_played', 'games_won', 'games_lost', 'games_drawn', 'is_active', 'is_premium']);

    return updatedUser[0];
  }

  /**
   * 更新最后登录时间
   */
  static async updateLastLogin(id) {
    return await knex(this.tableName)
      .where({ id })
      .update({
        last_login_at: new Date(),
        updated_at: new Date(),
      });
  }

  /**
   * 更新用户统计数据
   */
  static async updateStats(id, result) {
    const updates = {};

    switch (result) {
      case 'win':
        updates.games_won = knex.raw('games_won + 1');
        updates.rating = knex.raw('rating + 25'); // ELO评分简化版
        break;
      case 'loss':
        updates.games_lost = knex.raw('games_lost + 1');
        updates.rating = knex.raw('GREATEST(rating - 25, 800)'); // 最低800分
        break;
      case 'draw':
        updates.games_drawn = knex.raw('games_drawn + 1');
        break;
    }

    updates.games_played = knex.raw('games_played + 1');
    updates.updated_at = new Date();

    return await knex(this.tableName)
      .where({ id })
      .update(updates);
  }

  /**
   * 获取排行榜
   */
  static async getLeaderboard(limit = 50) {
    return await knex(this.tableName)
      .select(['id', 'username', 'nickname', 'rating', 'games_played', 'games_won', 'games_lost'])
      .where({ is_active: true })
      .orderBy('rating', 'desc')
      .limit(limit);
  }

  /**
   * 搜索用户
   */
  static async search(query, limit = 20) {
    return await knex(this.tableName)
      .select(['id', 'username', 'nickname', 'rating', 'is_active'])
      .where('username', 'ilike', `%${query}%`)
      .orWhere('nickname', 'ilike', `%${query}%`)
      .where({ is_active: true })
      .limit(limit);
  }

  /**
   * 检查用户名是否存在
   */
  static async isUsernameExists(username) {
    const user = await knex(this.tableName)
      .where({ username })
      .select('id')
      .first();
    return !!user;
  }

  /**
   * 检查邮箱是否存在
   */
  static async isEmailExists(email) {
    const user = await knex(this.tableName)
      .where({ email: email.toLowerCase() })
      .select('id')
      .first();
    return !!user;
  }
}

module.exports = User;