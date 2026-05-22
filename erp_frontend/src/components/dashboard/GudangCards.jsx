import React, { useState } from 'react'
import PersediaanModal from './PersediaanModal'
import SisaKainModal from './SisaKainModal'

/**
 * GudangCards.jsx — Seksi "Status Gudang Akhir"
 * Desain Full Gradient, 20% Lebih Besar & Bold
 */
export default function GudangCards({ gudang, loading = false, onSetTarget }) {
  const [isPersediaanModalOpen, setIsPersediaanModalOpen] = useState(false);
  const [isSisaKainModalOpen, setIsSisaKainModalOpen] = useState(false);

  if (loading || !gudang) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-[1.5rem] p-7 animate-pulse bg-slate-100 h-40 border border-slate-200" />
        ))}
      </div>
    )
  }

  const cuttingPct = Math.min(Math.round(gudang.cutting_pct || 0), 100)
  const isTargetAchieved = cuttingPct >= 100

  return (
    <>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

      {/* ── Kartu 1: Cutting (DARK EMERALD) ─────────── */}
      <div className="
        relative rounded-[1.5rem] p-7 overflow-hidden min-h-[160px]
        bg-gradient-to-br from-[#064E3B] to-[#065F46] text-white shadow-xl
        border border-emerald-800/50 group transition-all duration-300
        hover:scale-[1.02]
      ">
        <span className="absolute -bottom-4 -right-4 text-8xl opacity-10 select-none material-symbols-rounded rotate-12 group-hover:rotate-0 transition-transform duration-500">
          content_cut
        </span>

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-3">
            <p className="text-[11px] font-black tracking-widest uppercase text-emerald-300">
              Cutting Minggu Ini
            </p>
            {['super_admin', 'admin', 'bos'].includes(JSON.parse(localStorage.getItem('user') || '{}').role) && (
              <button 
                onClick={onSetTarget}
                className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors border border-white/10"
                title="Set Target Mingguan"
              >
                <span className="material-symbols-rounded text-base">settings</span>
              </button>
            )}
          </div>

          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-4xl font-black tracking-tighter">
              {(gudang.cutting_minggu_ini_pcs || 0).toLocaleString('id-ID')}
            </span>
            <span className="text-sm font-bold text-emerald-200/60 uppercase">Pcs</span>
          </div>

          <div className="h-2 bg-black/20 rounded-full overflow-hidden border border-white/5">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-out ${
                isTargetAchieved ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]' : 'bg-emerald-300'
              }`}
              style={{ width: `${cuttingPct}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-[10px] font-bold uppercase tracking-tight text-emerald-300/80">
            <span>Progress {cuttingPct}%</span>
            <span>Target {gudang.cutting_target_pcs?.toLocaleString('id-ID')}</span>
          </div>
        </div>
      </div>

      {/* ── Kartu 2: Baju Jadi (DARK BLUE) ─────────── */}
      <div 
        onClick={() => setIsPersediaanModalOpen(true)}
        className="
        relative rounded-[1.5rem] p-7 overflow-hidden min-h-[160px]
        bg-gradient-to-br from-[#1E3A8A] to-[#1E40AF] text-white shadow-xl
        border border-blue-800/50 group transition-all duration-300
        hover:scale-[1.02] cursor-pointer
      ">
        <span className="absolute -bottom-4 -right-4 text-8xl opacity-10 select-none material-symbols-rounded group-hover:scale-110 transition-transform duration-500">
          checkroom
        </span>

        <div className="relative z-10">
          <p className="text-[11px] font-black tracking-widest uppercase text-blue-300 mb-3">
            Persediaan Baju Jadi
          </p>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-4xl font-black tracking-tighter">
              {(gudang.persediaan_baju_jadi_lusin || 0).toFixed(1)}
            </span>
            <span className="text-sm font-bold text-blue-200/60 uppercase">Lusin</span>
          </div>
          
          <p className="text-xs font-bold text-emerald-300 flex items-center gap-1.5 mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Ready Stock
          </p>

          <div className="pt-3 border-t border-white/10">
            <p className="text-[11px] font-bold text-blue-200/60 uppercase tracking-tighter">
              Estimasi Nilai: <span className="text-white font-black text-sm">{formatRp_local(gudang.persediaan_baju_jadi_nilai)}</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── Kartu 3: Sisa Kain (DARK AMBER/ORANGE) ─────────── */}
      <div 
        onClick={() => setIsSisaKainModalOpen(true)}
        className="
        relative rounded-[1.5rem] p-7 overflow-hidden min-h-[160px]
        bg-gradient-to-br from-[#92400E] to-[#B45309] text-white shadow-xl
        border border-amber-800/50 group transition-all duration-300
        hover:scale-[1.02] cursor-pointer
      ">
        <span className="absolute -bottom-4 -right-4 text-8xl opacity-10 select-none material-symbols-rounded group-hover:scale-110 transition-transform duration-500">
          texture
        </span>

        <div className="relative z-10">
          <p className="text-[11px] font-black tracking-widest uppercase text-amber-200 mb-3">
            Sisa Kain Produksi
          </p>
          
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-4xl font-black tracking-tighter">
              {(gudang.sisa_kain_kg || 0).toLocaleString('id-ID')}
            </span>
            <span className="text-sm font-bold text-amber-100/60 uppercase">Kg</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {gudang.detail_kain?.slice(0, 3).map((k, i) => (
              <div key={i} className="flex flex-col bg-white/5 p-2 rounded-xl border border-white/10">
                <span className="text-[9px] font-bold text-amber-100/70 truncate uppercase">{k.nama?.split(' ')[0]}</span>
                <span className="text-xs font-black text-white leading-none">{k.kg} <span className="text-[9px] font-normal opacity-50">Kg</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
      <PersediaanModal 
        isOpen={isPersediaanModalOpen} 
        onClose={() => setIsPersediaanModalOpen(false)} 
      />
      <SisaKainModal 
        isOpen={isSisaKainModalOpen} 
        onClose={() => setIsSisaKainModalOpen(false)} 
      />
    </>
  )
}

function formatRp_local(angka) {
  return "Rp " + (angka || 0).toLocaleString('id-ID');
}
