// Legend 五子棋游戏客户端
class GomokuGame {
    constructor() {
        this.socket = null;
        this.canvas = null;
        this.ctx = null;
        this.board = [];
        this.currentPlayer = 'black';
        this.gameState = 'waiting'; // waiting, playing, finished
        this.roomId = null;
        this.playerColor = null;
        this.isMyTurn = false;
        this.moveHistory = [];
        this.username = '游客'; // 默认用户名

        // 游戏常量
        this.BOARD_SIZE = 15;
        this.CELL_SIZE = 40;
        this.STONE_RADIUS = 18;
        this.BOARD_MARGIN = 20;

        this.init();
    }

    init() {
        this.initBoard();
        this.initCanvas();
        this.initSocket();
        this.bindEvents();
        this.updateUI();
    }

    initBoard() {
        this.board = [];
        for (let i = 0; i < this.BOARD_SIZE; i++) {
            this.board[i] = [];
            for (let j = 0; j < this.BOARD_SIZE; j++) {
                this.board[i][j] = 0; // 0: 空, 1: 黑棋, 2: 白棋
            }
        }
    }

    initCanvas() {
        this.canvas = document.getElementById('game-board');
        this.ctx = this.canvas.getContext('2d');

        // 设置canvas实际尺寸
        const canvasSize = this.BOARD_SIZE * this.CELL_SIZE + this.BOARD_MARGIN * 2;
        this.canvas.width = canvasSize;
        this.canvas.height = canvasSize;

        this.drawBoard();

        // 绑定点击事件
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
    }

    drawBoard() {
        const ctx = this.ctx;
        const canvasSize = this.canvas.width;

        // 清空画布
        ctx.clearRect(0, 0, canvasSize, canvasSize);

        // 绘制背景
        ctx.fillStyle = '#DEB887';
        ctx.fillRect(0, 0, canvasSize, canvasSize);

        // 绘制网格线
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 1;

        for (let i = 0; i < this.BOARD_SIZE; i++) {
            const pos = this.BOARD_MARGIN + i * this.CELL_SIZE;

            // 垂直线
            ctx.beginPath();
            ctx.moveTo(pos, this.BOARD_MARGIN);
            ctx.lineTo(pos, canvasSize - this.BOARD_MARGIN);
            ctx.stroke();

            // 水平线
            ctx.beginPath();
            ctx.moveTo(this.BOARD_MARGIN, pos);
            ctx.lineTo(canvasSize - this.BOARD_MARGIN, pos);
            ctx.stroke();
        }

        // 绘制天元和星位
        const starPoints = [
            [3, 3], [3, 11], [7, 7], [11, 3], [11, 11]
        ];

        ctx.fillStyle = '#8B4513';
        starPoints.forEach(([x, y]) => {
            const centerX = this.BOARD_MARGIN + x * this.CELL_SIZE;
            const centerY = this.BOARD_MARGIN + y * this.CELL_SIZE;

            ctx.beginPath();
            ctx.arc(centerX, centerY, 3, 0, 2 * Math.PI);
            ctx.fill();
        });

        // 绘制棋子
        this.drawStones();
    }

    drawStones() {
        for (let row = 0; row < this.BOARD_SIZE; row++) {
            for (let col = 0; col < this.BOARD_SIZE; col++) {
                if (this.board[row][col] !== 0) {
                    this.drawStone(row, col, this.board[row][col]);
                }
            }
        }
    }

