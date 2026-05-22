import React, { useState, useEffect } from 'react';
import { getFinancialReport, getBukuBesar, getGrafikPenjualan } from '../api/laporanApi';

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
  const [grafikData, setGrafikData] = useState([]);
  const [filterGrafik, setFilterGrafik] = useState('mingguan'); // 'mingguan' atau 'harian'

  // LEDGER FILTERS
  const [coa, setCoa] = useState([]);
  const [selectedAkun, setSelectedAkun] = useState('');
  const [filterNama, setFilterNama] = useState('');
  const [analogy, setAnalogy] = useState({ open: false, title: '', content: null });

  const handlePrintPdf = (e, path) => {
    e.preventDefault();
    const absoluteUrl = `${window.location.origin}${path}`;
    const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobileDevice) {
      window.location.href = absoluteUrl;
    } else {
      window.open(absoluteUrl, '_blank');
    }
  };

  const analogies = {
    hpp: {
      title: "Analogi Perhitungan HPP (Sistem Perpetual)",
      content: (
        <div className="space-y-4 text-slate-600 leading-relaxed">
          <p>Sistem Raziq Garmen menggunakan metode **Akuntansi Perpetual**, di mana HPP (Harga Pokok Penjualan) dihitung secara real-time berdasarkan barang yang **benar-benar laku terjual**.</p>
          
          <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100">
            <p className="font-black text-emerald-800 text-xs mb-2 uppercase">Prinsip Utama (5W + 1H):</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
              <p>📌 <span className="font-bold">What:</span> Nilai modal baju yang sudah laku terjual.</p>
              <p>📌 <span className="font-bold">Why:</span> Agar Bapak tidak 'rugi palsu' saat beli kain banyak.</p>
              <p>📌 <span className="font-bold">Where:</span> Diambil dari akun **51120** (Terjual) & **12130** (WIP).</p>
              <p>📌 <span className="font-bold">When:</span> Berubah otomatis tiap ada invoice / produksi.</p>
              <p>📌 <span className="font-bold">Who:</span> Dihitung otomatis oleh AI & Sistem Raziq Garmen.</p>
              <p>📌 <span className="font-bold">How:</span> Biaya di-antrekan di WIP, lalu jadi HPP saat laku.</p>
            </div>
          </div>

          <ul className="space-y-3">
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex-shrink-0 flex items-center justify-center font-bold text-xs">1</span>
              <p><span className="font-black text-slate-800">Biaya Input (Bahan & Upah):</span> Saat kain dipotong atau upah dibayar, nilainya "parkir" dulu di akun **12130 (WIP)**. Ini belum dianggap biaya/beban di Laba Rugi karena bajunya belum laku.</p>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex-shrink-0 flex items-center justify-center font-bold text-xs">2</span>
              <p><span className="font-black text-slate-800">Antrean Produksi (WIP):</span> Selama proses jahit, modal Bapak aman sebagai Aset (Harta). Nilainya akan naik-turun tergantung berapa banyak baju yang sedang "mengantre" di penjahit.</p>
            </li>
            <li className="flex gap-3 border-t border-emerald-100 pt-3">
              <span className="w-6 h-6 rounded-full bg-amber-500 text-white flex-shrink-0 flex items-center justify-center font-bold text-xs shadow-md">3</span>
              <p><span className="font-black text-slate-800">HPP (Barang Terjual):</span> Saat Bapak buat invoice penjualan, sistem otomatis menarik modal dari stok dan menjadikannya HPP. Inilah nilai yang Bapak lihat di Laba Rugi.</p>
            </li>
          </ul>
          
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[10px] italic">
             *Rumus: Input Biaya (Bahan+Upah) &rarr; Antrean (WIP) &rarr; Stok (Ready) &rarr; HPP (Laku).
          </div>
        </div>
      )
    },
    lr: {
      title: "Analogi Perhitungan Laba Rugi",
      content: (
        <div className="space-y-4 text-slate-600 leading-relaxed">
          <p>Laporan ini menunjukkan **performa bisnis** Bapak: Apakah bulan ini untung atau buntung?</p>
          <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
            <p className="font-black text-blue-800 text-xs mb-2 uppercase">Alur Perhitungan:</p>
            <p className="font-mono text-sm font-bold text-blue-900">Penjualan Bruto - Retur/Diskon = Pendapatan Bersih</p>
            <p className="font-mono text-sm font-bold text-blue-900">Pendapatan Bersih - HPP = Laba Kotor</p>
            <p className="font-mono text-sm font-bold text-blue-900">Laba Kotor - Beban Operasional = Laba Bersih</p>
          </div>
          <ul className="space-y-3">
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex-shrink-0 flex items-center justify-center font-bold text-xs">1</span>
              <p><span className="font-black text-slate-800">Pendapatan (41xxx):</span> Semua uang yang masuk dari invoice penjualan. Nilai ini sudah dikurangi jika ada customer yang retur atau dapat diskon.</p>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex-shrink-0 flex items-center justify-center font-bold text-xs">2</span>
              <p><span className="font-black text-slate-800">Laba Kotor:</span> Keuntungan murni dari selisih harga jual dan modal produksi. Belum dipotong biaya kantor.</p>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex-shrink-0 flex items-center justify-center font-bold text-xs">3</span>
              <p><span className="font-black text-slate-800">Beban Operasional:</span> Biaya 'sewa napas' perusahaan, seperti Gaji Admin, Iklan, Sewa Domain, dan Listrik Kantor.</p>
            </li>
          </ul>
        </div>
      )
    },
    neraca: {
      title: "Analogi Perhitungan Neraca",
      content: (
        <div className="space-y-4 text-slate-600 leading-relaxed">
          <p>Neraca adalah potret **kekayaan bersih** perusahaan pada saat ini. Ini harus selalu seimbang antara kiri dan kanan.</p>
          <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
            <p className="font-black text-amber-800 text-xs mb-2 uppercase">Prinsip Keseimbangan (Balance):</p>
            <p className="font-mono text-sm font-bold text-amber-900">ASET = KEWAJIBAN + EKUITAS</p>
          </div>
          <ul className="space-y-3">
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex-shrink-0 flex items-center justify-center font-bold text-xs">A</span>
              <p><span className="font-black text-slate-800">Aset (Harta):</span> Uang di Kas/Bank, Piutang, Stok Kain, **Stok WIP (Baju Antre Jahit)**, Stok Baju Jadi, hingga Mesin Jahit Bapak.</p>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex-shrink-0 flex items-center justify-center font-bold text-xs">K</span>
              <p><span className="font-black text-slate-800">Kewajiban (Hutang):</span> Hutang ke supplier kain atau hutang gaji yang belum dibayar.</p>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex-shrink-0 flex items-center justify-center font-bold text-xs">E</span>
              <p><span className="font-black text-slate-800">Ekuitas (Modal):</span> Uang modal awal Bapak ditambah akumulasi keuntungan (Laba Ditahan) selama ini.</p>
            </li>
          </ul>
        </div>
      )
    },
    ekuitas: {
      title: "Analogi Perubahan Ekuitas",
      content: (
        <div className="space-y-4 text-slate-600 leading-relaxed">
          <p>Laporan ini mencatat bagaimana **modal Bapak berkembang** dari awal sampai sekarang.</p>
          <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100">
            <p className="font-black text-purple-800 text-xs mb-2 uppercase">Rumus Pertumbuhan:</p>
            <p className="font-mono text-sm font-bold text-purple-900">Modal Awal + Laba Bersih - Prive = Modal Akhir</p>
          </div>
          <ul className="space-y-3">
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex-shrink-0 flex items-center justify-center font-bold text-xs">1</span>
              <p><span className="font-black text-slate-800">Modal Awal:</span> Uang atau aset yang Bapak masukkan pertama kali saat memulai bisnis ini.</p>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex-shrink-0 flex items-center justify-center font-bold text-xs">2</span>
              <p><span className="font-black text-slate-800">Laba Bersih:</span> Tambahan kekayaan yang didapat dari operasional bisnis bulan ini.</p>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex-shrink-0 flex items-center justify-center font-bold text-xs">3</span>
              <p><span className="font-black text-slate-800">Prive (Penarikan):</span> Uang yang Bapak ambil dari bisnis untuk keperluan pribadi Bapak.</p>
            </li>
          </ul>
        </div>
      )
    },
    aruskas: {
      title: "Analogi Perhitungan Arus Kas",
      content: (
        <div className="space-y-4 text-slate-600 leading-relaxed">
          <p>Laporan ini mencatat **alur uang tunai** (Kas/Bank) masuk dan keluar. Berbeda dengan Laba Rugi, ini fokus pada 'fisik' uangnya.</p>
          <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
            <p className="font-black text-emerald-800 text-xs mb-2 uppercase">3 Kategori Utama:</p>
            <p className="font-mono text-sm font-bold text-emerald-900">Operasional + Investasi + Pendanaan = Alur Kas</p>
          </div>
          <ul className="space-y-3">
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex-shrink-0 flex items-center justify-center font-bold text-xs">1</span>
              <p><span className="font-black text-slate-800">Aktivitas Operasional:</span> Uang dari jualan customer dikurangi bayar supplier, gaji karyawan, dan listrik. Ini adalah 'darah' bisnis Bapak.</p>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex-shrink-0 flex items-center justify-center font-bold text-xs">2</span>
              <p><span className="font-black text-slate-800">Aktivitas Investasi:</span> Uang yang Bapak keluarkan untuk beli aset jangka panjang, seperti mesin jahit baru atau kendaraan operasional.</p>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex-shrink-0 flex items-center justify-center font-bold text-xs">3</span>
              <p><span className="font-black text-slate-800">Aktivitas Pendanaan:</span> Uang masuk dari suntikan modal atau uang keluar yang Bapak ambil (Prive).</p>
            </li>
          </ul>
        </div>
      )
    }
  };

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

  const fetchGrafik = async () => {
      try {
          const res = await getGrafikPenjualan(bulan, tahun, filterGrafik);
          if (res.success) setGrafikData(res.data);
      } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchBaseData();
    fetchReports();
    fetchGrafik();
  }, [bulan, tahun, filterGrafik]);

  const renderTable = (judul, data, total, isNeg = false) => {
      if (!data || Object.keys(data).length === 0) return null;
      return (
          <div className="space-y-4 mb-8">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-3 border-l-4 border-emerald-500">{judul}</h4>
              <div className="bg-white rounded-[1.5rem] border border-slate-100 overflow-hidden shadow-md shadow-slate-200/40 hover:shadow-lg transition-shadow duration-300">
                  <table className="w-full text-sm">
                      <tbody className="divide-y divide-slate-50/80">
                          {Object.entries(data).map(([name, val]) => (
                              <tr key={name} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="py-3.5 px-6 text-slate-600 font-medium">{name}</td>
                                  <td className={`py-3.5 px-6 text-right font-bold ${isNeg ? 'text-red-500' : 'text-slate-800'}`}>{formatRp(val)}</td>
                              </tr>
                          ))}
                          <tr className={isNeg ? "bg-red-50/50" : "bg-emerald-50/50"}>
                              <td className="py-4 px-6 font-black text-slate-700 text-right uppercase tracking-wider text-xs">TOTAL {judul}</td>
                              <td className={`py-4 px-6 text-right font-black border-l border-white/50 text-base ${isNeg ? 'text-red-600' : 'text-emerald-700'}`}>{formatRp(total)}</td>
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
          <div className="space-y-4 mb-8">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-3 border-l-4 border-amber-500">{judul}</h4>
              <div className="bg-white rounded-[1.5rem] border border-slate-100 overflow-hidden shadow-md shadow-slate-200/40 hover:shadow-lg transition-shadow duration-300">
                  <table className="w-full text-sm">
                      <tbody className="divide-y divide-slate-50/80">
                          {entries.length > 0 ? entries.map(([name, val]) => (
                              <tr key={name} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="py-3.5 px-6 text-slate-600 font-medium">{name}</td>
                                  <td className={`py-3.5 px-6 text-right font-bold ${isNeg ? 'text-red-500' : 'text-slate-800'}`}>{formatRp(val)}</td>
                              </tr>
                          )) : (
                              <tr>
                                  <td className="py-5 px-6 text-slate-400 italic text-sm text-center" colSpan="2">Belum ada mutasi persediaan tercatat</td>
                              </tr>
                          )}
                          <tr className={isNeg ? "bg-amber-50/50" : "bg-emerald-50/50"}>
                              <td className="py-4 px-6 font-black text-slate-700 text-right uppercase tracking-wider text-xs">TOTAL {judul}</td>
                              <td className={`py-4 px-6 text-right font-black border-l border-white/50 text-base ${isNeg ? 'text-red-600' : 'text-emerald-700'}`}>{formatRp(total || 0)}</td>
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
        <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100 flex flex-col gap-6">
            
            {/* Baris Atas: Judul & Filter */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-[1.25rem] bg-gradient-to-br from-[#064E3B] to-emerald-800 flex items-center justify-center text-emerald-50 shadow-lg shadow-emerald-900/20 flex-shrink-0">
                        <span className="material-symbols-rounded text-3xl">monitoring</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight font-outfit">Laporan Keuangan</h1>
                        <p className="text-slate-500 text-sm font-medium mt-1">Periode: <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md ml-1">{bulan}/{tahun}</span></p>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-50/80 p-2 rounded-2xl border border-slate-200/60 shadow-inner w-full lg:w-auto justify-between lg:justify-start">
                    <select className="bg-transparent px-3 py-2 rounded-xl text-sm font-bold border-none text-slate-700 focus:ring-0 cursor-pointer hover:bg-white transition-colors" value={bulan} onChange={e => setBulan(Number(e.target.value))}>
                        {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={m}>{new Date(2000, m-1).toLocaleString('id-ID', {month: 'long'})}</option>)}
                    </select>
                    <div className="w-px h-6 bg-slate-300/50"></div>
                    <select className="bg-transparent px-3 py-2 rounded-xl text-sm font-bold border-none text-slate-700 focus:ring-0 cursor-pointer hover:bg-white transition-colors" value={tahun} onChange={e => setTahun(Number(e.target.value))}>
                        {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <button onClick={fetchReports} className="bg-emerald-600 text-white w-10 h-10 rounded-[14px] hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center shadow-md shadow-emerald-600/30 ml-1">
                        <span className="material-symbols-rounded text-lg">sync</span>
                    </button>
                </div>
            </div>

            {/* Garis Pemisah */}
            <div className="w-full h-px bg-slate-100"></div>

            {/* Baris Bawah: Tombol-tombol Aksi */}
            <div className="flex flex-wrap items-center justify-start lg:justify-end gap-3 w-full">
                <a 
                    id="btn-rekap-penjualan"
                    href="#"
                    onClick={(e) => handlePrintPdf(e, `/api/laporan/export-pdf-penjualan-rekap?bulan=${bulan}&tahun=${tahun}`)}
                    className="bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-[14px] text-[11px] font-black tracking-wider flex items-center gap-2 hover:bg-emerald-600 hover:text-white transition-colors border border-emerald-100 hover:border-emerald-600 shadow-sm"
                >
                    <span className="material-symbols-rounded text-base">summarize</span>
                    <span className="hidden sm:inline">REKAP</span> JUAL
                </a>
                <a 
                    id="btn-rekap-pembelian"
                    href="#"
                    onClick={(e) => handlePrintPdf(e, `/api/laporan/export-pdf-pembelian-rekap?bulan=${bulan}&tahun=${tahun}`)}
                    className="bg-orange-50 text-orange-700 px-4 py-2.5 rounded-[14px] text-[11px] font-black tracking-wider flex items-center gap-2 hover:bg-orange-500 hover:text-white transition-colors border border-orange-100 hover:border-orange-500 shadow-sm"
                >
                    <span className="material-symbols-rounded text-base">inventory_2</span>
                    <span className="hidden sm:inline">REKAP</span> BELI
                </a>
                <a 
                    id="btn-rekap-produksi"
                    href="#"
                    onClick={(e) => handlePrintPdf(e, `/api/laporan/export-pdf-produksi-rekap?bulan=${bulan}&tahun=${tahun}`)}
                    className="bg-blue-50 text-blue-700 px-4 py-2.5 rounded-[14px] text-[11px] font-black tracking-wider flex items-center gap-2 hover:bg-blue-600 hover:text-white transition-colors border border-blue-100 hover:border-blue-600 shadow-sm"
                >
                    <span className="material-symbols-rounded text-base">precision_manufacturing</span>
                    <span className="hidden sm:inline">REKAP</span> PROD
                </a>
                <div className="w-px h-8 bg-slate-200 hidden sm:block mx-1"></div>
                <a 
                    href="#"
                    onClick={(e) => handlePrintPdf(e, 
                        activeTab === 'ledger' 
                        ? `/api/laporan/export-pdf-buku-besar?kode_akun=${selectedAkun || 'ALL'}&bulan=${bulan}&tahun=${tahun}&filter_nama=${filterNama}`
                        : `/api/laporan/export-pdf?tipe=${activeTab === 'hpp' ? 'HPP' : activeTab === 'lr' ? 'LR' : activeTab === 'ekuitas' ? 'EKUITAS' : activeTab === 'aruskas' ? 'ARUSKAS' : 'NERACA'}&bulan=${bulan}&tahun=${tahun}`
                    )}
                    className="bg-slate-800 text-white px-6 py-2.5 rounded-[14px] text-[11px] font-black tracking-wider flex items-center gap-2 hover:bg-emerald-600 active:scale-95 transition-all shadow-lg shadow-slate-800/20"
                >
                    <span className="material-symbols-rounded text-base">print</span>
                    {activeTab === 'ledger' && !selectedAkun ? 'CETAK SEMUA' : 'CETAK PDF'}
                </a>
            </div>
        </div>

        {/* TABS */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 p-3 sm:p-1.5 bg-white/60 backdrop-blur-md rounded-3xl sm:rounded-full w-full sm:w-fit shadow-sm border border-slate-200/50">
            {[
                { id: 'hpp', label: 'HPP', icon: 'inventory' },
                { id: 'lr', label: 'Laba Rugi', icon: 'finance_mode' },
                { id: 'neraca', label: 'Neraca', icon: 'account_balance' },
                { id: 'aruskas', label: 'Arus Kas', icon: 'account_balance_wallet' },
                { id: 'ekuitas', label: 'Ekuitas', icon: 'finance_chip' },
                { id: 'ledger', label: 'Buku Besar', icon: 'analytics' },
                { id: 'grafik', label: 'Grafik Penjualan', icon: 'insights' }
            ].map(t => (
                <button 
                    key={t.id} 
                    onClick={() => setActiveTab(t.id)} 
                    className={`flex items-center gap-3 px-6 py-3.5 sm:py-3 rounded-2xl sm:rounded-full text-xs font-bold transition-all duration-300 w-full sm:w-auto ${activeTab === t.id ? 'bg-[#064E3B] text-white shadow-md shadow-emerald-900/20 scale-[1.02] sm:scale-105' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
                >
                    <span className="material-symbols-rounded text-[1.1rem]">{t.icon}</span>
                    {t.label.toUpperCase()}
                </button>
            ))}
        </div>

        <div className="bg-white p-10 rounded-[3rem] shadow-[0_20px_60px_rgba(0,0,0,0.02)] border border-slate-50 min-h-[500px]">
             
             {!loading && reportData && (
                  <>
                    <div className="flex justify-between items-center mb-10">
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-black text-slate-800 font-outfit uppercase tracking-widest">
                                {activeTab === 'hpp' ? 'Analisis Harga Pokok (HPP)' : 
                                 activeTab === 'lr' ? 'Laporan Laba Rugi' :
                                 activeTab === 'neraca' ? 'Posisi Keuangan (Neraca)' :
                                 activeTab === 'aruskas' ? 'Laporan Arus Kas' :
                                 activeTab === 'ekuitas' ? 'Perubahan Modal' :
                                 activeTab === 'ledger' ? 'Buku Besar Akun' : 'Grafik Penjualan'}
                            </h2>
                            {analogies[activeTab] && (
                                <button 
                                    onClick={() => setAnalogy({ open: true, ...analogies[activeTab] })}
                                    className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center hover:bg-amber-500 hover:text-white transition-all shadow-sm"
                                    title="Klik untuk melihat analogi perhitungan"
                                >
                                    <span className="material-symbols-rounded text-lg">lightbulb</span>
                                </button>
                            )}
                        </div>
                        <div className="text-[10px] font-black text-slate-400 bg-slate-50 px-4 py-1.5 rounded-full border">
                            REAL-TIME SYNCED
                        </div>
                    </div>

                    {activeTab === 'hpp' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2">
                             {renderTable("Pemakaian Bahan Baku", reportData.hpp.bahan?.detail, reportData.hpp.bahan?.total)}
                             {renderTable("Biaya Tenaga Kerja", reportData.hpp.btkl?.detail, reportData.hpp.btkl?.total)}
                             {renderTable("Overhead Pabrik", reportData.hpp.bop?.detail, reportData.hpp.bop?.total)}
                             
                             {/* Selalu tampilkan jika ada saldo, baik positif maupun negatif */}
                             {Math.abs(reportData.hpp.terjual?.total || 0) > 0 && 
                                renderTable("HPP Barang Terjual", reportData.hpp.terjual?.detail, reportData.hpp.terjual?.total)}
                             
                             {Math.abs(reportData.hpp.ikhtisar?.total || 0) > 0 && 
                                renderTable("Ikhtisar Produksi (Output/-)", reportData.hpp.ikhtisar?.detail, reportData.hpp.ikhtisar?.total, reportData.hpp.ikhtisar?.total < 0)}
                             
                             <div className="bg-[#064E3B] p-6 rounded-3xl text-white flex justify-between items-center shadow-xl mt-4">
                                <span className="font-black tracking-widest text-xs uppercase">Total Beban Pokok Penjualan (HPP / COGS)</span>
                                <span className="text-3xl font-black font-outfit">{formatRp(reportData.hpp.total_hpp)}</span>
                             </div>
                        </div>
                    )}

                    {activeTab === 'lr' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 space-y-6">
                             {renderTable("Pendapatan Operasional", reportData.laba_rugi.pendapatan?.detail, reportData.laba_rugi.pendapatan?.total)}
                             <div className="flex justify-between items-center px-6 py-4 bg-slate-100 rounded-2xl text-slate-500 font-bold">
                                <span>BEBAN POKOK PENJUALAN (HPP/COGS) (-)</span>
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

                    {activeTab === 'aruskas' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 space-y-6">
                            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                                <div className="flex justify-between items-center mb-6 border-b pb-4 px-2">
                                    <span className="text-slate-400 font-black text-xs uppercase tracking-widest">Saldo Awal Kas & Bank</span>
                                    <span className="text-xl font-black text-slate-800">{formatRp(reportData.arus_kas.saldo_awal)}</span>
                                </div>

                                <div className="space-y-8">
                                    {/* OPERASIONAL */}
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] bg-emerald-50 w-fit px-3 py-1 rounded-full ml-2">Aktivitas Operasional</h4>
                                        {renderTable("Uang Masuk Operasional", reportData.arus_kas.operasional.detail_masuk, reportData.arus_kas.operasional.masuk)}
                                        {renderTable("Uang Keluar Operasional", reportData.arus_kas.operasional.detail_keluar, reportData.arus_kas.operasional.keluar, true)}
                                    </div>

                                    {/* INVESTASI */}
                                    {(reportData.arus_kas.investasi.masuk > 0 || reportData.arus_kas.investasi.keluar > 0) && (
                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] bg-blue-50 w-fit px-3 py-1 rounded-full ml-2">Aktivitas Investasi</h4>
                                            {reportData.arus_kas.investasi.masuk > 0 && renderTable("Uang Masuk Investasi", reportData.arus_kas.investasi.detail_masuk, reportData.arus_kas.investasi.masuk)}
                                            {reportData.arus_kas.investasi.keluar > 0 && renderTable("Uang Keluar Investasi", reportData.arus_kas.investasi.detail_keluar, reportData.arus_kas.investasi.keluar, true)}
                                        </div>
                                    )}

                                    {/* PENDANAAN */}
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black text-purple-600 uppercase tracking-[0.2em] bg-purple-50 w-fit px-3 py-1 rounded-full ml-2">Aktivitas Pendanaan</h4>
                                        {renderTable("Uang Masuk Pendanaan", reportData.arus_kas.pendanaan.detail_masuk, reportData.arus_kas.pendanaan.masuk)}
                                        {renderTable("Uang Keluar Pendanaan", reportData.arus_kas.pendanaan.detail_keluar, reportData.arus_kas.pendanaan.keluar, true)}
                                    </div>
                                </div>

                                <div className="mt-10 pt-6 border-t-4 border-double border-slate-100 flex flex-col gap-4">
                                    <div className="flex justify-between items-center text-sm font-bold text-slate-500 px-4">
                                        <span>Total Kenaikan / Penurunan Kas</span>
                                        <span className={reportData.arus_kas.total_kenaikan >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                                            {formatRp(reportData.arus_kas.total_kenaikan)}
                                        </span>
                                    </div>
                                    <div className="bg-[#064E3B] p-8 rounded-3xl text-white flex justify-between items-center shadow-2xl">
                                        <div>
                                            <p className="text-[10px] font-black tracking-[0.3em] uppercase opacity-80">Saldo Akhir Kas & Bank</p>
                                            <h2 className="text-4xl font-black font-outfit">{formatRp(reportData.arus_kas.saldo_akhir)}</h2>
                                        </div>
                                        <span className="material-symbols-rounded text-6xl opacity-30">payments</span>
                                    </div>
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

                    {activeTab === 'grafik' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 space-y-8">
                             <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                                <div className="flex items-center gap-4 text-emerald-800">
                                    <span className="material-symbols-rounded text-4xl">monitoring</span>
                                    <div>
                                        <h3 className="font-black text-lg">Grafik Penjualan</h3>
                                        <p className="text-sm font-medium opacity-80">Visualisasi tren pendapatan kotor (termasuk diskon) selama periode {bulan}/{tahun}.</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setFilterGrafik('mingguan')} className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all ${filterGrafik === 'mingguan' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-100'}`}>Mingguan</button>
                                    <button onClick={() => setFilterGrafik('harian')} className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all ${filterGrafik === 'harian' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-100'}`}>Harian</button>
                                </div>
                             </div>

                             <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
                                {grafikData.length > 0 ? (() => {
                                    const maxVal = Math.max(...grafikData.map(d => d.value));
                                    const totalPenjualan = grafikData.reduce((sum, d) => sum + d.value, 0);
                                    
                                    return (
                                        <>
                                            <div className="flex justify-between items-end mb-10">
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">TOTAL PENJUALAN KOTOR</p>
                                                    <h3 className="text-3xl font-black text-slate-800 font-outfit">{formatRp(totalPenjualan)}</h3>
                                                </div>
                                                <div className="text-right hidden sm:block">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">DATA TERTINGGI</p>
                                                    <h3 className="text-lg font-bold text-emerald-600">{formatRp(maxVal)}</h3>
                                                </div>
                                            </div>
                                            
                                            <div className="relative h-64 sm:h-80 w-full flex items-end gap-2 sm:gap-4 pb-8 pt-4">
                                                {/* Garis Horizontal Latar */}
                                                <div className="absolute inset-0 flex flex-col justify-between pb-8 z-0">
                                                    <div className="border-b border-slate-100 border-dashed w-full h-0"></div>
                                                    <div className="border-b border-slate-100 border-dashed w-full h-0"></div>
                                                    <div className="border-b border-slate-100 border-dashed w-full h-0"></div>
                                                    <div className="border-b border-slate-200 w-full h-0"></div>
                                                </div>
                                                
                                                {/* Bars */}
                                                {grafikData.map((d, i) => {
                                                    const heightPct = maxVal > 0 ? (d.value / maxVal) * 100 : 0;
                                                    return (
                                                        <div key={i} className="relative flex flex-col justify-end items-center flex-1 h-full z-10 group">
                                                            {/* Tooltip Hover */}
                                                            <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap pointer-events-none mb-2 z-20">
                                                                {formatRp(d.value)}
                                                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                                                            </div>
                                                            
                                                            {/* Bar Chart */}
                                                            <div 
                                                                className={`w-full max-w-[40px] rounded-t-xl transition-all duration-700 ${heightPct > 0 ? 'bg-gradient-to-t from-emerald-600 to-emerald-400 hover:from-emerald-700 hover:to-emerald-500' : 'bg-slate-100'}`}
                                                                style={{ height: `${heightPct}%`, minHeight: heightPct > 0 ? '4px' : '0' }}
                                                            ></div>
                                                            
                                                            {/* Label Bawah */}
                                                            <span className="absolute -bottom-8 text-[9px] sm:text-[11px] font-bold text-slate-500 whitespace-nowrap transform -rotate-45 sm:rotate-0 origin-top-left sm:origin-center mt-2">{d.label}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    );
                                })() : (
                                    <div className="py-20 text-center text-slate-400 font-medium">Belum ada data penjualan pada periode ini.</div>
                                )}
                             </div>
                        </div>
                    )}
                 </>
             )}
        </div>

        {/* ANALOGY MODAL */}
        {analogy.open && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 border border-white/20">
                    <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-amber-50 to-white">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-200">
                                <span className="material-symbols-rounded">lightbulb</span>
                            </div>
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">{analogy.title}</h3>
                        </div>
                        <button onClick={() => setAnalogy({ ...analogy, open: false })} className="w-10 h-10 rounded-full hover:bg-red-50 hover:text-red-500 text-slate-400 flex items-center justify-center transition-all">
                            <span className="material-symbols-rounded">close</span>
                        </button>
                    </div>
                    <div className="p-10 max-h-[70vh] overflow-y-auto">
                        {analogy.content}
                    </div>
                    <div className="p-6 bg-slate-50 text-center border-t border-slate-100">
                        <button 
                            onClick={() => setAnalogy({ ...analogy, open: false })}
                            className="bg-[#064E3B] text-white px-10 py-3.5 rounded-2xl font-black text-xs hover:bg-black transition-all shadow-xl shadow-emerald-100"
                        >
                            SAYA MENGERTI
                        </button>
                    </div>
                </div>
            </div>
        )}
        {/* Version Indicator */}
        <div className="text-center pt-20 pb-10 opacity-20 hover:opacity-100 transition-opacity">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">Raziq Garmen ERP v1.0.6 - Premium UI Update</p>
        </div>
    </div>
  );
}
