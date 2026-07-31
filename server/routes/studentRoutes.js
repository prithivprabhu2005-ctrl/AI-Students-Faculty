const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.use(verifyToken, authorizeRoles('admin', 'faculty', 'student'));

// Student CRUD operations mapping to studentController
router.get('/', studentController.getStudents);
router.get('/:id', studentController.getStudentById);
router.post('/', studentController.createStudent);
router.put('/:id', studentController.updateStudent);
router.delete('/:id', studentController.deleteStudent);

module.exports = router;
