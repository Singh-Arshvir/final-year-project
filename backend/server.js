/* 
  -------------------------------------------------------------------------
  🏛️ SHAHI ARCHITECTS: FULL-STACK OWNER REFERENCE
  -------------------------------------------------------------------------
  
  ADMIN DASHBOARD URL: http://localhost:5173/admin
  
  LOGIN CREDENTIALS:
  - EMAIL:    arshvirshahi45@gmail.com
  - PASSWORD: shahi2026
  
  SECURITY NOTICE: 
  - Registration is DISABLED. Only this account has access.
  - The JWT Token expires every 24 hours for your protection.
  
  -------------------------------------------------------------------------
*/

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
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp']
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
  res.status(200).json({ status: 'active', timestamp: new Date() })
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
  id: String, // Technical ID (e.g. '01')
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


/* ---------------- IP WHITELIST MIDDLEWARE (THE "BOUNCER") ---------------- */
/**
 * SECURITY GUARD: This function acts as a firewall. 
 * Even if a user has the correct password, they are BLOCKED if their IP is not on the list.
 */
function requireAdminIP(req, res, next) {
  // 1. Fetch the list of "VIP" IPs from the .env file.
  // If .env is empty, it only allows the local computer (127.0.0.1 or ::1).
  const allowedString = process.env.ALLOWED_ADMIN_IPS || '127.0.0.1,::1'
  
  // 2. Turn that string into a clean list (array) of addresses.
  const allowedIps = allowedString.split(',').map((ip) => ip.trim())

  // 3. Detect the "Visitor's" IP address.
  // We check 'x-forwarded-for' first because if the site is on Render/Cloudflare, 
  // the real user IP is hidden inside that header.
  let rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || ''
  
  // 4. Handle proxy chains (if there are multiple IPs, we take the first one).
  if (rawIp.includes(',')) {
    rawIp = rawIp.split(',')[0].trim()
  }

  // 5. Normalise the IP. 
  // Sometimes IPv4 addresses look like "::ffff:192.168.1.1". We strip the prefix.
  const ipv4 = rawIp.includes('::ffff:') ? rawIp.split('::ffff:')[1] : rawIp

  // 6. EMERGENCY BYPASS: If the whitelist contains '*', everyone gets in.
  if (allowedIps.includes('*')) return next() 

  // 7. THE FINAL CHECK: Is the visitor's IP (either raw or clean) in our allowed list?
  if (!allowedIps.includes(rawIp) && !allowedIps.includes(ipv4)) {
    // If NOT on the list, log a warning and block them with "403 Forbidden".
    console.warn(`SECURITY: Blocked admin access from strictly untrusted IP: ${rawIp}`)
    return res.status(403).json({ 
      message: 'Access Denied: Your IP address is not whitelisted for the admin panel.' 
    })
  }

  // 8. SUCCESS: The visitor is trusted. Let them through to the next function.
  next()
}

/* ---------------- AUTH MIDDLEWARE (SECURITY GUARD) ---------------- */
// This function checks the 'Passport' (Token) before allowing access to Admin tools
function auth(req, res, next) {
  requireAdminIP(req, res, () => {
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
  })
}

/* ---------------- AUTH ROUTES ---------------- */

// NOTE: Registration is DISABLED for security.
// Admin accounts must be created directly in the database or via seed script.

// LOGIN: Exchanges email/password for a secure 24-hour Token
app.post('/api/auth/login', requireAdminIP, async (req, res) => {
  const { email, password } = req.body
  const user = await User.findOne({ email }) // Finding user in the DB
  if (!user) return res.status(400).json({ message: 'Account Not Found' })

  const isMatch = await bcrypt.compare(password, user.password) // Comparing hashes
  if (!isMatch) return res.status(400).json({ message: 'Invalid Credentials' })

  const token = jwt.sign(
    { id: user._id, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' } // Token expires in one day for security
  )

  res.json({ token, user: { email: user.email, role: user.role } })
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

// PROTECTED: Upload an Image (Admin Only)
app.post('/api/upload', [auth, upload.single('image')], (req, res) => {
  try {
    if (req.user.role !== 'admin')
      return res.status(403).json({ message: 'Restricted Access' })
    if (!req.file)
      return res.status(400).json({ message: 'No file provided.' })
    
    // Cloudinary returns the secure URL via req.file.path
    res.status(201).json({ imageUrl: req.file.path })
  } catch (err) {
    res.status(500).json({ message: 'Error uploading image.' })
  }
})

// PROTECTED: Add a new project (Admin Only)
app.post('/api/projects', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin')
      return res.status(403).json({ message: 'Restricted Access' })
    const project = await Project.create(req.body)
    res.status(201).json(project)
  } catch (err) {
    res.status(400).json({ message: 'Error creating project' })
  }
})

// PROTECTED: Remove a project (Admin Only)
app.delete('/api/projects/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin')
      return res.status(403).json({ message: 'Restricted Access' })
    await Project.findByIdAndDelete(req.params.id)
    res.json({ message: 'Project Successfully Deleted' })
  } catch (err) {
    res.status(400).json({ message: 'Error deleting project' })
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

// PROTECTED: Get all leads (Admin Only)
app.get('/api/inquiries', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin')
      return res.status(403).json({ message: 'Restricted Access' })
    const inquiries = await Inquiry.find().sort({ createdAt: -1 })
    res.json(inquiries)
  } catch (err) {
    res.status(500).json({ message: 'Error fetching inquiries' })
  }
})

// PROTECTED: Clear an inquiry record (Admin Only)
app.delete('/api/inquiries/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin')
      return res.status(403).json({ message: 'Restricted Access' })
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

// PROTECTED: Get all loyalty members — Admin only
app.get('/api/loyalty', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin')
      return res.status(403).json({ message: 'Restricted Access' })
    const members = await Loyalty.find().sort({ points: -1 }) // Highest-ranked first
    res.json(members)
  } catch (err) {
    res.status(500).json({ message: 'Error fetching loyalty roster.' })
  }
})

// PROTECTED: Award points to a member and increment project count — Admin only
app.patch('/api/loyalty/:id/award', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin')
      return res.status(403).json({ message: 'Restricted Access' })
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

// PROTECTED: Remove a member from the Circle — Admin only
app.delete('/api/loyalty/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin')
      return res.status(403).json({ message: 'Restricted Access' })
    await Loyalty.findByIdAndDelete(req.params.id)
    res.json({ message: 'Member Removed from Circle.' })
  } catch (err) {
    res.status(400).json({ message: 'Removal failed.' })
  }
})

/* ---------------- LOYALTY FILE MANAGEMENT ---------------- */

// PROTECTED: Add a file to a member — Admin only
app.post('/api/loyalty/:id/files', [auth, upload.single('file')], async (req, res) => {
  try {
    if (req.user.role !== 'admin')
      return res.status(403).json({ message: 'Restricted Access' })
    
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

// PROTECTED: Remove a file from a member — Admin only
app.delete('/api/loyalty/:id/files/:fileId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin')
      return res.status(403).json({ message: 'Restricted Access' })

    const member = await Loyalty.findById(req.params.id)
    if (!member) return res.status(404).json({ message: 'Member not found.' })

    member.files = member.files.filter(f => f._id.toString() !== req.params.fileId)
    await member.save()
    
    res.json(member)
  } catch (err) {
    res.status(500).json({ message: 'File removal failed.' })
  }
})

/* ---------------- SERVER LIFTOFF ---------------- */
const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Shahi Studio Backend: Running on http://localhost:${PORT} 🚀`)
})
