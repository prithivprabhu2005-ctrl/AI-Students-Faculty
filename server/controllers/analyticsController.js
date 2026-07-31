const Student = require('../models/Student');
const Subject = require('../models/Subject');
const Attendance = require('../models/Attendance');
const Assignment = require('../models/Assignment');
const User = require('../models/User');

// ──────────────────────────────────────────────────────────
// 1. ADMIN ANALYTICS
// Aggregates college-wide KPIs, department stats, semester trends,
// subject pass rates, and top/bottom 10 rankers.
// ──────────────────────────────────────────────────────────
exports.getAdminAnalytics = async (req, res) => {
  try {
    // 1. Summary Counts
    const totalStudents = await Student.countDocuments();
    const totalFaculty = await User.countDocuments({ role: 'faculty', isActive: true });
    const totalSubjects = await Subject.countDocuments({ isActive: true });

    if (totalStudents === 0) {
      return res.json({
        summary: {
          totalStudents: 0, totalFaculty, totalSubjects,
          overallPassPercentage: 0, overallFailPercentage: 0, averageCgpa: 0,
          highestCgpaStudent: null, lowestCgpaStudent: null, studentsWithArrears: 0
        },
        departmentStats: [],
        semesterStats: [],
        subjectStats: [],
        top10: [],
        bottom10: []
      });
    }

    // 2. Overall Pass/Fail & CGPA stats
    const overallStats = await Student.aggregate([
      {
        $group: {
          _id: null,
          avgCgpa: { $avg: "$cgpa" },
          passCount: { $sum: { $cond: [{ $eq: ["$result", "Pass"] }, 1, 0] } },
          failCount: { $sum: { $cond: [{ $eq: ["$result", "Fail"] }, 1, 0] } },
          arrearsCount: { $sum: { $cond: [{ $gt: ["$arrears", 0] }, 1, 0] } }
        }
      }
    ]);

    const stat = overallStats[0] || {};
    const passCount = stat.passCount || 0;
    const failCount = stat.failCount || 0;
    const overallPassPercentage = Number(((passCount / totalStudents) * 100).toFixed(1));
    const overallFailPercentage = Number(((failCount / totalStudents) * 100).toFixed(1));
    const averageCgpa = Number((stat.avgCgpa || 0).toFixed(2));
    const studentsWithArrears = stat.arrearsCount || 0;

    // Highest & Lowest CGPA Students
    const highestCgpaStudent = await Student.findOne().sort({ cgpa: -1, totalMarks: -1 }).select('name registerNumber department cgpa percentage rank').lean();
    const lowestCgpaStudent = await Student.findOne().sort({ cgpa: 1, totalMarks: 1 }).select('name registerNumber department cgpa percentage rank').lean();

    // 3. Department-wise Performance Aggregation
    const departmentStats = await Student.aggregate([
      {
        $group: {
          _id: "$department",
          totalStudents: { $sum: 1 },
          avgCgpa: { $avg: "$cgpa" },
          passCount: { $sum: { $cond: [{ $eq: ["$result", "Pass"] }, 1, 0] } },
          failCount: { $sum: { $cond: [{ $eq: ["$result", "Fail"] }, 1, 0] } }
        }
      },
      {
        $project: {
          department: "$_id",
          totalStudents: 1,
          avgCgpa: { $round: ["$avgCgpa", 2] },
          passPercentage: { $round: [{ $multiply: [{ $divide: ["$passCount", "$totalStudents"] }, 100] }, 1] },
          failPercentage: { $round: [{ $multiply: [{ $divide: ["$failCount", "$totalStudents"] }, 100] }, 1] }
        }
      },
      { $sort: { department: 1 } }
    ]);

    // 4. Semester-wise Performance Aggregation
    const semesterStats = await Student.aggregate([
      {
        $group: {
          _id: "$semester",
          totalStudents: { $sum: 1 },
          avgCgpa: { $avg: "$cgpa" },
          passCount: { $sum: { $cond: [{ $eq: ["$result", "Pass"] }, 1, 0] } },
          failCount: { $sum: { $cond: [{ $eq: ["$result", "Fail"] }, 1, 0] } }
        }
      },
      {
        $project: {
          semester: "$_id",
          totalStudents: 1,
          avgCgpa: { $round: ["$avgCgpa", 2] },
          passPercentage: { $round: [{ $multiply: [{ $divide: ["$passCount", "$totalStudents"] }, 100] }, 1] },
          failPercentage: { $round: [{ $multiply: [{ $divide: ["$failCount", "$totalStudents"] }, 100] }, 1] }
        }
      },
      { $sort: { semester: 1 } }
    ]);

    // 5. Subject-wise Pass/Fail Performance
    const subjectsList = ['english', 'mathematics', 'programming', 'database', 'operatingSystems', 'computerNetworks'];
    const subjectLabels = {
      english: 'English',
      mathematics: 'Mathematics',
      programming: 'Programming',
      database: 'Database Systems',
      operatingSystems: 'Operating Systems',
      computerNetworks: 'Computer Networks'
    };

    const studentsAll = await Student.find().select('marks').lean();
    const subjectStats = subjectsList.map(key => {
      let pass = 0, fail = 0, totalMarksSum = 0, count = 0;
      studentsAll.forEach(st => {
        const m = st.marks?.[key];
        if (m && m.total !== undefined) {
          count++;
          totalMarksSum += m.total;
          if (m.result === 'Pass') pass++;
          else fail++;
        }
      });

      const total = count || 1;
      return {
        subjectKey: key,
        subjectName: subjectLabels[key],
        totalEvaluated: count,
        passPercentage: Number(((pass / total) * 100).toFixed(1)),
        failPercentage: Number(((fail / total) * 100).toFixed(1)),
        averageScore: Number((totalMarksSum / total).toFixed(1))
      };
    });

    // 6. Top 10 and Bottom 10 Students
    const top10 = await Student.find()
      .sort({ rank: 1, cgpa: -1 })
      .limit(10)
      .select('name registerNumber department semester cgpa rank percentage arrears result')
      .lean();

    const bottom10 = await Student.find()
      .sort({ cgpa: 1, totalMarks: 1 })
      .limit(10)
      .select('name registerNumber department semester cgpa rank percentage arrears result')
      .lean();

    res.json({
      summary: {
        totalStudents,
        totalFaculty,
        totalSubjects,
        overallPassPercentage,
        overallFailPercentage,
        averageCgpa,
        highestCgpaStudent,
        lowestCgpaStudent,
        studentsWithArrears
      },
      departmentStats,
      semesterStats,
      subjectStats,
      top10,
      bottom10
    });
  } catch (error) {
    console.error('Error fetching admin analytics:', error);
    res.status(500).json({ message: 'Error fetching admin analytics.' });
  }
};

