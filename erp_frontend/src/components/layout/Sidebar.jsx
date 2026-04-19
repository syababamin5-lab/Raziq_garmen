/**
 * Sidebar.jsx — Navigasi kiri (Atelier Emerald Design)
 * Meniru sidebar dari gambar referensi: bg emerald-900, ikon + teks putih.
 */
import { NavLink } from 'react-router-dom'

const MENU_ITEMS = [
  { path: '/',               icon: '▦',  label: 'Dashboard' },
  { path: '/master',         icon: '📦', label: 'Master Data & SKU' },
  { path: '/persediaan',     icon: '🗃️', label: 'Persediaan Awal' },
  { path: '/produksi',       icon: '✂️', label: 'Produksi Harian' },
  { path: '/pembelian',      icon: '🛒', label: 'Pembelian & Biaya' },
  { path: '/penjualan',      icon: '🚚', label: 'Penjualan' },
  { path: '/kas',            icon: '💼', label: 'Kas, Piutang & Utang' },
  { path: '/laporan',        icon: '📊', label: 'Laporan Keuangan' },
  { path: '/kasbon',         icon: '👤', label: 'Kasbon Karyawan' },
  { path: '/riwayat',        icon: '🕐', label: 'Riwayat & Edit' },
]

export default function Sidebar() {
  return (
    <aside className="
      fixed top-0 left-0 h-full w-56
      bg-emerald-900 flex flex-col
      shadow-xl z-50
    ">
      {/* ── Logo / Brand ──────────────────────────────── */}
      <div className="px-5 py-6 border-b border-emerald-800">
        <div className="flex items-center gap-3">
          {/* Avatar placeholder — ganti dengan <img src="/logo_ansa.png" /> */}
          <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center text-white font-900 text-lg shadow-inner">
            R
          </div>
          <div>
            <p className="text-white font-800 text-sm leading-tight">
              Raziq Garment
            </p>
            <p className="text-emerald-400 text-[10px] font-500 uppercase tracking-widest">
              Management v2.0
            </p>
          </div>
        </div>
      </div>

      {/* ── Navigasi Utama ────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {MENU_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-600 
               transition-all duration-200 group
               ${isActive
                 ? 'bg-emerald-500 text-white shadow-md'
                 : 'text-emerald-100/80 hover:bg-emerald-800 hover:text-white'
               }`
            }
          >
            <span className="text-base leading-none w-5 text-center flex-shrink-0">
              {item.icon}
            </span>
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* ── Footer: New Production Order + Logout ─────── */}
      <div className="px-3 py-4 border-t border-emerald-800 space-y-2">
        <button className="
          w-full flex items-center justify-center gap-2
          bg-emerald-500 hover:bg-emerald-400
          text-white text-sm font-700 py-2.5 rounded-xl
          transition-all duration-200 shadow-md hover:shadow-lg
        ">
          <span>＋</span>
          New Production Order
        </button>
        <button className="
          w-full flex items-center justify-center gap-2
          text-emerald-300 hover:text-white hover:bg-emerald-800
          text-sm font-500 py-2 rounded-xl
          transition-all duration-200
        ">
          <span>↪</span>
          Keluar
        </button>
      </div>
    </aside>
  )
}
