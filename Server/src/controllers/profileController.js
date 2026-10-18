const { z } = require('zod')
const { extractText } = require('../services/profileAnalysis')
const { analyzeProfile } = require('../services/geminiService')
const profileSchema = z.object({
  linkedinUrl: z.string().trim().url().max(500).or(z.literal('')).optional(),
  fullName: z.string().trim().max(100).optional(),
  headline: z.string().trim().max(300).optional(),
  currentRole: z.string().trim().max(300).optional(),
  summary: z.string().max(4000).optional(),
  employment: z.string().max(6000).optional(),
  education: z.string().max(4000).optional(),
  projects: z.string().max(6000).optional(),
  technologies: z.string().max(3000).optional(),
  skillCategories: z.array(z.object({ category: z.string().trim().min(1).max(100), skills: z.array(z.string().trim().min(1).max(80)).max(80) })).max(30).optional(),
  certifications: z.array(z.string().max(160)).max(40).optional(),
  strengths: z.array(z.string().max(300)).max(30).optional(),
  skillGaps: z.array(z.string().max(300)).max(30).optional(),
  recommendedLearningAreas: z.array(z.string().max(300)).max(30).optional(),
  skills: z.array(z.string().trim().min(1).max(80)).max(80).optional(),
  targetRole: z.string().trim().min(1).max(150),
  experience: z.string().trim().max(100).optional(),
  experienceLevel: z.string().trim().max(100).optional(),
  timezone: z.string().trim().max(100).optional(),
  notificationTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  deliveryChannel: z.literal('email').optional(),
})
exports.upload = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Upload a PDF file.' })
  if (req.file.mimetype !== 'application/pdf' || req.file.buffer.subarray(0, 4).toString() !== '%PDF') return res.status(400).json({ message: 'The uploaded file is not a valid PDF.' })
  req.user.profileAnalysisStatus = 'pending'; req.user.profileAnalysisError = ''; req.user.pendingProfileText = ''; await req.user.save()
  try {
    const extractedText = await extractText(req.file.buffer)
    const extracted = await analyzeProfile(extractedText)
    const existingCareerProfile = req.user.careerProfile?.toObject ? req.user.careerProfile.toObject() : (req.user.careerProfile || {})
    const careerProfile = { ...existingCareerProfile, ...extracted }
    req.user.set({ careerProfile, skills: extracted.skills, profileAnalysisStatus: 'ready', profileAnalyzedAt: new Date(), pendingProfileText: extractedText })
    await req.user.save()
    res.json({ profile: { ...extracted, experience: req.user.experienceLevel }, profileAnalysisStatus: 'ready', extractionNote: 'Review the extracted fields before saving your confirmed profile.' })
  } catch (error) {
    req.user.set({ profileAnalysisStatus: 'failed', profileAnalysisError: error.message, pendingProfileText: '' })
    await req.user.save(); throw error
  }
}
exports.getProfile = (req, res) => { const user = req.user.toClient(); res.json({ profile: { ...user, ...user.careerProfile, careerProfile: user.careerProfile } }) }
exports.updateProfile = async (req, res) => {
  const input = profileSchema.parse(req.body)
  const existingCareerProfile = req.user.careerProfile?.toObject?.() || {}
  const careerFields = ['linkedinUrl', 'fullName', 'headline', 'currentRole', 'summary', 'employment', 'education', 'projects', 'technologies', 'skillCategories', 'certifications', 'strengths', 'skillGaps', 'recommendedLearningAreas']
  const careerProfile = { ...existingCareerProfile }
  for (const field of careerFields) if (input[field] !== undefined) careerProfile[field] = input[field]
  req.user.set({
    targetRole: input.targetRole,
    experienceLevel: input.experienceLevel || input.experience || req.user.experienceLevel,
    skills: input.skills ?? req.user.skills,
    timezone: input.timezone || req.user.timezone,
    notificationTime: input.notificationTime || req.user.notificationTime,
    deliveryChannel: 'email',
    careerProfile,
    profileSetupComplete: true,
  })
  await req.user.save()
  res.json({ user: req.user.toClient() })
}
