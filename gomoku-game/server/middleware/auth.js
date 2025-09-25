const AuthService = require('../services/AuthService');

/**
 * JWT认证中间件
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required',
      });
    }

    // 检查令牌是否在黑名单中
    if (await AuthService.isTokenBlacklisted(token)) {
      return res.status(401).json({
        success: false,
        error: 'Token has been revoked',
      });
    }

    // 验证令牌
    const decoded = AuthService.verifyToken(token);

    // 获取用户信息
    const user = await AuthService.getUserById(decoded.userId);

    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        error: 'User not found or deactivated',
      });
    }

    // 将用户信息添加到请求对象
    req.user = user;
    req.token = token;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
};

/**
 * 可选的JWT认证中间件（不强制要求token）
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      // 检查令牌是否在黑名单中
      if (!(await AuthService.isTokenBlacklisted(token))) {
        const decoded = AuthService.verifyToken(token);
        const user = await AuthService.getUserById(decoded.userId);

        if (user && user.is_active) {
          req.user = user;
          req.token = token;
        }
      }
    }

    next();
  } catch (error) {
    // 忽略错误，继续处理请求
    next();
  }
};

/**
 * 权限检查中间件
 */
const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const hasPermission = await AuthService.hasPermission(req.user.id, permission);

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Permission check failed',
      });
    }
  };
};

/**
 * 管理员权限中间件
 */
const requireAdmin = requirePermission('admin');

/**
 * Socket.IO认证中间件
 */
const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    // 检查令牌是否在黑名单中
    if (await AuthService.isTokenBlacklisted(token)) {
      return next(new Error('Authentication error: Token revoked'));
    }

    // 验证令牌
    const decoded = AuthService.verifyToken(token);

    // 获取用户信息
    const user = await AuthService.getUserById(decoded.userId);

    if (!user || !user.is_active) {
      return next(new Error('Authentication error: User not found'));
    }

    // 将用户信息添加到socket对象
    socket.user = user;
    socket.token = token;

    next();
  } catch (error) {
    next(new Error('Authentication error: Invalid token'));
  }
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requirePermission,
  requireAdmin,
  socketAuth,
};