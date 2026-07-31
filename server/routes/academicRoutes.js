const express = require('express');
const router = express.Router();
const academicController = require('../controllers/academicController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

// All academic routes require JWT authentication
router.use(verifyToken);

// ── Subjects ────────────────────────────────────────────
// GET:    All roles can view subjects
// POST:   Admin only – create subject
// PUT:    Admin only – update subject
// DELETE: Admin only – delete subject
router.get('/subjects', authorizeRoles('admin', 'faculty', 'student'), academicController.getSubjects);
router.post('/subjects', authorizeRoles('admin'), academicController.createSubject);
router.put('/subjects/:id', authorizeRoles('admin'), academicController.updateSubject);
router.delete('/subjects/:id', authorizeRoles('admin'), academicController.deleteSubject);

// Faculty list for subject assignment dropdown (Admin only)
router.get('/faculties', authorizeRoles('admin'), academicController.getFaculties);

// ── Attendance ──────────────────────────────────────────
// GET:       All roles can view (filtered by role)
// POST bulk: Faculty only – mark attendance for a class
// POST:      Faculty only – mark single attendance
// PUT:       Faculty only – update attendance
router.get('/attendance', authorizeRoles('admin', 'faculty', 'student'), academicController.getAttendance);
router.post('/attendance/bulk', authorizeRoles('faculty'), academicController.markBulkAttendance);
router.post('/attendance', authorizeRoles('faculty'), academicController.createAttendance);
router.put('/attendance/:id', authorizeRoles('faculty'), academicController.updateAttendance);

// ── Assignments ─────────────────────────────────────────
// GET:  All roles can view (filtered by role)
// POST: Faculty only – add assignment marks
// PUT:  Faculty only – edit assignment marks
router.get('/assignments', authorizeRoles('admin', 'faculty', 'student'), academicController.getAssignments);
router.post('/assignments', authorizeRoles('faculty'), academicController.createAssignment);
router.put('/assignments/:id', authorizeRoles('faculty'), academicController.updateAssignment);

module.exports = router;
