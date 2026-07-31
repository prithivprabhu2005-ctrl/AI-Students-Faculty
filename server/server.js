const dotenv = require('dotenv');
dotenv.config();
dotenv.config({ path: './server.env', override: false });

const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const seedDefaultAdmin = require('./config/seedAdmin');
const validateEnv = require('./config/envValidator');
const logger = require('./utils/logger');
const { rateLimiter, securityHeaders, mongoSanitize } = require('./middleware/securityMiddleware');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const studentRoutes = require('./routes/studentRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const chatRoutes = require('./routes/chatRoutes');
const academicRoutes = require('./routes/academicRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const predictionRoutes = require('./routes/predictionRoutes');
const reportRoutes = require('./routes/reportRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const profileRoutes = require('./routes/profileRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const auditRoutes = require('./routes/auditRoutes');
const searchRoutes = require('./routes/searchRoutes');
const backupRoutes = require('./routes/backupRoutes');
const healthRoutes = require('./routes/healthRoutes');
const aiRoutes = require('./routes/aiRoutes');
const portfolioRoutes = require('./routes/portfolioRoutes');
const passportRoutes = require('./routes/passportRoutes');
const timetableRoutes = require('./routes/timetableRoutes');
const emailRoutes = require('./routes/emailRoutes');
const { initEmailScheduler } = require('./services/emailScheduler');

// Validate environment
validateEnv();

// Initialize express app
const app = express();

const startServer = async () => {
  try {
    await connectDB();
    await seedDefaultAdmin();

    // Initialize Email & Daily Digest Scheduler
    initEmailScheduler();

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Startup failed:', error);
    process.exit(1);
  }
};

startServer();

// Global Security & Request Middleware
app.use(securityHeaders);
app.use(rateLimiter);
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(mongoSanitize);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health Checks
app.use('/health', healthRoutes);
app.use('/api/health', healthRoutes);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/academic', academicRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/prediction', predictionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/passport', passportRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/emails', emailRoutes);

// Base route to confirm API status
app.get('/', (req, res) => {
  res.json({
    status: 'ONLINE',
    message: 'AI Student Academic System API is running.',
    healthCheck: '/api/health'
  });
});

// Centralized Error Handling Middleware
app.use(errorHandler);
