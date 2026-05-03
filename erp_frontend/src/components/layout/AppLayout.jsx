import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import ChatSystem from '../chat/ChatSystem'
import AIAssistantHub from '../dashboard/AIAssistantHub'
import { getCurrentUser } from '../../api/authApi'

export default function AppLayout() {
  const user = getCurrentUser();
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isChatOpen, setChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden">
      {/* Sidebar Component */}
      <Sidebar isOpen={isSidebarOpen} />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${isSidebarOpen ? 'ml-64' : 'ml-0 md:ml-20'}`}>
        <Topbar 
            title="Raziq Garment | Enterprise" 
            onToggleSidebar={() => setSidebarOpen(!isSidebarOpen)} 
            isSidebarOpen={isSidebarOpen}
            onOpenChat={() => setChatOpen(true)}
            unreadCount={unreadCount}
        />

        <ChatSystem 
            isOpen={isChatOpen} 
            onClose={() => setChatOpen(false)} 
            onUnreadUpdate={setUnreadCount}
        />

        {!isChatOpen && <AIAssistantHub userRole={user?.role} />}
        
        <main className="flex-1 mt-14 p-10 bg-slate-50 overflow-auto">
          <Outlet />
        </main>

        <footer className="px-10 py-6 border-t border-slate-100 bg-white/50 backdrop-blur-sm flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center border border-emerald-100 group-hover:bg-emerald-100 transition-colors">
              <img src="/logo_ansa.png" alt="ANSA Logo" className="h-5 w-5 object-contain" />
            </div>
            <div className="flex flex-col">
              <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] leading-none">
                Developed by
              </p>
              <p className="text-emerald-700 text-xs font-black tracking-tighter">
                ANSA <span className="text-slate-800">ENTERPRISE</span>
              </p>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-1">
            <p className="text-slate-400 text-[10px] font-bold tracking-widest uppercase">
              &copy; {new Date().getFullYear()} Raziq Garmen
            </p>
            <p className="text-slate-300 text-[8px] font-medium tracking-tight">
              Sistem Informasi Manajemen Produksi & Keuangan Terintegrasi
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}
