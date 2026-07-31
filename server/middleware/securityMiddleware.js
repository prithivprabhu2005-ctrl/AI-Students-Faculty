/**
 * Security Middleware Component
 * Adds Helmet-like security headers, rate limiting, and MongoDB injection protection
 */

// Simple in-memory rate limiter
const requestCounts = new Map();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS_PER_WINDOW = 300; // 300 requests per IP per window

function rateLimiter(req, res, next) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const now = Date.now();

  let record = requestCounts.get(ip);
  if (!record || now - record.startTime > RATE_LIMIT_WINDOW_MS) {
    record = { count: 1, startTime: now };
    requestCounts.set(ip, record);
  } else {
    record.count++;
  }

  res.setHeader('X-RateLimit-Limit', MAX_REQUESTS_PER_WINDOW);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS_PER_WINDOW - record.count));

  if (record.count > MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({
      message: 'Too many requests from this IP. Please try again after 15 minutes.'
    });
  }

  next();
}

// Helmet-like Security Headers
function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;");
  next();
}

// MongoDB Injection Protection / Input Sanitizer
function mongoSanitize(req, res, next) {
  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  if (req.params) sanitizeObject(req.params);
  next();
}

function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) return;
  for (const key in obj) {
    if (key.startsWith('$') || key.includes('.')) {
      delete obj[key];
    } else if (typeof obj[key] === 'object') {
      sanitizeObject(obj[key]);
    }
  }
}

module.exports = {
  rateLimiter,
  securityHeaders,
  mongoSanitize
};
