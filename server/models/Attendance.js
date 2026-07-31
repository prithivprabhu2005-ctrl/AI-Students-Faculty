const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student reference is required']
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject reference is required']
    },
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Faculty reference is required']
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      default: Date.now
    },
    status: {
      type: String,
      required: [true, 'Attendance status is required'],
      enum: ['Present', 'Absent'],
      default: 'Present'
    },
    // Optional cached fields for fast query rendering
    registerNumber: {
      type: String,
      trim: true,
      uppercase: true
    },
    studentName: {
      type: String,
      trim: true
    },
    subjectCode: {
      type: String,
      trim: true,
      uppercase: true
    },
    department: {
      type: String,
      enum: ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AI&DS']
    }
  },
  {
    timestamps: true
  }
);

// Prevent duplicate attendance for the same student + subject + date
attendanceSchema.index({ student: 1, subject: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);
module.exports = Attendance;
