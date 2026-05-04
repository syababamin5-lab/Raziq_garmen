import React, { useState, useEffect } from 'react';
import {
  getProduksiOptions, submitCutting, submitJahit, getRekapCutting, getWip,
  submitSaldoAwalWip, getSaldoAwalWipList, deleteSaldoAwalWip
} from '../api/produksiApi';
import { formatInputNumber, parseNumber } from '../utils/formatters';

export default function Produksi() {
  const [activeTab, setActiveTab] = useState('cutting');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  // Master Data
  const [options, setOptions] = useState({ kain_list: [], baju_list: [], karyawan_list: [] });
  
  // Tab Rekap & WIP
  const [rekapData, setRekapData] = useState(null);
  const [wipData, setWipData] = useState(null);

  // Tab Setup WIP Awal
  const [wipAwalList, setWipAwalList] = useState(null);
  const TAHAP_OPTIONS = ['Siap Jahit','Siap Finishing','Siap QC','Siap Packing','Siap Kirim','Lainnya'];
  const [wipAwalForm, setWipAwalForm] = useState({
    tanggal_cutoff: new Date().toISOString().split('T')[0],
    produk_id: '',
    qty_pcs: '',
    tahap_saat_ini: 'Siap Jahit',
    modal_bahan_baku: '',
    modal_upah_cutting: '',
    modal_lain: '',
    keterangan: '',
  });

  // Form State Cutting
  const [cuttingForm, setCuttingForm] = useState({
    tgl_cutting: new Date().toISOString().split('T')[0],
    kain_id: '',
    produk_id: '',
    kg_pakai: '',
    hasil_pcs: '',
    tukang_potong_id: '',
    ongkos_per_pcs: '',
  });

  // Form State Jahit
  const [jahitForm, setJahitForm] = useState({
    tgl_jahit: new Date().toISOString().split('T')[0],
    produk_id: '',
    qty_lusin: '',
  });

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isBos = user.role === 'bos';

  const fetchOptions = async () => {
    try {
      const res = await getProduksiOptions();
      setOptions(res.data);
      if (res.data.kain_list.length > 0) setCuttingForm(s => ({ ...s, kain_id: res.data.kain_list[0].id }));
      if (res.data.baju_list.length > 0) {
        setCuttingForm(s => ({ ...s, produk_id: res.data.baju_list[0].id }));
        setJahitForm(s => ({ ...s, produk_id: res.data.baju_list[0].id }));
      }
      if (res.data.karyawan_list.length > 0) setCuttingForm(s => ({ ...s, tukang_potong_id: res.data.karyawan_list[0].id }));
    } catch (err) {
      console.error(err);
      setMsg({ text: 'Gagal memuat master data.', type: 'error' });
    }
  };

  const loadRekap = async () => {
    setLoading(true);
    try { const res = await getRekapCutting(); setRekapData(res.data); } catch(err) { console.error(err); }
    setLoading(false);
  };

  const loadWip = async () => {
    setLoading(true);
    try { const res = await getWip(); setWipData(res.data); } catch(err) { console.error(err); }
    setLoading(false);
  };

  const loadWipAwal = async () => {
    setLoading(true);
    try { const res = await getSaldoAwalWipList(); setWipAwalList(res.data); } catch(err) { console.error(err); }
    setLoading(false);
  };

  const handleWipAwalSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setMsg({ text: '', type: '' });
    try {
      if (!wipAwalForm.produk_id) throw new Error('Pilih model baju terlebih dahulu!');
      if (!wipAwalForm.qty_pcs || Number(wipAwalForm.qty_pcs) <= 0) throw new Error('Jumlah pcs harus diisi!');
      const totalModal = (parseNumber(wipAwalForm.modal_bahan_baku)||0) +
                         (parseNumber(wipAwalForm.modal_upah_cutting)||0) +
                         (parseNumber(wipAwalForm.modal_lain)||0);
      if (totalModal <= 0) throw new Error('Minimal satu komponen biaya harus diisi (Bahan/Upah/Lain)!');
      const res = await submitSaldoAwalWip({
        tanggal_cutoff: wipAwalForm.tanggal_cutoff,
        produk_id: Number(wipAwalForm.produk_id),
        qty_pcs: Number(wipAwalForm.qty_pcs),
        tahap_saat_ini: wipAwalForm.tahap_saat_ini,
        modal_bahan_baku: parseNumber(wipAwalForm.modal_bahan_baku) || 0,
        modal_upah_cutting: parseNumber(wipAwalForm.modal_upah_cutting) || 0,
        modal_lain: parseNumber(wipAwalForm.modal_lain) || 0,
        keterangan: wipAwalForm.keterangan,
        dibuat_oleh: user.username || 'admin',
      });
      setMsg({ text: res.message, type: 'success' });
      setWipAwalForm(prev => ({
        ...prev, qty_pcs: '', modal_bahan_baku: '', modal_upah_cutting: '', modal_lain: '', keterangan: ''
      }));
      loadWipAwal();
    } catch(err) {
      setMsg({ text: err.message, type: 'error' });
    }
    setLoading(false);
  };

  const handleDeleteWipAwal = async (id, nama) => {
    if (!window.confirm(`Hapus entri WIP Awal "${nama}"? Jurnal terkait juga akan dihapus.`)) return;
    setLoading(true);
    try {
      const res = await deleteSaldoAwalWip(id);
      setMsg({ text: res.message, type: 'success' });
      loadWipAwal();
    } catch(err) {
      setMsg({ text: err.message, type: 'error' });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    if (activeTab === 'rekap') loadRekap();
    if (activeTab === 'wip') loadWip();
    if (activeTab === 'wip_awal') loadWipAwal();
  }, [activeTab]);

  const handleCuttingSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setMsg({text:'', type:''});
    try {
      if(!cuttingForm.kain_id || !cuttingForm.produk_id || !cuttingForm.tukang_potong_id) {
          throw new Error("Pilih semua field yang wajib!");
      }
      const selectedDate = new Date(cuttingForm.tgl_cutting);
      const now = new Date();
      selectedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

      const res = await submitCutting({
        ...cuttingForm,
        tgl_cutting: selectedDate.toISOString(),
        kain_id: Number(cuttingForm.kain_id),
        produk_id: Number(cuttingForm.produk_id),
        kg_pakai: Number(cuttingForm.kg_pakai),
        hasil_pcs: Number(cuttingForm.hasil_pcs),
        tukang_potong_id: Number(cuttingForm.tukang_potong_id),
        ongkos_per_pcs: Number(cuttingForm.ongkos_per_pcs),
      });
      setMsg({ text: res.message, type: 'success' });
      // Reset Form
      setCuttingForm(prev => ({
        ...prev,
        kg_pakai: '',
        hasil_pcs: '',
        ongkos_per_pcs: ''
      }));
      fetchOptions(); // Refresh stok
    } catch (err) {
      setMsg({ text: err.message, type: 'error' });
    }
    setLoading(false);
  };

  const handleJahitSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setMsg({text:'', type:''});
    try {
      if(!jahitForm.produk_id) throw new Error("Pilih produk!");
      const selectedDate = new Date(jahitForm.tgl_jahit);
      const now = new Date();
      selectedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

      const res = await submitJahit({
        ...jahitForm,
        tgl_jahit: selectedDate.toISOString(),
        produk_id: Number(jahitForm.produk_id),
        qty_lusin: Number(jahitForm.qty_lusin)
      });
      setMsg({ text: res.message, type: 'success' });
      // Reset Form
      setJahitForm(prev => ({
        ...prev,
        qty_lusin: ''
      }));
      fetchOptions();
    } catch (err) {
      setMsg({ text: err.message, type: 'error' });
    }
    setLoading(false);
  };

  const TABS = [
    { id: 'cutting', label: 'Cutting (Kg → Pcs)', icon: 'content_cut' },
    { id: 'jahit', label: 'Jahit/Finishing (Pcs → Lusin)', icon: 'checkroom' },
    { id: 'rekap', label: 'Rekap Tagihan Cutting', icon: 'payments' },
    { id: 'wip', label: 'WIP Cutting', icon: 'inventory_2' },
    { id: 'wip_awal', label: '⚙️ Setup WIP Awal (Cut-off)', icon: 'settings_backup_restore', isSetup: true },
  ];

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
          <span className="material-symbols-rounded text-emerald-600">content_cut</span>
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-800">Produksi Harian</h1>
          <p className="text-sm text-slate-500 font-medium">Catat flow pemotongan kain dan penyelesaian barang jadi.</p>
        </div>
      </div>

      {msg.text && (
        <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 ${msg.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
          <span className="material-symbols-rounded">{msg.type === 'error' ? 'error' : 'check_circle'}</span>
          <span className="text-sm font-semibold">{msg.text}</span>
        </div>
      )}

      {/* TABS HEADER */}
      <div className="flex border-b border-surface-border mb-6 overflow-x-auto custom-scrollbar">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setMsg({text:'', type:''}); }}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm tracking-wide transition-all whitespace-nowrap ${
              tab.isSetup
                ? activeTab === tab.id
                  ? 'border-amber-500 text-amber-700 bg-amber-50/60'
                  : 'border-transparent text-amber-600 hover:text-amber-700 hover:bg-amber-50/40'
                : activeTab === tab.id 
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50' 
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <span className="material-symbols-rounded text-[20px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      <div className="card animate-fade-in-up">
        
        {/* CUTTING */}
        {activeTab === 'cutting' && (
          <form onSubmit={handleCuttingSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Pilih Kain</label>
                <select className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg p-2.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
                        value={cuttingForm.kain_id} onChange={e => setCuttingForm({...cuttingForm, kain_id: e.target.value})}>
                  {options.kain_list.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Model Baju</label>
                <select className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg p-2.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
                        value={cuttingForm.produk_id} onChange={e => setCuttingForm({...cuttingForm, produk_id: e.target.value})}>
                  {options.baju_list.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
                </select>
              </div>
            </div>

            <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Tanggal Pemotongan</label>
                <input type="date" value={cuttingForm.tgl_cutting} onChange={e => setCuttingForm({...cuttingForm, tgl_cutting: e.target.value})} className="w-full md:w-1/3 bg-white border border-slate-200 text-slate-700 text-sm rounded-lg p-2.5 outline-none focus:border-emerald-500 font-medium"/>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">Kain Terpakai (Kg)</label>
                  <input type="number" step="0.1" min="0.1" value={cuttingForm.kg_pakai} onChange={e => setCuttingForm({...cuttingForm, kg_pakai: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg p-2 font-bold text-slate-700 outline-none focus:border-emerald-500" placeholder="0.0"/>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">Hasil (Pcs)</label>
                  <input type="number" min="1" value={cuttingForm.hasil_pcs} onChange={e => setCuttingForm({...cuttingForm, hasil_pcs: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg p-2 font-bold text-slate-700 outline-none focus:border-emerald-500" placeholder="0"/>
                  {cuttingForm.hasil_pcs > 0 && (
                    <p className="mt-1 text-[9px] font-black text-emerald-600 uppercase tracking-widest animate-in fade-in slide-in-from-top-1">
                      = {(cuttingForm.hasil_pcs / 12).toFixed(2)} LUSIN
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">Tukang Potong</label>
                  <select value={cuttingForm.tukang_potong_id} onChange={e => setCuttingForm({...cuttingForm, tukang_potong_id: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg p-2 font-medium text-slate-700 outline-none focus:border-emerald-500">
                    {options.karyawan_list.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">Upah / Pcs (Rp)</label>
                  <input 
                    type="text" 
                    value={formatInputNumber(cuttingForm.ongkos_per_pcs)} 
                    onChange={e => setCuttingForm({...cuttingForm, ongkos_per_pcs: parseNumber(e.target.value)})} 
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 font-bold text-slate-700 outline-none focus:border-emerald-500"
                    placeholder="Contoh: 1.500"
                  />
                  <p className="mt-1 text-[9px] font-black text-blue-600 uppercase tracking-widest">
                    = Rp {Number(cuttingForm.ongkos_per_pcs).toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading || isBos} 
              className={`btn-primary w-full md:w-auto flex justify-center items-center gap-2 px-8 ${isBos ? 'opacity-50 cursor-not-allowed bg-slate-400' : ''}`}
            >
              <span className="material-symbols-rounded text-[20px]">save</span>
              {isBos ? 'VIEW ONLY (BOS)' : loading ? 'Menyimpan...' : 'Simpan Data Cutting'}
            </button>
          </form>
        )}

        {/* JAHIT */}
        {activeTab === 'jahit' && (
          <form onSubmit={handleJahitSubmit} className="space-y-6">
            <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-xl">
              <p className="text-emerald-800 text-sm font-semibold mb-1">Penyelesaian Jahit/Finishing</p>
              <p className="text-emerald-600 text-xs">Mencatat Baju yang selesai finishing. Stok Gudang Barang Jadi akan bertambah dalam satuan Lusin.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Model Baju</label>
              <select className="w-full md:w-1/2 bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg p-2.5 outline-none focus:border-emerald-500 transition-all font-medium"
                      value={jahitForm.produk_id} onChange={e => setJahitForm({...jahitForm, produk_id: e.target.value})}>
                {options.baju_list.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
              </select>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <div className="w-full md:w-1/4">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Tanggal Selesai</label>
                <input type="date" value={jahitForm.tgl_jahit} onChange={e => setJahitForm({...jahitForm, tgl_jahit: e.target.value})} className="w-full bg-white border border-slate-200 text-slate-700 text-sm rounded-lg p-2.5 outline-none focus:border-emerald-500 font-medium"/>
              </div>
              <div className="w-full md:w-1/4">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Jumlah (LUSIN)</label>
                <input type="number" step="0.1" min="0.1" value={jahitForm.qty_lusin} onChange={e => setJahitForm({...jahitForm, qty_lusin: e.target.value})} className="w-full bg-white border border-slate-200 text-slate-800 text-sm rounded-lg p-2.5 outline-none focus:border-emerald-500 font-black" placeholder="0.0"/>
                {jahitForm.qty_lusin > 0 && (
                  <p className="mt-1.5 px-1 text-[10px] font-black text-emerald-600 uppercase tracking-widest animate-in fade-in slide-in-from-top-1 duration-300">
                    = {(jahitForm.qty_lusin * 12).toLocaleString('id-ID')} PCS
                  </p>
                )}
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading || isBos} 
              className={`btn-primary w-full md:w-auto flex justify-center items-center gap-2 px-8 ${isBos ? 'opacity-50 cursor-not-allowed bg-slate-400' : ''}`}
            >
              <span className="material-symbols-rounded text-[20px]">save</span>
              {isBos ? 'VIEW ONLY (BOS)' : loading ? 'Menyimpan...' : 'Simpan ke Gudang'}
            </button>
          </form>
        )}

        {/* REKAP CUTTING */}
        {activeTab === 'rekap' && (
          <div className="space-y-6">
            {!rekapData ? <div className="text-sm font-medium text-slate-400 p-4">Loading Data...</div> : (
              <>
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <span className="material-symbols-rounded text-emerald-600">group</span>
                    Total Tagihan Upah per Tukang Potong
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {rekapData.group_karyawan.map(g => (
                      <div key={g.tukang_potong} className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex justify-between items-center">
                        <span className="font-bold text-slate-700">{g.tukang_potong}</span>
                        <span className="text-emerald-700 font-black tracking-tight">{g.total_upah_rp}</span>
                      </div>
                    ))}
                    {rekapData.group_karyawan.length === 0 && <p className="text-xs text-slate-400 font-medium p-2">Belum ada data</p>}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide mb-3">Rincian Riwayat Potong</h3>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
                          <th className="p-3 font-bold">Waktu</th>
                          <th className="p-3 font-bold">Tukang Potong</th>
                          <th className="p-3 font-bold">Hasil</th>
                          <th className="p-3 font-bold text-right">Tagihan Upah</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                        {rekapData.rincian_harian.map((row, i) => (
                          <tr key={i} className="hover:bg-slate-50/50">
                            <td className="p-3 whitespace-nowrap text-slate-500 text-xs">{row.waktu}</td>
                            <td className="p-3">{row.tukang_potong}</td>
                            <td className="p-3">{row.hasil_potong}</td>
                            <td className="p-3 text-right tabular-nums text-slate-600">{(row.tagihan_upah).toLocaleString('id-ID')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {rekapData.rincian_harian.length === 0 && <div className="p-8 text-center text-slate-400 text-sm font-medium">Belum ada riwayat</div>}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* WIP CUTTING */}
        {activeTab === 'wip' && (
          <div className="space-y-6">
            {!wipData ? <div className="text-sm font-medium text-slate-400 p-4">Loading Data...</div> : (
              <>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 flex flex-col justify-center">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-1">Total Dipotong</div>
                    <div className="text-2xl font-black text-emerald-900">{wipData.total_potong.toLocaleString('id-ID')} <span className="text-sm">Pcs</span></div>
                  </div>
                  <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex flex-col justify-center">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mb-1">Total Dijahit</div>
                    <div className="text-2xl font-black text-blue-900">{wipData.total_jahit.toLocaleString('id-ID')} <span className="text-sm">Pcs</span></div>
                  </div>
                  <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 flex flex-col justify-center relative shadow-sm">
                    <span className="material-symbols-rounded absolute right-3 top-3 text-amber-500/20 text-5xl select-none">hourglass_empty</span>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-amber-700 mb-1 relative z-10">WIP Antre Jahit</div>
                    <div className="text-2xl font-black text-amber-900 relative z-10">{wipData.sisa_wip.toLocaleString('id-ID')} <span className="text-sm">Pcs</span></div>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
                        <th className="p-3 font-bold">Model SKU</th>
                        <th className="p-3 font-bold text-center">Total Potong</th>
                        <th className="p-3 font-bold text-center">Masuk Jahit</th>
                        <th className="p-3 font-bold text-center">Sisa WIP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm font-medium">
                      {wipData.data.map((row, i) => {
                        let statusColor = "bg-emerald-50 text-emerald-800 border-emerald-100"; // Pas
                        if (row.sisa_wip > 0) statusColor = "bg-amber-50 text-amber-800 border-amber-200"; // Antre
                        if (row.sisa_wip < 0) statusColor = "bg-red-50 text-red-800 border-red-200"; // Minus

                        return (
                          <tr key={i} className="hover:bg-slate-50/50">
                            <td className="p-3">
                              <div className="font-bold text-slate-800">{row.kode_sku}</div>
                              <div className="text-xs text-slate-400">{row.nama_barang}</div>
                            </td>
                            <td className="p-3 text-center tabular-nums text-slate-600">{row.total_potong.toLocaleString('id-ID')}</td>
                            <td className="p-3 text-center tabular-nums text-slate-600">{row.total_jahit.toLocaleString('id-ID')}</td>
                            <td className="p-3 text-center">
                              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${statusColor}`}>
                                {row.sisa_wip.toLocaleString('id-ID')}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {wipData.data.length === 0 && <div className="p-8 text-center text-slate-400 text-sm font-medium">Belum ada antrean WIP Produksi</div>}
                </div>
              </>
            )}
          </div>
        )}

        {/* SETUP WIP AWAL */}
        {activeTab === 'wip_awal' && (
          <div className="space-y-6">

            {/* ── BANNER PERINGATAN AKUNTANSI ─────────────────────── */}
            <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-5">
              <div className="flex items-start gap-3">
                <span className="material-symbols-rounded text-red-500 text-3xl mt-0.5 shrink-0">gpp_bad</span>
                <div>
                  <p className="font-black text-red-700 text-base mb-1">⚠️ FITUR SETUP AWAL — HANYA UNTUK CUT-OFF SISTEM</p>
                  <p className="text-red-600 text-sm font-medium mb-3">
                    Form ini digunakan <strong>SEKALI SAJA</strong> saat transisi ke sistem ini, untuk barang yang sudah dalam proses produksi di periode <em>sebelum</em> sistem ini dipakai.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-bold">
                    <div className="flex items-center gap-2 bg-red-100 rounded-lg px-3 py-2 text-red-700">
                      <span className="material-symbols-rounded text-[16px]">block</span>
                      Stok Kain TIDAK berkurang
                    </div>
                    <div className="flex items-center gap-2 bg-red-100 rounded-lg px-3 py-2 text-red-700">
                      <span className="material-symbols-rounded text-[16px]">block</span>
                      Kas / Bank TIDAK berkurang
                    </div>
                    <div className="flex items-center gap-2 bg-red-100 rounded-lg px-3 py-2 text-red-700">
                      <span className="material-symbols-rounded text-[16px]">block</span>
                      Utang Dagang TIDAK bertambah
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-white/70 rounded-xl border border-red-200">
                    <p className="text-[11px] font-mono text-slate-600">
                      <span className="font-black text-emerald-700">DEBIT</span> &nbsp;12130 — Persediaan Barang Dalam Proses (WIP) &nbsp;Rp xxx<br/>
                      <span className="font-black text-red-600">KREDIT</span> 31120 — Ekuitas Saldo Awal Setup &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Rp xxx
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── FORM INPUT ──────────────────────────────────────── */}
            <form onSubmit={handleWipAwalSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Tanggal Cut-off</label>
                  <input type="date" value={wipAwalForm.tanggal_cutoff}
                    onChange={e => setWipAwalForm({...wipAwalForm, tanggal_cutoff: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg p-2.5 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-400 font-medium"/>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Model Baju (SKU)</label>
                  <select value={wipAwalForm.produk_id}
                    onChange={e => setWipAwalForm({...wipAwalForm, produk_id: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg p-2.5 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-400 font-medium">
                    <option value="">-- Pilih Model --</option>
                    {options.baju_list.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Tahap Saat Ini</label>
                  <select value={wipAwalForm.tahap_saat_ini}
                    onChange={e => setWipAwalForm({...wipAwalForm, tahap_saat_ini: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg p-2.5 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-400 font-medium">
                    {TAHAP_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Jumlah Barang Dalam Proses (Pcs)</label>
                <input type="number" min="1" value={wipAwalForm.qty_pcs}
                  onChange={e => setWipAwalForm({...wipAwalForm, qty_pcs: e.target.value})}
                  className="w-full md:w-48 bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-lg p-2.5 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-400 font-black"
                  placeholder="Contoh: 100"/>
              </div>

              {/* Breakdown Biaya */}
              <div className="p-5 bg-amber-50/40 border border-amber-200 rounded-2xl space-y-4">
                <p className="text-xs font-black text-amber-800 uppercase tracking-widest flex items-center gap-2">
                  <span className="material-symbols-rounded text-[16px]">account_balance_wallet</span>
                  Modal Mengendap (Sunk Cost) — Wajib diisi minimal satu komponen
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-amber-700 mb-1 uppercase tracking-wide">Nilai Bahan Baku Terpakai (Rp)</label>
                    <input type="text"
                      value={formatInputNumber(wipAwalForm.modal_bahan_baku)}
                      onChange={e => setWipAwalForm({...wipAwalForm, modal_bahan_baku: parseNumber(e.target.value)})}
                      className="w-full bg-white border border-amber-200 text-slate-800 text-sm rounded-lg p-2.5 outline-none focus:border-amber-500 font-bold"
                      placeholder="0"/>
                    <p className="mt-1 text-[10px] text-slate-500">Harga kain yang sudah dipakai</p>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-amber-700 mb-1 uppercase tracking-wide">Upah Cutting Sudah Dibayar (Rp)</label>
                    <input type="text"
                      value={formatInputNumber(wipAwalForm.modal_upah_cutting)}
                      onChange={e => setWipAwalForm({...wipAwalForm, modal_upah_cutting: parseNumber(e.target.value)})}
                      className="w-full bg-white border border-amber-200 text-slate-800 text-sm rounded-lg p-2.5 outline-none focus:border-amber-500 font-bold"
                      placeholder="0"/>
                    <p className="mt-1 text-[10px] text-slate-500">Upah tukang potong</p>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-amber-700 mb-1 uppercase tracking-wide">Biaya Lain-lain (Rp)</label>
                    <input type="text"
                      value={formatInputNumber(wipAwalForm.modal_lain)}
                      onChange={e => setWipAwalForm({...wipAwalForm, modal_lain: parseNumber(e.target.value)})}
                      className="w-full bg-white border border-amber-200 text-slate-800 text-sm rounded-lg p-2.5 outline-none focus:border-amber-500 font-bold"
                      placeholder="0"/>
                    <p className="mt-1 text-[10px] text-slate-500">Opsional (BOP, dll)</p>
                  </div>
                </div>

                {/* Auto-kalkulasi summary */}
                {(() => {
                  const total = (parseNumber(wipAwalForm.modal_bahan_baku)||0) +
                                (parseNumber(wipAwalForm.modal_upah_cutting)||0) +
                                (parseNumber(wipAwalForm.modal_lain)||0);
                  const qty   = Number(wipAwalForm.qty_pcs) || 0;
                  const hpp   = qty > 0 ? total / qty : 0;
                  if (total <= 0) return null;
                  return (
                    <div className="flex flex-wrap gap-4 pt-3 border-t border-amber-200">
                      <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2.5 border border-amber-200 shadow-sm">
                        <span className="material-symbols-rounded text-amber-600 text-[18px]">summarize</span>
                        <div>
                          <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Total Modal WIP</p>
                          <p className="text-base font-black text-slate-800">Rp {total.toLocaleString('id-ID')}</p>
                        </div>
                      </div>
                      {hpp > 0 && (
                        <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2.5 border border-emerald-200 shadow-sm">
                          <span className="material-symbols-rounded text-emerald-600 text-[18px]">price_check</span>
                          <div>
                            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Estimasi HPP / Pcs</p>
                            <p className="text-base font-black text-slate-800">Rp {hpp.toLocaleString('id-ID', {maximumFractionDigits:0})}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Keterangan (Opsional)</label>
                <input type="text" value={wipAwalForm.keterangan}
                  onChange={e => setWipAwalForm({...wipAwalForm, keterangan: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg p-2.5 outline-none focus:border-amber-500 font-medium"
                  placeholder="Contoh: Batch April minggu ke-4"/>
              </div>

              <button type="submit" disabled={loading || isBos}
                className={`flex items-center gap-2 px-8 py-3 rounded-xl font-black text-sm tracking-wide transition-all ${
                  isBos ? 'bg-slate-300 text-slate-500 cursor-not-allowed' :
                  'bg-amber-500 hover:bg-amber-600 text-white shadow-md hover:shadow-amber-200 active:scale-95'
                }`}>
                <span className="material-symbols-rounded text-[20px]">save</span>
                {isBos ? 'VIEW ONLY (BOS)' : loading ? 'Menyimpan...' : 'Simpan Saldo Awal WIP'}
              </button>
            </form>

            {/* ── HISTORY LIST ────────────────────────────────────── */}
            {wipAwalList && (
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
                    <span className="material-symbols-rounded text-amber-600">history</span>
                    Riwayat Entri Saldo Awal WIP
                  </h3>
                  <div className="flex gap-3">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 text-center">
                      <p className="text-[10px] font-bold text-amber-700 uppercase">Total Pcs</p>
                      <p className="text-sm font-black text-amber-900">{wipAwalList.total_qty_pcs?.toLocaleString('id-ID')} pcs</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-center">
                      <p className="text-[10px] font-bold text-slate-600 uppercase">Total Nilai WIP</p>
                      <p className="text-sm font-black text-slate-800">Rp {wipAwalList.total_nilai_wip?.toLocaleString('id-ID')}</p>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 uppercase tracking-wider">
                        <th className="p-3 font-bold">Cut-off</th>
                        <th className="p-3 font-bold">SKU / Barang</th>
                        <th className="p-3 font-bold text-center">Qty</th>
                        <th className="p-3 font-bold">Tahap</th>
                        <th className="p-3 font-bold text-right">Bahan (Rp)</th>
                        <th className="p-3 font-bold text-right">Upah (Rp)</th>
                        <th className="p-3 font-bold text-right">Total Modal</th>
                        <th className="p-3 font-bold text-right">HPP/Pcs</th>
                        <th className="p-3 font-bold text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                      {wipAwalList.data?.map(row => (
                        <tr key={row.id} className="hover:bg-amber-50/30 transition-colors">
                          <td className="p-3 text-slate-500 text-xs whitespace-nowrap">{row.tanggal_cutoff}</td>
                          <td className="p-3">
                            <div className="font-bold text-slate-800 text-xs">{row.kode_sku}</div>
                            <div className="text-slate-400 text-[11px]">{row.nama_barang}</div>
                          </td>
                          <td className="p-3 text-center">
                            <span className="inline-block bg-amber-100 text-amber-800 font-black text-xs px-2 py-0.5 rounded-full">{row.qty_pcs} pcs</span>
                          </td>
                          <td className="p-3">
                            <span className="inline-block bg-blue-50 text-blue-700 font-bold text-xs px-2 py-0.5 rounded-full border border-blue-100">{row.tahap_saat_ini}</span>
                          </td>
                          <td className="p-3 text-right tabular-nums text-slate-500 text-xs">{row.modal_bahan_baku.toLocaleString('id-ID')}</td>
                          <td className="p-3 text-right tabular-nums text-slate-500 text-xs">{row.modal_upah_cutting.toLocaleString('id-ID')}</td>
                          <td className="p-3 text-right">
                            <span className="font-black text-slate-800">Rp {row.total_modal_terserap.toLocaleString('id-ID')}</span>
                          </td>
                          <td className="p-3 text-right">
                            <span className="text-emerald-700 font-bold text-xs">Rp {row.hpp_per_pcs.toLocaleString('id-ID', {maximumFractionDigits:0})}</span>
                          </td>
                          <td className="p-3 text-center">
                            <button onClick={() => handleDeleteWipAwal(row.id, row.nama_barang)}
                              disabled={loading || isBos}
                              title="Hapus entri ini"
                              className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-all disabled:opacity-40">
                              <span className="material-symbols-rounded text-[18px]">delete</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {wipAwalList.data?.length === 0 && (
                    <div className="p-10 text-center">
                      <span className="material-symbols-rounded text-5xl text-slate-200 block mb-2">inventory</span>
                      <p className="text-slate-400 text-sm font-medium">Belum ada entri Saldo Awal WIP.</p>
                      <p className="text-slate-300 text-xs mt-1">Gunakan form di atas untuk mulai setup cut-off.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
