const AuditLog = require('../models/AuditLog');

exports.getAuditLogs = async (req, res) => {
  try {
    const query = {};
    if (req.user.role !== 'admin') {
      query.user = req.user._id;
    }

    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json({ logs });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ message: 'Error fetching audit logs.' });
  }
};

exports.getActivityDashboard = async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? {} : { user: req.user._id };

    const recentLogins = await AuditLog.find({ ...query, action: 'LOGIN' }).sort({ createdAt: -1 }).limit(5).lean();
    const recentStudentUpdates = await AuditLog.find({ action: { $in: ['STUDENT_ADDED', 'STUDENT_UPDATED'] } }).sort({ createdAt: -1 }).limit(5).lean();
    const recentAttendanceUpdates = await AuditLog.find({ action: 'ATTENDANCE_UPDATED' }).sort({ createdAt: -1 }).limit(5).lean();
    const recentReports = await AuditLog.find({ action: 'REPORT_GENERATED' }).sort({ createdAt: -1 }).limit(5).lean();

    res.json({
      recentLogins,
      recentStudentUpdates,
      recentAttendanceUpdates,
      recentReports
    });
  } catch (error) {
    console.error('Error fetching activity dashboard:', error);
    res.status(500).json({ message: 'Error fetching activity feed.' });
  }
};
