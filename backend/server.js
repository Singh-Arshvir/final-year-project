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

// 1. DATABASE & SECURITY
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/shahi_architects'
const JWT_SECRET = process.env.JWT_SECRET || 'SHAHI_SUPER_SECRET_KEY_2026'
const ALLOWED_IP = process.env.ALLOWED_IP || '127.0.0.1' // Defaulting to Localhost for safety

mongoose
  .connect(MONGO_URI)
  .then(() => console.log('Shahi Studio API: Cloud Connection Established 🚀'))
  .catch((err) => console.error('CRITICAL: Database Connection Failure:', err))

/* ---------------- SECURITY FIREWALL (IP GUARD) ---------------- */
// This middleware blocks anyone not from your specific computer
const ipGuard = (req, res, next) => {
    // Handling Render/Proxy IP detection
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress
    
    // Cleaning the IP (handling IPv6 prefixes)
    const cleanIp = clientIp.replace('::ffff:', '')
    
    // Bypass for local development
    if (cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp === ALLOWED_IP) {
        return next()
    }

    console.log(`BLOCKING UNAUTHORIZED ACCESS ATTEMPT FROM: ${cleanIp}`)
    // We send a 404 instead of 403 to "Ghost" the admin panel (make it look non-existent)
    res.status(404).send('Not Found') 
}

/* ---------------- MONITORING ROUTES ---------------- */
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'active', timestamp: new Date() })
})

// DEBUG IP: Visit this to see what IP the server detects for you
app.get('/api/auth/debug-ip', (req, res) => {
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress
    const cleanIp = clientIp.replace('::ffff:', '')
    res.send(`YOUR DETECTED IP IS: ${cleanIp}`)
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
  createdAt: { type: Date, default: Date.now } // Date tracking
})

// Blueprint for Client Inquiries (Form data)
const inquirySchema = new mongoose.Schema({
  name: String, // Client Name
  email: String, // Client Email
  projectType: String, // Selection from dropdown (Residential/Cultural)
  message: String, // The descriptive message
  status: { type: String, default: 'NEW' }, // Status for the admin dashboard
  createdAt: { type: Date, default: Date.now } // Submission date
})

// Compiling the blueprints into working Models
const User = mongoose.model('User', userSchema)
const Project = mongoose.model('Project', projectSchema)
const Inquiry = mongoose.model('Inquiry', inquirySchema)

/* ---------------- AUTH MIDDLEWARE (SECURITY GUARD) ---------------- */
// This function checks the 'Passport' (Token) before allowing access to Admin tools
function auth(req, res, next) {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1] // Extracting the token from 'Bearer <token>'

  if (!token) return res.status(401).json({ message: 'Access Denied: No Token Provided' })

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded // Storing the logged-in user data in the request
    next() // Letting the request proceed to the final step
  } catch (err) {
    res.status(401).json({ message: 'Invalid or Expired Token' }) // Rejection if token is old or fake
  }
}

/* ---------------- AUTH ROUTES ---------------- */

// NOTE: Registration is DISABLED for security. 
// Admin accounts must be created directly in the database or via seed script.

// CHECK IP: Allows the frontend to verify if the computer is authorized
app.get('/api/auth/check-ip', ipGuard, (req, res) => {
    res.json({ authorized: true })
})

// LOGIN: Exchanges email/password for a secure 24-hour Token
app.post('/api/auth/login', ipGuard, async (req, res) => {
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

// PROTECTED: Add a new project (Admin Only + IP Guarded)
app.post('/api/projects', [ipGuard, auth], async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Restricted Access' })
    const project = await Project.create(req.body)
    res.status(201).json(project)
  } catch (err) {
    res.status(400).json({ message: 'Error creating project' })
  }
})

// PROTECTED: Remove a project (Admin Only + IP Guarded)
app.delete('/api/projects/:id', [ipGuard, auth], async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Restricted Access' })
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

// PROTECTED: Get all leads (Admin Only + IP Guarded)
app.get('/api/inquiries', [ipGuard, auth], async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Restricted Access' })
    const inquiries = await Inquiry.find().sort({ createdAt: -1 })
    res.json(inquiries)
  } catch (err) {
    res.status(500).json({ message: 'Error fetching inquiries' })
  }
})

// PROTECTED: Clear an inquiry record (Admin Only + IP Guarded)
app.delete('/api/inquiries/:id', [ipGuard, auth], async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ message: 'Restricted Access' })
        await Inquiry.findByIdAndDelete(req.params.id)
        res.json({ message: 'Inquiry Records Updated' })
    } catch (err) {
        res.status(400).json({ message: 'Error removing record' })
    }
})

/* ---------------- SERVER LIFTOFF ---------------- */
const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Shahi Studio Backend: Running on http://localhost:${PORT} 🚀`)
})
