const User = require('../models/User');
const Student = require('../models/Student');
const AuditLog = require('../models/AuditLog');

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).lean();
    if (!user) return res.status(404).json({ message: 'User not found.' });

    let studentDetails = null;
    if (user.role === 'student' && user.registerNumber) {
      studentDetails = await Student.findOne({ registerNumber: user.registerNumber }).lean();
    }

    res.json({
      user,
      studentDetails
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Error fetching profile.' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, address, profilePicture } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    if (name) user.name = name.trim();
    await user.save();

    // If student role, update student collection profile
    if (user.role === 'student' && user.registerNumber) {
      await Student.findOneAndUpdate(
        { registerNumber: user.registerNumber },
        { ...(name && { name: name.trim() }), ...(phone && { phone }), ...(address && { address }) }
      );
    }

    // Log audit
    await AuditLog.create({
      user: req.user._id,
      userName: user.name,
      role: user.role,
      action: 'PROFILE_UPDATED',
      details: 'User updated personal profile details.'
    });

    res.json({
      message: 'Profile updated successfully.',
      user
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Error updating profile.' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters.' });
    }

    const user = await User.findById(req.user._id).select('+password');
    const isValid = await user.comparePassword(currentPassword);

    if (!isValid) {
      return res.status(401).json({ message: 'Current password is incorrect.' });
    }

    user.password = newPassword;
    await user.save();

    await AuditLog.create({
      user: req.user._id,
      userName: user.name,
      role: user.role,
      action: 'PROFILE_UPDATED',
      details: 'User changed account password.'
    });

    res.json({ message: 'Password changed successfully.' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Error changing password.' });
  }
};
