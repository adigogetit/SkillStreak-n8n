import api from './api'

export const getDashboard = () => api.get('/dashboard').then((r) => r.data)
export const getChallengeHistory = () => api.get('/challenges/history').then((r) => r.data.challenges.map((challenge) => ({
  ...challenge,
  id: String(challenge._id),
  status: challenge.status === 'solved' ? 'Solved' : challenge.status === 'not solved' ? 'Not solved' : 'Pending',
})))
export const createChallengeNow = (requestId) => api.post('/challenges/generate', { requestId }).then((r) => r.data)
export const updateChallengeStatus = (challengeId, status) => api.patch(`/challenges/${challengeId}/status`, { status }).then((r) => r.data)
export const submitDifficultyFeedback = (challengeId, difficulty) => api.patch(`/challenges/${challengeId}/feedback`, { difficulty }).then((r) => r.data)
