const mongoose = require('mongoose');

const certificationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  provider: { type: String, required: true },
  issueDate: { type: Date },
  expiryDate: { type: Date },
  certificateId: { type: String, default: '' },
  credentialUrl: { type: String, default: '' },
  fileUrl: { type: String, default: '' }
}, { _id: true });

const sportsSchema = new mongoose.Schema({
  sportName: { type: String, required: true },
  level: {
    type: String,
    enum: ['College', 'District', 'State', 'National', 'International'],
    default: 'College'
  },
  position: { type: String, default: '' },
  achievement: { type: String, default: '' },
  fileUrl: { type: String, default: '' }
}, { _id: true });

const extraCurricularSchema = new mongoose.Schema({
  activityName: { type: String, required: true },
  role: { type: String, default: '' },
  description: { type: String, default: '' },
  year: { type: String, default: '' }
}, { _id: true });

const workshopSchema = new mongoose.Schema({
  workshopName: { type: String, required: true },
  organizer: { type: String, default: '' },
  date: { type: Date },
  fileUrl: { type: String, default: '' }
}, { _id: true });

const internshipSchema = new mongoose.Schema({
  companyName: { type: String, required: true },
  role: { type: String, default: '' },
  duration: { type: String, default: '' },
  description: { type: String, default: '' },
  fileUrl: { type: String, default: '' }
}, { _id: true });

const projectSchema = new mongoose.Schema({
  projectTitle: { type: String, required: true },
  description: { type: String, default: '' },
  technologiesUsed: [{ type: String }],
  githubLink: { type: String, default: '' },
  liveDemoLink: { type: String, default: '' },
  role: { type: String, default: '' }
}, { _id: true });

const languageSchema = new mongoose.Schema({
  language: { type: String, required: true },
  read: { type: Boolean, default: true },
  write: { type: Boolean, default: true },
  speak: { type: Boolean, default: true }
}, { _id: true });

const achievementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  date: { type: Date },
  fileUrl: { type: String, default: '' }
}, { _id: true });

const portfolioSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    unique: true
  },
  registerNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  studentId: {
    type: String,
    required: true,
    trim: true
  },
  technicalSkills: {
    programmingLanguages: [{ type: String }],
    webTechnologies: [{ type: String }],
    databases: [{ type: String }],
    cloudTechnologies: [{ type: String }],
    aiMlSkills: [{ type: String }],
    tools: [{ type: String }]
  },
  certifications: [certificationSchema],
  sports: [sportsSchema],
  extraCurricular: [extraCurricularSchema],
  workshops: [workshopSchema],
  internships: [internshipSchema],
  projects: [projectSchema],
  languagesKnown: [languageSchema],
  softSkills: [{ type: String }],
  achievements: [achievementSchema]
}, {
  timestamps: true
});

const Portfolio = mongoose.model('Portfolio', portfolioSchema);

module.exports = Portfolio;
