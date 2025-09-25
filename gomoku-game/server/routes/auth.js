const express = require('express');
const AuthController = require('../controllers/AuthController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 公开路由（无需认证）
router.post('/register', AuthController.getRegistrationValidation(), AuthController.register);
router.post('/login', AuthController.getLoginValidation(), AuthController.login);

// 需要认证的路由
router.use(authenticateToken);

router.post('/logout', AuthController.logout);
router.post('/refresh', AuthController.refreshToken);
router.get('/profile', AuthController.getProfile);
router.put('/profile', AuthController.updateProfile);
router.put('/change-password', AuthController.changePassword);
router.get('/stats', AuthController.getUserStats);

module.exports = router;
