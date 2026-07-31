const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Student = require('../models/Student');
const { sendPasswordResetEmail } = require('../services/emailService');

const departments = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AI&DS'];
const allowedRoles = ['admin', 'student'];

const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  department: user.department,
  phone: user.phone || '',
  registerNumber: user.registerNumber,
  staffId: user.staffId,
  isActive: user.isActive,
  status: user.status || (user.isActive ? 'active' : 'pending'),
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

const generateNextStudentId = async () => {
  const count = await Student.countDocuments();
  let candidateNumber = count + 1;
  let candidateId = `STU${String(candidateNumber).padStart(3, '0')}`;

  while (await Student.findOne({ studentId: candidateId })) {
    candidateNumber++;
    candidateId = `STU${String(candidateNumber).padStart(3, '0')}`;
  }

  return candidateId;
};

const signToken = (user) =>
  jwt.sign(
    {
      userId: user._id,
      role: user.role
    },
    process.env.JWT_SECRET || 'fallback_secret',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '1d'
    }
  );

const validateRoleSpecificFields = ({ role, department }) => {
  if (!allowedRoles.includes(role)) {
    return 'Invalid role selected.';
  }

  if (role === 'student') {
    if (!department || !departments.includes(department)) {
      return 'A valid department is required for student accounts.';
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
      phone,
      registerNumber,
      staffId
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    const validationError = validateRoleSpecificFields({
      role,
      department,
      registerNumber
    });

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const userCount = await User.countDocuments();
    const isBootstrapAdmin = userCount === 0 && role === 'admin';
    const isPublicStudentSignup = !req.user && role === 'student';

    if (!isBootstrapAdmin && !isPublicStudentSignup) {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
          message: 'Only an admin can create user accounts.'
        });
      }

      if (!['admin', 'student'].includes(role)) {
        return res.status(400).json({
          message: 'Invalid user role selected.'
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

    const accountStatus = isPublicStudentSignup ? 'pending' : (req.body.status || 'active');
    const isAccountActive = accountStatus === 'active';

    const autoStudentId = role === 'student' ? await generateNextStudentId() : null;
    const finalRegNum = registerNumber
      ? registerNumber.toUpperCase().trim()
      : (autoStudentId || undefined);

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role,
      department: department || undefined,
      phone: phone ? phone.trim() : '',
      registerNumber: finalRegNum,
      staffId: staffId ? staffId.toUpperCase().trim() : undefined,
      isActive: isAccountActive,
      status: accountStatus
    });

    if (role === 'student') {
      const existingStudent = await Student.findOne({
        $or: [
          { registerNumber: finalRegNum },
          { studentId: autoStudentId },
          { email: email.toLowerCase().trim() }
        ]
      });

      if (!existingStudent) {
        const defaultMarks = {
          internal: 30,
          external: 45,
          total: 75,
          grade: 'B',
          result: 'Pass'
        };
        await Student.create({
          studentId: autoStudentId,
          registerNumber: finalRegNum,
          name: name.trim(),
          gender: req.body.gender || 'Male',
          department: department || 'CSE',
          batchYear: req.body.batchYear || new Date().getFullYear(),
          academicYear: req.body.academicYear || 1,
          semester: req.body.semester || 1,
          section: req.body.section || 'A',
          dob: req.body.dob || new Date('2002-01-01'),
          phone: phone ? phone.trim() : '0000000000',
          email: email.toLowerCase().trim(),
          address: req.body.address || 'College Campus',
          marks: {
            english: defaultMarks,
            mathematics: defaultMarks,
            programming: defaultMarks,
            database: defaultMarks,
            operatingSystems: defaultMarks,
            computerNetworks: defaultMarks
          }
        });
        await Student.recalculateRanks();
      }
    }

    if (isBootstrapAdmin) {
      const token = signToken(user);
      return res.status(201).json({
        message: 'Admin account created successfully.',
        token,
        user: sanitizeUser(user)
      });
    }

    if (isPublicStudentSignup) {
      return res.status(201).json({
        message: 'Registration submitted successfully! Your account status is Pending. An Administrator must approve your account before you can log in.',
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

    if (!user.isActive || user.status === 'pending' || user.status === 'rejected') {
      const msg =
        user.status === 'pending'
          ? 'Your account registration is pending administrator approval. Please contact your administrator.'
          : 'Your account is inactive or rejected. Please contact the administrator.';
      return res.status(403).json({ message: msg });
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

// ──────────────────────────────────────────────────────────
// FORGOT & RESET PASSWORD FLOW
// ──────────────────────────────────────────────────────────
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email address is required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    }

    // Generate secure random reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour validity

    await user.save();
    await sendPasswordResetEmail(user.email, resetToken);

    return res.json({
      message: 'If an account with that email exists, a password reset link has been sent.',
      resetToken // Returned for testing convenience
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ message: 'Error processing password reset request.' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Reset token and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters.' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Password reset token is invalid or has expired.' });
    }

    user.password = newPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    return res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ message: 'Error resetting password.' });
  }
};
