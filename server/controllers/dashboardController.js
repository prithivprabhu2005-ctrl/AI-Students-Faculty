const Student = require('../models/Student');

const departments = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AI&DS'];

const emptyDashboard = (scopeLabel = 'student database') => ({
  totalStudents: 0,
  passPercentage: 0,
  averageCgpa: 0,
  collegeTopper: null,
  highestMarks: null,
  lowestMarks: null,
  departmentStats: [],
  departmentToppers: [],
  scopeLabel
});

// Get all dashboard statistical calculations and aggregations
exports.getDashboardStats = async (req, res) => {
  try {
    if (req.user.role === 'student') {
      return res.status(403).json({
        message: 'Students are not authorized to view dashboard analytics.'
      });
    }

    const query = req.user.role === 'faculty' ? { department: req.user.department } : {};
    const totalStudents = await Student.countDocuments(query);
    const scopeLabel =
      req.user.role === 'faculty' ? `${req.user.department} department` : 'college';
    
    if (totalStudents === 0) {
      return res.json(emptyDashboard(scopeLabel));
    }

    // 1. Pass Percentage (students with zero arrears / total students)
    const passCount = await Student.countDocuments({ ...query, result: 'Pass' });
    const passPercentage = Number(((passCount / totalStudents) * 100).toFixed(2));

    // 2. Average CGPA of all students
    const avgCgpaData = await Student.aggregate([
      { $match: query },
      { $group: { _id: null, avgCgpa: { $avg: '$cgpa' } } }
    ]);
    const averageCgpa = avgCgpaData.length > 0 ? Number(avgCgpaData[0].avgCgpa.toFixed(2)) : 0;

    // 3. College Topper (student with rank 1)
    const collegeTopper = await Student.findOne(query).sort({ cgpa: -1, totalMarks: -1, rank: 1 });

    // 4. Highest Marks Student
    const highestMarks = await Student.findOne(query).sort({ totalMarks: -1 });

    // 5. Lowest Marks Student
    const lowestMarks = await Student.findOne(query).sort({ totalMarks: 1 });

    // 6. Department wise count, average CGPA, and pass rates using Mongo Aggregation
    const departmentStatsRaw = await Student.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 },
          avgCgpa: { $avg: '$cgpa' },
          passCount: {
            $sum: { $cond: [{ $eq: ['$result', 'Pass'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const departmentStats = departmentStatsRaw.map(dept => ({
      department: dept._id,
      count: dept.count,
      avgCgpa: Number(dept.avgCgpa.toFixed(2)),
      passPercentage: Number(((dept.passCount / dept.count) * 100).toFixed(2))
    }));

    // 7. Find Toppers for each department
    const departmentToppers = [];
    const targetDepartments =
      req.user.role === 'faculty' ? [req.user.department] : departments;

    for (const dept of targetDepartments) {
      const topper = await Student.findOne({ department: dept }).sort({ cgpa: -1, totalMarks: -1 });
      if (topper) {
        departmentToppers.push({
          department: dept,
          name: topper.name,
          registerNumber: topper.registerNumber,
          cgpa: topper.cgpa,
          totalMarks: topper.totalMarks
        });
      }
    }

    res.json({
      totalStudents,
      passPercentage,
      averageCgpa,
      collegeTopper,
      highestMarks,
      lowestMarks,
      departmentStats,
      departmentToppers,
      scopeLabel
    });
  } catch (error) {
    console.error('Error generating dashboard stats:', error);
    res.status(500).json({ message: 'Error loading dashboard statistics' });
  }
};
