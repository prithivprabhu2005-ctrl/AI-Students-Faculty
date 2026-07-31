const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
  {
    subjectCode: {
      type: String,
      required: [true, 'Subject Code is required'],
      unique: true,
      uppercase: true,
      trim: true
    },
    subjectName: {
      type: String,
      required: [true, 'Subject Name is required'],
      trim: true
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      enum: ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AI&DS']
    },
    semester: {
      type: Number,
      required: [true, 'Semester is required'],
      min: 1,
      max: 8
    },
    credits: {
      type: Number,
      required: [true, 'Credits are required'],
      min: 1,
      max: 6,
      default: 3
    },
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Backward compatibility virtuals for code & name
subjectSchema.virtual('code').get(function () {
  return this.subjectCode;
}).set(function (v) {
  this.subjectCode = v;
});

subjectSchema.virtual('name').get(function () {
  return this.subjectName;
}).set(function (v) {
  this.subjectName = v;
});

const Subject = mongoose.model('Subject', subjectSchema);
module.exports = Subject;
