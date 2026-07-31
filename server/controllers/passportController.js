const Student = require('../models/Student');
const Portfolio = require('../models/Portfolio');
const Attendance = require('../models/Attendance');
const Assignment = require('../models/Assignment');

// Helper to compute Profile Completion Percentage
const computeProfileCompletion = (student, portfolio, attPct, assignAvg) => {
  let score = 0;
  const maxScore = 100;

  // 1. Personal Info & Photo (20%)
  if (student.photoUrl && student.photoUrl.trim().length > 0) score += 10;
  if (student.name && student.phone && student.dob && student.email) score += 10;

  // 2. Academic Summary & Performance (20%)
  if (student.cgpa > 0) score += 10;
  if (attPct > 0 || assignAvg > 0) score += 10;

  // 3. Technical & Soft Skills (20%)
  const techSkills = portfolio.technicalSkills || {};
  const totalSkillsCount = (techSkills.programmingLanguages || []).length +
    (techSkills.webTechnologies || []).length +
    (techSkills.databases || []).length +
    (techSkills.cloudTechnologies || []).length +
    (techSkills.aiMlSkills || []).length +
    (techSkills.tools || []).length;
  if (totalSkillsCount >= 3) score += 12;
  else if (totalSkillsCount >= 1) score += 6;

  if ((portfolio.softSkills || []).length >= 1) score += 8;

  // 4. Certifications & Workshops (15%)
  if ((portfolio.certifications || []).length >= 2) score += 15;
  else if ((portfolio.certifications || []).length === 1) score += 8;
  else if ((portfolio.workshops || []).length >= 1) score += 5;

  // 5. Projects & Internships (15%)
  if ((portfolio.projects || []).length >= 2) score += 10;
  else if ((portfolio.projects || []).length === 1) score += 5;

  if ((portfolio.internships || []).length >= 1) score += 5;

  // 6. Sports & Extra-Curriculars & Achievements (10%)
  if ((portfolio.sports || []).length >= 1 || (portfolio.extraCurricular || []).length >= 1) score += 5;
  if ((portfolio.achievements || []).length >= 1 || (portfolio.languagesKnown || []).length >= 1) score += 5;

  return Math.min(100, Math.max(0, score));
};

exports.getMyPassport = async (req, res) => {
  try {
    const regNo = req.user.registerNumber;
    if (!regNo && req.user.role === 'student') {
      return res.status(400).json({ message: 'Student Register Number missing from user token.' });
    }

    req.params.registerNumber = regNo;
    return exports.getStudentPassport(req, res);
  } catch (error) {
    console.error('Error fetching my passport:', error);
    return res.status(500).json({ message: 'Error retrieving Digital Student Passport.' });
  }
};

