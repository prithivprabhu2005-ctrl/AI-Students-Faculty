const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.use(verifyToken, authorizeRoles('admin'));

router.get('/', userController.getUsers);
router.put('/:id', userController.updateUser);
router.patch('/:id/status', userController.updateUserStatus);
router.delete('/:id', userController.deleteUser);

module.exports = router;
