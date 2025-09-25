const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

// 创建Express应用
const app = express();
const server = http.createServer(app);

// 配置Socket.IO
const io = socketIo(server, {
  cors: {
    origin: true, // 允许所有域名访问
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// 中间件
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    version: '2.0.0-enterprise',
    timestamp: new Date().toISOString(),
    features: [
      '✅ 企业级架构',
      '✅ WebSocket实时通信',
      '✅ 房间管理系统',
      '✅ 完整游戏逻辑',
      '✅ 响应式界面',
    ],
  });
});

// 内存存储
const rooms = new Map();
const users = new Map();

// 五子棋游戏逻辑
class GomokuRoom {
  constructor(roomId) {
    this.roomId = roomId;
    this.players = new Map();
    this.board = Array(15).fill(null).map(() => Array(15).fill(null));
    this.currentPlayer = 'black';
    this.gameActive = false;
    this.moves = [];
  }

  addPlayer(socketId) {
    if (this.players.size >= 2) return null;

    const color = this.players.size === 0 ? 'black' : 'white';
    this.players.set(socketId, { color, id: socketId });

    if (this.players.size === 2) {
      this.gameActive = true;
    }

    return color;
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
    if (this.players.size < 2) {
      this.gameActive = false;
    }
  }

  makeMove(row, col, player, socketId) {
    // 验证
    if (!this.gameActive) return { success: false, error: '游戏未开始' };
    if (this.currentPlayer !== player) return { success: false, error: '不是您的回合' };
    if (this.board[row][col] !== null) return { success: false, error: '位置已被占用' };

    const playerData = this.players.get(socketId);
    if (!playerData || playerData.color !== player) {
      return { success: false, error: '玩家验证失败' };
    }

    // 下棋
    this.board[row][col] = player;
    this.moves.push({
      row, col, player, timestamp: Date.now(),
    });

    // 检查胜利
    const winningLine = this.checkWin(row, col, player);
    if (winningLine) {
      this.gameActive = false;
      return {
        success: true,
        gameOver: true,
        winner: player,
        winningLine,
        nextPlayer: null,
      };
    }

    // 检查平局
    if (this.isBoardFull()) {
      this.gameActive = false;
      return {
        success: true,
        gameOver: true,
        winner: null,
        nextPlayer: null,
      };
    }

    // 切换玩家
    this.currentPlayer = player === 'black' ? 'white' : 'black';
    return {
      success: true,
      gameOver: false,
      nextPlayer: this.currentPlayer,
    };
  }

  checkWin(row, col, player) {
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];

    for (const [dx, dy] of directions) {
      let count = 1;
      const line = [[row, col]];

      // 正向
      let r = row + dx; let
        c = col + dy;
      while (r >= 0 && r < 15 && c >= 0 && c < 15 && this.board[r][c] === player) {
        count++;
        line.push([r, c]);
        r += dx;
        c += dy;
      }

      // 反向
      r = row - dx;
      c = col - dy;
      while (r >= 0 && r < 15 && c >= 0 && c < 15 && this.board[r][c] === player) {
        count++;
        line.unshift([r, c]);
        r -= dx;
        c -= dy;
      }

      if (count >= 5) return line;
    }
    return null;
  }

  isBoardFull() {
    return this.board.every((row) => row.every((cell) => cell !== null));
  }

  restart() {
    this.board = Array(15).fill(null).map(() => Array(15).fill(null));
    this.currentPlayer = 'black';
    this.gameActive = this.players.size === 2;
    this.moves = [];
  }
}

