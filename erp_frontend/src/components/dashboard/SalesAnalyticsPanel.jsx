import { formatRp } from '../../utils/formatters'

export default function SalesAnalyticsPanel({ data, loading }) {
  if (loading) {
    return (
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 animate-pulse">
        <div className="h-6 w-48 bg-slate-200 rounded-lg mb-8"></div>
        <div className="grid grid-cols-2 gap-8">
          <div className="h-24 bg-slate-100 rounded-3xl"></div>
          <div className="h-24 bg-slate-100 rounded-3xl"></div>
        </div>
      </div>
    )
  }

  if (!data) return null;

  const renderStat = (label, value, pct, sub, icon, colorClass) => {
    const isUp = pct >= 0;
    return (
      <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 hover:border-emerald-200 transition-all group">
        <div className="flex justify-between items-start mb-4">
          <div className={`w-12 h-12 rounded-2xl ${colorClass} flex items-center justify-center shadow-inner`}>
            <span className="material-symbols-rounded text-2xl">{icon}</span>
          </div>
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black tracking-tighter ${isUp ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
            <span className="material-symbols-rounded text-sm">{isUp ? 'trending_up' : 'trending_down'}</span>
            {Math.abs(pct).toFixed(1)}%
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
          <h4 className="text-xl font-black text-slate-800 tracking-tighter mb-1">{value}</h4>
          <p className="text-[10px] font-medium text-slate-400">{sub}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-200">
            <span className="material-symbols-rounded">analytics</span>
          </div>
          <div>
            <h3 className="font-black text-slate-800 tracking-tighter uppercase text-sm">Analitik Pertumbuhan Penjualan</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Performa Bisnis vs Periode Sebelumnya</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Row 1: Nominal Sales */}
        <div className="space-y-4">
          <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Omzet Penjualan
          </h4>
          <div className="grid grid-cols-2 gap-4">
            {renderStat(
              "Minggu Ini", 
              formatRp(data.nominal_minggu_ini), 
              data.perubahan_minggu_pct, 
              "vs Minggu Lalu",
              "calendar_view_week",
              "bg-emerald-100 text-emerald-700"
            )}
            {renderStat(
              "Bulan Ini", 
              formatRp(data.nominal_bulan_ini), 
              data.perubahan_bulan_pct, 
              "vs Bulan Lalu",
              "calendar_month",
              "bg-blue-100 text-blue-700"
            )}
          </div>
        </div>

        {/* Row 2: Pieces Sold */}
        <div className="space-y-4">
          <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Volume Penjualan (Pcs)
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex flex-col justify-center items-center text-center">
              <span className="material-symbols-rounded text-amber-600 text-3xl mb-2">checkroom</span>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Terjual Minggu Ini</p>
              <h4 className="text-2xl font-black text-slate-800 tracking-tighter">{data.total_pcs_terjual_minggu_ini} <span className="text-xs text-slate-400">Pcs</span></h4>
            </div>
            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex flex-col justify-center items-center text-center">
              <span className="material-symbols-rounded text-indigo-600 text-3xl mb-2">inventory_2</span>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Terjual Bulan Ini</p>
              <h4 className="text-2xl font-black text-slate-800 tracking-tighter">{data.total_pcs_terjual_bulan_ini} <span className="text-xs text-slate-400">Pcs</span></h4>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
