exports.seed = async function(knex) {
  // 清空现有数据
  await knex('chat_messages').del();
  await knex('game_records').del();
  await knex('game_rooms').del();
  await knex('users').del();

  const bcrypt = require('bcryptjs');

  // 创建测试用户（匹配实际表结构）
  const users = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      username: 'player1',
      email: 'player1@test.com',
      password_hash: await bcrypt.hash('password123', 10),
      nickname: '高级玩家',
      rating: 1650,
      games_played: 22,
      games_won: 15,
      games_lost: 5,
      games_drawn: 2,
      is_active: true,
      is_premium: false,
      created_at: new Date('2024-01-01'),
      updated_at: new Date()
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      username: 'player2',
      email: 'player2@test.com',
      password_hash: await bcrypt.hash('password123', 10),
      nickname: '中级玩家',
      rating: 1500,
      games_played: 23,
      games_won: 10,
      games_lost: 10,
      games_drawn: 3,
      is_active: true,
      is_premium: false,
      created_at: new Date('2024-01-15'),
      updated_at: new Date()
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      username: 'player3',
      email: 'player3@test.com',
      password_hash: await bcrypt.hash('password123', 10),
      nickname: '新手玩家',
      rating: 1350,
      games_played: 16,
      games_won: 3,
      games_lost: 12,
      games_drawn: 1,
      is_active: true,
      is_premium: false,
      created_at: new Date('2024-02-01'),
      updated_at: new Date()
    },
    {
      id: '44444444-4444-4444-4444-444444444444',
      username: 'guest001',
      email: 'guest001@temp.com',
      password_hash: await bcrypt.hash('guest123', 10),
      nickname: '游客001',
      rating: 1200,
      games_played: 0,
      games_won: 0,
      games_lost: 0,
      games_drawn: 0,
      is_active: true,
      is_premium: false,
      created_at: new Date(),
      updated_at: new Date()
    }
  ];

  await knex('users').insert(users);

  console.log('✅ 种子数据插入成功！');
  console.log('📊 创建了:', users.length, '个用户');
  console.log('');
  console.log('测试账号:');
  console.log('  用户名: player1, 密码: password123 (高级玩家, ELO 1650)');
  console.log('  用户名: player2, 密码: password123 (中级玩家, ELO 1500)');
  console.log('  用户名: player3, 密码: password123 (新手玩家, ELO 1350)');
};
