const GameRoom = require('../models/GameRoom');
const User = require('../models/User');
const { RedisService } = require('../config/redis');

/**
 * 游戏服务类 - 处理游戏逻辑
 */
class GameService {
  /**
   * 创建游戏房间
   */
  static async createRoom(userId, roomData) {
    // 检查用户是否已有活跃房间
    const existingRoom = await GameRoom.getUserActiveRoom(userId);
    if (existingRoom) {
      throw new Error('You already have an active room');
    }

    let creatorUsername = 'Guest';

    // 如果有数据库连接，尝试获取用户信息
    const knex = require('../config/database');
    if (knex.isConnected && knex.isConnected()) {
      try {
        const user = await User.findById(userId);
        if (user) {
          creatorUsername = user.username;
        }
      } catch (err) {
        // 忽略错误，使用Guest作为用户名
        console.log('Failed to get user info, using Guest');
      }
    }

    const room = await GameRoom.create({
      creatorId: userId,
      creatorUsername: creatorUsername,
      ...roomData,
    });

    // 设置房间状态到Redis
    await RedisService.hset(`room:${room.room_code}`, 'gameState', {
      board: Array(15).fill(null).map(() => Array(15).fill(null)),
      currentPlayer: 'black',
      gameActive: false,
      players: {
        black: userId,
        white: null,
      },
      spectators: [],
    });

    // 将创建者设为黑棋玩家
    await GameRoom.update(room.id, { black_player_id: userId });

    return room;
  }

  /**
   * 加入游戏房间
   */
  static async joinRoom(userId, roomCode, asSpectator = false) {
    const room = await GameRoom.findByRoomCode(roomCode);
    if (!room) {
      throw new Error('房间不存在');
    }

    if (room.status === 'finished') {
      throw new Error('游戏已结束');
    }

    // 如果作为观战者加入
    if (asSpectator) {
      const gameState = await RedisService.hget(`room:${roomCode}`, 'gameState');
      if (!gameState.spectators) {
        gameState.spectators = [];
      }

      // 添加到观战者列表
      if (!gameState.spectators.includes(userId)) {
        gameState.spectators.push(userId);
        await RedisService.hset(`room:${roomCode}`, 'gameState', gameState);
      }

      return {
        roomInfo: {
          roomCode,
          board: gameState.board,
          currentPlayer: gameState.currentPlayer,
          gameActive: gameState.gameActive,
          players: gameState.players,
          spectatorCount: gameState.spectators.length
        }
      };
    }

    // 作为玩家加入
    // 检查房间是否已满
    if (room.black_player_id && room.white_player_id) {
      throw new Error('房间已满');
    }

    // 检查用户是否已在房间中
    if (room.black_player_id === userId || room.white_player_id === userId) {
      throw new Error('您已在此房间中');
    }

    let color; let
      playerCount;

    if (!room.black_player_id) {
      await GameRoom.update(room.id, { black_player_id: userId });
      color = 'black';
    } else if (!room.white_player_id) {
      await GameRoom.update(room.id, { white_player_id: userId });
      color = 'white';
      playerCount = 2;

      // 开始游戏
      await GameRoom.update(room.id, { status: 'playing' });
    }

    // 更新Redis中的游戏状态
    const gameState = await RedisService.hget(`room:${roomCode}`, 'gameState');
    if (gameState) {
      gameState.players[color] = userId;
      gameState.gameActive = playerCount === 2;
      await RedisService.hset(`room:${roomCode}`, 'gameState', gameState);
    }

    return {
      color,
      playerCount: playerCount || 1,
      roomInfo: await GameRoom.findByRoomCode(roomCode),
    };
  }

