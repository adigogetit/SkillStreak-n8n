import { createContext, useContext, useEffect, useState } from 'react'
import * as authService from '../services/authService'

const AuthContext = createContext(null)
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => { authService.getCurrentUser().then((data) => setUser(data.user)).catch(() => setUser(null)).finally(() => setLoading(false)) }, [])
  const persist = (data, fallbackName) => {
    const nextUser = data.user || { name: fallbackName }
    setUser(nextUser)
    localStorage.setItem('skillstreak_user', JSON.stringify(nextUser))
  }
  const signIn = async (values) => { const data = await authService.login(values); persist(data, values.email.split('@')[0]) }
  const signUp = async (values) => { const data = await authService.signup(values); persist(data, values.name) }
  const signOut = async () => { try { await authService.logout() } finally { setUser(null); localStorage.removeItem('skillstreak_user') } }
  return <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>{children}</AuthContext.Provider>
}
export const useAuth = () => useContext(AuthContext)
