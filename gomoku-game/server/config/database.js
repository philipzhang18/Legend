require('dotenv').config();
const knex = require('knex');
const knexConfig = require('../../knexfile');

const environment = process.env.NODE_ENV || 'development';
const config = knexConfig[environment];

// 创建数据库连接
const db = knex(config);

// 测试数据库连接
db.raw('SELECT 1')
  .then(() => {
    console.log(`Database connected successfully in ${environment} mode`);
  })
  .catch((err) => {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  });

module.exports = db;