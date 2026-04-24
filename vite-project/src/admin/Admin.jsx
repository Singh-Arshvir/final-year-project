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
    const [selectedFile, setSelectedFile] = useState(null) // STATE: File picker selection

    // STATE: For awarding loyalty points
    const [awardState, setAwardState] = useState({}) // { [memberId]: { points: '', projectCompleted: false } }
    const [awardStatus, setAwardStatus] = useState({}) // { [memberId]: 'success' | 'error' }
    const [uploadingFile, setUploadingFile] = useState({}) // { [memberId]: boolean }
    




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

    // FILE UPLOAD: Attach a document to a loyalty member
    const handleFileUpload = async (memberId, file) => {
        if (!file) return
        setUploadingFile(prev => ({ ...prev, [memberId]: true }))
        try {
            const formData = new FormData()
            formData.append('file', file)
            await axios.post(`${API}/loyalty/${memberId}/files`, formData, {
                headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
            })
            fetchData()
        } catch (err) {
            alert('Transfer Error: Failed to attach file to member.')
        }
        setUploadingFile(prev => ({ ...prev, [memberId]: false }))
    }

    // FILE DELETE: Remove an attachment from a member
    const handleFileDelete = async (memberId, fileId) => {
        if (!window.confirm('IRREVERSIBLE: Remove this document from client access?')) return
        try {
            await axios.delete(`${API}/loyalty/${memberId}/files/${fileId}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            fetchData()
        } catch (err) {
            alert('Process Error: File removal failed.')
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
            let imageUrl = newProject.image // Fallback to provided URL if any
            
            // If the user actually provided a fresh computer file, upload it to /api/upload first
            if (selectedFile) {
                const formData = new FormData()
                formData.append('image', selectedFile)
                const uploadRes = await axios.post(`${API}/upload`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
                })
                imageUrl = uploadRes.data.imageUrl // The new server address for the file
            }

            await axios.post(`${API}/projects`, { ...newProject, image: imageUrl }, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setNewProject({ name: '', location: '', image: '', id: '' }) // Resetting the form
            setSelectedFile(null)
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

    // CSV REPORT LOGIC: Convert active data payload into a browser downloadable file
    const downloadCSV = (dataToExport, filename) => {
        if (!dataToExport || dataToExport.length === 0) return alert('Archive is empty, nothing to export.')

        // Stripping out mongo ID handles and passwords for privacy
        const headers = Object.keys(dataToExport[0]).filter(key => key !== '__v' && key !== 'password')
        const csvRows = []
        
        // Print column names
        csvRows.push(headers.join(','))
        
        // Map raw data into comma cells
        for (const row of dataToExport) {
            const values = headers.map(header => {
                const escaped = ('' + (row[header] || '')).replace(/"/g, '""')
                return `"${escaped}"`
            })
            csvRows.push(values.join(','))
        }

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a) // Clean up UI tree
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
                        <div className="flex justify-between items-center mb-8 gap-4">
                            <div>
                                <h3 className="text-[10px] font-bold tracking-[0.3em] uppercase text-ink">Circle Roster</h3>
                                <span className="text-[9px] font-mono text-ink/40 uppercase font-bold">({data.length} Members Enrolled)</span>
                            </div>
                            <button onClick={() => downloadCSV(data, 'loyalty_members_roster.csv')} className="text-[8px] font-bold tracking-widest uppercase border border-ink/10 px-4 py-2 hover:bg-ink hover:text-white transition-colors bg-white shadow-sm whitespace-nowrap">Download Report (CSV)</button>
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

                                            {/* File Management Expansion */}
                                            <div className="px-6 pb-6 pt-2 border-t border-ink/[0.02] bg-paper-dim/10">
                                                <div className="flex flex-col gap-4">
                                                    <div className="flex justify-between items-center">
                                                        <h4 className="text-[7px] font-bold uppercase tracking-[0.3em] text-ink/40">Shared Documents & Plans</h4>
                                                        <label className="cursor-pointer">
                                                            <input 
                                                                type="file" 
                                                                className="hidden" 
                                                                onChange={(e) => handleFileUpload(m._id, e.target.files[0])}
                                                                disabled={uploadingFile[m._id]}
                                                            />
                                                            <span className={`text-[7px] font-bold uppercase tracking-widest px-3 py-1 border border-ink/10 hover:bg-ink hover:text-white transition-all ${uploadingFile[m._id] ? 'animate-pulse' : ''}`}>
                                                                {uploadingFile[m._id] ? 'Uploading...' : '+ Attach File'}
                                                            </span>
                                                        </label>
                                                    </div>

                                                    {m.files && m.files.length > 0 ? (
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                            {m.files.map(f => (
                                                                <div key={f._id} className="flex items-center justify-between bg-white border border-ink/5 p-2 px-3 group/file">
                                                                    <div className="flex items-center gap-3 min-w-0">
                                                                        <div className="w-1 h-1 rounded-full bg-gold"></div>
                                                                        <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-[8px] font-bold uppercase tracking-wider text-ink/60 truncate hover:text-gold transition-colors">
                                                                            {f.name}
                                                                        </a>
                                                                    </div>
                                                                    <button 
                                                                        onClick={() => handleFileDelete(m._id, f._id)}
                                                                        className="text-[8px] font-bold text-red-500/20 hover:text-red-500 opacity-0 group-hover/file:opacity-100 transition-all"
                                                                    >
                                                                        ✕
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="text-[7px] uppercase font-bold tracking-widest text-ink/20 py-2">No documents currently shared with this client.</div>
                                                    )}
                                                </div>
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
                                    
                                    <div className="flex flex-col gap-2 mt-2">
                                        <label className="text-[8px] font-bold tracking-[0.3em] uppercase text-ink/40">Upload Project Image</label>
                                        <input type="file" accept="image/*" onChange={e => setSelectedFile(e.target.files[0])} className="text-[10px] file:mr-4 file:py-2 file:px-4 file:border-0 file:text-[9px] file:font-bold file:uppercase file:tracking-widest file:bg-ink/10 file:text-ink hover:file:bg-ink hover:file:text-white transition-all cursor-pointer font-mono text-ink/50" />
                                    </div>

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
                        <div className="p-8 border-b border-ink/5 flex justify-between items-center bg-paper-dim/30 gap-4">
                            <div>
                                <h3 className="text-[10px] font-bold tracking-[0.3em] uppercase text-ink">Inbound Client Leads</h3>
                                <span className="text-[9px] font-mono text-ink/40 uppercase font-bold">({data.length} Submissions Logged)</span>
                            </div>
                            <button onClick={() => downloadCSV(data, 'client_inquiries_report.csv')} className="text-[8px] font-bold tracking-widest uppercase border border-ink/10 px-4 py-2 hover:bg-ink hover:text-white transition-colors bg-white shadow-sm whitespace-nowrap">Download Report (CSV)</button>
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
