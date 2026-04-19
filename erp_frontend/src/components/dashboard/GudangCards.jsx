/**
 * GudangCards.jsx — Seksi "Status Gudang Akhir" (3 kartu bawah)
 * Meniru persis desain di gambar: 1 dark card + 2 light cards.
 */
export default function GudangCards({ gudang, loading = false }) {
  if (loading || !gudang) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl p-5 animate-pulse bg-slate-100 h-36" />
        ))}
      </div>
    )
  }

  const cuttingPct = gudang.cutting_pct || 0
  const delta = gudang.persediaan_baju_jadi_lusin >= 0

  return (
    <div className="grid grid-cols-3 gap-4">

      {/* ── Kartu 1: Cutting (DARK / Emerald) ─────────── */}
      <div className="
        relative rounded-2xl p-5 overflow-hidden
        bg-gradient-to-br from-emerald-900 to-emerald-700
        text-white shadow-lg
      ">
        {/* Dekoratif scissors besar di belakang */}
        <div className="absolute -bottom-4 -right-4 text-7xl opacity-10 select-none">
          ✂
        </div>

        <p className="text-[9px] font-800 tracking-widest uppercase text-emerald-300 mb-2">
          Cutting Minggu Ini
        </p>
        <div className="flex items-baseline gap-1 mb-1">
          <span className="text-4xl font-900 leading-none">
            {(gudang.cutting_minggu_ini_pcs || 0).toLocaleString('id-ID')}
          </span>
          <span className="text-base font-500 text-emerald-200">Pcs</span>
        </div>

        {/* Progress Bar */}
        <div className="mt-3 h-1.5 bg-emerald-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-white/80 rounded-full transition-all duration-700"
            style={{ width: `${cuttingPct}%` }}
          />
        </div>
        <p className="text-[10px] text-emerald-300 mt-1.5">
          {cuttingPct}% dari target mingguan
        </p>
      </div>

      {/* ── Kartu 2: Persediaan Baju Jadi (LIGHT) ──────── */}
      <div className="card">
        <p className="text-[9px] font-800 tracking-widest uppercase text-slate-400 mb-2">
          Persediaan Baju Jadi
        </p>
        <div className="flex items-baseline gap-1 mb-1">
          <span className="text-4xl font-900 text-slate-800 leading-none">
            {gudang.persediaan_baju_jadi_lusin}
          </span>
          <span className="text-base font-500 text-slate-400">Lusin</span>
        </div>
        <p className="text-[11px] text-slate-400">Ready</p>
        <div className={`mt-2 text-xs font-700 ${delta ? 'text-emerald-600' : 'text-red-500'}`}>
          <span className="inline-flex items-center gap-0.5">
            {delta ? '↑' : '↓'} Tersedia &nbsp;
          </span>
          <span className="text-slate-400 font-400">
            Nilai: Rp {(gudang.persediaan_baju_jadi_nilai || 0).toLocaleString('id-ID')}
          </span>
        </div>
      </div>

      {/* ── Kartu 3: Sisa Kain (LIGHT) ─────────────────── */}
      <div className="card">
        <p className="text-[9px] font-800 tracking-widest uppercase text-slate-400 mb-2">
          Sisa Kain
        </p>
        <div className="flex items-baseline gap-1 mb-3">
          <span className="text-4xl font-900 text-slate-800 leading-none">
            {(gudang.sisa_kain_kg || 0).toLocaleString('id-ID')}
          </span>
          <span className="text-base font-500 text-slate-400">Kg</span>
        </div>

        {/* Detail per jenis kain */}
        {gudang.detail_kain && gudang.detail_kain.length > 0 && (
          <div className="flex gap-3 flex-wrap">
            {gudang.detail_kain.slice(0, 3).map((k, i) => (
              <div key={i} className="text-left">
                <p className="text-[9px] text-slate-400 font-600 truncate max-w-[56px]">
                  {k.nama?.slice(0, 8)}:
                </p>
                <p className="text-xs font-800 text-slate-700">{k.kg}kg</p>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
