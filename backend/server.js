import { v2 as cloudinary } from 'cloudinary'
import { CloudinaryStorage } from 'multer-storage-cloudinary'
import multer from 'multer'
import bcrypt from 'bcryptjs' // For ultra-secure hashing of admin passwords
import cors from 'cors' // Cross-Origin Resource Sharing: allows your frontend to talk to this backend
import dotenv from 'dotenv' // Reads configuration (like DB strings) from the hidden .env file
import express from 'express' // The web framework: handles all HTTP requests (GET, POST, DELETE)
import jwt from 'jsonwebtoken' // Generates 'Passports' (Tokens) for admins to stay logged in
import mongoose from 'mongoose' // The middleman between this code and your MongoDB database

dotenv.config() // Activating Environment Variables from .env

/* ---------------- ENVIRONMENT VALIDATION ---------------- */
const requiredEnv = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET', 'MONGO_URI', 'JWT_SECRET']
const missingEnv = requiredEnv.filter(key => !process.env[key])
if (missingEnv.length > 0) {
  console.warn('⚠️ WARNING: Missing Environment Variables:', missingEnv.join(', '))
  console.warn('Check your .env file or hosting provider settings.')
}

const app = express() // Initialising the Express app
app.use(cors()) // Enabling CORS so your React app fits perfectly with this API
app.use(express.json()) // Middleware: allows the server to read incoming JSON data (form submissions)

/* ---------------- FILE UPLOADS (CLOUDINARY) ---------------- */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'shahi_architects',
    resource_type: 'auto',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'pdf'],
    public_id: (req, file) => `draft_${Date.now()}_${file.originalname.split('.')[0]}`
  }
})
const upload = multer({ storage })

// 1. DATABASE & SECURITY
const MONGO_URI =
  process.env.MONGO_URI || 'mongodb://localhost:27017/shahi_architects'
const JWT_SECRET = process.env.JWT_SECRET || 'SHAHI_SUPER_SECRET_KEY_2026'

mongoose
  .connect(MONGO_URI)
  .then(() => console.log('Shahi Studio API: Cloud Connection Established 🚀'))
  .catch((err) => console.error('CRITICAL: Database Connection Failure:', err))

/* ---------------- MONITORING ROUTES ---------------- */
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'active', 
    timestamp: new Date(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV || 'development'
  })
})

/* ---------------- DATA MODELS ---------------- */
// Blueprint for an Admin User (Email and Password)
const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, default: 'user' },
  // Non-admin by default for security
})

// Blueprint for an Architectural Project (Name, Location, Image)
const projectSchema = new mongoose.Schema({
  projectId: String, // Technical ID (e.g. '01')
  name: String, // Bold Project Title
  location: String, // Site Location
  image: String, // URL/Path to the render
  category: { type: String, default: 'PORTFOLIO' }, // Automatic tag
  createdAt: { type: Date, default: Date.now }, // Date tracking
})

// Blueprint for Client Inquiries (Form data)
const inquirySchema = new mongoose.Schema({
  name: String, // Client Name
  email: String, // Client Email
  projectType: String, // Selection from dropdown (Residential/Cultural)
  message: String, // The descriptive message
  status: { type: String, default: 'NEW' }, // Status for the admin dashboard
  createdAt: { type: Date, default: Date.now }, // Submission date
})

// Blueprint for Loyalty Circle Members
const loyaltySchema = new mongoose.Schema({
  name: { type: String, required: true }, // Member full name
  email: { type: String, unique: true, required: true }, // Unique identifier & login key
  phone: { type: String, default: '' }, // Optional contact
  points: { type: Number, default: 0 }, // Prestige points (drives tier)
  tier: { type: String, default: 'ASSOCIATE' }, // ASSOCIATE | FELLOW | PATRON | LAUREATE
  projectsCompleted: { type: Number, default: 0 }, // Number of finished commissions
  referrals: { type: Number, default: 0 }, // Clients referred to the studio
  referredBy: { type: String, default: '' }, // Email of the referring member
  files: [
    {
      name: String,
      url: String,
      uploadedAt: { type: Date, default: Date.now },
    },
  ], // Documents/Plans shared with the client
  joinedAt: { type: Date, default: Date.now }, // Membership start date
  lastActivity: { type: Date, default: Date.now }, // Last interaction timestamp
})

// Derive tier from points (mirrors frontend TIERS array)
function deriveTier(pts) {
  if (pts >= 1000) return 'LAUREATE'
  if (pts >= 500) return 'PATRON'
  if (pts >= 200) return 'FELLOW'
  return 'ASSOCIATE'
}

// Compiling the blueprints into working Models
const User = mongoose.model('User', userSchema)
const Project = mongoose.model('Project', projectSchema)
const Inquiry = mongoose.model('Inquiry', inquirySchema)
const Loyalty = mongoose.model('Loyalty', loyaltySchema)



