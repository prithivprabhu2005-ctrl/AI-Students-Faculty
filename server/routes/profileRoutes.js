const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/', profileController.getProfile);
router.put('/update', profileController.updateProfile);
router.put('/password', profileController.changePassword);

module.exports = router;
