require('dotenv').config()
const mongoose = require('mongoose')
const app = require('./app')
const { port, mongoUri } = require('./config/env')
const { startChallengeScheduler } = require('./services/challengeGeneration')
const Challenge = require('./models/Challenge')
if (!mongoUri) throw new Error('MONGODB_URI is required. Copy .env.example to .env and configure it.')
async function prepareChallengeIndexes() {
  const collectionExists = await mongoose.connection.db.listCollections({ name: Challenge.collection.name }).hasNext()
  if (!collectionExists) await Challenge.createCollection()
  const indexes = await Challenge.collection.indexes()
  const legacyDailyIndex = indexes.find((index) => index.unique
    && index.key.user === 1
    && index.key.challengeDate === 1
    && !index.partialFilterExpression)
  if (legacyDailyIndex) await Challenge.collection.dropIndex(legacyDailyIndex.name)
  await Challenge.updateMany({ kind: { $exists: false } }, { $set: { kind: 'daily' } })
  await Challenge.createIndexes()
}
mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000 })
  .then(prepareChallengeIndexes)
  .then(() => {
    app.listen(port, () => {
      console.log(`SkillStreak API listening on port ${port}`)
      startChallengeScheduler()
    })
  })
  .catch((error) => {
    console.error('MongoDB startup failed:', error.message)
    console.error('Check the Atlas URI, database user password, and Network Access IP allowlist.')
    process.exit(1)
  })
