function recommend(outcomes = []) {
  const recent = outcomes.slice(-5); if (!recent.length) return { recommendedDifficulty: 'Easy', reason: 'No prior outcomes; begin with a short, guided Easy challenge.' }
  const hardMisses = recent.filter((o) => o.status === 'not solved' && o.ratedDifficulty === 'Hard').length
  const easyWins = recent.filter((o) => o.status === 'solved' && o.ratedDifficulty === 'Easy').length
  const mediumWins = recent.filter((o) => o.status === 'solved' && o.ratedDifficulty === 'Medium').length
  const easyMisses = recent.filter((o) => o.status === 'not solved' && o.ratedDifficulty === 'Easy').length
  if (hardMisses >= 2 || easyMisses >= 2) return { recommendedDifficulty: 'Easy', reason: 'Recent challenges were difficult; use a shorter guided task.' }
  if (mediumWins >= 3) return { recommendedDifficulty: 'Hard', reason: 'Several recent Medium challenges were solved; increase the challenge gradually.' }
  if (easyWins >= 3) return { recommendedDifficulty: 'Medium', reason: 'Several recent Easy challenges were solved; move up gradually.' }
  return { recommendedDifficulty: 'Easy', reason: 'Keep practice approachable with a short, focused Easy challenge.' }
}
module.exports = { recommend }
