# 🚀 Legend 五子棋 - 高级功能使用指南

## 📋 快速导航

- [测试指南](#-测试指南)
- [监控系统](#-监控系统)
- [高级功能API](#-高级功能api)
- [WebSocket事件](#-websocket事件)

---

## 🧪 测试指南

### 运行测试

```bash
# 单元测试
npm test

# 集成测试
npm run test:integration

# 测试覆盖率
npm run test -- --coverage

# 监视模式
npm run test:watch
```

### 测试文件

**单元测试** (`tests/unit/`):
- `GameService.test.js` - 游戏逻辑测试
- `AuthService.test.js` - 认证服务测试

**集成测试** (`tests/integration/`):
- `auth.test.js` - 认证API测试
- `socket.test.js` - WebSocket测试

---

## 📊 监控系统

### Prometheus指标

**访问指标端点**:
```bash
curl http://localhost:3000/metrics
```

**可用指标**:
- `gomoku_http_requests_total` - HTTP请求总数
- `gomoku_websocket_connections` - WebSocket连接数
- `gomoku_active_rooms` - 活跃房间数
- `gomoku_games_total` - 游戏总数
- `gomoku_game_duration_seconds` - 游戏时长
- `gomoku_db_queries_total` - 数据库查询数

### 健康检查

```bash
curl http://localhost:3000/health
```

**响应示例**:
```json
{
  "success": true,
  "status": "healthy",
  "uptime": 3600,
  "services": {
    "redis": "healthy",
    "database": "healthy"
  }
}
```

### 配置Prometheus

1. 创建 `prometheus.yml`:
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'gomoku'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
```

2. 启动Prometheus:
```bash
docker run -d -p 9090:9090 \
  -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus
```

3. 访问: http://localhost:9090

### 配置Grafana

1. 启动Grafana:
```bash
docker run -d -p 3001:3000 --name grafana grafana/grafana
```

2. 访问: http://localhost:3001 (admin/admin)

3. 添加数据源:
   - Configuration → Data Sources → Add Prometheus
   - URL: `http://localhost:9090`

---

## 🎯 高级功能API

### 1. ELO评分系统

**获取排行榜**:
```bash
curl http://localhost:3000/api/game/leaderboard?limit=100
```

**获取用户统计**:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/game/users/USER_ID/stats
```

**段位系统**:
- 青铜: < 1000
- 白银: 1000-1199
- 黄金: 1200-1399
- 铂金: 1400-1599
- 钻石: 1600-1799
- 大师: 1800-1999
- 宗师: ≥ 2000

### 2. 房间管理

**获取公开房间列表**:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/game/rooms?limit=20
```

**获取房间详情**:
```bash
curl http://localhost:3000/api/game/rooms/ROOM_CODE
```

### 3. 游戏回放

**获取游戏历史**:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/game/rooms/ROOM_CODE/history
```

**响应示例**:
```json
{
  "success": true,
  "history": {
    "roomCode": "ABC123",
    "moves": [
      { "row": 7, "col": 7, "player": "black", "timestamp": "2025-10-04T10:00:00Z" }
    ],
    "result": {
      "winner": "black",
      "winningLine": [[7,7], [7,8], [7,9], [7,10], [7,11]]
    }
  }
}
```

### 4. 游客模式

**创建游客账号**:
```bash
curl -X POST http://localhost:3000/api/auth/guest \
  -H "Content-Type: application/json" \
  -d '{"username": "Guest123"}'
```

**特点**:
- 无需注册即可游戏
- 数据存储在内存中
- 支持所有游戏功能
- 重启后数据清空

---

## 🔌 WebSocket事件

### 连接

```javascript
const socket = io({
  auth: { token: 'YOUR_JWT_TOKEN' }
});
```

### 房间操作

**创建房间**:
```javascript
socket.emit('create-room', {
  roomName: 'My Room',
  isPrivate: false,
  timeLimit: 30
});

socket.on('room-created', (data) => {
  console.log('房间代码:', data.roomCode);
});
```

**加入房间**:
```javascript
socket.emit('join-room', {
  roomId: 'ABC123',
  asSpectator: false  // true为观战模式
});

socket.on('room-joined', (data) => {
  console.log('成功加入');
});
```

### 游戏操作

**下棋**:
```javascript
socket.emit('make-move', {
  roomId: 'ABC123',
  row: 7,
  col: 7
});

socket.on('move-made', (data) => {
  console.log('移动完成', data);
});
```

**游戏结束**:
```javascript
socket.on('game-over', (data) => {
  console.log('获胜者:', data.winner);
  console.log('获胜线:', data.winningLine);
});
```

### 观战功能

```javascript
// 作为观战者加入
socket.emit('join-room', {
  roomId: 'ROOM_CODE',
  asSpectator: true
});

socket.on('spectator-joined', (data) => {
  console.log('观战成功', data);
});

// 实时接收棋局
socket.on('move-made', (data) => {
  console.log('新的移动', data);
});
```

### 聊天

```javascript
socket.emit('send-message', {
  roomId: 'ABC123',
  message: 'Hello!'
});

socket.on('new-message', (data) => {
  console.log(data.username + ':', data.message);
});
```

### 断线重连

```javascript
// 自动重连配置
const socket = io({
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000
});

// 监听重连事件
socket.on('reconnect', (attemptNumber) => {
  console.log('重连成功，尝试次数:', attemptNumber);
  // 自动恢复游戏状态
});

socket.on('reconnect_failed', () => {
  console.log('重连失败，请刷新页面');
});
```

---

## 📈 性能优化建议

### Redis缓存

游戏状态、用户会话、房间信息都缓存在Redis中，建议配置：

```bash
# Redis配置优化
maxmemory 2gb
maxmemory-policy allkeys-lru
```

### 数据库优化

```sql
-- 添加索引
CREATE INDEX idx_rooms_status ON game_rooms(status);
CREATE INDEX idx_rooms_created ON game_rooms(created_at DESC);
CREATE INDEX idx_users_rating ON users(rating DESC);
```

### 负载均衡

使用Nginx配置多实例：

```nginx
upstream gomoku_backend {
    server localhost:3000;
    server localhost:3001;
    server localhost:3002;
}

server {
    location / {
        proxy_pass http://gomoku_backend;
    }
}
```

---

## 🔍 故障排查

### 常见问题

**1. 健康检查显示database unhealthy**
- 检查PostgreSQL是否运行: `docker ps | grep postgres`
- 查看数据库日志: `docker logs gomoku-postgres`

**2. 游客用户无法创建房间**
- 确保已应用最新的GameRoom模型修复
- 检查内存存储是否正常工作

**3. WebSocket连接失败**
- 检查JWT令牌是否有效
- 查看浏览器控制台错误信息
- 确认端口3000未被占用

### 日志查看

```bash
# 应用日志
tail -f logs/combined.log

# 错误日志
tail -f logs/error.log

# 过滤特定错误
grep "ERROR" logs/combined.log
```

---

## 📚 相关文档

- [README.md](./README.md) - 项目主文档
- [RUNNING.md](./RUNNING.md) - 运行指南
- [COMPLETION_SUMMARY.md](./COMPLETION_SUMMARY.md) - 功能完成总结
- [FEATURE_STATUS.md](./FEATURE_STATUS.md) - 功能状态报告

---

**最后更新**: 2025-10-04