/* ---------------- AUTH MIDDLEWARE (SECURITY GUARD) ---------------- */
// This function checks the 'Passport' (Token) before allowing access to Admin tools
function auth(req, res, next) {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1] // Extracting the token from 'Bearer <token>'

  if (!token)
    return res.status(401).json({ message: 'Access Denied: No Token Provided' })

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded // Storing the logged-in user data in the request
    next() // Letting the request proceed to the final step
  } catch (err) {
    res.status(401).json({ message: 'Invalid or Expired Token' }) // Rejection if token is old or fake
  }
}

// Flexible middleware for role-based access control
function authorize(roles = []) {
  if (typeof roles === 'string') {
    roles = [roles]
  }

  return (req, res, next) => {
    auth(req, res, () => {
      if (roles.length && !roles.includes(req.user.role)) {
        return res.status(403).json({
          message: `Restricted Access: ${roles.join(' or ')} Privileges Required`
        })
      }
      next()
    })
  }
}

// Shorthand for admin-only actions
// Shorthand for staff actions (Admin or Manager)
const staffAuth = authorize(['admin', 'manager'])

/* ---------------- AUTH ROUTES ---------------- */

// REGISTER: Create a new account (Defaults to 'user' role)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and Password are required.' })
    }

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ message: 'Account already exists.' })
    }

    // Hash password for security
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Check if this email is the one defined in .env as ADMIN_EMAIL
    const isMainAdmin = email.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase()
    const role = isMainAdmin ? 'admin' : 'user'

    const newUser = await User.create({
      email,
      password: hashedPassword,
      role: role
    })

    // Generate token for immediate login after registration
    const token = jwt.sign(
      { id: newUser._id, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '24h' } // Extended to 24h for better UX
    )

    res.status(201).json({
      token,
      user: { email: newUser.email, role: newUser.role },
      message: 'Account Created Successfully'
    })
  } catch (err) {
    res.status(500).json({ message: 'Internal Server Error during registration.' })
  }
})

// LOGIN: Exchanges email/password for a secure Token
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email }) // Finding user in the DB
    if (!user) return res.status(400).json({ message: 'Account Not Found' })

    const isMatch = await bcrypt.compare(password, user.password) // Comparing hashes
    if (!isMatch) return res.status(400).json({ message: 'Invalid Credentials' })

    // AUTO-PROMOTION: If this is the configured ADMIN_EMAIL, ensure they have the admin role
    if (email.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase() && user.role !== 'admin') {
        user.role = 'admin'
        await user.save()
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' } // Extended to 24h for better UX
    )

    res.json({ token, user: { email: user.email, role: user.role } })
  } catch (err) {
    res.status(500).json({ message: 'Login processing error.' })
  }
})

// GET ME: Verifies the current token and returns user details
app.get('/api/auth/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password')
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json(user)
  } catch (err) {
    res.status(500).json({ message: 'Error fetching user profile' })
  }
})

/* ---------------- PROJECT MANAGEMENT ROUTES ---------------- */

// PUBLIC: Fetch all projects for the main website gallery
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 }) // Sorting newest first
    res.json(projects)
  } catch (err) {
    res.status(500).json({ message: 'Error fetching projects' })
  }
})

// PROTECTED: Upload an Image (Staff Only)
app.post('/api/upload', [staffAuth, upload.single('image')], (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: 'No file provided.' })

    // Cloudinary returns the secure URL via req.file.path
    res.status(201).json({ imageUrl: req.file.path })
  } catch (err) {
    console.error('Upload Error:', err)
    res.status(500).json({ message: 'Cloudinary Upload Failed: ' + err.message })
  }
})

// PROTECTED: Add a new project (Staff Only)
app.post('/api/projects', staffAuth, async (req, res) => {
  try {
    const project = await Project.create(req.body)
    res.status(201).json(project)
  } catch (err) {
    res.status(400).json({ message: 'Database Error: Could not save project details.' })
  }
})

// PROTECTED: Remove a project (Staff Only)
app.delete('/api/projects/:id', staffAuth, async (req, res) => {
  try {
    await Project.findByIdAndDelete(req.params.id)
    res.json({ message: 'Project Successfully Deleted' })
  } catch (err) {
    res.status(400).json({ message: 'Delete Operation Failed' })
  }
})

/* ---------------- INQUIRY TRACKING ROUTES ---------------- */

// PUBLIC: Submit a inquiry from the contact form
app.post('/api/inquiries', async (req, res) => {
  try {
    const inquiry = await Inquiry.create(req.body)
    res.status(201).json({ message: 'Inquiry Received', id: inquiry._id })
  } catch (err) {
    res.status(400).json({ message: 'Submission Error' })
  }
})

// PROTECTED: Get all leads (Staff Only)
app.get('/api/inquiries', staffAuth, async (req, res) => {
  try {
    const inquiries = await Inquiry.find().sort({ createdAt: -1 })
    res.json(inquiries)
  } catch (err) {
    res.status(500).json({ message: 'Error fetching inquiries' })
  }
})

