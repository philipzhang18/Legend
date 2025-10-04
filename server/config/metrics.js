const client = require('prom-client');

// 创建一个注册表
const register = new client.Registry();

// 添加默认指标（CPU、内存等）
client.collectDefaultMetrics({
  register,
  prefix: 'gomoku_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
});

// 自定义指标

// HTTP请求计数器
const httpRequestCounter = new client.Counter({
  name: 'gomoku_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

// HTTP请求持续时间直方图
const httpRequestDuration = new client.Histogram({
  name: 'gomoku_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register]
});

// WebSocket连接数
const websocketConnections = new client.Gauge({
  name: 'gomoku_websocket_connections',
  help: 'Current number of WebSocket connections',
  registers: [register]
});

// 活跃游戏房间数
const activeRooms = new client.Gauge({
  name: 'gomoku_active_rooms',
  help: 'Current number of active game rooms',
  labelNames: ['status'],
  registers: [register]
});

// 游戏总数计数器
const gamesPlayedCounter = new client.Counter({
  name: 'gomoku_games_played_total',
  help: 'Total number of games played',
  labelNames: ['result'],
  registers: [register]
});

// 玩家总数
const totalPlayers = new client.Gauge({
  name: 'gomoku_total_players',
  help: 'Total number of registered players',
  labelNames: ['type'],
  registers: [register]
});

// 游戏时长直方图
const gameDuration = new client.Histogram({
  name: 'gomoku_game_duration_seconds',
  help: 'Duration of games in seconds',
  labelNames: ['result'],
  buckets: [60, 300, 600, 1200, 1800, 3600],
  registers: [register]
});

// 棋局步数直方图
const movesPerGame = new client.Histogram({
  name: 'gomoku_moves_per_game',
  help: 'Number of moves per game',
  buckets: [10, 20, 30, 50, 100, 150, 200],
  registers: [register]
});

// Redis操作计数器
const redisOperations = new client.Counter({
  name: 'gomoku_redis_operations_total',
  help: 'Total number of Redis operations',
  labelNames: ['operation', 'status'],
  registers: [register]
});

// 数据库查询计数器
const dbQueries = new client.Counter({
  name: 'gomoku_db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'table', 'status'],
  registers: [register]
});

// 数据库查询持续时间
const dbQueryDuration = new client.Histogram({
  name: 'gomoku_db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register]
});

// 错误计数器
const errorCounter = new client.Counter({
  name: 'gomoku_errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'severity'],
  registers: [register]
});

// 用户认证计数器
const authCounter = new client.Counter({
  name: 'gomoku_auth_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['type', 'status'],
  registers: [register]
});

// 聊天消息计数器
const chatMessages = new client.Counter({
  name: 'gomoku_chat_messages_total',
  help: 'Total number of chat messages sent',
  registers: [register]
});

module.exports = {
  register,
  metrics: {
    httpRequestCounter,
    httpRequestDuration,
    websocketConnections,
    activeRooms,
    gamesPlayedCounter,
    totalPlayers,
    gameDuration,
    movesPerGame,
    redisOperations,
    dbQueries,
    dbQueryDuration,
    errorCounter,
    authCounter,
    chatMessages
  }
};
