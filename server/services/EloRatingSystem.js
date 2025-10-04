/**
 * ELO评分系统
 */
class EloRatingSystem {
  /**
   * K-factor（K值）
   * 新手玩家使用较大的K值，高手使用较小的K值
   */
  static getKFactor(rating, gamesPlayed) {
    if (gamesPlayed < 30) {
      return 40; // 新手
    } else if (rating < 1400) {
      return 32; // 低分玩家
    } else if (rating < 2000) {
      return 24; // 中等玩家
    } else {
      return 16; // 高手
    }
  }

  /**
   * 计算期望得分
   * @param {number} ratingA - 玩家A的评分
   * @param {number} ratingB - 玩家B的评分
   * @returns {number} 玩家A的期望得分（0-1之间）
   */
  static getExpectedScore(ratingA, ratingB) {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  }

  /**
   * 计算新的ELO评分
   * @param {number} currentRating - 当前评分
   * @param {number} opponentRating - 对手评分
   * @param {number} actualScore - 实际得分（1=赢，0.5=平，0=输）
   * @param {number} gamesPlayed - 已玩游戏数
   * @returns {number} 新评分
   */
  static calculateNewRating(currentRating, opponentRating, actualScore, gamesPlayed) {
    const kFactor = this.getKFactor(currentRating, gamesPlayed);
    const expectedScore = this.getExpectedScore(currentRating, opponentRating);
    const ratingChange = kFactor * (actualScore - expectedScore);

    return Math.round(currentRating + ratingChange);
  }

  /**
   * 更新两个玩家的评分
   * @param {Object} player1 - 玩家1信息 {rating, gamesPlayed}
   * @param {Object} player2 - 玩家2信息 {rating, gamesPlayed}
   * @param {string} result - 结果 ('player1', 'player2', 'draw')
   * @returns {Object} 更新后的评分 {player1NewRating, player2NewRating}
   */
  static updateRatings(player1, player2, result) {
    let player1Score, player2Score;

    switch (result) {
      case 'player1':
        player1Score = 1;
        player2Score = 0;
        break;
      case 'player2':
        player1Score = 0;
        player2Score = 1;
        break;
      case 'draw':
        player1Score = 0.5;
        player2Score = 0.5;
        break;
      default:
        throw new Error('Invalid result');
    }

    const player1NewRating = this.calculateNewRating(
      player1.rating,
      player2.rating,
      player1Score,
      player1.gamesPlayed
    );

    const player2NewRating = this.calculateNewRating(
      player2.rating,
      player1.rating,
      player2Score,
      player2.gamesPlayed
    );

    return {
      player1NewRating,
      player2NewRating,
      player1Change: player1NewRating - player1.rating,
      player2Change: player2NewRating - player2.rating
    };
  }

  /**
   * 获取评分等级
   * @param {number} rating - ELO评分
   * @returns {Object} 等级信息
   */
  static getRatingTier(rating) {
    if (rating < 1000) {
      return { tier: 'Bronze', name: '青铜', color: '#CD7F32' };
    } else if (rating < 1200) {
      return { tier: 'Silver', name: '白银', color: '#C0C0C0' };
    } else if (rating < 1400) {
      return { tier: 'Gold', name: '黄金', color: '#FFD700' };
    } else if (rating < 1600) {
      return { tier: 'Platinum', name: '铂金', color: '#E5E4E2' };
    } else if (rating < 1800) {
      return { tier: 'Diamond', name: '钻石', color: '#B9F2FF' };
    } else if (rating < 2000) {
      return { tier: 'Master', name: '大师', color: '#FF00FF' };
    } else {
      return { tier: 'Grandmaster', name: '宗师', color: '#FF0000' };
    }
  }

  /**
   * 获取排行榜
   * @param {Array} players - 玩家列表
   * @param {number} limit - 返回数量限制
   * @returns {Array} 排序后的玩家列表
   */
  static getLeaderboard(players, limit = 100) {
    return players
      .sort((a, b) => b.elo_rating - a.elo_rating)
      .slice(0, limit)
      .map((player, index) => ({
        rank: index + 1,
        ...player,
        tier: this.getRatingTier(player.elo_rating),
        winRate: player.total_games > 0
          ? ((player.wins / player.total_games) * 100).toFixed(1)
          : 0
      }));
  }
}

module.exports = EloRatingSystem;
