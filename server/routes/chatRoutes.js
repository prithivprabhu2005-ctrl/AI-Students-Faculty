const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

// POST /api/chat
router.post('/', verifyToken, authorizeRoles('admin', 'faculty', 'student'), chatController.handleChatMessage);

module.exports = router;
