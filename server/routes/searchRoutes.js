const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/', searchController.globalSearch);

module.exports = router;
