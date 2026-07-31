const mongoose = require('mongoose');

const subjectMarkSchema = new mongoose.Schema({
  internal: { type: Number, required: true, min: 0, max: 40 },
  external: { type: Number, required: true, min: 0, max: 60 },
  total: { type: Number, default: 0 },
  grade: { type: String, default: 'F' },
  result: { type: String, default: 'Fail' }
}, { _id: false });

const studentSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  registerNumber: { type: String, required: true, unique: true, uppercase: true },
  name: { type: String, required: true },
  gender: { type: String, required: true, enum: ['Male', 'Female'] },
  department: { type: String, required: true, enum: ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AI&DS'] },
  batchYear: { type: Number, required: true },
  academicYear: { type: Number, required: true },
  semester: { type: Number, required: true },
  section: { type: String, required: true, uppercase: true },
  dob: { type: Date, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  address: { type: String, required: true },
  photoUrl: { type: String, default: '' },
  
  marks: {
    english: { type: subjectMarkSchema, required: true },
    mathematics: { type: subjectMarkSchema, required: true },
    programming: { type: subjectMarkSchema, required: true },
    database: { type: subjectMarkSchema, required: true },
    operatingSystems: { type: subjectMarkSchema, required: true },
    computerNetworks: { type: subjectMarkSchema, required: true }
  },

  totalMarks: { type: Number, default: 0 },
  averageMarks: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  cgpa: { type: Number, default: 0 },
  rank: { type: Number, default: 0 },
  arrears: { type: Number, default: 0 },
  result: { type: String, default: 'Fail' }
}, {
  timestamps: true
});

// Pre-save hook to calculate all academic totals and averages
studentSchema.pre('save', function (next) {
  const subjects = ['english', 'mathematics', 'programming', 'database', 'operatingSystems', 'computerNetworks'];
  
  let overallTotal = 0;
  let totalGradePoints = 0;
  let failCount = 0;

  subjects.forEach(subKey => {
    const sub = this.marks[subKey];
    // Calculate total marks for the subject
    sub.total = (sub.internal || 0) + (sub.external || 0);
    overallTotal += sub.total;

    // Grade and pass/fail calculations per subject
    if (sub.total >= 90) {
      sub.grade = 'O';
      totalGradePoints += 10;
      sub.result = 'Pass';
    } else if (sub.total >= 80) {
      sub.grade = 'A';
      totalGradePoints += 9;
      sub.result = 'Pass';
    } else if (sub.total >= 70) {
      sub.grade = 'B';
      totalGradePoints += 8;
      sub.result = 'Pass';
    } else if (sub.total >= 60) {
      sub.grade = 'C';
      totalGradePoints += 7;
      sub.result = 'Pass';
    } else if (sub.total >= 50) {
      sub.grade = 'D';
      totalGradePoints += 6;
      sub.result = 'Pass';
    } else {
      sub.grade = 'F';
      totalGradePoints += 0;
      sub.result = 'Fail';
      failCount++;
    }
  });

  this.totalMarks = overallTotal;
  this.averageMarks = Number((overallTotal / subjects.length).toFixed(2));
  this.percentage = Number((overallTotal / 600 * 100).toFixed(2));
  this.cgpa = Number((totalGradePoints / subjects.length).toFixed(2));
  this.arrears = failCount;
  this.result = failCount > 0 ? 'Fail' : 'Pass';

  next();
});

// Statics method to recalculate ranks college-wide
studentSchema.statics.recalculateRanks = async function() {
  const students = await this.find();

  students.sort((a, b) => {
    const cgpaDiff = (b.cgpa || 0) - (a.cgpa || 0);
    if (cgpaDiff !== 0) return cgpaDiff;

    const totalMarksDiff = (b.totalMarks || 0) - (a.totalMarks || 0);
    if (totalMarksDiff !== 0) return totalMarksDiff;

    return (a.registerNumber || '').localeCompare(b.registerNumber || '');
  });

  const bulkOps = students.map((student, idx) => ({
    updateOne: {
      filter: { _id: student._id },
      update: { rank: idx + 1 }
    }
  }));
  if (bulkOps.length > 0) {
    await this.bulkWrite(bulkOps);
  }
};

const Student = mongoose.model('Student', studentSchema);
module.exports = Student;
