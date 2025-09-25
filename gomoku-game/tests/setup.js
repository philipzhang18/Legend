require('dotenv').config({ path: '.env.test' });

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.DB_NAME = 'legend_gomoku_test';

// Jest超时设置
jest.setTimeout(30000);

// 全局测试清理
afterAll(async () => {
  // 关闭数据库连接
  const db = require('../server/config/database');
  await db.destroy();

  // 关闭Redis连接
  const { RedisService } = require('../server/config/redis');
  await RedisService.close();
});