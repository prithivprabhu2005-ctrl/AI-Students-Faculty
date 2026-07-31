const logger = require('../utils/logger');

/**
 * Production Centralized Error Handling Middleware
 * Ensures internal stack traces are hidden in production while logging all errors
 */
function errorHandler(err, req, res, next) {
  const statusCode = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';

  logger.error(`API Error [${req.method} ${req.url}]: ${err.message}`, err.stack);

  res.status(statusCode).json({
    message: err.message || 'An internal server error occurred.',
    ...(isProd ? {} : { stack: err.stack })
  });
}

module.exports = errorHandler;
