const Student = require('../models/Student');
const Subject = require('../models/Subject');
const User = require('../models/User');

exports.globalSearch = async (req, res) => {
  try {
    const query = (req.query.q || '').trim();
    if (!query || query.length < 2) {
      return res.json({
        students: [],
        faculties: [],
        subjects: [],
        departments: []
      });
    }

    const regex = new RegExp(query, 'i');

    // 1. Search Students
    const studentQuery = {
      $or: [
        { name: regex },
        { registerNumber: regex },
        { department: regex }
      ]
    };
    if (req.user.role === 'faculty' && req.user.department) {
      studentQuery.department = req.user.department;
    }
    const students = await Student.find(studentQuery).limit(6).select('name registerNumber department semester cgpa rank').lean();

    // 2. Search Faculty
    const faculties = await User.find({
      role: 'faculty',
      $or: [{ name: regex }, { staffId: regex }, { department: regex }, { email: regex }]
    }).limit(6).select('name staffId department email').lean();

    // 3. Search Subjects
    const subjects = await Subject.find({
      $or: [{ subjectCode: regex }, { subjectName: regex }, { department: regex }]
    }).limit(6).lean();

    // 4. Department matches
    const depts = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AI&DS'];
    const matchingDepts = depts.filter(d => d.toLowerCase().includes(query.toLowerCase()));

    res.json({
      students,
      faculties,
      subjects,
      departments: matchingDepts
    });
  } catch (error) {
    console.error('Error in global search:', error);
    res.status(500).json({ message: 'Error performing global search.' });
  }
};
