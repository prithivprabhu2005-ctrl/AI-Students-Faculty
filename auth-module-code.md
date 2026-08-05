# Module 1 – User Management & Authentication

This document contains the complete code for the new and hand-modified source files added for the authentication module.

Notes:
- `package-lock.json` files were auto-updated by `npm install` and are not expanded here because they are generated lockfiles.
- Build output files in `client/dist` were regenerated during verification and are not included here.

## `server/.env`

```
JWT_SECRET=change-this-to-a-strong-jwt-secret
JWT_EXPIRES_IN=1d

```

## `server/package.json`

```json
{
  "name": "student-academic-chatbot-server",
  "version": "1.0.0",
  "description": "Backend server for AI Student Academic Chatbot using NLQ and MongoDB",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "seed": "node scripts/seed.js"
  },
  "keywords": [
    "express",
    "mongodb",
    "chatbot",
    "nlq"
  ],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "axios": "^1.18.1",
    "bcrypt": "^6.0.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "jsonwebtoken": "^9.0.3",
    "mongoose": "^8.5.1"
  },
  "devDependencies": {
    "nodemon": "^3.1.4"
  }
}

```

## `server/server.js`

```js
const dotenv = require('dotenv');
dotenv.config();
dotenv.config({ path: './server.env', override: false });
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const studentRoutes = require('./routes/studentRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const chatRoutes = require('./routes/chatRoutes');

// Initialize express app
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/chat', chatRoutes);

// Base route to confirm API status
app.get('/', (req, res) => {
  res.json({ message: 'AI Student Academic Chatbot API is running.' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'An internal server error occurred.' });
});

// Port configuration
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

```

## `server/models/User.js`

```js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const departments = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AI&DS'];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false
    },
    role: {
      type: String,
      required: true,
      enum: ['admin', 'faculty', 'student']
    },
    department: {
      type: String,
      enum: departments,
      default: undefined
    },
    registerNumber: {
      type: String,
      unique: true,
      sparse: true,
      uppercase: true,
      trim: true,
      default: undefined
    },
    staffId: {
      type: String,
      unique: true,
      sparse: true,
      uppercase: true,
      trim: true,
      default: undefined
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

userSchema.pre('save', async function(next) {
  try {
    if (!this.isModified('password')) {
      return next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;

```

## `server/middleware/authMiddleware.js`

```js
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

  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'You are not authorized to access this resource.' });
  }

  next();
};

```

## `server/controllers/authController.js`

```js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const departments = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AI&DS'];
const allowedRoles = ['admin', 'faculty', 'student'];

const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  department: user.department,
  registerNumber: user.registerNumber,
  staffId: user.staffId,
  isActive: user.isActive,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

const signToken = (user) =>
  jwt.sign(
    {
      userId: user._id,
      role: user.role
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '1d'
    }
  );

const validateRoleSpecificFields = ({ role, department, registerNumber, staffId }) => {
  if (!allowedRoles.includes(role)) {
    return 'Invalid role selected.';
  }

  if (role === 'faculty') {
    if (!department || !departments.includes(department)) {
      return 'A valid department is required for faculty accounts.';
    }

    if (!staffId || !staffId.trim()) {
      return 'Staff ID is required for faculty accounts.';
    }
  }

  if (role === 'student') {
    if (!department || !departments.includes(department)) {
      return 'A valid department is required for student accounts.';
    }

    if (!registerNumber || !registerNumber.trim()) {
      return 'Register Number is required for student accounts.';
    }
  }

  return null;
};

exports.register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role = 'student',
      department,
      registerNumber,
      staffId,
      isActive
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    const validationError = validateRoleSpecificFields({
      role,
      department,
      registerNumber,
      staffId
    });

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const userCount = await User.countDocuments();
    const isBootstrapAdmin = userCount === 0 && role === 'admin';

    if (!isBootstrapAdmin) {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
          message: 'Only an admin can create faculty and student accounts.'
        });
      }

      if (!['faculty', 'student'].includes(role)) {
        return res.status(400).json({
          message: 'Admin can only create faculty and student accounts through this endpoint.'
        });
      }
    }

    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(409).json({ message: 'Email already exists.' });
    }

    if (registerNumber) {
      const existingRegisterNumber = await User.findOne({
        registerNumber: registerNumber.toUpperCase()
      });

      if (existingRegisterNumber) {
        return res.status(409).json({ message: 'Register Number already exists.' });
      }
    }

    if (staffId) {
      const existingStaffId = await User.findOne({ staffId: staffId.toUpperCase() });

      if (existingStaffId) {
        return res.status(409).json({ message: 'Staff ID already exists.' });
      }
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role,
      department: department || undefined,
      registerNumber: registerNumber ? registerNumber.toUpperCase().trim() : undefined,
      staffId: staffId ? staffId.toUpperCase().trim() : undefined,
      isActive: typeof isActive === 'boolean' ? isActive : true
    });

    if (isBootstrapAdmin) {
      const token = signToken(user);
      return res.status(201).json({
        message: 'Admin account created successfully.',
        token,
        user: sanitizeUser(user)
      });
    }

    return res.status(201).json({
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} account created successfully.`,
      user: sanitizeUser(user)
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ message: 'Error creating user account.' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: 'Your account is inactive. Please contact the administrator.'
      });
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = signToken(user);

    return res.json({
      message: 'Login successful.',
      token,
      user: sanitizeUser(user)
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Error logging in.' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User profile not found.' });
    }

    return res.json({ user: sanitizeUser(user) });
  } catch (error) {
    console.error('Profile error:', error);
    return res.status(500).json({ message: 'Error fetching profile.' });
  }
};

exports.logout = async (req, res) => {
  return res.json({ message: 'Logout successful. Please remove the token on the client.' });
};

```

## `server/controllers/userController.js`

```js
const User = require('../models/User');

const departments = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AI&DS'];

const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  department: user.department,
  registerNumber: user.registerNumber,
  staffId: user.staffId,
  isActive: user.isActive,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

const validateRolePayload = ({ role, department, registerNumber, staffId }) => {
  if (!['admin', 'faculty', 'student'].includes(role)) {
    return 'Invalid role selected.';
  }

  if (role === 'faculty') {
    if (!department || !departments.includes(department)) {
      return 'A valid department is required for faculty accounts.';
    }

    if (!staffId || !staffId.trim()) {
      return 'Staff ID is required for faculty accounts.';
    }
  }

  if (role === 'student') {
    if (!department || !departments.includes(department)) {
      return 'A valid department is required for student accounts.';
    }

    if (!registerNumber || !registerNumber.trim()) {
      return 'Register Number is required for student accounts.';
    }
  }

  return null;
};

