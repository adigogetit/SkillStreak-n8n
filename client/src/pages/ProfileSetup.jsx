import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getProfile, saveProfile, uploadProfilePdf } from '../services/profileService'

const blankProfile = {
  linkedinUrl: '',
  fullName: '',
  headline: '',
  currentRole: '',
  summary: '',
  employment: '',
  education: '',
  projects: '',
  technologies: '',
  skills: '',
  skillCategories: [],
  certifications: [],
  strengths: [],
  skillGaps: [],
  recommendedLearningAreas: [],
  experienceLevel: 'Entry-level (0–2 years)',
  targetRole: '',
  deliveryChannel: 'email',
  notificationTime: '09:00',
}

function asList(value) {
  if (Array.isArray(value)) return value.filter((item) => typeof item === 'string' && item.trim())
  if (typeof value === 'string') return value.split(/[,\n;]/).map((item) => item.trim()).filter(Boolean)
  return []
}

function toForm(profile = {}) {
  const career = profile.careerProfile || profile
  return {
    ...blankProfile,
    linkedinUrl: career.linkedinUrl || '',
    fullName: career.fullName || profile.name || '',
    headline: career.headline || '',
    currentRole: career.currentRole || '',
    summary: career.summary || '',
    employment: career.employment || '',
    education: career.education || '',
    projects: career.projects || '',
    technologies: career.technologies || '',
    skills: asList(profile.skills).join(', '),
    skillCategories: Array.isArray(career.skillCategories) ? career.skillCategories : [],
    certifications: asList(career.certifications),
    strengths: asList(career.strengths),
    skillGaps: asList(career.skillGaps),
    recommendedLearningAreas: asList(career.recommendedLearningAreas),
    experienceLevel: profile.experienceLevel || blankProfile.experienceLevel,
    targetRole: profile.targetRole || '',
    deliveryChannel: 'email',
    notificationTime: profile.notificationTime || '09:00',
  }
}