// ──────────────────────────────────────────────────────────
// 2. FACULTY PERFORMANCE EVALUATION
// Computes metrics & performance score out of 100 for each faculty.
// Formula: (Pass % * 0.40) + (Avg Student CGPA/10 * 30) + (Avg Attendance % * 0.15) + (Assignment Completion % * 0.15)
// ──────────────────────────────────────────────────────────
exports.getFacultyPerformance = async (req, res) => {
  try {
    // If request comes from faculty user, fetch only their evaluation or department
    let facultyQuery = { role: 'faculty', isActive: true };
    if (req.user.role === 'faculty') {
      facultyQuery._id = req.user._id;
    }

    const faculties = await User.find(facultyQuery).select('name email staffId department').lean();
    const subjects = await Subject.find().lean();
    const attendanceRecords = await Attendance.find().lean();
    const assignmentRecords = await Assignment.find().lean();
    const allStudents = await Student.find().lean();

    const facultyEvaluations = faculties.map(fac => {
      // Find subjects handled by faculty (or department subjects)
      const handledSubjects = subjects.filter(s =>
        (s.faculty && s.faculty.toString() === fac._id.toString()) ||
        (s.department === fac.department)
      );

      // Students in faculty's department
      const deptStudents = allStudents.filter(st => st.department === fac.department);
      const totalStudentsTaught = deptStudents.length;

      // Avg Student CGPA
      const totalCgpa = deptStudents.reduce((sum, st) => sum + (st.cgpa || 0), 0);
      const averageStudentCgpa = totalStudentsTaught > 0 ? Number((totalCgpa / totalStudentsTaught).toFixed(2)) : 0;

      // Pass & Fail %
      const passStudents = deptStudents.filter(st => st.result === 'Pass').length;
      const passPercentage = totalStudentsTaught > 0 ? Number(((passStudents / totalStudentsTaught) * 100).toFixed(1)) : 0;
      const failPercentage = totalStudentsTaught > 0 ? Number((100 - passPercentage).toFixed(1)) : 0;

      // Avg Attendance % for faculty's department/subjects
      const facAttendance = attendanceRecords.filter(a => a.department === fac.department);
      const presentCount = facAttendance.filter(a => a.status === 'Present').length;
      const averageAttendance = facAttendance.length > 0 ? Number(((presentCount / facAttendance.length) * 100).toFixed(1)) : 85.0;

      // Assignment Completion / Score %
      const facAssignments = assignmentRecords.filter(a => a.department === fac.department);
      let assignScoreSum = 0;
      facAssignments.forEach(a => {
        if (a.totalMarks) assignScoreSum += (a.obtainedMarks / a.totalMarks) * 100;
      });
      const assignmentCompletionPercentage = facAssignments.length > 0 ? Number((assignScoreSum / facAssignments.length).toFixed(1)) : 80.0;

      // Calculate Faculty Performance Score out of 100
      // Weighted: Pass % (40%), Avg Student CGPA out of 10 scaled to 30 (30%), Attendance (15%), Assignment Completion (15%)
      const scoreRaw = (passPercentage * 0.40) + ((averageStudentCgpa / 10) * 30) + (averageAttendance * 0.15) + (assignmentCompletionPercentage * 0.15);
      const facultyPerformanceScore = Number(scoreRaw.toFixed(1));

      let ratingCategory = 'Needs Improvement';
      if (facultyPerformanceScore >= 90) ratingCategory = 'Outstanding';
      else if (facultyPerformanceScore >= 80) ratingCategory = 'Excellent';
      else if (facultyPerformanceScore >= 70) ratingCategory = 'Good';

      return {
        facultyId: fac._id,
        name: fac.name,
        email: fac.email,
        staffId: fac.staffId,
        department: fac.department,
        subjectsHandledCount: handledSubjects.length,
        subjectsHandled: handledSubjects.map(s => `${s.subjectCode} - ${s.subjectName}`),
        totalStudentsTaught,
        averageStudentCgpa,
        averageAttendance,
        assignmentCompletionPercentage,
        passPercentage,
        failPercentage,
        facultyPerformanceScore,
        ratingCategory
      };
    });

    res.json({ faculties: facultyEvaluations });
  } catch (error) {
    console.error('Error fetching faculty performance:', error);
    res.status(500).json({ message: 'Error fetching faculty performance evaluation.' });
  }
};

