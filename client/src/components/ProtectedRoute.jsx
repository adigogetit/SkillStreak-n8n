import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
export default function ProtectedRoute({ children }) { const { user, loading } = useAuth(); if (loading) return <main className="mx-auto max-w-6xl px-4 py-16 text-slate-600">Checking your session…</main>; return user ? children : <Navigate to="/login" replace /> }