function ReviewField({ id, label, value, onChange, multiline = false }) {
  const Component = multiline ? 'textarea' : 'input'
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <Component
        id={id}
        className={`input ${multiline ? 'min-h-28' : ''}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}

function ReadOnlyList({ title, values }) {
  if (!values?.length) return null
  return (
    <section>
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {values.map((value) => <span key={value} className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-800">{value}</span>)}
      </div>
    </section>
  )
}

export default function ProfileSetup() {
  const input = useRef(null)
  const [profile, setProfile] = useState(blankProfile)
  const [file, setFile] = useState(null)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [analysisStatus, setAnalysisStatus] = useState('not_started')

  useEffect(() => {
    getProfile()
      .then(({ profile: value }) => {
        setProfile(toForm(value))
        setAnalysisStatus(value.profileAnalysisStatus || 'not_started')
      })
      .catch(() => setError('Could not load your profile. Please refresh and try again.'))
  }, [])

  const change = (key, value) => {
    setProfile((current) => ({ ...current, [key]: value }))
    setSaved(false)
  }

  const chooseFile = async (picked) => {
    if (!picked) return
    if (picked.type !== 'application/pdf') {
      setError('Please choose a PDF file.')
      return
    }
    if (picked.size > 5 * 1024 * 1024) {
      setError('PDF files must be 5 MB or smaller.')
      return
    }
    setFile(picked)
    setError('')
    setSaved(false)
    setUploading(true)
    setProgress(0)
    setStatus('Uploading PDF and analyzing your profile with Gemini…')
    try {
      const result = await uploadProfilePdf(picked, (event) => {
        if (event.total) setProgress(Math.round((event.loaded / event.total) * 100))
      })
      setProfile((current) => ({
        ...current,
        ...toForm({ ...current, ...result.profile }),
        targetRole: current.targetRole,
        deliveryChannel: current.deliveryChannel,
        notificationTime: current.notificationTime,
        linkedinUrl: current.linkedinUrl,
      }))
      setAnalysisStatus(result.profileAnalysisStatus)
      setProgress(100)
      setStatus('Analysis complete. Review and edit the extracted information, then save your profile.')
    } catch (uploadError) {
      setAnalysisStatus('failed')
      setStatus('')
      setError(uploadError.response?.data?.message || (uploadError.request
        ? 'Cannot reach the API. Check that the backend is running and connected to MongoDB.'
        : 'Upload failed. Please try again.'))
    } finally {
      setUploading(false)
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    const skills = [...new Set(asList(profile.skills))]
    if (!profile.targetRole.trim()) {
      setError('Please enter a target role before saving your profile.')
      return
    }
    if (skills.length > 80) {
      setError('Please keep your skill list to 80 items or fewer.')
      return
    }
    setSaving(true)
    try {
      const skillCategories = profile.skillCategories.map((group) => ({
        ...group,
        skills: group.skills.filter((skill) => skills.includes(skill)),
      })).filter((group) => group.skills.length)
      await saveProfile({
        ...profile,
        targetRole: profile.targetRole.trim(),
        skills,
        skillCategories,
        certifications: asList(profile.certifications),
        strengths: asList(profile.strengths),
        skillGaps: asList(profile.skillGaps),
        recommendedLearningAreas: asList(profile.recommendedLearningAreas),
      })
      setSaved(true)
    } catch (saveError) {
      setError(saveError.response?.data?.message || 'Could not save your profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const categories = profile.skillCategories.filter((category) => category?.category && category.skills?.length)

  return (
    <main className="py-10 sm:py-14">
      <form onSubmit={submit} className="mx-auto max-w-4xl space-y-6 px-4 sm:px-6">
        <header className="rounded-3xl border border-blue-100/80 bg-gradient-to-r from-white to-blue-50/70 p-6 shadow-sm sm:p-8">
          <p className="text-sm font-bold uppercase tracking-wider text-blue-700">Make it yours</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">Set up your career profile</h1>
          <p className="mt-2 text-slate-600">Review your profile details and skills before saving them.</p>
        </header>

        <section className="card">
          <h2 className="font-semibold">Upload your LinkedIn profile PDF</h2>
          <p className="mt-1 text-sm text-slate-600">Upload a text-based LinkedIn PDF to extract your experience and skills.</p>
          <div
            onDrop={(event) => {
              event.preventDefault()
              chooseFile(event.dataTransfer.files[0])
            }}
            onDragOver={(event) => event.preventDefault()}
            className="mt-4 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/40 px-5 py-10 text-center transition hover:border-blue-400 hover:bg-blue-50/70"
          >
            <button type="button" disabled={uploading} onClick={() => input.current?.click()} className="font-medium text-blue-700 hover:underline disabled:opacity-60">
              Choose a PDF or drop it here
            </button>
            <p className="mt-1 text-sm text-slate-500">PDF files only, up to 5 MB</p>
            <input
              ref={input}
              onChange={(event) => {
                chooseFile(event.target.files?.[0])
                event.target.value = ''
              }}
              type="file"
              accept="application/pdf"
              className="hidden"
            />
          </div>
          {(file || uploading) && (
            <div className="mt-4 text-sm" aria-live="polite">
              {file && <p className="font-medium">{file.name}</p>}
              <div className="mt-2 h-2 overflow-hidden rounded bg-slate-100">
                <div className={`h-full bg-blue-600 transition-all ${uploading && progress === 0 ? 'w-1/4 animate-pulse' : ''}`} style={uploading && progress === 0 ? undefined : { width: `${progress}%` }} />
              </div>
              <p className="mt-2 text-slate-600">{uploading ? 'Uploading PDF and analyzing your profile with Gemini…' : status}</p>
            </div>
          )}
          {analysisStatus === 'failed' && !uploading && <p className="mt-3 text-sm text-red-700">Analysis failed. You can retry with another PDF or complete the profile manually.</p>}
        </section>

        <section className="card space-y-5">
          <div>
            <h2 className="font-semibold">Extracted profile details</h2>
            <p className="mt-1 text-sm text-slate-600">These fields come from your uploaded PDF and can be reviewed or edited.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <ReviewField id="fullName" label="Name" value={profile.fullName} onChange={(value) => change('fullName', value)} />
            <ReviewField id="headline" label="Professional headline" value={profile.headline} onChange={(value) => change('headline', value)} />
            <ReviewField id="currentRole" label="Current role" value={profile.currentRole} onChange={(value) => change('currentRole', value)} />
            <ReviewField id="education" label="Education" value={profile.education} onChange={(value) => change('education', value)} multiline />
            <ReviewField id="employment" label="Work experience" value={profile.employment} onChange={(value) => change('employment', value)} multiline />
            <ReviewField id="projects" label="Projects" value={profile.projects} onChange={(value) => change('projects', value)} multiline />
            <ReviewField id="summary" label="Professional summary" value={profile.summary} onChange={(value) => change('summary', value)} multiline />
            <ReviewField id="technologies" label="Additional technologies" value={profile.technologies} onChange={(value) => change('technologies', value)} multiline />
            <ReviewField id="skills" label="All extracted skills (comma or newline separated)" value={profile.skills} onChange={(value) => change('skills', value)} multiline />
            <ReviewField id="certifications" label="Certifications (comma or newline separated)" value={profile.certifications.join(', ')} onChange={(value) => change('certifications', asList(value))} multiline />
            <ReviewField id="strengths" label="Strengths (comma or newline separated)" value={profile.strengths.join(', ')} onChange={(value) => change('strengths', asList(value))} multiline />
            <ReviewField id="skillGaps" label="Skill gaps (comma or newline separated)" value={profile.skillGaps.join(', ')} onChange={(value) => change('skillGaps', asList(value))} multiline />
            <ReviewField id="learning" label="Recommended learning areas (comma or newline separated)" value={profile.recommendedLearningAreas.join(', ')} onChange={(value) => change('recommendedLearningAreas', asList(value))} multiline />
          </div>
          {categories.length > 0 && (
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <h3 className="font-medium">Extracted skill categories</h3>
              {categories.map((category) => <ReadOnlyList key={category.category} title={category.category} values={category.skills} />)}
            </div>
          )}
        </section>

        <section className="card">
          <h2 className="font-semibold">Career goals</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <ReviewField id="targetRole" label="Target role" value={profile.targetRole} onChange={(value) => change('targetRole', value)} />
            <div>
              <label className="label" htmlFor="experience">Experience level</label>
              <select id="experience" className="input" value={profile.experienceLevel} onChange={(event) => change('experienceLevel', event.target.value)}>
                {['Entry-level (0–2 years)', 'Mid-level (3–5 years)', 'Senior (6+ years)'].map((value) => <option key={value}>{value}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="linkedin">LinkedIn profile URL (optional)</label>
              <input id="linkedin" className="input" value={profile.linkedinUrl} onChange={(event) => change('linkedinUrl', event.target.value)} placeholder="https://www.linkedin.com/in/your-name" />
              <p className="mt-2 text-xs text-slate-500">A URL is a reference only; SkillStreak does not scrape LinkedIn data.</p>
            </div>
          </div>
        </section>

        <section className="card">
          <h2 className="font-semibold">Daily delivery preferences</h2>
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-700">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-blue-600 bg-blue-600 text-[10px] text-white">✓</span>
            Email
          </div>
          <div className="mt-4 max-w-xs">
            <label className="label" htmlFor="time">Preferred notification time</label>
            <input id="time" type="time" className="input" value={profile.notificationTime} onChange={(event) => change('notificationTime', event.target.value)} />
          </div>
        </section>

        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {saved && <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-green-50 p-4 text-sm text-green-800">
          <span>Your profile has been saved.</span>
          <Link to="/dashboard" className="btn-primary">Open dashboard</Link>
        </div>}
        <button disabled={saving || uploading} className="btn-primary">
          {saving ? 'Saving profile…' : saved ? 'Save changes' : 'Save Profile'}
        </button>
      </form>
    </main>
  )
}