// ──────────────────────────────────────────────────────────
// 3. STUDENT PERSONAL ANALYTICS
// Returns personal performance, attendance, assignments, trend,
// strengths, and weak subjects for student.
// ──────────────────────────────────────────────────────────
exports.getStudentAnalytics = async (req, res) => {
  try {
    let searchRegNo = req.user.registerNumber;

    // Admin or Faculty can query a specific student by regNo query param
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

    // Faculty check: can only view students in their department
    if (req.user.role === 'faculty' && req.user.department && student.department !== req.user.department) {
      return res.status(403).json({ message: 'Access denied. Student is in another department.' });
    }

    // Attendance summary
    const attendanceRecords = await Attendance.find({
      $or: [{ student: student._id }, { registerNumber: student.registerNumber }]
    }).lean();

    const totalClasses = attendanceRecords.length;
    const attendedClasses = attendanceRecords.filter(a => a.status === 'Present').length;
    const attendancePercentage = totalClasses > 0 ? Number(((attendedClasses / totalClasses) * 100).toFixed(1)) : 0;

    // Assignment summary
    const assignmentRecords = await Assignment.find({
      $or: [{ student: student._id }, { registerNumber: student.registerNumber }]
    }).lean();

    let totalObtained = 0, totalMax = 0;
    assignmentRecords.forEach(a => {
      totalObtained += (a.obtainedMarks || 0);
      totalMax += (a.totalMarks || 0);
    });
    const assignmentAverage = totalMax > 0 ? Number(((totalObtained / totalMax) * 100).toFixed(1)) : 0;

    // Subject marks & grades breakdown
    const subjectLabels = {
      english: 'English',
      mathematics: 'Mathematics',
      programming: 'Programming',
      database: 'Database Systems',
      operatingSystems: 'Operating Systems',
      computerNetworks: 'Computer Networks'
    };

    const subjectBreakdown = [];
    if (student.marks) {
      Object.keys(student.marks).forEach(key => {
        const sub = student.marks[key];
        if (sub && sub.total !== undefined) {
          subjectBreakdown.push({
            key,
            name: subjectLabels[key] || key,
            internal: sub.internal,
            external: sub.external,
            total: sub.total,
            grade: sub.grade,
            result: sub.result
          });
        }
      });
    }

    // Sort to find Strengths (Top 2) and Weak Subjects (Lowest scores or Fail)
    subjectBreakdown.sort((a, b) => b.total - a.total);
    const strengths = subjectBreakdown.slice(0, 2).map(s => s.name);
    const weakSubjects = subjectBreakdown.filter(s => s.result === 'Fail' || s.total < 60).map(s => s.name);

    // Performance Trend (College avg vs Student)
    const deptStats = await Student.aggregate([
      { $match: { department: student.department } },
      { $group: { _id: null, avgCgpa: { $avg: "$cgpa" }, avgPct: { $avg: "$percentage" } } }
    ]);
    const deptAvg = deptStats[0] || { avgCgpa: 0, avgPct: 0 };

    res.json({
      student: {
        _id: student._id,
        name: student.name,
        registerNumber: student.registerNumber,
        department: student.department,
        batchYear: student.batchYear,
        semester: student.semester,
        section: student.section,
        cgpa: student.cgpa,
        percentage: student.percentage,
        rank: student.rank,
        arrears: student.arrears,
        result: student.result
      },
      attendancePercentage,
      totalClasses,
      attendedClasses,
      assignmentAverage,
      totalAssignments: assignmentRecords.length,
      subjectBreakdown,
      strengths,
      weakSubjects,
      departmentAverageCgpa: Number(deptAvg.avgCgpa.toFixed(2)),
      departmentAveragePercentage: Number(deptAvg.avgPct.toFixed(1))
    });
  } catch (error) {
    console.error('Error fetching student analytics:', error);
    res.status(500).json({ message: 'Error fetching student personal analytics.' });
  }
};

