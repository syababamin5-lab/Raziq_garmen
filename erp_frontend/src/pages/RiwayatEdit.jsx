import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { getRiwayatTransaksi } from '../api/kasbonRiwayatApi';
import { formatRp, getLocalTimestamp } from '../utils/formatters';

const user = JSON.parse(localStorage.getItem('user') || '{}');
const isSuperAdmin = user.role === 'super_admin';
const isBos = user.role === 'bos';
const isPimpinan = ['bos', 'owner', 'gm'].includes(user.role);
const canAction = ['super_admin', 'admin', 'bos'].includes(user.role);
const cannotEdit = ['owner', 'gm'].includes(user.role);

export default function RiwayatEdit() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [riwayat, setRiwayat] = useState([]);
  const [search, setSearch] = useState('');

  // Modal state
  const [modal, setModal] = useState(null); // { type: 'void' | 'hapus', row: {...} }
  const [alasan, setAlasan] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const resHist = await getRiwayatTransaksi(200);
      if (resHist.success) setRiwayat(resHist.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleConfirm = async () => {
    if (!modal) return;
    setModalLoading(true);
    try {
      let res;
      if (modal.type === 'void') {
        const { data } = await api.post('/riwayat/void', { 
          jurnal_id: modal.row.id, 
          alasan, 
          tgl: getLocalTimestamp() 
        });
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
    <div className="w-full px-4 md:px-10 space-y-6 pb-20 font-outfit">
      {/* Header */}
      <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg">
            <span className="material-symbols-rounded text-3xl">history</span>
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Riwayat & Edit Transaksi</h1>
            <p className="text-slate-500 text-sm font-medium">Jejak audit sistem dan fitur pembatalan (VOID) transaksi.</p>
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

      <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-50 min-h-[500px]">
        <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6">
          {/* Legend & Search */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative w-full">
              <span className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
              <input type="text" className="w-full pl-12 pr-4 py-3 bg-slate-100 rounded-2xl border-none text-sm font-bold text-slate-800 outline-none" placeholder="Cari keterangan atau akun..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-3">
              <div className="flex items-center gap-2 bg-sky-50 text-sky-800 text-[11px] font-bold rounded-2xl border border-sky-100 px-4 py-2">
                <span className="material-symbols-rounded text-base">undo</span>
                <span>VOID = Jurnal Pembalik</span>
              </div>
              {isSuperAdmin && (
                <div className="flex items-center gap-2 bg-red-50 text-red-800 text-[11px] font-bold rounded-2xl border border-red-100 px-4 py-2">
                  <span className="material-symbols-rounded text-base">delete_forever</span>
                  <span>HAPUS = Permanen</span>
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-[2rem]">
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
                    <tr key={row.id} className={`hover:bg-slate-50 transition-all group ${isVoid ? 'opacity-30' : ''}`}>
                      <td className="py-3 px-5 text-slate-400 font-mono">#{row.id}</td>
                      <td className="py-3 px-5 font-medium text-slate-500">
                        {new Date(row.tanggal).toLocaleString('id-ID', {day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit'})}
                      </td>
                      <td className="py-3 px-5">
                        <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${isVoid ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-700'}`}>
                          [{row.kode_akun}] {row.nama_akun}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-slate-600 max-w-[200px] truncate" title={row.keterangan}>{row.keterangan}</td>
                      <td className="py-3 px-5 text-right font-black text-emerald-600">{row.debit > 0 ? formatRp(row.debit) : '-'}</td>
                      <td className="py-3 px-5 text-right font-black text-red-600">{row.kredit > 0 ? formatRp(row.kredit) : '-'}</td>
                      <td className="py-3 px-5 text-center">
                        {!cannotEdit && (
                          <div className="flex items-center justify-center gap-1">
                            {isVoidable(row) && canAction && (
                              <button 
                                onClick={() => openModal('void', row)} 
                                className="p-1.5 rounded-lg text-sky-500 hover:bg-sky-50 transition-all"
                                title="VOID - Buat jurnal pembalik"
                              >
                                <span className="material-symbols-rounded text-[18px]">undo</span>
                              </button>
                            )}
                            {isSuperAdmin && isVoidable(row) && (
                              <button 
                                onClick={() => openModal('hapus', row)} 
                                className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-all"
                                title="HAPUS PERMANEN - Hanya Super Admin"
                              >
                                <span className="material-symbols-rounded text-[18px]">delete_forever</span>
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredRiwayat.length === 0 && <tr><td colSpan="7" className="py-20 text-center text-slate-300 italic">Data tidak ditemukan.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CONFIRMATION MODAL */}
      {modal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] p-10 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-200">
            {modal.type === 'void' ? (
              <>
                <div className="w-14 h-14 bg-sky-50 rounded-2xl flex items-center justify-center mb-6">
                  <span className="material-symbols-rounded text-sky-600 text-3xl">undo</span>
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">Konfirmasi VOID</h2>
                <p className="text-slate-500 text-sm mb-1">Transaksi berikut akan <span className="font-bold text-sky-600">dibalik otomatis</span> dengan jurnal pembalik.</p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
                  <span className="material-symbols-rounded text-red-600 text-3xl">delete_forever</span>
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">⚠️ Hapus Permanen</h2>
                <p className="text-slate-500 text-sm mb-1">Transaksi ini akan <span className="font-black text-red-600">DIHAPUS SELAMANYA</span>.</p>
              </>
            )}

            <div className="bg-slate-50 p-4 rounded-2xl mb-6 mt-4 border border-slate-100">
              <p className="text-xs font-mono text-slate-800"><span className="font-black">#{modal.row.id}</span> — {modal.row.keterangan}</p>
              <p className="text-xs text-slate-500 mt-1">Debit: {formatRp(modal.row.debit)} | Kredit: {formatRp(modal.row.kredit)}</p>
            </div>

            <div className="mb-6">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Alasan</label>
              <input
                type="text"
                className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 font-medium text-sm text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20"
                value={alasan}
                onChange={e => setAlasan(e.target.value)}
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setModal(null)} className="flex-1 p-4 rounded-2xl bg-slate-100 font-black text-slate-600 hover:bg-slate-200 transition-all">BATAL</button>
              <button
                onClick={handleConfirm}
                disabled={modalLoading || (modal.type === 'hapus' && !alasan)}
                className={`flex-1 p-4 rounded-2xl font-black text-white transition-all flex items-center justify-center gap-2 ${modal.type === 'void' ? 'bg-sky-600 hover:bg-sky-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {modalLoading ? <span className="material-symbols-rounded animate-spin">sync</span> : 'YA, KONFIRMASI'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
