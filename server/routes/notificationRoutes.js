const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/', notificationController.getNotifications);
router.post('/send', authorizeRoles('admin', 'faculty'), notificationController.sendNotification);
router.put('/:id/read', notificationController.markAsRead);
router.post('/auto-alerts', authorizeRoles('admin'), notificationController.generateAutoAlerts);

module.exports = router;
