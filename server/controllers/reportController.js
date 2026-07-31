const Student = require('../models/Student');
const Subject = require('../models/Subject');
const Attendance = require('../models/Attendance');
const Assignment = require('../models/Assignment');
const User = require('../models/User');

// ──────────────────────────────────────────────────────────
// REPORT DATA GENERATOR FOR EXCEL & PDF
// Returns structured datasets for Department, Semester, Subject, Faculty, and Student reports
// ──────────────────────────────────────────────────────────
exports.generateReport = async (req, res) => {
  try {
    const { reportType = 'department', department, semester, subject, batchYear } = req.query;

    const filter = {};
    if (department) filter.department = department;
    if (semester) filter.semester = Number(semester);
    if (batchYear) filter.batchYear = Number(batchYear);

    if (req.user.role === 'faculty' && req.user.department) {
      filter.department = req.user.department;
    }

    let reportData = {
      reportType,
      generatedAt: new Date().toISOString(),
      generatedBy: req.user.name,
      filter
    };

    if (reportType === 'department') {
      const students = await Student.find(filter).sort({ rank: 1, cgpa: -1 }).lean();
      const total = students.length;
      const pass = students.filter(s => s.result === 'Pass').length;
      const avgCgpa = total > 0 ? Number((students.reduce((sum, s) => sum + s.cgpa, 0) / total).toFixed(2)) : 0;

      reportData.title = `Department Performance Report – ${filter.department || 'All Departments'}`;
      reportData.summary = {
        totalStudents: total,
        passCount: pass,
        failCount: total - pass,
        passPercentage: total > 0 ? Number(((pass / total) * 100).toFixed(1)) : 0,
        averageCgpa: avgCgpa
      };
      reportData.rows = students.map(s => ({
        registerNumber: s.registerNumber,
        name: s.name,
        department: s.department,
        semester: s.semester,
        cgpa: s.cgpa,
        percentage: s.percentage,
        rank: s.rank,
        arrears: s.arrears,
        result: s.result
      }));
    } else if (reportType === 'semester') {
      const students = await Student.find(filter).sort({ department: 1, rank: 1 }).lean();
      reportData.title = `Semester Report – Semester ${semester || 'All'}`;
      reportData.rows = students.map(s => ({
        registerNumber: s.registerNumber,
        name: s.name,
        department: s.department,
        semester: s.semester,
        cgpa: s.cgpa,
        arrears: s.arrears,
        result: s.result
      }));
    } else if (reportType === 'subject') {
      const subKey = subject || 'mathematics';
      const students = await Student.find(filter).lean();
      reportData.title = `Subject Evaluation Report – ${subKey.toUpperCase()}`;
      reportData.rows = students.map(s => {
        const m = s.marks?.[subKey] || {};
        return {
          registerNumber: s.registerNumber,
          name: s.name,
          department: s.department,
          subject: subKey,
          internal: m.internal || 0,
          external: m.external || 0,
          total: m.total || 0,
          grade: m.grade || 'F',
          result: m.result || 'Fail'
        };
      });
    } else if (reportType === 'faculty') {
      const faculties = await User.find({ role: 'faculty', isActive: true }).select('name email staffId department').lean();
      reportData.title = 'Faculty Performance & Evaluation Report';
      reportData.rows = faculties.map(f => ({
        staffId: f.staffId || 'N/A',
        name: f.name,
        department: f.department,
        email: f.email
      }));
    } else {
      // Student report
      const students = await Student.find(filter).sort({ rank: 1 }).lean();
      reportData.title = 'Student Master Progress Report';
      reportData.rows = students.map(s => ({
        registerNumber: s.registerNumber,
        name: s.name,
        department: s.department,
        semester: s.semester,
        cgpa: s.cgpa,
        percentage: s.percentage,
        rank: s.rank,
        result: s.result
      }));
    }

    res.json({ report: reportData });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ message: 'Error generating report.' });
  }
};
