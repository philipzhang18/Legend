require('dotenv').config();
const knex = require('knex');
const knexConfig = require('../../knexfile');

const environment = process.env.NODE_ENV || 'development';
const config = knexConfig[environment];

// 创建数据库连接
const db = knex(config);

// 测试数据库连接
let dbConnected = false;

db.raw('SELECT 1')
  .then(() => {
    console.log(`Database connected successfully in ${environment} mode`);
    dbConnected = true;
  })
  .catch((err) => {
    console.error('Database connection failed:', err.message);
    console.log('Running in database-less mode (guest-only)');
    dbConnected = false;
  });

module.exports = db;
module.exports.isConnected = () => dbConnected;
