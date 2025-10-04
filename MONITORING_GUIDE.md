# 📊 Legend 五子棋 - 监控系统使用指南

## 🚀 快速开始

### 1. 查看 Prometheus 指标

**访问指标端点**:
```bash
curl http://localhost:3000/metrics
```

这会返回所有Prometheus格式的监控指标。

### 2. 查看健康状态

**访问健康检查端点**:
```bash
curl http://localhost:3000/health
```

**响应示例**:
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

### 3. 查看排行榜

**访问排行榜API**:
```bash
curl http://localhost:3000/api/game/leaderboard?limit=10 | jq .
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "leaderboard": [
      {
        "id": "...",
        "username": "player1",
        "nickname": "高级玩家",
        "rating": 1650,
        "tier": {
          "tier": "Diamond",
          "name": "钻石",
          "color": "#B9F2FF"
        },
        "games_played": 22,
        "games_won": 15,
        "win_rate": "68.2"
      }
    ]
  }
}
```

---

## 📈 可用的监控指标

### HTTP 指标
- `gomoku_http_requests_total` - HTTP请求总数
  - 标签: method, route, status_code
- `gomoku_http_request_duration_seconds` - HTTP请求持续时间（直方图）

### WebSocket 指标
- `gomoku_websocket_connections` - WebSocket当前连接数
- `gomoku_active_rooms` - 活跃房间数
  - 标签: status (waiting, playing, finished)

### 游戏指标
- `gomoku_games_total` - 游戏总数
  - 标签: result (black_win, white_win, draw)
- `gomoku_game_duration_seconds` - 游戏时长（直方图）
- `gomoku_moves_per_game` - 每局步数（直方图）

### 数据库指标
- `gomoku_db_queries_total` - 数据库查询总数
  - 标签: operation, table, status
- `gomoku_db_query_duration_seconds` - 查询持续时间（直方图）
- `gomoku_redis_operations_total` - Redis操作计数

### 系统指标
- `gomoku_errors_total` - 错误计数
  - 标签: type, severity
- `gomoku_auth_attempts_total` - 认证尝试计数
  - 标签: method, status
- `gomoku_chat_messages_total` - 聊天消息计数

### Node.js 默认指标
- `gomoku_process_cpu_user_seconds_total` - 用户CPU时间
- `gomoku_process_cpu_system_seconds_total` - 系统CPU时间
- `gomoku_process_resident_memory_bytes` - 常驻内存
- `gomoku_process_heap_bytes` - 堆内存
- `gomoku_process_open_fds` - 打开的文件描述符

---

## 🔧 配置 Prometheus

### 1. 创建 Prometheus 配置文件

创建 `prometheus.yml`:
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'gomoku'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
```

### 2. 启动 Prometheus

**使用 Docker**:
```bash
docker run -d \
  --name prometheus \
  -p 9090:9090 \
  -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus
```

**或使用二进制**:
```bash
./prometheus --config.file=prometheus.yml
```

### 3. 访问 Prometheus UI

打开浏览器访问: **http://localhost:9090**

### 4. 查询示例

在Prometheus UI中尝试这些查询:

```promql
# HTTP请求速率（每秒）
rate(gomoku_http_requests_total[5m])

# 平均响应时间
rate(gomoku_http_request_duration_seconds_sum[5m]) / rate(gomoku_http_request_duration_seconds_count[5m])

# 当前WebSocket连接数
gomoku_websocket_connections

# 游戏完成率（每分钟）
rate(gomoku_games_total[1m])

# 错误率
rate(gomoku_errors_total[5m])
```

---

## 📊 配置 Grafana

### 1. 启动 Grafana

**使用 Docker**:
```bash
docker run -d \
  --name grafana \
  -p 3001:3000 \
  grafana/grafana
```

### 2. 登录 Grafana

访问: **http://localhost:3001**
- 默认用户名: `admin`
- 默认密码: `admin`

### 3. 添加 Prometheus 数据源

1. 点击左侧菜单 "Configuration" → "Data Sources"
2. 点击 "Add data source"
3. 选择 "Prometheus"
4. 配置:
   - Name: `Prometheus`
   - URL: `http://localhost:9090`
5. 点击 "Save & Test"

### 4. 创建仪表板

#### 示例仪表板配置

**HTTP 请求面板**:
```json
{
  "title": "HTTP Requests Rate",
  "targets": [
    {
      "expr": "rate(gomoku_http_requests_total[5m])"
    }
  ],
  "type": "graph"
}
```

**WebSocket 连接面板**:
```json
{
  "title": "WebSocket Connections",
  "targets": [
    {
      "expr": "gomoku_websocket_connections"
    }
  ],
  "type": "stat"
}
```

**游戏统计面板**:
```json
{
  "title": "Games Played",
  "targets": [
    {
      "expr": "rate(gomoku_games_total[1h])"
    }
  ],
  "type": "graph"
}
```

---

