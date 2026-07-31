const EmailLog = require('../models/EmailLog');
const EmailPreference = require('../models/EmailPreference');
const emailService = require('../services/emailService');
const emailScheduler = require('../services/emailScheduler');

// Get Email Logs (Admin) with Filter, Search, Metrics
exports.getEmailLogs = async (req, res) => {
  try {
    const { status, type, search, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (type) filter.type = type;

    if (search) {
      filter.$or = [
        { recipient: { $regex: search, $options: 'i' } },
        { studentName: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [logs, totalCount, totalSent, totalFailed] = await Promise.all([
      EmailLog.find(filter).sort({ sentTime: -1 }).skip(skip).limit(Number(limit)).lean(),
      EmailLog.countDocuments(filter),
      EmailLog.countDocuments({ status: 'Sent' }),
      EmailLog.countDocuments({ status: 'Failed' })
    ]);

    const overallTotal = totalSent + totalFailed;
    const successRate = overallTotal > 0 ? ((totalSent / overallTotal) * 100).toFixed(1) : 100;

    return res.json({
      logs,
      pagination: {
        total: totalCount,
        page: Number(page),
        pages: Math.ceil(totalCount / Number(limit))
      },
      metrics: {
        totalEmailsSent: totalSent,
        totalFailed,
        successRate: `${successRate}%`
      }
    });
  } catch (error) {
    console.error('Get email logs error:', error);
    return res.status(500).json({ message: 'Error fetching email logs.' });
  }
};

// Resend Failed Email (Admin)
exports.resendFailedEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedLog = await emailService.resendEmail(id);
    return res.json({ message: 'Email resent successfully.', log: updatedLog });
  } catch (error) {
    console.error('Resend email error:', error);
    return res.status(500).json({ message: error.message || 'Error resending email.' });
  }
};

// Preview Email HTML (Admin)
exports.previewEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const log = await EmailLog.findById(id).lean();
    if (!log) {
      return res.status(404).json({ message: 'Email log record not found.' });
    }
    return res.json({ log });
  } catch (error) {
    console.error('Preview email error:', error);
    return res.status(500).json({ message: 'Error previewing email.' });
  }
};

// Manually Trigger Daily Digest Dispatch (Admin)
exports.triggerDailyDigest = async (req, res) => {
  try {
    await emailScheduler.runDailyDigestJob();
    return res.json({ message: 'Daily Student Digest triggered and dispatched successfully.' });
  } catch (error) {
    console.error('Trigger daily digest error:', error);
    return res.status(500).json({ message: 'Error triggering Daily Digest dispatch.' });
  }
};

// Get Student Email Status & Preferences
exports.getStudentEmailStatus = async (req, res) => {
  try {
    const email = req.user.email;
    const lastEmail = await EmailLog.findOne({ recipient: email.toLowerCase() }).sort({ sentTime: -1 }).lean();
    let preference = await EmailPreference.findOne({ email: email.toLowerCase() }).lean();

    if (!preference) {
      preference = {
        dailyDigestEnabled: true,
        weeklyDigestEnabled: true,
        monthlyReportEnabled: true,
        attendanceAlertsEnabled: true,
        assignmentRemindersEnabled: true,
        timetableAlertsEnabled: true
      };
    }

    return res.json({
      lastEmailReceived: lastEmail ? {
        subject: lastEmail.subject,
        type: lastEmail.type,
        sentTime: lastEmail.sentTime,
        status: lastEmail.status
      } : null,
      nextScheduledEmail: 'Tomorrow at 8:00 AM (Daily Student Digest)',
      preference
    });
  } catch (error) {
    console.error('Get student email status error:', error);
    return res.status(500).json({ message: 'Error fetching student email status.' });
  }
};

// Update Student Preferences
exports.updateStudentPreferences = async (req, res) => {
  try {
    const email = req.user.email.toLowerCase();
    const regNo = req.user.registerNumber || 'STUDENT';

    let pref = await EmailPreference.findOne({ email });
    if (!pref) {
      pref = new EmailPreference({ email, registerNumber: regNo });
    }

    const {
      dailyDigestEnabled,
      weeklyDigestEnabled,
      monthlyReportEnabled,
      attendanceAlertsEnabled,
      assignmentRemindersEnabled,
      timetableAlertsEnabled
    } = req.body;

    if (dailyDigestEnabled !== undefined) pref.dailyDigestEnabled = dailyDigestEnabled;
    if (weeklyDigestEnabled !== undefined) pref.weeklyDigestEnabled = weeklyDigestEnabled;
    if (monthlyReportEnabled !== undefined) pref.monthlyReportEnabled = monthlyReportEnabled;
    if (attendanceAlertsEnabled !== undefined) pref.attendanceAlertsEnabled = attendanceAlertsEnabled;
    if (assignmentRemindersEnabled !== undefined) pref.assignmentRemindersEnabled = assignmentRemindersEnabled;
    if (timetableAlertsEnabled !== undefined) pref.timetableAlertsEnabled = timetableAlertsEnabled;

    await pref.save();

    return res.json({ message: 'Email notification preferences updated successfully.', preference: pref });
  } catch (error) {
    console.error('Update preferences error:', error);
    return res.status(500).json({ message: 'Error updating notification preferences.' });
  }
};
