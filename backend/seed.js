import mongoose from 'mongoose' // Importing the Mongoose library to interact with MongoDB
import dotenv from 'dotenv' // Importing Dotenv to read your .env file credentials
import bcrypt from 'bcryptjs' // Importing Bcrypt to hash the admin password securely

dotenv.config() // Initialising Dotenv to make MONGO_URI available for use

// Defining the 'User' schema: For your Admin Login
const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, default: 'user' },
})

// Defining the 'Project' schema: For your Architectural Gallery
const projectSchema = new mongoose.Schema({
  id: String,
  name: String,
  location: String,
  image: String,
  category: { type: String, default: 'PORTFOLIO' },
  createdAt: { type: Date, default: Date.now }
})

// Compiling the Models
const User = mongoose.model('User', userSchema)
const Project = mongoose.model('Project', projectSchema)

// The Raw Project Data
const seedProjects = [
  { id: '01', name: 'Project Azure', location: 'Greece', image: '/project_azure_1776323644138.png' },
  { id: '02', name: 'Echo Pavilion', location: 'Canada', image: '/project_echo_1776323693858.png' },
  { id: '03', name: 'Vertex Tower', location: 'Dubai', image: '/project_vertex_1776323622466.png' },
  { id: '04', name: 'Obsidian House', location: 'USA', image: '/hero_architecture_1776323571975.png' }
]

// The Seed Function
async function seed() {
  try {
    const MONGO_URI = process.env.MONGO_URI 
    await mongoose.connect(MONGO_URI)
    console.log('Shahi Studio: Secure Connection Established...')
    
    // CLEARING DATABASE
    await Project.deleteMany({}) 
    await User.deleteMany({})
    console.log('Database Environment: Deep Cleaned.')
    
    // 1. SEEDING PROJECTS
    await Project.insertMany(seedProjects)
    console.log('Gallery: Successfully seeded 4 foundational projects.')

    // 2. SEEDING ADMIN USER
    const hashedPassword = await bcrypt.hash('shahi2026', 10) // Hashing your password securely
    await User.create({
        email: 'arshvirshahi45@gmail.com',
        password: hashedPassword,
        role: 'admin'
    })
    console.log('Security: Admin account created (arshvirshahi45@gmail.com).')
    
    console.log('\n--- SUCCESS ---')
    console.log('Your website is now ready.')
    console.log('Login at: http://localhost:5173/admin')
    console.log('Email: admin@shahi.com')
    console.log('Pass:  shahi2026')
    console.log('----------------\n')
    
    process.exit(0)
  } catch (err) {
    console.error('Critical Error during seeding:', err)
    process.exit(1)
  }
}

seed()
