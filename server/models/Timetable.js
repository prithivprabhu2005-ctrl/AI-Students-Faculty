const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema({
  department: {
    type: String,
    required: true,
    enum: ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AI&DS']
  },
  academicYear: {
    type: Number,
    required: true
  },
  semester: {
    type: Number,
    required: true,
    min: 1,
    max: 8
  },
  section: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  day: {
    type: String,
    required: true,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  },
  period: {
    type: Number,
    required: true,
    min: 1,
    max: 8
  },
  startTime: {
    type: String,
    required: true,
    trim: true
  },
  endTime: {
    type: String,
    required: true,
    trim: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  facultyName: {
    type: String,
    required: true,
    trim: true
  },
  classroom: {
    type: String,
    required: true,
    trim: true
  },
  classType: {
    type: String,
    required: true,
    enum: ['Theory', 'Practical', 'Lab'],
    default: 'Theory'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Composite unique index to prevent duplicate period assignments
timetableSchema.index({ department: 1, semester: 1, section: 1, day: 1, period: 1 }, { unique: true });

const Timetable = mongoose.model('Timetable', timetableSchema);

module.exports = Timetable;