// PROTECTED: Clear an inquiry record (Staff Only)
app.delete('/api/inquiries/:id', staffAuth, async (req, res) => {
  try {
    await Inquiry.findByIdAndDelete(req.params.id)
    res.json({ message: 'Inquiry Records Updated' })
  } catch (err) {
    res.status(400).json({ message: 'Error removing record' })
  }
})

/* ---------------- LOYALTY CIRCLE ROUTES ---------------- */

// PUBLIC: Register a new Circle member
app.post('/api/loyalty/register', async (req, res) => {
  try {
    const { name, email, phone, referredBy } = req.body
    if (!name || !email)
      return res.status(400).json({ message: 'Name and email are required.' })

    const existing = await Loyalty.findOne({ email })
    if (existing)
      return res
        .status(409)
        .json({ message: 'THIS EMAIL IS ALREADY IN THE CIRCLE.' })

    // Award 50 bonus points to the referrer if a valid referredBy email is given
    if (referredBy) {
      const referrer = await Loyalty.findOne({ email: referredBy })
      if (referrer) {
        referrer.referrals += 1
        referrer.points += 50
        referrer.tier = deriveTier(referrer.points)
        referrer.lastActivity = new Date()
        await referrer.save()
      }
    }

    const member = await Loyalty.create({
      name,
      email,
      phone: phone || '',
      referredBy: referredBy || '',
    })
    res.status(201).json({ message: 'Membership granted.', id: member._id })
  } catch (err) {
    res.status(500).json({ message: 'Registration error. Try again.' })
  }
})

// PUBLIC: Retrieve member status by email (for the "My Status" tab)
app.get('/api/loyalty/status/:email', async (req, res) => {
  try {
    const member = await Loyalty.findOne({
      email: decodeURIComponent(req.params.email),
    })
    if (!member)
      return res
        .status(404)
        .json({ message: 'No record found for this email.' })
    res.json(member)
  } catch (err) {
    res.status(500).json({ message: 'Lookup failed.' })
  }
})

// PROTECTED: Get all loyalty members — Staff only
app.get('/api/loyalty', staffAuth, async (req, res) => {
  try {
    const members = await Loyalty.find().sort({ points: -1 }) // Highest-ranked first
    res.json(members)
  } catch (err) {
    res.status(500).json({ message: 'Error fetching loyalty roster.' })
  }
})

// PROTECTED: Award points to a member and increment project count — Staff only
app.patch('/api/loyalty/:id/award', staffAuth, async (req, res) => {
  try {
    const { points, projectCompleted } = req.body
    const member = await Loyalty.findById(req.params.id)
    if (!member) return res.status(404).json({ message: 'Member not found.' })

    member.points += Number(points) || 0
    if (projectCompleted) member.projectsCompleted += 1
    member.tier = deriveTier(member.points)
    member.lastActivity = new Date()
    await member.save()
    res.json(member)
  } catch (err) {
    res.status(400).json({ message: 'Award failed.' })
  }
})

// PROTECTED: Remove a member from the Circle — Staff only
app.delete('/api/loyalty/:id', staffAuth, async (req, res) => {
  try {
    await Loyalty.findByIdAndDelete(req.params.id)
    res.json({ message: 'Member Removed from Circle.' })
  } catch (err) {
    res.status(400).json({ message: 'Removal failed.' })
  }
})

/* ---------------- LOYALTY FILE MANAGEMENT ---------------- */

// PROTECTED: Add a file to a member — Staff only
app.post('/api/loyalty/:id/files', [staffAuth, upload.single('file')], async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: 'No file provided.' })

    const member = await Loyalty.findById(req.params.id)
    if (!member) return res.status(404).json({ message: 'Member not found.' })

    member.files.push({
      name: req.body.name || req.file.originalname,
      url: req.file.path,
    })
    member.lastActivity = new Date()
    await member.save()

    res.status(201).json(member)
  } catch (err) {
    res.status(500).json({ message: 'File upload failed.' })
  }
})

// PROTECTED: Remove a file from a member — Staff only
app.delete('/api/loyalty/:id/files/:fileId', staffAuth, async (req, res) => {
  try {
    const member = await Loyalty.findById(req.params.id)
    if (!member) return res.status(404).json({ message: 'Member not found.' })

    member.files = member.files.filter(f => f._id.toString() !== req.params.fileId)
    await member.save()

    res.json(member)
  } catch (err) {
    res.status(500).json({ message: 'File removal failed.' })
  }
})

/* ---------------- GLOBAL ERROR HANDLER ---------------- */
app.use((err, req, res, next) => {
  console.error('FATAL:', err.stack)
  res.status(500).json({
    message: 'Architecture Fault: Something went wrong on our end.',
    error: err.message // Temporarily enabled for remote debugging
  })
})

/* ---------------- SERVER LIFTOFF ---------------- */
const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Shahi Studio Backend: Running on http://localhost:${PORT} 🚀`)
})
