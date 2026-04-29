import { useState } from 'react'
import { formatRp } from '../../utils/formatters'

export default function TotalProduksiPanel({ productionAnalytics, loading = false }) {
  const [showDetail, setShowDetail] = useState(false)

  if (loading) {
    return (
      <div className="card h-full flex flex-col justify-center items-center py-10">
        <div className="w-16 h-16 bg-slate-200 rounded-full animate-pulse mb-4" />
        <div className="h-6 bg-slate-200 rounded w-32 animate-pulse mb-2" />
        <div className="h-4 bg-slate-100 rounded w-24 animate-pulse" />
      </div>
    )
  }

  const totalBulanIni = productionAnalytics?.total_lusin_bulan_ini || 0;
  const totalMingguIni = productionAnalytics?.total_lusin_minggu_ini || 0;
  const detailBulanIni = productionAnalytics?.detail_bulan_ini || [];

  return (
    <>
      <div 
        onClick={() => setShowDetail(true)}
        className="card flex flex-col h-full bg-gradient-to-br from-indigo-900 to-slate-900 border-none shadow-lg text-white relative overflow-hidden group cursor-pointer hover:scale-[1.02] active:scale-100 transition-all duration-300 min-h-[320px]"
      >
        {/* Background decorations */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-400/30 transition-all duration-700"></div>
        <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-400/30 transition-all duration-700"></div>
        
        <div className="flex items-center justify-between mb-4 relative z-10 p-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/5">
              <span className="material-symbols-rounded text-[18px] text-indigo-300">inventory</span>
            </div>
            <h3 className="text-[11px] font-black text-indigo-50 tracking-wider uppercase">Total Produksi</h3>
          </div>
          <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/20 transition-colors">
            <span className="material-symbols-rounded text-xs text-indigo-200">open_in_new</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center items-center text-center relative z-10 py-2">
          <p className="text-[12px] font-black text-indigo-200 uppercase tracking-[0.15em] mb-3">
            Kumulatif Bulan Ini
          </p>
          <div className="flex items-baseline gap-2 justify-center">
            <span className="text-5xl font-black text-white tracking-tighter drop-shadow-lg">
              {totalBulanIni.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}
            </span>
            <span className="text-sm font-bold text-indigo-300 uppercase">Lusin</span>
          </div>
          <div className="mt-2 px-3 py-1 rounded-full bg-white/5 border border-white/5">
            <p className="text-[11px] text-indigo-200 font-bold tracking-tight">
              {(totalBulanIni * 12).toLocaleString('id-ID')} Pcs Terjahit
            </p>
          </div>
        </div>

        <div className="mt-auto p-3.5 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-rounded text-indigo-300 text-base">calendar_today</span>
              <span className="text-[10px] font-bold text-indigo-100">Minggu Ini</span>
            </div>
            <div className="text-right">
              <span className="text-base font-black text-white">{totalMingguIni.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}</span>
              <span className="text-[9px] text-indigo-200 ml-1">Lusin</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Detail Produksi */}
      {showDetail && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100 flex flex-col max-h-[85vh]">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-900 to-indigo-800 p-8 text-white relative shrink-0">
              <div className="absolute top-0 right-0 p-6">
                <button 
                  onClick={() => setShowDetail(false)}
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <span className="material-symbols-rounded">close</span>
                </button>
              </div>
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/20">
                  <span className="material-symbols-rounded text-3xl text-indigo-200">checkroom</span>
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tighter uppercase">Rincian Produksi</h2>
                  <p className="text-indigo-200 font-bold text-sm tracking-widest mt-1">KUMULATIF BULAN INI</p>
                </div>
              </div>
            </div>

            {/* List */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              {detailBulanIni.length === 0 ? (
                <div className="text-center py-10 text-slate-400 font-bold italic">
                  Belum ada data produksi di bulan ini.
                </div>
              ) : (
                <div className="space-y-3">
                  {detailBulanIni.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-100">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800">{item.nama_barang}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Barang Jadi</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-indigo-600">{item.qty_lusin.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 1 })} <span className="text-xs text-indigo-400 ml-0.5">Lusin</span></p>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">{(item.qty_lusin * 12).toLocaleString('id-ID')} Pcs</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Footer Summary */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 shrink-0">
               <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Total Keseluruhan</span>
                  <div className="text-right">
                    <span className="text-2xl font-black text-slate-900">{totalBulanIni.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 1 })} <span className="text-sm text-slate-500">Lusin</span></span>
                  </div>
               </div>
            </div>

          </div>
        </div>
      )}
    </>
  )
}
