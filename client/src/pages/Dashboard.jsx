import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { createChallengeNow, getChallengeHistory, getDashboard, submitDifficultyFeedback, updateChallengeStatus } from '../services/challengeService'
import { getCreateNowFeedback } from '../utils/challengeNotification'
import { useAuth } from '../context/AuthContext'

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function Detail({ label, value }) {
  if (!hasText(value)) return null
  return (
    <section>
      <h3 className="text-sm font-semibold text-slate-800">{label}</h3>
      <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-600">{value}</p>
    </section>
  )
}

function TagList({ title, items }) {
  const values = Array.isArray(items) ? items.filter((item) => hasText(item)) : []
  if (!values.length) return null
  return (
    <section>
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {values.map((item) => <span key={item} className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-800">{item}</span>)}
      </div>
    </section>
  )
}

function ProfileOverview({ user }) {
  const [isOpen, setIsOpen] = useState(false)
  const dialogRef = useRef(null)
  const profile = user?.careerProfile || {}
  const skills = Array.isArray(user?.skills) ? user.skills.filter((skill) => hasText(skill)) : []
  const groups = Array.isArray(profile.skillCategories) ? profile.skillCategories.filter((group) => group?.category && group.skills?.length) : []
  const groupedSkills = new Set(groups.flatMap((group) => group.skills))
  const ungrouped = skills.filter((skill) => !groupedSkills.has(skill))
  const hasProfile = Boolean(user?.profileSetupComplete || skills.length || hasText(profile.summary) || hasText(profile.headline))

  useEffect(() => {
    if (!isOpen) return undefined
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', closeOnEscape)
    dialogRef.current?.focus()
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [isOpen])

  if (!hasProfile) {
    return (
      <section className="card">
        <h2 className="text-xl font-bold">My Profile</h2>
        <p className="mt-2 text-sm text-slate-600">Your saved career profile will appear here after you complete setup or upload a PDF.</p>
        <Link to="/setup" className="btn-primary mt-4">Set up your profile</Link>
      </section>
    )
  }

  return (
    <>
      <section className="card flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-blue-700">My Profile</p>
          <h2 className="mt-1 text-xl font-bold">{profile.fullName || user?.name || 'Career profile'}</h2>
          {(hasText(profile.headline) || hasText(profile.currentRole)) && <p className="mt-1 text-sm text-slate-600">{profile.headline || profile.currentRole}</p>}
        </div>
        <button type="button" onClick={() => setIsOpen(true)} className="btn-secondary">See profile</button>
      </section>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          onClick={(event) => { if (event.target === event.currentTarget) setIsOpen(false) }}
        >
          <section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-dialog-title"
            tabIndex={-1}
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl outline-none sm:p-8"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-blue-700">My Profile</p>
                <h2 id="profile-dialog-title" className="mt-1 text-2xl font-bold">{profile.fullName || user?.name || 'Career profile'}</h2>
                {(hasText(profile.headline) || hasText(profile.currentRole)) && <p className="mt-1 text-slate-600">{profile.headline || profile.currentRole}</p>}
              </div>
              <button type="button" onClick={() => setIsOpen(false)} aria-label="Close profile" className="rounded-lg p-2 text-2xl leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-900">×</button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Detail label="Current role" value={profile.currentRole} />
              <Detail label="Target role" value={user?.targetRole} />
              <Detail label="Experience level" value={user?.experienceLevel} />
              <Detail label="Professional summary" value={profile.summary} />
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <Detail label="Work experience and internships" value={profile.employment} />
              <Detail label="Education" value={profile.education} />
              <Detail label="Projects" value={profile.projects} />
              <Detail label="Additional technologies" value={profile.technologies} />
            </div>

            {(skills.length > 0 || groups.length > 0) && (
              <section className="mt-6 border-t border-slate-100 pt-5">
                <h3 className="font-semibold text-slate-900">Technical skills</h3>
                <div className="mt-3 space-y-4">
                  {groups.map((group) => (
                    <div key={group.category}>
                      <h4 className="text-sm font-medium text-slate-700">{group.category}</h4>
                      <div className="mt-2 flex flex-wrap gap-2">{group.skills.filter(hasText).map((skill) => <span key={skill} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">{skill}</span>)}</div>
                    </div>
                  ))}
                  {ungrouped.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-700">{groups.length ? 'Other skills' : 'Skills'}</h4>
                      <div className="mt-2 flex flex-wrap gap-2">{ungrouped.map((skill) => <span key={skill} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">{skill}</span>)}</div>
                    </div>
                  )}
                </div>
              </section>
            )}

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <TagList title="Certifications" items={profile.certifications} />
              <TagList title="Strengths" items={profile.strengths} />
              <TagList title="Skills to improve" items={profile.skillGaps} />
              <TagList title="Recommended learning areas" items={profile.recommendedLearningAreas} />
            </div>

            <div className="mt-7 flex justify-end border-t border-slate-100 pt-5">
              <Link to="/setup" className="btn-secondary">Edit profile / upload PDF</Link>
            </div>
          </section>
        </div>
      )}
    </>
  )
}

function ChallengeDetails({ challenge }) {
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-blue-700">{challenge.kind === 'on_demand' ? 'Generated now' : 'Daily challenge'} · {challenge.topic}</p>
          <h2 className="mt-1 text-xl font-bold">{challenge.title}</h2>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">{challenge.difficulty}</span>
      </div>
      <p className="mt-4 max-w-3xl whitespace-pre-line leading-7 text-slate-700">{challenge.description}</p>
      {challenge.instructions?.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold">Instructions</h3>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-6 text-slate-700">{challenge.instructions.map((instruction, index) => <li key={`${index}-${instruction}`}>{instruction}</li>)}</ol>
        </div>
      )}
      {challenge.examples?.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold">Examples</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">{challenge.examples.map((example, index) => <li key={`${index}-${example}`}>{example}</li>)}</ul>
        </div>
      )}
      {challenge.successCriteria?.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold">Success criteria</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">{challenge.successCriteria.map((criterion, index) => <li key={`${index}-${criterion}`}>{criterion}</li>)}</ul>
        </div>
      )}
      {challenge.estimatedMinutes && <p className="mt-4 text-sm text-slate-500">Estimated time: {challenge.estimatedMinutes} minutes</p>}
      {hasText(challenge.resourceUrl) && <a className="mt-3 inline-block text-sm font-semibold text-blue-700 hover:underline" href={challenge.resourceUrl} target="_blank" rel="noreferrer">Open learning resource →</a>}
    </>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [notificationWarning, setNotificationWarning] = useState('')
  const [actionError, setActionError] = useState('')
  const [working, setWorking] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [selectedChallenge, setSelectedChallenge] = useState(null)
  const [history, setHistory] = useState([])
  const [monthGroup, setMonthGroup] = useState(0)
  const generationLock = useRef(false)
  const historyRef = useRef(null)

  const load = async () => {
    try {
      const [next, history] = await Promise.all([getDashboard(), getChallengeHistory()])
      setData(next)
      setHistory(history)
      setError('')
    } catch (loadError) {
      setError(loadError.response?.data?.message || 'We could not load your dashboard. Please refresh to try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const currentChallenge = useMemo(
    () => selectedChallenge || data?.latestChallenge || data?.todayChallenge || null,
    [selectedChallenge, data],
  )
  const currentStatus = currentChallenge?.status?.toLowerCase()
  const monthGroups = data?.monthlyProgress ? Array.from({ length: 3 }, (_, index) => data.monthlyProgress.months.slice(index * 4, index * 4 + 4)) : []
  const visibleMonths = monthGroups[monthGroup] || []
  const scrollHistory = (direction) => {
    historyRef.current?.scrollBy({ top: direction * 220, behavior: 'smooth' })
  }

  const createNow = async () => {
    if (generationLock.current) return
    setActionError('')
    setMessage('')
    setNotificationWarning('')
    if (!data?.user?.profileSetupComplete || !data.user.targetRole) {
      setActionError('Save your profile and target role before generating a personalized challenge.')
      return
    }
    generationLock.current = true
    setGenerating(true)
    try {
      const result = await createChallengeNow(crypto.randomUUID())
      setSelectedChallenge(result.challenge)
      const feedback = getCreateNowFeedback(result)
      setMessage(feedback.message)
      setNotificationWarning(feedback.warning)
      await load()
    } catch (generateError) {
      setActionError(generateError.response?.data?.message || 'Could not generate a challenge. Please try again.')
    } finally {
      generationLock.current = false
      setGenerating(false)
    }
  }

  const updateStatus = async (status) => {
    if (!currentChallenge) return
    setWorking(true)
    setMessage('')
    setActionError('')
    try {
      await updateChallengeStatus(currentChallenge.id, status)
      setSelectedChallenge((current) => current ? { ...current, status: status.toLowerCase() } : current)
      setMessage(`Challenge marked ${status.toLowerCase()}.`)
      await load()
    } catch (statusError) {
      setActionError(statusError.response?.data?.message || 'Could not update this challenge. Please try again.')
    } finally {
      setWorking(false)
    }
  }

  const rate = async (difficulty) => {
    if (!currentChallenge) return
    setWorking(true)
    setMessage('')
    setActionError('')
    try {
      await submitDifficultyFeedback(currentChallenge.id, difficulty)
      setMessage(`Difficulty feedback saved: ${difficulty}.`)
      await load()
    } catch (feedbackError) {
      setActionError(feedbackError.response?.data?.message || 'Could not save feedback. Please try again.')
    } finally {
      setWorking(false)
    }
  }

  if (loading) return <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6"><p className="text-slate-600">Loading your dashboard…</p></main>
  if (error) return <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6"><div role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">{error}</div></main>

  return (
    <main className="py-8 sm:py-12">
      <div className="mx-auto max-w-6xl space-y-6 px-4 sm:px-6">
        <header className="rounded-3xl border border-blue-100/80 bg-gradient-to-r from-white via-white to-blue-50/70 p-6 shadow-[0_12px_40px_-28px_rgba(37,99,235,.4)] sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-blue-700">Your career practice</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">Welcome back, {user?.name || data.user?.name || 'there'}.</h1>
            <p className="mt-2 text-sm text-slate-600">Working toward <span className="font-semibold text-slate-800">{data.user?.targetRole || 'your next goal'}</span></p>
          </div>
          <button type="button" onClick={createNow} disabled={generating} className="btn-primary">
            {generating ? 'Generating challenge…' : 'Create Now'}
          </button>
          </div>
        </header>

        {actionError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{actionError} {!data.user?.profileSetupComplete && <Link className="font-semibold underline" to="/setup">Complete profile</Link>}</p>}
        {message && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{message}</p>}
        {notificationWarning && <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p>{notificationWarning}</p>
        </div>}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[['Current streak', `${data.stats.currentStreak} days`], ['Longest streak', `${data.stats.longestStreak} days`], ['Completed challenges', data.stats.totalCompleted], ['This week', `${data.stats.weeklyCompleted} completed`]].map(([label, value]) => (
            <div className="card" key={label}><p className="text-sm text-slate-600">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>
          ))}
        </section>

        <section className="card">
          {currentChallenge ? (
            <>
              <ChallengeDetails challenge={currentChallenge} />
              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">Your progress</h3>
                    <p className="mt-1 text-sm text-slate-600">Update this when you finish the challenge.</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-sm font-semibold ${
                    currentStatus === 'solved' ? 'bg-green-100 text-green-800' :
                      currentStatus === 'not solved' ? 'bg-amber-100 text-amber-800' : 'bg-white text-slate-600 ring-1 ring-slate-200'
                  }`}>
                    {working ? 'Saving…' : currentStatus === 'solved' ? 'Completed' : currentStatus === 'not solved' ? 'Not completed' : 'In progress'}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button type="button" disabled={working} aria-pressed={currentStatus === 'solved'} onClick={() => updateStatus('Solved')} className={`btn ${currentStatus === 'solved' ? 'bg-green-700 text-white hover:bg-green-800' : 'border border-green-700 bg-white text-green-800 hover:bg-green-50'}`}>
                    {currentStatus === 'solved' ? '✓ Work done' : 'Mark as done'}
                  </button>
                  <button type="button" disabled={working} aria-pressed={currentStatus === 'not solved'} onClick={() => updateStatus('Not solved')} className={`btn ${currentStatus === 'not solved' ? 'bg-amber-700 text-white hover:bg-amber-800' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}`}>
                    {currentStatus === 'not solved' ? 'Not completed' : 'Could not complete'}
                  </button>
                </div>
                <div className="mt-5 border-t border-slate-200 pt-4">
                  <p className="text-sm font-medium text-slate-800">How difficult was it?</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {['Easy', 'Medium', 'Hard'].map((level) => <button type="button" disabled={working} onClick={() => rate(level)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-800 disabled:opacity-60" key={level}>{level}</button>)}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="py-5">
              <h2 className="text-xl font-bold">No challenge yet</h2>
              <p className="mt-2 text-slate-600">Use Create Now to generate your first personalized challenge.</p>
            </div>
          )}
        </section>

        <ProfileOverview user={data.user} />

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="card">
            <div>
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-bold text-slate-900">Weekly progress</h2>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{data.stats.weeklyCompleted} completed</span>
              </div>
              <div className="mt-5 grid grid-cols-7 gap-2">
                {data.weeklyProgress.map((day) => <div key={day.day} className="text-center"><div aria-label={day.done ? `${day.day}: completed` : `${day.day}: not completed`} className={`mx-auto h-9 w-9 rounded-xl transition ${day.done ? 'bg-blue-600 shadow-sm shadow-blue-200' : 'bg-slate-100'}`} /><span className="mt-2 block text-xs font-medium text-slate-500">{day.day}</span></div>)}
              </div>
            </div>
            {data.monthlyProgress && (
              <div className="mt-7 border-t border-slate-100 pt-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-slate-900">Monthly progress</h2>
                    <p className="mt-1 text-sm text-slate-500">{data.monthlyProgress.year} · Months {monthGroup * 4 + 1}–{monthGroup * 4 + 4}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" disabled={monthGroup === 0} onClick={() => setMonthGroup((group) => Math.max(0, group - 1))} aria-label="Show previous four months" className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">←</button>
                    <button type="button" disabled={monthGroup === 2} onClick={() => setMonthGroup((group) => Math.min(2, group + 1))} aria-label="Show next four months" className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">→</button>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {visibleMonths.map((month) => {
                    const monthDate = new Date(`${month.month}-01T12:00:00Z`)
                    const name = new Intl.DateTimeFormat('en', { month: 'long', timeZone: 'UTC' }).format(monthDate)
                    const offset = (monthDate.getUTCDay() + 6) % 7
                    return (
                      <section key={month.month} className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
                        <div className="mb-2 flex items-center justify-between gap-1">
                          <h3 className="text-xs font-bold text-slate-800">{name}</h3>
                          <span className="text-[10px] font-medium text-slate-500">{month.completed} done</span>
                        </div>
                        <div className="grid grid-cols-7 gap-y-1 text-center">
                          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => <span key={`${day}-${index}`} className="pb-0.5 text-[9px] font-semibold text-slate-400">{day}</span>)}
                          {Array.from({ length: offset }, (_, index) => <span aria-hidden="true" key={`blank-${month.month}-${index}`} />)}
                          {month.days.map((day) => (
                            <span key={day.date} aria-label={`${day.date}: ${day.done ? 'completed' : 'not completed'}`} title={`${day.date}${day.done ? ' · completed' : ''}`} className={`mx-auto grid h-5 w-5 place-items-center rounded-md text-[9px] font-medium ${
                              day.done ? 'bg-emerald-500 text-white' : day.isToday ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-300' : 'text-slate-600'
                            }`}>{day.day}</span>
                          ))}
                        </div>
                      </section>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
          <div className="card">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-bold text-slate-900">Challenge history</h2>
              {history.length > 5 && (
                <div className="flex gap-1">
                  <button type="button" onClick={() => scrollHistory(-1)} aria-label="Scroll challenge history up" className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50">↑</button>
                  <button type="button" onClick={() => scrollHistory(1)} aria-label="Scroll challenge history down" className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50">↓</button>
                </div>
              )}
            </div>
            {history.length ? (
              <ul ref={historyRef} className="mt-3 max-h-80 divide-y divide-slate-100 overflow-y-auto overscroll-contain pr-1">
                {history.map((item) => (
                  <li key={item.id}>
                    <button type="button" onClick={() => setSelectedChallenge(item)} className="flex w-full items-center justify-between gap-3 py-3 text-left text-sm hover:bg-slate-50">
                      <span><span className="block font-medium">{item.title}</span><span className="text-slate-500">{item.topic} · {item.kind === 'on_demand' ? 'Created now' : 'Daily'}</span></span>
                      <span className={item.status === 'Solved' ? 'text-blue-700' : 'text-slate-500'}>{item.status}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-3 text-sm text-slate-600">Your generated challenges will appear here.</p>}
          </div>
        </section>

        <section className="card flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div><h2 className="font-semibold">Profile and delivery settings</h2><p className="mt-1 text-sm text-slate-600">Edit your extracted profile, skills, delivery channel, or notification time.</p></div>
          <Link to="/setup" className="btn-secondary">Edit profile / upload PDF</Link>
        </section>
      </div>
    </main>
  )
}