  /**
   * 离开游戏房间
   */
  static async leaveRoom(userId, roomCode) {
    const room = await GameRoom.findByRoomCode(roomCode);
    if (!room) {
      throw new Error('Room not found');
    }

    const updates = {};
    let playerLeft = false;

    if (room.black_player_id === userId) {
      updates.black_player_id = null;
      playerLeft = true;
    } else if (room.white_player_id === userId) {
      updates.white_player_id = null;
      playerLeft = true;
    }

    if (playerLeft) {
      // 如果游戏正在进行，标记为放弃
      if (room.status === 'playing') {
        updates.status = 'abandoned';
      }

      await GameRoom.update(room.id, updates);

      // 更新Redis状态
      await RedisService.del(`room:${roomCode}`);
    }

    return true;
  }

  /**
   * 下棋
   */
  static async makeMove(userId, roomCode, row, col, player) {
    const gameState = await RedisService.hget(`room:${roomCode}`, 'gameState');
    if (!gameState) {
      throw new Error('Game state not found');
    }

    // 验证玩家权限
    if (gameState.players[player] !== userId) {
      throw new Error('Not your turn');
    }

    // 验证轮次
    if (gameState.currentPlayer !== player) {
      throw new Error('Not your turn');
    }

    // 验证游戏状态
    if (!gameState.gameActive) {
      throw new Error('Game is not active');
    }

    // 验证位置
    if (row < 0 || row >= 15 || col < 0 || col >= 15) {
      throw new Error('Invalid position');
    }

    if (gameState.board[row][col] !== null) {
      throw new Error('Position already occupied');
    }

    // 下棋
    gameState.board[row][col] = player;

    // 检查胜利条件
    const winningLine = this.checkWin(gameState.board, row, col, player);
    let gameOver = false;
    let winner = null;

    if (winningLine) {
      gameOver = true;
      winner = player;
      gameState.gameActive = false;
    } else if (this.isBoardFull(gameState.board)) {
      gameOver = true;
      gameState.gameActive = false;
    } else {
      // 切换玩家
      gameState.currentPlayer = player === 'black' ? 'white' : 'black';
    }

    // 保存游戏状态
    await RedisService.hset(`room:${roomCode}`, 'gameState', gameState);

    return {
      success: true,
      gameOver,
      winner,
      winningLine,
      nextPlayer: gameState.currentPlayer,
    };
  }

  /**
   * 重新开始游戏
   */
  static async restartGame(userId, roomCode) {
    const room = await GameRoom.findByRoomCode(roomCode);
    if (!room) {
      throw new Error('Room not found');
    }

    // 检查权限（只有房间内的玩家可以重启）
    if (room.black_player_id !== userId && room.white_player_id !== userId) {
      throw new Error('Permission denied');
    }

    // 重置游戏状态
    const gameState = {
      board: Array(15).fill(null).map(() => Array(15).fill(null)),
      currentPlayer: 'black',
      gameActive: true,
      players: {
        black: room.black_player_id,
        white: room.white_player_id,
      },
    };

    await RedisService.hset(`room:${roomCode}`, 'gameState', gameState);
    await GameRoom.update(room.id, { status: 'playing' });

    return true;
  }

  /**
   * 认输
   */
  static async surrender(userId, roomCode) {
    const room = await GameRoom.findByRoomCode(roomCode);
    if (!room) {
      throw new Error('Room not found');
    }

    let winner;
    if (room.black_player_id === userId) {
      winner = 'white';
    } else if (room.white_player_id === userId) {
      winner = 'black';
    } else {
      throw new Error('You are not a player in this room');
    }

    await GameRoom.update(room.id, { status: 'finished' });

    return { winner };
  }

