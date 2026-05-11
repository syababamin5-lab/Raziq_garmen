import { formatRp } from '../../utils/formatters'

/**
 * ProduksiPanel.jsx — Panel "Laporan Produksi & Masuk" (kanan bawah)
 */
export default function ProduksiPanel({ gudang, salesAnalytics, loading = false }) {
  const rows = gudang
    ? [
        {
          icon: 'content_cut',
          label: 'Cutting Minggu Ini',
          sub: 'Kain siap potong',
          qty: `${(gudang.cutting_minggu_ini_pcs || 0).toLocaleString('id-ID')} Pcs`,
          desc: 'Selesai Cutting',
        },
        {
          icon: 'checkroom',
          label: 'Persediaan Baju Jadi',
          sub: 'Gudang barang jadi',
          qty: `${gudang.persediaan_baju_jadi_lusin} Lusin`,
          desc: 'Siap Kirim',
        },
        {
          icon: 'layers',
          label: 'Sisa Kain Gudang',
          sub: 'Bahan baku tersisa',
          qty: `${gudang.sisa_kain_kg} Kg`,
          desc: 'Belum Cutting',
        },
      ]
    : []

  if (loading) {
    return (
      <div className="card h-full">
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 bg-slate-200 rounded w-40 animate-pulse" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 animate-pulse mb-2">
            <div className="w-9 h-9 bg-slate-200 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <div className="h-2.5 bg-slate-200 rounded w-28" />
              <div className="h-2 bg-slate-100 rounded w-20" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="card flex flex-col">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-rounded text-[20px] text-emerald-700">content_cut</span>
          <h3 className="text-sm font-bold text-slate-700">Laporan Produksi &amp; Masuk</h3>
        </div>
        <button className="text-slate-300 hover:text-slate-500 text-lg leading-none transition-colors">
          •••
        </button>
      </div>

      {/* ── Rows ────────────────────────────────────────── */}
      <div className="space-y-2">
        {rows.map((row, idx) => (
          <div
            key={idx}
            className="
              flex items-center gap-3 p-3 rounded-xl
              bg-slate-50 hover:bg-emerald-50
              transition-colors duration-200
            "
          >
            {/* Icon */}
            <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-rounded text-[20px] text-emerald-600">{row.icon}</span>
            </div>

            {/* Detail */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-700">{row.label}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{row.sub}</p>
            </div>

            {/* Qty & Desc */}
            <div className="text-right flex-shrink-0">
              <p className="text-xs font-bold text-slate-800">{row.qty}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{row.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Prominent Sales Analytics (NEW & ELEGANT) ────────── */}
      {salesAnalytics && (
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3 mb-[-8px]">
            {/* Minggu Ini */}
            <div className="relative overflow-hidden p-6 rounded-[1.5rem] bg-gradient-to-br from-teal-600 to-teal-800 text-white shadow-lg shadow-teal-900/20 group transition-transform hover:scale-[1.02]">
              <div className="absolute bottom-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-rounded text-5xl">trending_up</span>
              </div>
              <div className="relative z-10">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest">Omzet Minggu Ini</p>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black bg-white/20 backdrop-blur-md`}>
                    {salesAnalytics.perubahan_minggu_pct >= 0 ? '+' : ''}{salesAnalytics.perubahan_minggu_pct.toFixed(0)}%
                  </span>
                </div>
                <h4 className="text-xl font-black tracking-tighter mb-1">{formatRp(salesAnalytics.nominal_minggu_ini)}</h4>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5 opacity-80">
                    <span className="material-symbols-rounded text-[14px]">checkroom</span>
                    <p className="text-[11px] font-medium">
                      {salesAnalytics.total_pcs_terjual_minggu_ini.toLocaleString('id-ID')} Pcs ({Math.floor(salesAnalytics.total_pcs_terjual_minggu_ini / 12)} Lsn) Terjual
                    </p>
                  </div>
                  <p className="text-[9px] font-medium opacity-50 ml-[20px]">
                    {(() => {
                      const now = new Date();
                      const day = now.getDay() || 7;
                      const start = new Date(now);
                      start.setDate(now.getDate() - (day - 1));
                      return `${start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`
                    })()}
                  </p>
                </div>
              </div>
            </div>

            {/* Bulan Ini */}
            <div className="relative overflow-hidden p-6 rounded-[1.5rem] bg-gradient-to-br from-slate-800 to-slate-900 text-white shadow-lg shadow-slate-900/20 group transition-transform hover:scale-[1.02]">
              <div className="absolute bottom-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-rounded text-5xl">calendar_month</span>
              </div>
              <div className="relative z-10">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Omzet Bulan Ini</p>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black bg-white/10 backdrop-blur-md`}>
                    {salesAnalytics.perubahan_bulan_pct >= 0 ? '+' : ''}{salesAnalytics.perubahan_bulan_pct.toFixed(0)}%
                  </span>
                </div>
                <h4 className="text-xl font-black tracking-tighter mb-1">{formatRp(salesAnalytics.nominal_bulan_ini)}</h4>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5 opacity-70">
                    <span className="material-symbols-rounded text-[14px]">inventory_2</span>
                    <p className="text-[11px] font-medium">
                      {salesAnalytics.total_pcs_terjual_bulan_ini.toLocaleString('id-ID')} Pcs ({Math.floor(salesAnalytics.total_pcs_terjual_bulan_ini / 12)} Lsn) Terjual
                    </p>
                  </div>
                  <p className="text-[9px] font-medium opacity-40 ml-[20px]">
                    {(() => {
                      const now = new Date();
                      const start = new Date(now.getFullYear(), now.getMonth(), 1);
                      return `${start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`
                    })()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
