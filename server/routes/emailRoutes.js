const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.use(verifyToken);

// Admin Routes
router.get('/logs', authorizeRoles('admin', 'staff'), emailController.getEmailLogs);
router.post('/resend/:id', authorizeRoles('admin', 'staff'), emailController.resendFailedEmail);
router.get('/preview/:id', authorizeRoles('admin', 'staff'), emailController.previewEmail);
router.post('/trigger-digest', authorizeRoles('admin', 'staff'), emailController.triggerDailyDigest);

// Student Routes
router.get('/student-status', emailController.getStudentEmailStatus);
router.put('/student-preferences', emailController.updateStudentPreferences);

module.exports = router;
