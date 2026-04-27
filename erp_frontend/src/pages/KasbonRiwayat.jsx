import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { submitKasbonBaru, getRiwayatTransaksi } from '../api/kasbonRiwayatApi';
import { formatRp, formatInputNumber, parseNumber } from '../utils/formatters';

const user = JSON.parse(localStorage.getItem('user') || '{}');
const isSuperAdmin = user.role === 'super_admin';

export default function KasbonRiwayat() {
  const [activeTab, setActiveTab] = useState('kasbon');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  const [karyawan, setKaryawan] = useState([]);
  const [riwayat, setRiwayat] = useState([]);
  const [search, setSearch] = useState('');

  // Modal state
  const [modal, setModal] = useState(null); // { type: 'void' | 'hapus', row: {...} }
  const [alasan, setAlasan] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  const [kasbonForm, setKasbonForm] = useState({ 
    karyawan_id: '', 
    nominal: '', 
    sumber: 'Kas Tunai', 
    tgl: new Date().toISOString().split('T')[0] 
  });

  const fetchData = async () => {
    try {
      const [resKary, resHist] = await Promise.all([
        fetch('/api/master/karyawan').then(r => r.json()),
        getRiwayatTransaksi(200)
      ]);
      setKaryawan(resKary);
      if (resHist.success) setRiwayat(resHist.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleKasbon = async () => {
    if (!kasbonForm.karyawan_id || !kasbonForm.nominal) {
      setMsg({ text: 'Mohon lengkapi data kasbon!', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/karyawan/kasbon-baru', { ...kasbonForm, nominal: Number(kasbonForm.nominal) });
      if (data.success) {
        setMsg({ text: data.message, type: 'success' });
        setKasbonForm({ ...kasbonForm, karyawan_id: '', nominal: '' });
        fetchData();
      } else {
        setMsg({ text: data.message, type: 'error' });
      }
    } catch (err) { setMsg({ text: err.message, type: 'error' }); }
    setLoading(false);
  };

  const handleConfirm = async () => {
    if (!modal) return;
    setModalLoading(true);
    try {
      let res;
      if (modal.type === 'void') {
        const { data } = await api.post('/riwayat/void', { jurnal_id: modal.row.id, alasan });
        res = data;
      } else if (modal.type === 'hapus') {
        const { data } = await api.delete(`/riwayat/hapus/${modal.row.id}`);
        res = data;
      }
      if (res.success) {
        setMsg({ text: res.message, type: 'success' });
        fetchData();
      } else {
        setMsg({ text: res.message, type: 'error' });
      }
    } catch (err) { setMsg({ text: err.message, type: 'error' }); }
    setModalLoading(false);
    setModal(null);
    setAlasan('');
  };

  const openModal = (type, row) => {
    setModal({ type, row });
    setAlasan('');
  };

  const filteredRiwayat = riwayat.filter(r =>
    (r.keterangan || '').toLowerCase().includes(search.toLowerCase()) || 
    (r.nama_akun || '').toLowerCase().includes(search.toLowerCase())
  );

  const isVoidable = (row) => {
    const ket = row.keterangan || '';
    return !ket.includes('INV-') && !ket.includes('PO-') && !ket.includes('Retur') && !ket.includes('VOID');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 font-outfit">
      {/* Header */}
      <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-900 flex items-center justify-center text-white shadow-lg">
            <span className="material-symbols-rounded text-3xl">history</span>
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Administrasi & Riwayat</h1>
            <p className="text-slate-500 text-sm font-medium">Manajemen pinjaman karyawan dan jejak audit sistem.</p>
          </div>
        </div>
      </div>

      {/* Alert */}
      {msg.text && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${msg.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
          <span className="material-symbols-rounded">{msg.type === 'error' ? 'error' : 'check_circle'}</span>
          <span className="font-bold">{msg.text}</span>
          <button onClick={() => setMsg({ text: '', type: '' })} className="ml-auto text-slate-400 hover:text-slate-600">
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 p-1.5 bg-slate-100 rounded-3xl w-fit">
        <button onClick={() => setActiveTab('kasbon')} className={`px-8 py-3 rounded-2xl text-xs font-black transition-all ${activeTab === 'kasbon' ? 'bg-[#064E3B] text-white shadow-lg' : 'text-slate-500 hover:bg-slate-200'}`}>
          MANAJEMEN KASBON
        </button>
        <button onClick={() => setActiveTab('riwayat')} className={`px-8 py-3 rounded-2xl text-xs font-black transition-all ${activeTab === 'riwayat' ? 'bg-[#064E3B] text-white shadow-lg' : 'text-slate-500 hover:bg-slate-200'}`}>
          RIWAYAT SISTEM (AUDIT)
        </button>
      </div>

      <div className="bg-white p-10 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.02)] border border-slate-50 min-h-[500px]">

        {/* KASBON TAB */}
        {activeTab === 'kasbon' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-8">
              <h3 className="text-xl font-black text-[#064E3B] border-l-4 border-emerald-500 pl-4 uppercase tracking-tight">Form Pengajuan Kasbon</h3>
              <div className="space-y-6 bg-slate-50 p-8 rounded-[2.5rem]">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Pilih Karyawan</label>
                  <select className="w-full p-4 rounded-2xl border-none shadow-sm font-bold text-slate-700" value={kasbonForm.karyawan_id} onChange={e => setKasbonForm({...kasbonForm, karyawan_id: e.target.value})}>
                    <option value="">-- Cari Nama --</option>
                    {karyawan.map(k => <option key={k.id} value={k.id}>{k.nama_karyawan} (Saldo: {formatRp(k.saldo_kasbon)})</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Nominal Pinjaman</label>
                    <input type="text" className="w-full p-4 rounded-2xl border-none shadow-sm font-black text-xl text-emerald-700" value={formatInputNumber(kasbonForm.nominal)} onChange={e => setKasbonForm({...kasbonForm, nominal: parseNumber(e.target.value)})} placeholder="Rp 0" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Tanggal</label>
                    <input type="date" className="w-full p-4 rounded-2xl border-none shadow-sm font-bold" value={kasbonForm.tgl} onChange={e => setKasbonForm({...kasbonForm, tgl: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Sumber Dana</label>
                  <div className="flex gap-4 p-1 bg-white rounded-2xl w-fit shadow-sm">
                    {['Kas Tunai', 'Bank'].map(s => (
                      <button key={s} onClick={() => setKasbonForm({...kasbonForm, sumber: s})} className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all ${kasbonForm.sumber === s ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400'}`}>
                        {s.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={handleKasbon} disabled={loading} className="w-full bg-emerald-600 text-white p-5 rounded-2xl font-black text-lg shadow-xl hover:bg-black transition-all">
                  {loading ? 'SEDANG MEMPROSES...' : 'BERIKAN PINJAMAN'}
                </button>
              </div>
            </div>

            <div className="space-y-8">
              <h3 className="text-xl font-black text-[#064E3B] border-l-4 border-emerald-500 pl-4 uppercase tracking-tight">Daftar Saldo Kasbon</h3>
              <div className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-widest">
                    <tr>
                      <th className="py-4 px-6">Nama Karyawan</th>
                      <th className="py-4 px-6 text-right">Sisa Kasbon</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {karyawan.map(k => (
                      <tr key={k.id} className="hover:bg-slate-50/50 transition-all">
                        <td className="py-3 px-6 font-bold text-slate-700">{k.nama_karyawan}</td>
                        <td className={`py-3 px-6 text-right font-black ${k.saldo_kasbon > 0 ? 'text-red-500' : 'text-slate-300'}`}>
                          {formatRp(k.saldo_kasbon || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* RIWAYAT TAB */}
        {activeTab === 'riwayat' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6">
            {/* Legend */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative w-full">
                <span className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                <input type="text" className="w-full pl-12 pr-4 py-3 bg-slate-100 rounded-2xl border-none text-sm font-bold" placeholder="Cari keterangan atau akun..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="flex gap-3">
                <div className="flex items-center gap-2 bg-amber-50 text-amber-800 text-[11px] font-bold rounded-2xl border border-amber-100 px-4 py-2">
                  <span className="material-symbols-rounded text-base">undo</span>
                  <span>VOID = Buat jurnal pembalik (aman)</span>
                </div>
                {isSuperAdmin && (
                  <div className="flex items-center gap-2 bg-red-50 text-red-800 text-[11px] font-bold rounded-2xl border border-red-100 px-4 py-2">
                    <span className="material-symbols-rounded text-base">delete_forever</span>
                    <span>HAPUS = Hapus permanen (Admin)</span>
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-[2rem] shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-white font-black uppercase tracking-widest">
                  <tr>
                    <th className="py-4 px-5">ID</th>
                    <th className="py-4 px-5">Tanggal</th>
                    <th className="py-4 px-5">Akun Jurnal</th>
                    <th className="py-4 px-5">Keterangan</th>
                    <th className="py-4 px-5 text-right">Debit</th>
                    <th className="py-4 px-5 text-right">Kredit</th>
                    <th className="py-4 px-5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRiwayat.map((row) => {
                    const isVoid = (row.keterangan || '').includes('VOID');
                    return (
                      <tr key={row.id} className={`hover:bg-slate-50/80 transition-all group ${isVoid ? 'opacity-50' : ''}`}>
                        <td className="py-3 px-5 text-slate-400 font-mono">#{row.id}</td>
                        <td className="py-3 px-5 font-medium text-slate-500">
                          {new Date(row.tanggal).toLocaleString('id-ID', {day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit'})}
                        </td>
                        <td className="py-3 px-5">
                          <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${isVoid ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-700'}`}>
                            [{row.kode_akun}] {row.nama_akun}
                          </span>
                        </td>
                        <td className="py-3 px-5 text-slate-600 max-w-[200px] truncate" title={row.keterangan}>{row.keterangan}</td>
                        <td className="py-3 px-5 text-right font-bold text-emerald-600">{row.debit > 0 ? formatRp(row.debit) : '-'}</td>
                        <td className="py-3 px-5 text-right font-bold text-red-600">{row.kredit > 0 ? formatRp(row.kredit) : '-'}</td>
                        <td className="py-3 px-5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* VOID Button */}
                            {isVoidable(row) && (
                              <button 
                                onClick={() => openModal('void', row)} 
                                className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 hover:text-amber-700 transition-all"
                                title="VOID - Buat jurnal pembalik"
                              >
                                <span className="material-symbols-rounded text-[18px]">undo</span>
                              </button>
                            )}
                            {/* HARD DELETE - Super Admin Only */}
                            {isSuperAdmin && isVoidable(row) && (
                              <button 
                                onClick={() => openModal('hapus', row)} 
                                className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-700 transition-all"
                                title="HAPUS PERMANEN - Hanya Super Admin"
                              >
                                <span className="material-symbols-rounded text-[18px]">delete_forever</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredRiwayat.length === 0 && <tr><td colSpan="7" className="py-20 text-center text-slate-300 italic">Data tidak ditemukan.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── CONFIRMATION MODAL ── */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] p-10 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-200">
            
            {modal.type === 'void' ? (
              <>
                <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mb-6">
                  <span className="material-symbols-rounded text-amber-600 text-3xl">undo</span>
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">Konfirmasi VOID</h2>
                <p className="text-slate-500 text-sm mb-1">Transaksi berikut akan <span className="font-bold text-amber-700">dibalik otomatis</span> dengan jurnal pembalik. Data asli tetap ada sebagai audit trail.</p>
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl mb-6 mt-4">
                  <p className="text-xs font-mono text-amber-800"><span className="font-black">#{modal.row.id}</span> — {modal.row.keterangan}</p>
                  <p className="text-xs text-amber-600 mt-1">Debit: {formatRp(modal.row.debit)} | Kredit: {formatRp(modal.row.kredit)}</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mb-6">
                  <span className="material-symbols-rounded text-red-600 text-3xl">delete_forever</span>
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">⚠️ Hapus Permanen</h2>
                <p className="text-slate-500 text-sm mb-1">Transaksi ini akan <span className="font-black text-red-700">DIHAPUS SELAMANYA</span> dari database. Semua jurnal pasangan dengan keterangan yang sama ikut terhapus. Gunakan hanya untuk koreksi typo/salah input!</p>
                <div className="bg-red-50 border border-red-200 p-4 rounded-2xl mb-6 mt-4">
                  <p className="text-xs font-mono text-red-800"><span className="font-black">#{modal.row.id}</span> — {modal.row.keterangan}</p>
                  <p className="text-xs text-red-600 mt-1">Debit: {formatRp(modal.row.debit)} | Kredit: {formatRp(modal.row.kredit)}</p>
                </div>
              </>
            )}

            <div className="mb-6">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                {modal.type === 'void' ? 'Alasan VOID (opsional)' : 'Alasan Penghapusan (wajib untuk audit)'}
              </label>
              <input
                type="text"
                placeholder={modal.type === 'void' ? 'Misal: Salah nominal, dicatat dobel...' : 'Misal: Typo nama, salah pilih akun...'}
                className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 font-medium text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                value={alasan}
                onChange={e => setAlasan(e.target.value)}
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setModal(null); setAlasan(''); }} className="flex-1 p-4 rounded-2xl bg-slate-100 font-black text-slate-600 hover:bg-slate-200 transition-all">
                BATAL
              </button>
              <button
                onClick={handleConfirm}
                disabled={modalLoading || (modal.type === 'hapus' && !alasan)}
                className={`flex-1 p-4 rounded-2xl font-black text-white transition-all flex items-center justify-center gap-2 ${
                  modal.type === 'void' 
                    ? 'bg-amber-600 hover:bg-amber-700' 
                    : 'bg-red-600 hover:bg-red-700 disabled:bg-red-200'
                }`}
              >
                {modalLoading 
                  ? <span className="material-symbols-rounded animate-spin">sync</span>
                  : <span className="material-symbols-rounded">{modal.type === 'void' ? 'undo' : 'delete_forever'}</span>
                }
                {modal.type === 'void' ? 'YA, VOID SEKARANG' : 'YA, HAPUS PERMANEN'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
