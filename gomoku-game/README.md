# 五子棋游戏

一个基于 WebSocket 的双人对战五子棋游戏。

## 功能特性

- 15x15 标准五子棋棋盘
- 实时双人对战
- 房间系统
- 实时同步
- 响应式设计

## 技术栈

- 前端：HTML5 + CSS3 + JavaScript
- 后端：Node.js + Express
- 实时通信：Socket.io

## 安装和运行

1. 安装依赖：
```bash
npm install
```

2. 启动服务器：
```bash
npm start
```

3. 打开浏览器访问：http://localhost:3000

## 开发模式

```bash
npm run dev
```

## 项目结构

```
gomoku-game/
├── public/          # 前端文件
│   ├── index.html
│   ├── style.css
│   └── script.js
├── server/          # 后端文件
│   └── server.js
├── package.json
└── README.md
```
