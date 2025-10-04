require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const winston = require('winston');

// 导入配置和服务
const { redisClient } = require('./config/redis');
const authRoutes = require('./routes/auth');
const { socketAuth } = require('./middleware/auth');
const AuthService = require('./services/AuthService');
const { register: metricsRegister } = require('./config/metrics');
const { requestMetrics, trackWebSocketConnection } = require('./middleware/metrics');

// 创建Express应用
const app = express();
const server = http.createServer(app);

// 配置CORS
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? ['https://yourdomain.com']
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  optionsSuccessStatus: 200,
};

// 配置Socket.IO
const io = socketIo(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling'],
});

// 配置日志
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'legend-gomoku' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// 在开发环境下也输出到控制台
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// 安全中间件
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS中间件
app.use(cors(corsOptions));

// Prometheus指标收集中间件
app.use(requestMetrics);

// 速率限制
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15分钟
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 限制每个IP最多100个请求
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// 解析请求体
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session配置
app.use(session({
  store: new RedisStore({
    client: redisClient,
    prefix: 'sess:',
  }),
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24小时
  },
}));

// 静态文件服务
app.use(express.static(path.join(__dirname, '../public')));

// API路由
app.use('/api/auth', authRoutes);
const gameRoutes = require('./routes/game');
app.use('/api/game', gameRoutes);

// Prometheus指标端点
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', metricsRegister.contentType);
    const metrics = await metricsRegister.metrics();
    res.end(metrics);
  } catch (error) {
    logger.error('Failed to collect metrics:', error);
    res.status(500).send('Failed to collect metrics');
  }
});

