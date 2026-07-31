const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/insights', aiController.getAIInsights);
router.get('/comparison', aiController.getAIComparison);
router.get('/smart-alerts', aiController.getSmartAlerts);
router.get('/dashboard-summary', aiController.getAIDashboardSummary);
router.get('/placement-readiness', aiController.getPlacementReadinessAnalysis);

module.exports = router;
