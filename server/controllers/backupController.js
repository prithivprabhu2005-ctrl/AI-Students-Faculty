const Student = require('../models/Student');
const Subject = require('../models/Subject');
const Attendance = require('../models/Attendance');
const Assignment = require('../models/Assignment');
const User = require('../models/User');
const Settings = require('../models/Settings');
const AuditLog = require('../models/AuditLog');

exports.exportBackup = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admin can export system backups.' });
    }

    const students = await Student.find().lean();
    const subjects = await Subject.find().lean();
    const attendance = await Attendance.find().lean();
    const assignments = await Assignment.find().lean();
    const settings = await Settings.find().lean();

    const backupData = {
      exportedAt: new Date().toISOString(),
      exportedBy: req.user.email,
      version: '1.0.0',
      data: {
        students,
        subjects,
        attendance,
        assignments,
        settings
      }
    };

    await AuditLog.create({
      user: req.user._id,
      userName: req.user.name,
      role: req.user.role,
      action: 'BACKUP_EXPORTED',
      details: 'Admin exported full database JSON backup.'
    });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=edubot_backup_${new Date().toISOString().slice(0, 10)}.json`);
    res.json(backupData);
  } catch (error) {
    console.error('Error exporting backup:', error);
    res.status(500).json({ message: 'Error exporting database backup.' });
  }
};

exports.importBackup = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admin can restore database backups.' });
    }

    const { data } = req.body;
    if (!data) {
      return res.status(400).json({ message: 'Valid backup JSON payload is required.' });
    }

    if (data.students && Array.isArray(data.students)) {
      await Student.deleteMany({});
      await Student.insertMany(data.students);
    }

    if (data.subjects && Array.isArray(data.subjects)) {
      await Subject.deleteMany({});
      await Subject.insertMany(data.subjects);
    }

    if (data.attendance && Array.isArray(data.attendance)) {
      await Attendance.deleteMany({});
      await Attendance.insertMany(data.attendance);
    }

    if (data.assignments && Array.isArray(data.assignments)) {
      await Assignment.deleteMany({});
      await Assignment.insertMany(data.assignments);
    }

    await AuditLog.create({
      user: req.user._id,
      userName: req.user.name,
      role: req.user.role,
      action: 'BACKUP_RESTORED',
      details: 'Admin restored system database from JSON backup file.'
    });

    res.json({ message: 'Database backup restored successfully.' });
  } catch (error) {
    console.error('Error restoring backup:', error);
    res.status(500).json({ message: 'Error restoring database backup.' });
  }
};
