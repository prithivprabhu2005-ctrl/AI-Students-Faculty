const Student = require('../models/Student');

const buildStudentAccessQuery = (user) => {
  if (user.role === 'faculty') {
    return { department: user.department };
  }

  if (user.role === 'student') {
    return { registerNumber: user.registerNumber };
  }

  return {};
};

const canAccessStudent = (user, student) => {
  if (user.role === 'admin') {
    return true;
  }

  if (user.role === 'faculty') {
    return user.department === student.department;
  }

  if (user.role === 'student') {
    return user.registerNumber === student.registerNumber;
  }

  return false;
};

const isMarksOnlyUpdate = (payload = {}) => {
  const keys = Object.keys(payload);
  return keys.length > 0 && keys.every((key) => key === 'marks');
};

// Get all students with search, filters, and pagination
exports.getStudents = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const { search, department, semester, batchYear } = req.query;

    const query = buildStudentAccessQuery(req.user);

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { registerNumber: { $regex: search, $options: 'i' } }
      ];
    }

    if (department && req.user.role === 'admin') {
      query.department = department;
    }

    if (semester) {
      query.semester = parseInt(semester);
    }

    if (batchYear) {
      query.batchYear = parseInt(batchYear);
    }

    const skipIndex = (page - 1) * limit;
    const totalStudents = await Student.countDocuments(query);
    
    // Sort by rank as default so that users see top students first or sorted order
    const students = await Student.find(query)
      .sort({ rank: 1 })
      .skip(skipIndex)
      .limit(limit);

    res.json({
      students,
      totalStudents,
      totalPages: Math.ceil(totalStudents / limit),
      currentPage: page
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ message: 'Error fetching students data' });
  }
};

// Get a single student by ID
exports.getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (!canAccessStudent(req.user, student)) {
      return res.status(403).json({ message: 'You are not authorized to view this student profile.' });
    }
    res.json(student);
  } catch (error) {
    console.error('Error fetching student by ID:', error);
    res.status(500).json({ message: 'Error fetching student details' });
  }
};

const User = require('../models/User');

const generateNextStudentId = async () => {
  const count = await Student.countDocuments();
  let candidateNumber = count + 1;
  let candidateId = `STU${String(candidateNumber).padStart(3, '0')}`;

  while (await Student.findOne({ studentId: candidateId })) {
    candidateNumber++;
    candidateId = `STU${String(candidateNumber).padStart(3, '0')}`;
  }

  return candidateId;
};

// Create a new student
exports.createStudent = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admin can create student records.' });
    }

    // Auto-generate studentId if not provided or empty
    if (!req.body.studentId || !req.body.studentId.trim()) {
      req.body.studentId = await generateNextStudentId();
    }

    // Validation: Check duplicate studentId
    const existingStudentId = await Student.findOne({ studentId: req.body.studentId.trim() });
    if (existingStudentId) {
      return res.status(400).json({ message: 'Student ID already exists' });
    }

    // Validation: Check duplicate register number
    const existingReg = await Student.findOne({ registerNumber: req.body.registerNumber.toUpperCase().trim() });
    if (existingReg) {
      return res.status(400).json({ message: 'Register Number already exists' });
    }

    // Validation: Check duplicate email
    if (req.body.email) {
      const existingEmail = await Student.findOne({ email: req.body.email.toLowerCase().trim() });
      if (existingEmail) {
        return res.status(400).json({ message: 'Email address already exists' });
      }
    }

    // Creating document (triggers pre-save hook for academic calculations)
    const newStudent = new Student(req.body);
    await newStudent.save();

    // Requirement 8: Automatically create login account in User model if not existing
    const normalizedReg = newStudent.registerNumber.toUpperCase().trim();
    const normalizedEmail = newStudent.email.toLowerCase().trim();
    const existingUser = await User.findOne({
      $or: [{ registerNumber: normalizedReg }, { email: normalizedEmail }]
    });

    if (!existingUser) {
      await User.create({
        name: newStudent.name.trim(),
        email: normalizedEmail,
        password: req.body.password || 'Student@123',
        role: 'student',
        department: newStudent.department,
        phone: newStudent.phone || '',
        registerNumber: normalizedReg,
        isActive: true
      });
    }

    // Recalculate ranks college-wide
    await Student.recalculateRanks();

    // Return the saved student with ranks updated
    const savedStudent = await Student.findById(newStudent._id);
    res.status(201).json(savedStudent);
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({ message: error.message || 'Error creating student' });
  }
};

// Update student details/marks
exports.updateStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (!canAccessStudent(req.user, student)) {
      return res.status(403).json({ message: 'You are not authorized to update this student record.' });
    }

    if (req.user.role === 'student') {
      return res.status(403).json({ message: 'Students are not allowed to update marks or student records.' });
    }

    if (req.user.role === 'faculty') {
      if (!isMarksOnlyUpdate(req.body)) {
        return res.status(403).json({ message: 'Faculty can update only student marks.' });
      }

      student.marks = req.body.marks;
      await student.save();
      await Student.recalculateRanks();

      const updatedStudent = await Student.findById(req.params.id);
      return res.json(updatedStudent);
    }

    // Verify register number is unique if changing it
    if (req.body.registerNumber && req.body.registerNumber.toUpperCase() !== student.registerNumber) {
      const existing = await Student.findOne({ registerNumber: req.body.registerNumber });
      if (existing) {
        return res.status(400).json({ message: 'Register Number already exists' });
      }
    }

    // Assign new properties
    Object.assign(student, req.body);
    
    // Save student (triggers pre-save hook to recalculate their average, cgpa, and results)
    await student.save();

    // Recalculate ranks college-wide
    await Student.recalculateRanks();

    const updatedStudent = await Student.findById(req.params.id);
    res.json(updatedStudent);
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ message: error.message || 'Error updating student' });
  }
};

// Delete student
exports.deleteStudent = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admin can delete student records.' });
    }

    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Recalculate ranks since a student has been deleted
    await Student.recalculateRanks();

    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ message: 'Error deleting student' });
  }
};
