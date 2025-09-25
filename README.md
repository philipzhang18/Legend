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

### 测试覆盖

- **单元测试**: 业务逻辑完整测试
- **集成测试**: API端点测试
- **性能测试**: 负载和压力测试
- **安全测试**: 漏洞扫描和渗透测试

### 质量指标

- **代码覆盖率**: > 80%
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
