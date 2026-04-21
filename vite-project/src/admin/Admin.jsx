import React, { useState, useEffect } from 'react' // React primitives for state and lifecycle
import axios from 'axios' // Networking library for making API requests to your backend

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api' // The base URL for your Shahi Architects backend server

export default function Admin() {
    // STATE: Controlling what the admin sees
    const [token, setToken] = useState(localStorage.getItem('shahi_token')) // Persisted login 'passport'
    const [userRole, setUserRole] = useState(localStorage.getItem('shahi_role')) // User role from login
    const [email, setEmail] = useState('') // Login email intake
    const [password, setPassword] = useState('') // Login password intake
    const [view, setView] = useState('projects') // View toggle: 'projects', 'inquiries', or 'loyalty'
    const [data, setData] = useState([]) // Container for projects or enquiries fetched from DB
    const [loading, setLoading] = useState(false) // Spinner state for when data is being fetched

    // STATE: For adding a brand new project
    const [newProject, setNewProject] = useState({ name: '', location: '', image: '', id: '' })

    // STATE: For awarding loyalty points
    const [awardState, setAwardState] = useState({}) // { [memberId]: { points: '', projectCompleted: false } }
    const [awardStatus, setAwardStatus] = useState({}) // { [memberId]: 'success' | 'error' }
    
    // IP LOCKDOWN STATE:
    const [isAuthorized, setIsAuthorized] = useState(true) // Defaults to true for local development
    const [checkingIP, setCheckingIP] = useState(true)

    // LIFECYCLE: Check if this computer is authorized to even see the login screen
    useEffect(() => {
        const checkIP = async () => {
            try {
                await axios.get(`${API}/auth/check-ip`)
                setIsAuthorized(true)
            } catch (err) {
                if (err.response?.status === 404) {
                    setIsAuthorized(false) // Ghost mode activated
                }
            } finally {
                setCheckingIP(false)
            }
        }
        checkIP()
    }, [])

    // LIFECYCLE: Automatically fetch data whenever the view (Projects/Inquiries) changes
    useEffect(() => {
        if (token && userRole === 'admin') {
            fetchData()
        }
    }, [token, view, userRole])

    // THE FETCH ENGINE: Pulls live data from your MongoDB cluster via the Backend API
    const fetchData = async () => {
        setLoading(true)
        try {
            const endpoint = view === 'projects' ? '/projects' : view === 'inquiries' ? '/inquiries' : '/loyalty'
            const res = await axios.get(`${API}${endpoint}`, {
                headers: { Authorization: `Bearer ${token}` } // Passing the JWT Token for security
            })
            setData(res.data) // Updating the dashboard with real items
        } catch (err) {
            console.error(err)
            if (err.response?.status === 401 || err.response?.status === 403) handleLogout()
        }
        setLoading(false)
    }

    // AWARD POINTS: Send points award to a loyalty member
    const handleAward = async (memberId) => {
        const state = awardState[memberId] || {}
        const pts = parseInt(state.points) || 0
        if (pts <= 0) return
        try {
            await axios.patch(`${API}/loyalty/${memberId}/award`, {
                points: pts,
                projectCompleted: state.projectCompleted || false
            }, { headers: { Authorization: `Bearer ${token}` } })
            setAwardStatus(prev => ({ ...prev, [memberId]: 'success' }))
            setAwardState(prev => ({ ...prev, [memberId]: { points: '', projectCompleted: false } }))
            fetchData()
            setTimeout(() => setAwardStatus(prev => ({ ...prev, [memberId]: null })), 2500)
        } catch (err) {
            setAwardStatus(prev => ({ ...prev, [memberId]: 'error' }))
        }
    }

    // LOGIN ACTION: Exchanges credentials for a 24-hour Authorization Token and User Role
    const handleLogin = async (e) => {
        e.preventDefault()
        try {
            const res = await axios.post(`${API}/auth/login`, { email, password })
            const { token, user } = res.data
            
            // SECURITY CHECK: Immediately reject if the user is not an admin
            if (user.role !== 'admin') {
                alert('ACCESS DENIED: You do not have permission to access the administrative panel.')
                return
            }

            localStorage.setItem('shahi_token', token) // Saving the token
            localStorage.setItem('shahi_role', user.role) // Saving the role
            
            setToken(token) 
            setUserRole(user.role)
        } catch (err) {
            alert('Security Error: ' + (err.response?.data?.message || 'Check your credentials.'))
        }
    }

    // LOGOUT ACTION: Wipes all session data
    const handleLogout = () => {
        localStorage.removeItem('shahi_token')
        localStorage.removeItem('shahi_role')
        setToken(null)
        setUserRole(null)
    }

    // ADD PROJECT: Sends new architectural data to your database
    const handleAddProject = async (e) => {
        e.preventDefault()
        try {
            await axios.post(`${API}/projects`, newProject, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setNewProject({ name: '', location: '', image: '', id: '' }) // Resetting the form
            fetchData() 
        } catch (err) {
            alert('Drafting Error: Failed to publish project.')
        }
    }

    // DELETE ACTION: Removes projects, inquiries, or loyalty members from the database
    const handleDelete = async (id) => {
        if (!window.confirm('IRREVERSIBLE: Confirmed deletion from Database?')) return
        try {
            const endpoint = view === 'projects' ? '/projects' : view === 'inquiries' ? '/inquiries' : '/loyalty'
            await axios.delete(`${API}${endpoint}/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            fetchData()
        } catch (err) {
            alert('Process Error: Delete Failed')
        }
    }

    // GHOST MODE: If IP is unauthorized, show a standard 404
    if (!checkingIP && !isAuthorized) {
        return (
            <div className="min-h-screen bg-paper flex flex-col items-center justify-center p-6 text-center">
                <h1 className="text-9xl font-bold tracking-tighter text-ink/5 italic">404.</h1>
                <p className="text-[10px] uppercase tracking-[0.6em] text-ink/40 font-bold -mt-8">Page Not Found</p>
                <a href="/" className="mt-20 text-[8px] uppercase tracking-[0.4em] font-bold text-gold border-b border-gold pb-1 hover:text-ink hover:border-ink transition-all">Return to Entry</a>
            </div>
        )
    }

    // CONDITIONAL RENDER: If not logged in, show the minimalist login gate
    if (!token) {
        return (
            <div className="min-h-screen bg-paper flex items-center justify-center p-6 sm:p-12">
                <div className="w-full max-w-sm border border-ink/5 p-8 sm:p-12 bg-white shadow-2xl relative">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gold"></div>
                    <h2 className="text-xl font-bold uppercase tracking-[0.4em] mb-12 text-ink text-center underline decoration-gold/20 underline-offset-8">Admin Access</h2>
                    <form onSubmit={handleLogin} className="flex flex-col gap-8">
                        <input 
                            type="email" 
                            placeholder="EMAIL" 
                            className="bg-transparent border-b border-ink/10 py-3 text-xs font-bold tracking-widest outline-none focus:border-gold transition-colors"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <input 
                            type="password" 
                            placeholder="PASSWORD" 
                            className="bg-transparent border-b border-ink/10 py-3 text-xs font-bold tracking-widest outline-none focus:border-gold transition-colors"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <button className="bg-ink text-white py-4 font-bold uppercase text-[9px] tracking-[0.5em] hover:bg-gold transition-all duration-500 shadow-lg">
                            Enter Dashboard
                        </button>
                    </form>
                </div>
            </div>
        )
    }

    // SECURITY FALLBACK: If a token exists but the role is wrong, block the view
    if (userRole !== 'admin') {
        return (
            <div className="min-h-screen bg-paper flex items-center justify-center">
                <div className="text-center p-20 border border-ink/5 bg-white shadow-xl">
                    <h1 className="text-xl font-bold uppercase tracking-[0.5em] text-red-500 mb-6">Restricted Access</h1>
                    <p className="text-[10px] font-bold tracking-widest text-ink/40 uppercase mb-10">You do not have the necessary permissions to view this system.</p>
                    <button onClick={handleLogout} className="px-8 py-3 bg-ink text-white text-[9px] font-bold uppercase tracking-widest">Return to Safety</button>
                </div>
            </div>
        )
    }

    // MAIN RENDER: The Architectural Command Centre (Admin Only)
    return (
        <div className="min-h-screen bg-paper flex flex-col selection:bg-gold selection:text-white">
            {/* NAVIGATION HEADER */}
            <div className="flex flex-col sm:flex-row justify-between items-center px-6 sm:px-12 py-6 sm:py-8 border-b border-ink/5 bg-white gap-6 shadow-sm">
                <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
                    <h1 className="text-[10px] font-bold tracking-[0.6em] uppercase text-ink underline decoration-gold underline-offset-4 select-none">Admin / Shahi Studio</h1>
                    <div className="flex gap-8">
                        <button
                            onClick={() => setView('projects')}
                            className={`text-[9px] font-bold tracking-[0.2em] uppercase transition-all ${view === 'projects' ? 'text-ink border-b-2 border-gold pb-1' : 'text-ink/30'}`}
                        >
                            Global Works
                        </button>
                        <button
                            onClick={() => setView('inquiries')}
                            className={`text-[9px] font-bold tracking-[0.2em] uppercase transition-all ${view === 'inquiries' ? 'text-ink border-b-2 border-gold pb-1' : 'text-ink/30'}`}
                        >
                            Client Inquiries
                        </button>
                        <button
                            onClick={() => setView('loyalty')}
                            className={`text-[9px] font-bold tracking-[0.2em] uppercase transition-all ${view === 'loyalty' ? 'text-ink border-b-2 border-gold pb-1' : 'text-ink/30'}`}
                        >
                            The Circle
                        </button>
                    </div>
                </div>
                <button onClick={handleLogout} className="text-[9px] font-bold tracking-widest uppercase text-ink/40 hover:text-red-500 transition-colors">Terminate Session</button>
            </div>

            <main className="p-6 sm:p-12 flex-1">
                {view === 'loyalty' ? (
                    /* ── LOYALTY ROSTER ── */
                    <div className="max-w-6xl mx-auto">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-[10px] font-bold tracking-[0.3em] uppercase text-ink">Circle Roster</h3>
                            <span className="text-[9px] font-mono text-ink/40 uppercase font-bold">({data.length} Members Enrolled)</span>
                        </div>
                        {loading ? (
                            <div className="text-[9px] uppercase font-mono animate-pulse text-ink/30">Synchronizing Circle Data...</div>
                        ) : data.length === 0 ? (
                            <div className="text-[9px] uppercase font-mono text-ink/20 p-20 text-center border border-ink/5">No members yet.</div>
                        ) : (
                            <div className="space-y-3">
                                {data.map(m => {
                                    const tier = m.tier || 'ASSOCIATE'
                                    const tierColor = tier === 'LAUREATE' || tier === 'PATRON' ? 'text-gold' : 'text-ink/50'
                                    const tierBadge = tier === 'LAUREATE' ? 'bg-gold text-white' : tier === 'PATRON' ? 'bg-gold/10 text-gold' : tier === 'FELLOW' ? 'bg-ink/10 text-ink' : 'bg-paper-dim text-ink/40'
                                    const state = awardState[m._id] || {}
                                    return (
                                        <div key={m._id} className="border border-ink/5 bg-white shadow-sm hover:border-gold/40 transition-all duration-500 group">
                                            {/* Member summary row */}
                                            <div className="flex flex-wrap items-center gap-4 p-6">
                                                {/* Tier Badge */}
                                                <span className={`text-[7px] font-bold tracking-[0.5em] uppercase px-3 py-1 flex-shrink-0 ${tierBadge}`}>{tier}</span>
                                                {/* Name / Email */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-[10px] font-bold uppercase tracking-widest text-ink truncate">{m.name}</div>
                                                    <div className="text-[8px] font-mono text-ink/40">{m.email}</div>
                                                </div>
                                                {/* Stats */}
                                                <div className="flex gap-6 text-center flex-shrink-0">
                                                    <div>
                                                        <div className="text-[7px] uppercase tracking-widest text-ink/30 font-bold">Points</div>
                                                        <div className={`text-sm font-bold tracking-tighter ${tierColor}`}>{m.points}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[7px] uppercase tracking-widest text-ink/30 font-bold">Projects</div>
                                                        <div className="text-sm font-bold tracking-tighter text-ink">{m.projectsCompleted}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[7px] uppercase tracking-widest text-ink/30 font-bold">Referrals</div>
                                                        <div className="text-sm font-bold tracking-tighter text-ink">{m.referrals}</div>
                                                    </div>
                                                </div>
                                                {/* Award inline form */}
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        placeholder="PTS"
                                                        className="w-16 bg-transparent border-b border-ink/10 py-1 text-[9px] font-bold outline-none focus:border-gold transition-colors text-center"
                                                        value={state.points || ''}
                                                        onChange={e => setAwardState(prev => ({ ...prev, [m._id]: { ...state, points: e.target.value } }))}
                                                    />
                                                    <label className="flex items-center gap-1 cursor-pointer text-[8px] font-bold uppercase tracking-wider text-ink/40">
                                                        <input
                                                            type="checkbox"
                                                            className="accent-gold"
                                                            checked={state.projectCompleted || false}
                                                            onChange={e => setAwardState(prev => ({ ...prev, [m._id]: { ...state, projectCompleted: e.target.checked } }))}
                                                        />
                                                        +Proj
                                                    </label>
                                                    <button
                                                        onClick={() => handleAward(m._id)}
                                                        className="text-[8px] font-bold uppercase tracking-widest px-3 py-1 bg-ink text-white hover:bg-gold transition-all"
                                                    >
                                                        {awardStatus[m._id] === 'success' ? '✓' : awardStatus[m._id] === 'error' ? '✗' : 'Award'}
                                                    </button>
                                                </div>
                                                {/* Delete */}
                                                <button
                                                    onClick={() => handleDelete(m._id)}
                                                    className="sm:opacity-0 group-hover:opacity-100 text-[9px] font-bold text-red-500/40 hover:text-red-500 uppercase tracking-widest transition-all"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                ) : view === 'projects' ? (
                    <div className="max-w-6xl mx-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                            {/* PROJECT FORM: Interactive drafting form */}
                            <div className="lg:col-span-4 border border-ink/5 p-8 sm:p-10 bg-white shadow-sm h-fit sticky top-12">
                                <h3 className="text-[10px] font-bold tracking-[0.3em] uppercase mb-8 border-b border-ink/5 pb-4">Add New Project</h3>
                                <form onSubmit={handleAddProject} className="flex flex-col gap-6">
                                    <input type="text" placeholder="ID (e.g. 05)" className="bg-transparent border-b border-ink/5 py-3 text-[10px] font-bold outline-none focus:border-gold transition-colors" value={newProject.id} onChange={e => setNewProject({...newProject, id: e.target.value})} />
                                    <input type="text" placeholder="NAME" className="bg-transparent border-b border-ink/5 py-3 text-[10px] font-bold outline-none focus:border-gold transition-colors" value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} />
                                    <input type="text" placeholder="LOCATION" className="bg-transparent border-b border-ink/5 py-3 text-[10px] font-bold outline-none focus:border-gold transition-colors" value={newProject.location} onChange={e => setNewProject({...newProject, location: e.target.value})} />
                                    <input type="text" placeholder="IMAGE URL" className="bg-transparent border-b border-ink/5 py-3 text-[10px] font-bold outline-none focus:border-gold transition-colors" value={newProject.image} onChange={e => setNewProject({...newProject, image: e.target.value})} />
                                    <button className="bg-ink text-white py-4 text-[9px] font-bold uppercase tracking-[0.5em] mt-4 hover:bg-gold transition-all duration-500">Publish to Live Gallery</button>
                                </form>
                            </div>

                            {/* PROJECT LIST: Real-time mirror of the website gallery */}
                            <div className="lg:col-span-8 space-y-4">
                                {loading ? <div className="text-[9px] uppercase font-mono animate-pulse text-ink/30">Synchronizing Local Data...</div> : (
                                    data.map(p => (
                                        <div key={p._id} className="flex flex-col sm:flex-row justify-between items-center p-6 border border-ink/5 bg-white group hover:border-gold transition-all duration-500 gap-6 shadow-sm">
                                            <div className="flex gap-6 items-center w-full">
                                                <img src={p.image} className="w-16 h-16 object-cover bg-paper grayscale border border-ink/5 transition-all group-hover:grayscale-0" alt={p.name} />
                                                <div>
                                                    <span className="text-[8px] font-mono text-ink/40 uppercase tracking-widest">{p.id} / ARCHIVE</span>
                                                    <h4 className="text-xs font-bold uppercase tracking-widest text-ink">{p.name}</h4>
                                                    <p className="text-[9px] text-ink/40 uppercase font-bold tracking-tighter">{p.location}</p>
                                                </div>
                                            </div>
                                            <button onClick={() => handleDelete(p._id)} className="sm:opacity-0 group-hover:opacity-100 text-[9px] font-bold text-red-500/50 hover:text-red-500 uppercase tracking-widest transition-all">Remove</button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* ── INQUIRY TABLE ── */
                    <div className="max-w-6xl mx-auto bg-white border border-ink/5 shadow-sm overflow-hidden">
                        {/* INQUIRY VIEWER: Precision table for lead monitoring */}
                        <div className="p-8 border-b border-ink/5 flex justify-between items-center bg-paper-dim/30">
                            <h3 className="text-[10px] font-bold tracking-[0.3em] uppercase text-ink">Inbound Client Leads</h3>
                            <span className="text-[9px] font-mono text-ink/40 uppercase font-bold">({data.length} Submissions Logged)</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left min-w-[600px]">
                                <thead className="text-[8px] font-bold uppercase tracking-[0.5em] text-ink/40 bg-paper-dim/10">
                                    <tr>
                                        <th className="p-6">Client Identity</th>
                                        <th className="p-6">Program</th>
                                        <th className="p-6">Vision</th>
                                        <th className="p-6">Log Date</th>
                                        <th className="p-6 text-right">Delete</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[10px] text-ink/80 divide-y divide-ink/5 font-medium">
                                    {data.map(i => (
                                        <tr key={i._id} className="hover:bg-paper-dim/10 transition-colors">
                                            <td className="p-6">
                                                <div className="font-bold uppercase tracking-widest text-ink">{i.name}</div>
                                                <div className="text-[8px] lowercase text-ink/40 font-mono tracking-tighter">{i.email}</div>
                                            </td>
                                            <td className="p-6 font-bold uppercase tracking-tighter text-ink/60">{i.projectType}</td>
                                            <td className="p-6 max-w-xs truncate opacity-70 italic text-[9px]">{i.message}</td>
                                            <td className="p-6 font-mono opacity-50 text-[8px]">{new Date(i.createdAt).toLocaleDateString()}</td>
                                            <td className="p-6 text-right">
                                                <button onClick={() => handleDelete(i._id)} className="text-red-500/40 hover:text-red-500 font-bold uppercase tracking-widest transition-colors">Remove Record</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}
