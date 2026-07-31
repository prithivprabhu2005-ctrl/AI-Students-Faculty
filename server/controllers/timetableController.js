const Timetable = require('../models/Timetable');
const Student = require('../models/Student');

// Helper to convert time strings (e.g. "09:00 AM", "14:30", "9:30") into total minutes from midnight
const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  let str = timeStr.trim().toUpperCase();
  let isPM = str.includes('PM');
  let isAM = str.includes('AM');

  str = str.replace(/(AM|PM)/g, '').trim();
  const parts = str.split(':');
  let hours = parseInt(parts[0], 10) || 0;
  let minutes = parseInt(parts[1], 10) || 0;

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  return hours * 60 + minutes;
};

// Check if two time intervals overlap
const checkTimeOverlap = (start1, end1, start2, end2) => {
  const s1 = parseTimeToMinutes(start1);
  const e1 = parseTimeToMinutes(end1);
  const s2 = parseTimeToMinutes(start2);
  const e2 = parseTimeToMinutes(end2);

  return Math.max(s1, s2) < Math.min(e1, e2);
};

// Create Timetable Entry (Admin Only)
exports.createTimetableEntry = async (req, res) => {
  try {
    const {
      department,
      academicYear,
      semester,
      section,
      day,
      period,
      startTime,
      endTime,
      subject,
      facultyName,
      classroom,
      classType
    } = req.body;

    // 1. Time Order Validation
    const startMins = parseTimeToMinutes(startTime);
    const endMins = parseTimeToMinutes(endTime);

    if (startMins >= endMins) {
      return res.status(400).json({ message: 'Start Time must be strictly before End Time.' });
    }

    // 2. Duplicate Period Check
    const existingDuplicate = await Timetable.findOne({
      department,
      semester: Number(semester),
      section: section.toUpperCase(),
      day,
      period: Number(period)
    });

    if (existingDuplicate) {
      return res.status(400).json({
        message: `Period ${period} is already assigned to ${existingDuplicate.subject} on ${day} for ${department} Sem-${semester} (${section}).`
      });
    }

    // 3. Time Overlap Check
    const dayEntries = await Timetable.find({
      department,
      semester: Number(semester),
      section: section.toUpperCase(),
      day
    });

    for (let entry of dayEntries) {
      if (checkTimeOverlap(startTime, endTime, entry.startTime, entry.endTime)) {
        return res.status(400).json({
          message: `Class timing (${startTime} - ${endTime}) overlaps with existing entry: ${entry.subject} (${entry.startTime} - ${entry.endTime}).`
        });
      }
    }

    const newEntry = await Timetable.create({
      department,
      academicYear: Number(academicYear) || new Date().getFullYear(),
      semester: Number(semester),
      section: section.toUpperCase(),
      day,
      period: Number(period),
      startTime,
      endTime,
      subject,
      facultyName,
      classroom,
      classType: classType || 'Theory',
      createdBy: req.user._id
    });

    return res.status(201).json({ message: 'Timetable entry created successfully.', entry: newEntry });
  } catch (error) {
    console.error('Create timetable error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Duplicate period assignment detected for this department, semester, section, and day.' });
    }
    return res.status(500).json({ message: 'Error creating timetable entry.' });
  }
};

// Get Timetable List / Weekly Grid (Admin & Student)
exports.getTimetable = async (req, res) => {
  try {
    const { department, semester, section, day, search } = req.query;
    const filter = {};

    if (department) filter.department = department;
    if (semester) filter.semester = Number(semester);
    if (section) filter.section = section.toUpperCase();
    if (day) filter.day = day;

    if (search) {
      filter.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { facultyName: { $regex: search, $options: 'i' } },
        { classroom: { $regex: search, $options: 'i' } }
      ];
    }

    // Role Scoping for Students: Force their own Department, Sem, Section
    if (req.user.role === 'student' && req.user.registerNumber) {
      const student = await Student.findOne({ registerNumber: req.user.registerNumber }).lean();
      if (student) {
        filter.department = student.department;
        filter.semester = student.semester;
        filter.section = student.section;
      }
    }

    const entries = await Timetable.find(filter).sort({ day: 1, period: 1 }).lean();

    // Compute Metrics: Total Classes & Total Lab Hours
    let totalClasses = entries.length;
    let totalLabHours = 0;

    entries.forEach(e => {
      if (e.classType === 'Lab' || e.classType === 'Practical') {
        const durationMins = parseTimeToMinutes(e.endTime) - parseTimeToMinutes(e.startTime);
        totalLabHours += Number((durationMins / 60).toFixed(1));
      }
    });

    return res.json({
      timetable: entries,
      metrics: {
        totalClasses,
        totalLabHours
      }
    });
  } catch (error) {
    console.error('Get timetable error:', error);
    return res.status(500).json({ message: 'Error fetching timetable records.' });
  }
};

// Get Logged-in Student's Own Timetable
exports.getStudentTimetable = async (req, res) => {
  try {
    const regNo = req.user.registerNumber;
    if (!regNo) {
      return res.status(400).json({ message: 'Student Register Number missing from user profile.' });
    }

    const student = await Student.findOne({ registerNumber: regNo.toUpperCase() }).lean();
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found.' });
    }

    const entries = await Timetable.find({
      department: student.department,
      semester: student.semester,
      section: student.section
    }).sort({ day: 1, period: 1 }).lean();

    let totalClasses = entries.length;
    let totalLabHours = 0;

    entries.forEach(e => {
      if (e.classType === 'Lab' || e.classType === 'Practical') {
        const durationMins = parseTimeToMinutes(e.endTime) - parseTimeToMinutes(e.startTime);
        totalLabHours += Number((durationMins / 60).toFixed(1));
      }
    });

    return res.json({
      student: {
        name: student.name,
        registerNumber: student.registerNumber,
        department: student.department,
        semester: student.semester,
        section: student.section
      },
      timetable: entries,
      metrics: {
        totalClasses,
        totalLabHours
      }
    });
  } catch (error) {
    console.error('Get student timetable error:', error);
    return res.status(500).json({ message: 'Error fetching student timetable.' });
  }
};

