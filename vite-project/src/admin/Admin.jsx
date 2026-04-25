import React, { useState, useEffect } from 'react' // React primitives for state and lifecycle
import axios from 'axios' // Networking library for making API requests to your backend

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api' // The base URL for your Shahi Architects backend server

export default function Admin() {
    // STATE: Controlling what the admin sees
    const [token, setToken] = useState(localStorage.getItem('shahi_token')) // Persisted login 'passport'
    const [userRole, setUserRole] = useState(localStorage.getItem('shahi_role')) // User role from login
    const [view, setView] = useState('projects') // View toggle: 'projects', 'inquiries', or 'loyalty'
    const [data, setData] = useState([]) // Container for projects or enquiries fetched from DB
    const [loading, setLoading] = useState(false) // Spinner state for when data is being fetched

    // STATE: For adding a brand new project
    const [newProject, setNewProject] = useState({ name: '', location: '', image: '', id: '' })
    const [selectedFile, setSelectedFile] = useState(null) // STATE: File picker selection
    const [isPublishing, setIsPublishing] = useState(false) // Progress indicator for new project

    // STATE: For awarding loyalty points
    const [awardState, setAwardState] = useState({}) // { [memberId]: { points: '', projectCompleted: false } }
    const [awardStatus, setAwardStatus] = useState({}) // { [memberId]: 'success' | 'error' }
    const [uploadingFile, setUploadingFile] = useState({}) // { [memberId]: boolean }

    // LIFECYCLE: Automatically fetch data whenever the view (Projects/Inquiries) changes
    useEffect(() => {
        if (token && (userRole === 'admin' || userRole === 'manager')) {
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
            alert('Award Failure: ' + (err.response?.data?.message || 'Access Denied'))
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
            alert('Transfer Error: ' + (err.response?.data?.message || 'Failed to attach file.'))
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
            alert('Process Error: ' + (err.response?.data?.message || 'Removal failed.'))
        }
    }

    // LOGOUT ACTION: Wipes all session data
    const handleLogout = () => {
        localStorage.removeItem('shahi_token')
        localStorage.removeItem('shahi_role')
        setToken(null)
        setUserRole(null)
        window.location.href = '/login' // Force redirect to login
    }

    // ADD PROJECT: Sends new architectural data to your database
    const handleAddProject = async (e) => {
        e.preventDefault()
        if (!newProject.name || (!selectedFile && !newProject.image)) {
            return alert('Incomplete Data: Title and Image are required.')
        }

        setIsPublishing(true)
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
            alert('Success: Project published to gallery.')
        } catch (err) {
            console.error('Project Upload Error:', err)
            const errorMsg = err.response?.data?.message || err.message || 'Unknown Server Error'
            alert('Drafting Error: ' + errorMsg)
        }
        setIsPublishing(false)
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
            alert('Process Error: ' + (err.response?.data?.message || 'Delete Failed'))
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

    // MAIN RENDER: The Architectural Command Centre (Admin/Manager Dashboard)
    return (
        <div className="min-h-screen bg-paper flex flex-col selection:bg-gold selection:text-white">
            {/* NAVIGATION HEADER */}
            <div className="flex flex-col sm:flex-row justify-between items-center px-6 sm:px-12 py-6 sm:py-8 border-b border-ink/5 bg-white/80 backdrop-blur-md sticky top-0 z-50 gap-6 shadow-sm">
                <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
                    <h1 className="text-[10px] font-bold tracking-[0.6em] uppercase text-ink underline decoration-gold underline-offset-4 select-none">Dashboard / Shahi Studio</h1>
                    <div className="flex gap-8">
                        <button
                            onClick={() => setView('projects')}
                            className={`text-[9px] font-bold tracking-[0.2em] uppercase transition-all duration-300 ${view === 'projects' ? 'text-ink border-b-2 border-gold pb-1' : 'text-ink/30 hover:text-ink/60'}`}
                        >
                            Global Works
                        </button>
                        <button
                            onClick={() => setView('inquiries')}
                            className={`text-[9px] font-bold tracking-[0.2em] uppercase transition-all duration-300 ${view === 'inquiries' ? 'text-ink border-b-2 border-gold pb-1' : 'text-ink/30 hover:text-ink/60'}`}
                        >
                            Client Inquiries
                        </button>
                        <button
                            onClick={() => setView('loyalty')}
                            className={`text-[9px] font-bold tracking-[0.2em] uppercase transition-all duration-300 ${view === 'loyalty' ? 'text-ink border-b-2 border-gold pb-1' : 'text-ink/30 hover:text-ink/60'}`}
                        >
                            The Circle
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <span className="text-[8px] font-bold uppercase tracking-widest text-ink/20 hidden sm:block">Role: {userRole}</span>
                    <button onClick={handleLogout} className="text-[9px] font-bold tracking-widest uppercase text-ink/40 hover:text-red-500 transition-colors border border-ink/5 px-4 py-2 hover:bg-red-50">Terminate Session</button>
                </div>
            </div>

            <main className="p-6 sm:p-12 flex-1 animate-fade-up">
                {view === 'loyalty' ? (
                    /* ── LOYALTY ROSTER ── */
                    <div className="max-w-6xl mx-auto">
                        <div className="flex justify-between items-center mb-10 gap-4">
                            <div>
                                <h3 className="text-[11px] font-bold tracking-[0.3em] uppercase text-ink">Circle Roster</h3>
                                <span className="text-[9px] font-mono text-ink/40 uppercase font-bold">({data.length} Members Enrolled)</span>
                            </div>
                            <button onClick={() => downloadCSV(data, 'loyalty_members_roster.csv')} className="text-[8px] font-bold tracking-widest uppercase border border-ink/10 px-6 py-3 hover:bg-ink hover:text-white transition-all bg-white shadow-sm whitespace-nowrap">Download Report (CSV)</button>
                        </div>
                        {loading ? (
                            <div className="text-[9px] uppercase font-mono animate-pulse text-ink/30 flex items-center gap-2"><div className="w-2 h-2 bg-gold rounded-full"></div> Synchronizing Circle Data...</div>
                        ) : data.length === 0 ? (
                            <div className="text-[9px] uppercase font-mono text-ink/20 p-20 text-center border border-ink/5 bg-white">No members yet.</div>
                        ) : (
                            <div className="space-y-4">
                                {data.map((m, idx) => {
                                    const tier = m.tier || 'ASSOCIATE'
                                    const tierColor = tier === 'LAUREATE' || tier === 'PATRON' ? 'text-gold' : 'text-ink/50'
                                    const tierBadge = tier === 'LAUREATE' ? 'bg-gold text-white' : tier === 'PATRON' ? 'bg-gold/10 text-gold' : tier === 'FELLOW' ? 'bg-ink/10 text-ink' : 'bg-paper-dim text-ink/40'
                                    const state = awardState[m._id] || {}
                                    return (
                                        <div key={m._id} style={{ animationDelay: `${idx * 50}ms` }} className="border border-ink/5 bg-white shadow-sm hover:shadow-xl hover:border-gold/40 transition-all duration-700 group animate-fade-up">
                                            {/* Member summary row */}
                                            <div className="flex flex-wrap items-center gap-6 p-6 sm:p-8">
                                                {/* Tier Badge */}
                                                <span className={`text-[7px] font-bold tracking-[0.5em] uppercase px-4 py-1.5 flex-shrink-0 ${tierBadge}`}>{tier}</span>
                                                {/* Name / Email */}
                                                <div className="flex-1 min-w-[200px]">
                                                    <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink truncate mb-1">{m.name}</div>
                                                    <div className="text-[9px] font-mono text-ink/40">{m.email}</div>
                                                </div>
                                                {/* Stats */}
                                                <div className="flex gap-10 text-center flex-shrink-0">
                                                    <div>
                                                        <div className="text-[7px] uppercase tracking-widest text-ink/30 font-bold mb-1">Points</div>
                                                        <div className={`text-base font-bold tracking-tighter ${tierColor}`}>{m.points}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[7px] uppercase tracking-widest text-ink/30 font-bold mb-1">Projects</div>
                                                        <div className="text-base font-bold tracking-tighter text-ink">{m.projectsCompleted}</div>
                                                    </div>
                                                </div>
                                                {/* Award inline form */}
                                                <div className="flex items-center gap-3 flex-shrink-0 bg-paper-dim/30 p-2 rounded-sm">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        placeholder="PTS"
                                                        className="w-16 bg-white border border-ink/5 py-2 text-[9px] font-bold outline-none focus:border-gold transition-colors text-center shadow-inner"
                                                        value={state.points || ''}
                                                        onChange={e => setAwardState(prev => ({ ...prev, [m._id]: { ...state, points: e.target.value } }))}
                                                    />
                                                    <label className="flex items-center gap-2 cursor-pointer text-[8px] font-bold uppercase tracking-wider text-ink/40 hover:text-ink transition-colors">
                                                        <input
                                                            type="checkbox"
                                                            className="accent-gold w-3 h-3"
                                                            checked={state.projectCompleted || false}
                                                            onChange={e => setAwardState(prev => ({ ...prev, [m._id]: { ...state, projectCompleted: e.target.checked } }))}
                                                        />
                                                        +Proj
                                                    </label>
                                                    <button
                                                        onClick={() => handleAward(m._id)}
                                                        className="text-[8px] font-bold uppercase tracking-widest px-4 py-2 bg-ink text-white hover:bg-gold transition-all shadow-md active:scale-95"
                                                    >
                                                        {awardStatus[m._id] === 'success' ? '✓ DONE' : awardStatus[m._id] === 'error' ? '✗ FAIL' : 'Award'}
                                                    </button>
                                                </div>
                                                {/* Delete */}
                                                <button
                                                    onClick={() => handleDelete(m._id)}
                                                    className="sm:opacity-0 group-hover:opacity-100 text-[9px] font-bold text-red-500/40 hover:text-red-500 uppercase tracking-widest transition-all p-2"
                                                >
                                                    Remove
                                                </button>
                                            </div>

                                            {/* File Management Expansion */}
                                            <div className="px-8 pb-8 pt-4 border-t border-ink/[0.03] bg-paper-dim/20">
                                                <div className="flex flex-col gap-6">
                                                    <div className="flex justify-between items-center">
                                                        <h4 className="text-[8px] font-bold uppercase tracking-[0.4em] text-ink/50">Shared Documents & Plans</h4>
                                                        <label className="cursor-pointer">
                                                            <input 
                                                                type="file" 
                                                                className="hidden" 
                                                                onChange={(e) => handleFileUpload(m._id, e.target.files[0])}
                                                                disabled={uploadingFile[m._id]}
                                                            />
                                                            <span className={`text-[8px] font-bold uppercase tracking-widest px-5 py-2 border border-ink/10 bg-white hover:bg-ink hover:text-white transition-all shadow-sm flex items-center gap-2 ${uploadingFile[m._id] ? 'animate-pulse' : ''}`}>
                                                                {uploadingFile[m._id] ? 'Processing...' : '+ Add Document'}
                                                            </span>
                                                        </label>
                                                    </div>

                                                    {m.files && m.files.length > 0 ? (
                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                            {m.files.map(f => (
                                                                <div key={f._id} className="flex items-center justify-between bg-white border border-ink/5 p-3 px-4 shadow-sm group/file hover:border-gold/30 transition-all">
                                                                    <div className="flex items-center gap-4 min-w-0">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-gold/60"></div>
                                                                        <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-[9px] font-bold uppercase tracking-wider text-ink/70 truncate hover:text-gold transition-colors">
                                                                            {f.name}
                                                                        </a>
                                                                    </div>
                                                                    <button 
                                                                        onClick={() => handleFileDelete(m._id, f._id)}
                                                                        className="text-[9px] font-bold text-red-500/30 hover:text-red-500 opacity-0 group-hover/file:opacity-100 transition-all p-1"
                                                                    >
                                                                        ✕
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="text-[8px] uppercase font-bold tracking-[0.2em] text-ink/20 py-4 text-center border border-dashed border-ink/10">No documents shared with this member.</div>
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
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                            {/* PROJECT FORM: Interactive drafting form */}
                            <div className="lg:col-span-4 border border-ink/5 p-8 sm:p-12 bg-white shadow-2xl h-fit sticky top-32">
                                <h3 className="text-[11px] font-bold tracking-[0.4em] uppercase mb-10 border-b border-ink/5 pb-5">Draft New Work</h3>
                                <form onSubmit={handleAddProject} className="flex flex-col gap-8">
                                    <div className="space-y-1">
                                        <label className="text-[7px] font-bold uppercase tracking-[0.3em] text-ink/40">Identifier</label>
                                        <input type="text" placeholder="e.g. 05 / 26" className="w-full bg-transparent border-b border-ink/5 py-3 text-[11px] font-bold outline-none focus:border-gold transition-colors" value={newProject.id} onChange={e => setNewProject({...newProject, id: e.target.value})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[7px] font-bold uppercase tracking-[0.3em] text-ink/40">Project Name</label>
                                        <input type="text" placeholder="RESIDENCE / MUSEUM" className="w-full bg-transparent border-b border-ink/5 py-3 text-[11px] font-bold outline-none focus:border-gold transition-colors" value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[7px] font-bold uppercase tracking-[0.3em] text-ink/40">Location</label>
                                        <input type="text" placeholder="CITY / COORDINATES" className="w-full bg-transparent border-b border-ink/5 py-3 text-[11px] font-bold outline-none focus:border-gold transition-colors" value={newProject.location} onChange={e => setNewProject({...newProject, location: e.target.value})} />
                                    </div>
                                    
                                    <div className="flex flex-col gap-3 mt-2">
                                        <label className="text-[7px] font-bold tracking-[0.4em] uppercase text-ink/40">Primary Visualization</label>
                                        <div className="relative">
                                            <input type="file" accept="image/*" onChange={e => setSelectedFile(e.target.files[0])} className="w-full text-[10px] file:mr-4 file:py-3 file:px-6 file:border-0 file:text-[8px] file:font-bold file:uppercase file:tracking-widest file:bg-paper-dim file:text-ink hover:file:bg-ink hover:file:text-white transition-all cursor-pointer font-mono text-ink/30 border border-ink/[0.03] bg-paper/50" />
                                            {selectedFile && <div className="mt-2 text-[8px] font-bold text-gold uppercase tracking-widest">✓ File Selected: {selectedFile.name}</div>}
                                        </div>
                                    </div>

                                    <button 
                                        disabled={isPublishing}
                                        className={`bg-ink text-white py-5 text-[10px] font-bold uppercase tracking-[0.6em] mt-6 transition-all duration-700 shadow-xl flex items-center justify-center gap-3 ${isPublishing ? 'opacity-50 cursor-wait' : 'hover:bg-gold active:scale-95'}`}
                                    >
                                        {isPublishing ? 'COMMITTING TO GALLERY...' : 'Publish to Live Gallery'}
                                    </button>
                                </form>
                            </div>

                            {/* PROJECT LIST: Real-time mirror of the website gallery */}
                            <div className="lg:col-span-8 space-y-6">
                                {loading ? <div className="text-[9px] uppercase font-mono animate-pulse text-ink/30 flex items-center gap-2"><div className="w-2 h-2 bg-gold rounded-full"></div> Synchronizing Gallery...</div> : (
                                    data.map((p, idx) => (
                                        <div key={p._id} style={{ animationDelay: `${idx * 100}ms` }} className="flex flex-col sm:flex-row justify-between items-center p-8 border border-ink/5 bg-white group hover:border-gold/50 hover:shadow-2xl transition-all duration-700 gap-8 shadow-sm animate-fade-up">
                                            <div className="flex gap-8 items-center w-full">
                                                <div className="relative overflow-hidden w-24 h-24 sm:w-32 sm:h-32 border border-ink/5">
                                                    <img src={p.image} className="w-full h-full object-cover grayscale transition-all duration-1000 group-hover:grayscale-0 group-hover:scale-110" alt={p.name} />
                                                    <div className="absolute inset-0 bg-ink/10 group-hover:bg-transparent transition-colors"></div>
                                                </div>
                                                <div className="flex-1">
                                                    <span className="text-[8px] font-mono text-gold uppercase tracking-[0.3em] font-bold block mb-2">{p.id} / ARCHIVE</span>
                                                    <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-ink mb-1">{p.name}</h4>
                                                    <p className="text-[10px] text-ink/40 uppercase font-bold tracking-widest flex items-center gap-2">
                                                        <span className="w-3 h-[1px] bg-gold/40"></span>
                                                        {p.location}
                                                    </p>
                                                </div>
                                            </div>
                                            <button onClick={() => handleDelete(p._id)} className="sm:opacity-0 group-hover:opacity-100 text-[9px] font-bold text-red-500/30 hover:text-red-500 uppercase tracking-[0.3em] transition-all duration-500 p-2">Remove Project</button>
                                        </div>
                                    ))
                                )}
                                {!loading && data.length === 0 && <div className="text-[10px] uppercase font-bold tracking-widest text-ink/20 py-40 text-center border border-dashed border-ink/10">The gallery is currently empty.</div>}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* ── INQUIRY TABLE ── */
                    <div className="max-w-6xl mx-auto bg-white border border-ink/5 shadow-2xl overflow-hidden animate-fade-up">
                        {/* INQUIRY VIEWER: Precision table for lead monitoring */}
                        <div className="p-10 border-b border-ink/5 flex justify-between items-center bg-paper-dim/30 gap-4">
                            <div>
                                <h3 className="text-[11px] font-bold tracking-[0.4em] uppercase text-ink">Inbound Leads</h3>
                                <span className="text-[9px] font-mono text-ink/40 uppercase font-bold">({data.length} Submissions Logged)</span>
                            </div>
                            <button onClick={() => downloadCSV(data, 'client_inquiries_report.csv')} className="text-[8px] font-bold tracking-widest uppercase border border-ink/10 px-6 py-3 hover:bg-ink hover:text-white transition-all bg-white shadow-sm whitespace-nowrap">Download Report (CSV)</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left min-w-[800px]">
                                <thead className="text-[8px] font-bold uppercase tracking-[0.6em] text-ink/30 bg-paper-dim/10 border-b border-ink/5">
                                    <tr>
                                        <th className="p-8">Client Identity</th>
                                        <th className="p-8">Program</th>
                                        <th className="p-8">Vision</th>
                                        <th className="p-8">Log Date</th>
                                        <th className="p-8 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[10px] text-ink/70 divide-y divide-ink/[0.03] font-medium">
                                    {data.map((i, idx) => (
                                        <tr key={i._id} style={{ animationDelay: `${idx * 50}ms` }} className="hover:bg-paper-dim/30 transition-all duration-500 animate-fade-up">
                                            <td className="p-8">
                                                <div className="font-bold uppercase tracking-[0.2em] text-ink mb-1">{i.name}</div>
                                                <div className="text-[8px] lowercase text-ink/40 font-mono tracking-tighter">{i.email}</div>
                                            </td>
                                            <td className="p-8">
                                                <span className="px-3 py-1 bg-ink/5 text-ink/60 font-bold uppercase text-[7px] tracking-widest">{i.projectType}</span>
                                            </td>
                                            <td className="p-8 max-w-sm">
                                                <div className="opacity-70 italic text-[9px] line-clamp-2 leading-relaxed">"{i.message}"</div>
                                            </td>
                                            <td className="p-8 font-mono opacity-40 text-[8px] font-bold">{new Date(i.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                                            <td className="p-8 text-right">
                                                <button onClick={() => handleDelete(i._id)} className="text-red-500/30 hover:text-red-500 font-bold uppercase tracking-[0.3em] transition-all p-2">Clear</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {!loading && data.length === 0 && <div className="text-[10px] uppercase font-bold tracking-widest text-ink/20 py-40 text-center">No active inquiries at this time.</div>}
                    </div>
                )}
            </main>
        </div>
    )
}
