const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Assignment = require('../models/Assignment');
const User = require('../models/User');

/**
 * Pure JavaScript Performance Prediction Algorithm
 * Calculates Expected CGPA, Pass Probability, Risk Level, Predicted Result, and Recommendations
 */
function calculateStudentPrediction(student, attendancePct = 85, assignmentAvg = 80) {
  const currentCgpa = student.cgpa || 0;
  const currentPct = student.percentage || 0;
  const arrears = student.arrears || 0;

  // 1. Pass Probability Calculation
  let passProb = 95;
  if (arrears > 0) passProb -= arrears * 20;
  if (attendancePct < 75) passProb -= 25;
  if (attendancePct < 65) passProb -= 15;
  if (assignmentAvg < 60) passProb -= 15;
  if (currentCgpa < 6.0) passProb -= 20;
  passProb = Math.max(10, Math.min(99, passProb));

  // 2. Expected CGPA Calculation
  let expectedCgpaDelta = 0;
  if (attendancePct >= 90 && assignmentAvg >= 80) expectedCgpaDelta += 0.3;
  else if (attendancePct < 75 || assignmentAvg < 60) expectedCgpaDelta -= 0.4;
  if (arrears > 0) expectedCgpaDelta -= 0.5;

  const expectedCgpa = Number(Math.max(0, Math.min(10.0, currentCgpa + expectedCgpaDelta)).toFixed(2));

  // 3. Risk Level Determination
  let riskLevel = 'Low';
  if (passProb < 60 || arrears >= 2 || attendancePct < 65) {
    riskLevel = 'High';
  } else if (passProb < 80 || arrears === 1 || attendancePct < 75 || assignmentAvg < 65) {
    riskLevel = 'Medium';
  }

  // 4. Predicted Result
  const predictedResult = passProb >= 50 ? 'Pass' : 'Fail';

  // 5. Improvement Suggestions / Recommendations
  const recommendations = [];
  if (attendancePct < 75) {
    recommendations.push(`Improve Attendance (current ${attendancePct}%, target ≥75%)`);
  }
  if (assignmentAvg < 70) {
    recommendations.push(`Improve Assignment Scores (current ${assignmentAvg}%)`);
  }

  const subjectLabels = {
    english: 'English',
    mathematics: 'Mathematics',
    programming: 'Programming',
    database: 'Database Systems',
    operatingSystems: 'Operating Systems',
    computerNetworks: 'Computer Networks'
  };

  if (student.marks) {
    Object.keys(student.marks).forEach(key => {
      const m = student.marks[key];
      if (m && (m.total < 60 || m.result === 'Fail')) {
        recommendations.push(`Focus on weak subject: ${subjectLabels[key] || key} (Score: ${m.total}/100)`);
      }
    });
  }

  if (recommendations.length === 0) {
    recommendations.push('Maintain current study consistency and class attendance.');
  }

  return {
    studentId: student._id,
    registerNumber: student.registerNumber,
    name: student.name,
    department: student.department,
    semester: student.semester,
    section: student.section,
    currentCgpa,
    expectedCgpa,
    passProbability: passProb,
    riskLevel,
    predictedResult,
    attendancePercentage: attendancePct,
    assignmentAverage: assignmentAvg,
    arrears,
    recommendations
  };
}

// ──────────────────────────────────────────────────────────
// 1. GET ALL PREDICTIONS (Admin & Faculty)
// ──────────────────────────────────────────────────────────
exports.predictAllStudents = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'faculty' && req.user.department) {
      filter.department = req.user.department;
    }
    if (req.query.department) {
      filter.department = req.query.department;
    }

    const students = await Student.find(filter).lean();
    const attendanceRecords = await Attendance.find().lean();
    const assignmentRecords = await Assignment.find().lean();

    // Map attendance & assignment per student
    const predictions = students.map(st => {
      const stAtt = attendanceRecords.filter(a => a.student?.toString() === st._id.toString() || a.registerNumber === st.registerNumber);
      const totalClasses = stAtt.length;
      const attendedClasses = stAtt.filter(a => a.status === 'Present').length;
      const attPct = totalClasses > 0 ? Number(((attendedClasses / totalClasses) * 100).toFixed(1)) : 85.0;

      const stAssign = assignmentRecords.filter(a => a.student?.toString() === st._id.toString() || a.registerNumber === st.registerNumber);
      let totalObt = 0, totalMax = 0;
      stAssign.forEach(a => {
        totalObt += (a.obtainedMarks || 0);
        totalMax += (a.totalMarks || 0);
      });
      const assignAvg = totalMax > 0 ? Number(((totalObt / totalMax) * 100).toFixed(1)) : 80.0;

      return calculateStudentPrediction(st, attPct, assignAvg);
    });

    // Summary counts
    const lowRiskCount = predictions.filter(p => p.riskLevel === 'Low').length;
    const mediumRiskCount = predictions.filter(p => p.riskLevel === 'Medium').length;
    const highRiskCount = predictions.filter(p => p.riskLevel === 'High').length;
    const studentsAtRisk = predictions.filter(p => p.riskLevel === 'High' || p.riskLevel === 'Medium');

    res.json({
      summary: {
        totalStudents: predictions.length,
        lowRiskCount,
        mediumRiskCount,
        highRiskCount,
        studentsAtRiskCount: studentsAtRisk.length
      },
      predictions,
      studentsAtRisk
    });
  } catch (error) {
    console.error('Error predicting student performance:', error);
    res.status(500).json({ message: 'Error computing AI predictions.' });
  }
};

