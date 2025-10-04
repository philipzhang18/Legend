const { metrics } = require('../config/metrics');

// HTTP请求监控中间件
const requestMetrics = (req, res, next) => {
  const start = Date.now();

  // 记录响应完成时间
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;

    // 记录请求计数
    metrics.httpRequestCounter.inc({
      method: req.method,
      route: route,
      status_code: res.statusCode
    });

    // 记录请求持续时间
    metrics.httpRequestDuration.observe(
      {
        method: req.method,
        route: route,
        status_code: res.statusCode
      },
      duration
    );
  });

  next();
};

// WebSocket连接监控
const trackWebSocketConnection = (socket, isConnect) => {
  if (isConnect) {
    metrics.websocketConnections.inc();
  } else {
    metrics.websocketConnections.dec();
  }
};

// 游戏房间监控
const trackRoomStatus = (status, delta) => {
  metrics.activeRooms.inc({ status }, delta);
};

// 游戏完成监控
const trackGameCompletion = (result, duration, moveCount) => {
  // 记录游戏数量
  metrics.gamesPlayedCounter.inc({ result });

  // 记录游戏时长
  if (duration) {
    metrics.gameDuration.observe({ result }, duration);
  }

  // 记录棋局步数
  if (moveCount) {
    metrics.movesPerGame.observe(moveCount);
  }
};

// 玩家统计监控
const trackPlayerCount = (type, count) => {
  metrics.totalPlayers.set({ type }, count);
};

// Redis操作监控
const trackRedisOperation = (operation, status) => {
  metrics.redisOperations.inc({ operation, status });
};

// 数据库查询监控
const trackDbQuery = async (operation, table, queryFn) => {
  const start = Date.now();
  let status = 'success';

  try {
    const result = await queryFn();
    return result;
  } catch (error) {
    status = 'error';
    throw error;
  } finally {
    const duration = (Date.now() - start) / 1000;

    metrics.dbQueries.inc({ operation, table, status });
    metrics.dbQueryDuration.observe({ operation, table }, duration);
  }
};

// 错误监控
const trackError = (errorType, severity = 'error') => {
  metrics.errorCounter.inc({ type: errorType, severity });
};

// 认证监控
const trackAuth = (type, status) => {
  metrics.authCounter.inc({ type, status });
};

// 聊天消息监控
const trackChatMessage = () => {
  metrics.chatMessages.inc();
};

module.exports = {
  requestMetrics,
  trackWebSocketConnection,
  trackRoomStatus,
  trackGameCompletion,
  trackPlayerCount,
  trackRedisOperation,
  trackDbQuery,
  trackError,
  trackAuth,
  trackChatMessage
};
