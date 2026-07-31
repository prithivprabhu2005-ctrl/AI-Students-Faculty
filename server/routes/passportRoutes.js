const express = require('express');
const router = express.Router();
const passportController = require('../controllers/passportController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.use(verifyToken);

// Student view own passport
router.get('/me', passportController.getMyPassport);

// Admin search directory list
router.get('/admin/list', authorizeRoles('admin', 'staff', 'faculty'), passportController.getPassportSummaryList);

// View specific student's passport (Student view self, Admin view any)
router.get('/student/:registerNumber', passportController.getStudentPassport);

// Update editable passport fields
router.put('/update', passportController.updatePassportProfile);

module.exports = router;
