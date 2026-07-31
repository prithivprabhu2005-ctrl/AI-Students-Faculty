const Notification = require('../models/Notification');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');

// ──────────────────────────────────────────────────────────
// 1. GET NOTIFICATIONS (User Inbox)
// Returns notifications for logged-in user (role, department, all, or specific user)
// ──────────────────────────────────────────────────────────
exports.getNotifications = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userDept = req.user.department;
    const userId = req.user._id;

    const query = {
      $or: [
        { recipientRole: 'all' },
        { recipientRole: userRole },
        { targetUser: userId },
        { recipientDepartment: userDept }
      ]
    };

    const notifications = await Notification.find(query)
      .populate('sender', 'name role department staffId')
      .sort({ createdAt: -1 })
      .lean();

    // Map read status for current user
    const formatted = notifications.map(n => {
      const readByArr = n.readBy || [];
      const isRead = readByArr.some(id => id.toString() === userId.toString());
      return {
        ...n,
        isRead
      };
    });

    const unreadCount = formatted.filter(n => !n.isRead).length;

    res.json({
      notifications: formatted,
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Error fetching notifications.' });
  }
};

// ──────────────────────────────────────────────────────────
// 2. SEND ANNOUNCEMENT / NOTIFICATION (Admin or Faculty)
// ──────────────────────────────────────────────────────────
exports.sendNotification = async (req, res) => {
  try {
    const { title, message, type = 'Faculty Announcement', recipientRole = 'all', recipientDepartment = 'all', targetUser } = req.body;

    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required.' });
    }

    if (req.user.role !== 'admin' && req.user.role !== 'faculty') {
      return res.status(403).json({ message: 'Only Admin and Faculty can send notifications.' });
    }

    const notification = await Notification.create({
      title: title.trim(),
      message: message.trim(),
      type,
      sender: req.user._id,
      recipientRole,
      recipientDepartment: req.user.role === 'faculty' ? req.user.department : recipientDepartment,
      targetUser: targetUser || null
    });

    await notification.populate('sender', 'name role department');

    res.status(201).json({
      message: 'Notification sent successfully.',
      notification
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ message: 'Error sending notification.' });
  }
};

// ──────────────────────────────────────────────────────────
// 3. MARK NOTIFICATION AS READ
// ──────────────────────────────────────────────────────────
exports.markAsRead = async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user._id;

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    if (!notification.readBy.includes(userId)) {
      notification.readBy.push(userId);
      await notification.save();
    }

    res.json({ message: 'Notification marked as read.' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Error updating notification status.' });
  }
};

// ──────────────────────────────────────────────────────────
// 4. TRIGGER AUTOMATED SYSTEM ALERTS (Low Attendance & Performance)
// ──────────────────────────────────────────────────────────
exports.generateAutoAlerts = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admin can trigger automated system alerts.' });
    }

    // 1. Low Attendance Warnings (< 75%)
    const attendanceRecords = await Attendance.find().lean();
    const students = await Student.find().lean();

    const lowAttStudents = [];
    students.forEach(st => {
      const stAtt = attendanceRecords.filter(a => a.registerNumber === st.registerNumber);
      if (stAtt.length > 0) {
        const present = stAtt.filter(a => a.status === 'Present').length;
        const pct = (present / stAtt.length) * 100;
        if (pct < 75) {
          lowAttStudents.push({ name: st.name, regNo: st.registerNumber, pct: pct.toFixed(1) });
        }
      }
    });

    if (lowAttStudents.length > 0) {
      await Notification.create({
        title: '⚠️ Low Attendance Warning System Alert',
        message: `${lowAttStudents.length} student(s) currently have attendance below 75%. Please review student attendance records.`,
        type: 'Low Attendance Warning',
        sender: req.user._id,
        recipientRole: 'faculty',
        recipientDepartment: 'all'
      });
    }

    // 2. Poor Performance Alerts (Arrears > 0)
    const arrearStudents = students.filter(s => s.arrears > 0);
    if (arrearStudents.length > 0) {
      await Notification.create({
        title: '🔴 Academic Performance Alert',
        message: `${arrearStudents.length} student(s) currently have subject arrears requiring academic counselling.`,
        type: 'Poor Performance Alert',
        sender: req.user._id,
        recipientRole: 'faculty',
        recipientDepartment: 'all'
      });
    }

    res.json({ message: 'Automated system alerts generated successfully.' });
  } catch (error) {
    console.error('Error generating automated alerts:', error);
    res.status(500).json({ message: 'Error generating automated system alerts.' });
  }
};
