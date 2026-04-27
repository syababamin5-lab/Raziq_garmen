import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/authApi';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await login(username, password);
      if (res.user && res.user.error) {
        setError(res.user.error);
      } else if (res.access_token) {
        localStorage.setItem('token', res.access_token);
        localStorage.setItem('user', JSON.stringify(res.user));
        
        // Setup default auth header if you want, but api.js interceptor might be better.
        // Or just redirect and let the app reload state.
        window.location.href = '/'; 
      } else {
        setError('Respons tidak valid dari server.');
      }
    } catch (err) {
      setError('Terjadi kesalahan jaringan atau server mati.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-[2.5rem] p-10 shadow-[0_20px_60px_rgba(0,0,0,0.05)] border border-slate-100">
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 bg-[#064E3B] rounded-3xl flex items-center justify-center shadow-xl shadow-emerald-900/20 rotate-3 hover:rotate-0 transition-all duration-300">
            <span className="material-symbols-rounded text-white text-4xl">checkroom</span>
          </div>
        </div>
        
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black text-slate-800 tracking-tighter font-outfit mb-2">Raziq Garment</h1>
          <p className="text-slate-500 font-medium text-sm">ERP System Enterprise</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-6 text-sm font-bold flex items-center gap-2 border border-red-100">
            <span className="material-symbols-rounded text-lg">error</span>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest pl-2 mb-2">Username</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-rounded text-slate-400">person</span>
              <input 
                type="text" 
                required
                className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 font-bold text-slate-800 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none"
                placeholder="Masukkan username"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest pl-2 mb-2">Password</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-rounded text-slate-400">lock</span>
              <input 
                type="password" 
                required
                className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 font-bold text-slate-800 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#064E3B] text-white rounded-2xl py-4 font-black tracking-widest text-sm hover:bg-black transition-all duration-300 shadow-xl shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="material-symbols-rounded animate-spin">refresh</span>
            ) : (
              <>LOGIN <span className="material-symbols-rounded text-lg">arrow_forward</span></>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-xs font-medium text-slate-400">
          <p>Login sebagai: <span className="font-bold text-slate-600">superadmin / admin / user / bos</span></p>
          <p className="mt-1">Password default: <span className="font-bold text-slate-600">admin123</span> (bos123, user123)</p>
        </div>
      </div>
    </div>
  );
}
