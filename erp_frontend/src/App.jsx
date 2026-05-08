import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import React, { useEffect } from 'react'
import AppLayout from './components/layout/AppLayout'
import api from './api/api'
import Dashboard from './pages/Dashboard'
import Produksi from './pages/Produksi'
import MasterData from './pages/MasterData'
import PembelianBiaya from './pages/PembelianBiaya'
import PenjualanRetur from './pages/PenjualanRetur'
import KasPiutang from './pages/KasPiutang'
import LaporanKeuangan from './pages/LaporanKeuangan'
import KasbonKaryawan from './pages/KasbonKaryawan'
import RiwayatEdit from './pages/RiwayatEdit'
import SettingsUsers from './pages/SettingsUsers'
import SettingsCompany from './pages/SettingsCompany'
import Profile from './pages/Profile'
import Login from './pages/Login'
import SuperAdmin from './pages/SuperAdmin'
import CuttingInputMobile from './pages/mobile/CuttingInput'
import InstallPage from './pages/mobile/InstallPage'
import { getCurrentUser } from './api/authApi'

const ProtectedRoute = ({ children }) => {
  const user = getCurrentUser();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};


function App() {
  // ── Global Mouse Move for Background Spotlight ──────────
  useEffect(() => {
    const handleMove = (e) => {
      document.documentElement.style.setProperty('--x', `${e.clientX}px`);
      document.documentElement.style.setProperty('--y', `${e.clientY}px`);
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Route khusus Mobile (Tanpa Sidebar Desktop) */}
        <Route path="/install-app" element={<InstallPage />} />
        <Route path="/m/cutting" element={<ProtectedRoute><CuttingInputMobile /></ProtectedRoute>} />

        <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="produksi" element={<Produksi />} />
          <Route path="master" element={<MasterData />} />
          <Route path="pembelian" element={<PembelianBiaya />} />
          <Route path="penjualan" element={<PenjualanRetur />} />
          <Route path="kas" element={<KasPiutang />} />
          <Route path="laporan" element={<LaporanKeuangan />} />
          <Route path="kasbon" element={<KasbonKaryawan />} />
          <Route path="riwayat" element={<RiwayatEdit />} />
          <Route path="settings/users" element={<SettingsUsers />} />
          <Route path="settings/company" element={<SettingsCompany />} />
          <Route path="profile" element={<Profile />} />
          <Route path="super-admin" element={<SuperAdmin />} />
          <Route path="*" element={<div className="p-10 text-center text-slate-500 font-bold uppercase tracking-widest opacity-30">Halaman sedang dalam pengembangan...</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
