import React, { useState, useEffect } from 'react';
import { getProduksiOptions, submitCutting, getRekapCutting, getCuttingStats, getCuttingHistory } from '../../api/produksiApi';
import { updateProfile } from '../../api/userApi';
import { formatInputNumber, parseNumber, getLocalDate, getLocalTimestamp } from '../../utils/formatters';
import { useNavigate } from 'react-router-dom';

export default function CuttingInputMobile() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('input'); // 'input', 'history', 'dashboard', 'profile'
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  
  const [options, setOptions] = useState({ kain_list: [], baju_list: [], karyawan_list: [] });
  const [recentActivity, setRecentActivity] = useState([]);
  const [stats, setStats] = useState({ 
    hari_ini: 0, minggu_ini: 0, bulan_ini: 0, 
    top_produk: [], top_karyawan: [] 
  });
  
  const [historyData, setHistoryData] = useState([]);
  const [historyPeriode, setHistoryPeriode] = useState('hari_ini');
  const [selectedHistory, setSelectedHistory] = useState(null);

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    username: localStorage.getItem('username') || 'admin',
    name: localStorage.getItem('user_name') || 'Humam Abdul Azis',
    email: localStorage.getItem('email') || '',
    hp: localStorage.getItem('no_hp') || '',
    foto_url: localStorage.getItem('foto_url') || '',
    foto_base64: localStorage.getItem('foto_base64') || '',
    password: ''
  });
  
  const [form, setForm] = useState({
    tgl_cutting: getLocalDate(),
    kain_id: '',
    produk_id: '',
    kg_pakai: '',
    hasil_pcs: '',
    tukang_potong_id: '',
    ongkos_per_pcs: '1500',
  });

  const fetchData = async () => {
    try {
      const [optRes, histRes, statRes] = await Promise.all([
        getProduksiOptions(),
        getRekapCutting(),
        getCuttingStats()
      ]);
      
      if (optRes?.data) setOptions(optRes.data);
      if (histRes?.data?.rincian_harian) setRecentActivity(histRes.data.rincian_harian.slice(0, 10));
      if (statRes?.success && statRes?.data) setStats(statRes.data);

      if (optRes?.data?.kain_list?.length > 0 && !form.kain_id) setForm(s => ({ ...s, kain_id: optRes.data.kain_list[0].id }));
      if (optRes?.data?.baju_list?.length > 0 && !form.produk_id) setForm(s => ({ ...s, produk_id: optRes.data.baju_list[0].id }));
      if (optRes?.data?.karyawan_list?.length > 0 && !form.tukang_potong_id) setForm(s => ({ ...s, tukang_potong_id: optRes.data.karyawan_list[0].id }));
    } catch (err) {
      setMsg({ text: 'Koneksi terganggu.', type: 'error' });
    }
  };

  const fetchHistory = async (p) => {
    setLoading(true);
    setMsg({ text: '', type: '' });
    try {
      const res = await getCuttingHistory(p || historyPeriode);
      if (res?.success) {
        setHistoryData(res.data);
      } else {
        setMsg({ text: `Riwayat: ${res.message}`, type: 'error' });
      }
    } catch (err) {
      setMsg({ text: 'Gagal mengambil riwayat.', type: 'error' });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();

    // REAL-TIME: Polling setiap 30 detik untuk update stats & data terbaru
    const interval = setInterval(() => {
      if (activeTab === 'dashboard') fetchData();
      if (activeTab === 'history') fetchHistory();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 'history') fetchHistory();
  }, [activeTab, historyPeriode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ text: '', type: '' });
    try {
      await submitCutting({
        ...form,
        tgl_cutting: form.tgl_cutting === getLocalDate() ? getLocalTimestamp() : form.tgl_cutting,
        kain_id: Number(form.kain_id),
        produk_id: Number(form.produk_id),
        kg_pakai: Number(form.kg_pakai),
        hasil_pcs: Number(form.hasil_pcs),
        tukang_potong_id: Number(form.tukang_potong_id),
        ongkos_per_pcs: Number(form.ongkos_per_pcs),
      });
      setMsg({ text: '✅ Berhasil!', type: 'success' });
      setForm(prev => ({ ...prev, kg_pakai: '', hasil_pcs: '' }));
      fetchData(); 
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setMsg({ text: err.message, type: 'error' });
    }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ text: '', type: '' });
    try {
      const res = await updateProfile({
        id: localStorage.getItem('user_id'),
        username: localStorage.getItem('username'),
        new_username: profileForm.username,
        nama_lengkap: profileForm.name,
        email: profileForm.email,
        no_hp: profileForm.hp,
        foto_base64: profileForm.foto_base64, // Kirim foto baru
        password: profileForm.password
      });

      if (res.status === 'success') {
        setMsg({ text: '✅ Profil Berhasil Disinkronkan!', type: 'success' });
        // Update LocalStorage agar UI web/mobile lain ikut berubah
        localStorage.setItem('username', res.user.username);
        localStorage.setItem('user_name', res.user.nama_lengkap);
        localStorage.setItem('email', res.user.email || '');
        localStorage.setItem('no_hp', res.user.no_hp || '');
        localStorage.setItem('foto_url', res.user.foto_url || '');
        localStorage.setItem('foto_base64', res.user.foto_base64 || '');
        
        // Jika token baru dikirim (karena ganti username), simpan
        if (res.access_token) {
          localStorage.setItem('access_token', res.access_token);
        }
        
        setProfileForm(prev => ({ ...prev, password: '' })); // Kosongkan password field
      } else {
        setMsg({ text: `Gagal: ${res.message}`, type: 'error' });
      }
    } catch (err) {
      setMsg({ text: err.message || 'Terjadi kesalahan sistem', type: 'error' });
    }
    setLoading(false);
  };

  const getTitle = () => {
    if (activeTab === 'input') return 'Input Cutting';
    if (activeTab === 'history') return 'Riwayat Cutting';
    if (activeTab === 'dashboard') return 'Statistik Cutting';
    return 'Profil Saya';
  };

  const getHeaderIcon = () => {
    if (activeTab === 'input') return 'edit_square';
    if (activeTab === 'history') return 'history';
    if (activeTab === 'dashboard') return 'leaderboard';
    return 'account_circle';
  };

  const FooterInfo = () => (
    <div className="mt-12 mb-8 flex flex-col items-center animate-in fade-in duration-1000">
       <div className="flex items-center gap-3 mb-6 bg-white/5 px-6 py-3 rounded-2xl border border-white/5">
          <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center border border-emerald-500/20">
             <span className="material-symbols-rounded text-emerald-500 text-lg">integration_instructions</span>
          </div>
          <div className="text-left">
             <p className="text-[7px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none mb-1">Developed By</p>
             <h4 className="text-xs font-black text-white tracking-widest leading-none">ANSA <span className="text-emerald-500">ENTERPRISE</span></h4>
          </div>
       </div>
       <div className="text-center space-y-1">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">© 2026 RAZIQ GARMEN</p>
          <p className="text-[7px] font-bold text-slate-700 uppercase tracking-widest">Sistem Informasi Manajemen Produksi & Keuangan Terintegrasi</p>
       </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans pb-32">
      
      {/* ── HEADER ── */}
      {activeTab !== 'profile' && (
        <div className="bg-emerald-600/90 backdrop-blur-md p-5 rounded-b-[2.5rem] shadow-2xl sticky top-0 z-50 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-xl border border-white/30">
              <span className="material-symbols-rounded text-white text-2xl">{getHeaderIcon()}</span>
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight uppercase leading-none">{getTitle()}</h1>
              <p className="text-[9px] font-bold text-emerald-100/60 uppercase tracking-[0.2em] mt-1">Raziq Garment</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {(activeTab === 'dashboard' || activeTab === 'history') && (
              <button onClick={() => activeTab === 'dashboard' ? fetchData() : fetchHistory()} 
                className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center border border-white/20 active:rotate-180 transition-transform">
                <span className="material-symbols-rounded text-xl">refresh</span>
              </button>
            )}
            <button onClick={handleLogout} className="w-10 h-10 bg-red-500/20 rounded-full text-red-200 flex items-center justify-center border border-red-500/20 shadow-inner">
              <span className="material-symbols-rounded text-xl">logout</span>
            </button>
          </div>
        </div>
      )}

      <div className={`${activeTab === 'profile' ? 'p-0' : 'p-4'} w-full`}>
        {/* MESSAGES */}
        {msg.text && (
          <div className={`mx-4 mt-4 p-4 rounded-3xl mb-6 animate-in zoom-in flex items-center gap-4 border shadow-2xl ${
            msg.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-200' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'
          }`}>
            <span className="material-symbols-rounded">{msg.type === 'error' ? 'report' : 'verified'}</span>
            <span className="text-[11px] font-black uppercase tracking-wider">{msg.text}</span>
          </div>
        )}

        {/* ── TAB 1: INPUT ────────────────── */}
        {activeTab === 'input' && (
          <div className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-[#0f172a] border border-white/5 p-6 rounded-[2.5rem] space-y-5 shadow-inner">
                <div className="flex items-center gap-2 mb-2">
                   <span className="material-symbols-rounded text-emerald-500 text-sm">inventory_2</span>
                   <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Kombinasi Produksi</h2>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-600 uppercase ml-4">Material Kain</label>
                  <select className="w-full bg-white/5 border-2 border-white/5 rounded-2xl p-4 text-sm font-black text-white focus:border-emerald-500 outline-none appearance-none"
                    value={form.kain_id} onChange={e => setForm({...form, kain_id: e.target.value})}>
                    {(options.kain_list || []).map(k => <option key={k.id} value={k.id} className="bg-slate-900">{k.label}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-600 uppercase ml-4">SKU Produk</label>
                  <select className="w-full bg-white/5 border-2 border-white/5 rounded-2xl p-4 text-sm font-black text-white focus:border-emerald-500 outline-none appearance-none"
                    value={form.produk_id} onChange={e => setForm({...form, produk_id: e.target.value})}>
                    {(options.baju_list || []).map(b => <option key={b.id} value={b.id} className="bg-slate-900">{b.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="bg-[#0f172a] border border-white/5 p-6 rounded-[2.5rem] grid grid-cols-2 gap-4 shadow-2xl">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-600 uppercase text-center block">Berat (Kg)</label>
                  <input type="number" step="0.1" className="w-full bg-white/5 border-2 border-white/5 rounded-2xl p-5 text-2xl font-black text-emerald-400 outline-none text-center shadow-inner"
                    placeholder="0.0" value={form.kg_pakai} onChange={e => setForm({...form, kg_pakai: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-600 uppercase text-center block">Hasil (Pcs)</label>
                  <input type="number" className="w-full bg-white/5 border-2 border-white/5 rounded-2xl p-5 text-2xl font-black text-blue-400 outline-none text-center shadow-inner"
                    placeholder="0" value={form.hasil_pcs} onChange={e => setForm({...form, hasil_pcs: e.target.value})} required />
                </div>
              </div>

              <div className="bg-[#0f172a] border border-white/5 p-6 rounded-[2.5rem] space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-600 uppercase ml-4">Petugas Cutting</label>
                  <select className="w-full bg-white/5 border-2 border-white/5 rounded-2xl p-4 text-sm font-black outline-none appearance-none"
                    value={form.tukang_potong_id} onChange={e => setForm({...form, tukang_potong_id: e.target.value})}>
                    {(options.karyawan_list || []).map(k => <option key={k.id} value={k.id} className="bg-slate-900">{k.label}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-600 uppercase ml-4 text-center block">Upah per Pcs (Rp)</label>
                  <input type="text" className="w-full bg-white/5 border-2 border-white/5 rounded-2xl p-4 text-lg font-black text-blue-300 text-center outline-none"
                    value={formatInputNumber(form.ongkos_per_pcs)} onChange={e => setForm({...form, ongkos_per_pcs: parseNumber(e.target.value)})} required />
                </div>
              </div>

              <button type="submit" disabled={loading} className={`w-full p-6 rounded-3xl font-black text-lg tracking-widest shadow-2xl transition-all active:scale-95 flex justify-center items-center gap-3 ${
                loading ? 'bg-slate-800 text-slate-600' : 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-emerald-500/20'
              }`}>
                <span className="material-symbols-rounded text-2xl">{loading ? 'sync' : 'verified_user'}</span>
                {loading ? 'STORING...' : 'SIMPAN DATA'}
              </button>
            </form>

            <div className="pt-6 space-y-4">
              <h2 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] ml-4">Aktivitas Terakhir</h2>
              {(recentActivity || []).map((h, idx) => (
                <div key={idx} className="bg-white/5 border border-white/5 p-5 rounded-[2rem] flex justify-between items-center shadow-lg">
                  <div className="flex flex-col">
                    <span className="text-xs font-black uppercase text-white tracking-wide">{h.tukang_potong}</span>
                    <span className="text-[9px] font-bold text-slate-500 mt-1 uppercase">{h.nama_kain} • {h.nama_baju}</span>
                  </div>
                  <div className="text-right">
                    <div className="bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 mb-1">
                      <span className="text-sm font-black text-emerald-400">{h.hasil_potong}</span>
                    </div>
                    <p className="text-[8px] text-slate-600 font-bold uppercase tracking-tighter">{h.waktu}</p>
                  </div>
                </div>
              ))}
            </div>
            <FooterInfo />
          </div>
        )}

        {/* ── TAB 2: RIWAYAT CUTTING ────────────────── */}
        {activeTab === 'history' && (
          <div className="space-y-6 animate-in slide-in-from-right-10 duration-500">
            <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar -mx-2 px-2">
              {[
                { id: 'hari_ini', label: 'Hari Ini' }, { id: 'semua', label: 'Semua' }, { id: 'minggu_ini', label: 'Mgg Ini' },
                { id: 'minggu_1', label: 'Mgg 1' }, { id: 'minggu_2', label: 'Mgg 2' }, { id: 'minggu_3', label: 'Mgg 3' },
                { id: 'minggu_4', label: 'Mgg 4' }, { id: 'bulan_ini', label: 'Bulan Ini' },
              ].map(p => (
                <button key={p.id} onClick={() => setHistoryPeriode(p.id)}
                  className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap border-2 transition-all shadow-lg ${
                    historyPeriode === p.id ? 'bg-amber-600 border-amber-500 text-white scale-105' : 'bg-slate-900 border-white/5 text-slate-500'
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>
            <div className="space-y-5 px-4">
              {historyData.map((item, idx) => (
                <div key={idx} 
                  onClick={() => setSelectedHistory(item)}
                  className="bg-[#0f172a] border border-white/5 rounded-[2.5rem] shadow-2xl overflow-hidden active:scale-95 transition-all cursor-pointer">
                   <div className="bg-white/5 p-4 flex justify-between items-center border-b border-white/5">
                      <span className="text-[10px] font-black uppercase text-slate-200 tracking-widest">{item.karyawan}</span>
                      <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter">{item.tanggal}</span>
                   </div>
                   <div className="p-6 space-y-5">
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-1">
                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Material</p>
                            <h4 className="text-xs font-black text-white uppercase">{item.kain}</h4>
                            <p className="text-[10px] font-black text-emerald-500">{item.kg} <span className="text-[8px] text-slate-500">KG</span></p>
                         </div>
                         <div className="space-y-1 text-right">
                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Model Jadi</p>
                            <h4 className="text-xs font-black text-blue-400 uppercase">{item.produk}</h4>
                            <p className="text-[9px] font-bold text-slate-600">{item.sku}</p>
                         </div>
                      </div>
                      <div className="bg-white/5 rounded-2xl p-4 flex justify-around items-center">
                         <div className="text-center">
                            <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Hasil (Pcs)</p>
                            <span className="text-xl font-black text-white">{item.qty}</span>
                         </div>
                         <div className="text-center">
                            <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Total (Lusin)</p>
                            <span className="text-xl font-black text-amber-400">{item.lusin}</span>
                         </div>
                      </div>
                      <div className="flex justify-center">
                        <span className="text-[8px] font-black text-slate-700 uppercase tracking-[0.3em] flex items-center gap-1">
                          Klik untuk rincian <span className="material-symbols-rounded text-[10px]">expand_more</span>
                        </span>
                      </div>
                   </div>
                </div>
              ))}
            </div>
            <FooterInfo />
          </div>
        )}

        {/* ── TAB 3: STATISTIK CUTTING ────────────────── */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 px-4 animate-in fade-in duration-700">
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-8 rounded-[3rem] shadow-xl text-center relative overflow-hidden group">
                <span className="material-symbols-rounded absolute -right-6 -bottom-6 text-[10rem] text-white/10 rotate-12">insights</span>
                <p className="text-[10px] font-black text-emerald-100 uppercase tracking-[0.4em] mb-2">Output Hari Ini</p>
                <div className="flex items-center justify-center gap-3">
                  <h3 className="text-7xl font-black text-white tracking-tighter">{(stats?.hari_ini || 0).toLocaleString('id-ID')}</h3>
                  <span className="text-xl font-bold text-emerald-50">PCS</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0f172a] border border-white/10 p-6 rounded-[2.5rem] shadow-xl text-center">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Minggu Ini</p>
                  <h3 className="text-3xl font-black text-emerald-400">{(stats?.minggu_ini || 0).toLocaleString('id-ID')}</h3>
                </div>
                <div className="bg-[#0f172a] border border-white/10 p-6 rounded-[2.5rem] shadow-xl text-center">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Bulan Ini</p>
                  <h3 className="text-3xl font-black text-blue-400">{(stats?.bulan_ini || 0).toLocaleString('id-ID')}</h3>
                </div>
              </div>
            </div>

            {/* LEADERBOARD (KARYAWAN) */}
            <div className="bg-white/5 border border-white/5 rounded-[2.5rem] p-7 space-y-6 shadow-2xl backdrop-blur-sm">
              <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-3">
                <span className="material-symbols-rounded text-emerald-500">workspace_premium</span> Top Cutter Bulan Ini
              </h2>
              <div className="space-y-1">
                {(stats?.top_karyawan || []).map((k, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-all">
                    <div className="flex items-center gap-4">
                       <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[10px] ${i === 0 ? 'bg-amber-500 text-amber-950' : 'bg-slate-800 text-slate-500'}`}>{i + 1}</span>
                       <span className="text-xs font-black text-slate-200 uppercase tracking-wide">{k.nama}</span>
                    </div>
                    <span className="text-base font-black text-emerald-400 tabular-nums">{k.total.toLocaleString('id-ID')} <span className="text-[9px] text-slate-600">PCS</span></span>
                  </div>
                ))}
              </div>
            </div>

            {/* TOP SKU CHARTS */}
            <div className="bg-white/5 border border-white/5 rounded-[2.5rem] p-7 space-y-6 shadow-2xl backdrop-blur-sm">
              <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-3">
                <span className="material-symbols-rounded text-blue-500">inventory</span> Top SKU Bulan Ini
              </h2>
              <div className="space-y-6">
                {(stats?.top_produk || []).map((p, i) => {
                  const maxVal = (stats?.top_produk?.length > 0) ? stats.top_produk[0].total : 1;
                  const pct = ((p.total || 0) / (maxVal || 1)) * 100;
                  return (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between px-2">
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-wider">{p.nama}</span>
                        <span className="text-[10px] font-black text-white">{p.total.toLocaleString('id-ID')} <span className="text-slate-600">pcs</span></span>
                      </div>
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <div className={`h-full rounded-full transition-all duration-1000 ${i === 0 ? 'bg-gradient-to-r from-blue-600 to-indigo-400 shadow-[0_0_10px_rgba(37,99,235,0.3)]' : 'bg-slate-700'}`} style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* LEADERBOARD PENGHASILAN (RUPIAH) */}
            <div className="bg-white/5 border border-white/5 rounded-[2.5rem] p-7 space-y-6 shadow-2xl backdrop-blur-sm">
              <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-3 px-2">
                <span className="material-symbols-rounded text-amber-500">payments</span> Penghasilan Cutter (Bulan Ini)
              </h2>
              <div className="space-y-1">
                {(stats?.top_penghasilan || []).map((k, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-all">
                    <div className="flex items-center gap-4">
                       <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[10px] ${i === 0 ? 'bg-amber-500 text-amber-950 shadow-lg' : 'bg-slate-800 text-slate-500'}`}>{i + 1}</span>
                       <span className="text-xs font-black text-slate-200 uppercase tracking-wide">{k.nama}</span>
                    </div>
                    <span className="text-sm font-black text-amber-400 tabular-nums">
                      Rp {(k.total || 0).toLocaleString('id-ID')}
                    </span>
                  </div>
                ))}
                {(!stats?.top_penghasilan || stats.top_penghasilan.length === 0) && (
                  <p className="text-center text-[10px] text-slate-600 font-bold uppercase tracking-widest py-4">Belum ada data bulan ini</p>
                )}
              </div>
            </div>
            <FooterInfo />
          </div>
        )}

        {/* ── TAB 4: PROFIL SAYA ────────────────── */}
        {activeTab === 'profile' && (
          <div className="animate-in fade-in duration-500 bg-white min-h-screen">
            <div className="p-6 pt-10">
               <div className="bg-[#064e3b] rounded-[2.5rem] p-8 flex items-center gap-6 shadow-2xl relative overflow-hidden">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white/20 shadow-lg flex-shrink-0">
                     <img 
                       src={profileForm.foto_base64 || profileForm.foto_url || "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=400&fit=crop"} 
                       alt="avatar" 
                       className="w-full h-full object-cover" 
                     />
                  </div>
                  <div className="relative z-10">
                     <h2 className="text-3xl font-bold text-white tracking-tight leading-none">Profil Saya</h2>
                     <p className="text-[10px] font-bold text-emerald-200/60 uppercase tracking-[0.2em] mt-2">Kelola Informasi Pribadi Anda</p>
                  </div>
                  <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full"></div>
               </div>
            </div>

            <div className="px-6 pb-20">
               <div className="bg-slate-50 rounded-[3.5rem] p-8 shadow-sm border border-slate-100">
                  <div className="flex flex-col items-center mb-10">
                     <div className="w-48 h-48 rounded-[3rem] overflow-hidden border-4 border-white shadow-2xl mb-4 relative group">
                        <img 
                          src={profileForm.foto_base64 || profileForm.foto_url || "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=400&fit=crop"} 
                          alt="profile large" 
                          className="w-full h-full object-cover" 
                        />
                        <label className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                           <span className="material-symbols-rounded text-white text-4xl">photo_camera</span>
                           <input 
                             type="file" 
                             accept="image/*" 
                             className="hidden" 
                             onChange={async (e) => {
                               const file = e.target.files[0];
                               if (!file) return;
                               
                               const formData = new FormData();
                               formData.append('file', file);
                               
                               try {
                                 setLoading(true);
                                 const res = await api.post('/users/upload-photo', formData, {
                                   headers: { 'Content-Type': 'multipart/form-data' }
                                 });
                                 if (res.data.status === 'success') {
                                   setProfileForm(prev => ({ ...prev, foto_base64: res.data.url }));
                                   setMsg({ text: '📸 Foto terpilih! Klik simpan untuk permanen.', type: 'success' });
                                 }
                               } catch (err) {
                                 setMsg({ text: 'Gagal upload foto', type: 'error' });
                               } finally {
                                 setLoading(false);
                               }
                             }}
                           />
                        </label>
                     </div>
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Klik gambar untuk mengubah foto</p>
                  </div>

                  <div className="space-y-6">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Username Login</label>
                        <input type="text" className="w-full bg-slate-100/50 border border-transparent rounded-2xl p-5 text-base font-bold text-slate-800 outline-none focus:border-emerald-500 focus:bg-white transition-all"
                          value={profileForm.username} onChange={e => setProfileForm({...profileForm, username: e.target.value})} />
                        <p className="text-[8px] italic text-slate-400 ml-1">Ganti username ini jika ingin mengubah ID untuk login.</p>
                     </div>

                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Lengkap</label>
                        <input type="text" className="w-full bg-slate-100/50 border border-transparent rounded-2xl p-5 text-base font-bold text-slate-800 outline-none focus:border-emerald-500 focus:bg-white transition-all"
                          value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} />
                     </div>

                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                        <input type="email" className="w-full bg-slate-100/50 border border-transparent rounded-2xl p-5 text-base font-bold text-slate-800 outline-none focus:border-emerald-500 focus:bg-white transition-all"
                          value={profileForm.email} onChange={e => setProfileForm({...profileForm, email: e.target.value})} />
                     </div>

                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nomor HP</label>
                        <input type="tel" className="w-full bg-slate-100/50 border border-transparent rounded-2xl p-5 text-base font-bold text-slate-800 outline-none focus:border-emerald-500 focus:bg-white transition-all"
                          placeholder="" value={profileForm.hp} onChange={e => setProfileForm({...profileForm, hp: e.target.value})} />
                     </div>

                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password Baru (Kosongkan jika tidak ganti)</label>
                        <input type="password" placeholder="••••••••" className="w-full bg-slate-100/50 border border-transparent rounded-2xl p-5 text-base font-bold text-slate-800 outline-none focus:border-emerald-500 focus:bg-white transition-all"
                          value={profileForm.password} onChange={e => setProfileForm({...profileForm, password: e.target.value})} />
                     </div>

                     <button 
                        onClick={handleSaveProfile}
                        disabled={loading}
                        className={`w-full font-black py-6 rounded-3xl mt-8 shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 ${
                          loading ? 'bg-slate-300 text-slate-500' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                        }`}
                     >
                        <span className={`material-symbols-rounded ${loading ? 'animate-spin' : ''}`}>
                          {loading ? 'sync' : 'save'}
                        </span>
                        {loading ? 'MENYIMPAN...' : 'SIMPAN PERUBAHAN PROFIL'}
                     </button>

                     <button onClick={handleLogout} className="w-full bg-red-50 text-red-500 font-black py-6 rounded-3xl mt-4 border border-red-100 active:scale-[0.98] transition-all">
                        KELUAR APLIKASI
                     </button>
                  </div>
               </div>
               <div className="text-[#020617]">
                  <FooterInfo />
               </div>
            </div>
          </div>
        )}
      </div>

      {/* ── BOTTOM NAVIGATION (4 BUTTONS) ── */}
      <div className="fixed bottom-8 left-6 right-6 z-[60]">
        <div className="bg-[#0f172a]/80 backdrop-blur-2xl border border-white/10 p-2 rounded-[2.5rem] shadow-[0_25px_60px_rgba(0,0,0,0.6)] flex items-center justify-around gap-1">
          <button onClick={() => setActiveTab('input')}
            className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-3xl transition-all duration-500 ${activeTab === 'input' ? 'bg-emerald-600 text-white shadow-xl scale-105' : 'text-slate-500'}`}>
            <span className="material-symbols-rounded text-xl">edit_document</span>
            <span className="text-[8px] font-black uppercase tracking-[0.1em]">Input</span>
          </button>
          
          <button onClick={() => setActiveTab('history')}
            className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-3xl transition-all duration-500 ${activeTab === 'history' ? 'bg-amber-500 text-amber-950 shadow-xl scale-105' : 'text-slate-500'}`}>
            <span className="material-symbols-rounded text-xl">history</span>
            <span className="text-[8px] font-black uppercase tracking-[0.1em]">Riwayat</span>
          </button>

          <button onClick={() => { setActiveTab('dashboard'); fetchData(); }}
            className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-3xl transition-all duration-500 ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-xl scale-105' : 'text-slate-500'}`}>
            <span className="material-symbols-rounded text-xl">monitoring</span>
            <span className="text-[8px] font-black uppercase tracking-[0.1em]">Stats</span>
          </button>

          <button onClick={() => setActiveTab('profile')}
            className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-3xl transition-all duration-500 ${activeTab === 'profile' ? 'bg-white text-emerald-950 shadow-xl scale-105' : 'text-slate-500'}`}>
            <span className="material-symbols-rounded text-xl">person</span>
            <span className="text-[8px] font-black uppercase tracking-[0.1em]">Profil</span>
          </button>
      </div>

      {/* ── DETAIL MODAL (BOTTOM SHEET) ── */}
      {selectedHistory && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300" 
          onClick={() => setSelectedHistory(null)}>
          <div className="bg-[#0f172a] w-full max-w-md rounded-[3rem] shadow-2xl border border-white/10 animate-in slide-in-from-bottom-20 duration-500"
            onClick={e => e.stopPropagation()}>
            <div className="p-8 space-y-8">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight leading-none">Rincian Produksi</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-2">{selectedHistory.tanggal}</p>
                </div>
                <button onClick={() => setSelectedHistory(null)} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                  <span className="material-symbols-rounded">close</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-5 rounded-3xl space-y-1">
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Karyawan</p>
                  <p className="text-sm font-black text-white uppercase">{selectedHistory.karyawan}</p>
                </div>
                <div className="bg-white/5 p-5 rounded-3xl space-y-1">
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Model SKU</p>
                  <p className="text-sm font-black text-blue-400 uppercase">{selectedHistory.sku}</p>
                </div>
              </div>

              <div className="space-y-4">
                 <div className="flex justify-between items-center border-b border-white/5 pb-4 px-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Material Kain</span>
                    <span className="text-xs font-black text-slate-200">{selectedHistory.kain}</span>
                 </div>
                 <div className="flex justify-between items-center border-b border-white/5 pb-4 px-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Berat Kain Pakai</span>
                    <span className="text-xs font-black text-emerald-400">{selectedHistory.kg} KG</span>
                 </div>
                 <div className="flex justify-between items-center border-b border-white/5 pb-4 px-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hasil Produksi</span>
                    <span className="text-xs font-black text-white">{selectedHistory.qty} Pcs ({(selectedHistory.qty/12).toFixed(1)} Lsn)</span>
                 </div>
                 <div className="flex justify-between items-center pt-2 px-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Efisiensi (Pcs/Kg)</span>
                    <span className="text-xs font-black text-amber-400">{(selectedHistory.qty / (selectedHistory.kg || 1)).toFixed(2)} Pcs/Kg</span>
                 </div>
              </div>

              <div className="bg-emerald-600/10 border border-emerald-500/20 p-6 rounded-[2.5rem] flex justify-between items-center">
                 <div>
                    <p className="text-[9px] font-black text-emerald-200 uppercase tracking-widest mb-1">Estimasi Upah</p>
                    <h4 className="text-2xl font-black text-white">Rp {(selectedHistory.qty * 1500).toLocaleString('id-ID')}</h4>
                 </div>
                 <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="material-symbols-rounded text-white">payments</span>
                 </div>
              </div>

              <button onClick={() => setSelectedHistory(null)} className="w-full bg-white/10 py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] hover:bg-white/20 transition-colors">
                TUTUP RINCIAN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
