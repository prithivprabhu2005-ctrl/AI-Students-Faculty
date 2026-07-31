const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { optionalVerifyToken, verifyToken } = require('../middleware/authMiddleware');

router.post('/register', optionalVerifyToken, authController.register);
router.post('/login', authController.login);
router.get('/profile', verifyToken, authController.getProfile);
router.post('/logout', verifyToken, authController.logout);

// Password Reset Flow
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

module.exports = router;
