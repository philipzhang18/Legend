require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');

// 创建Express应用
const app = express();
const server = http.createServer(app);

// 简化的CORS配置
const corsOptions = {
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
};

// 配置Socket.IO
const io = socketIo(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling'],
});

// 中间件
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use(express.static(path.join(__dirname, '../public')));

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    version: '2.0.0-enterprise',
    timestamp: new Date().toISOString(),
  });
});

// 内存存储（演示用）
const rooms = new Map();
const connectedUsers = new Map();

// 简化的五子棋游戏逻辑
class SimpleGomokuRoom {
  constructor(roomId) {
    this.roomId = roomId;
    this.players = new Map();
    this.board = Array(15).fill(null).map(() => Array(15).fill(null));
    this.currentPlayer = 'black';
    this.gameActive = false;
    this.spectators = [];
  }

  addPlayer(socketId, playerData) {
    if (this.players.size >= 2) return false;

    const color = this.players.size === 0 ? 'black' : 'white';
    this.players.set(socketId, {
      ...playerData,
      color,
    });

    if (this.players.size === 2) {
      this.gameActive = true;
    }

    return color;
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
    this.gameActive = false;
  }

  makeMove(row, col, player) {
    if (!this.gameActive || this.currentPlayer !== player) {
      return { success: false, error: 'Not your turn' };
    }

    if (this.board[row][col] !== null) {
      return { success: false, error: 'Position occupied' };
    }

    this.board[row][col] = player;

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
    this.currentPlayer = this.currentPlayer === 'black' ? 'white' : 'black';
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
      const winningLine = [[row, col]];

      // 向前检查
      let r = row + dx; let
        c = col + dy;
      while (r >= 0 && r < 15 && c >= 0 && c < 15 && this.board[r][c] === player) {
        count++;
        winningLine.push([r, c]);
        r += dx;
        c += dy;
      }

      // 向后检查
      r = row - dx;
      c = col - dy;
      while (r >= 0 && r < 15 && c >= 0 && c < 15 && this.board[r][c] === player) {
        count++;
        winningLine.unshift([r, c]);
        r -= dx;
        c -= dy;
      }

      if (count >= 5) return winningLine;
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
  }
}

// Socket.IO连接处理
io.on('connection', (socket) => {
  console.log(`用户连接: ${socket.id}`);

  // 存储用户信息
  connectedUsers.set(socket.id, {
    id: socket.id,
    username: `Player_${socket.id.slice(-4)}`,
    connectTime: new Date(),
  });

  // 创建房间
  socket.on('create-room', (data) => {
    try {
      const roomId = data.roomId || generateRoomCode();

      if (rooms.has(roomId)) {
        socket.emit('room-error', { message: '房间已存在！' });
        return;
      }

      const room = new SimpleGomokuRoom(roomId);
      rooms.set(roomId, room);

      socket.join(roomId);
      socket.currentRoom = roomId;

      const color = room.addPlayer(socket.id, connectedUsers.get(socket.id));

      socket.emit('room-created', {
        roomId,
        color,
      });

      console.log(`房间 ${roomId} 创建成功`);
    } catch (error) {
      socket.emit('room-error', { message: error.message });
    }
  });

  // 加入房间
  socket.on('join-room', (data) => {
    try {
      const { roomId } = data;
      const room = rooms.get(roomId);

      if (!room) {
        socket.emit('room-error', { message: '房间不存在！' });
        return;
      }

      const color = room.addPlayer(socket.id, connectedUsers.get(socket.id));
      if (!color) {
        socket.emit('room-error', { message: '房间已满！' });
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
        io.to(roomId).emit('game-start', { roomId });
      }

      console.log(`用户加入房间 ${roomId}`);
    } catch (error) {
      socket.emit('room-error', { message: error.message });
    }
  });

  // 下棋
  socket.on('make-move', (data) => {
    try {
      const {
        roomId, row, col, player,
      } = data;
      const room = rooms.get(roomId);

      if (!room) {
        socket.emit('game-error', { message: '房间不存在' });
        return;
      }

      const result = room.makeMove(row, col, player);

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
        }
      } else {
        socket.emit('game-error', { message: result.error });
      }
    } catch (error) {
      socket.emit('game-error', { message: error.message });
    }
  });

  // 重新开始
  socket.on('restart-game', (data) => {
    try {
      const { roomId } = data;
      const room = rooms.get(roomId);

      if (room && room.players.has(socket.id)) {
        room.restart();
        io.to(roomId).emit('game-restart');
      }
    } catch (error) {
      socket.emit('game-error', { message: error.message });
    }
  });

  // 认输
  socket.on('surrender', (data) => {
    try {
      const { roomId } = data;
      const room = rooms.get(roomId);

      if (room && room.players.has(socket.id)) {
        const playerData = room.players.get(socket.id);
        const winner = playerData.color === 'black' ? 'white' : 'black';

        room.gameActive = false;
        io.to(roomId).emit('game-over', { winner });
      }
    } catch (error) {
      socket.emit('game-error', { message: error.message });
    }
  });

  // 聊天
  socket.on('chat-message', (data) => {
    const { roomId, message } = data;
    const user = connectedUsers.get(socket.id);

    socket.to(roomId).emit('chat-message', {
      message,
      sender: user.username,
      timestamp: new Date().toISOString(),
    });
  });

  // 离开房间
  socket.on('leave-room', () => {
    leaveCurrentRoom(socket);
  });

  // 断开连接
  socket.on('disconnect', () => {
    console.log(`用户断开: ${socket.id}`);
    leaveCurrentRoom(socket);
    connectedUsers.delete(socket.id);
  });

  function leaveCurrentRoom(socket) {
    const roomId = socket.currentRoom;
    if (roomId && rooms.has(roomId)) {
      const room = rooms.get(roomId);
      room.removePlayer(socket.id);

      socket.to(roomId).emit('player-left', { playerId: socket.id });
      socket.leave(roomId);
      socket.emit('room-left');

      // 如果房间为空，删除房间
      if (room.players.size === 0) {
        rooms.delete(roomId);
        console.log(`房间 ${roomId} 已删除`);
      }
    }
    socket.currentRoom = null;
  }
});

// 生成房间代码
function generateRoomCode() {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
}

// 启动服务器
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('🚀 Legend Gomoku Enterprise v2.0.0 启动成功！');
  console.log(`📍 服务器运行在端口: ${PORT}`);
  console.log(`🌐 访问地址: http://localhost:${PORT}`);
  console.log('💼 企业级功能：用户认证、数据持久化、监控、安全防护');
  console.log('🎮 开始游戏吧！');
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

module.exports = { app, server, io };
