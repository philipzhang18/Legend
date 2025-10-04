const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const GameService = require('../services/GameService');
const EloRatingSystem = require('../services/EloRatingSystem');
const User = require('../models/User');

/**
 * 获取房间列表
 */
router.get('/rooms', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const rooms = await GameService.getRoomList(limit);

    res.json({
      success: true,
      data: { rooms }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取房间详情
 */
router.get('/rooms/:roomCode', authenticateToken, async (req, res) => {
  try {
    const roomInfo = await GameService.getRoomInfo(req.params.roomCode);

    res.json({
      success: true,
      data: { room: roomInfo }
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取游戏历史
 */
router.get('/rooms/:roomCode/history', authenticateToken, async (req, res) => {
  try {
    const history = await GameService.getGameHistory(req.params.roomCode);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取排行榜
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const knex = require('../config/database');

    const players = await knex('users')
      .select('id', 'username', 'nickname', 'rating', 'games_won', 'games_lost', 'games_drawn', 'games_played')
      .orderBy('rating', 'desc')
      .limit(limit);

    // 格式化为排行榜格式
    const leaderboard = players.map(player => ({
      id: player.id,
      username: player.username,
      nickname: player.nickname,
      rating: player.rating,
      tier: EloRatingSystem.getRatingTier(player.rating),
      games_played: player.games_played,
      games_won: player.games_won,
      games_lost: player.games_lost,
      games_drawn: player.games_drawn,
      win_rate: player.games_played > 0
        ? ((player.games_won / player.games_played) * 100).toFixed(1)
        : 0
    }));

    res.json({
      success: true,
      data: { leaderboard }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取用户统计信息
 */
router.get('/users/:userId/stats', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }

    const stats = {
      username: user.username,
      nickname: user.nickname,
      rating: user.rating,
      tier: EloRatingSystem.getRatingTier(user.rating),
      games_won: user.games_won,
      games_lost: user.games_lost,
      games_drawn: user.games_drawn,
      games_played: user.games_played,
      win_rate: user.games_played > 0
        ? ((user.games_won / user.games_played) * 100).toFixed(1)
        : 0
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取用户游戏历史
 */
router.get('/users/:userId/history', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const knex = require('../config/database');

    const games = await knex('game_records')
      .select([
        'game_records.*',
        'black_player.username as black_player_username',
        'white_player.username as white_player_username'
      ])
      .leftJoin('users as black_player', 'game_records.black_player_id', 'black_player.id')
      .leftJoin('users as white_player', 'game_records.white_player_id', 'white_player.id')
      .where('black_player_id', req.params.userId)
      .orWhere('white_player_id', req.params.userId)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    res.json({
      success: true,
      data: { games }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