// Get Today's Classes & Current Ongoing Schedule
exports.getTodaySchedule = async (req, res) => {
  try {
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = daysOfWeek[new Date().getDay()];

    let dept = req.query.department;
    let sem = req.query.semester;
    let sec = req.query.section;

    if (req.user.role === 'student' && req.user.registerNumber) {
      const student = await Student.findOne({ registerNumber: req.user.registerNumber }).lean();
      if (student) {
        dept = student.department;
        sem = student.semester;
        sec = student.section;
      }
    }

    const filter = { day: todayName };
    if (dept) filter.department = dept;
    if (sem) filter.semester = Number(sem);
    if (sec) filter.section = sec.toUpperCase();

    const todayEntries = await Timetable.find(filter).sort({ period: 1 }).lean();

    // Determine current time in minutes
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    let currentClass = null;
    let nextClass = null;
    const remainingClasses = [];

    todayEntries.forEach(entry => {
      const sMins = parseTimeToMinutes(entry.startTime);
      const eMins = parseTimeToMinutes(entry.endTime);

      if (currentMins >= sMins && currentMins < eMins) {
        currentClass = entry;
      } else if (sMins > currentMins) {
        if (!nextClass) nextClass = entry;
        remainingClasses.push(entry);
      }
    });

    const freePeriodsCount = 8 - todayEntries.length;

    return res.json({
      todayName,
      todayClasses: todayEntries,
      currentClass,
      nextClass,
      remainingClassesCount: remainingClasses.length,
      freePeriodsCount: Math.max(0, freePeriodsCount)
    });
  } catch (error) {
    console.error('Get today schedule error:', error);
    return res.status(500).json({ message: 'Error fetching today\'s schedule.' });
  }
};

// Update Timetable Entry (Admin Only)
exports.updateTimetableEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      department,
      academicYear,
      semester,
      section,
      day,
      period,
      startTime,
      endTime,
      subject,
      facultyName,
      classroom,
      classType
    } = req.body;

    const entry = await Timetable.findById(id);
    if (!entry) {
      return res.status(404).json({ message: 'Timetable entry not found.' });
    }

    const startMins = parseTimeToMinutes(startTime || entry.startTime);
    const endMins = parseTimeToMinutes(endTime || entry.endTime);

    if (startMins >= endMins) {
      return res.status(400).json({ message: 'Start Time must be strictly before End Time.' });
    }

    // Check duplicate period
    const targetPeriod = Number(period) || entry.period;
    const targetDay = day || entry.day;
    const targetDept = department || entry.department;
    const targetSem = Number(semester) || entry.semester;
    const targetSec = (section || entry.section).toUpperCase();

    const existingDuplicate = await Timetable.findOne({
      _id: { $ne: id },
      department: targetDept,
      semester: targetSem,
      section: targetSec,
      day: targetDay,
      period: targetPeriod
    });

    if (existingDuplicate) {
      return res.status(400).json({
        message: `Period ${targetPeriod} is already assigned to ${existingDuplicate.subject} on ${targetDay}.`
      });
    }

    // Check overlap
    const dayEntries = await Timetable.find({
      _id: { $ne: id },
      department: targetDept,
      semester: targetSem,
      section: targetSec,
      day: targetDay
    });

    const newStart = startTime || entry.startTime;
    const newEnd = endTime || entry.endTime;

    for (let item of dayEntries) {
      if (checkTimeOverlap(newStart, newEnd, item.startTime, item.endTime)) {
        return res.status(400).json({
          message: `Timing (${newStart} - ${newEnd}) overlaps with existing entry: ${item.subject} (${item.startTime} - ${item.endTime}).`
        });
      }
    }

    if (department) entry.department = department;
    if (academicYear) entry.academicYear = Number(academicYear);
    if (semester) entry.semester = Number(semester);
    if (section) entry.section = section.toUpperCase();
    if (day) entry.day = day;
    if (period) entry.period = Number(period);
    if (startTime) entry.startTime = startTime;
    if (endTime) entry.endTime = endTime;
    if (subject) entry.subject = subject;
    if (facultyName) entry.facultyName = facultyName;
    if (classroom) entry.classroom = classroom;
    if (classType) entry.classType = classType;

    await entry.save();

    return res.json({ message: 'Timetable entry updated successfully.', entry });
  } catch (error) {
    console.error('Update timetable error:', error);
    return res.status(500).json({ message: 'Error updating timetable entry.' });
  }
};

// Delete Timetable Entry (Admin Only)
exports.deleteTimetableEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await Timetable.findByIdAndDelete(id);

    if (!entry) {
      return res.status(404).json({ message: 'Timetable entry not found.' });
    }

    return res.json({ message: 'Timetable entry deleted successfully.' });
  } catch (error) {
    console.error('Delete timetable error:', error);
    return res.status(500).json({ message: 'Error deleting timetable entry.' });
  }
};
