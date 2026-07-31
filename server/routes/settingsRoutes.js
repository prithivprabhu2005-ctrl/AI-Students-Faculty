const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/', settingsController.getSettings);
router.put('/', authorizeRoles('admin'), settingsController.updateSettings);

module.exports = router;
