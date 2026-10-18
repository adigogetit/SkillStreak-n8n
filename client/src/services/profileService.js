import api from './api'

export const uploadProfilePdf = (file, onUploadProgress) => {
  const data = new FormData()
  data.append('profilePdf', file)
  return api.post('/profile/upload', data, { headers: { 'Content-Type': 'multipart/form-data' }, onUploadProgress }).then((r) => r.data)
}
export const getProfile = () => api.get('/profile').then((r) => r.data)
export const saveProfile = (profile) => api.put('/profile', profile).then((r) => r.data)