exports.getUsers = async (req, res) => {
  try {
    const { role, department, isActive, search } = req.query;
    const query = {};

    if (role) {
      query.role = role;
    }

    if (department) {
      query.department = department;
    }

    if (typeof isActive !== 'undefined') {
      query.isActive = isActive === 'true';
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { registerNumber: { $regex: search, $options: 'i' } },
        { staffId: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query).sort({ createdAt: -1 });
    return res.json({ users: users.map(sanitizeUser) });
  } catch (error) {
    console.error('Get users error:', error);
    return res.status(500).json({ message: 'Error fetching users.' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('+password');

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const nextRole = req.body.role || user.role;
    const nextDepartment =
      Object.prototype.hasOwnProperty.call(req.body, 'department') ? req.body.department : user.department;
    const nextRegisterNumber =
      Object.prototype.hasOwnProperty.call(req.body, 'registerNumber')
        ? req.body.registerNumber
        : user.registerNumber;
    const nextStaffId =
      Object.prototype.hasOwnProperty.call(req.body, 'staffId') ? req.body.staffId : user.staffId;

    const validationError = validateRolePayload({
      role: nextRole,
      department: nextDepartment,
      registerNumber: nextRegisterNumber,
      staffId: nextStaffId
    });

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    if (req.body.email && req.body.email.toLowerCase().trim() !== user.email) {
      const existingEmail = await User.findOne({ email: req.body.email.toLowerCase().trim() });
      if (existingEmail) {
        return res.status(409).json({ message: 'Email already exists.' });
      }
      user.email = req.body.email.toLowerCase().trim();
    }

    if (nextRegisterNumber) {
      const normalizedRegisterNumber = nextRegisterNumber.toUpperCase().trim();
      if (normalizedRegisterNumber !== user.registerNumber) {
        const existingRegisterNumber = await User.findOne({
          registerNumber: normalizedRegisterNumber,
          _id: { $ne: user._id }
        });

        if (existingRegisterNumber) {
          return res.status(409).json({ message: 'Register Number already exists.' });
        }
      }
      user.registerNumber = normalizedRegisterNumber;
    } else if (nextRole !== 'student') {
      user.registerNumber = undefined;
    }

    if (nextStaffId) {
      const normalizedStaffId = nextStaffId.toUpperCase().trim();
      if (normalizedStaffId !== user.staffId) {
        const existingStaffId = await User.findOne({
          staffId: normalizedStaffId,
          _id: { $ne: user._id }
        });

        if (existingStaffId) {
          return res.status(409).json({ message: 'Staff ID already exists.' });
        }
      }
      user.staffId = normalizedStaffId;
    } else if (nextRole !== 'faculty') {
      user.staffId = undefined;
    }

    if (req.body.name) {
      user.name = req.body.name.trim();
    }

    if (req.body.role) {
      user.role = req.body.role;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'department')) {
      user.department = req.body.department || undefined;
    }

    if (typeof req.body.isActive === 'boolean') {
      if (req.user._id.toString() === user._id.toString() && req.body.isActive === false) {
        return res.status(400).json({ message: 'You cannot deactivate your own account.' });
      }
      user.isActive = req.body.isActive;
    }

    if (req.body.password) {
      user.password = req.body.password;
    }

    await user.save();

    return res.json({
      message: 'User updated successfully.',
      user: sanitizeUser(user)
    });
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({ message: 'Error updating user.' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({ message: 'You cannot delete your own account.' });
    }

    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.json({ message: 'User deleted successfully.' });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({ message: 'Error deleting user.' });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ message: 'isActive must be a boolean value.' });
    }

    if (req.user._id.toString() === req.params.id && isActive === false) {
      return res.status(400).json({ message: 'You cannot deactivate your own account.' });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    user.isActive = isActive;
    await user.save();

    return res.json({
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully.`,
      user: sanitizeUser(user)
    });
  } catch (error) {
    console.error('Update user status error:', error);
    return res.status(500).json({ message: 'Error updating user status.' });
  }
};

```

## `server/controllers/studentController.js`

```js
const Student = require('../models/Student');

const buildStudentAccessQuery = (user) => {
  if (user.role === 'faculty') {
    return { department: user.department };
  }

  if (user.role === 'student') {
    return { registerNumber: user.registerNumber };
  }

  return {};
};

const canAccessStudent = (user, student) => {
  if (user.role === 'admin') {
    return true;
  }

  if (user.role === 'faculty') {
    return user.department === student.department;
  }

  if (user.role === 'student') {
    return user.registerNumber === student.registerNumber;
  }

  return false;
};

const isMarksOnlyUpdate = (payload = {}) => {
  const keys = Object.keys(payload);
  return keys.length > 0 && keys.every((key) => key === 'marks');
};

// Get all students with search, filters, and pagination
exports.getStudents = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const { search, department, semester, batchYear } = req.query;

    const query = buildStudentAccessQuery(req.user);

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { registerNumber: { $regex: search, $options: 'i' } }
      ];
    }

    if (department && req.user.role === 'admin') {
      query.department = department;
    }

    if (semester) {
      query.semester = parseInt(semester);
    }

    if (batchYear) {
      query.batchYear = parseInt(batchYear);
    }

    const skipIndex = (page - 1) * limit;
    const totalStudents = await Student.countDocuments(query);
    
    // Sort by rank as default so that users see top students first or sorted order
    const students = await Student.find(query)
      .sort({ rank: 1 })
      .skip(skipIndex)
      .limit(limit);

    res.json({
      students,
      totalStudents,
      totalPages: Math.ceil(totalStudents / limit),
      currentPage: page
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ message: 'Error fetching students data' });
  }
};

// Get a single student by ID
exports.getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (!canAccessStudent(req.user, student)) {
      return res.status(403).json({ message: 'You are not authorized to view this student profile.' });
    }
    res.json(student);
  } catch (error) {
    console.error('Error fetching student by ID:', error);
    res.status(500).json({ message: 'Error fetching student details' });
  }
};

// Create a new student
exports.createStudent = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admin can create student records.' });
    }

    // Check if register number is unique
    const existing = await Student.findOne({ registerNumber: req.body.registerNumber });
    if (existing) {
      return res.status(400).json({ message: 'Register Number already exists' });
    }

    // Creating document (triggers pre-save hook for academic calculations)
    const newStudent = new Student(req.body);
    await newStudent.save();

    // Recalculate ranks college-wide
    await Student.recalculateRanks();

    // Return the saved student with ranks updated
    const savedStudent = await Student.findById(newStudent._id);
    res.status(201).json(savedStudent);
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({ message: error.message || 'Error creating student' });
  }
};

// Update student details/marks
exports.updateStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (!canAccessStudent(req.user, student)) {
      return res.status(403).json({ message: 'You are not authorized to update this student record.' });
    }

    if (req.user.role === 'student') {
      return res.status(403).json({ message: 'Students are not allowed to update marks or student records.' });
    }

    if (req.user.role === 'faculty') {
      if (!isMarksOnlyUpdate(req.body)) {
        return res.status(403).json({ message: 'Faculty can update only student marks.' });
      }

      student.marks = req.body.marks;
      await student.save();
      await Student.recalculateRanks();

      const updatedStudent = await Student.findById(req.params.id);
      return res.json(updatedStudent);
    }

    // Verify register number is unique if changing it
    if (req.body.registerNumber && req.body.registerNumber.toUpperCase() !== student.registerNumber) {
      const existing = await Student.findOne({ registerNumber: req.body.registerNumber });
      if (existing) {
        return res.status(400).json({ message: 'Register Number already exists' });
      }
    }

    // Assign new properties
    Object.assign(student, req.body);
    
    // Save student (triggers pre-save hook to recalculate their average, cgpa, and results)
    await student.save();

    // Recalculate ranks college-wide
    await Student.recalculateRanks();

    const updatedStudent = await Student.findById(req.params.id);
    res.json(updatedStudent);
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ message: error.message || 'Error updating student' });
  }
};

// Delete student
exports.deleteStudent = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admin can delete student records.' });
    }

    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Recalculate ranks since a student has been deleted
    await Student.recalculateRanks();

    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ message: 'Error deleting student' });
  }
};

```

## `server/controllers/dashboardController.js`

```js
const Student = require('../models/Student');

const departments = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AI&DS'];

const emptyDashboard = (scopeLabel = 'student database') => ({
  totalStudents: 0,
  passPercentage: 0,
  averageCgpa: 0,
  collegeTopper: null,
  highestMarks: null,
  lowestMarks: null,
  departmentStats: [],
  departmentToppers: [],
  scopeLabel
});

// Get all dashboard statistical calculations and aggregations
exports.getDashboardStats = async (req, res) => {
  try {
    if (req.user.role === 'student') {
      return res.status(403).json({
        message: 'Students are not authorized to view dashboard analytics.'
      });
    }

    const query = req.user.role === 'faculty' ? { department: req.user.department } : {};
    const totalStudents = await Student.countDocuments(query);
    const scopeLabel =
      req.user.role === 'faculty' ? `${req.user.department} department` : 'college';
    
    if (totalStudents === 0) {
      return res.json(emptyDashboard(scopeLabel));
    }

    // 1. Pass Percentage (students with zero arrears / total students)
    const passCount = await Student.countDocuments({ ...query, result: 'Pass' });
    const passPercentage = Number(((passCount / totalStudents) * 100).toFixed(2));

    // 2. Average CGPA of all students
    const avgCgpaData = await Student.aggregate([
      { $match: query },
      { $group: { _id: null, avgCgpa: { $avg: '$cgpa' } } }
    ]);
    const averageCgpa = avgCgpaData.length > 0 ? Number(avgCgpaData[0].avgCgpa.toFixed(2)) : 0;

    // 3. College Topper (student with rank 1)
    const collegeTopper = await Student.findOne(query).sort({ cgpa: -1, totalMarks: -1, rank: 1 });

    // 4. Highest Marks Student
    const highestMarks = await Student.findOne(query).sort({ totalMarks: -1 });

    // 5. Lowest Marks Student
    const lowestMarks = await Student.findOne(query).sort({ totalMarks: 1 });

    // 6. Department wise count, average CGPA, and pass rates using Mongo Aggregation
    const departmentStatsRaw = await Student.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 },
          avgCgpa: { $avg: '$cgpa' },
          passCount: {
            $sum: { $cond: [{ $eq: ['$result', 'Pass'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const departmentStats = departmentStatsRaw.map(dept => ({
      department: dept._id,
      count: dept.count,
      avgCgpa: Number(dept.avgCgpa.toFixed(2)),
      passPercentage: Number(((dept.passCount / dept.count) * 100).toFixed(2))
    }));

    // 7. Find Toppers for each department
    const departmentToppers = [];
    const targetDepartments =
      req.user.role === 'faculty' ? [req.user.department] : departments;

    for (const dept of targetDepartments) {
      const topper = await Student.findOne({ department: dept }).sort({ cgpa: -1, totalMarks: -1 });
      if (topper) {
        departmentToppers.push({
          department: dept,
          name: topper.name,
          registerNumber: topper.registerNumber,
          cgpa: topper.cgpa,
          totalMarks: topper.totalMarks
        });
      }
    }

    res.json({
      totalStudents,
      passPercentage,
      averageCgpa,
      collegeTopper,
      highestMarks,
      lowestMarks,
      departmentStats,
      departmentToppers,
      scopeLabel
    });
  } catch (error) {
    console.error('Error generating dashboard stats:', error);
    res.status(500).json({ message: 'Error loading dashboard statistics' });
  }
};

```

## `server/routes/authRoutes.js`

```js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { optionalVerifyToken, verifyToken } = require('../middleware/authMiddleware');

router.post('/register', optionalVerifyToken, authController.register);
router.post('/login', authController.login);
router.get('/profile', verifyToken, authController.getProfile);
router.post('/logout', verifyToken, authController.logout);

module.exports = router;

```

## `server/routes/userRoutes.js`

```js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.use(verifyToken, authorizeRoles('admin'));

router.get('/', userController.getUsers);
router.put('/:id', userController.updateUser);
router.patch('/:id/status', userController.updateUserStatus);
router.delete('/:id', userController.deleteUser);

module.exports = router;

```

## `server/routes/studentRoutes.js`

```js
const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.use(verifyToken, authorizeRoles('admin', 'faculty', 'student'));

// Student CRUD operations mapping to studentController
router.get('/', studentController.getStudents);
router.get('/:id', studentController.getStudentById);
router.post('/', studentController.createStudent);
router.put('/:id', studentController.updateStudent);
router.delete('/:id', studentController.deleteStudent);

module.exports = router;

```

## `server/routes/dashboardRoutes.js`

```js
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

// GET /api/dashboard
router.get('/', verifyToken, authorizeRoles('admin', 'faculty'), dashboardController.getDashboardStats);

module.exports = router;

```

## `server/routes/chatRoutes.js`

```js
const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

// POST /api/chat
router.post('/', verifyToken, authorizeRoles('admin', 'faculty', 'student'), chatController.handleChatMessage);

module.exports = router;

```

## `client/package.json`

```json
{
  "name": "client",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "oxlint",
    "preview": "vite preview"
  },
  "dependencies": {
    "axios": "^1.18.1",
    "react": "^19.2.7",
    "react-dom": "^19.2.7",
    "react-router-dom": "^7.18.1"
  },
  "devDependencies": {
    "@types/react": "^19.2.17",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.3",
    "oxlint": "^1.71.0",
    "vite": "^8.1.1"
  }
}

```

## `client/src/services/api.js`

```js
import axios from 'axios';

export const AUTH_TOKEN_KEY = 'academic_auth_token';
export const AUTH_USER_KEY = 'academic_auth_user';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://ai-students-faculty.onrender.com/api'
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || '';

    if (status === 401 && !requestUrl.includes('/auth/login')) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
      window.dispatchEvent(
        new CustomEvent('auth:unauthorized', {
          detail: error.response?.data?.message || 'Your session has expired. Please log in again.'
        })
      );
    }

    return Promise.reject(error);
  }
);

export default api;

```

## `client/src/context/AuthContext.jsx`

```jsx
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api, { AUTH_TOKEN_KEY, AUTH_USER_KEY } from '../services/api';

const AuthContext = createContext(null);

const getDefaultRoute = (role) => {
  if (role === 'admin') {
    return '/admin/dashboard';
  }

  if (role === 'faculty') {
    return '/faculty/dashboard';
  }

  return '/student/dashboard';
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem(AUTH_TOKEN_KEY));
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem(AUTH_USER_KEY);
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [loading, setLoading] = useState(Boolean(localStorage.getItem(AUTH_TOKEN_KEY)));

  const persistSession = (nextToken, nextUser) => {
    localStorage.setItem(AUTH_TOKEN_KEY, nextToken);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  };

  const clearSession = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    setToken(null);
    setUser(null);
  };

  const refreshProfile = async () => {
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
      setLoading(false);
      return null;
    }

    try {
      const response = await api.get('/auth/profile');
      const freshUser = response.data.user;
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(freshUser));
      setUser(freshUser);
      setToken(localStorage.getItem(AUTH_TOKEN_KEY));
      return freshUser;
    } catch (error) {
      clearSession();
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      clearSession();
      setLoading(false);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    persistSession(response.data.token, response.data.user);
    return response.data.user;
  };

  const logout = async () => {
    try {
      if (localStorage.getItem(AUTH_TOKEN_KEY)) {
        await api.post('/auth/logout');
      }
    } catch (error) {
      // Ignore logout API failures and clear local state.
    } finally {
      clearSession();
    }
  };

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      isAuthenticated: Boolean(token && user),
      login,
      logout,
      refreshProfile,
      defaultRoute: getDefaultRoute(user?.role)
    }),
    [token, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
};

```

## `client/src/components/ProtectedRoute.jsx`

```jsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Spinner from './Spinner';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ allowedRoles }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="full-page-loader">
        <Spinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;

```

## `client/src/components/Unauthorized.jsx`

```jsx
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Unauthorized = () => {
  const { defaultRoute } = useAuth();

  return (
    <div className="centered-state">
      <div className="dashboard-section-card unauthorized-card">
        <h2>Unauthorized Access</h2>
        <p>You do not have permission to open this page.</p>
        <Link className="btn btn-primary" to={defaultRoute}>
          Go Back
        </Link>
      </div>
    </div>
  );
};

export default Unauthorized;

```

## `client/src/components/login.jsx`

```jsx
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './login.css';
import { useAuth } from '../context/AuthContext';

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      const user = await login({ email, password });
      const from = location.state?.from;

      if (from) {
        navigate(from, { replace: true });
        return;
      }

      if (user.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (user.role === 'faculty') {
        navigate('/faculty/dashboard', { replace: true });
      } else {
        navigate('/student/dashboard', { replace: true });
      }
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand-section">
          <div className="brand-icon">🎓</div>
          <h1>Student Academic Chatbot</h1>
          <p>Sign in with your admin, faculty, or student account.</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <label className="input-group">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
              required
            />
          </label>

          <label className="input-group">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </label>

          {errorMessage && <p className="error-text">{errorMessage}</p>}

          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;

```

## `client/src/components/Sidebar.jsx`

```jsx
import { NavLink } from 'react-router-dom';

const Sidebar = ({ menuItems, user, onLogout }) => {
  const roleLabel = user?.role ? `${user.role.charAt(0).toUpperCase()}${user.role.slice(1)}` : '';

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">🎓</div>
        <div className="sidebar-title">EduBot Academic</div>
      </div>
      <div className="sidebar-user-card">
        <div className="sidebar-user-name">{user?.name}</div>
        <div className="sidebar-user-meta">{roleLabel}</div>
        <div className="sidebar-user-meta">{user?.email}</div>
        {user?.department && <div className="sidebar-user-tag">{user.department}</div>}
      </div>
      <ul className="sidebar-menu">
        {menuItems.map(item => (
          <li key={item.id}>
            <NavLink
              to={item.to}
              className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}
            >
              <span className="menu-item-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="sidebar-footer">
        <button type="button" className="btn btn-secondary sidebar-logout-btn" onClick={onLogout}>
          Logout
        </button>
        <p>Vite + Express + MongoDB</p>
        <p>JWT Authentication</p>
      </div>
    </div>
  );
};

export default Sidebar;

```

## `client/src/components/Dashboard.jsx`

```jsx
import { useEffect, useState } from 'react';
import Spinner from './Spinner';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);
        const response = await api.get('/dashboard');
        setStats(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        setError(err.response?.data?.message || 'Failed to fetch dashboard statistics.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  if (loading) return <Spinner />;

  if (error) {
    return (
      <div className="dashboard-section-card" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
        <h2>Error Loading Dashboard</h2>
        <p>{error}</p>
      </div>
    );
  }

  const {
    totalStudents,
    passPercentage,
    averageCgpa,
    collegeTopper,
    highestMarks,
    lowestMarks,
    departmentStats,
    departmentToppers,
    scopeLabel
  } = stats;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="dashboard-header">
        <h1>{user?.role === 'admin' ? 'Admin Dashboard' : 'Faculty Dashboard'}</h1>
        <p>Real-time analytics for the {scopeLabel || 'college'} student records</p>
      </div>

      {/* Top Metrics Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Total Students</div>
          <div className="metric-value">{totalStudents}</div>
          <div className="metric-footer">Active enrollment</div>
        </div>

        <div className="metric-card success">
          <div className="metric-label">Pass Percentage</div>
          <div className="metric-value">{passPercentage}%</div>
          <div className="metric-footer">Students with 0 arrears</div>
        </div>

        <div className="metric-card warning">
          <div className="metric-label">Average CGPA</div>
          <div className="metric-value">{averageCgpa}</div>
          <div className="metric-footer">Out of 10.00 scale</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">{user?.role === 'admin' ? 'College Topper' : 'Department Topper'}</div>
          <div className="metric-value" style={{ fontSize: '1.25rem', marginTop: '0.5rem', fontWeight: 600 }}>
            {collegeTopper ? collegeTopper.name : 'N/A'}
          </div>
          <div className="metric-footer">
            CGPA: <span>{collegeTopper ? collegeTopper.cgpa : 'N/A'}</span> ({collegeTopper ? collegeTopper.department : ''})
          </div>
        </div>
      </div>

      {/* Mid Aggregations Table */}
      <div className="dashboard-details-grid">
        {/* Left Side: Department Wise Performance */}
        <div className="dashboard-section-card">
          <h2>Department Performance Analysis</h2>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Student Count</th>
                  <th>Avg CGPA</th>
                  <th>Pass Percentage</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {departmentStats.map((dept, index) => (
                  <tr key={index}>
                    <td style={{ fontWeight: 600 }}>{dept.department}</td>
                    <td>{dept.count}</td>
                    <td>{dept.avgCgpa}</td>
                    <td>{dept.passPercentage}%</td>
                    <td>
                      <span className={`badge ${dept.passPercentage >= 75 ? 'badge-success' : 'badge-warning'}`}>
                        {dept.passPercentage >= 75 ? 'Optimal' : 'Needs Review'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Toppers & Highlights */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="dashboard-section-card">
            <h2>Department Toppers</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto' }}>
              {departmentToppers.map((topper, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{topper.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{topper.registerNumber} | {topper.department}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.95rem' }}>CGPA: {topper.cgpa}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{topper.totalMarks}/600</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Academic Highs and Lows */}
          <div className="dashboard-section-card">
            <h2>College Score Highlights</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Highest Score:</span>
                <span style={{ fontWeight: 600 }}>
                  {highestMarks ? `${highestMarks.name} (${highestMarks.totalMarks}/600)` : 'N/A'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Lowest Score:</span>
                <span style={{ fontWeight: 600 }}>
                  {lowestMarks ? `${lowestMarks.name} (${lowestMarks.totalMarks}/600)` : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

```

## `client/src/components/Students.jsx`

```jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Spinner from './Spinner';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Students = ({ mode = 'admin' }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const departments = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AI&DS'];
  const isAdmin = user?.role === 'admin';
  const isFaculty = user?.role === 'faculty';
  const canAddStudent = isAdmin;
  const canDeleteStudent = isAdmin;
  const canEditStudent = isAdmin || isFaculty;
  const canFilterDepartment = isAdmin;

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await api.get('/students', {
        params: {
          page,
          limit: 10,
          search: search.trim(),
          department: canFilterDepartment ? department : undefined
        }
      });
      setStudents(response.data.students);
      setTotalPages(response.data.totalPages);
      setTotalStudents(response.data.totalStudents);
      setError(null);
    } catch (err) {
      console.error('Error fetching students:', err);
      setError(err.response?.data?.message || 'Failed to fetch students list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Reset page to 1 when search or department filter changes
    setPage(1);
  }, [search, department]);

  useEffect(() => {
    fetchStudents();
  }, [page, search, department]);

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete student "${name}"?`)) {
      try {
        await api.delete(`/students/${id}`);
        alert('Student deleted successfully.');
        fetchStudents();
      } catch (err) {
        console.error('Error deleting student:', err);
        alert(err.response?.data?.message || 'Error deleting student');
      }
    }
  };

  const handleRowClick = async (id) => {
    try {
      const response = await api.get(`/students/${id}`);
      setSelectedStudent(response.data);
      setShowModal(true);
    } catch (err) {
      console.error('Error fetching student details:', err);
      alert('Error fetching student details.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="dashboard-header" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>{isFaculty ? 'Department Students' : 'Student Directory'}</h1>
          <p>
            {isFaculty
              ? `View and update marks for students in ${user?.department} (${totalStudents} records)`
              : `Manage and inspect academic records for all students (${totalStudents} records)`}
          </p>
        </div>
        {canAddStudent && (
          <button className="btn btn-primary" onClick={() => navigate('/admin/students/new')}>
            ➕ Add New Student
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="students-controls">
        <div className="search-input-wrapper">
          <svg className="search-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="Search by name or register number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {canFilterDepartment ? (
          <select
            className="filter-select"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        ) : (
          <div className="filter-pill">{user?.department}</div>
        )}
      </div>

      {/* Students Table */}
      {loading ? (
        <Spinner />
      ) : error ? (
        <div className="dashboard-section-card" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
          <p>{error}</p>
        </div>
      ) : students.length === 0 ? (
        <div className="dashboard-section-card" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
          <p>No student records found matching the filters.</p>
        </div>
      ) : (
        <div className="dashboard-section-card" style={{ padding: '1rem' }}>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Reg. No</th>
                  <th>Name</th>
                  <th>Dept</th>
                  <th>CGPA</th>
                  <th>Arrears</th>
                  <th>Result</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student._id} style={{ cursor: 'pointer' }}>
                    <td onClick={() => handleRowClick(student._id)} style={{ fontWeight: 600, color: 'var(--primary)' }}>
                      #{student.rank}
                    </td>
                    <td onClick={() => handleRowClick(student._id)} style={{ fontWeight: 500 }}>
                      {student.registerNumber}
                    </td>
                    <td onClick={() => handleRowClick(student._id)} style={{ fontWeight: 500 }}>
                      {student.name}
                    </td>
                    <td onClick={() => handleRowClick(student._id)}>{student.department}</td>
                    <td onClick={() => handleRowClick(student._id)} style={{ fontWeight: 700 }}>
                      {student.cgpa.toFixed(2)}
                    </td>
                    <td onClick={() => handleRowClick(student._id)}>
                      {student.arrears > 0 ? (
                        <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{student.arrears}</span>
                      ) : (
                        '0'
                      )}
                    </td>
                    <td onClick={() => handleRowClick(student._id)}>
                      <span className={`badge ${student.result === 'Pass' ? 'badge-success' : 'badge-danger'}`}>
                        {student.result}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                        {canEditStudent && (
                          <button
                            className="action-btn edit"
                            title={isFaculty ? 'Update Marks' : 'Edit Student'}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(
                                isFaculty
                                  ? `/faculty/students/${student._id}/edit-marks`
                                  : `/admin/students/${student._id}/edit`
                              );
                            }}
                          >
                            ✏️
                          </button>
                        )}
                        {canDeleteStudent && (
                          <button
                            className="action-btn delete"
                            title="Delete Student"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(student._id, student.name);
                            }}
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="pagination-wrapper">
            <div>
              Showing page <b>{page}</b> of <b>{totalPages}</b> ({totalStudents} total records)
            </div>
            <div className="pagination-buttons">
              <button
                className="pagination-btn"
                disabled={page <= 1}
                onClick={() => setPage((prev) => prev - 1)}
              >
                ◀ Previous
              </button>
              <button
                className="pagination-btn"
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => prev + 1)}
              >
                Next ▶
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showModal && selectedStudent && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Student Academic Profile</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="student-info-grid">
                <div className="student-info-item">
                  <span className="student-info-label">Register Number</span>
                  <span className="student-info-value">{selectedStudent.registerNumber}</span>
                </div>
                <div className="student-info-item">
                  <span className="student-info-label">Student ID</span>
                  <span className="student-info-value">{selectedStudent.studentId}</span>
                </div>
                <div className="student-info-item">
                  <span className="student-info-label">Name</span>
                  <span className="student-info-value">{selectedStudent.name}</span>
                </div>
                <div className="student-info-item">
                  <span className="student-info-label">Gender</span>
                  <span className="student-info-value">{selectedStudent.gender}</span>
                </div>
                <div className="student-info-item">
                  <span className="student-info-label">Department</span>
                  <span className="student-info-value">{selectedStudent.department}</span>
                </div>
                <div className="student-info-item">
                  <span className="student-info-label">Batch & Semester</span>
                  <span className="student-info-value">
                    Batch {selectedStudent.batchYear} | Sem {selectedStudent.semester} (Sec {selectedStudent.section})
                  </span>
                </div>
                <div className="student-info-item">
                  <span className="student-info-label">Date of Birth</span>
                  <span className="student-info-value">
                    {new Date(selectedStudent.dob).toLocaleDateString()}
                  </span>
                </div>
                <div className="student-info-item">
                  <span className="student-info-label">Contact</span>
                  <span className="student-info-value">
                    {selectedStudent.phone} <br />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{selectedStudent.email}</span>
                  </span>
                </div>
                <div className="student-info-item" style={{ gridColumn: 'span 2' }}>
                  <span className="student-info-label">Address</span>
                  <span className="student-info-value">{selectedStudent.address}</span>
                </div>
              </div>

              {/* Marks Card */}
              <div className="student-marks-block">
                <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.1rem', marginBottom: '0.75rem' }}>Subject Marks Report</h3>
                <div className="table-container">
                  <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th>Internal (40)</th>
                        <th>External (60)</th>
                        <th>Total (100)</th>
                        <th>Grade</th>
                        <th>Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(selectedStudent.marks).map((key) => {
                        const sub = selectedStudent.marks[key];
                        // Capitalize subject key
                        const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
                        return (
                          <tr key={key}>
                            <td style={{ fontWeight: 500 }}>{label}</td>
                            <td>{sub.internal}</td>
                            <td>{sub.external}</td>
                            <td style={{ fontWeight: 600 }}>{sub.total}</td>
                            <td style={{ fontWeight: 700, color: sub.grade === 'F' ? 'var(--danger)' : 'var(--primary)' }}>
                              {sub.grade}
                            </td>
                            <td>
                              <span className={`badge ${sub.result === 'Pass' ? 'badge-success' : 'badge-danger'}`}>
                                {sub.result}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Aggregated totals */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', textAlign: 'center' }}>
                <div>
                  <div className="student-info-label">Total Marks</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{selectedStudent.totalMarks}/600</div>
                </div>
                <div>
                  <div className="student-info-label">Percentage</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{selectedStudent.percentage}%</div>
                </div>
                <div>
                  <div className="student-info-label">CGPA</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>{selectedStudent.cgpa}</div>
                </div>
                <div>
                  <div className="student-info-label">College Rank</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--warning)' }}>#{selectedStudent.rank}</div>
                </div>
              </div>
            </div>
            <div className="modal-header" style={{ borderTop: '1px solid var(--border-color)', borderBottom: 'none', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;

```

## `client/src/components/AddEditStudent.jsx`

```jsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Spinner from './Spinner';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const AddEditStudent = ({ mode = 'admin' }) => {
  const navigate = useNavigate();
  const { id: editingStudentId } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [formData, setFormData] = useState({
    studentId: '',
    registerNumber: '',
    name: '',
    gender: 'Male',
    department: 'CSE',
    batchYear: 2023,
    academicYear: 2,
    semester: 3,
    section: 'A',
    dob: '',
    phone: '',
    email: '',
    address: '',
    marks: {
      english: { internal: 0, external: 0 },
      mathematics: { internal: 0, external: 0 },
      programming: { internal: 0, external: 0 },
      database: { internal: 0, external: 0 },
      operatingSystems: { internal: 0, external: 0 },
      computerNetworks: { internal: 0, external: 0 }
    }
  });

  const departments = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AI&DS'];
  const isFacultyMode = mode === 'faculty';
  const isEditing = Boolean(editingStudentId);
  const subjects = [
    { key: 'english', label: 'English' },
    { key: 'mathematics', label: 'Mathematics' },
    { key: 'programming', label: 'Programming' },
    { key: 'database', label: 'Database' },
    { key: 'operatingSystems', label: 'Operating Systems' },
    { key: 'computerNetworks', label: 'Computer Networks' }
  ];

  useEffect(() => {
    if (editingStudentId) {
      const fetchStudentDetails = async () => {
        try {
          setFetching(true);
          const response = await api.get(`/students/${editingStudentId}`);
          const student = response.data;
          
          // Format dob string to YYYY-MM-DD for date input
          const formattedDob = student.dob ? new Date(student.dob).toISOString().split('T')[0] : '';
          
          setFormData({
            studentId: student.studentId || '',
            registerNumber: student.registerNumber || '',
            name: student.name || '',
            gender: student.gender || 'Male',
            department: student.department || 'CSE',
            batchYear: student.batchYear || 2023,
            academicYear: student.academicYear || 2,
            semester: student.semester || 3,
            section: student.section || 'A',
            dob: formattedDob,
            phone: student.phone || '',
            email: student.email || '',
            address: student.address || '',
            marks: {
              english: { internal: student.marks.english.internal, external: student.marks.english.external },
              mathematics: { internal: student.marks.mathematics.internal, external: student.marks.mathematics.external },
              programming: { internal: student.marks.programming.internal, external: student.marks.programming.external },
              database: { internal: student.marks.database.internal, external: student.marks.database.external },
              operatingSystems: { internal: student.marks.operatingSystems.internal, external: student.marks.operatingSystems.external },
              computerNetworks: { internal: student.marks.computerNetworks.internal, external: student.marks.computerNetworks.external }
            }
          });
        } catch (err) {
          console.error('Error fetching student details:', err);
          alert('Failed to load student details for editing.');
          navigate(isFacultyMode ? '/faculty/students' : '/admin/students');
        } finally {
          setFetching(false);
        }
      };

      fetchStudentDetails();
    }
  }, [editingStudentId, isFacultyMode, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'batchYear' || name === 'academicYear' || name === 'semester' 
        ? Number(value) 
        : value
    }));
  };

  const handleMarkChange = (subjectKey, type, value) => {
    const numericVal = Math.min(type === 'internal' ? 40 : 60, Math.max(0, Number(value) || 0));
    setFormData(prev => ({
      ...prev,
      marks: {
        ...prev.marks,
        [subjectKey]: {
          ...prev.marks[subjectKey],
          [type]: numericVal
        }
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingStudentId) {
        const payload = isFacultyMode ? { marks: formData.marks } : formData;
        await api.put(`/students/${editingStudentId}`, payload);
        alert(isFacultyMode ? 'Student marks updated successfully!' : 'Student details updated successfully!');
      } else {
        await api.post('/students', formData);
        alert('Student added successfully!');
      }
      navigate(isFacultyMode ? '/faculty/students' : '/admin/students');
    } catch (err) {
      console.error('Error submitting form:', err);
      alert(err.response?.data?.message || 'An error occurred while saving student.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <Spinner />;

  return (
    <div className="dashboard-section-card">
      <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem' }}>
          {isFacultyMode
            ? 'Update Student Marks'
            : editingStudentId
              ? 'Edit Student Details'
              : 'Add New Student Record'}
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          {isFacultyMode
            ? `Update marks for students in ${user?.department}. Grades and ranks will be recalculated automatically.`
            : 'Fill in student info and marks. Grades and ranks will be calculated automatically.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="form-container">
        {/* Section 1: Personal Information */}
        {!isFacultyMode && (
        <div className="form-grid">
          <div className="form-section-title">Personal Details</div>

          <div className="form-group">
            <label htmlFor="studentId">Student ID (e.g. S0301)</label>
            <input
              type="text"
              id="studentId"
              name="studentId"
              className="form-control"
              required
              value={formData.studentId}
              onChange={handleChange}
              placeholder="e.g. S0301"
            />
          </div>

          <div className="form-group">
            <label htmlFor="registerNumber">Register Number (e.g. 23CSE102)</label>
            <input
              type="text"
              id="registerNumber"
              name="registerNumber"
              className="form-control"
              required
              disabled={!!editingStudentId}
              value={formData.registerNumber}
              onChange={handleChange}
              placeholder="e.g. 23CSE102"
              style={{ textTransform: 'uppercase' }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              className="form-control"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Arun Kumar"
            />
          </div>

          <div className="form-group">
            <label htmlFor="gender">Gender</label>
            <select
              id="gender"
              name="gender"
              className="filter-select"
              value={formData.gender}
              onChange={handleChange}
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="department">Department</label>
            <select
              id="department"
              name="department"
              className="filter-select"
              value={formData.department}
              onChange={handleChange}
            >
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="batchYear">Batch Year</label>
            <input
              type="number"
              id="batchYear"
              name="batchYear"
              className="form-control"
              required
              value={formData.batchYear}
              onChange={handleChange}
              placeholder="e.g. 2023"
            />
          </div>

          <div className="form-group">
            <label htmlFor="academicYear">Academic Year</label>
            <input
              type="number"
              id="academicYear"
              name="academicYear"
              className="form-control"
              required
              min="1"
              max="4"
              value={formData.academicYear}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="semester">Semester</label>
            <input
              type="number"
              id="semester"
              name="semester"
              className="form-control"
              required
              min="1"
              max="8"
              value={formData.semester}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="section">Section</label>
            <input
              type="text"
              id="section"
              name="section"
              className="form-control"
              required
              value={formData.section}
              onChange={handleChange}
              placeholder="e.g. A"
              style={{ textTransform: 'uppercase' }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="dob">Date of Birth</label>
            <input
              type="date"
              id="dob"
              name="dob"
              className="form-control"
              required
              value={formData.dob}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone Number</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              className="form-control"
              required
              value={formData.phone}
              onChange={handleChange}
              placeholder="e.g. 9840123456"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              className="form-control"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="e.g. arun.kumar@college.edu"
            />
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label htmlFor="address">Address</label>
            <input
              type="text"
              id="address"
              name="address"
              className="form-control"
              required
              value={formData.address}
              onChange={handleChange}
              placeholder="e.g. 12, Anna Salai, Chennai - 600010"
            />
          </div>
        </div>
        )}

        {/* Section 2: Subject Marks */}
        <div>
          <div className="form-section-title">Academic Subject Marks</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
            {subjects.map(subject => (
              <div
                key={subject.key}
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '1rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.01)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--primary)' }}>{subject.label}</div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Internal (max 40)</label>
                    <input
                      type="number"
                      min="0"
                      max="40"
                      className="form-control"
                      value={formData.marks[subject.key].internal}
                      onChange={(e) => handleMarkChange(subject.key, 'internal', e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>External (max 60)</label>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      className="form-control"
                      value={formData.marks[subject.key].external}
                      onChange={(e) => handleMarkChange(subject.key, 'external', e.target.value)}
                    />
                  </div>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal: <b>{formData.marks[subject.key].internal + formData.marks[subject.key].external}</b></span>
                  <span>Pass $\ge$ 50</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate(isFacultyMode ? '/faculty/students' : '/admin/students')}
            disabled={loading}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading
              ? 'Saving...'
              : isFacultyMode
                ? 'Update Marks'
                : isEditing
                  ? 'Update Student Record'
                  : 'Create Student Record'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddEditStudent;

```

## `client/src/components/Chatbot.jsx`

```jsx
import { useEffect, useRef, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Chatbot = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Hello! I am your Student Academic Assistant. I can answer questions about students, marks, CGPAs, ranks, and toppers in our database.\n\nTry asking me something like: *"Who is the college topper?"* or *"Show ECE students with CGPA above 8.5"*.'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [contextRegNo, setContextRegNo] = useState(null);

  const messagesEndRef = useRef(null);

  const presetQueries = [
    'Who is the college topper?',
    'Show his marks.',
    'Who failed Programming?',
    'Who is the ECE topper?',
    'Show ECE students with CGPA above 8.5',
    'How many girls are in IT?',
    'Who scored 100 in Mathematics?',
    'Show students with arrears.',
    'Show all students with distinction.',
    'Who is the CM of Tamil Nadu?',
    'What is Python?'
  ];

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (messageText) => {
    if (!messageText.trim()) return;

    // Add user message
    setMessages(prev => [...prev, { sender: 'user', text: messageText }]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.post('/chat', {
        message: messageText,
        contextRegNo
      });

      // Add bot message and update context
      setMessages(prev => [
        ...prev,
        { sender: 'bot', text: response.data.responseText }
      ]);
      if (response.data.contextRegNo) {
        setContextRegNo(response.data.contextRegNo);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [
        ...prev,
        { sender: 'bot', text: err.response?.data?.message || 'Sorry, I encountered an error connecting to the chatbot service.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSend(input);
  };

  // Convert markdown-style response from chatbot service into formatted HTML safely
  const formatMarkdownToHtml = (text) => {
    if (!text) return '';
    
    // Basic escaping to prevent raw tag issues
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Headings (e.g. ### Header)
    html = html.replace(/^### (.*$)/gim, '<h3 style="margin-top: 0.75rem; margin-bottom: 0.5rem; font-family: var(--font-title); font-size: 1.1rem; color: var(--primary);">$1</h3>');

    // Bold text (e.g. **bold**)
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #60a5fa; font-weight: 600;">$1</strong>');

    // Inline Highlights (e.g. `code`)
    html = html.replace(/`(.*?)`/g, '<code style="background-color: rgba(255,255,255,0.06); padding: 0.1rem 0.35rem; border-radius: 4px; font-family: monospace; font-size: 0.9em; color: #fbbf24;">$1</code>');

    // Process lines for lists and paragraphs
    const lines = html.split('\n');
    const formattedLines = lines.map(line => {
      // Bullet list items
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return `<li style="margin-left: 1.25rem; margin-bottom: 0.25rem; list-style-type: disc;">${line.substring(2)}</li>`;
      }
      
      // Numbered list items
      const numberedMatch = line.match(/^(\d+)\.\s(.*)/);
      if (numberedMatch) {
        return `<li style="margin-left: 1.25rem; margin-bottom: 0.25rem; list-style-type: decimal;">${numberedMatch[2]}</li>`;
      }

      // Paragraph / line break
      return line.trim() ? `<p style="margin-bottom: 0.5rem;">${line}</p>` : '<br/>';
    });

    return formattedLines.join('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
      <div className="dashboard-header">
        <h1>Academic NLQ Chatbot</h1>
        <p>
          {user?.role === 'student'
            ? 'Ask academic questions and view your chatbot workspace.'
            : 'Query the student database using conversational English. Only academic queries are allowed.'}
        </p>
      </div>

      <div className="chat-container">
        {/* Messages List */}
        <div className="chat-messages">
          {messages.map((msg, index) => (
            <div key={index} className={`chat-bubble-wrapper ${msg.sender}`}>
              <div className="chat-sender-name">
                {msg.sender === 'user' ? 'You' : 'EduBot Assistant'}
              </div>
              <div
                className="chat-bubble"
                dangerouslySetInnerHTML={{ __html: formatMarkdownToHtml(msg.text) }}
              />
            </div>
          ))}

          {loading && (
            <div className="chat-bubble-wrapper bot">
              <div className="chat-sender-name">EduBot Assistant</div>
              <div className="chat-bubble" style={{ display: 'inline-flex', padding: '0.75rem 1rem' }}>
                <div className="typing-indicator">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Preset suggestions & input bar */}
        <div className="chat-input-wrapper" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <div>
            <div className="preset-queries-header">Suggested Test Queries</div>
            <div className="preset-queries-grid">
              {presetQueries.map((q, idx) => (
                <button
                  key={idx}
                  className="preset-query-btn"
                  onClick={() => handleSend(q)}
                  disabled={loading}
                  title={q}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <input
              type="text"
              className="chat-input"
              placeholder="Ask an academic question (e.g. Who failed Programming?)..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button type="submit" className="chat-send-btn" disabled={loading || !input.trim()}>
              <svg viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </form>
          {contextRegNo && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', alignSelf: 'flex-start' }}>
              Active Query Context (Student): <code style={{ color: 'var(--primary)', fontWeight: 600 }}>{contextRegNo}</code>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chatbot;

```

## `client/src/components/UserManagement.jsx`

```jsx
import { useEffect, useState } from 'react';
import api from '../services/api';

const emptyForm = {
  name: '',
  email: '',
  password: '',
  role: 'faculty',
  department: 'CSE',
  registerNumber: '',
  staffId: '',
  isActive: true
};

const departments = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AI&DS'];

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users', {
        params: { search: search.trim() || undefined }
      });
      setUsers(response.data.users);
      setError('');
    } catch (fetchError) {
      setError(fetchError.response?.data?.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search]);

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingId(null);
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      if (editingId) {
        const payload = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          department: formData.role === 'admin' ? '' : formData.department,
          registerNumber: formData.role === 'student' ? formData.registerNumber : '',
          staffId: formData.role === 'faculty' ? formData.staffId : '',
          isActive: formData.isActive,
          ...(formData.password ? { password: formData.password } : {})
        };

        await api.put(`/users/${editingId}`, payload);
        alert('User updated successfully.');
      } else {
        await api.post('/auth/register', {
          ...formData,
          department: formData.role === 'admin' ? '' : formData.department,
          registerNumber: formData.role === 'student' ? formData.registerNumber : '',
          staffId: formData.role === 'faculty' ? formData.staffId : ''
        });
        alert('User created successfully.');
      }

      resetForm();
      fetchUsers();
    } catch (submitError) {
      alert(submitError.response?.data?.message || 'Failed to save user.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (user) => {
    setEditingId(user._id);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      department: user.department || 'CSE',
      registerNumber: user.registerNumber || '',
      staffId: user.staffId || '',
      isActive: user.isActive
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this user account?')) {
      return;
    }

    try {
      await api.delete(`/users/${id}`);
      fetchUsers();
    } catch (deleteError) {
      alert(deleteError.response?.data?.message || 'Failed to delete user.');
    }
  };

  const handleStatusToggle = async (user) => {
    try {
      await api.patch(`/users/${user._id}/status`, { isActive: !user.isActive });
      fetchUsers();
    } catch (statusError) {
      alert(statusError.response?.data?.message || 'Failed to update user status.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="dashboard-header">
        <h1>User Management</h1>
        <p>Create faculty and student accounts, then manage user access and status.</p>
      </div>

      <div className="dashboard-section-card">
        <h2>{editingId ? 'Edit User' : 'Create User Account'}</h2>
        <form onSubmit={handleSubmit} className="form-container">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input id="name" name="name" className="form-control" value={formData.name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" className="form-control" value={formData.email} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="password">{editingId ? 'New Password (optional)' : 'Password'}</label>
              <input
                id="password"
                name="password"
                type="password"
                className="form-control"
                value={formData.password}
                onChange={handleChange}
                required={!editingId}
              />
            </div>
            <div className="form-group">
              <label htmlFor="role">Role</label>
              <select id="role" name="role" className="filter-select" value={formData.role} onChange={handleChange}>
                {editingId ? (
                  <>
                    <option value="admin">Admin</option>
                    <option value="faculty">Faculty</option>
                    <option value="student">Student</option>
                  </>
                ) : (
                  <>
                    <option value="faculty">Faculty</option>
                    <option value="student">Student</option>
                  </>
                )}
              </select>
            </div>
            {formData.role !== 'admin' && (
              <div className="form-group">
                <label htmlFor="department">Department</label>
                <select id="department" name="department" className="filter-select" value={formData.department} onChange={handleChange}>
                  {departments.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {formData.role === 'faculty' && (
              <div className="form-group">
                <label htmlFor="staffId">Staff ID</label>
                <input id="staffId" name="staffId" className="form-control" value={formData.staffId} onChange={handleChange} required />
              </div>
            )}
            {formData.role === 'student' && (
              <div className="form-group">
                <label htmlFor="registerNumber">Register Number</label>
                <input
                  id="registerNumber"
                  name="registerNumber"
                  className="form-control"
                  value={formData.registerNumber}
                  onChange={handleChange}
                  required
                />
              </div>
            )}
            {editingId && (
              <label className="checkbox-row">
                <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} />
                <span>Account is active</span>
              </label>
            )}
          </div>
          <div className="form-actions">
            {editingId && (
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                Cancel
              </button>
            )}
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>
      </div>

      <div className="dashboard-section-card">
        <div className="users-toolbar">
          <h2>All Users</h2>
          <input
            className="search-input users-search"
            placeholder="Search by name, email, register number, or staff ID"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        {error && <p className="error-text-inline">{error}</p>}
        {loading ? (
          <Spinner />
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Identifier</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className="badge badge-primary">{user.role}</span>
                    </td>
                    <td>{user.department || 'N/A'}</td>
                    <td>{user.registerNumber || user.staffId || 'N/A'}</td>
                    <td>
                      <span className={`badge ${user.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button type="button" className="action-btn edit" onClick={() => handleEdit(user)}>
                          ✏️
                        </button>
                        <button type="button" className="action-btn" onClick={() => handleStatusToggle(user)}>
                          {user.isActive ? '⏸️' : '▶️'}
                        </button>
                        <button type="button" className="action-btn delete" onClick={() => handleDelete(user._id)}>
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;

```

## `client/src/components/StudentDashboard.jsx`

```jsx
import { useEffect, useState } from 'react';
import Spinner from './Spinner';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStudentProfile = async () => {
      try {
        setLoading(true);
        const response = await api.get('/students', {
          params: {
            page: 1,
            limit: 1
          }
        });

        const profile = response.data.students?.[0] || null;
        setStudent(profile);
        setError('');
      } catch (fetchError) {
        setError(fetchError.response?.data?.message || 'Failed to load your student profile.');
      } finally {
        setLoading(false);
      }
    };

    fetchStudentProfile();
  }, []);

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return (
      <div className="dashboard-section-card">
        <h2>Student Dashboard</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="dashboard-section-card">
        <h2>Student Dashboard</h2>
        <p>No academic record is linked to your account yet.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="dashboard-header">
        <h1>Student Dashboard</h1>
        <p>Welcome back, {user?.name}. Here is your profile and marks summary.</p>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Register Number</div>
          <div className="metric-value" style={{ fontSize: '1.25rem' }}>{student.registerNumber}</div>
          <div className="metric-footer">{student.department}</div>
        </div>
        <div className="metric-card success">
          <div className="metric-label">Total Marks</div>
          <div className="metric-value">{student.totalMarks}</div>
          <div className="metric-footer">Out of 600</div>
        </div>
        <div className="metric-card warning">
          <div className="metric-label">CGPA</div>
          <div className="metric-value">{student.cgpa}</div>
          <div className="metric-footer">Current semester performance</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">College Rank</div>
          <div className="metric-value">#{student.rank}</div>
          <div className="metric-footer">{student.result}</div>
        </div>
      </div>

      <div className="dashboard-section-card">
        <h2>Profile Details</h2>
        <div className="student-info-grid">
          <div className="student-info-item">
            <span className="student-info-label">Name</span>
            <span className="student-info-value">{student.name}</span>
          </div>
          <div className="student-info-item">
            <span className="student-info-label">Student ID</span>
            <span className="student-info-value">{student.studentId}</span>
          </div>
          <div className="student-info-item">
            <span className="student-info-label">Email</span>
            <span className="student-info-value">{student.email}</span>
          </div>
          <div className="student-info-item">
            <span className="student-info-label">Phone</span>
            <span className="student-info-value">{student.phone}</span>
          </div>
          <div className="student-info-item">
            <span className="student-info-label">Semester</span>
            <span className="student-info-value">Semester {student.semester}</span>
          </div>
          <div className="student-info-item">
            <span className="student-info-label">Section</span>
            <span className="student-info-value">{student.section}</span>
          </div>
        </div>
      </div>

      <div className="dashboard-section-card">
        <h2>Marks Overview</h2>
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Internal</th>
                <th>External</th>
                <th>Total</th>
                <th>Grade</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(student.marks).map(([key, subject]) => (
                <tr key={key}>
                  <td>{key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}</td>
                  <td>{subject.internal}</td>
                  <td>{subject.external}</td>
                  <td>{subject.total}</td>
                  <td>{subject.grade}</td>
                  <td>
                    <span className={`badge ${subject.result === 'Pass' ? 'badge-success' : 'badge-danger'}`}>
                      {subject.result}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;

```

## `client/src/App.jsx`

```jsx
import { Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Students from './components/Students';
import AddEditStudent from './components/AddEditStudent';
import Chatbot from './components/Chatbot';
import Login from './components/login';
import ProtectedRoute from './components/ProtectedRoute';
import Unauthorized from './components/Unauthorized';
import UserManagement from './components/UserManagement';
import StudentDashboard from './components/StudentDashboard';
import { useAuth } from './context/AuthContext';
import Spinner from './components/Spinner';

const menuByRole = {
  admin: [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', to: '/admin/dashboard' },
    { id: 'students', label: 'Students', icon: '🎓', to: '/admin/students' },
    { id: 'addStudent', label: 'Add Student', icon: '➕', to: '/admin/students/new' },
    { id: 'users', label: 'Users', icon: '🛡️', to: '/admin/users' },
    { id: 'chatbot', label: 'NLQ Chatbot', icon: '💬', to: '/admin/chatbot' }
  ],
  faculty: [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', to: '/faculty/dashboard' },
    { id: 'students', label: 'Students', icon: '🎓', to: '/faculty/students' },
    { id: 'chatbot', label: 'NLQ Chatbot', icon: '💬', to: '/faculty/chatbot' }
  ],
  student: [
    { id: 'dashboard', label: 'Dashboard', icon: '📘', to: '/student/dashboard' },
    { id: 'chatbot', label: 'Chatbot', icon: '💬', to: '/student/chatbot' }
  ]
};

const AppShell = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-container">
      <Sidebar menuItems={menuByRole[user.role]} user={user} onLogout={handleLogout} />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

function App() {
  const { isAuthenticated, defaultRoute, loading } = useAuth();

  if (loading) {
    return (
      <div className="full-page-loader">
        <Spinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to={defaultRoute} replace />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route element={<AppShell />}>
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<Dashboard />} />
          <Route path="/admin/students" element={<Students mode="admin" />} />
          <Route path="/admin/students/new" element={<AddEditStudent mode="admin" />} />
          <Route path="/admin/students/:id/edit" element={<AddEditStudent mode="admin" />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/chatbot" element={<Chatbot />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['faculty']} />}>
        <Route element={<AppShell />}>
          <Route path="/faculty" element={<Navigate to="/faculty/dashboard" replace />} />
          <Route path="/faculty/dashboard" element={<Dashboard />} />
          <Route path="/faculty/students" element={<Students mode="faculty" />} />
          <Route path="/faculty/students/:id/edit-marks" element={<AddEditStudent mode="faculty" />} />
          <Route path="/faculty/chatbot" element={<Chatbot />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['student']} />}>
        <Route element={<AppShell />}>
          <Route path="/student" element={<Navigate to="/student/dashboard" replace />} />
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/chatbot" element={<Chatbot />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={defaultRoute} replace />} />
    </Routes>
  );
}

export default App;

```

## `client/src/main.jsx`

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)

```

## `client/src/index.css`

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap');

:root {
  --bg-main: #090d16;
  --bg-sidebar: #0f172a;
  --bg-card: #1e293b;
  --bg-input: #1e293b;
  --border-color: #334155;
  --primary: #3b82f6;
  --primary-hover: #1d4ed8;
  --primary-light: rgba(59, 130, 246, 0.1);
  --text-main: #f8fafc;
  --text-muted: #94a3b8;
  --success: #10b981;
  --danger: #ef4444;
  --warning: #f59e0b;
  --shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -4px rgba(0, 0, 0, 0.3);
  --font-title: 'Outfit', sans-serif;
  --font-body: 'Inter', sans-serif;
  --transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background-color: var(--bg-main);
  color: var(--text-main);
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow: hidden;
}

/* App Layout */
.app-container {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

/* Sidebar */
.sidebar {
  width: 280px;
  background-color: var(--bg-sidebar);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  padding: 2rem 1.5rem;
  flex-shrink: 0;
  z-index: 100;
  transition: var(--transition);
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 3rem;
}

.sidebar-user-card {
  background-color: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.sidebar-user-name {
  font-weight: 700;
  color: var(--text-main);
}

.sidebar-user-meta {
  font-size: 0.8rem;
  color: var(--text-muted);
  word-break: break-word;
}

.sidebar-user-tag {
  display: inline-flex;
  align-self: flex-start;
  padding: 0.25rem 0.55rem;
  border-radius: 9999px;
  background-color: rgba(59, 130, 246, 0.12);
  color: #93c5fd;
  font-size: 0.75rem;
  font-weight: 600;
}

.sidebar-logo {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, var(--primary), #60a5fa);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 1.25rem;
  color: white;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.sidebar-title {
  font-family: var(--font-title);
  font-size: 1.25rem;
  font-weight: 700;
  background: linear-gradient(to right, #ffffff, #94a3b8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.sidebar-menu {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex-grow: 1;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.85rem 1rem;
  border-radius: 10px;
  color: var(--text-muted);
  text-decoration: none;
  font-weight: 500;
  font-size: 0.95rem;
  cursor: pointer;
  transition: var(--transition);
}

.menu-item:hover {
  background-color: rgba(255, 255, 255, 0.03);
  color: var(--text-main);
}

.menu-item.active {
  background-color: var(--primary-light);
  color: var(--primary);
  font-weight: 600;
}

.menu-item-icon {
  font-size: 1.2rem;
}

.sidebar-footer {
  margin-top: auto;
  border-top: 1px solid var(--border-color);
  padding-top: 1.5rem;
  font-size: 0.8rem;
  color: var(--text-muted);
  text-align: center;
}

/* Main Content Area */
.main-content {
  flex: 1;
  height: 100vh;
  overflow-y: auto;
  padding: 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  background: radial-gradient(circle at 80% 20%, rgba(59, 130, 246, 0.05) 0%, transparent 50%);
}

/* Dashboard Styles */
.dashboard-header {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.dashboard-header h1 {
  font-family: var(--font-title);
  font-size: 2.25rem;
  font-weight: 800;
  letter-spacing: -0.025em;
}

.dashboard-header p {
  color: var(--text-muted);
  font-size: 1rem;
}

/* Metrics Grid */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.5rem;
}

.metric-card {
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  box-shadow: var(--shadow);
  transition: var(--transition);
  position: relative;
  overflow: hidden;
}

.metric-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background-color: var(--primary);
}

.metric-card:hover {
  transform: translateY(-4px);
  border-color: #4b5563;
}

.metric-card.success::before { background-color: var(--success); }
.metric-card.warning::before { background-color: var(--warning); }
.metric-card.danger::before { background-color: var(--danger); }

.metric-label {
  color: var(--text-muted);
  font-size: 0.875rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.metric-value {
  font-family: var(--font-title);
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-main);
}

.metric-footer {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.metric-footer span {
  font-weight: 600;
  color: var(--text-main);
}

/* Dashboard Details Section */
.dashboard-details-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1.5rem;
}

@media (max-width: 1024px) {
  .dashboard-details-grid {
    grid-template-columns: 1fr;
  }
}

.dashboard-section-card {
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 1.75rem;
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.dashboard-section-card h2 {
  font-family: var(--font-title);
  font-size: 1.25rem;
  font-weight: 700;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0.75rem;
}

/* Tables */
.table-container {
  overflow-x: auto;
  border-radius: 10px;
  border: 1px solid var(--border-color);
}

.custom-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.9rem;
}

.custom-table th {
  background-color: rgba(255, 255, 255, 0.02);
  color: var(--text-muted);
  padding: 1rem;
  font-weight: 600;
  border-bottom: 1px solid var(--border-color);
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
}

.custom-table td {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-main);
}

.custom-table tr:last-child td {
  border-bottom: none;
}

.custom-table tr:hover td {
  background-color: rgba(255, 255, 255, 0.01);
}

/* Badges */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.6rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge-success { background-color: rgba(16, 185, 129, 0.15); color: #34d399; }
.badge-danger { background-color: rgba(239, 68, 68, 0.15); color: #f87171; }
.badge-primary { background-color: var(--primary-light); color: #60a5fa; }
.badge-warning { background-color: rgba(245, 158, 11, 0.15); color: #fbbf24; }

/* Students Section */
.students-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.search-input-wrapper {
  position: relative;
  flex-grow: 1;
  max-width: 400px;
}

.search-input {
  width: 100%;
  background-color: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  color: var(--text-main);
  font-family: var(--font-body);
  font-size: 0.9rem;
  outline: none;
  transition: var(--transition);
}

.search-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.search-icon-svg {
  position: absolute;
  left: 0.85rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  width: 16px;
  height: 16px;
}

.filter-select {
  background-color: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 0.75rem 1rem;
  color: var(--text-main);
  font-family: var(--font-body);
  font-size: 0.9rem;
  outline: none;
  cursor: pointer;
  transition: var(--transition);
}

.filter-select:focus {
  border-color: var(--primary);
}

.filter-pill {
  padding: 0.75rem 1rem;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  color: var(--primary);
  background-color: var(--primary-light);
  font-size: 0.9rem;
  font-weight: 600;
}

/* Pagination */
.pagination-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
  font-size: 0.875rem;
  color: var(--text-muted);
}

.pagination-buttons {
  display: flex;
  gap: 0.5rem;
}

.pagination-btn {
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
  color: var(--text-main);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
  display: flex;
  align-items: center;
  justify-content: center;
}

.pagination-btn:hover:not(:disabled) {
  background-color: rgba(255, 255, 255, 0.05);
  border-color: #4b5563;
}

.pagination-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Action Buttons */
.action-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.35rem;
  border-radius: 6px;
  transition: var(--transition);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.action-btn:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.action-btn.edit:hover { color: var(--primary); }
.action-btn.delete:hover { color: var(--danger); }

/* Forms */
.form-container {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.5rem;
}

.form-section-title {
  font-family: var(--font-title);
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--primary);
  margin-bottom: 0.5rem;
  border-bottom: 1px dashed var(--border-color);
  padding-bottom: 0.5rem;
  grid-column: 1 / -1;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-muted);
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--text-main);
  font-weight: 500;
}

.form-control {
  background-color: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 0.75rem;
  color: var(--text-main);
  font-family: var(--font-body);
  font-size: 0.9rem;
  outline: none;
  transition: var(--transition);
}

.form-control:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
}

.form-control:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: var(--transition);
  border: none;
  outline: none;
  font-family: var(--font-body);
}

.btn-primary {
  background-color: var(--primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: var(--primary-hover);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
}

.btn-secondary {
  background-color: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-main);
}

.btn-secondary:hover {
  background-color: rgba(255, 255, 255, 0.03);
  border-color: #4b5563;
}

.sidebar-logout-btn {
  width: 100%;
  margin-bottom: 1rem;
}

/* Chat Interface */
.chat-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 8rem);
  background-color: var(--bg-sidebar);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--shadow);
}

.chat-messages {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.chat-bubble-wrapper {
  display: flex;
  flex-direction: column;
  max-width: 75%;
}

.chat-bubble-wrapper.user {
  align-self: flex-end;
}

.chat-bubble-wrapper.bot {
  align-self: flex-start;
}

.chat-sender-name {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-bottom: 0.25rem;
  margin-left: 0.5rem;
}

.chat-bubble-wrapper.user .chat-sender-name {
  text-align: right;
  margin-left: 0;
  margin-right: 0.5rem;
}

.chat-bubble {
  padding: 0.85rem 1.15rem;
  border-radius: 16px;
  font-size: 0.95rem;
  line-height: 1.5;
  white-space: pre-wrap;
}

.chat-bubble-wrapper.user .chat-bubble {
  background-color: var(--primary);
  color: white;
  border-bottom-right-radius: 4px;
}

.chat-bubble-wrapper.bot .chat-bubble {
  background-color: var(--bg-card);
  color: var(--text-main);
  border-bottom-left-radius: 4px;
  border: 1px solid var(--border-color);
}

/* Markdown formatting inside chat bubbles */
.chat-bubble p {
  margin-bottom: 0.5rem;
}
.chat-bubble p:last-child {
  margin-bottom: 0;
}
.chat-bubble ul, .chat-bubble ol {
  margin-left: 1.25rem;
  margin-bottom: 0.5rem;
}
.chat-bubble li {
  margin-bottom: 0.25rem;
}
.chat-bubble strong {
  font-weight: 600;
  color: #60a5fa;
}

.chat-input-wrapper {
  border-top: 1px solid var(--border-color);
  padding: 1.25rem;
  background-color: rgba(15, 23, 42, 0.5);
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.chat-input {
  flex: 1;
  background-color: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 0.85rem 1.25rem;
  color: var(--text-main);
  font-family: var(--font-body);
  font-size: 0.95rem;
  outline: none;
  transition: var(--transition);
}

.chat-input:focus {
  border-color: var(--primary);
}

.chat-send-btn {
  background-color: var(--primary);
  border: none;
  border-radius: 12px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  transition: var(--transition);
  flex-shrink: 0;
}

.chat-send-btn:hover {
  background-color: var(--primary-hover);
  transform: scale(1.05);
}

.chat-send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.chat-send-btn svg {
  width: 20px;
  height: 20px;
  fill: currentColor;
}

/* Typing Indicator */
.typing-indicator {
  display: flex;
  gap: 0.35rem;
  padding: 0.35rem 0.5rem;
}

.typing-dot {
  width: 8px;
  height: 8px;
  background-color: var(--text-muted);
  border-radius: 50%;
  animation: bounce 1.3s infinite ease-in-out;
}

.typing-dot:nth-child(2) { animation-delay: 0.15s; }
.typing-dot:nth-child(3) { animation-delay: 0.3s; }

@keyframes bounce {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-6px); }
}

/* Preset Questions Grid */
.preset-queries-header {
  font-size: 0.8rem;
  color: var(--text-muted);
  font-weight: 600;
  text-transform: uppercase;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}

.preset-queries-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.5rem;
  max-height: 120px;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.preset-query-btn {
  background-color: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  font-size: 0.8rem;
  text-align: left;
  cursor: pointer;
  transition: var(--transition);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preset-query-btn:hover {
  background-color: var(--primary-light);
  color: var(--primary);
  border-color: var(--primary);
}

/* Scrollbars */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--bg-main);
}

::-webkit-scrollbar-thumb {
  background: #1e293b;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #334155;
}

/* Modal and Detail Card overlay */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
  padding: 1.5rem;
}

.modal-content {
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  width: 100%;
  max-width: 650px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  font-family: var(--font-title);
  font-size: 1.25rem;
  font-weight: 700;
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1.5rem;
  cursor: pointer;
  line-height: 1;
  transition: var(--transition);
}

.close-btn:hover {
  color: var(--text-main);
}

.modal-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.student-info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.student-info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.student-info-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
}

.student-info-value {
  font-size: 0.95rem;
  font-weight: 500;
}

.student-marks-block {
  border-top: 1px solid var(--border-color);
  padding-top: 1.25rem;
}

/* Spinner / Loading styles */
.spinner-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  width: 100%;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--border-color);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s infinite linear;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Toaster notification styling */
.toast {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  background-color: var(--bg-card);
  border-left: 4px solid var(--primary);
  color: var(--text-main);
  padding: 1rem 1.5rem;
  border-radius: 8px;
  box-shadow: var(--shadow);
  z-index: 2000;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  animation: slideIn 0.3s ease-out;
}

.toast.success { border-left-color: var(--success); }
.toast.danger { border-left-color: var(--danger); }
.toast.warning { border-left-color: var(--warning); }

.full-page-loader,
.centered-state {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.unauthorized-card {
  width: min(420px, 100%);
  align-items: center;
  text-align: center;
}

.users-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.users-search {
  max-width: 380px;
  padding-left: 1rem;
}

.error-text-inline {
  color: #fca5a5;
  font-size: 0.9rem;
}

@keyframes slideIn {
  0% { transform: translateX(100%); opacity: 0; }
  100% { transform: translateX(0); opacity: 1; }
}

```

