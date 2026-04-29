import { formatRp } from '../../utils/formatters'

export default function TotalProduksiPanel({ productionAnalytics, loading = false }) {
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

  return (
    <div className="card flex flex-col h-full bg-gradient-to-br from-indigo-900 to-slate-900 border-none shadow-[0_20px_50px_rgba(0,0,0,0.2)] text-white relative overflow-hidden group">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl group-hover:bg-indigo-400/30 transition-all duration-700"></div>
      <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl group-hover:bg-purple-400/30 transition-all duration-700"></div>
      
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-inner border border-white/5">
            <span className="material-symbols-rounded text-[20px] text-indigo-300">inventory</span>
          </div>
          <h3 className="text-sm font-black text-indigo-50 tracking-wide uppercase">Total Produksi</h3>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center text-center relative z-10 mb-6">
        <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-[0.2em] mb-3">Kumulatif Bulan Ini</p>
        <div className="flex items-baseline gap-2 justify-center">
          <span className="text-5xl font-black text-white tracking-tighter drop-shadow-md">
            {totalBulanIni.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}
          </span>
          <span className="text-sm font-bold text-indigo-200">Lusin</span>
        </div>
        <p className="text-xs text-indigo-200/70 mt-2 font-medium">({(totalBulanIni * 12).toLocaleString('id-ID')} Pcs Baju)</p>
      </div>

      <div className="mt-auto p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-rounded text-indigo-300 text-lg">calendar_month</span>
            <span className="text-xs font-bold text-indigo-100">Minggu Ini</span>
          </div>
          <div className="text-right">
            <span className="text-lg font-black text-white">{totalMingguIni.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}</span>
            <span className="text-[10px] text-indigo-200 ml-1">Lusin</span>
          </div>
        </div>
      </div>
    </div>
  )
}
