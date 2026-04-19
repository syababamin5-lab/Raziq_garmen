/**
 * AppLayout.jsx — Shell utama aplikasi
 * Sidebar kiri (fixed 224px) + Topbar atas + Konten kanan
 */
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-surface flex">
      {/* Sidebar fixed kiri */}
      <Sidebar />

      {/* Area konten: offset kiri 224px (w-56), offset atas 56px (h-14) */}
      <div className="flex-1 ml-56 flex flex-col min-h-screen">
        <Topbar title="The Sartorial Archive" />
        
        <main className="flex-1 mt-14 p-6 bg-surface overflow-auto">
          {/* Outlet diisi oleh halaman aktif (Dashboard, Master, dll) */}
          <Outlet />
        </main>
      </div>
    </div>
  )
}
