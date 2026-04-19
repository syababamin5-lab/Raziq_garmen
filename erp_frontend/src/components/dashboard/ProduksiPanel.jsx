/**
 * ProduksiPanel.jsx — Panel "Laporan Produksi & Masuk" (kanan bawah)
 */
export default function ProduksiPanel({ gudang, loading = false }) {
  const rows = gudang
    ? [
        {
          icon: '✂️',
          label: 'Cutting Minggu Ini',
          sub: 'Kain siap potong',
          qty: `${(gudang.cutting_minggu_ini_pcs || 0).toLocaleString('id-ID')} Pcs`,
          desc: 'Selesai Cutting',
        },
        {
          icon: '🚚',
          label: 'Persediaan Baju Jadi',
          sub: 'Gudang barang jadi',
          qty: `${gudang.persediaan_baju_jadi_lusin} Lusin`,
          desc: 'Siap Kirim',
        },
        {
          icon: '🧵',
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
            <div className="space-y-1.5 text-right">
              <div className="h-2.5 bg-slate-200 rounded w-16" />
              <div className="h-2 bg-slate-100 rounded w-12 ml-auto" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="card h-full">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-base">✂️</span>
          <h3 className="text-sm font-700 text-slate-700">Laporan Produksi &amp; Masuk</h3>
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
            <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-base flex-shrink-0">
              {row.icon}
            </div>

            {/* Detail */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-700 text-slate-700">{row.label}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{row.sub}</p>
            </div>

            {/* Qty & Desc */}
            <div className="text-right flex-shrink-0">
              <p className="text-xs font-700 text-slate-800">{row.qty}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{row.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