    drawStone(row, col, player) {
        const ctx = this.ctx;
        const centerX = this.BOARD_MARGIN + col * this.CELL_SIZE;
        const centerY = this.BOARD_MARGIN + row * this.CELL_SIZE;

        // 绘制阴影
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(centerX + 2, centerY + 2, this.STONE_RADIUS, 0, 2 * Math.PI);
        ctx.fill();

        // 绘制棋子
        if (player === 1) { // 黑棋
            const gradient = ctx.createRadialGradient(
                centerX - 5, centerY - 5, 2,
                centerX, centerY, this.STONE_RADIUS
            );
            gradient.addColorStop(0, '#666');
            gradient.addColorStop(1, '#000');
            ctx.fillStyle = gradient;
        } else { // 白棋
            const gradient = ctx.createRadialGradient(
                centerX - 5, centerY - 5, 2,
                centerX, centerY, this.STONE_RADIUS
            );
            gradient.addColorStop(0, '#fff');
            gradient.addColorStop(1, '#ddd');
            ctx.fillStyle = gradient;
        }

        ctx.beginPath();
        ctx.arc(centerX, centerY, this.STONE_RADIUS, 0, 2 * Math.PI);
        ctx.fill();

        // 绘制边框
        ctx.strokeStyle = player === 1 ? '#333' : '#999';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    handleCanvasClick(e) {
        if (!this.canPlay()) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // 转换为棋盘坐标
        const col = Math.round((x - this.BOARD_MARGIN) / this.CELL_SIZE);
        const row = Math.round((y - this.BOARD_MARGIN) / this.CELL_SIZE);

        // 检查坐标是否有效
        if (row < 0 || row >= this.BOARD_SIZE || col < 0 || col >= this.BOARD_SIZE) {
            return;
        }

        // 检查位置是否已被占用
        if (this.board[row][col] !== 0) {
            this.showMessage('该位置已有棋子！');
            return;
        }

        // 发送下棋请求
        this.makeMove(row, col);
    }

    makeMove(row, col) {
        if (!this.socket || !this.roomId) {
            this.showMessage('请先加入房间！');
            return;
        }

        // 发送字符串格式的玩家颜色（与服务器端匹配）
        this.socket.emit('make-move', {
            roomId: this.roomId,
            row: row,
            col: col,
            player: this.playerColor // 发送 'black' 或 'white' 字符串
        });
    }

    canPlay() {
        return this.gameState === 'playing' &&
               this.isMyTurn &&
               this.roomId &&
               this.playerColor;
    }

    initSocket() {
        console.log('初始化Socket连接...');
        // 检查是否有认证token（这里简化处理，实际应用中需要真实的认证）
        const token = localStorage.getItem('authToken') || this.generateGuestToken();
        console.log('使用token:', token.substring(0, 20) + '...');

        // 断线重连配置
        this.socket = io({
            auth: {
                token: token
            },
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000
        });

        // 连接成功
        this.socket.on('connect', () => {
            console.log('✅ Socket连接成功, ID:', this.socket.id);
            this.updateConnectionStatus(true);
        });

        // 连接断开
        this.socket.on('disconnect', () => {
            console.log('❌ Socket连接断开');
            this.updateConnectionStatus(false);
            this.showMessage('连接已断开，正在尝试重新连接...');
        });

        // 重连尝试
        this.socket.on('reconnect_attempt', (attemptNumber) => {
            console.log(`🔄 尝试重新连接... (${attemptNumber}/5)`);
            this.showMessage(`正在重新连接 (${attemptNumber}/5)...`);
        });

        // 重连成功
        this.socket.on('reconnect', (attemptNumber) => {
            console.log(`✅ 重新连接成功 (尝试了${attemptNumber}次)`);
            this.showMessage('重新连接成功！');
            this.updateConnectionStatus(true);

            // 如果在房间中，尝试重新加入
            if (this.roomId) {
                console.log('重新加入房间:', this.roomId);
                this.socket.emit('join-room', { roomId: this.roomId });
            }
        });

        // 重连失败
        this.socket.on('reconnect_failed', () => {
            console.log('❌ 重新连接失败');
            this.showMessage('无法连接到服务器，请刷新页面重试');
        });

        // 房间创建成功
        this.socket.on('room-created', (data) => {
            this.roomId = data.roomId;
            this.playerColor = data.color;
            this.updateRoomInfo();
            this.showMessage(`房间创建成功！房间ID: ${data.roomId}`);
        });

        // 加入房间成功
        this.socket.on('room-joined', (data) => {
            this.roomId = data.roomId;
            this.playerColor = data.color;
            this.updateRoomInfo();
            this.showMessage(`成功加入房间: ${data.roomId}`);
        });

        // 玩家加入
        this.socket.on('player-joined', (data) => {
            this.updatePlayerCount(data.playerCount);
            this.showMessage('有玩家加入了房间');
        });

        // 游戏开始
        this.socket.on('game-start', (data) => {
            this.gameState = 'playing';
            this.isMyTurn = this.playerColor === 'black'; // 黑棋先手
            this.showMessage('游戏开始！');
            this.updateUI();
        });

        // 棋子移动
        this.socket.on('move-made', (data) => {
            // 服务器现在发送字符串格式的颜色，需要转换为数字存储在board中
            const playerNum = data.player === 'black' ? 1 : 2;
            this.board[data.row][data.col] = playerNum;
            this.drawBoard();

            // 更新当前玩家
            this.currentPlayer = data.nextPlayer;
            this.isMyTurn = (this.playerColor === data.nextPlayer);

            // 添加到历史记录
            this.addMoveToHistory(data.row, data.col, data.player);
            this.updateUI();
        });

        // 游戏结束
        this.socket.on('game-over', (data) => {
            this.gameState = 'finished';
            this.isMyTurn = false;

            let message = '';
            if (data.winner === null) {
                message = '平局！';
            } else {
                const winnerColor = data.winner === 'black' ? '黑棋' : '白棋';
                message = `${winnerColor}获胜！`;

                // 绘制获胜线
                if (data.winningLine) {
                    this.drawWinningLine(data.winningLine);
                }
            }

            this.showGameOverModal(message);
            this.updateUI();
        });

        // 游戏重启
        this.socket.on('game-restart', () => {
            this.initBoard();
            this.gameState = 'playing';
            this.currentPlayer = 'black';
            this.isMyTurn = (this.playerColor === 'black');
            this.moveHistory = [];
            this.drawBoard();
            this.updateUI();
            this.showMessage('游戏已重新开始！');
        });

        // 玩家离开
        this.socket.on('player-left', (data) => {
            this.showMessage('对方离开了房间');
            this.gameState = 'waiting';
            this.updateUI();
        });

        // 聊天消息
        this.socket.on('chat-message', (data) => {
            this.addChatMessage(data.sender, data.message, data.timestamp);
        });

        // 错误处理
        this.socket.on('room-error', (data) => {
            this.showMessage(`房间错误: ${data.message}`);
        });

        this.socket.on('game-error', (data) => {
            this.showMessage(`游戏错误: ${data.message}`);
        });

        // 用户名更新确认
        this.socket.on('username-updated', (data) => {
            console.log('用户名更新成功:', data.username);
            // 如果服务器返回了新token，更新本地存储
            if (data.token) {
                localStorage.setItem('authToken', data.token);
            }
        });

        // 用户名更新错误
        this.socket.on('username-error', (data) => {
            this.showMessage(`用户名更新失败: ${data.message}`);
        });

        // 连接错误
        this.socket.on('connect_error', (error) => {
            console.error('❌ Socket连接错误:', error.message);
            this.showMessage('连接服务器失败: ' + error.message);
        });
    }

    generateGuestToken() {
        // 生成游客token（简化处理）
        const guestId = 'guest_' + Math.random().toString(36).substr(2, 9);
        const tokenData = JSON.stringify({
            id: guestId,
            username: this.username, // 使用设置的用户名
            type: 'guest'
        });

        // 将UTF-8字符串转换为base64（支持中文）
        const token = btoa(encodeURIComponent(tokenData).replace(/%([0-9A-F]{2})/g,
            function toSolidBytes(match, p1) {
                return String.fromCharCode('0x' + p1);
            }));

        localStorage.setItem('authToken', token);
        return token;
    }

    drawWinningLine(winningLine) {
        if (!winningLine || winningLine.length < 2) return;

        const ctx = this.ctx;
        const startPos = winningLine[0];
        const endPos = winningLine[winningLine.length - 1];

        const startX = this.BOARD_MARGIN + startPos[1] * this.CELL_SIZE;
        const startY = this.BOARD_MARGIN + startPos[0] * this.CELL_SIZE;
        const endX = this.BOARD_MARGIN + endPos[1] * this.CELL_SIZE;
        const endY = this.BOARD_MARGIN + endPos[0] * this.CELL_SIZE;

        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
    }

    bindEvents() {
        // 设置用户名
        document.getElementById('set-username').addEventListener('click', () => {
            console.log('设置用户名按钮被点击');
            const newUsername = document.getElementById('username-input').value.trim();
            console.log('用户名输入值:', newUsername);
            if (newUsername && newUsername.length >= 2) {
                this.setUsername(newUsername);
                document.getElementById('username-input').value = '';
            } else {
                this.showMessage('用户名至少需要2个字符！');
            }
        });

        // 用户名输入框回车设置
        document.getElementById('username-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('set-username').click();
            }
        });

