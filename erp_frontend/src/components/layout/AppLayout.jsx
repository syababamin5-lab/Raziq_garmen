import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import ChatSystem from '../chat/ChatSystem'
import AIAssistantHub from '../dashboard/AIAssistantHub'
import SubscriptionModal from './SubscriptionModal'
import { getCurrentUser } from '../../api/authApi'

export default function AppLayout() {
  const user = getCurrentUser();
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isChatOpen, setChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(true);

  const getHolidayTheme = () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();

    // Priority 1: Holidays
    if (month === 5 && day === 1) return { id: 'buruh', name: 'Hari Buruh Internasional', color: 'from-red-700 to-slate-900', icon: 'engineering', bg: 'bg-red-500/10' };
    if ((month === 2 && day >= 18) || (month === 3 && day <= 19)) return { id: 'ramadan', name: 'Ramadan Kareem', color: 'from-emerald-900 to-emerald-600', icon: 'dark_mode', bg: 'bg-emerald-500/10' };
    if (month === 3 && day >= 20 && day <= 25) return { id: 'lebaran', name: 'Idul Fitri 1447H', color: 'from-emerald-600 to-yellow-500', icon: 'celebration', bg: 'bg-yellow-500/10' };
    if (month === 8 && day >= 10 && day <= 20) return { id: 'kemerdekaan', name: 'HUT RI 81', color: 'from-red-600 to-white', icon: 'flag', bg: 'bg-red-500/10' };

    // Priority 2: Role-based Premium
    if (user?.role === 'super_admin' || user?.role === 'owner') {
      return { id: 'premium', name: 'PREMIUM EXECUTIVE ACCESS', color: 'from-[#0f172a] via-[#1e293b] to-[#453c15]', icon: 'workspace_premium', bg: 'bg-amber-500/5', border: 'border-amber-500/20' };
    }

    return { id: 'default', name: 'Raziq Garmen ERP', color: 'from-slate-900 to-emerald-900', icon: 'verified_user', bg: 'bg-emerald-500/5' };
  };

  const theme = getHolidayTheme();

  return (
    <div className="min-h-screen flex overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onOpenProfile={() => setShowProfileModal(true)} />
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${isSidebarOpen ? 'ml-64' : 'ml-0 md:ml-20'}`}>
        <Topbar title="Raziq Garment | Enterprise" onToggleSidebar={() => setSidebarOpen(!isSidebarOpen)} isSidebarOpen={isSidebarOpen} onOpenChat={() => setChatOpen(true)} onOpenProfile={() => setShowProfileModal(true)} unreadCount={unreadCount} />
        <ChatSystem isOpen={isChatOpen} onClose={() => setChatOpen(false)} onUnreadUpdate={setUnreadCount} />
        {!isChatOpen && <AIAssistantHub userRole={user?.role} />}
        <main className="flex-1 mt-14 p-10 overflow-auto"><Outlet /></main>
        <footer className="px-10 py-6 border-t border-slate-100 bg-white flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-200 group-hover:bg-emerald-50 transition-colors"><img src="/logo_ansa.png" alt="ANSA Logo" className="h-5 w-5 object-contain" /></div>
            <div className="flex flex-col"><p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] leading-none">Developed by</p><p className="text-slate-900 text-xs font-black tracking-tighter">ANSA <span className="text-emerald-600">ENTERPRISE</span></p></div>
          </div>
          <div className="flex flex-col items-end gap-1"><p className="text-slate-400 text-[10px] font-bold tracking-widest uppercase">&copy; {new Date().getFullYear()} Raziq Garmen</p><p className="text-slate-300 text-[8px] font-medium tracking-tight">Sistem Informasi Manajemen Produksi & Keuangan Terintegrasi</p></div>
        </footer>
      </div>

      {showProfileModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 slide-in-from-bottom-8 duration-500">
                <div className={`p-8 pb-16 text-white relative bg-gradient-to-br ${theme.color}`}>
                    <div className="absolute top-0 right-0 p-6 opacity-20 rotate-12"><span className="material-symbols-rounded text-9xl">{theme.icon}</span></div>
                    <div className="relative z-10 flex flex-col items-center">
                        <div className={`w-24 h-24 rounded-3xl overflow-hidden border-4 shadow-2xl mb-4 bg-white/20 backdrop-blur-md ${theme.id === 'premium' ? 'border-amber-400/50' : 'border-white/30'}`}>
                             {(user?.foto_base64 || user?.foto_url) ? (
                                <img src={user.foto_base64 || (user.foto_url.startsWith('data:') ? user.foto_url : `http://localhost:5000/uploads/${user.foto_url}`)} className="w-full h-full object-cover" alt="" />
                             ) : (
                                <div className="w-full h-full flex items-center justify-center text-3xl font-black">{user?.nama_lengkap?.charAt(0)}</div>
                             )}
                        </div>
                        <h2 className="text-2xl font-black tracking-tight">{user?.nama_lengkap}</h2>
                        <div className={`px-3 py-1 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-[0.2em] mt-2 border ${theme.id === 'premium' ? 'bg-amber-500/20 border-amber-500/30 text-amber-200' : 'bg-white/20 border-white/20 text-white'}`}>
                            {user?.role?.replace('_', ' ')}
                        </div>
                    </div>
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2 border border-slate-100 whitespace-nowrap">
                        <span className={`material-symbols-rounded text-[20px] ${theme.id === 'premium' ? 'text-amber-500' : theme.id === 'default' ? 'text-emerald-600' : 'text-red-600 animate-pulse'}`}>{theme.icon}</span>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${theme.id === 'premium' ? 'text-amber-600' : 'text-slate-800'}`}>{theme.name}</p>
                    </div>
                </div>
                <div className="p-8 pt-12 space-y-6 bg-white">
                    <div className="grid grid-cols-2 gap-4">
                        <div className={`p-4 rounded-2xl border ${theme.bg} ${theme.border || 'border-slate-100'}`}>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Username</p>
                            <p className="text-sm font-bold text-slate-800">@{user?.username || 'user'}</p>
                        </div>
                        <div className={`p-4 rounded-2xl border ${theme.bg} ${theme.border || 'border-slate-100'}`}>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Status Akun</p>
                            <div className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full animate-pulse ${theme.id === 'premium' ? 'bg-amber-500' : 'bg-emerald-500'}`}></span><p className={`text-sm font-bold ${theme.id === 'premium' ? 'text-amber-700' : 'text-emerald-700'}`}>Aktif</p></div>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Informasi Pekerjaan</p>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                            <div className="flex items-center gap-3"><span className="material-symbols-rounded text-slate-400 text-[18px]">verified_user</span><p className="text-xs font-bold text-slate-700">Hak Akses: <span className={`${theme.id === 'premium' ? 'text-amber-600' : 'text-emerald-700'} uppercase`}>{user?.role}</span></p></div>
                            <div className="flex items-center gap-3"><span className="material-symbols-rounded text-slate-400 text-[18px]">apartment</span><p className="text-xs font-bold text-slate-700">Divisi: <span className="text-slate-500">Internal Management</span></p></div>
                        </div>
                    </div>
                    <div className="pt-4 grid grid-cols-2 gap-4">
                        <button onClick={() => { setShowProfileModal(false); window.location.href = '/profile'; }} className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 shadow-sm ${theme.id === 'premium' ? 'bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-900 hover:text-white'}`}><span className="material-symbols-rounded text-[18px]">manage_accounts</span>Setting</button>
                        <button onClick={() => { if (window.confirm("Yakin ingin keluar?")) { localStorage.clear(); window.location.href = '/login'; }}} className="flex items-center justify-center gap-2 py-3.5 bg-red-50 text-red-600 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all active:scale-95 shadow-sm"><span className="material-symbols-rounded text-[18px]">logout</span>Logout</button>
                    </div>
                </div>
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-center"><button onClick={() => setShowProfileModal(false)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-800 transition-colors">Tutup Jendela Detail</button></div>
            </div>
        </div>
      )}

      <SubscriptionModal 
        isOpen={showSubscriptionModal} 
        onClose={() => setShowSubscriptionModal(false)} 
      />
    </div>
  )
}
