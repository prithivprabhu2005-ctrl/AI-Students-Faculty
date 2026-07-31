const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

// All analytics endpoints require JWT verification
router.use(verifyToken);

// Admin & Faculty Analytics Overview
router.get('/admin', authorizeRoles('admin', 'faculty'), analyticsController.getAdminAnalytics);

// Faculty Performance Evaluation
router.get('/faculty', authorizeRoles('admin', 'faculty'), analyticsController.getFacultyPerformance);

// Student Personal Analytics (Admin, Faculty, Student)
router.get('/student', authorizeRoles('admin', 'faculty', 'student'), analyticsController.getStudentAnalytics);

// Performance Reports Generator
router.get('/reports', authorizeRoles('admin', 'faculty'), analyticsController.getReports);

module.exports = router;
