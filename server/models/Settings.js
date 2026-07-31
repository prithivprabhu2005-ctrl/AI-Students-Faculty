const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    collegeName: {
      type: String,
      default: 'EduBot Institute of Technology'
    },
    collegeLogo: {
      type: String,
      default: ''
    },
    academicYear: {
      type: String,
      default: '2025-2026'
    },
    currentSemester: {
      type: Number,
      default: 5
    },
    defaultPassingMarks: {
      type: Number,
      default: 50
    },
    defaultAttendancePercentage: {
      type: Number,
      default: 75
    },
    themeSettings: {
      mode: { type: String, default: 'dark' },
      primaryColor: { type: String, default: '#3b82f6' }
    },
    aiChatbotSettings: {
      systemModel: { type: String, default: 'google/gemini-2.5-flash' },
      maxTokens: { type: Number, default: 1000 }
    }
  },
  {
    timestamps: true
  }
);

const Settings = mongoose.model('Settings', settingsSchema);
module.exports = Settings;
