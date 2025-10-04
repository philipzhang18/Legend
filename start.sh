#!/bin/bash

# 五子棋游戏启动脚本
# 支持快速启动和完整启动模式

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "========================================="
echo "  Legend Gomoku 五子棋游戏启动器"
echo "========================================="
echo ""

# 检查端口占用
check_port() {
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo -e "${YELLOW}⚠️  端口3000已被占用，正在停止...${NC}"
        lsof -ti:3000 | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
}

# 快速启动（仅应用，使用内存存储）
quick_start() {
    echo -e "${GREEN}🚀 快速启动模式（游客模式 + 内存存储）${NC}"
    echo ""

    check_port

    echo "启动应用服务器..."
    npm run dev &

    sleep 3

    echo ""
    echo -e "${GREEN}✅ 应用启动成功！${NC}"
    echo ""
    echo "📱 访问地址: http://localhost:3000"
    echo ""
    echo "可用功能:"
    echo "  ✅ 游戏对战"
    echo "  ✅ 房间系统"
    echo "  ✅ 聊天功能"
    echo "  ✅ 游客认证"
    echo "  ✅ 断线重连"
    echo ""
    echo "⚠️  注意: 数据不会持久化（重启后清空）"
    echo ""
}

# 完整启动（Docker + 所有服务）
full_start() {
    echo -e "${GREEN}🚀 完整启动模式（数据库 + Redis + 完整功能）${NC}"
    echo ""

    # 检查Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker未安装，请先安装Docker${NC}"
        exit 1
    fi

    check_port

    echo "启动PostgreSQL和Redis..."
    docker-compose up -d postgres redis

    echo "等待数据库就绪..."
    sleep 5

    echo "运行数据库迁移..."
    npm run db:migrate

    echo "插入测试数据..."
    npm run db:seed

    echo "启动应用服务器..."
    npm run dev &

    sleep 3

    echo ""
    echo -e "${GREEN}✅ 完整环境启动成功！${NC}"
    echo ""
    echo "📱 访问地址: http://localhost:3000"
    echo "📊 指标监控: http://localhost:3000/metrics"
    echo "💚 健康检查: http://localhost:3000/health"
    echo ""
    echo "可用功能:"
    echo "  ✅ 所有游戏功能"
    echo "  ✅ 用户注册/登录"
    echo "  ✅ ELO评分系统"
    echo "  ✅ 游戏历史回放"
    echo "  ✅ 排行榜"
    echo "  ✅ 观战功能"
    echo "  ✅ 数据持久化"
    echo ""
    echo "测试账号:"
    echo "  用户名: player1"
    echo "  密码: password123"
    echo ""
}

# 停止服务
stop_services() {
    echo -e "${YELLOW}🛑 停止所有服务...${NC}"

    # 停止Node.js进程
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true

    # 停止Docker容器
    docker-compose down 2>/dev/null || true

    echo -e "${GREEN}✅ 服务已停止${NC}"
}

# 查看状态
check_status() {
    echo "检查服务状态..."
    echo ""

    # 检查应用
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo -e "${GREEN}✅ 应用服务器: 运行中 (端口 3000)${NC}"
    else
        echo -e "${RED}❌ 应用服务器: 未运行${NC}"
    fi

    # 检查Docker服务
    if command -v docker &> /dev/null; then
        if docker ps | grep -q postgres; then
            echo -e "${GREEN}✅ PostgreSQL: 运行中${NC}"
        else
            echo -e "${RED}❌ PostgreSQL: 未运行${NC}"
        fi

        if docker ps | grep -q redis; then
            echo -e "${GREEN}✅ Redis: 运行中${NC}"
        else
            echo -e "${RED}❌ Redis: 未运行${NC}"
        fi
    fi

    echo ""
}

# 主菜单
case "${1:-menu}" in
    quick|q)
        quick_start
        ;;
    full|f)
        full_start
        ;;
    stop|s)
        stop_services
        ;;
    status|st)
        check_status
        ;;
    menu|*)
        echo "请选择启动模式:"
        echo ""
        echo "1) 快速启动    - 游客模式，内存存储（推荐新手）"
        echo "2) 完整启动    - 包含数据库，所有功能"
        echo "3) 查看状态    - 检查服务运行状态"
        echo "4) 停止服务    - 停止所有运行的服务"
        echo ""
        read -p "请输入选项 (1-4): " choice

        case $choice in
            1)
                quick_start
                ;;
            2)
                full_start
                ;;
            3)
                check_status
                ;;
            4)
                stop_services
                ;;
            *)
                echo -e "${RED}无效选项${NC}"
                exit 1
                ;;
        esac
        ;;
esac

echo ""
echo "提示: 按 Ctrl+C 可以停止应用"
echo "      运行 './start.sh stop' 可以停止所有服务"
echo ""

# 保持脚本运行
wait
