const express = require('express');
const router = express.Router();
const backupController = require('../controllers/backupController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.use(verifyToken, authorizeRoles('admin'));

router.get('/export', backupController.exportBackup);
router.post('/import', backupController.importBackup);

module.exports = router;
