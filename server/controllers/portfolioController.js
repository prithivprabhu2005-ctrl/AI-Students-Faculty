const Portfolio = require('../models/Portfolio');
const Student = require('../models/Student');
const User = require('../models/User');

const getOrCreateStudentPortfolio = async (registerNumber) => {
  let student = await Student.findOne({ registerNumber: registerNumber.toUpperCase() });
  if (!student) {
    // Attempt search by email or studentId
    const user = await User.findOne({ registerNumber: registerNumber.toUpperCase() });
    if (user) {
      student = await Student.findOne({ email: user.email });
    }
  }

  if (!student) {
    throw new Error('Student profile not found.');
  }

  let portfolio = await Portfolio.findOne({ student: student._id }).populate('student', 'name email department registerNumber studentId');

  if (!portfolio) {
    portfolio = await Portfolio.create({
      student: student._id,
      registerNumber: student.registerNumber,
      studentId: student.studentId,
      technicalSkills: {
        programmingLanguages: [],
        webTechnologies: [],
        databases: [],
        cloudTechnologies: [],
        aiMlSkills: [],
        tools: []
      },
      certifications: [],
      sports: [],
      extraCurricular: [],
      workshops: [],
      internships: [],
      projects: [],
      languagesKnown: [
        { language: 'English', read: true, write: true, speak: true }
      ],
      softSkills: ['Communication', 'Team Work', 'Problem Solving'],
      achievements: []
    });
    portfolio = await Portfolio.findById(portfolio._id).populate('student', 'name email department registerNumber studentId');
  }

  return portfolio;
};

exports.getMyPortfolio = async (req, res) => {
  try {
    const regNo = req.user.registerNumber;
    if (!regNo && req.user.role === 'student') {
      return res.status(400).json({ message: 'Student Register Number missing from user token.' });
    }

    const portfolio = await getOrCreateStudentPortfolio(regNo);
    return res.json({ portfolio });
  } catch (error) {
    console.error('Get my portfolio error:', error);
    return res.status(500).json({ message: error.message || 'Error fetching student portfolio.' });
  }
};

exports.updateMyPortfolio = async (req, res) => {
  try {
    const regNo = req.user.registerNumber;
    if (!regNo && req.user.role === 'student') {
      return res.status(400).json({ message: 'Student Register Number missing from user token.' });
    }

    let portfolio = await getOrCreateStudentPortfolio(regNo);

    const {
      technicalSkills,
      certifications,
      sports,
      extraCurricular,
      workshops,
      internships,
      projects,
      languagesKnown,
      softSkills,
      achievements
    } = req.body;

    if (technicalSkills) portfolio.technicalSkills = technicalSkills;
    if (certifications) portfolio.certifications = certifications;
    if (sports) portfolio.sports = sports;
    if (extraCurricular) portfolio.extraCurricular = extraCurricular;
    if (workshops) portfolio.workshops = workshops;
    if (internships) portfolio.internships = internships;
    if (projects) portfolio.projects = projects;
    if (languagesKnown) portfolio.languagesKnown = languagesKnown;
    if (softSkills) portfolio.softSkills = softSkills;
    if (achievements) portfolio.achievements = achievements;

    await portfolio.save();

    const updatedPortfolio = await Portfolio.findById(portfolio._id).populate('student', 'name email department registerNumber studentId');
    return res.json({ message: 'Portfolio updated successfully.', portfolio: updatedPortfolio });
  } catch (error) {
    console.error('Update my portfolio error:', error);
    return res.status(500).json({ message: 'Error updating student portfolio.' });
  }
};

exports.getStudentPortfolio = async (req, res) => {
  try {
    const { registerNumber } = req.params;
    
    // Security check: student can only view their own unless admin
    if (req.user.role === 'student' && req.user.registerNumber?.toUpperCase() !== registerNumber.toUpperCase()) {
      return res.status(403).json({ message: 'You are not authorized to view another student\'s portfolio.' });
    }

    const portfolio = await getOrCreateStudentPortfolio(registerNumber);
    return res.json({ portfolio });
  } catch (error) {
    console.error('Get student portfolio error:', error);
    return res.status(500).json({ message: error.message || 'Error fetching student portfolio.' });
  }
};

