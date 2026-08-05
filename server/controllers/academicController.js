const Student = require('../models/Student');
const Subject = require('../models/Subject');
const Attendance = require('../models/Attendance');
const Assignment = require('../models/Assignment');
const User = require('../models/User');

// ──────────────────────────────────────────────────────────
// HELPER: Build query based on user role
// ──────────────────────────────────────────────────────────
const buildAttendanceQuery = (user) => {
  if (user.role === 'student') {
    return { registerNumber: user.registerNumber };
  }
  if (user.role === 'faculty') {
    return { department: user.department };
  }
  return {}; // admin sees all
};

const buildAssignmentQuery = (user) => {
  if (user.role === 'student') {
    return { registerNumber: user.registerNumber };
  }
  if (user.role === 'faculty') {
    return { department: user.department };
  }
  return {}; // admin sees all
};

// ──────────────────────────────────────────────────────────
// SUBJECTS
// ──────────────────────────────────────────────────────────

// GET /api/academic/subjects
// Admin: all subjects | Faculty/Student: active subjects
exports.getSubjects = async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? {} : { isActive: true };

    // Faculty sees only their department subjects
    if (req.user.role === 'faculty' && req.user.department) {
      query.department = req.user.department;
    }

    const subjects = await Subject.find(query)
      .populate('faculty', 'name email staffId department')
      .sort({ department: 1, semester: 1, subjectName: 1 });

    res.json({ subjects });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ message: 'Error fetching subjects.' });
  }
};

// POST /api/academic/subjects (Admin only)
exports.createSubject = async (req, res) => {
  try {
    const { subjectCode, subjectName, department, semester, credits, faculty } = req.body;

    // Required field validation
    if (!subjectCode || !subjectName || !department || !semester || !credits) {
      return res.status(400).json({ message: 'Subject code, name, department, semester, and credits are required.' });
    }

    // Check for duplicate subject code
    const existing = await Subject.findOne({ subjectCode: subjectCode.toUpperCase() });
    if (existing) {
      return res.status(409).json({ message: `Subject code "${subjectCode.toUpperCase()}" already exists.` });
    }

    const subject = await Subject.create({
      subjectCode: subjectCode.toUpperCase(),
      subjectName,
      department,
      semester,
      credits,
      faculty: faculty || null
    });

    // Populate faculty name for response
    await subject.populate('faculty', 'name email staffId department');
    res.status(201).json(subject);
  } catch (error) {
    console.error('Error creating subject:', error);
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Subject code already exists.' });
    }
    res.status(500).json({ message: 'Error creating subject.' });
  }
};

// PUT /api/academic/subjects/:id (Admin only)
exports.updateSubject = async (req, res) => {
  try {
    const { subjectCode, subjectName, department, semester, credits, faculty, isActive } = req.body;

    // If changing code, check for duplicate
    if (subjectCode) {
      const existing = await Subject.findOne({
        subjectCode: subjectCode.toUpperCase(),
        _id: { $ne: req.params.id }
      });
      if (existing) {
        return res.status(409).json({ message: `Subject code "${subjectCode.toUpperCase()}" already exists.` });
      }
    }

    const updateData = {};
    if (subjectCode) updateData.subjectCode = subjectCode.toUpperCase();
    if (subjectName) updateData.subjectName = subjectName;
    if (department) updateData.department = department;
    if (semester) updateData.semester = semester;
    if (credits) updateData.credits = credits;
    if (faculty !== undefined) updateData.faculty = faculty || null;
    if (isActive !== undefined) updateData.isActive = isActive;

    const subject = await Subject.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    }).populate('faculty', 'name email staffId department');

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found.' });
    }

    res.json(subject);
  } catch (error) {
    console.error('Error updating subject:', error);
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Subject code already exists.' });
    }
    res.status(500).json({ message: 'Error updating subject.' });
  }
};

// DELETE /api/academic/subjects/:id (Admin only)
exports.deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findByIdAndDelete(req.params.id);

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found.' });
    }

    // Unset subject from all student marks and recalculate academic stats
    const unsetObj = {};
    if (subject.subjectCode) unsetObj[`marks.${subject.subjectCode}`] = 1;
    if (subject.subjectCode) unsetObj[`marks.${subject.subjectCode.toLowerCase()}`] = 1;
    if (subject._id) unsetObj[`marks.${subject._id}`] = 1;

    await Student.updateMany({}, { $unset: unsetObj });

    // Trigger save on all students to recalculate averages/CGPA after subject removal
    const students = await Student.find();
    for (const student of students) {
      await student.save();
    }
    await Student.recalculateRanks();

    res.json({ message: 'Subject deleted successfully.' });
  } catch (error) {
    console.error('Error deleting subject:', error);
    res.status(500).json({ message: 'Error deleting subject.' });
  }
};

