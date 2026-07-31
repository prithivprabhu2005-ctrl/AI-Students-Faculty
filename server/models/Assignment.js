const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema(
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
    assignmentTitle: {
      type: String,
      required: [true, 'Assignment title is required'],
      trim: true
    },
    totalMarks: {
      type: Number,
      required: [true, 'Total marks are required'],
      min: [1, 'Total marks must be at least 1']
    },
    obtainedMarks: {
      type: Number,
      required: [true, 'Obtained marks are required'],
      min: [0, 'Obtained marks cannot be negative'],
      validate: {
        validator: function (v) {
          return v <= this.totalMarks;
        },
        message: 'Obtained marks cannot exceed total marks'
      }
    },
    submissionDate: {
      type: Date,
      default: Date.now
    },
    remarks: {
      type: String,
      trim: true,
      default: ''
    },
    // Optional cached fields for fast rendering
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

const Assignment = mongoose.model('Assignment', assignmentSchema);
module.exports = Assignment;
