import React, { useState, useMemo } from 'react'
import { getStatusClass } from '../../utils/formatters'

/**
 * PenjualanPanel.jsx — Panel "Laporan Penjualan"
 * Menampilkan data penjualan dengan Filter & Scrollable list.
 * Disesuaikan jarak agar pas menampilkan 5 item di tinggi yang lebih rendah.
 */

function StatusBadge({ status }) {
  const cls = getStatusClass(status)
  return <span className={`badge ${cls} !text-[9px] !py-0.5 !px-2`}>{status}</span>
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 animate-pulse">
      <div className="w-10 h-10 bg-slate-200 rounded-full flex-shrink-0" />
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

export default function PenjualanPanel({ data = [], loading = false, onItemClick }) {
  const [filter, setFilter] = useState('ALL');

  // Logika Filter Data & Sorting
  const filteredData = useMemo(() => {
    if (loading) return [];
    let result = [...data].sort((a, b) => b.id - a.id);
    const now = new Date();
    
    if (filter === 'WEEK') {
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)));
      startOfWeek.setHours(0, 0, 0, 0);
      result = result.filter(item => new Date(item.tanggal) >= startOfWeek);
    } else if (filter === 'MONTH') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      result = result.filter(item => new Date(item.tanggal) >= startOfMonth);
    } else if (filter === 'PAID') {
      result = result.filter(item => item.status === 'SELESAI');
    } else if (filter === 'UNPAID') {
      result = result.filter(item => item.status === 'BELUM');
    }
    
    return result;
  }, [data, filter, loading]);

  const getInitial = (name) => {
    if (!name || name === '—') return 'C';
    return name.charAt(0).toUpperCase();
  }

  return (
    <div className="card h-full flex flex-col !p-5">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="material-symbols-rounded text-[20px] text-emerald-700">sell</span>
          <h3 className="text-[12px] font-black text-slate-700 uppercase tracking-tighter">Laporan Penjualan</h3>
        </div>
        
        <select 
          className="text-[10px] font-black uppercase bg-slate-100 border-none rounded-lg px-2 py-1 outline-none cursor-pointer hover:bg-emerald-100 transition-colors"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="ALL">Semua Data</option>
          <option value="WEEK">Minggu Ini</option>
          <option value="MONTH">Bulan Ini</option>
          <option value="PAID">Lunas</option>
          <option value="UNPAID">Belum Lunas</option>
        </select>
      </div>

      {/* ── Rows (Optimized Spacing for 5 items) ────────────────────────────────────────── */}
      <div className="space-y-1.5 overflow-y-auto pr-1 max-h-[350px] custom-scrollbar flex-1">
        {loading ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : filteredData.length === 0 ? (
          <p className="text-center text-slate-400 text-[11px] font-bold py-12 uppercase italic">
            Tidak ada data {filter !== 'ALL' ? 'untuk filter ini' : ''}.
          </p>
        ) : (
          filteredData.map((item, idx) => (
            <div
              key={idx}
              onClick={() => onItemClick && onItemClick(item)}
              className="
                flex items-center gap-3 p-2.5 rounded-xl
                bg-slate-50 hover:bg-emerald-50
                transition-all duration-200 cursor-pointer group
              "
            >
              <div className="
                w-10 h-10 rounded-full bg-gradient-to-br from-emerald-800 to-emerald-950 
                flex items-center justify-center
                text-white text-sm font-black
                flex-shrink-0 group-hover:rotate-12
                transition-all shadow-sm
              ">
                {getInitial(item.nama_produk)}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-slate-700 truncate uppercase tracking-tight">
                  {item.no_invoice}
                </p>
                <p className="text-[9px] font-bold text-slate-400 truncate mt-0.5 uppercase tracking-wide">
                  {item.nama_produk}
                </p>
              </div>

              <div className="text-right flex-shrink-0">
                <p className="text-xs font-black text-slate-800">
                  Rp {Number(item.total_tagihan).toLocaleString('id-ID')}
                </p>
                <div className="mt-0.5">
                  <StatusBadge status={item.status} />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Footer Info */}
      <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
        <span>{filteredData.length} Transaksi</span>
        {filteredData.length > 5 && (
          <span className="text-emerald-600 animate-pulse">Scroll ↓</span>
        )}
      </div>
    </div>
  )
}