// GET /api/academic/faculties (for dropdown in admin subject form)
exports.getFaculties = async (req, res) => {
  try {
    const faculties = await User.find({ role: 'faculty', isActive: true })
      .select('name email staffId department')
      .sort({ name: 1 });

    res.json({ faculties });
  } catch (error) {
    console.error('Error fetching faculties:', error);
    res.status(500).json({ message: 'Error fetching faculty list.' });
  }
};

// ──────────────────────────────────────────────────────────
// ATTENDANCE
// ──────────────────────────────────────────────────────────

// GET /api/academic/attendance
// Admin: all | Faculty: their department | Student: own records
exports.getAttendance = async (req, res) => {
  try {
    const query = buildAttendanceQuery(req.user);

    const attendance = await Attendance.find(query)
      .populate('student', 'name registerNumber department semester section')
      .populate('subject', 'subjectName subjectCode department semester')
      .populate('faculty', 'name staffId')
      .sort({ date: -1 });

    res.json({ attendance });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ message: 'Error fetching attendance.' });
  }
};

// POST /api/academic/attendance/bulk (Faculty only)
// Marks attendance for multiple students at once for a subject + date
exports.markBulkAttendance = async (req, res) => {
  try {
    const { subjectId, date, records } = req.body;

    // Validate required fields
    if (!subjectId || !date || !records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: 'Subject, date, and student records are required.' });
    }

    // Verify subject exists
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found.' });
    }

    // Normalize date to start of day (strip time component) to avoid duplicates
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const results = [];
    const errors = [];

    for (const record of records) {
      const { studentId, status } = record;

      if (!studentId || !['Present', 'Absent'].includes(status)) {
        errors.push({ studentId, error: 'Invalid student or status.' });
        continue;
      }

      const student = await Student.findById(studentId);
      if (!student) {
        errors.push({ studentId, error: 'Student not found.' });
        continue;
      }

      // Verify faculty can access this department
      if (req.user.role === 'faculty' && req.user.department && student.department !== req.user.department) {
        errors.push({ studentId, error: 'Not authorized for this student department.' });
        continue;
      }

      try {
        // Upsert: update if exists, else create — prevents duplicates
        const existing = await Attendance.findOne({
          student: student._id,
          subject: subject._id,
          date: attendanceDate
        });

        if (existing) {
          existing.status = status;
          await existing.save();
          results.push({ studentId, action: 'updated', status });
        } else {
          await Attendance.create({
            student: student._id,
            registerNumber: student.registerNumber,
            studentName: student.name,
            subject: subject._id,
            subjectCode: subject.subjectCode,
            department: student.department,
            date: attendanceDate,
            status,
            faculty: req.user._id
          });
          results.push({ studentId, action: 'created', status });
        }
      } catch (err) {
        if (err.code === 11000) {
          errors.push({ studentId, error: 'Duplicate attendance entry.' });
        } else {
          errors.push({ studentId, error: err.message });
        }
      }
    }

    res.status(201).json({
      message: `Attendance saved. ${results.length} records processed.`,
      results,
      errors
    });
  } catch (error) {
    console.error('Error marking bulk attendance:', error);
    res.status(500).json({ message: 'Error saving attendance.' });
  }
};

// POST /api/academic/attendance (Single record — Faculty only)
exports.createAttendance = async (req, res) => {
  try {
    const { studentId, subjectId, date, status } = req.body;

    if (!studentId || !subjectId || !date || !status) {
      return res.status(400).json({ message: 'Student, subject, date, and status are required.' });
    }

    if (!['Present', 'Absent'].includes(status)) {
      return res.status(400).json({ message: 'Status must be Present or Absent.' });
    }

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ message: 'Student not found.' });

    const subject = await Subject.findById(subjectId);
    if (!subject) return res.status(404).json({ message: 'Subject not found.' });

    if (req.user.role === 'faculty' && req.user.department && student.department !== req.user.department) {
      return res.status(403).json({ message: 'You can only manage attendance for your department.' });
    }

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    // Check for duplicate
    const existing = await Attendance.findOne({
      student: student._id,
      subject: subject._id,
      date: attendanceDate
    });
    if (existing) {
      return res.status(409).json({ message: 'Attendance already recorded for this student on this date. Use update instead.' });
    }

    const attendance = await Attendance.create({
      student: student._id,
      registerNumber: student.registerNumber,
      studentName: student.name,
      subject: subject._id,
      subjectCode: subject.subjectCode,
      department: student.department,
      date: attendanceDate,
      status,
      faculty: req.user._id
    });

    res.status(201).json(attendance);
  } catch (error) {
    console.error('Error creating attendance:', error);
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Duplicate attendance entry for this student, subject, and date.' });
    }
    res.status(500).json({ message: 'Error creating attendance.' });
  }
};

