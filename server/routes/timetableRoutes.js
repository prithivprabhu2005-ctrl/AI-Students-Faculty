const express = require('express');
const router = express.Router();
const timetableController = require('../controllers/timetableController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.use(verifyToken);

// View endpoints
router.get('/', timetableController.getTimetable);
router.get('/today', timetableController.getTodaySchedule);
router.get('/student', timetableController.getStudentTimetable);

// Admin modification endpoints
router.post('/', authorizeRoles('admin', 'staff', 'faculty'), timetableController.createTimetableEntry);
router.put('/:id', authorizeRoles('admin', 'staff', 'faculty'), timetableController.updateTimetableEntry);
router.delete('/:id', authorizeRoles('admin', 'staff', 'faculty'), timetableController.deleteTimetableEntry);

module.exports = router;
