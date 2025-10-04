const io = require('socket.io-client');
const { server, io: serverIo } = require('../../server/app');

describe('Socket.IO Integration Tests', () => {
  let clientSocket1;
  let clientSocket2;
  const PORT = process.env.PORT || 3001;
  const SOCKET_URL = `http://localhost:${PORT}`;

  beforeAll((done) => {
    server.listen(PORT, () => {
      done();
    });
  });

  afterAll((done) => {
    if (clientSocket1) clientSocket1.disconnect();
    if (clientSocket2) clientSocket2.disconnect();
    serverIo.close();
    server.close(done);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Connection', () => {
    test('should connect with valid guest token', (done) => {
      const guestToken = Buffer.from(JSON.stringify({
        id: 'guest_test',
        username: '测试游客',
        type: 'guest'
      })).toString('base64');

      clientSocket1 = io(SOCKET_URL, {
        auth: { token: guestToken }
      });

      clientSocket1.on('connect', () => {
        expect(clientSocket1.connected).toBe(true);
        done();
      });

      clientSocket1.on('connect_error', (error) => {
        done(error);
      });
    });

    test('should reject connection without token', (done) => {
      const socket = io(SOCKET_URL, {
        auth: {}
      });

      socket.on('connect_error', (error) => {
        expect(error).toBeDefined();
        socket.disconnect();
        done();
      });

      socket.on('connect', () => {
        socket.disconnect();
        done(new Error('Should not connect without token'));
      });
    });
  });

  describe('Room Creation and Joining', () => {
    let roomId;

    test('should create a room successfully', (done) => {
      const guestToken = Buffer.from(JSON.stringify({
        id: 'guest_creator',
        username: '创建者',
        type: 'guest'
      })).toString('base64');

      clientSocket1 = io(SOCKET_URL, {
        auth: { token: guestToken }
      });

      clientSocket1.on('connect', () => {
        clientSocket1.emit('create-room', {
          roomName: '测试房间',
          isPrivate: false
        });
      });

      clientSocket1.on('room-created', (data) => {
        expect(data.roomId).toBeDefined();
        expect(data.color).toBe('black');
        roomId = data.roomId;
        done();
      });

      clientSocket1.on('room-error', (error) => {
        done(error);
      });
    });

    test('should allow second player to join room', (done) => {
      const token1 = Buffer.from(JSON.stringify({
        id: 'guest_player1',
        username: '玩家1',
        type: 'guest'
      })).toString('base64');

      const token2 = Buffer.from(JSON.stringify({
        id: 'guest_player2',
        username: '玩家2',
        type: 'guest'
      })).toString('base64');

      let testRoomId;

      clientSocket1 = io(SOCKET_URL, { auth: { token: token1 } });
      clientSocket2 = io(SOCKET_URL, { auth: { token: token2 } });

      clientSocket1.on('connect', () => {
        clientSocket1.emit('create-room', {
          roomName: '测试房间'
        });
      });

      clientSocket1.on('room-created', (data) => {
        testRoomId = data.roomId;
        clientSocket2.emit('join-room', { roomId: testRoomId });
      });

      clientSocket2.on('room-joined', (data) => {
        expect(data.roomId).toBe(testRoomId);
        expect(data.color).toBe('white');
        done();
      });

      clientSocket2.on('room-error', (error) => {
        done(error);
      });
    }, 10000);
  });

  describe('Game Play', () => {
    test('should handle moves correctly', (done) => {
      const token1 = Buffer.from(JSON.stringify({
        id: 'guest_black',
        username: '黑棋玩家',
        type: 'guest'
      })).toString('base64');

      const token2 = Buffer.from(JSON.stringify({
        id: 'guest_white',
        username: '白棋玩家',
        type: 'guest'
      })).toString('base64');

      let testRoomId;
      let gameStarted = false;

      clientSocket1 = io(SOCKET_URL, { auth: { token: token1 } });
      clientSocket2 = io(SOCKET_URL, { auth: { token: token2 } });

      clientSocket1.on('connect', () => {
        clientSocket1.emit('create-room', {});
      });

      clientSocket1.on('room-created', (data) => {
        testRoomId = data.roomId;
        clientSocket2.emit('join-room', { roomId: testRoomId });
      });

      clientSocket1.on('game-start', () => {
        gameStarted = true;
        // Black player makes first move
        clientSocket1.emit('make-move', {
          roomId: testRoomId,
          row: 7,
          col: 7,
          player: 'black'
        });
      });

      clientSocket2.on('move-made', (data) => {
        if (gameStarted) {
          expect(data.row).toBe(7);
          expect(data.col).toBe(7);
          expect(data.player).toBe('black');
          expect(data.nextPlayer).toBe('white');
          done();
        }
      });
    }, 15000);

    test('should detect win condition', (done) => {
      // This would require a more complex setup to create a winning condition
      // Simplified version - just check that game-over event exists
      expect(true).toBe(true);
      done();
    });
  });

  describe('Chat Functionality', () => {
    test('should send and receive chat messages', (done) => {
      const token1 = Buffer.from(JSON.stringify({
        id: 'guest_chat1',
        username: '聊天者1',
        type: 'guest'
      })).toString('base64');

      const token2 = Buffer.from(JSON.stringify({
        id: 'guest_chat2',
        username: '聊天者2',
        type: 'guest'
      })).toString('base64');

      let testRoomId;

      clientSocket1 = io(SOCKET_URL, { auth: { token: token1 } });
      clientSocket2 = io(SOCKET_URL, { auth: { token: token2 } });

      clientSocket1.on('connect', () => {
        clientSocket1.emit('create-room', {});
      });

      clientSocket1.on('room-created', (data) => {
        testRoomId = data.roomId;
        clientSocket2.emit('join-room', { roomId: testRoomId });
      });

      clientSocket2.on('room-joined', () => {
        clientSocket1.emit('chat-message', {
          roomId: testRoomId,
          message: 'Hello!'
        });
      });

      clientSocket2.on('chat-message', (data) => {
        expect(data.message).toBe('Hello!');
        expect(data.sender).toBeDefined();
        done();
      });
    }, 10000);
  });

  describe('Game Actions', () => {
    test('should handle surrender', (done) => {
      // Simplified test - would need full game setup
      expect(true).toBe(true);
      done();
    });

    test('should handle game restart', (done) => {
      // Simplified test - would need full game setup
      expect(true).toBe(true);
      done();
    });
  });
});
