import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import Field from '../components/Field'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { user, signIn } = useAuth(); const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' }); const [error, setError] = useState(''); const [loading, setLoading] = useState(false)
  if (user) return <Navigate to="/dashboard" replace />
  const submit = async (e) => { e.preventDefault(); setError(''); if (!form.email || !form.password) return setError('Enter your email and password.'); setLoading(true); try { await signIn(form); navigate('/dashboard') } catch (err) { setError(err.response?.data?.message || 'Unable to log in. Please try again.') } finally { setLoading(false) } }
  return <main className="mx-auto max-w-md px-4 py-12 sm:py-20"><div className="card !rounded-3xl !p-7 sm:!p-9"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-600 font-black text-white shadow-md shadow-blue-200">S</span><p className="mt-6 text-sm font-bold uppercase tracking-wider text-blue-700">Welcome back</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight">Pick up where you left off.</h1><p className="mt-2 text-sm text-slate-600">Log in to continue your SkillStreak.</p>{error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}<form onSubmit={submit} className="mt-6 space-y-4"><Field label="Email" id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /><Field label="Password" id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /><button disabled={loading} className="btn-primary w-full">{loading ? 'Logging in…' : 'Log in'}</button></form><p className="mt-5 text-center text-sm text-slate-600">New here? <Link className="font-semibold text-blue-700" to="/signup">Create an account</Link></p></div></main>
}
