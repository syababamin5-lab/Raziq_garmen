import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { formatRp, formatInputNumber, parseNumber, getLocalDate, getLocalTimestamp } from '../utils/formatters';

const user = JSON.parse(localStorage.getItem('user') || '{}');
const isBos = user.role === 'bos';

export default function KasbonKaryawan() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [karyawan, setKaryawan] = useState([]);
  const [kasbonForm, setKasbonForm] = useState({ 
    karyawan_id: '', 
    nominal: '', 
    sumber: 'Kas Tunai', 
    tgl: getLocalDate() 
  });

  const fetchData = async () => {
    try {
      const res = await api.get('/master/karyawan');
      setKaryawan(res.data);
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
      const finalTgl = kasbonForm.tgl === getLocalDate() ? getLocalTimestamp() : kasbonForm.tgl;
      const { data } = await api.post('/karyawan/kasbon-baru', { 
        ...kasbonForm, 
        nominal: Number(kasbonForm.nominal),
        tgl: finalTgl
      });
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

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 font-outfit">
      {/* Header */}
      <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-900 flex items-center justify-center text-white shadow-lg">
            <span className="material-symbols-rounded text-3xl">person</span>
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Kasbon Karyawan</h1>
            <p className="text-slate-500 text-sm font-medium">Manajemen pinjaman dan cicilan kasbon staf garmen.</p>
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

      <div className="bg-white p-10 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.02)] border border-slate-50 min-h-[500px]">
        <div className="animate-in fade-in slide-in-from-bottom-4 grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* FORM SECTION */}
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
                  {['Kas Tunai', 'BCA'].map(s => (
                    <button key={s} onClick={() => setKasbonForm({...kasbonForm, sumber: s})} className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all ${kasbonForm.sumber === s ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400'}`}>
                      {s === 'BCA' ? 'BCA' : s.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <button 
                onClick={handleKasbon} 
                disabled={loading || isBos} 
                className={`w-full p-5 rounded-2xl font-black text-lg shadow-xl transition-all ${isBos ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-black'}`}
              >
                {isBos ? 'VIEW ONLY (BOS)' : loading ? 'SEDANG MEMPROSES...' : 'BERIKAN PINJAMAN'}
              </button>
            </div>
          </div>

          {/* LIST SECTION */}
          <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-[#064E3B] border-l-4 border-emerald-500 pl-4 uppercase tracking-tight">Daftar Saldo Kasbon</h3>
                <div className="flex gap-2">
                    <button 
                        onClick={() => window.open(`/api/reports-mitra/cetak-kartu?type=kasbon&mitra_id=${kasbonForm.karyawan_id}`, '_blank')}
                        disabled={!kasbonForm.karyawan_id}
                        className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-[10px] hover:bg-emerald-100 disabled:opacity-50 transition-all border border-emerald-200"
                        title="Cetak Kartu Per Orang"
                    >
                        <span className="material-symbols-rounded text-sm">print</span> CETAK KARTU
                    </button>
                    <button 
                        onClick={() => window.open(`/api/reports-mitra/cetak-semua?type=kasbon`, '_blank')}
                        className="flex items-center gap-2 px-3 py-2 bg-slate-50 text-slate-600 rounded-xl font-bold text-[10px] hover:bg-slate-100 transition-all border border-slate-200"
                    >
                        <span className="material-symbols-rounded text-sm">summarize</span> CETAK SEMUA KARTU KASBON
                    </button>
                </div>
            </div>
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
      </div>
    </div>
  );
}
