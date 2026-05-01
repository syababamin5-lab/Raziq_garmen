import React, { useState, useEffect } from 'react';
import {
  getProduksiOptions, submitCutting, submitJahit, getRekapCutting, getWip 
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

  // Form State Cutting
  const [cuttingForm, setCuttingForm] = useState({
    tgl_cutting: new Date().toISOString().split('T')[0],
    kain_id: '',
    produk_id: '',
    kg_pakai: 0.5,
    hasil_pcs: 1,
    tukang_potong_id: '',
    ongkos_per_pcs: 1000,
  });

  // Form State Jahit
  const [jahitForm, setJahitForm] = useState({
    tgl_jahit: new Date().toISOString().split('T')[0],
    produk_id: '',
    qty_lusin: 1,
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

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    if (activeTab === 'rekap') loadRekap();
    if (activeTab === 'wip') loadWip();
  }, [activeTab]);

  const handleCuttingSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setMsg({text:'', type:''});
    try {
      if(!cuttingForm.kain_id || !cuttingForm.produk_id || !cuttingForm.tukang_potong_id) {
          throw new Error("Pilih semua field yang wajib!");
      }
      const res = await submitCutting({
        tgl_cutting: cuttingForm.tgl_cutting + "T00:00:00.000Z",
        kain_id: Number(cuttingForm.kain_id),
        produk_id: Number(cuttingForm.produk_id),
        kg_pakai: Number(cuttingForm.kg_pakai),
        hasil_pcs: Number(cuttingForm.hasil_pcs),
        tukang_potong_id: Number(cuttingForm.tukang_potong_id),
        ongkos_per_pcs: Number(cuttingForm.ongkos_per_pcs),
      });
      setMsg({ text: res.message, type: 'success' });
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
      const res = await submitJahit({
        tgl_jahit: jahitForm.tgl_jahit + "T00:00:00.000Z",
        produk_id: Number(jahitForm.produk_id),
        qty_lusin: Number(jahitForm.qty_lusin)
      });
      setMsg({ text: res.message, type: 'success' });
      fetchOptions();
    } catch (err) {
      setMsg({ text: err.message, type: 'error' });
    }
    setLoading(false);
  };

  const TABS = [
    { id: 'cutting', label: 'Cutting (Kg -> Pcs)', icon: 'content_cut' },
    { id: 'jahit', label: 'Jahit/Finishing (Pcs -> Lusin)', icon: 'checkroom' },
    { id: 'rekap', label: 'Rekap Tagihan Cutting', icon: 'payments' },
    { id: 'wip', label: 'WIP Cutting', icon: 'inventory_2' },
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
              activeTab === tab.id 
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
                  <input type="number" step="0.1" min="0.1" value={cuttingForm.kg_pakai} onChange={e => setCuttingForm({...cuttingForm, kg_pakai: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg p-2 font-bold text-slate-700 outline-none focus:border-emerald-500"/>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">Hasil (Pcs)</label>
                  <input type="number" min="1" value={cuttingForm.hasil_pcs} onChange={e => setCuttingForm({...cuttingForm, hasil_pcs: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg p-2 font-bold text-slate-700 outline-none focus:border-emerald-500"/>
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
                <input type="number" step="0.1" min="0.1" value={jahitForm.qty_lusin} onChange={e => setJahitForm({...jahitForm, qty_lusin: e.target.value})} className="w-full bg-white border border-slate-200 text-slate-800 text-sm rounded-lg p-2.5 outline-none focus:border-emerald-500 font-black"/>
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

      </div>
    </div>
  );
}
