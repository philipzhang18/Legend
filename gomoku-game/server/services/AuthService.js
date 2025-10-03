const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { RedisService } = require('../config/redis');

/**
 * 认证服务
 */
class AuthService {
  /**
   * 生成JWT令牌
   */
  static generateToken(payload) {
    const secret = process.env.JWT_SECRET;
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

    return jwt.sign(payload, secret, { expiresIn });
  }

  /**
   * 验证JWT令牌
   */
  static verifyToken(token) {
    try {
      const secret = process.env.JWT_SECRET;
      return jwt.verify(token, secret);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /**
   * 用户注册
   */
  static async register(userData) {
    const {
      username, email, password, nickname,
    } = userData;

    // 检查用户名是否已存在
    if (await User.isUsernameExists(username)) {
      throw new Error('Username already exists');
    }

    // 检查邮箱是否已存在
    if (await User.isEmailExists(email)) {
      throw new Error('Email already exists');
    }

    // 创建用户
    const user = await User.create({
      username,
      email,
      password,
      nickname,
    });

    // 生成令牌
    const token = this.generateToken({
      userId: user.id,
      username: user.username,
    });

    // 缓存用户信息
    await RedisService.set(`user:${user.id}`, user, 86400); // 24小时

    return {
      user,
      token,
    };
  }

  /**
   * 用户登录
   */
  static async login(credentials) {
    const { username, password } = credentials;

    // 查找用户
    const user = await User.findByUsername(username);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // 检查用户是否激活
    if (!user.is_active) {
      throw new Error('Account is deactivated');
    }

    // 验证密码
    const isPasswordValid = await User.verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // 更新最后登录时间
    await User.updateLastLogin(user.id);

    // 生成令牌
    const token = this.generateToken({
      userId: user.id,
      username: user.username,
    });

    // 缓存用户信息（不包含密码）
    const userInfo = await User.findById(user.id);
    await RedisService.set(`user:${user.id}`, userInfo, 86400); // 24小时

    return {
      user: userInfo,
      token,
    };
  }

  /**
   * 刷新令牌
   */
  static async refreshToken(oldToken) {
    try {
      const decoded = this.verifyToken(oldToken);
      const user = await this.getUserById(decoded.userId);

      if (!user || !user.is_active) {
        throw new Error('User not found or deactivated');
      }

      // 生成新令牌
      const newToken = this.generateToken({
        userId: user.id,
        username: user.username,
      });

      return {
        user,
        token: newToken,
      };
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /**
   * 用户登出
   */
  static async logout(userId, token) {
    try {
      // 将令牌加入黑名单
      const decoded = this.verifyToken(token);
      const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

      if (expiresIn > 0) {
        await RedisService.set(`blacklist:${token}`, true, expiresIn);
      }

      // 清除用户缓存
      await RedisService.del(`user:${userId}`);

      return true;
    } catch (error) {
      console.error('Logout error:', error.message);
      return false;
    }
  }

  /**
   * 检查令牌是否在黑名单中
   */
  static async isTokenBlacklisted(token) {
    return await RedisService.exists(`blacklist:${token}`);
  }

  /**
   * 通过ID获取用户信息
   */
  static async getUserById(userId) {
    // 先从缓存获取
    let user = await RedisService.get(`user:${userId}`);

    if (!user) {
      // 从数据库获取
      user = await User.findById(userId);
      if (user) {
        // 缓存用户信息
        await RedisService.set(`user:${userId}`, user, 86400);
      }
    }

    return user;
  }

  /**
   * 更新用户信息
   */
  static async updateUser(userId, updateData) {
    const user = await User.update(userId, updateData);

    // 更新缓存
    if (user) {
      await RedisService.set(`user:${userId}`, user, 86400);
    }

    return user;
  }

  /**
   * 验证用户权限
   */
  static async hasPermission(userId, permission) {
    const user = await this.getUserById(userId);

    if (!user || !user.is_active) {
      return false;
    }

    // 简单的权限检查
    switch (permission) {
      case 'create_room':
        return true; // 所有用户都可以创建房间
      case 'admin':
        return user.is_premium; // 仅高级用户有管理权限
      default:
        return true;
    }
  }

  /**
   * 生成密码重置令牌
   */
  static async generatePasswordResetToken(email) {
    const user = await User.findByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }

    const resetToken = this.generateToken(
      { userId: user.id, type: 'password_reset' },
      '1h', // 1小时有效期
    );

    // 缓存重置令牌
    await RedisService.set(`reset:${resetToken}`, user.id, 3600);

    return resetToken;
  }

  /**
   * 重置密码
   */
  static async resetPassword(resetToken, newPassword) {
    const userId = await RedisService.get(`reset:${resetToken}`);
    if (!userId) {
      throw new Error('Invalid or expired reset token');
    }

    // 更新密码
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(newPassword, 12);

    await User.update(userId, { password_hash: passwordHash });

    // 删除重置令牌
    await RedisService.del(`reset:${resetToken}`);

    return true;
  }
}

module.exports = AuthService;
