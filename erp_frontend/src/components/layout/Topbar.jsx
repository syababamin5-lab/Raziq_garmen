/**
 * Topbar.jsx — Bar navigasi atas (Atelier Emerald Design)
 * Menampilkan judul halaman, tombol toggle sidebar, dan status login.
 */
import React from 'react'
import { getCurrentUser, logout } from '../../api/authApi'
import api, { getFileUrl } from '../../api/api'
import PrayerTimesCompact from './PrayerTimesCompact'
import TransactionNotifications from './TransactionNotifications'

export default function Topbar({ title, onToggleSidebar, isSidebarOpen, onOpenChat, onOpenProfile, onLogout, unreadCount, isMobile }) {
  const user = getCurrentUser();

  return (
    <header className="
      fixed top-0 right-0 h-14 
      bg-white/80 backdrop-blur-md border-b border-slate-200
      flex items-center justify-between px-6 z-40
      transition-all duration-300 ease-in-out
    " style={{ left: isMobile ? '0px' : (isSidebarOpen ? '256px' : '80px') }}>
      
      <div className="flex items-center gap-4">
        {/* Toggle Button */}
        {!isMobile && (
          <button 
              onClick={onToggleSidebar}
              className="w-10 h-10 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-emerald-600 transition-colors"
          >
              <span className="material-symbols-rounded">
                  {isSidebarOpen ? 'menu_open' : 'menu'}
              </span>
          </button>
        )}

        <h2 className="text-slate-800 font-extrabold text-lg tracking-tight uppercase">
          {title}
        </h2>
      </div>

      {/* Middle Section: Prayer Times */}
      <div className="hidden md:flex items-center justify-center flex-1">
        <PrayerTimesCompact />
      </div>

      <div className="flex items-center gap-4">
        <div 
          onClick={onOpenProfile}
          className="flex items-center gap-3 cursor-pointer hover:bg-white/5 p-1.5 rounded-2xl transition-all active:scale-95 group"
        >
          <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 font-black text-sm overflow-hidden shadow-sm group-hover:border-emerald-400 transition-colors">
            {user?.foto_base64 || user?.foto_url ? (
              <img src={user.foto_base64 || getFileUrl(user.foto_url)} className="w-full h-full object-cover" alt="" />
            ) : (
              user?.nama_lengkap?.charAt(0).toUpperCase() || 'S'
            )}
          </div>
          <div className="hidden md:flex flex-col items-end">
            <p className="text-slate-800 font-bold text-xs uppercase tracking-tighter group-hover:text-emerald-600 transition-colors">{user?.nama_lengkap || 'Syabab Amin'}</p>
            <p className="text-slate-400 font-black text-[9px] uppercase tracking-widest">{user?.role?.replace('_', ' ') || 'Administrator'}</p>
          </div>
        </div>

        {/* Notification Bell */}
        <TransactionNotifications userRole={user?.role} />

        {/* Chat Toggle Icon */}
        <div 
          onClick={onOpenChat}
          className="relative w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group cursor-pointer hover:bg-emerald-50 hover:border-emerald-200 transition-all"
          title="Buka Chat Internal"
        >
          <span className="material-symbols-rounded group-hover:text-emerald-600 transition-colors">chat</span>
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white animate-bounce">
              {unreadCount}
            </div>
          )}
        </div>
        
        <div 
          onClick={onLogout || logout}
          className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group cursor-pointer hover:bg-red-50 hover:text-red-600 transition-all"
          title="Logout"
        >
          <span className="material-symbols-rounded group-hover:text-red-500 transition-colors">logout</span>
        </div>
      </div>
    </header>
  )
}
