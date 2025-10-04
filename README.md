# Legend Gomoku - 商业级企业版

[![Build Status](https://github.com/philipzhang18/Legend/workflows/CI%2FCD%20Pipeline/badge.svg)](https://github.com/philipzhang18/Legend/actions)
[![codecov](https://codecov.io/gh/philipzhang18/Legend/branch/main/graph/badge.svg)](https://codecov.io/gh/philipzhang18/Legend)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](https://hub.docker.com/r/legendteam/gomoku)

## 🚀 项目简介

Legend Gomoku 企业版是一个功能完整的商业级双人对战五子棋游戏系统，具备企业级的安全性、可扩展性和可维护性。

### 核心特性

#### 🎮 游戏功能
- **标准五子棋规则**: 15x15棋盘，五子连珠获胜
- **实时双人对战**: 基于WebSocket的低延迟对战
- **智能胜负判定**: 支持所有方向的连珠检测
- **获胜线显示**: 游戏结束时高亮显示获胜路径
- **游戏回放**: 完整的棋谱记录和回放功能

#### 🔐 用户系统
- **完整的认证系统**: 注册、登录、JWT令牌管理
- **用户资料管理**: 头像、昵称、个人统计
- **ELO评分系统**: 动态评分和排行榜
- **游戏历史**: 详细的对战记录和统计

#### 🏆 高级功能

**ELO评分系统**
- **动态K-factor**: 根据玩家等级和游戏数自动调整
  - 新手 (< 30局): K = 40
  - 低分 (< 1400): K = 32
  - 中等 (< 2000): K = 24
  - 高手 (≥ 2000): K = 16
- **7个段位系统**: 青铜 → 白银 → 黄金 → 铂金 → 钻石 → 大师 → 宗师
- **全球排行榜**: 实时更新的玩家排名

**观战功能**
- **无限观战者**: 支持多人同时观看对局
- **实时同步**: 观战者实时接收棋局进展
- **观战者列表**: 显示当前观战人数和列表

**游戏回放**
- **完整棋谱**: 记录每一步移动和时间戳
- **回放播放器**: 支持暂停、快进、后退
- **分享功能**: 生成回放链接分享精彩对局

**房间管理**
- **公开/私有房间**: 灵活的房间可见性控制
- **房间列表**: 浏览所有公开房间
- **房间搜索**: 通过房间代码快速加入
- **房间历史**: 查看房间的完整游戏记录

**断线重连**
- **自动重连**: 网络断开后自动尝试重连（最多5次）
- **状态恢复**: 重连后自动恢复游戏状态
- **友好提示**: 显示重连进度和状态

**游客模式**
- **无需注册**: 游客可以直接开始游戏
- **临时身份**: 自动生成游客ID和昵称
- **完整功能**: 支持所有核心游戏功能
- **数据隔离**: 游客数据独立存储，不影响注册用户

#### 🏗️ 技术架构
- **微服务架构**: 模块化设计，易于扩展
- **数据库持久化**: PostgreSQL + Redis缓存
- **实时通信**: Socket.io WebSocket支持
- **安全性**: Helmet、CORS、速率限制、输入验证

#### 📊 监控与运维
- **健康检查**: 应用和数据库健康状态监控
- **日志系统**: Winston结构化日志
- **性能监控**: 内置性能指标收集
- **错误追踪**: 完整的错误处理和报告

#### 🐳 DevOps
- **Docker化**: 容器化部署支持
- **CI/CD**: GitHub Actions自动化流水线
- **负载均衡**: Nginx反向代理配置
- **环境管理**: 开发、测试、生产环境分离

## 📋 系统要求

### 最低配置
- **Node.js**: ≥ 16.0.0
- **PostgreSQL**: ≥ 12.0
- **Redis**: ≥ 6.0
- **内存**: 2GB RAM
- **存储**: 5GB 可用空间

### 推荐配置
- **Node.js**: 18.x LTS
- **PostgreSQL**: 15.x
- **Redis**: 7.x
- **内存**: 4GB+ RAM
- **存储**: 20GB+ SSD

## 🚀 快速开始

### 开发环境

1. **克隆项目**
```bash
git clone https://github.com/philipzhang18/Legend.git
cd Legend/gomoku-game
```

2. **安装依赖**
```bash
npm install
```

3. **环境配置**
```bash
cp .env.example .env
# 编辑 .env 文件配置数据库和Redis连接
```

4. **数据库设置**
```bash
# 创建数据库
createdb legend_gomoku_dev
createdb legend_gomoku_test

# 运行迁移
npm run db:migrate
```

5. **启动开发服务器**
```bash
npm run dev
```

访问 `http://localhost:3000` 开始游戏！

### Docker 部署

1. **使用 Docker Compose 一键部署**
```bash
docker-compose up -d
```

2. **单独构建镜像**
```bash
docker build -t legend-gomoku .
docker run -p 3000:3000 legend-gomoku
```

## 📁 项目结构

```
gomoku-game/
├── server/                 # 服务端代码
│   ├── controllers/        # 控制器
│   ├── models/            # 数据模型
│   ├── services/          # 业务逻辑
│   ├── middleware/        # 中间件
│   ├── routes/           # 路由配置
│   ├── config/           # 配置文件
│   └── utils/            # 工具函数
├── public/               # 前端静态文件
│   ├── index.html
│   ├── style.css
│   └── script.js
├── database/            # 数据库文件
│   ├── migrations/      # 数据库迁移
│   └── seeds/          # 种子数据
├── tests/              # 测试文件
│   ├── unit/          # 单元测试
│   └── integration/   # 集成测试
├── logs/              # 日志文件
├── .github/           # GitHub Actions
└── docker-compose.yml # Docker编排
```

## 🔧 开发命令

```bash
# 开发
npm run dev              # 启动开发服务器
npm run build           # 构建生产版本

# 测试
npm test               # 运行所有测试
npm run test:watch     # 监视模式测试
npm run test:coverage  # 测试覆盖率报告

# 代码质量
npm run lint          # ESLint检查
npm run lint:fix      # 自动修复lint问题
npm run security-audit # 安全审计

# 数据库
npm run db:migrate    # 运行数据库迁移
npm run db:seed      # 导入种子数据

# Docker
npm run docker:build # 构建Docker镜像
npm run docker:run   # 运行Docker容器
```

## 📡 API使用指南

### 高级功能API

#### 1. ELO评分和排行榜

**获取全球排行榜**:
```bash
curl http://localhost:3000/api/game/leaderboard?limit=100
```

响应示例:
```json
{
  "success": true,
  "leaderboard": [
    {
      "id": "user123",
      "username": "player1",
      "rating": 1650,
      "tier": "铂金",
      "games_played": 50,
      "games_won": 35,
      "win_rate": 70.0
    }
  ]
}
```

**获取用户统计**:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/game/users/USER_ID/stats
```

**获取用户游戏历史**:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/game/users/USER_ID/history?limit=20
```

#### 2. 房间管理

**获取公开房间列表**:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/game/rooms?limit=20
```

**获取房间详情**:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/game/rooms/ROOM_CODE
```

**获取游戏历史回放**:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/game/rooms/ROOM_CODE/history
```

响应示例:
```json
{
  "success": true,
  "history": {
    "roomCode": "ABC123",
    "moves": [
      { "row": 7, "col": 7, "player": "black", "timestamp": "2025-10-04T10:00:00Z" },
      { "row": 7, "col": 8, "player": "white", "timestamp": "2025-10-04T10:00:05Z" }
    ],
    "result": {
      "winner": "black",
      "winningLine": [[7,7], [7,8], [7,9], [7,10], [7,11]]
    }
  }
}
```

#### 3. 观战功能

通过WebSocket加入观战:
```javascript
// 在浏览器控制台执行
socket.emit('join-room', {
  roomId: 'ROOM_CODE',
  asSpectator: true
});

// 监听观战者加入确认
socket.on('spectator-joined', (data) => {
  console.log('观战加入成功', data);
});

// 监听棋局进展
socket.on('move-made', (data) => {
  console.log('新的移动', data);
});
```

#### 4. 游客模式使用

**创建游客账号**:
```bash
curl -X POST http://localhost:3000/api/auth/guest \
  -H "Content-Type: application/json" \
  -d '{"username": "Guest123"}'
```

响应示例:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "guest_abc123",
    "username": "Guest123",
    "isGuest": true
  }
}
```

**游客创建房间**:
- 游客房间存储在内存中（memoryRooms）
- 支持所有标准游戏功能
- 重启服务器后数据清空

### WebSocket事件

#### 连接认证
```javascript
const socket = io({
  auth: { token: 'YOUR_JWT_TOKEN' }
});
```

#### 创建房间
```javascript
socket.emit('create-room', {
  roomName: 'My Room',
  isPrivate: false,
  timeLimit: 30
});

socket.on('room-created', (data) => {
  console.log('房间创建成功', data.roomCode);
});
```

#### 加入房间
```javascript
socket.emit('join-room', {
  roomId: 'ABC123',
  asSpectator: false  // true为观战模式
});

socket.on('room-joined', (data) => {
  console.log('成功加入房间', data);
});
```

#### 下棋
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

#### 聊天
```javascript
socket.emit('send-message', {
  roomId: 'ABC123',
  message: 'Hello!'
});

socket.on('new-message', (data) => {
  console.log('新消息', data);
});
```

## 🔒 安全特性

### 认证与授权
- **JWT令牌**: 无状态用户认证
- **密码加密**: bcryptjs强加密存储
- **会话管理**: Redis会话存储
- **令牌黑名单**: 注销令牌无效化

### 数据安全
- **输入验证**: express-validator全面验证
- **SQL注入防护**: Knex.js参数化查询
- **XSS防护**: 输入消毒和CSP策略
- **CSRF保护**: 跨站请求伪造防护

### 网络安全
- **HTTPS强制**: 生产环境强制SSL
- **安全头**: Helmet.js设置安全HTTP头
- **CORS配置**: 精确的跨域资源共享配置
- **速率限制**: API请求频率限制

## 📈 性能优化

### 缓存策略
- **Redis缓存**: 用户会话、游戏状态缓存
- **数据库优化**: 索引优化、查询优化
- **静态资源**: Nginx静态文件缓存
- **CDN支持**: 静态资源CDN分发

### 扩展性
- **水平扩展**: 支持多实例负载均衡
- **数据库集群**: 主从复制支持
- **消息队列**: Redis Pub/Sub实时通信
- **微服务架构**: 模块化服务设计

## 🧪 测试

### 测试套件

#### 单元测试
测试业务逻辑和核心功能：

```bash
# 运行所有单元测试
npm test

# 运行特定测试文件
npm test -- tests/unit/GameService.test.js
npm test -- tests/unit/AuthService.test.js

# 监视模式（自动重新运行）
npm run test:watch

# 生成测试覆盖率报告
npm run test -- --coverage
```

**单元测试文件**:
- `tests/unit/GameService.test.js` - 游戏服务测试
  - 房间创建/加入
  - 下棋逻辑
  - 胜负判定
  - 游戏重启
- `tests/unit/AuthService.test.js` - 认证服务测试
  - 用户注册/登录
  - JWT验证
  - 密码管理

#### 集成测试
测试API端点和完整流程：

```bash
# 运行所有集成测试
npm run test:integration

# 运行特定集成测试
npm run test:integration -- tests/integration/auth.test.js
npm run test:integration -- tests/integration/socket.test.js
```

**集成测试文件**:
- `tests/integration/auth.test.js` - 认证API测试
  - POST /api/auth/register
  - POST /api/auth/login
  - POST /api/auth/guest
  - GET /api/auth/me
  - PUT /api/auth/profile
- `tests/integration/socket.test.js` - WebSocket测试
  - 连接认证
  - 房间创建/加入
  - 游戏对局
  - 实时聊天

#### 测试覆盖率

查看测试覆盖率报告：

```bash
# 生成覆盖率报告
npm run test -- --coverage

# 在浏览器中查看详细报告
open coverage/lcov-report/index.html
```

### 质量指标
- **代码覆盖率**: > 60%
- **性能基准**: < 200ms响应时间
- **可用性**: 99.9% uptime
- **安全性**: OWASP TOP 10 合规

## 🚀 部署指南

### 生产部署

1. **服务器准备**
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 安装Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

2. **应用部署**
```bash
# 克隆项目
git clone https://github.com/philipzhang18/Legend.git
cd Legend/gomoku-game

# 配置环境变量
cp .env.example .env
# 编辑生产环境配置

# 启动服务
docker-compose -f docker-compose.prod.yml up -d
```

3. **Nginx配置**
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 监控配置

#### Prometheus监控

应用内置了完整的Prometheus监控系统：

**访问监控端点**:
```bash
# Prometheus指标端点
curl http://localhost:3000/metrics

# 健康检查端点
curl http://localhost:3000/health
```

**可用指标**:
- `gomoku_http_requests_total` - HTTP请求总数（按方法/路由/状态码）
- `gomoku_http_request_duration_seconds` - HTTP请求持续时间
- `gomoku_websocket_connections` - WebSocket连接数
- `gomoku_active_rooms` - 活跃房间数（按状态）
- `gomoku_games_total` - 游戏总数（按结果）
- `gomoku_game_duration_seconds` - 游戏时长
- `gomoku_moves_per_game` - 每局步数
- `gomoku_db_queries_total` - 数据库查询总数
- `gomoku_db_query_duration_seconds` - 数据库查询持续时间
- `gomoku_errors_total` - 错误计数（按类型/严重程度）

**配置Prometheus采集**:

创建 `prometheus.yml`:
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'gomoku'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
```

启动Prometheus:
```bash
docker run -d \
  -p 9090:9090 \
  -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus
```

访问 Prometheus UI: http://localhost:9090

#### Grafana可视化

**启动Grafana**:
```bash
docker run -d \
  -p 3001:3000 \
  --name grafana \
  grafana/grafana
```

访问 Grafana: http://localhost:3001 (默认账号: admin/admin)

**添加数据源**:
1. 登录Grafana
2. Configuration → Data Sources → Add data source
3. 选择 Prometheus
4. URL: `http://localhost:9090`
5. 点击 "Save & Test"

**导入仪表板**:
- 游戏性能监控
- 用户活动统计
- 系统资源使用
- 错误和异常追踪

#### 健康检查

**健康检查端点响应**:
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2025-10-04T12:00:00.000Z",
  "uptime": 3600,
  "memory": {
    "rss": 85352448,
    "heapTotal": 23519232,
    "heapUsed": 22519216
  },
  "services": {
    "redis": "healthy",
    "database": "healthy"
  }
}
```

**状态说明**:
- `healthy` - 所有服务正常
- `degraded` - 部分服务异常但核心功能可用
- `unhealthy` - 严重故障

#### 日志系统

**日志位置**:
- `logs/combined.log` - 所有日志
- `logs/error.log` - 错误日志
- `logs/access.log` - 访问日志

**查看实时日志**:
```bash
# 应用日志
tail -f logs/combined.log

# 错误日志
tail -f logs/error.log

# 只看特定级别
tail -f logs/combined.log | grep "error"
```

**日志级别**:
- `error` - 错误信息
- `warn` - 警告信息
- `info` - 一般信息
- `debug` - 调试信息

1. **日志收集**
```bash
# 安装ELK Stack
docker run -d --name elasticsearch elasticsearch:7.14.0
docker run -d --name logstash logstash:7.14.0
docker run -d --name kibana kibana:7.14.0
```

2. **指标监控**
```bash
# Prometheus + Grafana
docker run -d --name prometheus prom/prometheus
docker run -d --name grafana grafana/grafana
```

## 🤝 贡献指南

### 开发流程
1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

### 代码规范
- 遵循 ESLint 配置
- 编写测试用例
- 更新文档
- 遵循语义化版本

## 📄 许可证

本项目采用 MIT 许可证 - 详情请查看 [LICENSE](LICENSE) 文件

## 💬 支持与联系

- **问题反馈**: [GitHub Issues](https://github.com/philipzhang18/Legend/issues)
- **功能建议**: [GitHub Discussions](https://github.com/philipzhang18/Legend/discussions)
- **安全问题**: security@legendteam.com
- **技术支持**: support@legendteam.com

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者！

---

**Legend Team** - 致力于创造优质的游戏体验

⭐ 如果这个项目对您有帮助，请给我们一个星标！