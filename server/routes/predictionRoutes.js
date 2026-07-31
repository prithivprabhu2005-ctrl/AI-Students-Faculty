const express = require('express');
const router = express.Router();
const predictionController = require('../controllers/predictionController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/all', authorizeRoles('admin', 'faculty'), predictionController.predictAllStudents);
router.get('/student', authorizeRoles('admin', 'faculty', 'student'), predictionController.getStudentPrediction);
router.get('/faculty-insights', authorizeRoles('admin', 'faculty'), predictionController.getFacultyInsights);

module.exports = router;
