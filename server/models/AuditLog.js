const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    userName: {
      type: String,
      required: true
    },
    role: {
      type: String,
      required: true
    },
    action: {
      type: String,
      required: true,
      enum: [
        'LOGIN', 'LOGOUT', 'STUDENT_ADDED', 'STUDENT_UPDATED', 'STUDENT_DELETED',
        'SUBJECT_ADDED', 'SUBJECT_UPDATED', 'SUBJECT_DELETED',
        'ATTENDANCE_UPDATED', 'ASSIGNMENT_UPDATED', 'REPORT_GENERATED',
        'PROFILE_UPDATED', 'SETTINGS_UPDATED', 'BACKUP_EXPORTED', 'BACKUP_RESTORED'
      ]
    },
    details: {
      type: String,
      default: ''
    },
    ipAddress: {
      type: String,
      default: '127.0.0.1'
    }
  },
  {
    timestamps: true
  }
);

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
module.exports = AuditLog;
