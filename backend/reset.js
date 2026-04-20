import express from 'express'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'
import cors from 'cors'

dotenv.config()

const app = express()

// ✅ MIDDLEWARES
app.use(express.json())

// ✅ CORS CONFIG
const allowedOrigins = [
  'http://localhost:5173',
  'https://final-year-project-gamma-puce.vercel.app'
]

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error(`CORS not allowed for origin: ${origin}`))
    }
  },
  credentials: true
}))

app.options('*', cors())

// ✅ MONGODB CONNECT
const MONGO_URI = process.env.MONGO_URI

if (!MONGO_URI) {
  console.error("❌ MONGO_URI missing in .env")
  process.exit(1)
}

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => {
    console.error('❌ DB Error:', err)
    process.exit(1)
  })

// ✅ USER SCHEMA
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    required: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    default: 'user'
  }
})

const User = mongoose.model('User', userSchema)


// ✅ TEST ROUTE
app.get('/', (req, res) => {
  res.send('🚀 Server is running')
})


// ✅ SIGNUP ROUTE
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: "All fields required" })
    }

    const existingUser = await User.findOne({ email })

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    await User.create({
      email,
      password: hashedPassword
    })

    res.json({ message: "Signup successful" })

  } catch (err) {
    console.error("❌ SIGNUP ERROR:", err)
    res.status(500).json({ message: "Server error" })
  }
})


// ✅ LOGIN ROUTE
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: "All fields required" })
    }

    const user = await User.findOne({ email })

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


// ✅ CHECK IP ROUTE
app.get('/api/auth/check-ip', (req, res) => {
  res.json({
    ip: req.ip,
    status: "OK"
  })
})


// ✅ GLOBAL ERROR HANDLER (IMPORTANT)
app.use((err, req, res, next) => {
  console.error("🔥 ERROR:", err.message)
  res.status(500).json({ message: err.message || "Internal Server Error" })
})


// ✅ SERVER START
const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
})