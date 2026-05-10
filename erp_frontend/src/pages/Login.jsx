import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/authApi';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const navigate = useNavigate();

  // Garment Floating Icons Data
  const icons = [
    { icon: 'content_cut', size: 'text-6xl', top: '15%', left: '10%', delay: '0s', rotate: 'rotate-12' },
    { icon: 'checkroom', size: 'text-8xl', top: '70%', left: '15%', delay: '1s', rotate: '-rotate-12' },
    { icon: 'texture', size: 'text-7xl', top: '20%', left: '80%', delay: '2s', rotate: 'rotate-45' },
    { icon: 'straighten', size: 'text-5xl', top: '80%', left: '85%', delay: '1.5s', rotate: '-rotate-45' },
    { icon: 'apparel', size: 'text-9xl', top: '40%', left: '75%', delay: '0.5s', rotate: 'rotate-12' },
  ];

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

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
        
        // Pengalihan Otomatis Berdasarkan Role
        if (res.user.role === 'cutting') {
          navigate('/m/cutting');
        } else {
          navigate('/');
        }
      } else {
        setError('Respons tidak valid dari server.');
      }
    } catch (err) {
      setError('Terjadi kesalahan jaringan atau server mati.');
    }
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-[#050A15]">

      {/* ── Fabric Texture Overlay ────────────────── */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("https://www.transparenttextures.com/patterns/carbon-fibre.png")` }}></div>

      {/* ── Garment Theme Floating Icons ────────────────── */}
      {icons.map((item, idx) => (
        <div
          key={idx}
          className={`absolute ${item.size} text-emerald-500/10 transition-all duration-1000 ease-out select-none pointer-events-none animate-pulse ${item.rotate}`}
          style={{
            top: item.top,
            left: item.left,
            transform: `translate(${(mousePos.x - window.innerWidth / 2) * (0.02 + idx * 0.01)}px, ${(mousePos.y - window.innerHeight / 2) * (0.02 + idx * 0.01)}px) ${item.rotate}`,
            animationDelay: item.delay
          }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: 'inherit' }}>{item.icon}</span>
        </div>
      ))}

      {/* ── Enhanced Spotlight (More Visible) ────────────────── */}
      <div
        className="fixed inset-0 z-0 pointer-events-none transition-opacity duration-300"
        style={{
          background: `radial-gradient(800px circle at ${mousePos.x}px ${mousePos.y}px, rgba(16, 185, 129, 0.2), transparent 70%)`
        }}
      />

      {/* ── Stitched Circles (Background Decor) ────────────────── */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border-2 border-dashed border-emerald-500/5 rounded-full animate-[spin_60s_linear_infinite]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-dashed border-emerald-500/10 rounded-full animate-[spin_40s_linear_infinite_reverse]" />

      {/* ── Login Card (Stitched Style) ────────────────── */}
      <div className="relative z-10 bg-[#0A1221]/80 backdrop-blur-3xl max-w-md w-full rounded-[3rem] p-12 shadow-[0_0_100px_rgba(16,185,129,0.1)] border-2 border-emerald-500/20 animate-in fade-in zoom-in duration-700">

        {/* Fake Stitching Border */}
        <div className="absolute inset-2 border border-dashed border-emerald-500/10 rounded-[2.5rem] pointer-events-none" />

        <div className="flex justify-center mb-8 relative">
          <div className="absolute -top-4 -right-4 w-12 h-12 bg-emerald-500/20 rounded-full blur-xl animate-ping" />
          <div className="w-24 h-24 bg-gradient-to-br from-[#064E3B] to-[#10B981] rounded-[2rem] flex items-center justify-center shadow-2xl shadow-emerald-500/20 transform hover:scale-110 transition-transform duration-500 cursor-pointer group border-4 border-white/5">
            <span className="material-symbols-rounded text-white text-5xl">checkroom</span>
          </div>
        </div>

        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-white tracking-tighter font-outfit mb-2">Ansa Enterprise</h1>
          <div className="flex items-center justify-center gap-3">
            <div className="h-[1px] w-8 bg-emerald-500/30"></div>
            <p className="text-emerald-400 font-bold text-[10px] tracking-[0.3em] uppercase">Enterprise ERP System</p>
            <div className="h-[1px] w-8 bg-emerald-500/30"></div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 text-red-400 p-4 rounded-2xl mb-6 text-sm font-bold flex items-center gap-2 border border-red-500/20 animate-shake">
            <span className="material-symbols-rounded text-lg">error</span>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-8">
          <div className="group">
            <label className="block text-[10px] font-black text-emerald-500/60 uppercase tracking-[0.25em] pl-4 mb-3 group-focus-within:text-emerald-400 transition-colors">Credential User</label>
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 material-symbols-rounded text-emerald-500/40 group-focus-within:text-emerald-400 transition-all">person</span>
              <input
                type="text"
                required
                className="w-full bg-emerald-500/5 border-2 border-emerald-500/10 rounded-2xl py-5 pl-14 pr-6 font-bold text-white focus:bg-emerald-500/10 focus:border-emerald-500/30 focus:ring-8 focus:ring-emerald-500/5 transition-all outline-none placeholder:text-emerald-500/20"
                placeholder="Username"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div className="group">
            <label className="block text-[10px] font-black text-emerald-500/60 uppercase tracking-[0.25em] pl-4 mb-3 group-focus-within:text-emerald-400 transition-colors">Access Key</label>
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 material-symbols-rounded text-emerald-500/40 group-focus-within:text-emerald-400 transition-all">lock</span>
              <input
                type="password"
                required
                className="w-full bg-emerald-500/5 border-2 border-emerald-500/10 rounded-2xl py-5 pl-14 pr-6 font-bold text-white focus:bg-emerald-500/10 focus:border-emerald-500/30 focus:ring-8 focus:ring-emerald-500/5 transition-all outline-none placeholder:text-emerald-500/20"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 text-white rounded-2xl py-5 font-black tracking-[0.2em] text-sm hover:bg-white hover:text-[#064E3B] transition-all duration-500 shadow-2xl shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-3 relative group overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            {loading ? (
              <span className="material-symbols-rounded animate-spin">refresh</span>
            ) : (
              <>AUTHORIZE ACCESS <span className="material-symbols-rounded text-xl group-hover:translate-x-2 transition-transform">arrow_right_alt</span></>
            )}
          </button>
        </form>

        <div className="mt-12 pt-8 border-t border-emerald-500/10 text-center">
          <div className="inline-block px-4 py-1 rounded-full bg-emerald-500/5 border border-emerald-500/10">
            <p className="text-[9px] font-bold text-emerald-500/50 uppercase tracking-widest">ANSA ENTERPRISE V.2</p>
          </div>
        </div>
      </div>

      {/* ── Floating Thread Line ────────────────── */}
      <div
        className="fixed w-1 h-1 bg-emerald-500 rounded-full pointer-events-none z-[60] shadow-[0_0_15px_#10B981]"
        style={{ left: mousePos.x, top: mousePos.y }}
      />

    </div>
  );
}
