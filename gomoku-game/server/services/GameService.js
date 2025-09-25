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

    const user = await User.findById(userId);
    const room = await GameRoom.create({
      creatorId: userId,
      creatorUsername: user.username,
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
  static async joinRoom(userId, roomCode) {
    const room = await GameRoom.findByRoomCode(roomCode);
    if (!room) {
      throw new Error('Room not found');
    }

    if (room.status === 'finished') {
      throw new Error('Game has finished');
    }

    // 检查房间是否已满
    if (room.black_player_id && room.white_player_id) {
      throw new Error('Room is full');
    }

    // 检查用户是否已在房间中
    if (room.black_player_id === userId || room.white_player_id === userId) {
      throw new Error('You are already in this room');
    }

    let color, playerCount;

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

    // 更新玩家统计
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

    await GameRoom.update(room.id, { status: 'finished' });
  }

  /**
   * 检查胜利条件
   */
  static checkWin(board, row, col, player) {
    const directions = [
      [0, 1],   // 水平
      [1, 0],   // 垂直
      [1, 1],   // 对角线1
      [1, -1]   // 对角线2
    ];

    for (let [dx, dy] of directions) {
      let count = 1;
      let winningLine = [[row, col]];

      // 向前检查
      let r = row + dx, c = col + dy;
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
}

module.exports = GameService;