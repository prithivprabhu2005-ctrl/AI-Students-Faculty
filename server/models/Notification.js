const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true
    },
    type: {
      type: String,
      required: true,
      enum: ['Low Attendance Warning', 'Assignment Due Reminder', 'Poor Performance Alert', 'Faculty Announcement', 'New Subject Added', 'General'],
      default: 'General'
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    recipientRole: {
      type: String,
      enum: ['all', 'student', 'faculty', 'admin'],
      default: 'all'
    },
    recipientDepartment: {
      type: String,
      enum: ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AI&DS', 'all'],
      default: 'all'
    },
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    readBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  {
    timestamps: true
  }
);

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
