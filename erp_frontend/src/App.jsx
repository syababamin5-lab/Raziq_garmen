import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import Dashboard from './pages/Dashboard'
import Produksi from './pages/Produksi'
import MasterData from './pages/MasterData'
import PembelianBiaya from './pages/PembelianBiaya'
import PenjualanRetur from './pages/PenjualanRetur'
import KasPiutang from './pages/KasPiutang'
import LaporanKeuangan from './pages/LaporanKeuangan'
import KasbonRiwayat from './pages/KasbonRiwayat'
import SettingsUsers from './pages/SettingsUsers'
import SettingsCompany from './pages/SettingsCompany'
import Profile from './pages/Profile'
import Login from './pages/Login'
import { getCurrentUser } from './api/authApi'

const ProtectedRoute = ({ children }) => {
  const user = getCurrentUser();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="produksi" element={<Produksi />} />
          <Route path="master" element={<MasterData />} />
          <Route path="pembelian" element={<PembelianBiaya />} />
          <Route path="penjualan" element={<PenjualanRetur />} />
          <Route path="kas" element={<KasPiutang />} />
          <Route path="laporan" element={<LaporanKeuangan />} />
          <Route path="kasbon" element={<KasbonRiwayat />} />
          <Route path="riwayat" element={<KasbonRiwayat />} />
          <Route path="settings/users" element={<SettingsUsers />} />
          <Route path="settings/company" element={<SettingsCompany />} />
          <Route path="profile" element={<Profile />} />
          <Route path="*" element={<div className="p-10 text-center text-slate-500">Halaman sedang dalam pengembangan...</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
