import { useState, useEffect } from 'react';
import api from '../api/api';

export default function SuperAdmin() {
  const [pruneRange, setPruneRange] = useState({ start: '', end: '' });
  const [backupRange, setBackupRange] = useState({ start: '', end: '' });
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showPruneModal, setShowPruneModal] = useState(false);
  const [showResetPGModal, setShowResetPGModal] = useState(false);
  const [resetPGPin, setResetPGPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [understood, setUnderstood] = useState(false);
  
  // Restore State
  const [restoreFile, setRestoreFile] = useState(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // AI Configuration State
  const [aiConfig, setAiConfig] = useState({ provider: 'gemini', api_key: '', model_name: '', masked_key: '', is_set: false });
  const [loadingAi, setLoadingAi] = useState(false);

  const fetchAiConfig = async () => {
    try {
      const { data } = await api.get('/ai/config');
      if (data.status === 'success') {
        setAiConfig({
          provider: data.provider || 'gemini',
          api_key: '', // Jangan tampilkan key asli di state
          model_name: data.model_name || '',
          masked_key: data.api_key_masked || '',
          is_set: data.api_key_set
        });
      }
    } catch (err) {
      console.error("Gagal mengambil konfigurasi AI:", err);
    }
  };

  const handleSaveAiConfig = async () => {
    setLoadingAi(true);
    try {
      const { data } = await api.post('/ai/config', {
        provider: aiConfig.provider,
        api_key: aiConfig.api_key, // Ini akan dikirim ke backend
        model_name: aiConfig.model_name
      });
      if (data.status === 'success') {
        alert("✅ " + data.message);
        setAiConfig(prev => ({...prev, api_key: ''})); // Kosongkan field input setelah simpan
        fetchAiConfig(); // Refresh state
      } else {
        alert("❌ " + data.message);
      }
    } catch (err) {
      alert("Error menyimpan konfigurasi AI.");
    }
    setLoadingAi(false);
  };

  const handleTestAi = async () => {
    setLoadingAi(true);
    try {
      const { data } = await api.post('/ai/test');
      if (data.status === 'success') {
        alert(`✅ Test Berhasil!\nRespons AI: ${data.response}`);
      } else {
        alert(`❌ Test Gagal:\n${data.message}`);
      }
    } catch (err) {
      alert("Koneksi ke AI gagal. Pastikan API Key valid.");
    }
    setLoadingAi(false);
  };

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
    fetchMenus();
    fetchAiConfig();
    // Auto refresh tiap 30 detik
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, []);

  // Menu Registry State (Dulu Dashboard Settings LocalStorage)
  const [menus, setMenus] = useState([]);
  const [loadingMenus, setLoadingMenus] = useState(false);
  const [selectedRole, setSelectedRole] = useState('staff');

  const rolesList = [
    { id: 'super_admin', label: 'Super Admin' },
    { id: 'owner', label: 'Owner' },
    { id: 'gm', label: 'GM' },
    { id: 'admin', label: 'Admin' },
    { id: 'staff', label: 'Staff' }
  ];

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

  const handleToggleMenuRole = async (menu) => {
    try {
      let rolesArr = menu.roles ? menu.roles.split(',').map(r => r.trim()).filter(Boolean) : [];
      if (rolesArr.includes(selectedRole)) {
        rolesArr = rolesArr.filter(r => r !== selectedRole);
      } else {
        rolesArr.push(selectedRole);
      }
      
      const newRoles = rolesArr.join(',');
      await api.put(`/menus/${menu.id}`, { roles: newRoles });
      
      // Update local state
      setMenus(menus.map(m => m.id === menu.id ? { ...m, roles: newRoles } : m));
    } catch (err) {
      alert("Gagal memperbarui akses menu.");
    }
  };

  const handleToggleMenuGlobal = async (id, currentStatus) => {
    try {
      await api.put(`/menus/${id}`, { is_active: !currentStatus });
      setMenus(menus.map(m => m.id === id ? { ...m, is_active: currentStatus ? 0 : 1 } : m));
    } catch (err) {
      alert("Gagal memperbarui status global menu.");
    }
  };

  // Menu Registry dipindah ke atas efeknya digabung

  // Export Wizard State
  const [exportWizard, setExportWizard] = useState({
    dataType: 'full',   // 'full', 'master', 'transaksi'
    format: 'xlsx',     // 'sql', 'xlsx', 'pdf'
    startDate: '',
    endDate: ''
  });
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleExportWizard = () => {
    setIsExporting(true);
    setExportSuccess(false);

    if (exportWizard.format === 'pdf') {
      alert("Format .PDF untuk Full Backup tidak didukung karena terlalu besar. Silakan gunakan .XLSX atau .SQL");
      setIsExporting(false);
      return;
    }

    try {
      const queryParams = new URLSearchParams({
        dataType: exportWizard.dataType,
        format: exportWizard.format
      });

      if (exportWizard.dataType === 'transaksi' || exportWizard.dataType === 'full') {
        if (exportWizard.startDate) queryParams.append('start_date', exportWizard.startDate);
        if (exportWizard.endDate) queryParams.append('end_date', exportWizard.endDate);
      }

      const url = `${api.defaults.baseURL}/admin/database/export?${queryParams.toString()}`;
      
      // Open URL directly to trigger download
      window.open(url, '_blank');
      
      setIsExporting(false);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);

    } catch (err) {
      console.error(err);
      alert("Gagal melakukan export: " + err.message);
      setIsExporting(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreFile) return;
    
    const konfirmasi = window.confirm("Yakin ingin merestore database dari file backup ini? Data lama akan tertimpa.");
    if (!konfirmasi) return;

    setIsRestoring(true);
    const formData = new FormData();
    formData.append('file', restoreFile);

    try {
      const res = await api.post('/admin/database/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.status === 'success') {
        alert("✅ " + res.data.message);
        setRestoreFile(null);
      } else {
        alert("❌ Gagal: " + res.data.message);
      }
    } catch (err) {
      alert("Error saat restore: " + err.message);
    }
    setIsRestoring(false);
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

  const handleResetMaster = async (target, label) => {
    const pass = window.prompt(`Ketik "RESET ${label.toUpperCase()}" untuk mengkonfirmasi penghapusan seluruh data ${label}:`);
    if (pass !== `RESET ${label.toUpperCase()}`) {
      alert("Konfirmasi gagal. Data tidak dihapus.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.delete(`/admin/database/reset-master?target=${target}`);
      if (res.data.status === 'success') {
        alert("✅ " + res.data.message);
      } else {
        alert("❌ Gagal: " + res.data.message);
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
    setLoading(false);
  };

  const handleResetPG = async () => {
    if (!resetPGPin) {
      alert("Masukkan PIN!");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/admin/database/reset-full-pg', { pin: resetPGPin });
      if (res.data.status === 'success') {
        alert("✅ " + res.data.message);
        setShowResetPGModal(false);
        setResetPGPin('');
      } else {
        alert("❌ Gagal: " + res.data.message);
      }
    } catch (err) {
      alert("Error: " + (err.response?.data?.message || err.message));
    }
    setLoading(false);
  };

  const downloadFile = (endpoint, filename) => {
    const url = `${api.defaults.baseURL}${endpoint}`;
    window.open(url, '_blank');
  };

  return (
    <>
      <div className="w-full px-4 md:px-10 py-8 space-y-8 animate-in fade-in duration-700">
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

      {/* 3-Column Control Hub Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {/* Database Pruning Card */}
        <div className="lg:col-span-1 bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col group hover:shadow-xl hover:shadow-red-500/5 transition-all duration-300">
          <div className="mb-6 p-4 bg-red-50 rounded-2xl w-fit">
            <span className="material-symbols-rounded text-red-600 text-3xl">dangerous</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Database Pruning</h2>
          <p className="text-sm text-slate-500 leading-relaxed mb-8 flex-1">
            Fitur pembersihan data. Seluruh transaksi (Invoice, PO, Jurnal, Kasbon) akan dihapus secara permanen. 
            <span className="font-bold text-red-600"> Data Master tetap aman.</span>
          </p>
          <button 
            onClick={() => setShowPruneModal(true)}
            className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-red-600 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-slate-200"
          >
            <span className="material-symbols-rounded">delete_sweep</span>
            Mulai Pruning
          </button>
        </div>

        {/* Master Data Reset Card (NEW) */}
        <div className="lg:col-span-1 bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col group hover:shadow-xl hover:shadow-amber-500/5 transition-all duration-300">
          <div className="mb-6 p-4 bg-amber-50 rounded-2xl w-fit">
            <span className="material-symbols-rounded text-amber-600 text-3xl">restart_alt</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Initialization Reset</h2>
          <p className="text-sm text-slate-500 leading-relaxed mb-6">
            Hapus data master untuk memulai perusahaan baru. <span className="text-amber-600 font-bold">Gunakan dengan sangat hati-hati!</span>
          </p>
          
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button 
              onClick={() => handleResetMaster('barang', 'Barang')}
              className="p-3 bg-slate-50 hover:bg-amber-100 text-slate-600 hover:text-amber-700 rounded-2xl border border-slate-100 transition-all flex flex-col items-center gap-1"
            >
              <span className="material-symbols-rounded text-xl">inventory_2</span>
              <span className="text-[10px] font-black uppercase">Barang</span>
            </button>
            <button 
              onClick={() => handleResetMaster('karyawan', 'Karyawan')}
              className="p-3 bg-slate-50 hover:bg-amber-100 text-slate-600 hover:text-amber-700 rounded-2xl border border-slate-100 transition-all flex flex-col items-center gap-1"
            >
              <span className="material-symbols-rounded text-xl">badge</span>
              <span className="text-[10px] font-black uppercase">Karyawan</span>
            </button>
            <button 
              onClick={() => handleResetMaster('mitra', 'Mitra')}
              className="p-3 bg-slate-50 hover:bg-amber-100 text-slate-600 hover:text-amber-700 rounded-2xl border border-slate-100 transition-all flex flex-col items-center gap-1"
            >
              <span className="material-symbols-rounded text-xl">handshake</span>
              <span className="text-[10px] font-black uppercase">Mitra</span>
            </button>
            <button 
              onClick={() => setShowResetPGModal(true)}
              className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl shadow-lg shadow-red-100 transition-all flex flex-col items-center justify-center gap-1 border-2 border-red-500 animate-pulse"
            >
              <span className="material-symbols-rounded text-xl">crisis_alert</span>
              <span className="text-[10px] font-black uppercase text-center leading-tight">Hard Reset<br/>PostgreSQL</span>
            </button>
          </div>

          <p className="text-[9px] text-slate-400 italic leading-tight text-center">
            * Reset Total akan menghapus Seluruh Master & Seluruh Transaksi Jurnal.
          </p>
        </div>

                {/* Dashboard Control Card - UPDATED FOR ROLE BASED ACCESS */}
        <div className="lg:col-span-1 bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col group hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-emerald-50 rounded-xl">
              <span className="material-symbols-rounded text-emerald-600">dashboard_customize</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Dashboard Control</h2>
          </div>
          
          <p className="text-[11px] font-medium text-slate-400 leading-relaxed mb-6">
            Kelola visibilitas menu berdasarkan Level Akses. Pilih Role terlebih dahulu, lalu centang menu yang ingin ditampilkan.
          </p>

          {/* Role Selector Tabs */}
          <div className="flex bg-slate-50 p-1.5 rounded-2xl mb-6 overflow-x-auto custom-scrollbar">
            {rolesList.map(role => (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={`flex-1 py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  selectedRole === role.id 
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {role.label}
              </button>
            ))}
          </div>

          <div className="space-y-2 mb-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
             {menus.filter(m => !m.is_divider).map(menu => {
               const hasAccess = menu.roles ? menu.roles.split(',').includes(selectedRole) : false;
               return (
                 <div key={menu.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 group/item hover:bg-white transition-all">
                    <label className="flex-1 flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={hasAccess} 
                        onChange={() => handleToggleMenuRole(menu)}
                        className="w-5 h-5 rounded-lg border-slate-300 text-emerald-600 focus:ring-emerald-500 transition-all cursor-pointer" 
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                           <span className="material-symbols-rounded text-[16px] text-slate-400">{menu.icon}</span>
                           <p className="text-[10px] font-black text-slate-900 leading-none">{menu.nama_menu}</p>
                        </div>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1 ml-6">{menu.path || 'MODUL'}</p>
                      </div>
                    </label>
                    
                    {/* Global Active Toggle */}
                    <button 
                      onClick={() => handleToggleMenuGlobal(menu.id, menu.is_active === 1)}
                      className={`w-8 h-4 rounded-full relative transition-all ${menu.is_active === 1 ? 'bg-emerald-400/30' : 'bg-slate-200'}`}
                      title="Status Global Menu"
                    >
                      <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${menu.is_active === 1 ? 'right-0.5 bg-emerald-600' : 'left-0.5 bg-slate-400'}`}></div>
                    </button>
                 </div>
               );
             })}
          </div>

          <button 
            onClick={() => {
              window.dispatchEvent(new CustomEvent('update-menus'));
              alert("✅ Pengaturan berhasil diterapkan ke sistem tanpa reload!");
            }}
            className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-700 transition-all duration-300 flex items-center justify-center gap-2 shadow-xl shadow-emerald-100 mt-auto"
          >
            <span className="material-symbols-rounded">check_circle</span>
            TERAPKAN KE SISTEM
          </button>
        </div>

        {/* ── AI ENGINE CONFIGURATION CARD ── */}
        <div className="lg:col-span-1 bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col group hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-50 rounded-xl">
                <span className="material-symbols-rounded text-emerald-600">psychology</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Konfigurasi Engine AI</h2>
            </div>
            {aiConfig.is_set ? (
              <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase px-2 py-1 rounded-lg flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> ACTIVE</span>
            ) : (
              <span className="bg-amber-100 text-amber-700 text-[10px] font-black uppercase px-2 py-1 rounded-lg flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> NO API KEY</span>
            )}
          </div>
          
          <p className="text-[11px] font-medium text-slate-400 leading-relaxed mb-6">
            Pilih penyedia LLM (Large Language Model) untuk asisten bisnis Anda. Fitur chat eksekutif membutuhkan akses ke API resmi penyedia AI.
          </p>

          <div className="space-y-4 mb-6 flex-1">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Penyedia AI</label>
              <select 
                value={aiConfig.provider}
                onChange={e => setAiConfig({...aiConfig, provider: e.target.value})}
                className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-bold text-slate-700"
              >
                <option value="gemini">Google Gemini (Disarankan - Cepat & Gratis)</option>
                <option value="openai">OpenAI (ChatGPT)</option>
                <option value="groq">Groq (Ultra-Fast Llama3)</option>
              </select>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-end mb-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">API Key</label>
                {aiConfig.is_set && <span className="text-[9px] text-slate-400 font-bold">Terpasang: {aiConfig.masked_key}</span>}
              </div>
              <div className="relative">
                <input 
                  type="password" 
                  value={aiConfig.api_key}
                  onChange={e => setAiConfig({...aiConfig, api_key: e.target.value})}
                  placeholder={aiConfig.is_set ? "Ketik API Key baru untuk mengganti..." : "Paste API Key rahasia Anda di sini..."}
                  className="w-full p-3 pl-10 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                />
                <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">key</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Spesifikasi Model (Opsional)</label>
              <input 
                type="text" 
                value={aiConfig.model_name}
                onChange={e => setAiConfig({...aiConfig, model_name: e.target.value})}
                placeholder="cth: gemini-1.5-flash atau gpt-4o"
                className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
              />
              <p className="text-[9px] text-slate-400 px-1 mt-1">Kosongkan untuk menggunakan model cerdas bawaan.</p>
            </div>
          </div>

          <div className="flex gap-2 mt-auto">
            <button 
              onClick={handleTestAi}
              disabled={loadingAi || (!aiConfig.is_set && !aiConfig.api_key)}
              className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all duration-300 text-xs flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span className="material-symbols-rounded text-[18px]">bug_report</span>
              Test
            </button>
            <button 
              onClick={handleSaveAiConfig}
              disabled={loadingAi || (!aiConfig.api_key && !aiConfig.is_set)}
              className="flex-[2] py-3 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-700 transition-all duration-300 text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 disabled:opacity-50"
            >
              {loadingAi ? <span className="material-symbols-rounded animate-spin text-[18px]">sync</span> : <span className="material-symbols-rounded text-[18px]">save</span>}
              SIMPAN AI
            </button>
          </div>
        </div>

        {/* ── REDESIGNED BACKUP & EXPORT WIZARD ── */}
        <div className="lg:col-span-1 bg-gradient-to-br from-blue-50 via-white to-blue-50/30 p-8 rounded-[2rem] shadow-sm border border-blue-100 flex flex-col group transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-200/40 rounded-full blur-3xl group-hover:bg-blue-300/40 transition-all"></div>
          <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-cyan-200/40 rounded-full blur-2xl group-hover:bg-cyan-300/40 transition-all"></div>
          
          <div className="flex items-center gap-4 mb-8 relative z-10">
            <div className="p-4 bg-white rounded-2xl shadow-sm border border-blue-50 group-hover:scale-110 transition-transform duration-300">
              <span className="material-symbols-rounded text-blue-600 text-2xl">database</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Export Wizard</h2>
          </div>

          <div className="space-y-6 flex-1 relative z-10">
            {/* Bagian 1: Pilih Data */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Pilih Jenis Data</label>
              <div className="relative">
                {/* Custom Styled Dropdown */}
                <button 
                  onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                  className="w-full p-4 bg-white/60 border border-slate-200 hover:border-blue-300 focus:border-blue-500 rounded-2xl text-sm font-bold text-slate-700 outline-none flex items-center justify-between backdrop-blur-sm transition-all shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-rounded text-blue-500">
                      {exportWizard.dataType === 'full' ? 'inventory_2' : exportWizard.dataType === 'master' ? 'groups' : 'receipt_long'}
                    </span>
                    <span>
                      {exportWizard.dataType === 'full' ? 'Full Database Backup' : exportWizard.dataType === 'master' ? 'Data Master (SKU & Karyawan)' : 'Data Transaksi (Invoice/PO)'}
                    </span>
                  </div>
                  <span className={`material-symbols-rounded text-slate-400 transition-transform duration-300 ${showTypeDropdown ? 'rotate-180' : ''}`}>expand_more</span>
                </button>
                
                {showTypeDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowTypeDropdown(false)}></div>
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      {[
                        { id: 'full', label: 'Full Database Backup', icon: 'inventory_2', desc: 'Seluruh data sistem' },
                        { id: 'master', label: 'Data Master (SKU & Karyawan)', icon: 'groups', desc: 'Data barang, mitra, karyawan' },
                        { id: 'transaksi', label: 'Data Transaksi (Invoice/PO)', icon: 'receipt_long', desc: 'Data mutasi & keuangan' }
                      ].map(type => (
                        <button
                          key={type.id}
                          onClick={() => {
                            setExportWizard({...exportWizard, dataType: type.id});
                            setShowTypeDropdown(false);
                          }}
                          className="w-full p-4 flex items-center gap-4 hover:bg-blue-50 transition-all text-left group border-b border-slate-50 last:border-0"
                        >
                          <div className={`p-2.5 rounded-xl transition-all ${exportWizard.dataType === type.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-50 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600'}`}>
                            <span className="material-symbols-rounded text-lg">{type.icon}</span>
                          </div>
                          <div>
                            <p className={`text-sm font-black ${exportWizard.dataType === type.id ? 'text-blue-600' : 'text-slate-700'}`}>{type.label}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{type.desc}</p>
                          </div>
                          {exportWizard.dataType === type.id && (
                            <span className="material-symbols-rounded text-blue-500 ml-auto">check_circle</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
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
                  className="w-full p-4 bg-white/60 border border-slate-200 hover:border-blue-300 focus:border-blue-500 rounded-xl text-xs font-bold text-slate-600 outline-none backdrop-blur-sm transition-all"
                />
                <input 
                  type="date" 
                  value={exportWizard.endDate}
                  onChange={(e) => setExportWizard({...exportWizard, endDate: e.target.value})}
                  className="w-full p-4 bg-white/60 border border-slate-200 hover:border-blue-300 focus:border-blue-500 rounded-xl text-xs font-bold text-slate-600 outline-none backdrop-blur-sm transition-all"
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
                  { id: 'json', label: '.JSON', icon: 'data_object', color: 'purple' },
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    onClick={() => setExportWizard({...exportWizard, format: fmt.id})}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-1 ${
                      exportWizard.format === fmt.id 
                        ? `bg-${fmt.color}-50 border-${fmt.color}-400 text-${fmt.color}-700 shadow-md shadow-${fmt.color}-500/20 scale-105` 
                        : 'bg-white/60 border-slate-200 text-slate-400 hover:bg-white hover:border-blue-300 hover:shadow-sm'
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
                    ? 'bg-emerald-500 text-white shadow-emerald-200/50'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200/50 hover:-translate-y-1'
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
            <p className="text-center text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-4 opacity-60 flex items-center justify-center gap-1">
              <span className="material-symbols-rounded text-[10px]">history</span>
              Last Session Backup: {new Date().toLocaleString('id-ID', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit'})}
            </p>
          </div>
        </div>
      </div>

      {/* Restore Database Card */}
      <div className="bg-gradient-to-br from-purple-50 via-white to-purple-50/30 p-8 rounded-[2rem] shadow-sm border border-purple-100 flex flex-col mt-8 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300 relative overflow-hidden group">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-purple-200/40 rounded-full blur-3xl group-hover:bg-purple-300/40 transition-all"></div>
        <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-fuchsia-200/40 rounded-full blur-2xl group-hover:bg-fuchsia-300/40 transition-all"></div>
        
        <div className="flex items-center gap-4 mb-8 relative z-10">
          <div className="p-4 bg-white rounded-2xl shadow-sm border border-purple-50 group-hover:scale-110 transition-transform duration-300">
            <span className="material-symbols-rounded text-purple-600 text-2xl">settings_backup_restore</span>
          </div>
          <div>
             <h2 className="text-2xl font-black text-slate-900 tracking-tight">Restore Database</h2>
             <p className="text-xs font-medium text-slate-500 mt-1">Peringatan: Proses ini akan menyapu bersih data yang ada dan menggantinya dengan data dari file backup (<span className="font-bold text-purple-600">.XLSX / .SQL / .JSON</span>).</p>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 relative z-10 bg-white/60 p-4 rounded-2xl border border-white backdrop-blur-sm">
           <div className="flex-1 relative">
             <input type="file" accept=".xlsx,.sql,.json" onChange={(e) => setRestoreFile(e.target.files[0])} className="w-full p-4 pl-12 border border-slate-200 hover:border-purple-300 focus:border-purple-500 rounded-xl text-sm bg-white cursor-pointer text-slate-600 transition-all shadow-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-black file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100" />
             <span className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 text-purple-400 pointer-events-none">upload_file</span>
           </div>
           
           <button 
             disabled={!restoreFile || isRestoring}
             onClick={handleRestore}
             className={`w-full md:w-auto px-8 py-4 font-black rounded-xl text-white transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2 ${!restoreFile || isRestoring ? 'bg-slate-300 cursor-not-allowed shadow-none' : 'bg-purple-600 hover:bg-purple-700 shadow-xl shadow-purple-200/50 hover:-translate-y-1'}`}
           >
              {isRestoring ? (
                 <><span className="material-symbols-rounded animate-spin">sync</span> Memproses...</>
              ) : (
                 <><span className="material-symbols-rounded">cloud_upload</span> Restore Sekarang</>
              )}
           </button>
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

      </div>

      {/* Reset PG Modal (Pop-up Mengambang) */}
      {showResetPGModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-red-600 p-8 text-white text-center relative overflow-hidden">
               <div className="absolute top-0 right-0 -mt-8 -mr-8 w-24 h-24 bg-white/10 rounded-full"></div>
              <span className="material-symbols-rounded text-6xl mb-2 animate-pulse">crisis_alert</span>
              <h3 className="text-2xl font-black tracking-tight">DANGER ZONE</h3>
              <p className="text-red-100 text-sm mt-1 font-medium">Reset Total Database PostgreSQL (TRUNCATE)</p>
            </div>
            <div className="p-8 space-y-6">
              <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex gap-4 items-start">
                <span className="material-symbols-rounded text-red-600 shrink-0">error</span>
                <p className="text-xs text-red-900 leading-relaxed font-bold">
                  Tindakan ini akan mengosongkan SELURUH TABEL TRANSAKSI & MASTER (Kecuali COA, Config, dan User) dan MENGEMBALIKAN NOMOR TRANSAKSI (ID) KEMBALI KE 1.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Masukkan PIN Otorisasi</label>
                <div className="relative">
                  <input 
                    type="password" 
                    placeholder="*** ***"
                    className="w-full p-4 pl-12 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-black tracking-widest focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all text-center"
                    value={resetPGPin}
                    onChange={e => setResetPGPin(e.target.value)}
                  />
                  <span className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">lock</span>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => {
                    setShowResetPGModal(false);
                    setResetPGPin('');
                  }}
                  className="flex-1 py-4 font-black text-slate-400 hover:text-slate-900 transition-all uppercase tracking-widest text-xs bg-slate-100 hover:bg-slate-200 rounded-2xl"
                >
                  Batal
                </button>
                <button 
                  disabled={loading}
                  onClick={handleResetPG}
                  className={`flex-[2] py-4 font-black rounded-2xl shadow-xl transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2 ${
                    !loading 
                      ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-200 hover:-translate-y-1' 
                      : 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'
                  }`}
                >
                  {loading ? (
                    <><span className="material-symbols-rounded animate-spin text-sm">sync</span> Memproses...</>
                  ) : (
                    <><span className="material-symbols-rounded text-sm">bomb</span> EKSEKUSI RESET</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Prune Modal */}
      {showPruneModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in duration-300">
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
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in duration-300">
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
    </>
  );
}
