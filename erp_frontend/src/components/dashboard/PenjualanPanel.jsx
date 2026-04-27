/**
 * PenjualanPanel.jsx — Panel "Laporan Penjualan" (kiri bawah)
 * Menampilkan 3 transaksi penjualan terkini dengan badge status.
 */
import { getStatusClass } from '../../utils/formatters'

function StatusBadge({ status }) {
  const cls = getStatusClass(status)
  return <span className={`badge ${cls}`}>{status}</span>
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 animate-pulse">
      <div className="w-9 h-9 bg-slate-200 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-2.5 bg-slate-200 rounded w-28" />
        <div className="h-2 bg-slate-100 rounded w-20" />
      </div>
      <div className="text-right space-y-1.5">
        <div className="h-2.5 bg-slate-200 rounded w-20" />
        <div className="h-2 bg-slate-100 rounded w-12 ml-auto" />
      </div>
    </div>
  )
}

export default function PenjualanPanel({ data = [], loading = false }) {
  return (
    <div className="card h-full">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-rounded text-[20px] text-emerald-700">sell</span>
          <h3 className="text-sm font-bold text-slate-700">Laporan Penjualan</h3>
        </div>
        <button className="text-slate-300 hover:text-slate-500 text-lg leading-none transition-colors">
          •••
        </button>
      </div>

      {/* ── Rows ────────────────────────────────────────── */}
      <div className="space-y-2">
        {loading ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : data.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-8">
            Belum ada data penjualan.
          </p>
        ) : (
          data.map((item, idx) => (
            <div
              key={idx}
              className="
                flex items-center gap-3 p-3 rounded-xl
                bg-slate-50 hover:bg-emerald-50
                transition-colors duration-200 cursor-pointer group
              "
            >
              {/* PO Badge */}
              <div className="
                w-9 h-9 rounded-lg bg-emerald-800 
                flex items-center justify-center
                text-white text-[10px] font-extrabold
                flex-shrink-0 group-hover:bg-emerald-700
                transition-colors
              ">
                PO
              </div>

              {/* Detail */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-700 truncate">
                  {item.no_invoice}
                </p>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                  {item.nama_produk}
                </p>
              </div>

              {/* Nilai & Status */}
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-bold text-slate-700">
                  Rp {Number(item.total_tagihan).toLocaleString('id-ID')}
                </p>
                <div className="mt-1">
                  <StatusBadge status={item.status} />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
