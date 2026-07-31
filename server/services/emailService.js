const EmailLog = require('../models/EmailLog');

let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch (e) {
  nodemailer = null;
}

// Random Daily Motivational Quotes
const MOTIVATIONAL_QUOTES = [
  "“The secret of getting ahead is getting started.” – Mark Twain",
  "“It always seems impossible until it's done.” – Nelson Mandela",
  "“Success is not final, failure is not fatal: it is the courage to continue that counts.” – Winston Churchill",
  "“Education is the most powerful weapon which you can use to change the world.” – Nelson Mandela",
  "“Develop a passion for learning. If you do, you will never cease to grow.” – Anthony J. D'Angelo",
  "“Believe you can and you're halfway there.” – Theodore Roosevelt",
  "“Your time is limited, don't waste it living someone else's life.” – Steve Jobs"
];

const getRandomQuote = () => {
  return MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
};

// Create Nodemailer Transporter
const createTransporter = () => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (nodemailer && user && pass && !user.includes('your_email')) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass }
    });
  }
  return null;
};

// Base HTML Wrapper Template
const buildBaseTemplate = (title, studentName, bodyHtml) => {
  const dateStr = new Date().toLocaleString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>${title}</title>
    <style>
      body { font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }
      .container { max-width: 650px; margin: 0 auto; background-color: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
      .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 24px; text-align: center; border-bottom: 2px solid #3b82f6; }
      .header h1 { margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
      .header p { margin: 4px 0 0 0; color: #93c5fd; font-size: 13px; }
      .content { padding: 28px; color: #e2e8f0; font-size: 15px; line-height: 1.6; }
      .greeting { font-size: 18px; font-weight: 700; color: #ffffff; margin-bottom: 16px; }
      .card { background-color: rgba(255,255,255,0.03); border: 1px solid #334155; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
      .card-title { font-size: 14px; font-weight: 700; color: #60a5fa; margin-top: 0; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
      .footer { background-color: #0f172a; padding: 18px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #334155; }
      .footer p { margin: 4px 0; }
      .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; background-color: rgba(59, 130, 246, 0.2); color: #60a5fa; }
      .badge-success { background-color: rgba(16, 185, 129, 0.2); color: #34d399; }
      .badge-warning { background-color: rgba(245, 158, 11, 0.2); color: #fbbf24; }
      .badge-danger { background-color: rgba(239, 68, 68, 0.2); color: #f87171; }
      .quote-box { background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%); border-left: 4px solid #a855f7; padding: 14px; font-style: italic; color: #cbd5e1; border-radius: 8px; margin: 16px 0; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>🎓 AI Student Academic Portal</h1>
        <p>Official Academic Notification System</p>
      </div>

      <div class="content">
        <div class="greeting">👋 Hello ${studentName || 'Student'},</div>
        ${bodyHtml}
      </div>

      <div class="footer">
        <p><strong>AI Student Academic Management Portal</strong></p>
        <p>Sent automatically on ${dateStr}</p>
        <p style="color: #64748b; font-size: 11px;">If you wish to change your notification preferences, update your settings in the Student Portal.</p>
      </div>
    </div>
  </body>
  </html>
  `;
};

// Generic Send Email Function with Logging & Fallback
const sendEmail = async ({ recipient, studentName = 'Student', subject, type, htmlContent }) => {
  const transporter = createTransporter();
  let status = 'Sent';
  let errorMessage = '';

  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"AI Student Academic Portal" <${process.env.EMAIL_USER}>`,
        to: recipient,
        subject,
        html: htmlContent
      });
    } catch (err) {
      console.error(`Nodemailer send error to ${recipient}:`, err.message);
      status = 'Failed';
      errorMessage = err.message;
    }
  } else {
    // Simulated delivery mode (Logs email cleanly)
    console.log(`[EMAIL SERVICE - SIMULATED] Sent "${subject}" to ${recipient}`);
  }

  // Save log in MongoDB
  const logEntry = await EmailLog.create({
    recipient,
    studentName,
    subject,
    type: type || 'DailyDigest',
    htmlContent,
    status,
    errorMessage,
    sentTime: new Date()
  });

  return logEntry;
};

// 1. Welcome Email
exports.sendWelcomeEmail = async (student) => {
  const subject = '🎉 Welcome to AI Student Academic Portal!';
  const body = `
    <p>Congratulations! Your student account has been created successfully.</p>
    <div class="card">
      <div class="card-title">Account Details</div>
      <p style="margin: 4px 0;"><strong>Name:</strong> ${student.name}</p>
      <p style="margin: 4px 0;"><strong>Student ID:</strong> <span class="badge">${student.studentId || 'STU001'}</span></p>
      <p style="margin: 4px 0;"><strong>Register Number:</strong> ${student.registerNumber}</p>
      <p style="margin: 4px 0;"><strong>Department:</strong> ${student.department}</p>
    </div>
    <p>You can now log in to access your digital student passport, timetable, portfolio, academic records, and AI learning tools.</p>
    <p>Have a productive academic journey!</p>
  `;
  const htmlContent = buildBaseTemplate('Welcome to AI Student Portal', student.name, body);
  return sendEmail({ recipient: student.email, studentName: student.name, subject, type: 'Welcome', htmlContent });
};

// 2. Attendance Warning / Appreciation Alert
exports.sendAttendanceAlert = async (student, attendancePercentage) => {
  const isWarning = attendancePercentage < 75;
  const subject = isWarning ? '⚠️ Attendance Alert: Below 75% Requirement' : '🌟 Attendance Appreciation: Outstanding Performance!';
  const badgeClass = isWarning ? 'badge-danger' : 'badge-success';

  const body = `
    <p>${isWarning ? 'Your overall attendance percentage has dropped below the required 75% threshold.' : 'Congratulations! Your attendance performance is outstanding!'}</p>
    <div class="card">
      <div class="card-title">Attendance Status</div>
      <p style="margin: 4px 0;"><strong>Current Attendance:</strong> <span class="badge ${badgeClass}">${attendancePercentage}%</span></p>
      <p style="margin: 4px 0;"><strong>Required Threshold:</strong> 75.00%</p>
      <p style="margin: 4px 0;"><strong>Status:</strong> ${isWarning ? 'Needs Immediate Attention' : 'Excellent'}</p>
    </div>
    <p>${isWarning ? 'Please meet your HOD or Faculty Advisor to discuss attendance shortage.' : 'Keep up the great discipline and dedication!'}</p>
  `;

  const htmlContent = buildBaseTemplate(subject, student.name, body);
  return sendEmail({ recipient: student.email, studentName: student.name, subject, type: 'AttendanceAlert', htmlContent });
};

// 3. Timetable Notification
exports.sendTimetableNotification = async (recipient, studentName, updateDetails) => {
  const subject = `📅 Timetable Update: ${updateDetails.title || 'Class Schedule Change'}`;
  const body = `
    <p>There has been a change in your course timetable:</p>
    <div class="card">
      <div class="card-title">Notification Details</div>
      <p style="margin: 4px 0;"><strong>Subject:</strong> ${updateDetails.subject}</p>
      <p style="margin: 4px 0;"><strong>Day &amp; Period:</strong> ${updateDetails.day} (Period #${updateDetails.period})</p>
      <p style="margin: 4px 0;"><strong>Time:</strong> ${updateDetails.startTime} - ${updateDetails.endTime}</p>
      <p style="margin: 4px 0;"><strong>Classroom:</strong> ${updateDetails.classroom}</p>
      <p style="margin: 4px 0;"><strong>Faculty:</strong> ${updateDetails.facultyName}</p>
    </div>
  `;
  const htmlContent = buildBaseTemplate(subject, studentName, body);
  return sendEmail({ recipient, studentName, subject, type: 'TimetableNotification', htmlContent });
};

// 4. Daily Student Digest (Sent 8:00 AM)
exports.sendDailyDigest = async (studentData) => {
  const { student, todayClasses, attendancePercentage, pendingAssignments, cgpa, weakSubject, quote } = studentData;
  const subject = `☀️ Daily Student Digest: ${new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`;

  const classRows = (todayClasses && todayClasses.length > 0)
    ? todayClasses.map(c => `<li><strong>P#${c.period} (${c.startTime}):</strong> ${c.subject} - <em>${c.facultyName}</em> (${c.classroom})</li>`).join('')
    : '<li>🎉 No classes scheduled for today!</li>';

  const body = `
    <div style="font-size: 16px; font-weight: 700; margin-bottom: 12px; color: #60a5fa;">Good Morning, ${student.name}!</div>

    <div class="card">
      <div class="card-title">📅 Today's Schedule</div>
      <ul style="padding-left: 20px; margin: 4px 0;">${classRows}</ul>
    </div>

    <div class="card">
      <div class="card-title">📊 Academic Summary</div>
      <p style="margin: 4px 0;"><strong>Current CGPA:</strong> ${cgpa || '8.50'}</p>
      <p style="margin: 4px 0;"><strong>Attendance Rate:</strong> <span class="badge ${attendancePercentage < 75 ? 'badge-danger' : 'badge-success'}">${attendancePercentage || '85'}%</span></p>
      <p style="margin: 4px 0;"><strong>Pending Assignments:</strong> ${pendingAssignments || 0}</p>
    </div>

    <div class="card">
      <div class="card-title">💡 AI Learning Recommendation</div>
      <p style="margin: 4px 0;"><strong>Suggested Revision Topic:</strong> ${weakSubject || 'Data Structures & Algorithms'}</p>
    </div>

    <div class="quote-box">
      ${quote || getRandomQuote()}
    </div>

    <p style="text-align: center; font-weight: 700; color: #34d399; margin-top: 20px;">
      "Have a productive day and keep learning!"
    </p>
  `;

  const htmlContent = buildBaseTemplate('Daily Student Digest', student.name, body);
  return sendEmail({ recipient: student.email, studentName: student.name, subject, type: 'DailyDigest', htmlContent });
};

// 5. Weekly Digest (Sent Sunday 7 PM)
exports.sendWeeklyDigest = async (studentData) => {
  const { student, weeklyAttendance, assignmentsCompleted, aiScore } = studentData;
  const subject = `📊 Weekly Academic Performance Digest`;

  const body = `
    <p>Here is your weekly academic summary for the week ending ${new Date().toLocaleDateString()}:</p>
    <div class="card">
      <div class="card-title">Weekly Progress Report</div>
      <p style="margin: 4px 0;"><strong>Weekly Attendance:</strong> ${weeklyAttendance || '92'}%</p>
      <p style="margin: 4px 0;"><strong>Assignments Completed:</strong> ${assignmentsCompleted || 4}</p>
      <p style="margin: 4px 0;"><strong>AI Mastery Score:</strong> ${aiScore || '88'}/100</p>
    </div>
    <p>Check the AI Student Portal for details on upcoming topics for next week.</p>
  `;

  const htmlContent = buildBaseTemplate('Weekly Academic Digest', student.name, body);
  return sendEmail({ recipient: student.email, studentName: student.name, subject, type: 'WeeklyDigest', htmlContent });
};

// 6. Monthly Report (Sent 1st of month 9 AM)
exports.sendMonthlyReport = async (studentData) => {
  const { student, cgpa, readinessScore, certificatesCount } = studentData;
  const subject = `🏆 Monthly Academic & Placement Readiness Report`;

  const body = `
    <p>Your monthly academic performance &amp; career readiness summary for ${new Date().toLocaleString('default', { month: 'long' })}:</p>
    <div class="card">
      <div class="card-title">Monthly Achievements</div>
      <p style="margin: 4px 0;"><strong>Current Cumulative CGPA:</strong> ${cgpa || '8.75'}</p>
      <p style="margin: 4px 0;"><strong>AI Placement Readiness Score:</strong> <span class="badge badge-success">${readinessScore || 85}%</span></p>
      <p style="margin: 4px 0;"><strong>Verified Certificates:</strong> ${certificatesCount || 3}</p>
    </div>
  `;

  const htmlContent = buildBaseTemplate('Monthly Academic Report', student.name, body);
  return sendEmail({ recipient: student.email, studentName: student.name, subject, type: 'MonthlyReport', htmlContent });
};

// Helper to resend failed email
exports.resendEmail = async (logId) => {
  const log = await EmailLog.findById(logId);
  if (!log) throw new Error('Email log record not found');

  const transporter = createTransporter();
  let status = 'Sent';
  let errorMessage = '';

  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"AI Student Academic Portal" <${process.env.EMAIL_USER}>`,
        to: log.recipient,
        subject: log.subject,
        html: log.htmlContent
      });
    } catch (err) {
      status = 'Failed';
      errorMessage = err.message;
    }
  }

  log.status = status;
  log.errorMessage = errorMessage;
  log.retryCount = (log.retryCount || 0) + 1;
  log.sentTime = new Date();
  await log.save();

  return log;
};

module.exports.sendEmail = sendEmail;
module.exports.getRandomQuote = getRandomQuote;
