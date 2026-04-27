import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function AppLayout() {
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden">
      {/* Sidebar Component */}
      <Sidebar isOpen={isSidebarOpen} />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${isSidebarOpen ? 'ml-56' : 'ml-0 md:ml-20'}`}>
        <Topbar 
            title="Raziq Garment | Enterprise" 
            onToggleSidebar={() => setSidebarOpen(!isSidebarOpen)} 
            isSidebarOpen={isSidebarOpen}
        />
        
        <main className="flex-1 mt-14 p-6 bg-slate-50 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
