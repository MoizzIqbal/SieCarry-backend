import mongoose from 'mongoose'

export async function connectDB(uri) {
  if (!uri) {
    throw new Error('MONGODB_URI is missing. Add it to server/.env')
  }

  mongoose.set('strictQuery', true)
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
  })
  console.log(`MongoDB connected: ${mongoose.connection.host}`)
}
