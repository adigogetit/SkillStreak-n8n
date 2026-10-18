import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Layout({ children }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const leave = async () => { await signOut(); navigate('/') }
  return <>
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 shadow-[0_4px_20px_-18px_rgba(15,23,42,0.35)] backdrop-blur-xl">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
        <Link to={user ? '/dashboard' : '/'} className="group flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 text-base font-black text-white shadow-md shadow-blue-200 transition group-hover:rotate-3">S</span>
          <span className="text-lg font-extrabold tracking-tight text-slate-900">Skill<span className="text-blue-700">Streak</span></span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          {user ? <><NavLink to="/dashboard" className={({ isActive }) => `rounded-lg px-3 py-2 text-sm font-semibold transition ${isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>Dashboard</NavLink><button onClick={leave} className="btn-secondary !rounded-lg !px-3 !py-2">Log out</button></> : <><Link to="/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900">Log in</Link><Link to="/signup" className="btn-primary !rounded-lg !px-3 !py-2">Get started</Link></>}
        </div>
      </nav>
    </header>
    {children}
  </>
}
