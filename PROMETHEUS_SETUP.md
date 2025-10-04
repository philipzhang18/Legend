# 🚀 Prometheus 启动指南

## 方法1: 快速启动（推荐）

### 1. 准备配置文件

已创建 `prometheus.yml` 配置文件：
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'gomoku'
    static_configs:
      - targets: ['host.docker.internal:3000']
    metrics_path: '/metrics'
    scrape_interval: 10s
```

### 2. 启动Prometheus

**使用Docker（推荐）**:
```bash
docker run -d \
  --name prometheus \
  --add-host=host.docker.internal:host-gateway \
  -p 9090:9090 \
  -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus:latest
```

如果遇到镜像拉取问题，使用国内镜像源：
```bash
docker run -d \
  --name prometheus \
  --add-host=host.docker.internal:host-gateway \
  -p 9090:9090 \
  -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml \
  docker.1ms.run/prom/prometheus:latest
```

### 3. 访问Prometheus

打开浏览器访问: **http://localhost:9090**

---

## 方法2: 使用二进制文件

### 1. 下载Prometheus

```bash
# Linux AMD64
wget https://github.com/prometheus/prometheus/releases/download/v2.45.0/prometheus-2.45.0.linux-amd64.tar.gz
tar xvfz prometheus-2.45.0.linux-amd64.tar.gz
cd prometheus-2.45.0.linux-amd64
```

### 2. 使用我们的配置文件

```bash
# 复制配置文件
cp /path/to/prometheus.yml ./prometheus.yml

# 启动Prometheus
./prometheus --config.file=prometheus.yml
```

### 3. 访问

访问: **http://localhost:9090**

---

## 验证Prometheus是否正常工作

### 1. 检查Targets

在Prometheus UI中:
1. 点击 "Status" → "Targets"
2. 应该看到 `gomoku` job
3. 状态应该是 "UP"

### 2. 查询指标

在Prometheus UI的查询框中尝试：

```promql
# 查看HTTP请求总数
gomoku_http_requests_total

# 查看WebSocket连接数
gomoku_websocket_connections

# 查看游戏总数
gomoku_games_total
```

### 3. 测试指标抓取

```bash
# 检查Prometheus是否能访问应用指标
curl http://localhost:3000/metrics

# 检查Prometheus状态
curl http://localhost:9090/-/healthy
```

---

## 常用PromQL查询

### 系统指标

```promql
# CPU使用率
rate(gomoku_process_cpu_seconds_total[5m])

# 内存使用
gomoku_process_resident_memory_bytes / 1024 / 1024

# 文件描述符
gomoku_process_open_fds
```

### HTTP指标

```promql
# 请求速率（每秒）
rate(gomoku_http_requests_total[5m])

# 平均响应时间
rate(gomoku_http_request_duration_seconds_sum[5m]) / rate(gomoku_http_request_duration_seconds_count[5m])

# 按状态码分组的请求
sum by(status_code) (rate(gomoku_http_requests_total[5m]))
```

### WebSocket指标

```promql
# 当前连接数
gomoku_websocket_connections

# 活跃房间数
gomoku_active_rooms
```

### 游戏指标

```promql
# 游戏完成率（每分钟）
rate(gomoku_games_total[1m])

# 按结果分组的游戏数
sum by(result) (gomoku_games_total)

# 平均游戏时长
rate(gomoku_game_duration_seconds_sum[5m]) / rate(gomoku_game_duration_seconds_count[5m])
```

### 数据库指标

```promql
# 数据库查询速率
rate(gomoku_db_queries_total[5m])

# 平均查询时间
rate(gomoku_db_query_duration_seconds_sum[5m]) / rate(gomoku_db_query_duration_seconds_count[5m])
```

---

## 创建仪表板

### 推荐面板

1. **系统概览**
   - CPU使用率
   - 内存使用
   - 事件循环延迟

2. **HTTP性能**
   - 请求速率
   - 响应时间
   - 错误率

3. **游戏统计**
   - 活跃连接
   - 游戏完成数
   - 房间数量

4. **数据库性能**
   - 查询速率
   - 查询延迟
   - 连接池状态

---

## 故障排查

### Prometheus无法启动

```bash
# 检查配置文件语法
docker run --rm -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus:latest \
  promtool check config /etc/prometheus/prometheus.yml
```

### 无法抓取指标

1. 检查应用是否运行:
```bash
curl http://localhost:3000/metrics
```

2. 检查Prometheus日志:
```bash
docker logs prometheus
```

3. 检查网络连接:
```bash
docker exec prometheus wget -O- http://host.docker.internal:3000/metrics
```

### 指标不更新

1. 检查scrape_interval配置
2. 查看Prometheus Target状态
3. 重启Prometheus容器

---

## 当前监控状态

### 应用指标端点
✅ **可用**: http://localhost:3000/metrics

### 可用指标数量
✅ **15+ 自定义指标**

### 指标示例
```bash
# 查看所有指标
curl -s http://localhost:3000/metrics | grep "^gomoku_" | head -20
```

---

## 下一步：配置Grafana

安装Grafana后，可以导入我们的仪表板：

```bash
# 启动Grafana
docker run -d \
  --name grafana \
  -p 3001:3000 \
  grafana/grafana:latest

# 访问: http://localhost:3001
# 默认账号: admin/admin
```

在Grafana中添加Prometheus数据源：
- URL: `http://host.docker.internal:9090`

---

## 快速测试（无需安装Prometheus）

你可以直接访问应用的指标端点：

```bash
# 查看所有Prometheus格式的指标
curl http://localhost:3000/metrics

# 查看特定指标
curl http://localhost:3000/metrics | grep gomoku_http_requests_total

# 实时监控
watch -n 1 'curl -s http://localhost:3000/metrics | grep gomoku_websocket_connections'
```

---

**提示**: 如果Docker镜像拉取缓慢，可以先使用curl命令查看指标，或等待镜像下载完成后再启动Prometheus。
