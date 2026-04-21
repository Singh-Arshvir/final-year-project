import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// ── Tier configuration ────────────────────────────────────────────
const TIERS = [
  {
    name: 'ASSOCIATE',
    min: 0,
    max: 199,
    color: 'text-ink/40',
    bar: 'bg-ink/10',
    badge: 'bg-paper-dim text-ink/50',
    perks: ['Priority Consultation Booking', 'Quarterly Studio Newsletter'],
  },
  {
    name: 'FELLOW',
    min: 200,
    max: 499,
    color: 'text-ink/70',
    bar: 'bg-ink/40',
    badge: 'bg-ink/10 text-ink',
    perks: ['5% Consultation Discount', 'Project Progress Reports', 'Private Studio Tours'],
  },
  {
    name: 'PATRON',
    min: 500,
    max: 999,
    color: 'text-gold',
    bar: 'bg-gold/60',
    badge: 'bg-gold/10 text-gold',
    perks: ['10% Project Discount', 'Dedicated Project Manager', 'Early Access to New Works'],
  },
  {
    name: 'LAUREATE',
    min: 1000,
    max: Infinity,
    color: 'text-gold',
    bar: 'bg-gold',
    badge: 'bg-gold text-white',
    perks: [
      '15% Lifetime Discount',
      'Exclusive Site Visits',
      'Named in Project Credits',
      'Personal Line to Principal',
    ],
  },
]

function getTier(pts) {
  return TIERS.find(t => pts >= t.min && pts <= t.max) || TIERS[0]
}
function getNextTier(pts) {
  const i = TIERS.findIndex(t => pts >= t.min && pts <= t.max)
  return i < TIERS.length - 1 ? TIERS[i + 1] : null
}
function progressPercent(pts) {
  const t = getTier(pts)
  if (t.max === Infinity) return 100
  return Math.round(((pts - t.min) / (t.max - t.min)) * 100)
}

