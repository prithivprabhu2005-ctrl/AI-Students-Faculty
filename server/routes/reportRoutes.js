const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/generate', authorizeRoles('admin', 'faculty'), reportController.generateReport);

module.exports = router;
