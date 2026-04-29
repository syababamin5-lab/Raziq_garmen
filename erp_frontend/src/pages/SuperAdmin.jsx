import { useState } from 'react';
import api from '../api/api';

export default function SuperAdmin() {
  const [pruneRange, setPruneRange] = useState({ start: '', end: '' });
  const [backupRange, setBackupRange] = useState({ start: '', end: '' });
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showPruneModal, setShowPruneModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [understood, setUnderstood] = useState(false);

  // Dashboard Settings State
  const [dashSettings, setDashSettings] = useState(() => {
    const saved = localStorage.getItem('dashboard_settings');
    return saved ? JSON.parse(saved) : { showProduksi: true, showPenjualan: true, showKeuangan: true };
  });

  const saveDashSettings = () => {
    localStorage.setItem('dashboard_settings', JSON.stringify(dashSettings));
    alert("✅ Pengaturan Dashboard Berhasil Disimpan! Silakan cek dashboard Anda.");
  };

  const handlePrune = async () => {
    if (!pruneRange.start || !pruneRange.end) {
      alert("Pilih rentang tanggal terlebih dahulu!");
      return;
    }
    if (!understood) {
      alert("Anda harus mencentang kotak konfirmasi.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.delete(`/admin/database/prune?start_date=${pruneRange.start}&end_date=${pruneRange.end}`);
      if (res.data.status === 'success') {
        alert("✅ " + res.data.message);
        setShowPruneModal(false);
        setUnderstood(false);
      } else {
        alert("❌ Gagal: " + res.data.message);
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
    setLoading(false);
  };

  const handleExportTransactions = async () => {
    if (!backupRange.start || !backupRange.end) {
      alert("Pilih rentang tanggal untuk backup!");
      return;
    }
    
    setLoading(true);
    try {
      // Direct window.open for streaming response
      const url = `${api.defaults.baseURL}/admin/database/export-transactions?start_date=${backupRange.start}&end_date=${backupRange.end}`;
      window.open(url, '_blank');
      setShowBackupModal(false);
    } catch (err) {
      alert("Error: " + err.message);
    }
    setLoading(false);
  };

  const downloadFile = (endpoint, filename) => {
    const url = `${api.defaults.baseURL}${endpoint}`;
    window.open(url, '_blank');
  };

  const categories = [
    { id: 'karyawan', name: 'Data Karyawan', icon: 'badge', color: 'bg-blue-50 text-blue-600 border-blue-100' },
    { id: 'barang', name: 'SKU Barang Jadi', icon: 'inventory_2', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
    { id: 'mitra', name: 'Mitra & Supplier', icon: 'handshake', color: 'bg-purple-50 text-purple-600 border-purple-100' },
    { id: 'akun', name: 'Chart of Accounts', icon: 'account_tree', color: 'bg-orange-50 text-orange-600 border-orange-100' }
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="relative overflow-hidden bg-emerald-900 p-10 rounded-[2.5rem] shadow-2xl border border-emerald-800">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-emerald-800/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-48 h-48 bg-emerald-700/20 rounded-full blur-2xl"></div>
        
        <div className="relative flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <h1 className="text-4xl font-black text-white tracking-tight flex items-center justify-center md:justify-start gap-3">
              <span className="material-symbols-rounded text-emerald-400 text-4xl">admin_panel_settings</span>
              Super Admin Control
            </h1>
            <p className="text-emerald-100/70 mt-3 font-medium text-lg">Manajemen Database & Pemeliharaan Sistem Tingkat Tinggi</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-emerald-800/50 backdrop-blur-md px-6 py-4 rounded-3xl border border-emerald-700/50 flex flex-col items-center">
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Status Sistem</span>
              <span className="text-white font-bold flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                OPERATIONAL
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Database Pruning Card */}
        <div className="lg:col-span-1 bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col group hover:shadow-xl hover:shadow-red-500/5 transition-all duration-300">
          <div className="mb-6 p-4 bg-red-50 rounded-2xl w-fit">
            <span className="material-symbols-rounded text-red-600 text-3xl">dangerous</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Database Pruning</h2>
          <p className="text-sm text-slate-500 leading-relaxed mb-8 flex-1">
            Fitur pembersihan data. Seluruh transaksi (Invoice, PO, Jurnal, Kasbon) akan dihapus secara permanen. 
            <span className="font-bold text-red-600"> Data Master akan tetap aman.</span>
          </p>
          <button 
            onClick={() => setShowPruneModal(true)}
            className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-red-600 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-slate-200"
          >
            <span className="material-symbols-rounded">delete_sweep</span>
            Mulai Pruning
          </button>
        </div>

        {/* Dashboard Control Card */}
        <div className="lg:col-span-1 bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col group hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300">
          <div className="mb-6 p-4 bg-emerald-50 rounded-2xl w-fit">
            <span className="material-symbols-rounded text-emerald-600 text-3xl">dashboard_customize</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Dashboard Control</h2>
          <p className="text-sm text-slate-500 leading-relaxed mb-8 flex-1">
            Kelola visibilitas panel dan metrik utama pada Dashboard. Atur informasi apa saja yang ditampilkan untuk setiap level akses.
          </p>
          <div className="space-y-3 mb-6">
             <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-emerald-50 transition-colors border border-slate-100">
                <input 
                  type="checkbox" 
                  checked={dashSettings.showProduksi} 
                  onChange={e => setDashSettings({...dashSettings, showProduksi: e.target.checked})}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" 
                />
                <span className="text-xs font-bold text-slate-600">Tampilkan Panel Produksi</span>
             </label>
             <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-emerald-50 transition-colors border border-slate-100">
                <input 
                  type="checkbox" 
                  checked={dashSettings.showPenjualan} 
                  onChange={e => setDashSettings({...dashSettings, showPenjualan: e.target.checked})}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" 
                />
                <span className="text-xs font-bold text-slate-600">Tampilkan Panel Penjualan</span>
             </label>
             <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-emerald-50 transition-colors border border-slate-100">
                <input 
                  type="checkbox" 
                  checked={dashSettings.showKeuangan} 
                  onChange={e => setDashSettings({...dashSettings, showKeuangan: e.target.checked})}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" 
                />
                <span className="text-xs font-bold text-slate-600">Tampilkan Metrik Keuangan</span>
             </label>
          </div>
          <button 
            onClick={saveDashSettings}
            className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-700 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-emerald-100"
          >
            <span className="material-symbols-rounded">save</span>
            Simpan Konfigurasi
          </button>
        </div>

        {/* Backup & Export Main Section */}
        <div className="lg:col-span-1 bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 space-y-6 flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 rounded-xl">
                <span className="material-symbols-rounded text-blue-600">database</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Backup & Export</h2>
            </div>
          </div>
          
          <div className="space-y-4 flex-1">
            <button 
              onClick={() => downloadFile('/admin/database/export-all', 'FULL_DB.xlsx')}
              className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-emerald-200 hover:bg-white transition-all flex items-center gap-4"
            >
              <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-emerald-500">
                <span className="material-symbols-rounded">cloud_download</span>
              </div>
              <div className="text-left">
                <div className="font-bold text-slate-900 text-xs">Full Backup</div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">Excel Multi-Sheet</div>
              </div>
            </button>

            <button 
              onClick={() => setShowBackupModal(true)}
              className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-white transition-all flex items-center gap-4"
            >
              <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-500">
                <span className="material-symbols-rounded">history</span>
              </div>
              <div className="text-left">
                <div className="font-bold text-slate-900 text-xs">Backup Transaksi</div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">Periode Tertentu</div>
              </div>
            </button>
          </div>

          <div className="pt-4 border-t border-slate-50 grid grid-cols-2 gap-2">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => downloadFile(`/admin/database/export-category/${cat.id}`, `${cat.id}.xlsx`)}
                  className={`p-3 rounded-xl border flex items-center gap-2 transition-all hover:scale-105 active:scale-95 ${cat.color} group shadow-sm`}
                >
                  <span className="material-symbols-rounded text-xl">{cat.icon}</span>
                  <div className="text-[9px] font-black uppercase tracking-wider truncate">{cat.name.split(' ')[1] || cat.name}</div>
                </button>
              ))}
          </div>
        </div>
      </div>

      {/* Prune Modal */}
      {showPruneModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="bg-red-600 p-8 text-white text-center relative overflow-hidden">
               <div className="absolute top-0 right-0 -mt-8 -mr-8 w-24 h-24 bg-white/10 rounded-full"></div>
              <span className="material-symbols-rounded text-6xl mb-2">warning</span>
              <h3 className="text-2xl font-black tracking-tight">Konfirmasi Pruning</h3>
              <p className="text-red-100 text-sm mt-1 font-medium">Tindakan ini sangat berbahaya!</p>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mulai</label>
                  <input 
                    type="date" 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                    value={pruneRange.start}
                    onChange={e => setPruneRange({...pruneRange, start: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hingga</label>
                  <input 
                    type="date" 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                    value={pruneRange.end}
                    onChange={e => setPruneRange({...pruneRange, end: e.target.value})}
                  />
                </div>
              </div>

              <div className="p-5 bg-amber-50 rounded-3xl border border-amber-100/50 flex gap-4 items-start">
                <span className="material-symbols-rounded text-amber-600 shrink-0 mt-0.5">info</span>
                <p className="text-xs text-amber-900 leading-relaxed font-medium">
                  Data yang dihapus: Jurnal Umum, Invoice Penjualan, PO Pembelian, dan Kasbon. Tindakan ini <span className="font-bold underline">TIDAK DAPAT DIBATALKAN</span>.
                </p>
              </div>

              <label className="flex items-start gap-4 p-5 bg-slate-50 rounded-3xl cursor-pointer hover:bg-slate-100 transition-colors border border-slate-100">
                <div className="relative flex items-center mt-1">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 rounded-lg border-slate-300 text-red-600 focus:ring-red-500"
                    checked={understood}
                    onChange={e => setUnderstood(e.target.checked)}
                  />
                </div>
                <span className="text-xs font-bold text-slate-600 leading-tight">
                  Saya mengerti data transaksi akan hilang permanen dan telah melakukan backup sebelumnya.
                </span>
              </label>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setShowPruneModal(false)}
                  className="flex-1 py-4 font-black text-slate-400 hover:text-slate-900 transition-all uppercase tracking-widest text-xs"
                >
                  Batal
                </button>
                <button 
                  disabled={!understood || loading}
                  onClick={handlePrune}
                  className={`flex-[2] py-4 font-black rounded-2xl shadow-xl transition-all uppercase tracking-widest text-xs ${
                    understood && !loading 
                      ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-200' 
                      : 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'
                  }`}
                >
                  {loading ? 'Memproses...' : 'Hapus Permanen'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Backup Transaksi Modal */}
      {showBackupModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="bg-blue-600 p-8 text-white text-center relative overflow-hidden">
               <div className="absolute top-0 right-0 -mt-8 -mr-8 w-24 h-24 bg-white/10 rounded-full"></div>
              <span className="material-symbols-rounded text-6xl mb-2">history</span>
              <h3 className="text-2xl font-black tracking-tight">Backup Transaksi</h3>
              <p className="text-blue-100 text-sm mt-1 font-medium">Download riwayat transaksi periode tertentu</p>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dari</label>
                  <input 
                    type="date" 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    value={backupRange.start}
                    onChange={e => setBackupRange({...backupRange, start: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sampai</label>
                  <input 
                    type="date" 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    value={backupRange.end}
                    onChange={e => setBackupRange({...backupRange, end: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setShowBackupModal(false)}
                  className="flex-1 py-4 font-black text-slate-400 hover:text-slate-900 transition-all uppercase tracking-widest text-xs"
                >
                  Batal
                </button>
                <button 
                  onClick={handleExportTransactions}
                  className="flex-[2] py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all uppercase tracking-widest text-xs"
                >
                  {loading ? 'Menyiapkan...' : 'Download Excel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
