import axios from 'axios'

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || '/api', withCredentials: true, headers: { 'Content-Type': 'application/json' } })

api.interceptors.request.use((config) => {
  const csrf = document.cookie.split('; ').find((item) => item.startsWith('skillstreak_csrf='))?.split('=')[1]
  if (csrf && !['get', 'head', 'options'].includes(config.method?.toLowerCase())) config.headers['X-CSRF-Token'] = csrf
  return config
})

export default api
