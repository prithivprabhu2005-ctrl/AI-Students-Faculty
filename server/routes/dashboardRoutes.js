const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

// GET /api/dashboard
router.get('/', verifyToken, authorizeRoles('admin', 'faculty'), dashboardController.getDashboardStats);

module.exports = router;
