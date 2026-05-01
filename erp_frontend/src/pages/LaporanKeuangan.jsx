import React, { useState, useEffect } from 'react';
import { getFinancialReport, getBukuBesar, getWipCutting } from '../api/laporanApi';

const formatRp = (val) => {
  if (val < 0) return `(${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Math.abs(val))})`;
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
};

export default function LaporanKeuangan() {
  const [activeTab, setActiveTab] = useState('hpp');
  const [loading, setLoading] = useState(false);
  const [bulan, setBulan] = useState(new Date().getMonth() + 1);
  const [tahun, setTahun] = useState(new Date().getFullYear());
  
  const [reportData, setReportData] = useState(null);
  const [ledgerData, setLedgerData] = useState([]);
  const [wipData, setWipData] = useState([]);

  // LEDGER FILTERS
  const [coa, setCoa] = useState([]);
  const [selectedAkun, setSelectedAkun] = useState('');
  const [filterNama, setFilterNama] = useState('');

  const fetchBaseData = async () => {
    try {
      const resCoa = await fetch('/api/master/akun').then(r => r.json());
      setCoa(resCoa);
    } catch (err) { console.error(err); }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
        const res = await getFinancialReport(bulan, tahun);
        if (res.success) setReportData(res.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const fetchLedger = async () => {
      if (!selectedAkun) return;
      try {
          const res = await getBukuBesar(selectedAkun, filterNama, bulan, tahun);
          if (res.success) setLedgerData(res.data.list);
      } catch (err) { console.error(err); }
  };

  const fetchWip = async () => {
      try {
          const res = await getWipCutting();
          // API mengembalikan res.data sebagai object { data: [...], total_potong: ... }
          if (res.success) setWipData(res.data.data || []);
      } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchBaseData();
    fetchReports();
    fetchWip();
  }, [bulan, tahun]);

  const renderTable = (judul, data, total, isNeg = false) => {
      if (!data || Object.keys(data).length === 0) return null;
      return (
          <div className="space-y-3 mb-8">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2 border-l-4 border-emerald-500">{judul}</h4>
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                  <table className="w-full text-sm">
                      <tbody className="divide-y divide-slate-50">
                          {Object.entries(data).map(([name, val]) => (
                              <tr key={name} className="hover:bg-slate-50 transition-all">
                                  <td className="py-3 px-6 text-slate-600 italic">{name}</td>
                                  <td className={`py-3 px-6 text-right font-bold ${isNeg ? 'text-red-500' : 'text-slate-800'}`}>{formatRp(val)}</td>
                              </tr>
                          ))}
                          <tr className="bg-slate-50">
                              <td className="py-4 px-6 font-black text-[#064E3B] text-right">TOTAL {judul.toUpperCase()}</td>
                              <td className={`py-4 px-6 text-right font-black border-l-2 border-slate-200 ${isNeg ? 'text-red-600' : 'text-emerald-700'}`}>{formatRp(total)}</td>
                          </tr>
                      </tbody>
                  </table>
              </div>
          </div>
      );
  };

  // Render tabel neraca yang selalu tampil meski detail kosong (untuk Persediaan)
  const renderTableAlways = (judul, data, total, isNeg = false) => {
      const entries = data ? Object.entries(data) : [];
      return (
          <div className="space-y-3 mb-8">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2 border-l-4 border-amber-500">{judul}</h4>
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                  <table className="w-full text-sm">
                      <tbody className="divide-y divide-slate-50">
                          {entries.length > 0 ? entries.map(([name, val]) => (
                              <tr key={name} className="hover:bg-slate-50 transition-all">
                                  <td className="py-3 px-6 text-slate-600 italic">{name}</td>
                                  <td className={`py-3 px-6 text-right font-bold ${isNeg ? 'text-red-500' : 'text-slate-800'}`}>{formatRp(val)}</td>
                              </tr>
                          )) : (
                              <tr>
                                  <td className="py-3 px-6 text-slate-400 italic text-sm">Belum ada mutasi persediaan tercatat</td>
                                  <td className="py-3 px-6 text-right font-bold text-slate-400">Rp 0</td>
                              </tr>
                          )}
                          <tr className="bg-slate-50">
                              <td className="py-4 px-6 font-black text-[#064E3B] text-right">TOTAL {judul.toUpperCase()}</td>
                              <td className={`py-4 px-6 text-right font-black border-l-2 border-slate-200 ${isNeg ? 'text-red-600' : 'text-emerald-700'}`}>{formatRp(total || 0)}</td>
                          </tr>
                      </tbody>
                  </table>
              </div>
          </div>
      );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
        {/* Header Sekaligus Filter */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-900 flex items-center justify-center text-white shadow-xl">
                    <span className="material-symbols-rounded text-3xl">monitoring</span>
                </div>
                <div>
                    <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter font-outfit">Laporan Keuangan</h1>
                    <p className="text-slate-500 text-sm font-medium italic">Periode: {bulan}/{tahun}</p>
                </div>
            </div>

            <div className="flex items-center gap-3 bg-slate-100 p-2 rounded-2xl">
                <select className="bg-white p-2.5 rounded-xl text-sm font-bold border-none" value={bulan} onChange={e => setBulan(Number(e.target.value))}>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={m}>{new Date(2000, m-1).toLocaleString('id-ID', {month: 'long'})}</option>)}
                </select>
                <select className="bg-white p-2.5 rounded-xl text-sm font-bold border-none" value={tahun} onChange={e => setTahun(Number(e.target.value))}>
                    {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <button onClick={fetchReports} className="bg-emerald-600 text-white p-2.5 rounded-xl hover:bg-black transition-all">
                    <span className="material-symbols-rounded">sync</span>
                </button>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                        <a 
                            id="btn-rekap-penjualan"
                            href={`${import.meta.env.VITE_API_BASE_URL || ''}/api/laporan/export-pdf-penjualan-rekap?bulan=${bulan}&tahun=${tahun}`}
                            target="_blank"
                            rel="noreferrer"
                            className="bg-emerald-100 text-emerald-800 px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-emerald-600 hover:text-white transition-all border border-emerald-200"
                        >
                            <span className="material-symbols-rounded text-sm">summarize</span>
                            REKAP JUAL
                        </a>
                        <a 
                            id="btn-rekap-pembelian"
                            href={`${import.meta.env.VITE_API_BASE_URL || ''}/api/laporan/export-pdf-pembelian-rekap?bulan=${bulan}&tahun=${tahun}`}
                            target="_blank"
                            rel="noreferrer"
                            className="bg-orange-100 text-orange-800 px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-orange-600 hover:text-white transition-all border border-orange-200"
                        >
                            <span className="material-symbols-rounded text-sm">inventory_2</span>
                            REKAP BELI
                        </a>
                        <a 
                            id="btn-rekap-produksi"
                            href={`${import.meta.env.VITE_API_BASE_URL || ''}/api/laporan/export-pdf-produksi-rekap?bulan=${bulan}&tahun=${tahun}`}
                            target="_blank"
                            rel="noreferrer"
                            className="bg-blue-100 text-blue-800 px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-blue-600 hover:text-white transition-all border border-blue-200"
                        >
                            <span className="material-symbols-rounded text-sm">precision_manufacturing</span>
                            REKAP PRODUKSI
                        </a>
                        <a 
                            href={
                                activeTab === 'ledger' 
                                ? `${import.meta.env.VITE_API_BASE_URL || ''}/api/laporan/export-pdf-buku-besar?kode_akun=${selectedAkun || 'ALL'}&bulan=${bulan}&tahun=${tahun}&filter_nama=${filterNama}`
                                : `${import.meta.env.VITE_API_BASE_URL || ''}/api/laporan/export-pdf?tipe=${activeTab === 'hpp' ? 'HPP' : activeTab === 'lr' ? 'LR' : activeTab === 'ekuitas' ? 'EKUITAS' : 'NERACA'}&bulan=${bulan}&tahun=${tahun}`
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="bg-slate-800 text-white px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-emerald-600 transition-all shadow-lg shadow-slate-200"
                        >
                            <span className="material-symbols-rounded text-sm">print</span>
                            {activeTab === 'ledger' && !selectedAkun ? 'CETAK SEMUA' : 'CETAK PDF'}
                        </a>
                    </div>
            </div>
        </div>

        {/* TABS */}
        <div className="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-3xl w-fit">
            {[
                { id: 'hpp', label: 'HPP', icon: 'inventory' },
                { id: 'lr', label: 'Laba Rugi', icon: 'finance_mode' },
                { id: 'neraca', label: 'Neraca', icon: 'account_balance' },
                { id: 'ekuitas', label: 'Ekuitas', icon: 'finance_chip' },
                { id: 'ledger', label: 'Buku Besar', icon: 'analytics' },
                { id: 'wip', label: 'WIP Cutting', icon: 'content_cut' }
            ].map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black transition-all ${activeTab === t.id ? 'bg-[#064E3B] text-white shadow-lg' : 'text-slate-500 hover:bg-slate-200'}`}>
                    <span className="material-symbols-rounded text-lg">{t.icon}</span>
                    {t.label.toUpperCase()}
                </button>
            ))}
        </div>

        <div className="bg-white p-10 rounded-[3rem] shadow-[0_20px_60px_rgba(0,0,0,0.02)] border border-slate-50 min-h-[500px]">
             
             {loading && <div className="animate-pulse space-y-4 pt-10"><div className="h-10 bg-slate-100 rounded-xl w-1/3"></div><div className="h-40 bg-slate-50 rounded-3xl"></div></div>}
             
             {!loading && reportData && (
                 <>
                    {activeTab === 'hpp' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2">
                             {renderTable("Pemakaian Bahan Baku", reportData.hpp.bahan?.detail, reportData.hpp.bahan?.total)}
                             {renderTable("Biaya Tenaga Kerja", reportData.hpp.btkl?.detail, reportData.hpp.btkl?.total)}
                             {renderTable("Overhead Pabrik", reportData.hpp.bop?.detail, reportData.hpp.bop?.total)}
                             {renderTable("Barang Terjual (COGS)", reportData.hpp.terjual?.detail, reportData.hpp.terjual?.total)}
                             {reportData.hpp.ikhtisar?.total > 0 && renderTable("Ikhtisar Produksi (-)", reportData.hpp.ikhtisar?.detail, reportData.hpp.ikhtisar?.total, true)}
                             <div className="bg-[#064E3B] p-6 rounded-3xl text-white flex justify-between items-center shadow-xl">
                                <span className="font-black tracking-widest text-xs">TOTAL HARGA POKOK PRODUKSI (HPP)</span>
                                <span className="text-3xl font-black font-outfit">{formatRp(reportData.hpp.total_hpp)}</span>
                             </div>
                        </div>
                    )}

                    {activeTab === 'lr' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 space-y-6">
                             {renderTable("Pendapatan Operasional", reportData.laba_rugi.pendapatan?.detail, reportData.laba_rugi.pendapatan?.total)}
                             <div className="flex justify-between items-center px-6 py-4 bg-slate-100 rounded-2xl text-slate-500 font-bold">
                                <span>HARGA POKOK PRODUKSI (HPP) (-)</span>
                                <span>{formatRp(reportData.laba_rugi.hpp_negatif)}</span>
                             </div>
                             <div className="text-right py-4 border-b-2 border-dashed">
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest mr-4">Laba Kotor :</span>
                                <span className="text-2xl font-black text-slate-800">{formatRp(reportData.laba_rugi.laba_kotor)}</span>
                             </div>
                             {renderTable("Beban Pemasaran", reportData.laba_rugi.beban_jual?.detail, reportData.laba_rugi.beban_jual?.total, true)}
                             {renderTable("Beban Admin & Umum", reportData.laba_rugi.beban_admin?.detail, reportData.laba_rugi.beban_admin?.total, true)}
                             
                             <div className={`p-8 rounded-[2rem] text-white flex justify-between items-center shadow-2xl ${reportData.laba_rugi.laba_bersih >= 0 ? 'bg-emerald-600' : 'bg-red-600'}`}>
                                <div>
                                    <p className="text-[10px] font-black tracking-[0.3em] uppercase opacity-80">{reportData.laba_rugi.laba_bersih >= 0 ? 'Laba Bersih Periode Ini' : 'Rugi Bersih Periode Ini'}</p>
                                    <h2 className="text-5xl font-black font-outfit">{formatRp(reportData.laba_rugi.laba_bersih)}</h2>
                                </div>
                                <span className="material-symbols-rounded text-7xl opacity-30">{reportData.laba_rugi.laba_bersih >= 0 ? 'trending_up' : 'trending_down'}</span>
                             </div>
                        </div>
                    )}

                    {activeTab === 'neraca' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 grid grid-cols-1 lg:grid-cols-2 gap-10">
                             <div className="space-y-6">
                                <h3 className="bg-slate-900 text-white p-3 rounded-xl text-center text-xs font-black tracking-widest">AKTIVA / ASSET</h3>
                                {renderTable("Aset Lancar", reportData.neraca.aset_lancar?.detail, reportData.neraca.aset_lancar?.total)}
                                {renderTableAlways("Persediaan (12xxx)", reportData.neraca.persediaan?.detail, reportData.neraca.persediaan?.total)}
                                {renderTable("Aset Tetap", reportData.neraca.aset_tetap?.detail, reportData.neraca.aset_tetap?.total)}
                                {reportData.neraca.penyusutan?.total > 0 && renderTable("Akumulasi Penyusutan (-)", reportData.neraca.penyusutan?.detail, reportData.neraca.penyusutan?.total, true)}
                                <div className="bg-slate-800 p-6 rounded-2xl text-white flex justify-between items-center">
                                    <span className="font-bold text-xs">TOTAL AKTIVA</span>
                                    <span className="text-2xl font-black">{formatRp(reportData.neraca.total_aset)}</span>
                                </div>
                             </div>
                             <div className="space-y-6">
                                <h3 className="bg-slate-900 text-white p-3 rounded-xl text-center text-xs font-black tracking-widest">PASIVA / LIABILITAS & EKUITAS</h3>
                                {renderTable("Kewajiban Pendek", reportData.neraca.utang_pdk?.detail, reportData.neraca.utang_pdk?.total)}
                                {renderTable("Kewajiban Panjang", reportData.neraca.utang_pjg?.detail, reportData.neraca.utang_pjg?.total)}
                                {renderTable("Modal Disetor", reportData.neraca.modal_disetor?.detail, reportData.neraca.modal_disetor?.total)}
                                <div className="bg-white p-6 rounded-2xl border border-slate-100 flex justify-between items-center text-slate-800 font-bold mb-4">
                                    <span>Laba Ditahan & Berjalan</span>
                                    <span>{formatRp(reportData.neraca.laba_akumulasi)}</span>
                                </div>
                                {reportData.neraca.prive?.total > 0 && renderTable("Prive Pemilik (-)", reportData.neraca.prive?.detail, reportData.neraca.prive?.total, true)}
                                <div className="bg-emerald-900 p-6 rounded-2xl text-emerald-400 flex justify-between items-center">
                                    <span className="font-bold text-xs uppercase">Total Pasiva</span>
                                    <span className="text-2xl font-black text-white">{formatRp(reportData.neraca.total_pasiva)}</span>
                                </div>
                                <div className={`p-4 rounded-2xl text-center font-black text-sm border-2 ${reportData.neraca.is_balance ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-red-50 border-red-500 text-red-700'}`}>
                                    {reportData.neraca.is_balance ? '✅ NERACA BALANCE!' : '❌ NERACA TIDAK BALANCE!'}
                                </div>
                             </div>
                        </div>
                    )}

                    {activeTab === 'ekuitas' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 max-w-2xl mx-auto space-y-6">
                             <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
                                <h3 className="text-center font-black text-slate-800 text-xl border-b pb-4">Laporan Perubahan Ekuitas</h3>
                                <div className="flex justify-between items-center py-4 border-b">
                                    <span className="text-slate-500 font-bold">Modal Awal / Disetor</span>
                                    <span className="font-black text-slate-800 text-lg">{formatRp(reportData.ekuitas.modal_awal)}</span>
                                </div>
                                <div className="flex justify-between items-center py-4 border-b">
                                    <span className="text-slate-500 font-bold">Laba Ditahan & Berjalan</span>
                                    <span className="font-black text-emerald-600 text-lg">+{formatRp(reportData.ekuitas.laba_akumulasi)}</span>
                                </div>
                                {reportData.ekuitas.prive > 0 && (
                                    <div className="flex justify-between items-center py-4 border-b">
                                        <span className="text-slate-500 font-bold">Prive (Penarikan Pribadi)</span>
                                        <span className="font-black text-red-500 text-lg">-{formatRp(reportData.ekuitas.prive)}</span>
                                    </div>
                                )}
                                <div className="bg-[#064E3B] p-8 rounded-3xl text-white flex justify-between items-center mt-10">
                                    <span className="font-black text-xs tracking-widest">MODAL AKHIR PEMILIK</span>
                                    <span className="text-3xl font-black">{formatRp(reportData.ekuitas.modal_akhir)}</span>
                                </div>
                             </div>
                        </div>
                    )}

                    {activeTab === 'ledger' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 space-y-6">
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-6 rounded-3xl">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Pilih Akun</label>
                                    <select className="w-full p-3 border rounded-xl font-bold bg-white" value={selectedAkun} onChange={e => setSelectedAkun(e.target.value)}>
                                        <option value="">-- Cari Akun --</option>
                                        {coa.map(a => <option key={a.id} value={a.kode_akun}>[{a.kode_akun}] {a.nama_akun}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Filter Nama Mitra/Supp</label>
                                    <input type="text" className="w-full p-3 border rounded-xl bg-white" placeholder="Contoh: Toko Berkah" value={filterNama} onChange={e => setFilterNama(e.target.value)} />
                                </div>
                                <div className="flex items-end">
                                    <button onClick={fetchLedger} className="w-full bg-[#064E3B] text-white p-3 rounded-xl font-bold hover:bg-black transition-all">TAMPILKAN RINCIAN</button>
                                </div>
                             </div>

                             <div className="overflow-x-auto border border-slate-100 rounded-3xl">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 text-slate-500 font-black uppercase tracking-widest">
                                        <tr>
                                            <th className="py-4 px-6">Tanggal</th>
                                            <th className="py-4 px-6">Keterangan</th>
                                            <th className="py-4 px-6 text-right">Debit</th>
                                            <th className="py-4 px-6 text-right">Kredit</th>
                                            <th className="py-4 px-6 text-right">Saldo</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {ledgerData.map((row, i) => (
                                            <tr key={i} className={`hover:bg-slate-50/50 transition-all ${i === 0 ? 'bg-amber-50/30' : ''}`}>
                                                <td className="py-3 px-6 text-slate-400 font-medium">{new Date(row.tanggal).toLocaleDateString('id-ID')}</td>
                                                <td className="py-3 px-6 font-bold text-slate-700">{row.keterangan}</td>
                                                <td className="py-3 px-6 text-right text-emerald-600">{row.debit > 0 ? formatRp(row.debit) : '-'}</td>
                                                <td className="py-3 px-6 text-right text-red-600">{row.kredit > 0 ? formatRp(row.kredit) : '-'}</td>
                                                <td className="py-3 px-6 text-right font-black text-slate-900">{formatRp(row.saldo)}</td>
                                            </tr>
                                        ))}
                                        {ledgerData.length === 0 && <tr><td colSpan="5" className="py-20 text-center text-slate-300 italic">Pilih akun dan klik tampilkan.</td></tr>}
                                    </tbody>
                                </table>
                             </div>
                        </div>
                    )}

                    {activeTab === 'wip' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 space-y-8">
                             <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex items-center gap-4 text-blue-800">
                                <span className="material-symbols-rounded text-4xl">inventory_2</span>
                                <div>
                                    <h3 className="font-black text-lg">Work-In-Progress (WIP) Tracking</h3>
                                    <p className="text-sm font-medium opacity-80">Menghitung sisa antrean produksi Jahit berdasarkan hasil selisih laporan Cutting harian.</p>
                                </div>
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                {wipData.map(item => (
                                    <div key={item.kode_sku} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
                                        <div className={`absolute top-0 right-0 w-2 h-full ${item.sisa_wip > 0 ? 'bg-amber-400' : 'bg-emerald-500'}`}></div>
                                        <p className="text-[10px] font-black text-slate-400 mb-1">{item.kode_sku}</p>
                                        <h4 className="font-black text-slate-800 mb-4 h-10 overflow-hidden">{item.nama_barang}</h4>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[11px] font-bold">
                                                <span className="text-slate-400">Potong</span>
                                                <span className="text-slate-800">{item.total_potong} Pcs</span>
                                            </div>
                                            <div className="flex justify-between text-[11px] font-bold">
                                                <span className="text-slate-400">Masuk Jahit</span>
                                                <span className="text-emerald-600">{item.total_jahit} Pcs</span>
                                            </div>
                                            <div className="pt-2 border-t mt-2 flex justify-between items-end">
                                                <span className="text-[10px] font-black text-slate-400 tracking-widest">SISA WIP</span>
                                                <span className={`text-xl font-black ${item.sisa_wip > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>{item.sisa_wip} Pcs</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {wipData.length === 0 && <div className="col-span-4 py-20 text-center text-slate-300 italic">Belum ada data produksi tercatat.</div>}
                             </div>
                        </div>
                    )}
                 </>
             )}
        </div>
    </div>
  );
}