        // 创建房间
        document.getElementById('create-room').addEventListener('click', () => {
            console.log('创建房间按钮被点击');
            if (!this.socket) {
                console.error('Socket未初始化');
                this.showMessage('请等待连接服务器！');
                return;
            }

            if (!this.socket.connected) {
                console.error('Socket未连接');
                this.showMessage('未连接到服务器，请刷新页面！');
                return;
            }

            console.log('发送创建房间请求');
            this.socket.emit('create-room', {
                roomName: '五子棋房间',
                isPrivate: false
            });
        });

        // 加入房间
        document.getElementById('join-room').addEventListener('click', () => {
            const roomId = document.getElementById('room-id').value.trim();

            if (!roomId) {
                this.showMessage('请输入房间ID！');
                return;
            }

            if (!this.socket) {
                this.showMessage('请等待连接服务器！');
                return;
            }

            this.socket.emit('join-room', { roomId: roomId });
        });

        // 离开房间
        document.getElementById('leave-room').addEventListener('click', () => {
            if (!this.roomId) return;

            this.socket.emit('leave-room', { roomId: this.roomId });
            this.resetGame();
        });

        // 重新开始游戏
        document.getElementById('restart-game').addEventListener('click', () => {
            if (!this.roomId) {
                this.showMessage('请先加入房间！');
                return;
            }

            this.socket.emit('restart-game', { roomId: this.roomId });
        });

