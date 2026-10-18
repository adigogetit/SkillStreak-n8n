import api from './api'
const hasCsrfCookie = () => document.cookie.split('; ').some((item) => item.startsWith('skillstreak_csrf='))
export const ensureCsrf = () => hasCsrfCookie() ? Promise.resolve() : api.get('/auth/csrf')
export const login = async (credentials) => { await ensureCsrf(); return api.post('/auth/login', credentials).then((r) => r.data) }
export const signup = async (details) => { await ensureCsrf(); return api.post('/auth/register', details).then((r) => r.data) }
export const logout = () => api.post('/auth/logout')
export const getCurrentUser = () => api.get('/auth/me').then((r) => r.data)