  /**
   * 保存聊天消息
   */
  static async saveChatMessage(userId, roomCode, message) {
    const room = await GameRoom.findByRoomCode(roomCode);
    if (!room) {
      throw new Error('Room not found');
    }

    // 这里可以保存到数据库，现在先简单返回
    return {
      userId,
      message,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 记录游戏结果
   */
  static async recordGameResult(roomCode, result) {
    const room = await GameRoom.findByRoomCode(roomCode);
    if (!room || !result.winner) {
      return;
    }

    // 更新玩家统计（仅在数据库可用时）
    const knex = require('../config/database');
    if (knex.isConnected && knex.isConnected()) {
      try {
        const blackPlayerId = room.black_player_id;
        const whitePlayerId = room.white_player_id;

        if (result.winner === 'black') {
          await User.updateStats(blackPlayerId, 'win');
          await User.updateStats(whitePlayerId, 'loss');
        } else if (result.winner === 'white') {
          await User.updateStats(whitePlayerId, 'win');
          await User.updateStats(blackPlayerId, 'loss');
        } else {
          await User.updateStats(blackPlayerId, 'draw');
          await User.updateStats(whitePlayerId, 'draw');
        }
      } catch (err) {
        console.log('Failed to update user stats:', err.message);
      }
    }

    await GameRoom.update(room.id, { status: 'finished' });
  }

  /**
   * 检查胜利条件
   */
  static checkWin(board, row, col, player) {
    const directions = [
      [0, 1], // 水平
      [1, 0], // 垂直
      [1, 1], // 对角线1
      [1, -1], // 对角线2
    ];

    for (const [dx, dy] of directions) {
      let count = 1;
      const winningLine = [[row, col]];

      // 向前检查
      let r = row + dx; let
        c = col + dy;
      while (r >= 0 && r < 15 && c >= 0 && c < 15 && board[r][c] === player) {
        count++;
        winningLine.push([r, c]);
        r += dx;
        c += dy;
      }

      // 向后检查
      r = row - dx;
      c = col - dy;
      while (r >= 0 && r < 15 && c >= 0 && c < 15 && board[r][c] === player) {
        count++;
        winningLine.unshift([r, c]);
        r -= dx;
        c -= dy;
      }

      if (count >= 5) {
        return winningLine;
      }
    }

    return null;
  }

  /**
   * 检查棋盘是否已满
   */
  static isBoardFull(board) {
    for (let i = 0; i < 15; i++) {
      for (let j = 0; j < 15; j++) {
        if (board[i][j] === null) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * 获取房间列表
   */
  static async getRoomList(limit = 20) {
    const rooms = await GameRoom.getPublicRooms(limit);
    return rooms.map(room => ({
      roomCode: room.room_code,
      name: room.name,
      status: room.status,
      playerCount: (room.black_player_id ? 1 : 0) + (room.white_player_id ? 1 : 0),
      createdAt: room.created_at,
      creatorUsername: room.creator_username || '未知',
      blackPlayer: room.black_player_username,
      whitePlayer: room.white_player_username
    }));
  }

  /**
   * 获取房间详情
   */
  static async getRoomInfo(roomCode) {
    const room = await GameRoom.findByRoomCode(roomCode);
    if (!room) {
      throw new Error('房间不存在');
    }

    const gameState = await RedisService.hget(`room:${roomCode}`, 'gameState') || {};

    return {
      roomCode: room.room_code,
      name: room.name,
      status: room.status,
      board: gameState.board || Array(15).fill(null).map(() => Array(15).fill(0)),
      currentPlayer: gameState.currentPlayer || 'black',
      gameActive: gameState.gameActive || false,
      players: gameState.players || {},
      spectatorCount: (gameState.spectators || []).length,
      createdAt: room.created_at
    };
  }

  /**
   * 获取游戏历史记录
   */
  static async getGameHistory(roomCode) {
    const room = await GameRoom.findByRoomCode(roomCode);
    if (!room) {
      throw new Error('房间不存在');
    }

    const gameState = await RedisService.hget(`room:${roomCode}`, 'gameState') || {};
    const moveHistory = await RedisService.hget(`room:${roomCode}`, 'moveHistory') || [];

    return {
      roomCode,
      moves: moveHistory,
      board: gameState.board,
      result: room.status === 'finished' ? {
        winner: gameState.winner,
        winningLine: gameState.winningLine
      } : null
    };
  }
}

module.exports = GameService;
