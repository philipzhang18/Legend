const AuthService = require('../../server/services/AuthService');
const User = require('../../server/models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock dependencies
jest.mock('../../server/models/User');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    test('should register a new user successfully', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      User.findByUsername = jest.fn().mockResolvedValue(null);
      User.findByEmail = jest.fn().mockResolvedValue(null);
      bcrypt.hash = jest.fn().mockResolvedValue('hashed_password');
      User.create = jest.fn().mockResolvedValue({
        id: 1,
        username: 'testuser',
        email: 'test@example.com'
      });

      const result = await AuthService.register(userData);

      expect(result.id).toBe(1);
      expect(result.username).toBe('testuser');
      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'testuser',
          email: 'test@example.com',
          password: 'hashed_password'
        })
      );
    });

    test('should reject duplicate username', async () => {
      const userData = {
        username: 'existinguser',
        email: 'new@example.com',
        password: 'password123'
      };

      User.findByUsername = jest.fn().mockResolvedValue({ id: 1 });

      await expect(AuthService.register(userData))
        .rejects.toThrow('用户名已存在');
    });

    test('should reject duplicate email', async () => {
      const userData = {
        username: 'newuser',
        email: 'existing@example.com',
        password: 'password123'
      };

      User.findByUsername = jest.fn().mockResolvedValue(null);
      User.findByEmail = jest.fn().mockResolvedValue({ id: 1 });

      await expect(AuthService.register(userData))
        .rejects.toThrow('邮箱已被使用');
    });

    test('should validate password length', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: '12345'
      };

      await expect(AuthService.register(userData))
        .rejects.toThrow('密码长度至少为6位');
    });

    test('should validate email format', async () => {
      const userData = {
        username: 'testuser',
        email: 'invalid-email',
        password: 'password123'
      };

      await expect(AuthService.register(userData))
        .rejects.toThrow('邮箱格式不正确');
    });
  });

  describe('login', () => {
    test('should login successfully with correct credentials', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashed_password',
        is_guest: false
      };

      User.findByUsername = jest.fn().mockResolvedValue(mockUser);
      bcrypt.compare = jest.fn().mockResolvedValue(true);
      jwt.sign = jest.fn().mockReturnValue('mock_jwt_token');

      const result = await AuthService.login('testuser', 'password123');

      expect(result.user.id).toBe(1);
      expect(result.token).toBe('mock_jwt_token');
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashed_password');
    });

    test('should reject login with wrong password', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        password: 'hashed_password'
      };

      User.findByUsername = jest.fn().mockResolvedValue(mockUser);
      bcrypt.compare = jest.fn().mockResolvedValue(false);

      await expect(AuthService.login('testuser', 'wrongpassword'))
        .rejects.toThrow('密码错误');
    });

    test('should reject login for non-existent user', async () => {
      User.findByUsername = jest.fn().mockResolvedValue(null);

      await expect(AuthService.login('nonexistent', 'password123'))
        .rejects.toThrow('用户不存在');
    });
  });

  describe('verifyToken', () => {
    test('should verify valid JWT token', () => {
      const mockDecoded = {
        id: 1,
        username: 'testuser',
        type: 'user'
      };

      jwt.verify = jest.fn().mockReturnValue(mockDecoded);

      const result = AuthService.verifyToken('valid_token');

      expect(result.id).toBe(1);
      expect(result.username).toBe('testuser');
    });

    test('should reject invalid token', () => {
      jwt.verify = jest.fn().mockImplementation(() => {
        throw new Error('Invalid token');
      });

      expect(() => AuthService.verifyToken('invalid_token'))
        .toThrow('Invalid token');
    });
  });

  describe('createGuestUser', () => {
    test('should create guest user successfully', async () => {
      const mockGuest = {
        id: 'guest_123',
        username: '游客123',
        is_guest: true
      };

      User.createGuest = jest.fn().mockResolvedValue(mockGuest);

      const result = await AuthService.createGuestUser();

      expect(result.is_guest).toBe(true);
      expect(result.username).toContain('游客');
    });
  });

  describe('updateUser', () => {
    test('should update user profile successfully', async () => {
      const updates = {
        nickname: 'NewNickname',
        avatar: 'avatar_url'
      };

      User.update = jest.fn().mockResolvedValue({
        id: 1,
        username: 'testuser',
        nickname: 'NewNickname',
        avatar: 'avatar_url'
      });

      const result = await AuthService.updateUser(1, updates);

      expect(result.nickname).toBe('NewNickname');
      expect(User.update).toHaveBeenCalledWith(1, updates);
    });

    test('should not allow updating username directly', async () => {
      const updates = {
        username: 'newusername'
      };

      await expect(AuthService.updateUser(1, updates))
        .rejects.toThrow('不能直接修改用户名');
    });
  });

  describe('changePassword', () => {
    test('should change password successfully', async () => {
      const mockUser = {
        id: 1,
        password: 'old_hashed_password'
      };

      User.findById = jest.fn().mockResolvedValue(mockUser);
      bcrypt.compare = jest.fn().mockResolvedValue(true);
      bcrypt.hash = jest.fn().mockResolvedValue('new_hashed_password');
      User.updatePassword = jest.fn().mockResolvedValue(true);

      await AuthService.changePassword(1, 'oldpassword', 'newpassword123');

      expect(bcrypt.compare).toHaveBeenCalledWith('oldpassword', 'old_hashed_password');
      expect(User.updatePassword).toHaveBeenCalledWith(1, 'new_hashed_password');
    });

    test('should reject password change with wrong old password', async () => {
      const mockUser = {
        id: 1,
        password: 'old_hashed_password'
      };

      User.findById = jest.fn().mockResolvedValue(mockUser);
      bcrypt.compare = jest.fn().mockResolvedValue(false);

      await expect(AuthService.changePassword(1, 'wrongpassword', 'newpassword123'))
        .rejects.toThrow('原密码错误');
    });
  });
});
