import React, { useState, useEffect } from 'react'
import { getDetailPersediaan } from '../../api/dashboardApi'
import { formatRp } from '../../utils/formatters'

export default function PersediaanModal({ isOpen, onClose }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [expandedModel, setExpandedModel] = useState(null)
  const [grandTotal, setGrandTotal] = useState({ pcs: 0, lusin: 0, nilai: 0 })

  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      getDetailPersediaan()
        .then(res => {
          if (res.success) {
            setData(res.data)
            setGrandTotal({
              pcs: res.grand_total_pcs,
              lusin: res.grand_total_lusin,
              nilai: res.grand_total_nilai
            })
          }
          setLoading(false)
        })
        .catch(err => {
          console.error(err)
          setLoading(false)
        })
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#1E3A8A] p-8 text-white relative flex-shrink-0">
          <div className="absolute top-0 right-0 p-6">
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <span className="material-symbols-rounded">close</span>
            </button>
          </div>
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/20 shadow-inner">
              <span className="material-symbols-rounded text-3xl">checkroom</span>
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tighter uppercase">Rincian Persediaan Baju Jadi</h2>
              <p className="text-blue-200/80 font-bold text-sm tracking-widest">Detail Per Model / SKU</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 bg-slate-50 flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <span className="material-symbols-rounded animate-spin text-4xl text-blue-500">refresh</span>
              <p className="text-slate-400 font-bold animate-pulse uppercase tracking-widest text-xs">Memuat data gudang...</p>
            </div>
          ) : data.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <span className="material-symbols-rounded text-6xl text-slate-200">inventory_2</span>
              <p className="text-slate-400 font-bold italic">Belum ada data persediaan baju jadi.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.map((modelGroup, idx) => (
                <div key={idx} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  {/* Header Model (Clickable) */}
                  <div 
                    onClick={() => setExpandedModel(expandedModel === idx ? null : idx)}
                    className="p-5 flex items-center justify-between cursor-pointer hover:bg-blue-50/50 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${expandedModel === idx ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600'}`}>
                        <span className="material-symbols-rounded text-xl">
                          {expandedModel === idx ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">{modelGroup.model_code}</h3>
                          <span className="bg-slate-100 text-slate-500 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest border border-slate-200">
                            {modelGroup.items.length} Warna
                          </span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Daftar Model Code</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-baseline justify-end gap-1.5">
                        <span className="text-lg font-black text-blue-700">{modelGroup.total_stok_pcs.toLocaleString('id-ID')}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Pcs</span>
                      </div>
                      <p className="text-xs font-bold text-emerald-600">Nilai: {formatRp(modelGroup.total_nilai)}</p>
                    </div>
                  </div>

                  {/* Detail SKU (Expanded) */}
                  <div className={`transition-all duration-500 ease-in-out overflow-hidden ${expandedModel === idx ? 'max-h-[5000px] opacity-100 border-t border-slate-100' : 'max-h-0 opacity-0'}`}>
                    <div className="p-5 bg-slate-50/50">
                      <table className="w-full text-left">
                        <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
                          <tr>
                            <th className="pb-3 px-2">Nama Barang / SKU</th>
                            <th className="pb-3 px-2 text-right">Stok</th>
                            <th className="pb-3 px-2 text-right">Harga Modal</th>
                            <th className="pb-3 px-2 text-right">Nilai Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {modelGroup.items.map((item, itemIdx) => (
                            <tr key={itemIdx} className="hover:bg-blue-50/30 transition-colors">
                              <td className="py-3 px-2">
                                <p className="text-xs font-black text-slate-700 leading-tight mb-0.5">{item.nama_barang}</p>
                                <p className="text-[10px] font-bold text-blue-500 uppercase">{item.kode_sku}</p>
                              </td>
                              <td className="py-3 px-2 text-right">
                                <div className="flex flex-col items-end">
                                  <span className="text-sm font-black text-slate-800">{item.stok_pcs.toLocaleString('id-ID')} <span className="text-[9px] text-slate-400 uppercase">Pcs</span></span>
                                  <span className="text-[10px] font-bold text-slate-400">{item.stok_lusin} <span className="uppercase">Lusin</span></span>
                                </div>
                              </td>
                              <td className="py-3 px-2 text-right text-xs font-bold text-slate-500">
                                {formatRp(item.harga_modal)}
                              </td>
                              <td className="py-3 px-2 text-right text-sm font-black text-emerald-700">
                                {formatRp(item.nilai_persediaan)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Summary */}
        <div className="bg-white p-6 border-t border-slate-100 flex-shrink-0 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Keseluruhan</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-blue-800">{grandTotal.pcs.toLocaleString('id-ID')}</span>
              <span className="text-sm font-bold text-slate-400 uppercase">Pcs</span>
              <span className="text-slate-300 mx-2">|</span>
              <span className="text-lg font-black text-blue-600">{grandTotal.lusin.toLocaleString('id-ID')}</span>
              <span className="text-xs font-bold text-slate-400 uppercase">Lusin</span>
            </div>
          </div>
          <div className="text-right flex flex-col justify-end">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Estimasi Nilai</p>
            <h3 className="text-2xl font-black text-emerald-700 leading-none">
              {formatRp(grandTotal.nilai)}
            </h3>
          </div>
        </div>
      </div>
    </div>
  )
}
