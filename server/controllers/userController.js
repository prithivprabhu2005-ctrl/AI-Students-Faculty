const User = require('../models/User');

const departments = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AI&DS'];

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
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

const validateRolePayload = ({ role, department, registerNumber, staffId }) => {
  if (!['staff', 'student'].includes(role)) {
    return 'Invalid role selected.';
  }

  if (role === 'staff') {
    if (department && !departments.includes(department)) {
      return 'Invalid department selected.';
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
        { phone: { $regex: search, $options: 'i' } },
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

    if (req.body.phone !== undefined) {
      user.phone = req.body.phone ? req.body.phone.trim() : '';
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
    const { isActive, status } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (req.user._id.toString() === user._id.toString() && (isActive === false || status === 'inactive')) {
      return res.status(400).json({ message: 'You cannot deactivate your own account.' });
    }

    if (typeof isActive === 'boolean') {
      user.isActive = isActive;
      user.status = isActive ? 'active' : 'inactive';
    }

    if (status) {
      user.status = status;
      user.isActive = status === 'active';
    }

    await user.save();

    return res.json({
      message: `User account status updated to ${user.status}.`,
      user: sanitizeUser(user)
    });
  } catch (error) {
    console.error('Update user status error:', error);
    return res.status(500).json({ message: 'Error updating user status.' });
  }
};