// PUT /api/academic/attendance/:id (Faculty only)
exports.updateAttendance = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !['Present', 'Absent'].includes(status)) {
      return res.status(400).json({ message: 'Valid status (Present or Absent) is required.' });
    }

    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found.' });
    }

    // Faculty can only update their department's attendance
    if (req.user.role === 'faculty' && req.user.department && attendance.department !== req.user.department) {
      return res.status(403).json({ message: 'You can only update attendance for your department.' });
    }

    attendance.status = status;
    await attendance.save();

    res.json(attendance);
  } catch (error) {
    console.error('Error updating attendance:', error);
    res.status(500).json({ message: 'Error updating attendance.' });
  }
};

// ──────────────────────────────────────────────────────────
// ASSIGNMENTS
// ──────────────────────────────────────────────────────────

// GET /api/academic/assignments
// Admin: all | Faculty: their dept | Student: own
exports.getAssignments = async (req, res) => {
  try {
    const query = buildAssignmentQuery(req.user);

    const assignments = await Assignment.find(query)
      .populate('student', 'name registerNumber department semester section')
      .populate('subject', 'subjectName subjectCode department semester')
      .populate('faculty', 'name staffId')
      .sort({ createdAt: -1 });

    res.json({ assignments });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ message: 'Error fetching assignment marks.' });
  }
};

// POST /api/academic/assignments (Faculty only)
exports.createAssignment = async (req, res) => {
  try {
    const { studentId, subjectId, assignmentTitle, totalMarks, obtainedMarks, submissionDate, remarks } = req.body;

    // Required field validation
    if (!studentId || !subjectId || !assignmentTitle || totalMarks === undefined || obtainedMarks === undefined) {
      return res.status(400).json({ message: 'Student, subject, title, total marks, and obtained marks are required.' });
    }

    // Validate marks
    if (Number(obtainedMarks) > Number(totalMarks)) {
      return res.status(400).json({ message: 'Obtained marks cannot exceed total marks.' });
    }

    if (Number(obtainedMarks) < 0 || Number(totalMarks) < 1) {
      return res.status(400).json({ message: 'Invalid marks values.' });
    }

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ message: 'Student not found.' });

    const subject = await Subject.findById(subjectId);
    if (!subject) return res.status(404).json({ message: 'Subject not found.' });

    if (req.user.role === 'faculty' && req.user.department && student.department !== req.user.department) {
      return res.status(403).json({ message: 'You can only add marks for students in your department.' });
    }

    const assignment = await Assignment.create({
      student: student._id,
      registerNumber: student.registerNumber,
      studentName: student.name,
      subject: subject._id,
      subjectCode: subject.subjectCode,
      department: student.department,
      assignmentTitle,
      totalMarks: Number(totalMarks),
      obtainedMarks: Number(obtainedMarks),
      submissionDate: submissionDate || new Date(),
      remarks: remarks || '',
      faculty: req.user._id
    });

    await assignment.populate([
      { path: 'student', select: 'name registerNumber' },
      { path: 'subject', select: 'subjectName subjectCode' },
      { path: 'faculty', select: 'name staffId' }
    ]);

    res.status(201).json(assignment);
  } catch (error) {
    console.error('Error creating assignment:', error);
    if (error.name === 'ValidationError') {
      const msg = Object.values(error.errors).map(e => e.message).join(', ');
      return res.status(400).json({ message: msg });
    }
    res.status(500).json({ message: 'Error creating assignment marks.' });
  }
};

// PUT /api/academic/assignments/:id (Faculty only)
exports.updateAssignment = async (req, res) => {
  try {
    const { assignmentTitle, totalMarks, obtainedMarks, submissionDate, remarks } = req.body;

    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment record not found.' });
    }

    if (req.user.role === 'faculty' && req.user.department && assignment.department !== req.user.department) {
      return res.status(403).json({ message: 'You can only update marks for your department.' });
    }

    const newTotalMarks = totalMarks !== undefined ? Number(totalMarks) : assignment.totalMarks;
    const newObtainedMarks = obtainedMarks !== undefined ? Number(obtainedMarks) : assignment.obtainedMarks;

    if (newObtainedMarks > newTotalMarks) {
      return res.status(400).json({ message: 'Obtained marks cannot exceed total marks.' });
    }

    if (assignmentTitle !== undefined) assignment.assignmentTitle = assignmentTitle;
    if (totalMarks !== undefined) assignment.totalMarks = newTotalMarks;
    if (obtainedMarks !== undefined) assignment.obtainedMarks = newObtainedMarks;
    if (submissionDate !== undefined) assignment.submissionDate = submissionDate;
    if (remarks !== undefined) assignment.remarks = remarks;

    await assignment.save();

    await assignment.populate([
      { path: 'student', select: 'name registerNumber' },
      { path: 'subject', select: 'subjectName subjectCode' },
      { path: 'faculty', select: 'name staffId' }
    ]);

    res.json(assignment);
  } catch (error) {
    console.error('Error updating assignment:', error);
    if (error.name === 'ValidationError') {
      const msg = Object.values(error.errors).map(e => e.message).join(', ');
      return res.status(400).json({ message: msg });
    }
    res.status(500).json({ message: 'Error updating assignment marks.' });
  }
};
