import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/shahi_architects'

async function migrate() {
  try {
    await mongoose.connect(MONGO_URI)
    console.log('Shahi Studio: Connecting for email migration...')
    
    // Attempting to find the old admin and update it to the new one
    const User = mongoose.model('User', new mongoose.Schema({ email: String }))
    
    const result = await User.updateOne(
      { email: 'admin@shahi.com' },
      { $set: { email: 'arshvirshahi45@gmail.com' } }
    )

    if (result.modifiedCount > 0) {
      console.log('SUCCESS: Admin email updated to arshvirshahi45@gmail.com 🔐')
    } else {
      console.log('NOTE: The email was already updated or the account was not found.')
    }
    
    process.exit(0)
  } catch (err) {
    console.error('Migration failed:', err)
    process.exit(1)
  }
}

migrate()