exports.getStudentPassport = async (req, res) => {
  try {
    const searchRegNo = req.params.registerNumber || req.query.registerNumber || req.user.registerNumber;

    if (!searchRegNo) {
      return res.status(400).json({ message: 'Register number is required to fetch Digital Passport.' });
    }

    // Role check: Students can only view their own passport
    if (req.user.role === 'student' && req.user.registerNumber?.toUpperCase() !== searchRegNo.toUpperCase()) {
      return res.status(403).json({ message: 'You are authorized to view ONLY your own Digital Passport.' });
    }

    const student = await Student.findOne({ registerNumber: searchRegNo.toUpperCase() }).lean();
    if (!student) {
      return res.status(404).json({ message: 'Student academic record not found.' });
    }

    // Fetch or default Portfolio
    let portfolio = await Portfolio.findOne({ registerNumber: searchRegNo.toUpperCase() }).lean();
    if (!portfolio) {
      portfolio = {
        student: student._id,
        registerNumber: student.registerNumber,
        studentId: student.studentId,
        technicalSkills: { programmingLanguages: [], webTechnologies: [], databases: [], cloudTechnologies: [], aiMlSkills: [], tools: [] },
        certifications: [],
        sports: [],
        extraCurricular: [],
        workshops: [],
        internships: [],
        projects: [],
        languagesKnown: [{ language: 'English', read: true, write: true, speak: true }],
        softSkills: ['Communication', 'Team Work', 'Problem Solving'],
        achievements: []
      };
    }

    // Compute Attendance Percentage
    const attendanceRecords = await Attendance.find({
      $or: [{ student: student._id }, { registerNumber: student.registerNumber }]
    }).lean();
    const totalClasses = attendanceRecords.length;
    const attendedClasses = attendanceRecords.filter(a => a.status === 'Present').length;
    const attPct = totalClasses > 0 ? Number(((attendedClasses / totalClasses) * 100).toFixed(1)) : 85.0;

    // Compute Assignment Score
    const assignmentRecords = await Assignment.find({
      $or: [{ student: student._id }, { registerNumber: student.registerNumber }]
    }).lean();
    let totalObt = 0, totalMax = 0;
    assignmentRecords.forEach(a => {
      totalObt += (a.obtainedMarks || 0);
      totalMax += (a.totalMarks || 0);
    });
    const assignPct = totalMax > 0 ? Number(((totalObt / totalMax) * 100).toFixed(1)) : 80.0;

    // Compute Profile Completion Percentage
    const profileCompletion = computeProfileCompletion(student, portfolio, attPct, assignPct);

    // Structure Passport Data
    const passportData = {
      personalInformation: {
        photoUrl: student.photoUrl || '',
        studentId: student.studentId,
        registerNumber: student.registerNumber,
        name: student.name,
        gender: student.gender,
        department: student.department,
        semester: student.semester,
        section: student.section,
        batchYear: student.batchYear,
        academicYear: student.academicYear,
        dob: student.dob,
        email: student.email,
        phone: student.phone,
        address: student.address
      },
      academicSummary: {
        cgpa: student.cgpa,
        percentage: student.percentage,
        totalMarks: student.totalMarks,
        averageMarks: student.averageMarks,
        attendancePercentage: attPct,
        assignmentScore: assignPct,
        result: student.result,
        rank: student.rank,
        arrears: student.arrears
      },
      portfolio: {
        technicalSkills: portfolio.technicalSkills || {},
        softSkills: portfolio.softSkills || [],
        certifications: portfolio.certifications || [],
        projects: portfolio.projects || [],
        sports: portfolio.sports || [],
        extraCurricular: portfolio.extraCurricular || [],
        internships: portfolio.internships || [],
        workshops: portfolio.workshops || [],
        achievements: portfolio.achievements || [],
        languagesKnown: portfolio.languagesKnown || []
      },
      profileCompletionPercentage: profileCompletion,
      qrCodeData: `EDU-PASSPORT:${student.studentId}:${student.registerNumber}:${student.department}`
    };

    return res.json({ passport: passportData });
  } catch (error) {
    console.error('Error fetching student passport:', error);
    return res.status(500).json({ message: 'Error retrieving Digital Student Passport.' });
  }
};

exports.getPassportSummaryList = async (req, res) => {
  try {
    const { search, department } = req.query;
    const query = {};

    if (department) {
      query.department = department;
    }

    if (search) {
      query['$or'] = [
        { name: { $regex: search, $options: 'i' } },
        { registerNumber: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } }
      ];
    }

    const students = await Student.find(query).select('name registerNumber studentId department semester section cgpa rank result photoUrl phone email').lean();

    return res.json({ students });
  } catch (error) {
    console.error('Error listing passport directory:', error);
    return res.status(500).json({ message: 'Error fetching Digital Passport directory.' });
  }
};

exports.updatePassportProfile = async (req, res) => {
  try {
    const { registerNumber, photoUrl, phone, dob, gender, department, semester, section, address } = req.body;
    const targetRegNo = registerNumber || req.user.registerNumber;

    if (!targetRegNo) {
      return res.status(400).json({ message: 'Register Number is required.' });
    }

    if (req.user.role === 'student' && req.user.registerNumber?.toUpperCase() !== targetRegNo.toUpperCase()) {
      return res.status(403).json({ message: 'You are authorized to update ONLY your own Digital Passport.' });
    }

    const student = await Student.findOne({ registerNumber: targetRegNo.toUpperCase() });
    if (!student) {
      return res.status(404).json({ message: 'Student record not found.' });
    }

    if (photoUrl !== undefined) student.photoUrl = photoUrl;
    if (phone !== undefined) student.phone = phone;
    if (address !== undefined) student.address = address;

    // Admin can update administrative fields
    if (req.user.role === 'admin' || req.user.role === 'staff' || req.user.role === 'faculty') {
      if (dob !== undefined) student.dob = dob;
      if (gender !== undefined) student.gender = gender;
      if (department !== undefined) student.department = department;
      if (semester !== undefined) student.semester = semester;
      if (section !== undefined) student.section = section;
    }

    await student.save();

    return res.json({ message: 'Digital Student Passport profile updated successfully.', student });
  } catch (error) {
    console.error('Error updating passport profile:', error);
    return res.status(500).json({ message: 'Error updating Digital Student Passport.' });
  }
};
