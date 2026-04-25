import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    const endpoint = isRegistering ? '/auth/register' : '/auth/login';
    try {
      const res = await axios.post(`${API}${endpoint}`, { email, password });
      const { token, user } = res.data;

      localStorage.setItem('shahi_token', token);
      localStorage.setItem('shahi_role', user.role);

      if (isRegistering) {
        alert('Access Granted: Welcome to the Shahi Studio ecosystem.');
      }
      
      navigate('/admin');
    } catch (err) {
      alert('Security Protocol Failed: ' + (err.response?.data?.message || 'Verification Error'));
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-6 sm:p-12 relative overflow-hidden architectural-grid">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-gold/5 blur-[120px] rounded-full animate-float"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-ink/5 blur-[100px] rounded-full"></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[450px] glass p-10 sm:p-16 relative z-10 border-ink/5 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)]"
      >
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gold shadow-[0_0_15px_rgba(179,139,31,0.3)]"></div>
        
        <div className="mb-12 text-center">
            <span className="text-[8px] font-mono text-ink/30 block tracking-[0.6em] mb-4 uppercase">Portal Access</span>
            <h2 className="text-2xl font-bold uppercase tracking-[0.4em] text-ink italic">
              {isRegistering ? 'Draft Account' : 'Authenticate'}
            </h2>
        </div>

        <form onSubmit={handleAuth} className="flex flex-col gap-10">
          <div className="relative group">
            <input
              type="email"
              placeholder=" "
              className="peer w-full bg-transparent border-b border-ink/10 py-3 text-sm font-bold tracking-widest outline-none focus:border-gold transition-all duration-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <label className="absolute left-0 top-3 text-[10px] font-bold tracking-[0.3em] uppercase text-ink/30 pointer-events-none transition-all duration-500 peer-focus:-top-4 peer-focus:text-gold peer-[:not(:placeholder-shown)]:-top-4 peer-[:not(:placeholder-shown)]:text-gold">
              Email Address
            </label>
          </div>

          <div className="relative group">
            <input
              type="password"
              placeholder=" "
              className="peer w-full bg-transparent border-b border-ink/10 py-3 text-sm font-bold tracking-widest outline-none focus:border-gold transition-all duration-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <label className="absolute left-0 top-3 text-[10px] font-bold tracking-[0.3em] uppercase text-ink/30 pointer-events-none transition-all duration-500 peer-focus:-top-4 peer-focus:text-gold peer-[:not(:placeholder-shown)]:-top-4 peer-[:not(:placeholder-shown)]:text-gold">
              Master Key
            </label>
          </div>

          <button 
            disabled={loading}
            className="group relative bg-ink text-white py-5 font-bold uppercase text-[10px] tracking-[0.6em] overflow-hidden transition-all duration-700 shadow-2xl active:scale-95 disabled:opacity-50"
          >
            <span className="relative z-10">{loading ? 'Verifying...' : (isRegistering ? 'Create Profile' : 'Enter Studio')}</span>
            <div className="absolute inset-0 bg-gold translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
          </button>
        </form>

        <button
          onClick={() => setIsRegistering(!isRegistering)}
          className="w-full mt-12 text-[9px] font-bold uppercase tracking-[0.4em] text-ink/40 hover:text-gold transition-all duration-300"
        >
          {isRegistering ? 'Return to authentication' : 'No account? Join the ecosystem'}
        </button>

        <div className="mt-12 pt-8 border-t border-ink/5 flex justify-center gap-6">
            <div className="w-1.5 h-1.5 rounded-full bg-ink/10"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-gold/40 animate-pulse"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-ink/10"></div>
        </div>
      </motion.div>

      {/* Decorative vertical lines */}
      <div className="fixed top-0 left-[20%] w-[1px] h-full bg-ink/[0.02] hidden lg:block"></div>
      <div className="fixed top-0 left-[80%] w-[1px] h-full bg-ink/[0.02] hidden lg:block"></div>
    </div>
  );
}
