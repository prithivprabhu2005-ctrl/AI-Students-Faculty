const express = require('express');
const router = express.Router();
const portfolioController = require('../controllers/portfolioController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.use(verifyToken);

// Student Portfolio Routes
router.get('/me', portfolioController.getMyPortfolio);
router.put('/me', portfolioController.updateMyPortfolio);

// Portfolio Summary Metrics for Dashboard
router.get('/summary', portfolioController.getPortfolioSummary);

// Student or Admin view specific portfolio
router.get('/student/:registerNumber', portfolioController.getStudentPortfolio);

// Admin Route: Get/Search/Filter all portfolios
router.get('/admin/all', authorizeRoles('admin', 'staff', 'faculty'), portfolioController.getAllPortfolios);

module.exports = router;