// 健康检查端点
app.get('/health', async (req, res) => {
  const health = {
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    services: {
      redis: 'unknown',
      database: 'unknown'
    }
  };

  // 检查Redis连接
  try {
    await redisClient.ping();
    health.services.redis = 'healthy';
  } catch (error) {
    health.services.redis = 'unhealthy';
    health.status = 'degraded';
    logger.error('Redis health check failed:', error);
  }

  // 检查数据库连接
  try {
    const { db } = require('./config/database');
    await db.raw('SELECT 1');
    health.services.database = 'healthy';
  } catch (error) {
    health.services.database = 'unhealthy';
    health.status = 'degraded';
    logger.error('Database health check failed:', error);
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

// 错误处理中间件
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);

  res.status(error.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : error.message,
  });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// 导入游戏逻辑模型和服务
const GameRoom = require('./models/GameRoom');
const GameService = require('./services/GameService');

// Socket.IO认证
io.use(socketAuth);

// Socket.IO连接处理
io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.user.username} (${socket.id})`);
  trackWebSocketConnection(socket, true);

  // 加入用户到在线用户列表
  socket.join(`user:${socket.user.id}`);

  // 创建房间
  socket.on('create-room', async (data) => {
    try {
      const room = await GameService.createRoom(socket.user.id, data);
      socket.join(room.room_code);

      socket.emit('room-created', {
        roomId: room.room_code,
        color: 'black',
      });

      logger.info(`Room created: ${room.room_code} by user ${socket.user.username}`);
    } catch (error) {
      socket.emit('room-error', { message: error.message });
      logger.error(`Create room error: ${error.message}`);
    }
  });

  // 加入房间
  socket.on('join-room', async (data) => {
    try {
      const result = await GameService.joinRoom(socket.user.id, data.roomId, data.asSpectator);

      socket.join(data.roomId);

      if (data.asSpectator) {
        // 观战者加入
        socket.emit('spectator-joined', {
          roomId: data.roomId,
          roomInfo: result.roomInfo
        });

        // 通知房间内其他人有观战者加入
        socket.to(data.roomId).emit('spectator-entered', {
          spectatorId: socket.user.id,
          spectatorName: socket.user.username
        });
      } else {
        // 玩家加入
        socket.emit('room-joined', {
          roomId: data.roomId,
          color: result.color,
        });

        // 通知房间内其他用户
        socket.to(data.roomId).emit('player-joined', {
          color: result.color,
          playerCount: result.playerCount,
        });

        // 如果房间满员，开始游戏
        if (result.playerCount === 2) {
          io.to(data.roomId).emit('game-start', result.roomInfo);
        }
      }

      logger.info(`User ${socket.user.username} joined room ${data.roomId} as ${data.asSpectator ? 'spectator' : 'player'}`);
    } catch (error) {
      socket.emit('room-error', { message: error.message });
      logger.error(`Join room error: ${error.message}`);
    }
  });

  // 离开房间
  socket.on('leave-room', async (data) => {
    try {
      await GameService.leaveRoom(socket.user.id, data.roomId);

      socket.leave(data.roomId);
      socket.emit('room-left');

      // 通知房间内其他用户
      socket.to(data.roomId).emit('player-left', {
        userId: socket.user.id,
      });

      logger.info(`User ${socket.user.username} left room ${data.roomId}`);
    } catch (error) {
      socket.emit('room-error', { message: error.message });
      logger.error(`Leave room error: ${error.message}`);
    }
  });

  // 下棋
  socket.on('make-move', async (data) => {
    try {
      const result = await GameService.makeMove(
        socket.user.id,
        data.roomId,
        data.row,
        data.col,
        data.player
      );

      if (result.success) {
        // 广播移动结果
        io.to(data.roomId).emit('move-made', {
          row: data.row,
          col: data.col,
          player: data.player,
          nextPlayer: result.nextPlayer,
        });

        // 如果游戏结束
        if (result.gameOver) {
          io.to(data.roomId).emit('game-over', {
            winner: result.winner,
            winningLine: result.winningLine,
          });

          // 记录游戏结果
          await GameService.recordGameResult(data.roomId, result);
          logger.info(`Game finished in room ${data.roomId}, winner: ${result.winner}`);
        }
      }
    } catch (error) {
      socket.emit('game-error', { message: error.message });
      logger.error(`Make move error: ${error.message}`);
    }
  });

  // 重新开始游戏
  socket.on('restart-game', async (data) => {
    try {
      await GameService.restartGame(socket.user.id, data.roomId);
      io.to(data.roomId).emit('game-restart');

      logger.info(`Game restarted in room ${data.roomId} by user ${socket.user.username}`);
    } catch (error) {
      socket.emit('game-error', { message: error.message });
      logger.error(`Restart game error: ${error.message}`);
    }
  });

  // 认输
  socket.on('surrender', async (data) => {
    try {
      const result = await GameService.surrender(socket.user.id, data.roomId);

      io.to(data.roomId).emit('game-over', {
        winner: result.winner,
        winningLine: null,
      });

      // 记录游戏结果
      await GameService.recordGameResult(data.roomId, result);
      logger.info(`User ${socket.user.username} surrendered in room ${data.roomId}`);
    } catch (error) {
      socket.emit('game-error', { message: error.message });
      logger.error(`Surrender error: ${error.message}`);
    }
  });

  // 聊天消息
  socket.on('chat-message', async (data) => {
    try {
      const message = await GameService.saveChatMessage(
        socket.user.id,
        data.roomId,
        data.message
      );

      // 广播聊天消息
      socket.to(data.roomId).emit('chat-message', {
        message: data.message,
        sender: socket.user.nickname || socket.user.username,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      socket.emit('chat-error', { message: error.message });
      logger.error(`Chat message error: ${error.message}`);
    }
  });

  // 更新用户名
  socket.on('update-username', async (data) => {
    try {
      const newUsername = data.username?.trim();

      if (!newUsername || newUsername.length < 2) {
        socket.emit('username-error', { message: 'Username must be at least 2 characters' });
        return;
      }

      // 更新socket用户对象中的用户名
      socket.user.username = newUsername;
      socket.user.nickname = newUsername;

      // 如果是游客，更新token
      if (socket.user.is_guest) {
        const guestData = {
          id: socket.user.id,
          username: newUsername,
          type: 'guest'
        };
        const tokenData = JSON.stringify(guestData);

        // 编码为base64（支持中文）
        const encoded = encodeURIComponent(tokenData).replace(/%([0-9A-F]{2})/g,
          function toSolidBytes(match, p1) {
            return String.fromCharCode('0x' + p1);
          });
        const newToken = Buffer.from(encoded, 'binary').toString('base64');
        socket.token = newToken;
      } else {
        // 如果是注册用户，更新数据库
        await AuthService.updateUser(socket.user.id, { nickname: newUsername });
      }

      socket.emit('username-updated', {
        username: newUsername,
        token: socket.token
      });

      logger.info(`User ${socket.user.id} updated username to ${newUsername}`);
    } catch (error) {
      socket.emit('username-error', { message: error.message });
      logger.error(`Update username error: ${error.message}`);
    }
  });

  // 获取房间列表
  socket.on('get-room-list', async (data) => {
    try {
      const rooms = await GameService.getRoomList(data?.limit || 20);
      socket.emit('room-list', { rooms });
    } catch (error) {
      socket.emit('room-error', { message: error.message });
      logger.error(`Get room list error: ${error.message}`);
    }
  });

  // 获取房间详情
  socket.on('get-room-info', async (data) => {
    try {
      const roomInfo = await GameService.getRoomInfo(data.roomId);
      socket.emit('room-info', { roomInfo });
    } catch (error) {
      socket.emit('room-error', { message: error.message });
      logger.error(`Get room info error: ${error.message}`);
    }
  });

  // 断开连接
  socket.on('disconnect', () => {
    logger.info(`User disconnected: ${socket.user.username} (${socket.id})`);
    trackWebSocketConnection(socket, false);
    socket.leave(`user:${socket.user.id}`);
  });
});

// 启动服务器
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info(`Legend Gomoku Enterprise server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Visit http://localhost:${PORT} to play the game`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

module.exports = { app, server, io };