## 🔍 实时监控示例

### 查看实时指标

```bash
# 持续查看HTTP请求数
watch -n 1 'curl -s http://localhost:3000/metrics | grep gomoku_http_requests_total | tail -5'

# 查看WebSocket连接数
watch -n 1 'curl -s http://localhost:3000/metrics | grep gomoku_websocket_connections'

# 查看系统健康状态
watch -n 5 'curl -s http://localhost:3000/health | jq .'
```

### 查看排行榜变化

```bash
# 每10秒刷新排行榜
watch -n 10 'curl -s http://localhost:3000/api/game/leaderboard?limit=5 | jq .data.leaderboard'
```

---

## 📝 日志监控

### 日志位置

- `logs/combined.log` - 所有日志
- `logs/error.log` - 错误日志
- `logs/access.log` - HTTP访问日志

### 查看日志

```bash
# 实时查看所有日志
tail -f logs/combined.log

# 只看错误日志
tail -f logs/error.log

# 过滤特定日志级别
tail -f logs/combined.log | grep "ERROR"

# 查看最近的错误
tail -100 logs/error.log

# 统计错误数量
grep "ERROR" logs/combined.log | wc -l
```

### 日志分析

```bash
# 统计每种错误类型的数量
grep "ERROR" logs/combined.log | awk '{print $5}' | sort | uniq -c

# 查找特定错误
grep "database connection" logs/error.log

# 查看今天的错误
grep "$(date +%Y-%m-%d)" logs/error.log
```

---

## 🎯 告警配置

### Prometheus 告警规则

创建 `alerts.yml`:
```yaml
groups:
  - name: gomoku_alerts
    interval: 30s
    rules:
      # HTTP错误率过高
      - alert: HighErrorRate
        expr: rate(gomoku_http_requests_total{status_code=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High HTTP error rate"
          description: "Error rate is {{ $value }} errors/sec"

      # 数据库连接失败
      - alert: DatabaseDown
        expr: up{job="gomoku"} == 0
        for: 1m
        annotations:
          summary: "Database connection failed"

      # WebSocket连接数过高
      - alert: TooManyConnections
        expr: gomoku_websocket_connections > 1000
        for: 5m
        annotations:
          summary: "Too many WebSocket connections"
          description: "{{ $value }} connections"

      # 内存使用过高
      - alert: HighMemoryUsage
        expr: gomoku_process_resident_memory_bytes > 1000000000
        for: 10m
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value }} bytes"
```

---

## 🔗 集成其他工具

### Alertmanager

配置告警通知:
```bash
docker run -d \
  --name alertmanager \
  -p 9093:9093 \
  -v $(pwd)/alertmanager.yml:/etc/alertmanager/alertmanager.yml \
  prom/alertmanager
```

### ELK Stack（日志聚合）

```bash
# Elasticsearch
docker run -d --name elasticsearch -p 9200:9200 elasticsearch:7.14.0

# Logstash
docker run -d --name logstash -p 5000:5000 logstash:7.14.0

# Kibana
docker run -d --name kibana -p 5601:5601 kibana:7.14.0
```

---

## 📊 性能基准

### 关键指标目标

| 指标 | 目标值 | 说明 |
|------|--------|------|
| HTTP响应时间 | < 200ms | P95 |
| WebSocket延迟 | < 50ms | 游戏操作延迟 |
| 数据库查询 | < 100ms | P95 |
| 错误率 | < 1% | 所有请求 |
| 可用性 | > 99.9% | 月度 |
| 并发连接 | 1000+ | 同时在线 |

### 监控这些指标

```promql
# P95响应时间
histogram_quantile(0.95, rate(gomoku_http_request_duration_seconds_bucket[5m]))

# 错误率
rate(gomoku_http_requests_total{status_code=~"5.."}[5m]) / rate(gomoku_http_requests_total[5m])

# 可用性
avg_over_time(up{job="gomoku"}[30d])
```

---

## 🛠️ 故障排查

### 常见监控问题

**1. Prometheus无法抓取指标**
```bash
# 检查应用是否运行
curl http://localhost:3000/metrics

# 检查Prometheus配置
docker logs prometheus
```

**2. 数据库健康检查失败**
```bash
# 检查PostgreSQL
docker ps | grep postgres
docker logs gomoku-postgres

# 测试数据库连接
psql -h localhost -U legend_user -d legend_gomoku_dev
```

**3. Redis连接问题**
```bash
# 检查Redis
docker ps | grep redis
docker logs gomoku-redis

# 测试Redis连接
redis-cli ping
```

---

## 📚 相关文档

- [README.md](./README.md) - 项目主文档
- [ADVANCED_FEATURES_GUIDE.md](./ADVANCED_FEATURES_GUIDE.md) - 高级功能指南
- [Prometheus官方文档](https://prometheus.io/docs/)
- [Grafana官方文档](https://grafana.com/docs/)

---

**最后更新**: 2025-10-04
