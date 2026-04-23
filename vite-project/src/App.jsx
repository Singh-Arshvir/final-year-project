import axios from 'axios' // Networking library to communicate with your Shahi Backend API
import { motion } from 'framer-motion' // Motion library for high-end staggered reveals and transitions
import { useEffect, useState } from 'react' // React hooks for state and lifecycle
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom' // Navigation engine for the multiple pages (Admin vs Site)
import Admin from './admin/Admin' // The Admin Dashboard component
import LoyaltySection from './components/LoyaltySection' // The Circle loyalty programme section
import ThreeHero from './components/ThreeHero' // The 3D Engine we built earlier

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api' // Fallback to localhost for development

// SIDEBAR COMPONENT: Handles the fixed navigation frame for Desktop and Mobile
function Sidebar() {
  return (
    <>
      {/* Desktop Navigation: Fixed vertical bar with 'writing-mode' text */}
      <div className="fixed top-0 left-0 w-[100px] h-full border-r border-ink/5 bg-paper z-[60] hidden lg:flex flex-col justify-between items-center py-10">
        <div className="flex flex-col items-center gap-12">
          <div className="w-[1px] h-12 bg-ink/20"></div>
          <div className="[writing-mode:vertical-lr] text-sm font-bold tracking-[0.4em] uppercase text-ink rotate-180 select-none">
            Shahi Architects
          </div>
        </div>
        {/* Navigation Anchors for the main page sections */}
        <div className="flex flex-col items-center gap-10 text-[9px] font-bold tracking-[0.5em] uppercase text-ink/60">
          <a
            href="#hero"
            className="hover:text-gold transition-colors [writing-mode:vertical-lr] rotate-180 font-bold"
          >
            Home
          </a>
          <a
            href="#projects"
            className="hover:text-gold transition-colors [writing-mode:vertical-lr] rotate-180 font-bold"
          >
            Works
          </a>
          <a
            href="#loyalty"
            className="hover:text-gold transition-colors [writing-mode:vertical-lr] rotate-180 font-bold"
          >
            Circle
          </a>
          <a
            href="#contact"
            className="hover:text-gold transition-colors [writing-mode:vertical-lr] rotate-180 font-bold"
          >
            Contact
          </a>
        </div>
      </div>

      {/* Mobile Top Navigation: Glassmorphism bar that appears only on phones */}
      <div className="fixed top-0 left-0 w-full p-6 bg-paper/80 backdrop-blur-xl border-b border-ink/5 z-[60] flex justify-between items-center lg:hidden">
        <div className="text-[10px] font-bold tracking-[0.4em] uppercase text-ink">
          Shahi Architects
        </div>
        <div className="flex gap-6 text-[9px] font-bold tracking-widest uppercase text-ink/60">
          <a href="#projects" className="hover:text-gold transition-colors">
            Works
          </a>
          <a href="#loyalty" className="hover:text-gold transition-colors">
            Circle
          </a>
          <a href="#contact" className="hover:text-gold transition-colors">
            Contact
          </a>
        </div>
      </div>
    </>
  )
}

