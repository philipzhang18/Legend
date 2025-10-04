# 🎮 Legend 五子棋 - 运行指南

## 🚀 快速启动

### 方法1: 使用启动脚本（推荐）

```bash
# 交互式启动
./start.sh

# 或直接指定模式
./start.sh quick   # 快速启动（游客模式）
./start.sh full    # 完整启动（需要Docker）
./start.sh status  # 查看状态
./start.sh stop    # 停止服务
```

### 方法2: 手动启动

#### 快速模式（当前已启动）✅
```bash
npm run dev
```
- **访问地址**: http://localhost:3000
- **模式**: 游客模式 + 内存存储
- **优点**: 即开即用，无需配置
- **缺点**: 重启后数据清空

#### 完整模式（需要Docker）
```bash
# 1. 启动数据库和Redis
docker-compose up -d postgres redis

# 2. 运行数据库迁移
npm run db:migrate

# 3. 导入测试数据（可选）
npm run db:seed

# 4. 启动应用
npm run dev
```

## 📍 当前运行状态

```
✅ 应用服务器: 运行中
📍 访问地址: http://localhost:3000
🔧 端口: 3000
💾 模式: 游客模式（内存存储）
```

### 可用功能
- ✅ 双人对战五子棋
- ✅ 房间创建/加入
- ✅ 实时聊天
- ✅ 游客认证
- ✅ 断线重连
- ✅ 游戏状态同步
- ⚠️ 数据库功能（需启动PostgreSQL）
- ⚠️ Redis缓存（需启动Redis）

## 🧪 测试功能

### 运行测试
```bash
# 单元测试
npm test

# 集成测试
npm run test:integration

# 测试覆盖率
npm run test -- --coverage
```

### 测试API端点
```bash
# 健康检查（需要数据库）
curl http://localhost:3000/health

# Prometheus指标
curl http://localhost:3000/metrics

# 排行榜（需要数据库）
curl http://localhost:3000/api/game/leaderboard
```

## 🎯 使用示例

### 1. 开始游戏

1. 打开浏览器访问: http://localhost:3000
2. 设置昵称（可选）
3. 点击"创建房间"
4. 分享房间ID给朋友
5. 朋友输入房间ID并点击"加入房间"
6. 开始对战！

### 2. 测试账号（完整模式）

如果运行了 `npm run db:seed`，可以使用以下测试账号：

| 用户名 | 密码 | ELO评分 | 段位 |
|--------|------|---------|------|
| player1 | password123 | 1650 | 铂金 |
| player2 | password123 | 1500 | 黄金 |
| player3 | password123 | 1350 | 黄金 |

### 3. 观战功能

```javascript
// 在浏览器控制台执行
socket.emit('join-room', {
  roomId: 'ROOM_CODE',
  asSpectator: true
});
```

## 🔧 常见问题

### Q: 如何停止应用？
```bash
# 使用启动脚本
./start.sh stop

# 或手动停止
lsof -ti:3000 | xargs kill -9
docker-compose down
```

### Q: 端口被占用怎么办？
```bash
# 查找占用端口的进程
lsof -i:3000

# 结束进程
lsof -ti:3000 | xargs kill -9
```

### Q: 如何启用完整功能？

需要启动PostgreSQL和Redis：
```bash
# 使用Docker（推荐）
docker-compose up -d postgres redis

# 或使用系统服务
sudo systemctl start postgresql
sudo systemctl start redis
```

### Q: 数据库连接失败？

应用会自动fallback到内存模式，游戏仍可正常进行，只是数据不会持久化。

## 📊 监控和日志

### 查看日志
```bash
# 应用日志
tail -f logs/combined.log

# 错误日志
tail -f logs/error.log

# 实时日志（开发模式）
# 已在终端显示
```

### Prometheus指标

访问 http://localhost:3000/metrics 查看：
- HTTP请求统计
- WebSocket连接数
- 游戏对局统计
- 系统性能指标

## 🐳 Docker完整部署

### 一键启动所有服务
```bash
docker-compose up -d
```

包含服务：
- ✅ PostgreSQL数据库
- ✅ Redis缓存
- ✅ 应用服务器
- ✅ Nginx反向代理

### 查看服务状态
```bash
docker-compose ps
docker-compose logs -f app
```

## 📝 开发命令

```bash
# 开发模式（已启动）✅
npm run dev

# 生产模式
npm start

# 代码检查
npm run lint

# 安全审计
npm run security-audit

# 构建Docker镜像
npm run docker:build
```

## 🌐 访问地址

| 服务 | 地址 | 说明 |
|------|------|------|
| 游戏主页 | http://localhost:3000 | ✅ 可访问 |
| 健康检查 | http://localhost:3000/health | ⚠️ 需要数据库 |
| Prometheus | http://localhost:3000/metrics | ✅ 可访问 |
| 排行榜API | http://localhost:3000/api/game/leaderboard | ⚠️ 需要数据库 |

## 🎉 开始游戏

**当前应用已成功运行！**

立即访问: **http://localhost:3000** 开始游戏！

---

*需要帮助？查看 [README.md](./README.md) 或 [COMPLETION_SUMMARY.md](./COMPLETION_SUMMARY.md)*
