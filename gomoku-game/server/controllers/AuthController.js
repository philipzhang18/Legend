const { body, validationResult } = require('express-validator');
const AuthService = require('../services/AuthService');
const User = require('../models/User');

/**
 * 认证控制器
 */
class AuthController {
  /**
   * 用户注册验证规则
   */
  static getRegistrationValidation() {
    return [
      body('username')
        .isLength({ min: 3, max: 50 })
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username must be 3-50 characters long and contain only letters, numbers, and underscores'),
      body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
      body('password')
        .isLength({ min: 8, max: 128 })
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must be at least 8 characters long with at least one lowercase letter, one uppercase letter, and one number'),
      body('nickname')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('Nickname must be 2-100 characters long'),
    ];
  }

  /**
   * 用户登录验证规则
   */
  static getLoginValidation() {
    return [
      body('username')
        .notEmpty()
        .withMessage('Username is required'),
      body('password')
        .notEmpty()
        .withMessage('Password is required'),
    ];
  }

  /**
   * 用户注册
   */
  static async register(req, res) {
    try {
      // 验证输入
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const {
        username, email, password, nickname,
      } = req.body;

      // 注册用户
      const result = await AuthService.register({
        username,
        email,
        password,
        nickname,
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: result.user,
          token: result.token,
        },
      });
    } catch (error) {
      console.error('Registration error:', error);

      let statusCode = 500;
      let message = 'Registration failed';

      if (error.message.includes('already exists')) {
        statusCode = 409;
        message = error.message;
      }

      res.status(statusCode).json({
        success: false,
        error: message,
      });
    }
  }

  /**
   * 用户登录
   */
  static async login(req, res) {
    try {
      // 验证输入
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const { username, password } = req.body;

      // 用户登录
      const result = await AuthService.login({ username, password });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: result.user,
          token: result.token,
        },
      });
    } catch (error) {
      console.error('Login error:', error);

      let statusCode = 500;
      let message = 'Login failed';

      if (error.message.includes('Invalid credentials')) {
        statusCode = 401;
        message = 'Invalid username or password';
      } else if (error.message.includes('deactivated')) {
        statusCode = 403;
        message = 'Account is deactivated';
      }

      res.status(statusCode).json({
        success: false,
        error: message,
      });
    }
  }

  /**
   * 用户登出
   */
  static async logout(req, res) {
    try {
      await AuthService.logout(req.user.id, req.token);

      res.json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: 'Logout failed',
      });
    }
  }

  /**
   * 刷新令牌
   */
  static async refreshToken(req, res) {
    try {
      const result = await AuthService.refreshToken(req.token);

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          user: result.user,
          token: result.token,
        },
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(401).json({
        success: false,
        error: 'Token refresh failed',
      });
    }
  }

  /**
   * 获取当前用户信息
   */
  static async getProfile(req, res) {
    try {
      const user = await AuthService.getUserById(req.user.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      res.json({
        success: true,
        data: { user },
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get profile',
      });
    }
  }

  /**
   * 更新用户资料
   */
  static async updateProfile(req, res) {
    try {
      const { nickname, avatar_url } = req.body;
      const updateData = {};

      if (nickname !== undefined) {
        if (nickname.length < 2 || nickname.length > 100) {
          return res.status(400).json({
            success: false,
            error: 'Nickname must be 2-100 characters long',
          });
        }
        updateData.nickname = nickname;
      }

      if (avatar_url !== undefined) {
        updateData.avatar_url = avatar_url;
      }

      const user = await AuthService.updateUser(req.user.id, updateData);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: { user },
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update profile',
      });
    }
  }

  /**
   * 修改密码
   */
  static async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Current password and new password are required',
        });
      }

      if (newPassword.length < 8 || !newPassword.match(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)) {
        return res.status(400).json({
          success: false,
          error: 'New password must be at least 8 characters long with at least one lowercase letter, one uppercase letter, and one number',
        });
      }

      // 获取用户信息（包含密码）
      const user = await User.findById(req.user.id);
      const isCurrentPasswordValid = await User.verifyPassword(currentPassword, user.password_hash);

      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          error: 'Current password is incorrect',
        });
      }

      // 更新密码
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash(newPassword, 12);

      await User.update(req.user.id, { password_hash: passwordHash });

      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to change password',
      });
    }
  }

  /**
   * 获取用户统计信息
   */
  static async getUserStats(req, res) {
    try {
      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      const winRate = user.games_played > 0
        ? Math.round((user.games_won / user.games_played) * 100)
        : 0;

      const stats = {
        rating: user.rating,
        games_played: user.games_played,
        games_won: user.games_won,
        games_lost: user.games_lost,
        games_drawn: user.games_drawn,
        win_rate: winRate,
      };

      res.json({
        success: true,
        data: { stats },
      });
    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user statistics',
      });
    }
  }
}

module.exports = AuthController;