        // 认输
        document.getElementById('surrender').addEventListener('click', () => {
            if (!this.roomId || this.gameState !== 'playing') {
                this.showMessage('当前无法认输！');
                return;
            }

            if (confirm('确定要认输吗？')) {
                this.socket.emit('surrender', { roomId: this.roomId });
            }
        });

        // 发送聊天消息
        document.getElementById('send-chat').addEventListener('click', () => {
            this.sendChatMessage();
        });

        document.getElementById('chat-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendChatMessage();
            }
        });

        // 房间ID输入回车加入
        document.getElementById('room-id').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('join-room').click();
            }
        });

        // 模态框事件
        document.getElementById('modal-ok').addEventListener('click', () => {
            this.hideModal();
        });

        document.getElementById('modal-restart').addEventListener('click', () => {
            this.hideModal();
            document.getElementById('restart-game').click();
        });
    }

    sendChatMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();

        if (!message || !this.roomId) return;

        this.socket.emit('chat-message', {
            roomId: this.roomId,
            message: message
        });

        // 添加自己的消息到聊天框
        this.addChatMessage('我', message, new Date().toISOString());
        input.value = '';
    }

    addChatMessage(sender, message, timestamp) {
        const chatMessages = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message';

        // 修复时间戳显示问题
        let time;
        if (timestamp) {
            try {
                time = new Date(timestamp).toLocaleTimeString();
                // 如果时间无效，使用当前时间
                if (time === 'Invalid Date') {
                    time = new Date().toLocaleTimeString();
                }
            } catch (e) {
                time = new Date().toLocaleTimeString();
            }
        } else {
            time = new Date().toLocaleTimeString();
        }

        messageDiv.innerHTML = `
            <span class="sender">${sender}:</span>
            ${this.escapeHtml(message)}
            <span class="timestamp">${time}</span>
        `;

        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    setUsername(newUsername) {
        this.username = newUsername;

        // 更新显示的用户名
        document.getElementById('current-username').textContent = this.username;

        // 如果已连接到服务器，直接发送更新请求
        if (this.socket && this.socket.connected) {
            this.socket.emit('update-username', { username: this.username });
        } else {
            // 如果还未连接，更新存储的token
            localStorage.removeItem('authToken');
        }

        this.showMessage(`用户名已设置为: ${this.username}`);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    addMoveToHistory(row, col, player) {
        this.moveHistory.push({ row, col, player });

        const historyDiv = document.getElementById('move-history');
        const moveDiv = document.createElement('div');
        moveDiv.textContent = `${this.moveHistory.length}. ${player === 'black' ? '●' : '○'} (${row + 1}, ${col + 1})`;

        historyDiv.appendChild(moveDiv);
        historyDiv.scrollTop = historyDiv.scrollHeight;
    }

    updateUI() {
        // 更新当前玩家显示
        const indicator = document.querySelector('.player-indicator');
        const playerText = document.getElementById('current-player-text');

        if (this.gameState === 'playing') {
            indicator.className = `player-indicator ${this.currentPlayer}`;
            playerText.textContent = this.isMyTurn ? '轮到你下棋' : '等待对方下棋';
        } else {
            playerText.textContent = this.gameState === 'waiting' ? '等待开始游戏' : '游戏结束';
        }

        // 更新游戏状态
        const statusElement = document.getElementById('game-status');
        if (this.roomId) {
            statusElement.textContent = `房间: ${this.roomId} | 你是${this.playerColor === 'black' ? '黑棋' : '白棋'}`;
        } else {
            statusElement.textContent = '未连接房间';
        }

        // 更新按钮状态
        this.updateButtonStates();
    }

    updateButtonStates() {
        const createBtn = document.getElementById('create-room');
        const joinBtn = document.getElementById('join-room');
        const leaveBtn = document.getElementById('leave-room');
        const restartBtn = document.getElementById('restart-game');
        const surrenderBtn = document.getElementById('surrender');

        const inRoom = !!this.roomId;
        const canPlay = this.gameState === 'playing';

        createBtn.disabled = inRoom;
        joinBtn.disabled = inRoom;
        leaveBtn.style.display = inRoom ? 'inline-block' : 'none';
        restartBtn.disabled = !inRoom;
        surrenderBtn.disabled = !canPlay;
    }

    updateRoomInfo() {
        const roomDisplay = document.getElementById('room-display');
        roomDisplay.textContent = this.roomId ? `房间: ${this.roomId}` : '未连接房间';
        roomDisplay.className = this.roomId ? 'room-status status-connected' : 'room-status status-disconnected';
    }

    updatePlayerCount(count) {
        const playerCount = document.getElementById('player-count');
        playerCount.textContent = `玩家: ${count}/2`;
    }

    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('game-status');
        if (connected) {
            statusElement.classList.remove('status-disconnected');
            statusElement.classList.add('status-connected');
        } else {
            statusElement.classList.remove('status-connected');
            statusElement.classList.add('status-disconnected');
        }
    }

    showMessage(message) {
        // 简单的消息提示，可以替换为更好的UI组件
        const existingToast = document.querySelector('.toast-message');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = 'toast-message';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #333;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.3s;
        `;

        document.body.appendChild(toast);

        // 显示动画
        setTimeout(() => {
            toast.style.opacity = '1';
        }, 10);

        // 自动移除
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    showGameOverModal(message) {
        const modal = document.getElementById('game-modal');
        const title = document.getElementById('modal-title');
        const messageElement = document.getElementById('modal-message');

        title.textContent = '游戏结束';
        messageElement.textContent = message;
        modal.classList.add('show');
    }

    hideModal() {
        const modal = document.getElementById('game-modal');
        modal.classList.remove('show');
    }

    resetGame() {
        this.roomId = null;
        this.playerColor = null;
        this.gameState = 'waiting';
        this.isMyTurn = false;
        this.currentPlayer = 'black';
        this.moveHistory = [];

        this.initBoard();
        this.drawBoard();
        this.updateUI();

        // 清空聊天记录
        document.getElementById('chat-messages').innerHTML = '';

        // 清空历史记录
        document.getElementById('move-history').innerHTML = '';

        // 清空房间ID输入
        document.getElementById('room-id').value = '';
    }
}

// 页面加载完成后初始化游戏
document.addEventListener('DOMContentLoaded', () => {
    console.log('页面加载完成，初始化游戏...');
    try {
        window.game = new GomokuGame();
        console.log('游戏初始化成功');
    } catch (error) {
        console.error('游戏初始化失败:', error);
        alert('游戏初始化失败: ' + error.message);
    }
});

// 防止页面刷新时丢失连接
window.addEventListener('beforeunload', () => {
    if (window.game && window.game.socket) {
        window.game.socket.disconnect();
    }
});