/**
 * Topbar.jsx — Header atas (search bar, judul, notifikasi, profile)
 * Meniru topbar dari gambar referensi.
 */
export default function Topbar({ title = 'The Sartorial Archive' }) {
  return (
    <header className="
      fixed top-0 left-56 right-0 h-14 z-40
      bg-white/90 backdrop-blur-sm
      border-b border-surface-border
      flex items-center justify-between
      px-6
    ">
      {/* ── Search ──────────────────────────────────── */}
      <div className="flex items-center gap-2 text-surface-muted">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search records..."
          className="bg-transparent text-sm text-slate-600 placeholder-slate-400 outline-none w-48"
        />
      </div>

      {/* ── Brand ───────────────────────────────────── */}
      <span className="text-sm font-700 text-slate-500 tracking-wide uppercase">
        {title}
      </span>

      {/* ── Actions ─────────────────────────────────── */}
      <div className="flex items-center gap-3">
        {/* Notifikasi */}
        <button className="relative w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors">
          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* Filter */}
        <button className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors">
          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
          </svg>
        </button>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-emerald-800 flex items-center justify-center text-white text-xs font-700 cursor-pointer hover:ring-2 hover:ring-emerald-500 transition-all">
          U
        </div>
      </div>
    </header>
  )
}
