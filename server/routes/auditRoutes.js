const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/logs', auditController.getAuditLogs);
router.get('/activity', auditController.getActivityDashboard);

module.exports = router;
