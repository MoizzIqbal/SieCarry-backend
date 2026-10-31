import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import dotenv from 'dotenv'
import { connectDB } from './config/db.js'
import { notFound, errorHandler } from './middleware/errorHandler.js'
import authRoutes from './routes/auth.routes.js'
import productRoutes from './routes/products.routes.js'
import categoryRoutes from './routes/categories.routes.js'
import orderRoutes from './routes/orders.routes.js'
import contactRoutes from './routes/contact.routes.js'
import adminRoutes from './routes/admin.routes.js'
import uploadRoutes from './routes/upload.routes.js'
import settingsRoutes from './routes/settings.routes.js'
import blogRoutes from './routes/blogs.routes.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

app.use(
  cors({
    origin: [
      process.env.CLIENT_URL || 'http://localhost:5173',
      process.env.ADMIN_URL || 'http://localhost:5174',
    ],
    credentials: true,
  }),
)
app.use(express.json({ limit: '15mb' }))
app.use(morgan('dev'))

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', brand: 'SiwCarry', time: new Date().toISOString() })
})

app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/contact', contactRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/blogs', blogRoutes)

app.use(notFound)
app.use(errorHandler)

async function start() {
  try {
    await connectDB(process.env.MONGODB_URI)
    app.listen(PORT, () => {
      console.log(`SiwCarry API running on http://localhost:${PORT}`)
    })
  } catch (error) {
    console.error('Failed to start server:', error.message)
    process.exit(1)
  }
}

start()
