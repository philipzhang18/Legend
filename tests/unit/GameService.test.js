const GameService = require('../../server/services/GameService');
const GameRoom = require('../../server/models/GameRoom');

// Mock dependencies
jest.mock('../../server/models/GameRoom');
jest.mock('../../server/config/database', () => ({
  db: {
    raw: jest.fn(),
    select: jest.fn(),
    insert: jest.fn(),
    where: jest.fn(),
    update: jest.fn(),
  }
}));

describe('GameService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createRoom', () => {
    test('should create a new room successfully', async () => {
      const mockRoom = {
        id: 1,
        room_code: 'ABC123',
        creator_id: 'user123',
        black_player_id: 'user123',
        status: 'waiting'
      };

      GameRoom.create = jest.fn().mockResolvedValue(mockRoom);

      const result = await GameService.createRoom('user123', {
        roomName: 'Test Room',
        isPrivate: false
      });

      expect(result).toEqual(mockRoom);
      expect(GameRoom.create).toHaveBeenCalledWith(
        'user123',
        expect.objectContaining({
          roomName: 'Test Room',
          isPrivate: false
        })
      );
    });

    test('should handle errors when creating room', async () => {
      GameRoom.create = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(GameService.createRoom('user123', {}))
        .rejects.toThrow('Database error');
    });
  });

  describe('joinRoom', () => {
    test('should join room as white player when room has one player', async () => {
      const mockRoom = {
        room_code: 'ABC123',
        black_player_id: 'user123',
        white_player_id: null,
        status: 'waiting'
      };

      GameRoom.findByCode = jest.fn().mockResolvedValue(mockRoom);
      GameRoom.addPlayer = jest.fn().mockResolvedValue(true);

      const result = await GameService.joinRoom('user456', 'ABC123');

      expect(result.color).toBe('white');
      expect(result.playerCount).toBe(2);
      expect(GameRoom.addPlayer).toHaveBeenCalledWith('ABC123', 'user456', 'white');
    });

    test('should reject joining a full room', async () => {
      const mockRoom = {
        room_code: 'ABC123',
        black_player_id: 'user123',
        white_player_id: 'user456',
        status: 'playing'
      };

      GameRoom.findByCode = jest.fn().mockResolvedValue(mockRoom);

      await expect(GameService.joinRoom('user789', 'ABC123'))
        .rejects.toThrow('房间已满');
    });

    test('should reject joining non-existent room', async () => {
      GameRoom.findByCode = jest.fn().mockResolvedValue(null);

      await expect(GameService.joinRoom('user123', 'INVALID'))
        .rejects.toThrow('房间不存在');
    });
  });

  describe('makeMove', () => {
    test('should place stone successfully', async () => {
      const mockRoom = {
        room_code: 'ABC123',
        black_player_id: 'user123',
        white_player_id: 'user456',
        status: 'playing',
        current_player: 'black',
        board_state: JSON.stringify(Array(15).fill(Array(15).fill(0)))
      };

      GameRoom.findByCode = jest.fn().mockResolvedValue(mockRoom);
      GameRoom.updateBoardState = jest.fn().mockResolvedValue(true);

      const result = await GameService.makeMove('user123', 'ABC123', 7, 7, 'black');

      expect(result.success).toBe(true);
      expect(result.nextPlayer).toBe('white');
    });

    test('should detect win condition', async () => {
      // Create a board with 4 black stones in a row
      const board = Array(15).fill(null).map(() => Array(15).fill(0));
      board[7][7] = 1;
      board[7][8] = 1;
      board[7][9] = 1;
      board[7][10] = 1;

      const mockRoom = {
        room_code: 'ABC123',
        black_player_id: 'user123',
        white_player_id: 'user456',
        status: 'playing',
        current_player: 'black',
        board_state: JSON.stringify(board)
      };

      GameRoom.findByCode = jest.fn().mockResolvedValue(mockRoom);
      GameRoom.updateBoardState = jest.fn().mockResolvedValue(true);

      const result = await GameService.makeMove('user123', 'ABC123', 7, 11, 'black');

      expect(result.gameOver).toBe(true);
      expect(result.winner).toBe('black');
      expect(result.winningLine).toBeDefined();
      expect(result.winningLine.length).toBe(5);
    });

    test('should reject move when not player turn', async () => {
      const mockRoom = {
        room_code: 'ABC123',
        black_player_id: 'user123',
        white_player_id: 'user456',
        status: 'playing',
        current_player: 'black',
        board_state: JSON.stringify(Array(15).fill(Array(15).fill(0)))
      };

      GameRoom.findByCode = jest.fn().mockResolvedValue(mockRoom);

      await expect(GameService.makeMove('user456', 'ABC123', 7, 7, 'white'))
        .rejects.toThrow('还没轮到你下棋');
    });

    test('should reject move on occupied position', async () => {
      const board = Array(15).fill(null).map(() => Array(15).fill(0));
      board[7][7] = 1; // Already has a stone

      const mockRoom = {
        room_code: 'ABC123',
        black_player_id: 'user123',
        white_player_id: 'user456',
        status: 'playing',
        current_player: 'black',
        board_state: JSON.stringify(board)
      };

      GameRoom.findByCode = jest.fn().mockResolvedValue(mockRoom);

      await expect(GameService.makeMove('user123', 'ABC123', 7, 7, 'black'))
        .rejects.toThrow('该位置已有棋子');
    });
  });

  describe('checkWinner', () => {
    test('should detect horizontal win', () => {
      const board = Array(15).fill(null).map(() => Array(15).fill(0));
      for (let i = 0; i < 5; i++) {
        board[7][i] = 1;
      }

      const result = GameService.checkWinner(board, 7, 4, 1);
      expect(result.isWin).toBe(true);
      expect(result.winningLine.length).toBe(5);
    });

    test('should detect vertical win', () => {
      const board = Array(15).fill(null).map(() => Array(15).fill(0));
      for (let i = 0; i < 5; i++) {
        board[i][7] = 2;
      }

      const result = GameService.checkWinner(board, 4, 7, 2);
      expect(result.isWin).toBe(true);
      expect(result.winningLine.length).toBe(5);
    });

    test('should detect diagonal win (top-left to bottom-right)', () => {
      const board = Array(15).fill(null).map(() => Array(15).fill(0));
      for (let i = 0; i < 5; i++) {
        board[i][i] = 1;
      }

      const result = GameService.checkWinner(board, 4, 4, 1);
      expect(result.isWin).toBe(true);
    });

    test('should detect diagonal win (top-right to bottom-left)', () => {
      const board = Array(15).fill(null).map(() => Array(15).fill(0));
      for (let i = 0; i < 5; i++) {
        board[i][4 - i] = 2;
      }

      const result = GameService.checkWinner(board, 4, 0, 2);
      expect(result.isWin).toBe(true);
    });

    test('should return false for no win', () => {
      const board = Array(15).fill(null).map(() => Array(15).fill(0));
      board[7][7] = 1;

      const result = GameService.checkWinner(board, 7, 7, 1);
      expect(result.isWin).toBe(false);
    });
  });

  describe('surrender', () => {
    test('should handle surrender correctly', async () => {
      const mockRoom = {
        room_code: 'ABC123',
        black_player_id: 'user123',
        white_player_id: 'user456',
        status: 'playing'
      };

      GameRoom.findByCode = jest.fn().mockResolvedValue(mockRoom);
      GameRoom.updateStatus = jest.fn().mockResolvedValue(true);

      const result = await GameService.surrender('user123', 'ABC123');

      expect(result.winner).toBe('white');
      expect(GameRoom.updateStatus).toHaveBeenCalledWith('ABC123', 'finished');
    });
  });

  describe('restartGame', () => {
    test('should restart game successfully', async () => {
      const mockRoom = {
        room_code: 'ABC123',
        black_player_id: 'user123',
        white_player_id: 'user456',
        status: 'finished'
      };

      GameRoom.findByCode = jest.fn().mockResolvedValue(mockRoom);
      GameRoom.resetBoard = jest.fn().mockResolvedValue(true);

      await GameService.restartGame('user123', 'ABC123');

      expect(GameRoom.resetBoard).toHaveBeenCalledWith('ABC123');
    });
  });
});