// SECTION COMPONENT: Standardized wrapper for website sections with entrance animations
function Section({ id, title, subtitle, children, className = '' }) {
  return (
    <section
      id={id}
      className={`min-h-screen lg:ml-[100px] px-6 sm:px-12 md:px-20 py-[15vh] flex flex-col justify-center relative border-b border-ink/5 ${className}`}
    >
      <div className="max-w-4xl relative z-20">
        {title && (
          <div className="overflow-hidden mb-8">
            {/* Framer Motion header reveal */}
            <motion.h2
              initial={{ y: '100%' }}
              whileInView={{ y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="text-[clamp(2.5rem,8vw,6rem)] font-bold tracking-tighter leading-[0.9] uppercase text-ink drop-shadow-sm"
            >
              {title}
            </motion.h2>
          </div>
        )}
        {subtitle && (
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-[10px] sm:text-xs uppercase tracking-[0.3em] text-ink/70 max-w-md leading-relaxed mb-12 font-bold bg-paper/40 backdrop-blur-md p-3 -ml-3 rounded-sm border-l border-ink/5"
          >
            {subtitle}
          </motion.p>
        )}
        {children}
      </div>
    </section>
  )
}

// PROJECT GRID: Displays architectural works from the MongoDB database
function ProjectGrid({ projects }) {
  if (!projects || projects.length === 0)
    return (
      <div className="p-20 text-[10px] uppercase font-mono text-ink/20 text-center">
        Initialising Global Archive...
      </div>
    )
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t border-l border-ink/5">
      {projects.map((p) => (
        <div
          key={p._id}
          className="aspect-square relative group overflow-hidden border-r border-b border-ink/5 cursor-crosshair"
        >
          <img
            src={p.image}
            className="w-full h-full object-cover grayscale brightness-110 group-hover:grayscale-0 group-hover:brightness-100 transition-all duration-1000 opacity-60 group-hover:opacity-100"
          />
          <div className="absolute inset-0 bg-paper/10 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
          {/* Project Information Reveal on Hover */}
          <div className="absolute inset-x-6 sm:inset-x-8 bottom-6 sm:bottom-8 transition-transform duration-700 transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 z-10">
            <span className="text-[9px] font-mono text-ink/50 mb-2 block tracking-widest">
              {p.id} / PROJECT
            </span>
            <h4 className="text-xs font-bold uppercase tracking-widest text-ink">
              {p.name}
            </h4>
            <p className="text-[8px] uppercase tracking-[0.2em] text-ink/60 mt-1 font-bold">
              {p.location}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

// CONTACT FORM: Sends client inquiries to your Admin Dashboard
function ContactForm() {
  const [status, setStatus] = useState('')
  const [form, setForm] = useState({
    name: '',
    email: '',
    projectType: 'RESIDENTIAL',
    message: '',
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('SENDING TO SERVER...')
    try {
      await axios.post(`${API}/inquiries`, form)
      setStatus('INQUIRY RECEIVED. WE WILL REACH OUT.')
      setForm({ name: '', email: '', projectType: 'RESIDENTIAL', message: '' })
    } catch (err) {
      setStatus('SUBMISSION FAILED. RE-ATTEMPTING CONNECTION...')
    }
  }

  return (
    <div className="bg-paper p-6 sm:p-12 border border-ink/5 shadow-2xl relative z-20">
      <form onSubmit={handleSubmit} className="flex flex-col gap-10">
        <div className="flex flex-col gap-2">
          <label className="text-[8px] tracking-[0.4em] uppercase text-ink/40 font-bold">
            Sender Identity
          </label>
          <input
            type="text"
            placeholder="FULL NAME"
            required
            className="bg-transparent border-b border-ink/10 py-4 text-xs font-bold tracking-widest outline-none focus:border-gold transition-colors placeholder:text-ink/10"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[8px] tracking-[0.4em] uppercase text-ink/40 font-bold">
            Communication
          </label>
          <input
            type="email"
            placeholder="EMAIL ADDRESS"
            required
            className="bg-transparent border-b border-ink/10 py-4 text-xs font-bold tracking-widest outline-none focus:border-gold transition-colors placeholder:text-ink/10"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        {/* Architectural Program Selection */}
        <div className="flex flex-col gap-2">
          <label className="text-[8px] tracking-[0.4em] uppercase text-ink/40 font-bold">
            Category
          </label>
          <select
            className="bg-transparent border-b border-ink/10 py-4 text-[9px] font-bold tracking-[0.4em] uppercase outline-none cursor-pointer hover:border-gold transition-colors"
            value={form.projectType}
            onChange={(e) => setForm({ ...form, projectType: e.target.value })}
          >
            <option>RESIDENTIAL</option>
            <option>CULTURAL</option>
            <option>EXPERIMENTAL</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[8px] tracking-[0.4em] uppercase text-ink/40 font-bold">
            Project Vision
          </label>
          <textarea
            rows="3"
            placeholder="DESCRIBE THE OBJECTIVE..."
            required
            className="bg-transparent border-b border-ink/10 py-4 text-xs font-bold tracking-widest outline-none focus:border-gold transition-colors resize-none placeholder:text-ink/10 font-medium"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          ></textarea>
        </div>
        <button className="px-12 py-6 bg-ink text-white font-bold uppercase text-[9px] tracking-[0.6em] self-start transition-all active:scale-95 hover:bg-gold hover:shadow-2xl">
          {status || 'Submit Request'}
        </button>
      </form>
    </div>
  )
}

// MAIN SITE COMPONENT: Assembles all website elements
function MainSite() {
  const [projects, setProjects] = useState([])

  // Fetching the projects from the database as soon as the site loads
  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const res = await axios.get(`${API}/projects`)
      setProjects(res.data)
    } catch (err) {
      console.error('Error fetching projects from the backend API', err)
    }
  }

  return (
    <div className="bg-paper min-h-screen">
      <Sidebar /> {/* Fixed Navigation Frame */}
      <ThreeHero /> {/* The Interactive 3D Background */}
      <main className="relative z-10 antialiased">
        {/* HERO SECTION: The landing impression */}
        <section
          id="hero"
          className="min-h-screen lg:ml-[100px] px-6 sm:px-12 md:px-20 flex flex-col justify-center"
        >
          <div className="max-w-4xl relative z-20">
            <span className="text-[9px] font-mono text-ink/40 mb-10 block tracking-[0.6em] font-bold">
              SHAHI STUDIO / INDEX 2026
            </span>
            <div className="overflow-hidden">
              <motion.h1
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                className="text-[clamp(3rem,14vw,8rem)] font-bold tracking-tighter leading-[0.85] uppercase mb-16 text-ink drop-shadow-xl"
              >
                Sculpting <br />
                Silence.
              </motion.h1>
            </div>
            <p className="text-xs uppercase tracking-[0.4em] text-ink/80 max-w-sm leading-[2] font-bold bg-paper/40 backdrop-blur-xl p-6 -ml-6 rounded-sm border-l-2 border-gold shadow-sm">
              Architecture based in the intersection of theory and physical
              realization.
            </p>
          </div>
        </section>

        {/* SELECTED WORKS SECTION: Dynamic from the DB */}
        <section id="projects" className="lg:ml-[100px] border-t border-ink/5">
          <div className="px-6 md:px-20 py-12 border-b border-ink/5 flex flex-col md:flex-row justify-between items-start md:items-end bg-paper-dim/40 gap-6">
            <h3 className="text-3xl sm:text-4xl font-bold uppercase tracking-tighter text-ink italic">
              Selected Works.
            </h3>
            <span className="text-[10px] font-mono text-ink/50 tracking-widest font-bold">
              ({projects.length < 10 ? '0' : ''}
              {projects.length} / ARCHIVE)
            </span>
          </div>
          <ProjectGrid projects={projects} />
        </section>

        {/* PRACTICE/STUDIO SECTION */}
        <section
          id="studio"
          className="min-h-screen lg:ml-[100px] border-b border-ink/5 relative overflow-hidden"
        >
          <Section
            title="The Practice."
            subtitle="Our studio operates as a laboratory for material research and geometric experimentation."
            className="border-none !ml-0"
          >
            <div className="grid md:grid-cols-2 gap-16 mt-12 text-[11px] uppercase tracking-[0.2em] leading-[2.2] text-ink/70 font-bold relative z-20">
              <p className="p-4 rounded-sm border-l border-ink/10">
                We specialize in high-end residential and cultural projects that
                challenge the conventional boundaries of space and gravity.
              </p>
              <p className="p-4 rounded-sm border-l border-ink/10">
                From initial concept sketching to material assembly, we maintain
                a strict technical rigor that ensures every project resonates
                perfectly with its environment.
              </p>
            </div>
          </Section>
        </section>

        {/* LOYALTY CIRCLE SECTION */}
        <LoyaltySection />

        {/* CONTACT/INQUIRY SECTION */}
        <section
          id="contact"
          className="lg:ml-[100px] px-6 md:px-20 py-[20vh] bg-paper-dim/60 border-t border-ink/5 relative"
        >
          <div className="grid lg:grid-cols-2 gap-32 relative z-20">
            <div className="max-w-md">
              <h2 className="text-[clamp(3.5rem,10vw,7rem)] font-bold uppercase tracking-tighter leading-[0.8] mb-12 text-ink">
                New <br />
                <span className="italic text-ink/20">Inquiry.</span>
              </h2>
              <div className="flex flex-col gap-8 text-[10px] uppercase tracking-[0.5em] font-bold">
                <a
                  href="mailto:info@shahistudio.com"
                  className="hover:text-gold transition-all underline decoration-gold/30 underline-offset-[12px] hover:underline-offset-[16px]"
                >
                  E: INFO@SHAHISTUDIO.COM
                </a>
                <span className="text-ink/40">T: +1 438 999 0000</span>
              </div>
            </div>
            <ContactForm />
          </div>

          <div className="mt-40 flex flex-col md:flex-row justify-between items-center text-[9px] uppercase tracking-[0.6em] text-ink/40 font-bold gap-10">
            <span>Shahi Studio Archive &copy; 2026</span>
            <div className="flex gap-12">
              <a href="#" className="hover:text-ink transition-colors">
                Studio
              </a>{' '}
              /{' '}
              <a href="#" className="hover:text-ink transition-colors">
                Works
              </a>{' '}
              /{' '}
              <a href="#" className="hover:text-ink transition-colors">
                Press
              </a>
            </div>
          </div>
        </section>
      </main>
      {/* CUSTOM CURSOR: Restricted only to Desktop for performance */}
      <div id="cursor" className="hidden lg:block"></div>
    </div>
  )
}

// THE ROOT APP: Handles Routing between the Main Site and Admin Dashboard
export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/admin" element={<Admin />} /> {/* Admin Panel Route */}
        <Route path="/*" element={<MainSite />} />{' '}
        {/* Default Main Site Route */}
      </Routes>
    </Router>
  )
}
