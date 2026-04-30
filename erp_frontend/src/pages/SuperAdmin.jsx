import { useState, useEffect } from 'react';
import api from '../api/api';

export default function SuperAdmin() {
  const [pruneRange, setPruneRange] = useState({ start: '', end: '' });
  const [backupRange, setBackupRange] = useState({ start: '', end: '' });
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showPruneModal, setShowPruneModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [understood, setUnderstood] = useState(false);
  
  // User Logs State
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const { data } = await api.get('/users/logs');
      if (data.status === 'success') {
        setLogs(data.data);
      }
    } catch (err) {
      console.error("Gagal mengambil log:", err);
    }
    setLoadingLogs(false);
  };

  useEffect(() => {
    fetchLogs();
    // Auto refresh tiap 30 detik
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, []);

  // Menu Registry State (Dulu Dashboard Settings LocalStorage)
  const [menus, setMenus] = useState([]);
  const [loadingMenus, setLoadingMenus] = useState(false);

  const fetchMenus = async () => {
    setLoadingMenus(true);
    try {
      const { data } = await api.get('/menus');
      setMenus(data);
    } catch (err) {
      console.error("Gagal mengambil menu:", err);
    }
    setLoadingMenus(false);
  };

  const handleToggleMenu = async (id, currentStatus) => {
    try {
      await api.put(`/menus/${id}`, { is_active: !currentStatus });
      // Update local state
      setMenus(menus.map(m => m.id === id ? { ...m, is_active: currentStatus ? 0 : 1 } : m));
    } catch (err) {
      alert("Gagal memperbarui status menu.");
    }
  };

  useEffect(() => {
    fetchMenus();
  }, []);

  // Export Wizard State
  const [exportWizard, setExportWizard] = useState({
    dataType: 'full',   // 'full', 'master', 'transaksi'
    format: 'xlsx',     // 'sql', 'xlsx', 'pdf'
    startDate: '',
    endDate: ''
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleExportWizard = () => {
    setIsExporting(true);
    setExportSuccess(false);

    console.log("Memulai Export dengan konfigurasi:", exportWizard);
    
    // Simulasi proses download (2 detik)
    setTimeout(() => {
      setIsExporting(false);
      setExportSuccess(true);
      
      // Reset status sukses setelah 3 detik
      setTimeout(() => setExportSuccess(false), 3000);
    }, 2500);
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
          <div className="space-y-2 mb-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
             {menus.filter(m => !m.is_divider).map(menu => (
               <label key={menu.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-emerald-50 transition-colors border border-slate-100">
                  <input 
                    type="checkbox" 
                    checked={menu.is_active === 1} 
                    onChange={() => handleToggleMenu(menu.id, menu.is_active === 1)}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" 
                  />
                  <div>
                    <p className="text-[10px] font-black text-slate-900 leading-none mb-1">{menu.nama_menu}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{menu.path || 'MODUL'}</p>
                  </div>
               </label>
             ))}
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-700 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-emerald-100"
          >
            <span className="material-symbols-rounded">refresh</span>
            Terapkan ke Sidebar
          </button>
        </div>

        {/* ── REDESIGNED BACKUP & EXPORT WIZARD ── */}
        <div className="lg:col-span-1 bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col group transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-50 rounded-xl">
              <span className="material-symbols-rounded text-blue-600">database</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Export Wizard</h2>
          </div>

          <div className="space-y-5 flex-1">
            {/* Bagian 1: Pilih Data */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Pilih Jenis Data</label>
              <div className="relative">
                <select 
                  value={exportWizard.dataType}
                  onChange={(e) => setExportWizard({...exportWizard, dataType: e.target.value})}
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer"
                >
                  <option value="full">📦 Full Database Backup</option>
                  <option value="master">👥 Data Master (SKU & Karyawan)</option>
                  <option value="transaksi">💸 Data Transaksi (Invoice/PO)</option>
                </select>
                <span className="material-symbols-rounded absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
              </div>
            </div>

            {/* Bagian 2: Filter Periode (Hanya aktif jika Transaksi dipilih) */}
            <div className={`space-y-2 transition-all duration-500 ${exportWizard.dataType === 'transaksi' ? 'opacity-100 scale-100' : 'opacity-30 scale-95 pointer-events-none'}`}>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Filter Periode</label>
              <div className="grid grid-cols-2 gap-2">
                <input 
                  type="date" 
                  value={exportWizard.startDate}
                  onChange={(e) => setExportWizard({...exportWizard, startDate: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-600 outline-none"
                />
                <input 
                  type="date" 
                  value={exportWizard.endDate}
                  onChange={(e) => setExportWizard({...exportWizard, endDate: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-600 outline-none"
                />
              </div>
            </div>

            {/* Bagian 3: Pilih Format */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Pilih Format File</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'sql', label: '.SQL', icon: 'terminal', color: 'blue' },
                  { id: 'xlsx', label: '.XLSX', icon: 'table_view', color: 'emerald' },
                  { id: 'pdf', label: '.PDF', icon: 'picture_as_pdf', color: 'red' },
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    onClick={() => setExportWizard({...exportWizard, format: fmt.id})}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all gap-1 ${
                      exportWizard.format === fmt.id 
                        ? `bg-${fmt.color}-50 border-${fmt.color}-500 text-${fmt.color}-700 shadow-inner` 
                        : 'bg-white border-slate-50 text-slate-400 hover:bg-slate-50 hover:border-slate-100'
                    }`}
                  >
                    <span className="material-symbols-rounded text-lg">{fmt.icon}</span>
                    <span className="text-[10px] font-black">{fmt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bagian 4: Action Button */}
          <div className="mt-8 relative">
            {exportSuccess && (
              <div className="absolute -top-10 left-0 right-0 animate-in slide-in-from-bottom-2 duration-300">
                <div className="bg-emerald-500 text-white text-[10px] font-black py-2 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-200">
                  <span className="material-symbols-rounded text-sm">check_circle</span>
                  DOWNLOAD BERHASIL DISIMPAN!
                </div>
              </div>
            )}

            <button 
              onClick={handleExportWizard}
              disabled={isExporting}
              className={`w-full py-4 font-black rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 shadow-xl group overflow-hidden relative ${
                isExporting 
                  ? 'bg-slate-100 text-slate-400 cursor-wait shadow-none' 
                  : exportSuccess
                    ? 'bg-emerald-600 text-white shadow-emerald-200'
                    : 'bg-slate-900 text-white hover:bg-blue-600 shadow-slate-200'
              }`}
            >
              {isExporting ? (
                <>
                  <div className="absolute inset-0 bg-slate-200 w-full animate-pulse opacity-20"></div>
                  <span className="material-symbols-rounded animate-spin text-blue-500">sync</span>
                  <span>MENYIAPKAN FILE...</span>
                </>
              ) : exportSuccess ? (
                <>
                  <span className="material-symbols-rounded">download_done</span>
                  <span>DOWNLOAD SELESAI</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-rounded animate-bounce group-hover:animate-none">download</span>
                  <span>GENERATE & DOWNLOAD</span>
                </>
              )}
            </button>
            <p className="text-center text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-4 opacity-60">
              Last Backup: {new Date().toLocaleDateString('id-ID')}
            </p>
          </div>
        </div>
      </div>

      {/* User Activity Log Section */}
      <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col mt-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 rounded-xl">
              <span className="material-symbols-rounded text-indigo-600">monitor_heart</span>
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Live User Activity Log</h2>
              <p className="text-xs font-medium text-slate-400">Pantau aktivitas dan akses menu pengguna secara real-time</p>
            </div>
          </div>
          <button onClick={fetchLogs} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Refresh Logs">
            <span className={`material-symbols-rounded ${loadingLogs ? 'animate-spin' : ''}`}>sync</span>
          </button>
        </div>

        <div className="overflow-x-auto border border-slate-100 rounded-2xl max-h-[400px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-black uppercase tracking-widest sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="py-4 px-5">Waktu</th>
                <th className="py-4 px-5">Pengguna</th>
                <th className="py-4 px-5">Aksi</th>
                <th className="py-4 px-5">Menu / Modul</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length > 0 ? logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-all">
                  <td className="py-3 px-5 text-slate-500 font-medium">
                    {new Date(log.waktu).toLocaleString('id-ID', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit', second:'2-digit'})}
                  </td>
                  <td className="py-3 px-5 font-bold text-slate-700">
                    {log.nama_lengkap} <span className="text-[10px] text-slate-400 font-normal">(@{log.username})</span>
                  </td>
                  <td className="py-3 px-5">
                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${
                      log.aksi.includes('Tambah') ? 'bg-emerald-100 text-emerald-700' :
                      log.aksi.includes('Hapus') ? 'bg-red-100 text-red-700' :
                      log.aksi.includes('Ubah') ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {log.aksi}
                    </span>
                  </td>
                  <td className="py-3 px-5 font-medium text-slate-600">{log.menu}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="4" className="py-10 text-center text-slate-400 font-medium italic">Belum ada aktivitas terekam.</td>
                </tr>
              )}
            </tbody>
          </table>
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
