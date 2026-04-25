import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    const endpoint = isRegistering ? '/auth/register' : '/auth/login';
    try {
      const res = await axios.post(`${API}${endpoint}`, { email, password });
      const { token, user } = res.data;

      localStorage.setItem('shahi_token', token);
      localStorage.setItem('shahi_role', user.role);

      if (isRegistering) {
        alert('Success: Welcome to the Shahi Studio ecosystem.');
      }
      
      // Redirect to admin dashboard after successful login
      navigate('/admin');
    } catch (err) {
      alert('Security Error: ' + (err.response?.data?.message || 'Check your credentials.'));
    }
  };

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-6 sm:p-12">
      <div className="w-full max-w-sm border border-ink/5 p-8 sm:p-12 bg-white shadow-2xl relative">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gold"></div>
        <h2 className="text-xl font-bold uppercase tracking-[0.4em] mb-12 text-ink text-center underline decoration-gold/20 underline-offset-8">
          {isRegistering ? 'Create Account' : 'Login'}
        </h2>
        <form onSubmit={handleAuth} className="flex flex-col gap-8">
          <input
            type="email"
            placeholder="EMAIL"
            className="bg-transparent border-b border-ink/10 py-3 text-xs font-bold tracking-widest outline-none focus:border-gold transition-colors"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="PASSWORD"
            className="bg-transparent border-b border-ink/10 py-3 text-xs font-bold tracking-widest outline-none focus:border-gold transition-colors"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button className="bg-ink text-white py-4 font-bold uppercase text-[9px] tracking-[0.5em] hover:bg-gold transition-all duration-500 shadow-lg">
            {isRegistering ? 'Register' : 'Login'}
          </button>
        </form>
        <button
          onClick={() => setIsRegistering(!isRegistering)}
          className="w-full mt-8 text-[8px] font-bold uppercase tracking-[0.3em] text-ink/40 hover:text-ink transition-colors"
        >
          {isRegistering ? 'Already have an account? Login' : 'Need an account? Register'}
        </button>
      </div>
    </div>
  );
}
