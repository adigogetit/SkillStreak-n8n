const mongoose = require('mongoose')
const skillCategorySchema = new mongoose.Schema({
  category: { type: String, trim: true, maxlength: 100 },
  skills: { type: [String], default: [] },
}, { _id: false })
const careerProfileSchema = new mongoose.Schema({
  linkedinUrl: { type: String, trim: true, maxlength: 500 },
  fullName: { type: String, trim: true, maxlength: 100, default: '' },
  headline: { type: String, trim: true, maxlength: 300, default: '' },
  currentRole: { type: String, trim: true, maxlength: 300, default: '' },
  summary: { type: String, maxlength: 4000, default: '' },
  employment: { type: String, maxlength: 6000, default: '' },
  education: { type: String, maxlength: 4000, default: '' },
  projects: { type: String, maxlength: 6000, default: '' },
  technologies: { type: String, maxlength: 3000, default: '' },
  skillCategories: { type: [skillCategorySchema], default: [] },
  certifications: { type: [String], default: [] },
  strengths: { type: [String], default: [] },
  skillGaps: { type: [String], default: [] },
  recommendedLearningAreas: { type: [String], default: [] },
}, { _id: false })
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
  targetRole: { type: String, trim: true, maxlength: 150, default: '' },
  experienceLevel: { type: String, trim: true, maxlength: 100, default: '' }, skills: { type: [String], default: [] },
  careerProfile: { type: careerProfileSchema, default: () => ({}) }, timezone: { type: String, default: 'UTC', maxlength: 100 },
  notificationTime: { type: String, default: '09:00', match: /^([01]\d|2[0-3]):[0-5]\d$/ }, deliveryChannel: { type: String, enum: ['email'], default: 'email' },
  telegram: { chatId: { type: String, select: false, default: '' }, connected: { type: Boolean, default: false }, linkTokenHash: { type: String, select: false }, linkTokenExpiresAt: Date },
  profileSetupComplete: { type: Boolean, default: false }, profileAnalyzedAt: Date, profileAnalysisStatus: { type: String, enum: ['not_started', 'pending', 'ready', 'failed'], default: 'not_started' }, profileAnalysisError: { type: String, default: '' }, pendingProfileText: { type: String, select: false, default: '' },
}, { timestamps: true })
userSchema.methods.toClient = function () { return { id: this._id, name: this.name, email: this.email, targetRole: this.targetRole, experienceLevel: this.experienceLevel, skills: this.skills, careerProfile: this.careerProfile, timezone: this.timezone, notificationTime: this.notificationTime, deliveryChannel: 'email', profileSetupComplete: this.profileSetupComplete, profileAnalysisStatus: this.profileAnalysisStatus, profileAnalysisError: this.profileAnalysisError } }
module.exports = mongoose.models.UserSkill || mongoose.model('UserSkill', userSchema)