// ── Component ─────────────────────────────────────────────────────
export default function LoyaltySection() {
  const [tab, setTab] = useState('join')
  const [form, setForm] = useState({ name: '', email: '', phone: '', referredBy: '' })
  const [statusEmail, setStatusEmail] = useState('')
  const [member, setMember] = useState(null)
  const [statusError, setStatusError] = useState('')
  const [joinStatus, setJoinStatus] = useState('')
  const [loading, setLoading] = useState(false)

  const handleJoin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setJoinStatus('TRANSMITTING...')
    try {
      await axios.post(`${API}/loyalty/register`, form)
      setJoinStatus('MEMBERSHIP GRANTED. WELCOME TO THE CIRCLE.')
      setForm({ name: '', email: '', phone: '', referredBy: '' })
    } catch (err) {
      setJoinStatus(err.response?.data?.message || 'REGISTRATION FAILED. RETRY.')
    }
    setLoading(false)
  }

  const handleCheckStatus = async (e) => {
    e.preventDefault()
    setLoading(true)
    setStatusError('')
    setMember(null)
    try {
      const res = await axios.get(`${API}/loyalty/status/${encodeURIComponent(statusEmail)}`)
      setMember(res.data)
    } catch (err) {
      setStatusError(err.response?.data?.message || 'MEMBER NOT FOUND IN ARCHIVE.')
    }
    setLoading(false)
  }

  return (
    <section
      id="loyalty"
      className="min-h-screen lg:ml-[100px] px-6 sm:px-12 md:px-20 py-[15vh] flex flex-col justify-center relative border-b border-ink/5"
    >
      {/* Watermark */}
      <div className="absolute inset-0 flex items-center justify-end pr-10 pointer-events-none overflow-hidden select-none">
        <span className="text-[20vw] font-bold text-ink/[0.02] uppercase tracking-tighter leading-none">
          Circle
        </span>
      </div>

      <div className="max-w-4xl relative z-20">
        {/* Header */}
        <div className="overflow-hidden mb-4">
          <motion.h2
            initial={{ y: '100%' }}
            whileInView={{ y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-[clamp(2.5rem,8vw,6rem)] font-bold tracking-tighter leading-[0.9] uppercase text-ink"
          >
            The Circle.
          </motion.h2>
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-[10px] sm:text-xs uppercase tracking-[0.3em] text-ink/70 max-w-md leading-relaxed mb-12 font-bold bg-paper/40 backdrop-blur-md p-3 -ml-3 rounded-sm border-l border-ink/5"
        >
          A private membership programme recognising clients who build with us across generations.
        </motion.p>

        {/* Tier Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="grid grid-cols-2 lg:grid-cols-4 border-t border-l border-ink/5 mb-16"
        >
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className="border-r border-b border-ink/5 p-6 hover:bg-paper-dim/40 transition-colors"
            >
              <div className={`text-[8px] font-bold tracking-[0.6em] uppercase mb-2 ${tier.color}`}>
                {tier.name}
              </div>
              <div className="text-[9px] font-mono text-ink/30 mb-4 tracking-widest">
                {tier.max === Infinity ? `${tier.min}+ PTS` : `${tier.min}–${tier.max} PTS`}
              </div>
              <ul className="space-y-1">
                {tier.perks.map(p => (
                  <li
                    key={p}
                    className="text-[8px] uppercase tracking-wider text-ink/50 font-bold flex items-start gap-2"
                  >
                    <span className={`w-1 h-1 mt-1 rounded-full flex-shrink-0 ${tier.bar}`} />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </motion.div>

        {/* Tab Toggle */}
        <div className="flex gap-0 mb-10 border border-ink/5 w-fit">
          {['join', 'status'].map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setJoinStatus(''); setMember(null); setStatusError('') }}
              className={`px-8 py-4 text-[9px] font-bold uppercase tracking-[0.4em] transition-all ${tab === t ? 'bg-ink text-white' : 'text-ink/40 hover:text-ink'}`}
            >
              {t === 'join' ? 'Join Circle' : 'My Status'}
            </button>
          ))}
        </div>

        {/* Panels */}
        <AnimatePresence mode="wait">
          {tab === 'join' && (
            <motion.div
              key="join"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              className="bg-paper border border-ink/5 p-8 sm:p-12 shadow-sm max-w-xl relative"
            >
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gold/50" />
              <h3 className="text-[9px] font-bold tracking-[0.4em] uppercase mb-8 text-ink/60 border-b border-ink/5 pb-4">
                Membership Registration
              </h3>
              <form onSubmit={handleJoin} className="flex flex-col gap-8">
                {[
                  { label: 'Full Name', key: 'name', type: 'text', placeholder: 'FULL NAME', required: true },
                  { label: 'Email Address', key: 'email', type: 'email', placeholder: 'EMAIL ADDRESS', required: true },
                  { label: 'Phone (Optional)', key: 'phone', type: 'tel', placeholder: '+1 000 000 0000', required: false },
                  { label: 'Referred By (Email)', key: 'referredBy', type: 'email', placeholder: 'REFERRER EMAIL (OPTIONAL)', required: false },
                ].map(field => (
                  <div key={field.key} className="flex flex-col gap-2">
                    <label className="text-[8px] tracking-[0.4em] uppercase text-ink/40 font-bold">
                      {field.label}
                    </label>
                    <input
                      type={field.type}
                      placeholder={field.placeholder}
                      required={field.required}
                      className="bg-transparent border-b border-ink/10 py-4 text-xs font-bold tracking-widest outline-none focus:border-gold transition-colors placeholder:text-ink/10"
                      value={form[field.key]}
                      onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                    />
                  </div>
                ))}
                <button
                  disabled={loading}
                  className="px-12 py-5 bg-ink text-white font-bold uppercase text-[9px] tracking-[0.6em] self-start transition-all hover:bg-gold active:scale-95 disabled:opacity-50"
                >
                  {loading ? 'TRANSMITTING...' : 'Request Membership'}
                </button>
                {joinStatus && (
                  <p className={`text-[9px] font-bold uppercase tracking-widest ${joinStatus.includes('GRANTED') ? 'text-gold' : 'text-red-400'}`}>
                    {joinStatus}
                  </p>
                )}
              </form>
            </motion.div>
          )}

          {tab === 'status' && (
            <motion.div
              key="status"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              className="max-w-xl"
            >
              <form onSubmit={handleCheckStatus} className="flex flex-col sm:flex-row gap-0 border border-ink/5 mb-8">
                <input
                  required
                  type="email"
                  placeholder="ENTER YOUR EMAIL"
                  className="flex-1 bg-transparent px-6 py-5 text-[10px] font-bold tracking-widest outline-none border-r border-ink/5 placeholder:text-ink/20"
                  value={statusEmail}
                  onChange={e => setStatusEmail(e.target.value)}
                />
                <button
                  disabled={loading}
                  className="px-8 py-5 bg-ink text-white text-[9px] font-bold uppercase tracking-[0.4em] hover:bg-gold transition-all whitespace-nowrap disabled:opacity-50"
                >
                  {loading ? '...' : 'Access File'}
                </button>
              </form>

              {statusError && (
                <p className="text-[9px] font-bold uppercase tracking-widest text-red-400/70 mb-6">
                  {statusError}
                </p>
              )}

              {member && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-paper border border-ink/5 shadow-sm overflow-hidden"
                >
                  <div className="w-full h-[2px] bg-gold/60" />
                  <div className="p-8 sm:p-10">
                    {/* Header row */}
                    <div className="flex flex-col sm:flex-row justify-between items-start mb-8 gap-4">
                      <div>
                        <div className="text-[8px] font-mono text-ink/30 tracking-widest mb-1 uppercase">
                          Member File
                        </div>
                        <div className="text-sm font-bold uppercase tracking-wider text-ink">{member.name}</div>
                        <div className="text-[9px] font-mono text-ink/40 mt-1">{member.email}</div>
                      </div>
                      <div className={`px-4 py-2 text-[8px] font-bold tracking-[0.5em] uppercase ${getTier(member.points).badge}`}>
                        {getTier(member.points).name}
                      </div>
                    </div>

                    {/* Points + Progress */}
                    <div className="mb-8">
                      <div className="flex justify-between items-end mb-3">
                        <span className="text-[8px] font-bold uppercase tracking-[0.5em] text-ink/40">
                          Prestige Points
                        </span>
                        <span className="text-2xl font-bold text-ink tracking-tighter">
                          {member.points.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full h-[2px] bg-ink/5 relative overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPercent(member.points)}%` }}
                          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                          className={`h-full ${getTier(member.points).bar}`}
                        />
                      </div>
                      {getNextTier(member.points) && (
                        <div className="flex justify-between mt-2">
                          <span className="text-[7px] font-mono text-ink/20 uppercase">
                            {getTier(member.points).name}
                          </span>
                          <span className="text-[7px] font-mono text-ink/40 uppercase">
                            {getNextTier(member.points).min - member.points} pts to{' '}
                            {getNextTier(member.points).name}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 border-t border-ink/5 pt-6 gap-4">
                      {[
                        { label: 'Projects', value: member.projectsCompleted },
                        { label: 'Referrals', value: member.referrals },
                        { label: 'Since', value: new Date(member.joinedAt).getFullYear() },
                      ].map(stat => (
                        <div key={stat.label}>
                          <div className="text-[8px] uppercase tracking-[0.3em] text-ink/30 font-bold mb-1">
                            {stat.label}
                          </div>
                          <div className="text-lg font-bold text-ink tracking-tighter">{stat.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Active Perks */}
                    <div className="mt-6 pt-6 border-t border-ink/5">
                      <div className="text-[8px] font-bold uppercase tracking-[0.4em] text-ink/30 mb-3">
                        Active Benefits
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {getTier(member.points).perks.map(perk => (
                          <span
                            key={perk}
                            className="text-[8px] font-bold uppercase tracking-wider bg-paper-dim px-3 py-1 border border-ink/5"
                          >
                            {perk}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}