// ──────────────────────────────────────────────────────────
// 4. REPORTS GENERATOR
// Filterable report generator (Department, Semester, Subject, Faculty, Student)
// Query params: department, semester, subject, facultyId, batchYear, reportType
// ──────────────────────────────────────────────────────────
exports.getReports = async (req, res) => {
  try {
    const { reportType = 'department', department, semester, subject, facultyId, batchYear } = req.query;

    const filter = {};
    if (department) filter.department = department;
    if (semester) filter.semester = Number(semester);
    if (batchYear) filter.batchYear = Number(batchYear);

    // Faculty security check: restrict to faculty department
    if (req.user.role === 'faculty' && req.user.department) {
      filter.department = req.user.department;
    }

    let reportData = {};

    if (reportType === 'department') {
      const deptStudents = await Student.find(filter).sort({ rank: 1, cgpa: -1 }).lean();
      const total = deptStudents.length;
      const pass = deptStudents.filter(s => s.result === 'Pass').length;
      const fail = total - pass;
      const avgCgpa = total > 0 ? (deptStudents.reduce((acc, s) => acc + s.cgpa, 0) / total).toFixed(2) : 0;

      reportData = {
        title: `Department Report – ${filter.department || 'All Departments'}`,
        filter,
        totalStudents: total,
        passCount: pass,
        failCount: fail,
        passPercentage: total > 0 ? ((pass / total) * 100).toFixed(1) : 0,
        averageCgpa: avgCgpa,
        students: deptStudents.map(s => ({
          registerNumber: s.registerNumber,
          name: s.name,
          department: s.department,
          semester: s.semester,
          cgpa: s.cgpa,
          percentage: s.percentage,
          rank: s.rank,
          arrears: s.arrears,
          result: s.result
        }))
      };
    } else if (reportType === 'semester') {
      const semStudents = await Student.find(filter).sort({ department: 1, rank: 1 }).lean();
      reportData = {
        title: `Semester Report – Semester ${semester || 'All'}`,
        filter,
        totalStudents: semStudents.length,
        students: semStudents.map(s => ({
          registerNumber: s.registerNumber,
          name: s.name,
          department: s.department,
          semester: s.semester,
          cgpa: s.cgpa,
          arrears: s.arrears,
          result: s.result
        }))
      };
    } else if (reportType === 'subject') {
      const allSt = await Student.find(filter).lean();
      const subKey = subject || 'mathematics';
      const subStudents = allSt.map(s => {
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

      reportData = {
        title: `Subject Report – ${subKey.toUpperCase()}`,
        filter,
        totalStudents: subStudents.length,
        students: subStudents
      };
    } else if (reportType === 'faculty') {
      const facUsers = await User.find({ role: 'faculty', isActive: true }).select('name email staffId department').lean();
      reportData = {
        title: 'Faculty Evaluation & Performance Report',
        faculties: facUsers
      };
    } else {
      // Student report
      const students = await Student.find(filter).sort({ rank: 1 }).lean();
      reportData = {
        title: 'Student Performance Report',
        totalStudents: students.length,
        students
      };
    }

    res.json({ report: reportData });
  } catch (error) {
    console.error('Error generating reports:', error);
    res.status(500).json({ message: 'Error generating performance reports.' });
  }
};
