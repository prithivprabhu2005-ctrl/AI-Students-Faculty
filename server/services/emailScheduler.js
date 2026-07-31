const Student = require('../models/Student');
const Timetable = require('../models/Timetable');
const Portfolio = require('../models/Portfolio');
const EmailPreference = require('../models/EmailPreference');
const emailService = require('./emailService');

let cron;
try {
  cron = require('node-cron');
} catch (e) {
  cron = null;
}

// Execute Daily Digest Dispatch for all active students
const runDailyDigestJob = async () => {
  console.log('[SCHEDULER] Running Daily Student Digest Job at 8:00 AM...');
  try {
    const students = await Student.find({}).lean();
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = daysOfWeek[new Date().getDay()];

    for (let student of students) {
      if (!student.email) continue;

      // Check student preferences
      const pref = await EmailPreference.findOne({ email: student.email }).lean();
      if (pref && pref.dailyDigestEnabled === false) continue;

      // Fetch today's classes
      const todayClasses = await Timetable.find({
        department: student.department,
        semester: student.semester,
        section: student.section,
        day: todayName
      }).sort({ period: 1 }).lean();

      // Fetch portfolio completion %
      const portfolio = await Portfolio.findOne({ studentId: student._id }).lean();
      const certsCount = portfolio ? (portfolio.certifications?.length || 0) : 0;

      const studentData = {
        student,
        todayClasses,
        attendancePercentage: student.attendancePercentage || 85,
        pendingAssignments: 2,
        cgpa: student.cgpa || 8.5,
        weakSubject: student.department === 'CSE' ? 'Data Structures & Algorithms' : 'Digital Signal Processing',
        quote: emailService.getRandomQuote()
      };

      await emailService.sendDailyDigest(studentData);
    }
    console.log(`[SCHEDULER] Daily Digest dispatched to ${students.length} students.`);
  } catch (error) {
    console.error('[SCHEDULER] Error executing Daily Digest Job:', error);
  }
};

// Execute Weekly Digest Dispatch (Sunday 7 PM)
const runWeeklyDigestJob = async () => {
  console.log('[SCHEDULER] Running Weekly Digest Job (Sunday 7 PM)...');
  try {
    const students = await Student.find({}).lean();
    for (let student of students) {
      if (!student.email) continue;
      const pref = await EmailPreference.findOne({ email: student.email }).lean();
      if (pref && pref.weeklyDigestEnabled === false) continue;

      await emailService.sendWeeklyDigest({
        student,
        weeklyAttendance: student.attendancePercentage || 88,
        assignmentsCompleted: 5,
        aiScore: 86
      });
    }
  } catch (error) {
    console.error('[SCHEDULER] Error executing Weekly Digest Job:', error);
  }
};

// Execute Monthly Report Dispatch (1st of month 9 AM)
const runMonthlyReportJob = async () => {
  console.log('[SCHEDULER] Running Monthly Academic Report Job...');
  try {
    const students = await Student.find({}).lean();
    for (let student of students) {
      if (!student.email) continue;
      const pref = await EmailPreference.findOne({ email: student.email }).lean();
      if (pref && pref.monthlyReportEnabled === false) continue;

      await emailService.sendMonthlyReport({
        student,
        cgpa: student.cgpa || 8.5,
        readinessScore: 82,
        certificatesCount: 4
      });
    }
  } catch (error) {
    console.error('[SCHEDULER] Error executing Monthly Report Job:', error);
  }
};

// Initialize Schedulers
const initEmailScheduler = () => {
  console.log('✉️ Initializing Email & Daily Digest Scheduler System...');

  if (cron) {
    // 8:00 AM Daily Digest
    cron.schedule('0 8 * * *', () => {
      runDailyDigestJob();
    });

    // Sunday 7:00 PM Weekly Digest
    cron.schedule('0 19 * * 0', () => {
      runWeeklyDigestJob();
    });

    // 1st day of month 9:00 AM Monthly Report
    cron.schedule('0 9 1 * *', () => {
      runMonthlyReportJob();
    });

    console.log('⏰ node-cron schedules registered successfully (8:00 AM Daily, Sun 7 PM Weekly, 1st Month 9 AM).');
  } else {
    console.log('ℹ️ node-cron package not detected. Using fallback timer scheduler for email digests.');
    // Check hourly fallback
    setInterval(() => {
      const now = new Date();
      if (now.getHours() === 8 && now.getMinutes() === 0) {
        runDailyDigestJob();
      }
    }, 60000);
  }
};

module.exports = {
  initEmailScheduler,
  runDailyDigestJob,
  runWeeklyDigestJob,
  runMonthlyReportJob
};
