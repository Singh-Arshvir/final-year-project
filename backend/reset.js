import express from 'express'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'
import cors from 'cors'

dotenv.config()

const app = express()

// ✅ MIDDLEWARES
app.use(express.json())

// ✅ CORS FIX (VERY IMPORTANT)
const allowedOrigins = [
  'http://localhost:5173',
  'https://final-year-project-gamma-puce.vercel.app'
]

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('CORS not allowed'))
    }
  },
  credentials: true
}))

app.options('*', cors()) // ✅ preflight fix

// ✅ MONGODB CONNECT
const MONGO_URI = process.env.MONGO_URI

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => {
    console.error('❌ DB Error:', err)
    process.exit(1)
  })

// ✅ USER SCHEMA
const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, default: 'user' }
})

const User = mongoose.model('User', userSchema)


// ✅ TEST ROUTE
app.get('/', (req, res) => {
  res.send('Server is running 🚀')
})


// ✅ LOGIN ROUTE
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log("👉 Login API hit")

    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: "All fields required" })
    }

    const user = await User.findOne({ email: email.toLowerCase() })

    if (!user) {
      return res.status(400).json({ message: "User not found" })
    }

    const isMatch = await bcrypt.compare(password, user.password)

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" })
    }

    res.json({
      message: "Login successful",
      user: {
        email: user.email,
        role: user.role
      }
    })

  } catch (err) {
    console.error("❌ LOGIN ERROR:", err)
    res.status(500).json({ message: "Server error" })
  }
})


// ✅ CHECK IP ROUTE (dummy fix for your error)
app.get('/api/auth/check-ip', (req, res) => {
  res.json({ ip: req.ip, status: "OK" })
})


// ✅ SERVER START
const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
})