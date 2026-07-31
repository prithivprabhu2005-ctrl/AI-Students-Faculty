const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema({
  recipient: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  studentName: {
    type: String,
    default: 'Student'
  },
  subject: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'Welcome',
      'PasswordReset',
      'AttendanceAlert',
      'AssignmentNotification',
      'MarksUpdated',
      'TimetableNotification',
      'PortfolioNotification',
      'EventNotification',
      'LeaveNotification',
      'DailyDigest',
      'WeeklyDigest',
      'MonthlyReport'
    ],
    default: 'DailyDigest'
  },
  htmlContent: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Sent', 'Failed', 'Pending', 'Retried'],
    default: 'Sent'
  },
  errorMessage: {
    type: String,
    default: ''
  },
  retryCount: {
    type: Number,
    default: 0
  },
  sentTime: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

emailLogSchema.index({ recipient: 1, sentTime: -1 });
emailLogSchema.index({ status: 1 });
emailLogSchema.index({ type: 1 });

const EmailLog = mongoose.model('EmailLog', emailLogSchema);

module.exports = EmailLog;
