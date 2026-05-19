import React, { useState, useEffect } from 'react'
import { getPembelianDetails } from '../../api/pembelianApi'
import { formatRp } from '../../utils/formatters'

export default function PurchaseDetailModal({ isOpen, onClose, po }) {
  const [details, setDetails] = useState([])
  const [loading, setLoading] = useState(false)

  const handlePrintPdf = (e, path) => {
    e.preventDefault();
    const absoluteUrl = `${window.location.origin}${path}`;
    const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobileDevice) {
      window.location.href = absoluteUrl;
    } else {
      window.open(absoluteUrl, '_blank');
    }
  };

  useEffect(() => {
    if (isOpen && po?.no_po) {
      setLoading(true)
      getPembelianDetails(po.no_po)
        .then(res => {
          if (res.success) {
            setDetails(res.data.details)
          }
          setLoading(false)
        })
        .catch(err => {
          console.error(err)
          setLoading(false)
        })
    }
  }, [isOpen, po])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
        {/* Header */}
        <div className="bg-blue-800 p-8 text-white relative">
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
              <span className="material-symbols-rounded text-3xl">shopping_cart</span>
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tighter uppercase">Detail Pembelian (PO)</h2>
              <p className="text-blue-100/80 font-bold text-sm tracking-widest">{po?.no_po}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="grid grid-cols-2 gap-8 mb-8 bg-slate-50 p-6 rounded-3xl border border-slate-100">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Supplier / Vendor</p>
              <p className="text-sm font-black text-slate-800">{po?.nama_supplier}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tanggal Transaksi</p>
              <p className="text-sm font-black text-slate-800">{po?.tanggal}</p>
            </div>
          </div>

          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            <table className="w-full text-left">
              <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="pb-3">Bahan / Barang</th>
                  <th className="pb-3 text-center">Qty</th>
                  <th className="pb-3 text-right">Harga</th>
                  <th className="pb-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan="4" className="py-10 text-center text-slate-400 font-bold animate-pulse italic">
                      Memuat rincian barang...
                    </td>
                  </tr>
                ) : details.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-10 text-center text-slate-400 font-bold italic">
                      Tidak ada data barang.
                    </td>
                  </tr>
                ) : (
                  details.map((item, idx) => (
                    <tr key={idx} className="group">
                      <td className="py-4">
                        <p className="text-xs font-black text-slate-800">{item.nama_barang}</p>
                        <p className="text-[10px] font-bold text-slate-400">{item.kode_sku}</p>
                      </td>
                      <td className="py-4 text-center">
                        <span className="bg-slate-100 px-3 py-1 rounded-lg text-xs font-black text-slate-700">
                          {item.qty_kg} Kg
                        </span>
                      </td>
                      <td className="py-4 text-right text-xs font-bold text-slate-600">
                        {formatRp(item.harga_per_kg)}
                      </td>
                      <td className="py-4 text-right text-sm font-black text-blue-700">
                        {formatRp(item.subtotal)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Summary */}
          <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span>Total Bruto</span>
                <span>{formatRp((po?.total_tagihan || 0) + (po?.diskon || 0))}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-bold text-red-500 uppercase tracking-widest">
                <span>Diskon</span>
                <span>-{formatRp(po?.diskon || 0)}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-bold text-emerald-600 uppercase tracking-widest border-t border-slate-50 pt-2">
                <span>Uang Muka (DP)</span>
                <span>{formatRp(po?.uang_muka || 0)}</span>
              </div>
            </div>

            <div className="text-right flex flex-col justify-end">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {po?.status === 'Lunas' ? 'Status Pembayaran' : 'Sisa Utang Belum Bayar'}
              </p>
              <h3 className={`text-2xl font-black leading-none mt-1 ${po?.status === 'Lunas' ? 'text-emerald-700' : 'text-red-600'}`}>
                {po?.status === 'Lunas' ? 'LUNAS' : formatRp((po?.total_tagihan || 0) - (po?.uang_muka || 0))}
              </h3>
              <div className="mt-3">
                 <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black tracking-widest uppercase ${
                    po?.status === 'Lunas' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                 }`}>
                    {po?.status || 'LUNAS'}
                 </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-100 transition-all"
          >
            Tutup
          </button>
          <a 
            href="#"
            onClick={(e) => handlePrintPdf(e, `/api/pembelian/print/${po?.no_po}`)}
            className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-200 hover:bg-emerald-700 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-rounded text-xl">print</span>
            Cetak PO PDF
          </a>
        </div>
      </div>
    </div>
  )
}
