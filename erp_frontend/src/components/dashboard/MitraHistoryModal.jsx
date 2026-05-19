import React, { useState, useEffect } from 'react';
import api from '../../api/api';
import { formatRp } from '../../utils/formatters';

export default function MitraHistoryModal({ isOpen, onClose, partner }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && partner?.mitra_id && partner?.kategori) {
      setLoading(true);
      setError(null);
      
      // Map kategori ("PIUTANG KLIEN" -> "piutang", "HUTANG SUPPLIER" -> "hutang", "KASBON" -> "kasbon")
      let typeParam = 'piutang';
      if (partner.kategori === 'HUTANG SUPPLIER') {
        typeParam = 'hutang';
      } else if (partner.kategori === 'KASBON') {
        typeParam = 'kasbon';
      }

      api.get(`/reports-mitra/history?type=${typeParam}&mitra_id=${partner.mitra_id}`)
        .then(res => {
          if (res.data?.success) {
            setHistory(res.data.history || []);
          } else {
            setError(res.data?.message || 'Gagal memuat riwayat.');
          }
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setError('Terjadi kesalahan koneksi.');
          setLoading(false);
        });
    }
  }, [isOpen, partner]);

  if (!isOpen) return null;

  const isPiutang = partner.kategori === 'PIUTANG KLIEN' || partner.kategori === 'KASBON';
  const headerBg = isPiutang ? 'bg-emerald-800' : 'bg-red-800';
  const badgeColor = isPiutang ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700';

  let typeParam = 'piutang';
  if (partner.kategori === 'HUTANG SUPPLIER') {
    typeParam = 'hutang';
  } else if (partner.kategori === 'KASBON') {
    typeParam = 'kasbon';
  }

  const handlePrintPdf = (e) => {
    e.preventDefault();
    const absoluteUrl = `${window.location.origin}/api/reports-mitra/cetak-kartu?type=${typeParam}&mitra_id=${partner.mitra_id}`;
    const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobileDevice) {
      window.location.href = absoluteUrl;
    } else {
      window.open(absoluteUrl, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
        {/* Header */}
        <div className={`${headerBg} p-8 text-white relative`}>
          <div className="absolute top-0 right-0 p-6">
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <span className="material-symbols-rounded">close</span>
            </button>
          </div>
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/20">
              <span className="material-symbols-rounded text-3xl">
                {partner.kategori === 'KASBON' ? 'person' : partner.kategori === 'HUTANG SUPPLIER' ? 'outbox' : 'account_balance_wallet'}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tighter uppercase">{partner?.nama_mitra}</h2>
              <p className="text-white/80 font-bold text-xs tracking-widest uppercase mt-0.5">{partner?.kategori}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Summary Card */}
          <div className="flex justify-between items-center mb-6 bg-slate-50 p-6 rounded-3xl border border-slate-100">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status Saldo</p>
              <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black tracking-widest uppercase ${badgeColor}`}>
                {partner.kategori === 'KASBON' ? 'KASBON AKTIF' : partner.kategori === 'HUTANG SUPPLIER' ? 'BELUM LUNAS' : 'TAGIHAN AKTIF'}
              </span>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Saldo Akhir</p>
              <h3 className={`text-2xl font-black leading-none mt-1 ${isPiutang ? 'text-emerald-700' : 'text-red-700'}`}>
                {formatRp(partner?.nominal || 0)}
              </h3>
            </div>
          </div>

          {/* History List */}
          <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
            <table className="w-full text-left">
              <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 sticky top-0 bg-white z-10">
                <tr>
                  <th className="pb-3 w-[120px]">Tanggal</th>
                  <th className="pb-3">Keterangan</th>
                  <th className="pb-3 text-right">Debit</th>
                  <th className="pb-3 text-right">Kredit</th>
                  <th className="pb-3 text-right w-[140px]">Saldo Berjalan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-slate-400 font-bold animate-pulse italic">
                      Memuat riwayat transaksi...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-red-500 font-bold italic">
                      {error}
                    </td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-slate-400 font-bold italic">
                      Tidak ada riwayat transaksi ditemukan.
                    </td>
                  </tr>
                ) : (
                  history.map((item, idx) => (
                    <tr key={item.id || idx} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 text-xs font-bold text-slate-600">
                        {item.tanggal}
                      </td>
                      <td className="py-4 text-xs font-semibold text-slate-800">
                        {item.keterangan}
                      </td>
                      <td className="py-4 text-right text-xs font-bold text-slate-600">
                        {item.debit > 0 ? formatRp(item.debit) : '-'}
                      </td>
                      <td className="py-4 text-right text-xs font-bold text-slate-600">
                        {item.kredit > 0 ? formatRp(item.kredit) : '-'}
                      </td>
                      <td className={`py-4 text-right text-xs font-black ${isPiutang ? 'text-emerald-700' : 'text-red-700'}`}>
                        {formatRp(item.saldo)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Button */}
        <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-100 transition-all active:scale-[0.98]"
          >
            Tutup
          </button>
          <button 
            onClick={handlePrintPdf}
            className={`flex-1 py-4 text-white rounded-2xl font-black shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 ${
              isPiutang 
                ? 'bg-emerald-600 shadow-emerald-200 hover:bg-emerald-700' 
                : 'bg-red-600 shadow-red-200 hover:bg-red-700'
            }`}
          >
            <span className="material-symbols-rounded text-xl">print</span>
            Cetak Kartu PDF
          </button>
        </div>
      </div>
    </div>
  );
}
