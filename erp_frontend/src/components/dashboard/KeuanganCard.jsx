/**
 * KeuanganCard.jsx — Satu kartu di seksi "Posisi Keuangan (Real-Time)"
 * Updated at: 2026-05-02 11:25
 * Props:
 *   label    (string)  — "Sisa Saldo Tunai"
 *   value    (string)  — "Rp 45.230.000"
 *   icon     (string)  — emoji / SVG string
 *   badge    (string)  — "LIVE" | "+12%" | "-4%"
 *   badgeType (string) — "live" | "up" | "down"
 *   sub      (string)  — "Bulan Ini" (opsional)
 *   loading  (bool)
 */
export default function KeuanganCard({
  label,
  value,
  icon = '💵',
  badge,
  badgeType = 'live',
  sub,
  loading = false,
}) {
  const badgeStyles = {
    live: 'bg-emerald-100 text-emerald-700',
    up:   'bg-emerald-100 text-emerald-700',
    down: 'bg-red-100 text-red-600',
  }

  const iconColor = badgeType === 'down' ? 'text-red-500' : 'text-emerald-500'
  const valueColor = badgeType === 'down' ? 'text-red-600' : 'text-slate-800'

  if (loading) {
    return (
      <div className="card animate-pulse">
        <div className="h-3 bg-slate-200 rounded w-20 mb-3" />
        <div className="h-6 bg-slate-200 rounded w-32 mb-2" />
        <div className="h-2 bg-slate-100 rounded w-16" />
      </div>
    )
  }

  return (
    <div className="card animate-fade-in-up">
      {/* ── Icon & Badge ─────────────────────── */}
      <div className="flex justify-between items-start mb-3">
        <span className={`material-symbols-rounded text-[28px] ${iconColor}`}>{icon}</span>
        {badge && (
          <span className={`badge text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeStyles[badgeType]}`}>
            {badgeType === 'live' && (
              <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1 live-dot" />
            )}
            {badge}
          </span>
        )}
      </div>

      {/* ── Label ────────────────────────────────────────── */}
      <p className="fin-label mb-1">{label}</p>

      {/* ── Value ────────────────────────────────────────── */}
      <p className={`text-2xl font-black leading-tight tracking-tight ${valueColor}`}>
        {value}
      </p>

      {/* ── Sub-label ────────────────────────────────────── */}
      {sub && (
        <p className="text-[11px] text-surface-muted mt-1.5">{sub}</p>
      )}
    </div>
  )
}