// Socket.IO事件处理
io.on('connection', (socket) => {
  console.log(`🔗 玩家连接: ${socket.id}`);

  // 从auth中获取用户名，如果没有则使用默认
  let username = `玩家${socket.id.slice(-4)}`;
  if (socket.handshake.auth && socket.handshake.auth.token) {
    try {
      const tokenData = JSON.parse(atob(socket.handshake.auth.token));
      if (tokenData.username) {
        username = tokenData.username;
      }
    } catch (e) {
      console.log('Token解析失败，使用默认用户名');
    }
  }

  users.set(socket.id, {
    id: socket.id,
    username: username,
    joinTime: new Date(),
  });

  console.log(`👤 用户名: ${username}`);

  // 更新用户名
  socket.on('update-username', (data) => {
    if (data.username && data.username.trim().length >= 2) {
      const user = users.get(socket.id);
      if (user) {
        user.username = data.username.trim();
        users.set(socket.id, user);
        console.log(`🔄 用户名更新: ${socket.id} -> ${user.username}`);
        socket.emit('username-updated', { username: user.username });
      }
    }
  });

  // 创建房间
  socket.on('create-room', (data) => {
    try {
      const roomId = data.roomId || generateRoomId();

      if (rooms.has(roomId)) {
        socket.emit('room-error', { message: '房间已存在' });
        return;
      }

      const room = new GomokuRoom(roomId);
      rooms.set(roomId, room);

      socket.join(roomId);
      socket.currentRoom = roomId;

      const color = room.addPlayer(socket.id);

      socket.emit('room-created', {
        roomId,
        color,
      });

      console.log(`🏠 房间创建: ${roomId} (${socket.id})`);
    } catch (error) {
      socket.emit('room-error', { message: '创建房间失败' });
    }
  });

  // 加入房间
  socket.on('join-room', (data) => {
    try {
      const { roomId } = data;
      const room = rooms.get(roomId);

      if (!room) {
        socket.emit('room-error', { message: '房间不存在' });
        return;
      }

      const color = room.addPlayer(socket.id);
      if (!color) {
        socket.emit('room-error', { message: '房间已满' });
        return;
      }

      socket.join(roomId);
      socket.currentRoom = roomId;

      socket.emit('room-joined', {
        roomId,
        color,
      });

      socket.to(roomId).emit('player-joined', {
        color,
        playerCount: room.players.size,
      });

      if (room.players.size === 2) {
        io.to(roomId).emit('game-start');
        console.log(`🎮 游戏开始: ${roomId}`);
      }
    } catch (error) {
      socket.emit('room-error', { message: '加入房间失败' });
    }
  });

  // 下棋
  socket.on('make-move', (data) => {
    try {
      const {
        roomId, row, col, player,
      } = data;
      const room = rooms.get(roomId);

      if (!room) return;

      const result = room.makeMove(row, col, player, socket.id);

      if (result.success) {
        io.to(roomId).emit('move-made', {
          row,
          col,
          player,
          nextPlayer: result.nextPlayer,
        });

        if (result.gameOver) {
          io.to(roomId).emit('game-over', {
            winner: result.winner,
            winningLine: result.winningLine,
          });
          console.log(`🏆 游戏结束: ${roomId}, 获胜者: ${result.winner || '平局'}`);
        }
      }
    } catch (error) {
      console.error('下棋错误:', error);
    }
  });

  // 重新开始
  socket.on('restart-game', (data) => {
    const { roomId } = data;
    const room = rooms.get(roomId);

    if (room && room.players.has(socket.id)) {
      room.restart();
      io.to(roomId).emit('game-restart');
      console.log(`🔄 游戏重启: ${roomId}`);
    }
  });

  // 认输
  socket.on('surrender', (data) => {
    const { roomId } = data;
    const room = rooms.get(roomId);

    if (room && room.players.has(socket.id)) {
      const playerData = room.players.get(socket.id);
      const winner = playerData.color === 'black' ? 'white' : 'black';

      room.gameActive = false;
      io.to(roomId).emit('game-over', { winner });
      console.log(`🏳️ 玩家认输: ${roomId}, 获胜者: ${winner}`);
    }
  });

  // 聊天
  socket.on('chat-message', (data) => {
    const { roomId, message } = data;
    const user = users.get(socket.id);

    if (user && message.trim()) {
      socket.to(roomId).emit('chat-message', {
        message: message.trim(),
        sender: user.username,
        timestamp: new Date().toISOString(), // 添加时间戳
      });
    }
  });

  // 离开房间
  socket.on('leave-room', () => {
    handleLeaveRoom(socket);
  });

  // 断开连接
  socket.on('disconnect', () => {
    console.log(`❌ 玩家断开: ${socket.id}`);
    handleLeaveRoom(socket);
    users.delete(socket.id);
  });

  function handleLeaveRoom(socket) {
    const roomId = socket.currentRoom;
    if (roomId && rooms.has(roomId)) {
      const room = rooms.get(roomId);
      room.removePlayer(socket.id);

      socket.to(roomId).emit('player-left');
      socket.leave(roomId);
      socket.emit('room-left');

      if (room.players.size === 0) {
        rooms.delete(roomId);
        console.log(`🗑️ 房间删除: ${roomId}`);
      }
    }
    socket.currentRoom = null;
  }
});

function generateRoomId() {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
}

// 启动服务器
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // 监听所有网络接口
server.listen(PORT, HOST, () => {
  console.log('');
  console.log('🚀 =================================================');
  console.log('🎮 Legend Gomoku - 商业级企业版 v2.0.0');
  console.log('🚀 =================================================');
  console.log(`📍 服务器启动成功 - 端口: ${PORT}`);
  console.log(`🌐 本地访问: http://localhost:${PORT}`);
  console.log(`🌐 网络访问: http://192.168.3.118:${PORT}`);
  console.log(`🌐 网络访问: http://100.64.138.78:${PORT}`);
  console.log('');
  console.log('📋 企业级特性:');
  console.log('  ✅ 实时WebSocket通信');
  console.log('  ✅ 多房间管理系统');
  console.log('  ✅ 完整游戏逻辑');
  console.log('  ✅ 用户会话管理');
  console.log('  ✅ 错误处理机制');
  console.log('  ✅ 健康检查端点');
  console.log('  ✅ 响应式界面设计');
  console.log('  ✅ 跨网络远程访问');
  console.log('');
  console.log('🎯 准备就绪，开始对战吧！');
  console.log('=================================================');
});

// 定期清理空房间
setInterval(() => {
  let cleaned = 0;
  for (const [roomId, room] of rooms.entries()) {
    if (room.players.size === 0) {
      rooms.delete(roomId);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`🧹 清理了 ${cleaned} 个空房间`);
  }
}, 300000); // 5分钟清理一次

module.exports = server;
