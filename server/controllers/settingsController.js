const Settings = require('../models/Settings');
const AuditLog = require('../models/AuditLog');

exports.getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    res.json({ settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ message: 'Error fetching system settings.' });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admin can update system settings.' });
    }

    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings(req.body);
    } else {
      Object.assign(settings, req.body);
    }
    await settings.save();

    await AuditLog.create({
      user: req.user._id,
      userName: req.user.name,
      role: req.user.role,
      action: 'SETTINGS_UPDATED',
      details: 'Admin updated system configuration settings.'
    });

    res.json({
      message: 'System settings updated successfully.',
      settings
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ message: 'Error updating system settings.' });
  }
};