exports.getAllPortfolios = async (req, res) => {
  try {
    const { search, department, skill, certification, sport, project } = req.query;

    const pipeline = [];

    // Lookup student details
    pipeline.push({
      $lookup: {
        from: 'students',
        localField: 'student',
        foreignField: '_id',
        as: 'studentDoc'
      }
    });
    pipeline.push({ $unwind: '$studentDoc' });

    const matchConditions = {};

    if (department) {
      matchConditions['studentDoc.department'] = department;
    }

    if (search) {
      matchConditions['$or'] = [
        { 'studentDoc.name': { $regex: search, $options: 'i' } },
        { 'studentDoc.registerNumber': { $regex: search, $options: 'i' } },
        { 'studentDoc.studentId': { $regex: search, $options: 'i' } }
      ];
    }

    if (skill) {
      const skillRegex = new RegExp(skill, 'i');
      matchConditions['$or'] = matchConditions['$or'] || [];
      matchConditions['$or'].push(
        { 'technicalSkills.programmingLanguages': skillRegex },
        { 'technicalSkills.webTechnologies': skillRegex },
        { 'technicalSkills.databases': skillRegex },
        { 'technicalSkills.cloudTechnologies': skillRegex },
        { 'technicalSkills.aiMlSkills': skillRegex },
        { 'technicalSkills.tools': skillRegex },
        { 'softSkills': skillRegex }
      );
    }

    if (certification) {
      matchConditions['certifications.name'] = { $regex: certification, $options: 'i' };
    }

    if (sport) {
      matchConditions['sports.sportName'] = { $regex: sport, $options: 'i' };
    }

    if (project) {
      matchConditions['$or'] = matchConditions['$or'] || [];
      matchConditions['$or'].push(
        { 'projects.projectTitle': { $regex: project, $options: 'i' } },
        { 'projects.technologiesUsed': { $regex: project, $options: 'i' } }
      );
    }

    if (Object.keys(matchConditions).length > 0) {
      pipeline.push({ $match: matchConditions });
    }

    pipeline.push({
      $project: {
        _id: 1,
        registerNumber: 1,
        studentId: 1,
        student: '$studentDoc',
        technicalSkills: 1,
        certifications: 1,
        sports: 1,
        extraCurricular: 1,
        workshops: 1,
        internships: 1,
        projects: 1,
        languagesKnown: 1,
        softSkills: 1,
        achievements: 1,
        updatedAt: 1
      }
    });

    const portfolios = await Portfolio.aggregate(pipeline);
    return res.json({ portfolios });
  } catch (error) {
    console.error('Get all portfolios error:', error);
    return res.status(500).json({ message: 'Error fetching portfolios list.' });
  }
};

exports.getPortfolioSummary = async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === 'student' && req.user.registerNumber) {
      filter.registerNumber = req.user.registerNumber.toUpperCase();
    }

    const portfolios = await Portfolio.find(filter).lean();

    let totalCertifications = 0;
    let totalProjects = 0;
    let totalSports = 0;
    let totalInternships = 0;
    const skillsSet = new Set();

    portfolios.forEach(p => {
      totalCertifications += (p.certifications || []).length;
      totalProjects += (p.projects || []).length;
      totalSports += (p.sports || []).length;
      totalInternships += (p.internships || []).length;

      if (p.technicalSkills) {
        (p.technicalSkills.programmingLanguages || []).forEach(s => skillsSet.add(s.toLowerCase()));
        (p.technicalSkills.webTechnologies || []).forEach(s => skillsSet.add(s.toLowerCase()));
        (p.technicalSkills.databases || []).forEach(s => skillsSet.add(s.toLowerCase()));
        (p.technicalSkills.cloudTechnologies || []).forEach(s => skillsSet.add(s.toLowerCase()));
        (p.technicalSkills.aiMlSkills || []).forEach(s => skillsSet.add(s.toLowerCase()));
        (p.technicalSkills.tools || []).forEach(s => skillsSet.add(s.toLowerCase()));
      }
      (p.softSkills || []).forEach(s => skillsSet.add(s.toLowerCase()));
    });

    return res.json({
      summary: {
        totalCertifications,
        totalSkills: skillsSet.size,
        totalProjects,
        totalSportsAchievements: totalSports,
        totalInternships,
        totalPortfolios: portfolios.length
      }
    });
  } catch (error) {
    console.error('Get portfolio summary error:', error);
    return res.status(500).json({ message: 'Error computing portfolio summary.' });
  }
};