// ──────────────────────────────────────────────────────────
// 2. GET PERSONAL PREDICTION (Student or specific RegNo)
// ──────────────────────────────────────────────────────────
exports.getStudentPrediction = async (req, res) => {
  try {
    let searchRegNo = req.user.registerNumber;
    if ((req.user.role === 'admin' || req.user.role === 'faculty') && req.query.registerNumber) {
      searchRegNo = req.query.registerNumber.toUpperCase();
    }

    if (!searchRegNo) {
      return res.status(400).json({ message: 'Register number is required.' });
    }

    const student = await Student.findOne({ registerNumber: searchRegNo }).lean();
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found.' });
    }

    const attendanceRecords = await Attendance.find({
      $or: [{ student: student._id }, { registerNumber: student.registerNumber }]
    }).lean();
    const totalClasses = attendanceRecords.length;
    const attendedClasses = attendanceRecords.filter(a => a.status === 'Present').length;
    const attPct = totalClasses > 0 ? Number(((attendedClasses / totalClasses) * 100).toFixed(1)) : 85.0;

    const assignmentRecords = await Assignment.find({
      $or: [{ student: student._id }, { registerNumber: student.registerNumber }]
    }).lean();
    let totalObt = 0, totalMax = 0;
    assignmentRecords.forEach(a => {
      totalObt += (a.obtainedMarks || 0);
      totalMax += (a.totalMarks || 0);
    });
    const assignAvg = totalMax > 0 ? Number(((totalObt / totalMax) * 100).toFixed(1)) : 80.0;

    const prediction = calculateStudentPrediction(student, attPct, assignAvg);

    res.json({ prediction });
  } catch (error) {
    console.error('Error getting student prediction:', error);
    res.status(500).json({ message: 'Error generating prediction.' });
  }
};

// ──────────────────────────────────────────────────────────
// 3. GET FACULTY INSIGHTS (Students at risk, weak subjects, top performers)
// ──────────────────────────────────────────────────────────
exports.getFacultyInsights = async (req, res) => {
  try {
    const department = req.user.department || req.query.department || 'CSE';
    const deptStudents = await Student.find({ department }).lean();

    const attendanceRecords = await Attendance.find({ department }).lean();
    const assignmentRecords = await Assignment.find({ department }).lean();

    const predictions = deptStudents.map(st => {
      const stAtt = attendanceRecords.filter(a => a.registerNumber === st.registerNumber);
      const totalClasses = stAtt.length;
      const attendedClasses = stAtt.filter(a => a.status === 'Present').length;
      const attPct = totalClasses > 0 ? Number(((attendedClasses / totalClasses) * 100).toFixed(1)) : 85.0;

      const stAssign = assignmentRecords.filter(a => a.registerNumber === st.registerNumber);
      let totalObt = 0, totalMax = 0;
      stAssign.forEach(a => {
        totalObt += (a.obtainedMarks || 0);
        totalMax += (a.totalMarks || 0);
      });
      const assignAvg = totalMax > 0 ? Number(((totalObt / totalMax) * 100).toFixed(1)) : 80.0;

      return calculateStudentPrediction(st, attPct, assignAvg);
    });

    const studentsAtRisk = predictions.filter(p => p.riskLevel === 'High' || p.riskLevel === 'Medium');
    const topPerformers = predictions.filter(p => p.currentCgpa >= 8.5);

    // Calculate class avg attendance & assignment completion
    const attPresentTotal = attendanceRecords.filter(a => a.status === 'Present').length;
    const classAvgAttendance = attendanceRecords.length > 0 ? Number(((attPresentTotal / attendanceRecords.length) * 100).toFixed(1)) : 85.0;

    let assignObtSum = 0, assignMaxSum = 0;
    assignmentRecords.forEach(a => {
      assignObtSum += (a.obtainedMarks || 0);
      assignMaxSum += (a.totalMarks || 0);
    });
    const classAssignmentCompletion = assignMaxSum > 0 ? Number(((assignObtSum / assignMaxSum) * 100).toFixed(1)) : 80.0;

    res.json({
      department,
      totalStudents: deptStudents.length,
      studentsAtRiskCount: studentsAtRisk.length,
      studentsAtRisk,
      topPerformers,
      classAvgAttendance,
      classAssignmentCompletion
    });
  } catch (error) {
    console.error('Error fetching faculty insights:', error);
    res.status(500).json({ message: 'Error fetching faculty insights.' });
  }
};
