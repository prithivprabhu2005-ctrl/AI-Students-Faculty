const mongoose = require('mongoose');

const emailPreferenceSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  registerNumber: {
    type: String,
    required: true,
    uppercase: true
  },
  dailyDigestEnabled: {
    type: Boolean,
    default: true
  },
  weeklyDigestEnabled: {
    type: Boolean,
    default: true
  },
  monthlyReportEnabled: {
    type: Boolean,
    default: true
  },
  attendanceAlertsEnabled: {
    type: Boolean,
    default: true
  },
  assignmentRemindersEnabled: {
    type: Boolean,
    default: true
  },
  timetableAlertsEnabled: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const EmailPreference = mongoose.model('EmailPreference', emailPreferenceSchema);

module.exports = EmailPreference;
