const jwt = require('jsonwebtoken');
const User = require('../models/User');

const buildAuthUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  department: user.department,
  registerNumber: user.registerNumber,
  staffId: user.staffId,
  isActive: user.isActive
});

const extractToken = (req) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.split(' ')[1];
};

const resolveUserFromToken = async (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.userId);

  if (!user) {
    const error = new Error('User account not found.');
    error.statusCode = 401;
    throw error;
  }

  if (!user.isActive) {
    const error = new Error('Your account is inactive. Please contact the administrator.');
    error.statusCode = 403;
    throw error;
  }

  return buildAuthUser(user);
};

const handleTokenError = (error, res) => {
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token has expired. Please log in again.' });
  }

  return res.status(error.statusCode || 401).json({
    message: error.message || 'Invalid authentication token.'
  });
};

exports.verifyToken = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({ message: 'Authentication token is required.' });
    }

    req.user = await resolveUserFromToken(token);
    next();
  } catch (error) {
    return handleTokenError(error, res);
  }
};

exports.optionalVerifyToken = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return next();
    }

    req.user = await resolveUserFromToken(token);
    next();
  } catch (error) {
    return handleTokenError(error, res);
  }
};

exports.authorizeRoles = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication is required.' });
  }

  const effectiveUserRole = req.user.role;
  const isAllowed =
    roles.includes(effectiveUserRole) ||
    (effectiveUserRole === 'staff' && (roles.includes('admin') || roles.includes('faculty') || roles.includes('staff')));

  if (!isAllowed) {
    return res.status(403).json({ message: 'You are not authorized to access this resource.' });
  }

  next();
};
