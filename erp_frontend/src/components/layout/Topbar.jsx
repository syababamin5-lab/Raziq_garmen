/**
 * Topbar.jsx — Bar navigasi atas (Atelier Emerald Design)
 * Menampilkan judul halaman, tombol toggle sidebar, dan status login.
 */
import React from 'react'
import { getCurrentUser, logout } from '../../api/authApi'

export default function Topbar({ title, onToggleSidebar, isSidebarOpen }) {
  const user = getCurrentUser();

  return (
    <header className="
      fixed top-0 right-0 h-14 
      bg-white/80 backdrop-blur-md border-b border-slate-100
      flex items-center justify-between px-6 z-40
      transition-all duration-300 ease-in-out
    " style={{ left: isSidebarOpen ? '256px' : '80px' }}>
      
      <div className="flex items-center gap-4">
        {/* Toggle Button */}
        <button 
            onClick={onToggleSidebar}
            className="w-10 h-10 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"
        >
            <span className="material-symbols-rounded">
                {isSidebarOpen ? 'menu_open' : 'menu'}
            </span>
        </button>

        <h2 className="text-slate-800 font-extrabold text-lg tracking-tight uppercase">
          {title}
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 font-black text-sm overflow-hidden shadow-sm">
            {user?.foto_url ? (
              <img src={`http://${window.location.hostname}:8000${user.foto_url}`} className="w-full h-full object-cover" alt="" />
            ) : (
              user?.nama_lengkap?.charAt(0).toUpperCase() || 'S'
            )}
          </div>
          <div className="hidden md:flex flex-col items-end">
            <p className="text-slate-900 font-bold text-xs uppercase tracking-tighter">{user?.nama_lengkap || 'Syabab Amin'}</p>
            <p className="text-emerald-600 font-black text-[9px] uppercase tracking-widest">{user?.role?.replace('_', ' ') || 'Administrator'}</p>
          </div>
        </div>
        
        <div 
          onClick={logout}
          className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 group cursor-pointer hover:bg-red-50 hover:border-red-200 transition-all"
          title="Logout"
        >
          <span className="material-symbols-rounded group-hover:text-red-600 transition-colors">logout</span>
        </div>
      </div>
    </header>
  )
}
