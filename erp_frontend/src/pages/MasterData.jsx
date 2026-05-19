import { useState, useEffect } from 'react';
import api from '../api/api';
import { formatInputNumber, parseNumber } from '../utils/formatters';
import MitraHistoryModal from '../components/dashboard/MitraHistoryModal';

export default function MasterData() {
  const [activeTab, setActiveTab] = useState('Kartu Barang Jadi');
  
  const [data, setData] = useState({
    barang: [],
    karyawan: [],
    mitra: [],
    akun: []
  });
  
  const [modal, setModal] = useState({ show: false, type: '', item: null });
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);

  const openMitraHistory = (m) => {
    setSelectedPartner({
      mitra_id: m.id,
      nama_mitra: m.nama_mitra,
      kategori: m.kategori === 'Customer / Klien' ? 'PIUTANG KLIEN' : 'HUTANG SUPPLIER',
      nominal: m.kategori === 'Customer / Klien' ? m.saldo_piutang : m.saldo_utang
    });
    setIsPartnerModalOpen(true);
  };
  const [loading, setLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [helpContext, setHelpContext] = useState('barang');
  const [searchTerm, setSearchTerm] = useState('');
  const [stokHistory, setStokHistory] = useState({ barang: {}, list: [] });
  const [historyLoading, setHistoryLoading] = useState(false);

  // Form states
  const [formData, setFormData] = useState({});

  const fetchData = async () => {
    try {
      const urls = ['/master/barang', '/master/karyawan', '/master/mitra', '/master/akun'];
      const results = await Promise.all(urls.map(u => api.get(u)));
      const [barang, karyawan, mitra, akun] = results.map(res => res.data);
      setData({ barang, karyawan, mitra, akun });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    // Jika input adalah teks yang diformat ribuan (harga, gaji, dll)
    if (['harga_jual', 'nominal_gaji', 'saldo_kasbon_awal', 'saldo_awal', 'nominal_saldo'].includes(name)) {
        setFormData(prev => ({ ...prev, [name]: parseNumber(value) }));
    } else {
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? Number(value) : value }));
    }
  };

  const openModal = (type, item = null) => {
    let initialForm = item || {};
    if (type === 'saldo_awal') {
      initialForm = { 
        akun_id: '', 
        nama_akun: '', 
        keterangan: 'Saldo Awal Modal Operasional', 
        nominal_saldo: 0 
      };
    }
    setFormData(initialForm);
    setModal({ show: true, type, item });
  };

  const closeModal = () => {
    setModal({ show: false, type: '', item: null });
    setFormData({});
    setStokHistory({ barang: {}, list: [] });
  };

  const openKartuStok = async (item) => {
    setModal({ show: true, type: 'kartu_stok', item });
    setHistoryLoading(true);
    try {
      const res = await api.get(`/laporan/kartu-stok/${item.kode_sku}`);
      if (res.data.success) {
        setStokHistory({ barang: res.data.barang, list: res.data.history });
      }
    } catch (err) {
      console.error(err);
    }
    setHistoryLoading(false);
  };

  const submitForm = async (e) => {
    e.preventDefault();
    setLoading(true);
    let endpoint = '';
    let method = 'POST';
    
    if (modal.type === 'add_barang' || modal.type === 'edit_barang') endpoint = '/master/barang';
    else if (modal.type === 'add_karyawan' || modal.type === 'edit_karyawan') endpoint = '/master/karyawan';
    else if (modal.type === 'add_mitra' || modal.type === 'edit_mitra') endpoint = '/master/mitra';
    else if (modal.type === 'add_akun') endpoint = '/master/akun';
    else if (modal.type === 'saldo_awal') endpoint = '/master/saldo_awal';

    // Jika ini adalah aksi EDIT, tambahkan ID ke endpoint dan gunakan PUT
    if (modal.type.startsWith('edit_')) {
        endpoint += `/${modal.item.id}`;
        method = 'PUT';
    }

    try {
      let bodyData = { ...formData };
      
      // Inject fallback values for hidden / optional fields
      if (modal.type === 'add_karyawan') {
          if (!bodyData.no_hp) bodyData.no_hp = "-";
          if (!bodyData.alamat) bodyData.alamat = "-";
          if (bodyData.target_produksi_mingguan === undefined) bodyData.target_produksi_mingguan = 0;
          if (bodyData.nominal_gaji === undefined) bodyData.nominal_gaji = 0;
          if (bodyData.saldo_kasbon_awal === undefined) bodyData.saldo_kasbon_awal = 0;
      }
      if (modal.type === 'add_mitra') {
          if (!bodyData.no_hp) bodyData.no_hp = "-";
          if (!bodyData.email) bodyData.email = "-";
          if (!bodyData.alamat) bodyData.alamat = "-";
          if (bodyData.saldo_awal === undefined) bodyData.saldo_awal = 0;
      }
      
      // Sanitasi angka (mengkonversi string jadi number)
      ['harga_jual', 'harga_modal', 'stok_saat_ini', 'nominal_gaji', 'target_produksi_mingguan', 'saldo_kasbon_awal', 'saldo_awal', 'nominal_saldo'].forEach(key => {
        if (bodyData[key] !== undefined) bodyData[key] = Number(bodyData[key]);
      });

      const res = await api({
        url: endpoint,
        method,
        data: bodyData
      });
      const result = res.data;
      
      if (result.status === 'success' || result.success) {
        alert('Berhasil: ' + (result.message || 'Data tersimpan'));
        closeModal();
        fetchData();
      } else {
        alert('Gagal: ' + (result.message || 'Terjadi kesalahan pada server'));
      }
    } catch (err) {
      alert('Error Koneksi: ' + (err.response?.data?.message || err.message));
    }
    setLoading(false);
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm('Yakin ingin menghapus data ini?')) return;
    try {
      const res = await api.delete(`/master/${type}/${id}`);
      const result = res.data;
      if (result.status === 'success') {
        alert(result.message);
        fetchData();
      } else {
        alert(result.message);
      }
    } catch (err) {
      alert('Error menghapus: ' + err.message);
    }
  };

  const handlePrintStock = (tipe = 'all') => {
    // Validasi apakah ada data sebelum membuka tab baru
    let hasData = false;
    if (tipe === 'all') {
      hasData = data.barang.length > 0;
    } else if (tipe === 'baju') {
      hasData = data.barang.some(b => b.kategori?.includes('Barang Jadi') || b.kategori === 'BARANG_JADI');
    } else if (tipe === 'bahan') {
      hasData = data.barang.some(b => !b.kategori?.includes('Barang Jadi') && b.kategori !== 'BARANG_JADI');
    }

    if (!hasData) {
      alert(`Maaf, tidak ada data ${tipe === 'all' ? 'barang' : (tipe === 'baju' ? 'Barang Jadi' : 'Bahan Baku')} yang tersedia untuk dicetak saat ini.`);
      return;
    }

    const url = `${api.defaults.baseURL}/master/barang/print?tipe=${tipe}`;
    window.open(url, '_blank');
  };

  const tabs = ['Kartu Barang Jadi', 'Kartu Bahan Baku', 'Karyawan', 'Mitra Bisnis', 'Chart of Accounts', 'Saldo Awal'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-slate-100 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-1 bg-emerald-500 text-[8px] font-black text-white uppercase tracking-[0.3em] rotate-90 translate-x-3 translate-y-4 opacity-20 select-none pointer-events-none">Database Integrated</div>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 shadow-inner group-hover:rotate-6 transition-transform">
            <span className="material-symbols-rounded text-2xl">database</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold font-outfit text-slate-800 tracking-tight flex items-center gap-2">
              Master Data & SKU
              <button 
                  onClick={() => { setHelpContext(activeTab); setShowHelp(true); }}
                  className="w-6 h-6 rounded-full flex items-center justify-center bg-slate-100 text-slate-400 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
              >
                  <span className="material-symbols-rounded text-[14px]">info</span>
              </button>
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">Kelola data dasar Pabrik Atelier Emerald</p>
          </div>
        </div>
        <div className="flex mt-4 sm:mt-0 space-x-3">
            <button onClick={() => openModal('import_excel')} className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 text-sm font-bold rounded-xl hover:bg-emerald-100 transition-colors border border-emerald-100">
              <span className="material-symbols-rounded text-sm">upload_file</span>
              Import Excel
            </button>
            <button onClick={() => openModal('add_barang')} className="flex items-center gap-2 bg-[#064E3B] text-white px-5 py-2.5 text-sm font-bold rounded-xl hover:bg-black transition-all shadow-lg shadow-emerald-900/10 active:scale-95">
              <span className="material-symbols-rounded text-sm">add_circle</span>
              Tambah SKU Baru
            </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto space-x-1 p-1 bg-slate-100 rounded-xl my-4">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setSearchTerm(''); }}
            className={`px-6 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === tab 
                ? 'bg-[#064E3B] text-white shadow-md' 
                : 'text-slate-600 hover:bg-slate-200 hover:text-slate-800'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Konten Tabs */}
      <div className="bg-white rounded-2xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-slate-100">
        {/* KARTU BARANG JADI TAB */}
        {activeTab === 'Kartu Barang Jadi' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
               <h3 className="text-lg font-bold text-slate-800">Gudang Barang Jadi (Baju)</h3>
               <div className="flex items-center gap-3 w-full md:w-auto">
                 <div className="relative flex-1 md:w-64">
                   <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                   <input 
                     type="text" 
                     placeholder="Cari SKU / Nama / Model..." 
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                   />
                 </div>
                 <button 
                    onClick={() => handlePrintStock('baju')}
                    className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-all whitespace-nowrap"
                 >
                    <span className="material-symbols-rounded text-sm">picture_as_pdf</span>
                    Cetak Laporan Stok PDF
                 </button>
               </div>
            </div>
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black tracking-widest border-b border-slate-100">
                    <th className="py-4 px-4">Model Code</th>
                    <th className="py-4 px-4">Product Name</th>
                    <th className="py-4 px-4">SKU</th>
                    <th className="py-4 px-4 text-right">Stok Gudang</th>
                    <th className="py-4 px-4 text-right">Harga Modal / HPP</th>
                    <th className="py-4 px-4 text-right">Harga Jual / Lusin</th>
                    <th className="py-4 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.barang.filter(item => {
                    const matchesCategory = item.kategori.includes('Barang Jadi');
                    const matchesSearch = !searchTerm || 
                      item.nama_barang.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      item.kode_sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (item.model_code && item.model_code.toLowerCase().includes(searchTerm.toLowerCase()));
                    return matchesCategory && matchesSearch;
                  }).map(item => {
                    const stokTampil = `${(item.stok_saat_ini / 12).toFixed(1)} Lusin (${item.stok_saat_ini} Pcs)`;
                    
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 font-mono text-xs">{item.model_code}</td>
                        <td className="py-3 px-4 font-bold text-slate-800">{item.nama_barang}</td>
                        <td className="py-3 px-4 font-mono text-emerald-700">{item.kode_sku}</td>
                        <td className="py-3 px-4 text-right font-black text-slate-700">{stokTampil}</td>
                        <td className="py-3 px-4 text-right font-bold text-slate-500">
                          <div>Rp {Math.round(item.harga_modal || 0).toLocaleString('id-ID')} <span className="text-[10px] font-normal text-slate-400">/ Pcs</span></div>
                          <div className="text-[10px] font-medium text-emerald-600">Rp {Math.round((item.harga_modal || 0) * 12).toLocaleString('id-ID')} <span className="font-normal text-slate-400">/ Lusin</span></div>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600">
                          <div className="text-[10px] font-medium text-slate-400">Rp {Math.round((item.harga_jual || 0) / 12).toLocaleString('id-ID')} <span className="font-normal">/ Pcs</span></div>
                          <div>Rp {Math.round(item.harga_jual || 0).toLocaleString('id-ID')} <span className="text-[10px] font-normal text-slate-400">/ Lusin</span></div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button onClick={() => openKartuStok(item)} className="text-slate-400 hover:bg-slate-50 p-2 rounded-lg transition-all" title="Lihat Kartu Stok / History">
                            <span className="material-symbols-rounded text-[20px]">history</span>
                          </button>
                          <button onClick={() => openModal('edit_barang', item)} className="text-emerald-600 hover:bg-emerald-50 p-2 rounded-lg transition-all" title="Quick Edit / Stock Opname">
                            <span className="material-symbols-rounded text-[20px]">edit_square</span>
                          </button>
                          <button onClick={() => handleDelete('barang', item.id)} className="text-red-400 hover:bg-red-50 p-2 rounded-lg transition-all" title="Hapus Barang">
                            <span className="material-symbols-rounded text-[20px]">delete</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {data.barang.filter(item => {
                const matchesCategory = item.kategori.includes('Barang Jadi');
                const matchesSearch = !searchTerm || 
                  item.nama_barang.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  item.kode_sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  (item.model_code && item.model_code.toLowerCase().includes(searchTerm.toLowerCase()));
                return matchesCategory && matchesSearch;
              }).length === 0 && <div className="text-center py-20 text-slate-400 font-medium">Data tidak ditemukan atau belum ada data barang jadi.</div>}
            </div>
          </div>
        )}

        {/* KARTU BAHAN BAKU TAB */}
        {activeTab === 'Kartu Bahan Baku' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
               <h3 className="text-lg font-bold text-slate-800">Gudang Bahan Baku & Aksesoris</h3>
               <div className="flex items-center gap-3 w-full md:w-auto">
                 <div className="relative flex-1 md:w-64">
                   <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                   <input 
                     type="text" 
                     placeholder="Cari Bahan / SKU..." 
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                   />
                 </div>
                 <button 
                    onClick={() => handlePrintStock('bahan')}
                    className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-all whitespace-nowrap"
                 >
                    <span className="material-symbols-rounded text-sm">picture_as_pdf</span>
                    Cetak Laporan Stok PDF
                 </button>
               </div>
            </div>
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black tracking-widest border-b border-slate-100">
                    <th className="py-4 px-4">Kategori</th>
                    <th className="py-4 px-4">Nama Bahan</th>
                    <th className="py-4 px-4">Kode / SKU</th>
                    <th className="py-4 px-4 text-right">Stok Gudang</th>
                    <th className="py-4 px-4 text-right">Harga Modal / HPP</th>
                    <th className="py-4 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.barang.filter(item => {
                    const matchesCategory = !item.kategori.includes('Barang Jadi');
                    const matchesSearch = !searchTerm || 
                      item.nama_barang.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      item.kode_sku.toLowerCase().includes(searchTerm.toLowerCase());
                    return matchesCategory && matchesSearch;
                  }).map(item => {
                    const stokTampil = `${item.stok_saat_ini} ${item.satuan || 'Kg'}`;
                    
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4"><span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">{item.kategori}</span></td>
                        <td className="py-3 px-4 font-bold text-slate-800">{item.nama_barang}</td>
                        <td className="py-3 px-4 font-mono text-emerald-700">{item.kode_sku}</td>
                        <td className="py-3 px-4 text-right font-black text-slate-700">{stokTampil}</td>
                        <td className="py-3 px-4 text-right font-bold text-slate-500">
                          <div>Rp {Math.round(item.harga_modal || 0).toLocaleString('id-ID')} <span className="text-[10px] font-normal text-slate-400">/ {item.satuan || 'Kg'}</span></div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button onClick={() => openKartuStok(item)} className="text-slate-400 hover:bg-slate-50 p-2 rounded-lg transition-all" title="Lihat Kartu Stok / History">
                            <span className="material-symbols-rounded text-[20px]">history</span>
                          </button>
                          <button onClick={() => openModal('edit_barang', item)} className="text-emerald-600 hover:bg-emerald-50 p-2 rounded-lg transition-all" title="Quick Edit / Stock Opname">
                            <span className="material-symbols-rounded text-[20px]">edit_square</span>
                          </button>
                          <button onClick={() => handleDelete('barang', item.id)} className="text-red-400 hover:bg-red-50 p-2 rounded-lg transition-all" title="Hapus Barang">
                            <span className="material-symbols-rounded text-[20px]">delete</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {data.barang.filter(item => {
                const matchesCategory = !item.kategori.includes('Barang Jadi');
                const matchesSearch = !searchTerm || 
                  item.nama_barang.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  item.kode_sku.toLowerCase().includes(searchTerm.toLowerCase());
                return matchesCategory && matchesSearch;
              }).length === 0 && <div className="text-center py-20 text-slate-400 font-medium">Data tidak ditemukan atau belum ada data bahan baku.</div>}
            </div>
          </div>
        )}

        {/* KARYAWAN TAB */}
        {activeTab === 'Karyawan' && (
          <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
               <div className="relative w-full md:w-64">
                 <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                 <input 
                   type="text" 
                   placeholder="Cari Nama / Divisi..." 
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                 />
               </div>
               <button onClick={() => openModal('add_karyawan')} className="bg-[#10B981] text-white px-4 py-2 text-sm font-medium rounded-lg hover:bg-emerald-600 transition-all shadow-sm">Tambah Karyawan</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 uppercase text-xs font-bold border-b border-slate-100">
                    <th className="py-4 px-4">Nama</th>
                    <th className="py-4 px-4">Divisi</th>
                    <th className="py-4 px-4">Tipe Gaji</th>
                    <th className="py-4 px-4 text-right">Saldo Kasbon</th>
                    <th className="py-4 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.karyawan.filter(k => {
                    return !searchTerm || 
                      k.nama_karyawan.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      k.divisi.toLowerCase().includes(searchTerm.toLowerCase());
                  }).map(karyawan => (
                    <tr key={karyawan.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-800">{karyawan.nama_karyawan}</td>
                      <td className="py-3 px-4">{karyawan.divisi}</td>
                      <td className="py-3 px-4">{karyawan.tipe_gaji}</td>
                      <td className="py-3 px-4 text-right text-red-600 font-semibold">Rp {karyawan.saldo_kasbon?.toLocaleString('id-ID')}</td>
                      <td className="py-3 px-4 text-right">
                        <button onClick={() => openModal('edit_karyawan', karyawan)} className="text-emerald-600 hover:bg-emerald-50 p-2 rounded-lg transition-all mr-1">
                          <span className="material-symbols-rounded text-[20px]">edit_square</span>
                        </button>
                        <button onClick={() => handleDelete('karyawan', karyawan.id)} className="text-red-400 hover:bg-red-50 p-2 rounded-lg transition-all">
                          <span className="material-symbols-rounded text-[20px]">person_remove</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.karyawan.filter(k => {
                return !searchTerm || 
                  k.nama_karyawan.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  k.divisi.toLowerCase().includes(searchTerm.toLowerCase());
              }).length === 0 && <div className="text-center py-10 text-slate-400">Data karyawan tidak ditemukan.</div>}
            </div>
          </div>
        )}

        {/* MITRA BISNIS */}
        {activeTab === 'Mitra Bisnis' && (
          <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
               <div className="relative w-full md:w-64">
                 <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                 <input 
                   type="text" 
                   placeholder="Cari Nama / Alamat..." 
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                 />
               </div>
               <button onClick={() => openModal('add_mitra')} className="bg-[#10B981] text-white px-4 py-2 text-sm font-medium rounded-lg hover:bg-emerald-600 transition-all shadow-sm">Tambah Mitra Baru</button>
            </div>
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black tracking-widest border-b border-slate-100">
                    <th className="py-4 px-4">Nama Mitra</th>
                    <th className="py-4 px-4">Kategori</th>
                    <th className="py-4 px-4">No. HP / Kontak</th>
                    <th className="py-4 px-4">Alamat</th>
                    <th className="py-4 px-4 text-right">Piutang / Utang</th>
                    <th className="py-4 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.mitra.filter(m => {
                    return !searchTerm || 
                      m.nama_mitra.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (m.alamat && m.alamat.toLowerCase().includes(searchTerm.toLowerCase()));
                  }).map(m => (
                    <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4"><div className="font-bold text-slate-800">{m.nama_mitra}</div></td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${m.kategori.includes('Customer') ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                          {m.kategori}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">{m.no_hp || '-'}</td>
                      <td className="py-3 px-4 text-slate-400 text-xs truncate max-w-[150px]">{m.alamat || '-'}</td>
                      <td className="py-3 px-4 text-right font-medium">
                        {m.saldo_piutang > 0 && <span className="text-emerald-700 font-bold">Piutang: Rp {m.saldo_piutang.toLocaleString('id-ID')}</span>}
                        {m.saldo_utang > 0 && <span className="text-red-600 font-bold">Utang: Rp {m.saldo_utang.toLocaleString('id-ID')}</span>}
                        {m.saldo_piutang === 0 && m.saldo_utang === 0 && <span className="text-slate-300">Clean</span>}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {(m.saldo_piutang > 0 || m.saldo_utang > 0) && (
                          <button onClick={() => openMitraHistory(m)} className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition-all mr-1" title="Lihat Riwayat">
                            <span className="material-symbols-rounded text-[20px]">history</span>
                          </button>
                        )}
                        <button onClick={() => openModal('edit_mitra', m)} className="text-emerald-600 hover:bg-emerald-50 p-2 rounded-lg transition-all mr-1">
                           <span className="material-symbols-rounded text-[20px]">edit_square</span>
                        </button>
                        <button onClick={() => handleDelete('mitra', m.id)} className="text-slate-300 hover:text-red-500 p-2 rounded-lg transition-all">
                           <span className="material-symbols-rounded text-[20px]">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.mitra.filter(m => {
                return !searchTerm || 
                  m.nama_mitra.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  (m.alamat && m.alamat.toLowerCase().includes(searchTerm.toLowerCase()));
              }).length === 0 && <div className="text-center py-20 text-slate-400 font-medium">Data mitra bisnis tidak ditemukan.</div>}
            </div>
          </div>
        )}

        {/* Akun */}
        {activeTab === 'Chart of Accounts' && (
          <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
               <div className="relative w-full md:w-64">
                 <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                 <input 
                   type="text" 
                   placeholder="Cari Kode / Nama Akun..." 
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                 />
               </div>
               <button onClick={() => openModal('add_akun')} className="bg-[#064E3B] text-white px-4 py-2 text-sm font-medium rounded-lg hover:bg-emerald-900 transition-all shadow-sm">Tambah Akun</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm max-w-3xl">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 uppercase text-xs font-bold border-b border-slate-100">
                    <th className="py-4 px-4 w-32">Kode</th>
                    <th className="py-4 px-4">Nama Akun</th>
                    <th className="py-4 px-4">Kategori Akuntansi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.akun.filter(a => {
                    return !searchTerm || 
                      a.nama_akun.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      a.kode_akun.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      a.kategori.toLowerCase().includes(searchTerm.toLowerCase());
                  })
                  .sort((a, b) => a.kode_akun.localeCompare(b.kode_akun))
                  .map(a => (
                    <tr key={a.kode_akun} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-emerald-800">{a.kode_akun}</td>
                      <td className="py-3 px-4 text-slate-800">{a.nama_akun}</td>
                      <td className="py-3 px-4 text-slate-500">{a.kategori}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.akun.filter(a => {
                return !searchTerm || 
                  a.nama_akun.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  a.kode_akun.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  a.kategori.toLowerCase().includes(searchTerm.toLowerCase());
              }).length === 0 && <div className="text-center py-10 text-slate-400">Akun tidak ditemukan.</div>}
            </div>
          </div>
        )}

        {/* Saldo Awal */}
        {activeTab === 'Saldo Awal' && (
          <div className="max-w-xl text-center mx-auto py-8">
            <div className="bg-emerald-50 text-emerald-800 p-6 rounded-2xl mb-6 text-left">
              <h3 className="font-bold flex items-center gap-2 text-lg mb-2"><span className="material-symbols-rounded">account_balance</span> Input Modal Terkini</h3>
              <p className="text-emerald-700/80 text-sm">Integrasi nilai Kas dan Bank awal untuk perhitungan Neraca dan Buku Besar di sistem pabrik.</p>
            </div>
            <button onClick={() => openModal('saldo_awal')} className="bg-[#10B981] hover:bg-[#064E3B] text-white px-8 py-3 font-semibold rounded-xl transition-all shadow-lg hover:shadow-emerald-500/30">
              Input Saldo Awal (Modal Tunai/Bank)
            </button>
          </div>
        )}
      </div>

      {/* --- MODAL FORM --- */}
      {modal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-3">
              <h2 className="text-xl font-bold font-outfit text-slate-800">
                {modal.type === 'add_barang' && 'Tambah Master Barang'}
                {modal.type === 'edit_barang' && 'Edit / Adjust Barang (Stock Opname)'}
                {modal.type === 'add_karyawan' && 'Register Karyawan'}
                {modal.type === 'edit_karyawan' && 'Edit Data Karyawan'}
                {modal.type === 'add_mitra' && 'Tambah Mitra Baru'}
                {modal.type === 'edit_mitra' && 'Edit Profil Mitra Bisnis'}
                {modal.type === 'kartu_stok' && `Kartu Stok: ${modal.item?.nama_barang}`}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-700 bg-slate-100 p-1 rounded-full"><span className="material-symbols-rounded text-[20px]">close</span></button>
            </div>

            {/* KARTU STOK CONTENT */}
            {modal.type === 'kartu_stok' && (
              <div className="space-y-4">
                <div className="flex justify-between items-end bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SKU Terpilih</p>
                    <p className="text-sm font-bold text-slate-700">{stokHistory.barang.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stok Saat Ini</p>
                    <p className="text-xl font-black text-emerald-600">{stokHistory.barang.stok_akhir} <span className="text-xs font-medium text-slate-400">{stokHistory.barang.satuan}</span></p>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-100 rounded-xl max-h-[400px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-white shadow-sm z-10">
                      <tr className="bg-slate-100 text-slate-500 font-bold uppercase text-[9px] tracking-wider border-b border-slate-200">
                        <th className="py-3 px-4">Tanggal</th>
                        <th className="py-3 px-4">Keterangan / Transaksi</th>
                        <th className="py-3 px-4 text-center">Masuk</th>
                        <th className="py-3 px-4 text-center">Keluar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {historyLoading ? (
                        <tr><td colSpan="4" className="py-10 text-center text-slate-400">Memuat data histori...</td></tr>
                      ) : (
                        <>
                          {stokHistory.list.length === 0 ? (
                            <tr><td colSpan="4" className="py-10 text-center text-slate-400">Belum ada mutasi tercatat untuk barang ini.</td></tr>
                          ) : (
                            stokHistory.list.map((h, i) => (
                              <tr key={i} className="hover:bg-slate-50/50">
                                <td className="py-2.5 px-4 text-slate-400 font-mono">
                                  {new Date(h.tanggal + (h.tanggal.endsWith('Z') ? '' : 'Z')).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="py-2.5 px-4 font-medium text-slate-600">
                                  <div className="flex items-center gap-2">
                                    <span className={`w-1.5 h-1.5 rounded-full ${h.masuk > 0 ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                                    {h.keterangan}
                                  </div>
                                </td>
                                <td className="py-2.5 px-4 text-center font-bold text-emerald-600">{h.masuk > 0 ? `+${h.masuk}` : '-'}</td>
                                <td className="py-2.5 px-4 text-center font-bold text-red-600">{h.keluar > 0 ? `-${h.keluar}` : '-'}</td>
                              </tr>
                            ))
                          )}
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg flex gap-3 items-start">
                   <span className="material-symbols-rounded text-blue-500 text-sm">info</span>
                   <p className="text-[10px] text-blue-700 leading-tight">Histori ini ditarik dari Log Produksi, Detail Penjualan, dan Jurnal Penyesuaian SKU terkait sejak sistem digunakan.</p>
                </div>
              </div>
            )}

            {/* FORM IMPORT (Tanpa hit API biasa) */}
            {modal.type === 'import_excel' ? (
              <div className="space-y-6">
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex gap-3">
                  <span className="material-symbols-rounded text-amber-600">warning</span>
                  <div>
                    <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">Peringatan Penting</p>
                    <p className="text-[11px] text-amber-700 leading-relaxed">Gunakan format .xlsx yang sesuai standar. Jika memilih metode <b>TIMPA DATA</b>, sistem akan menghapus seluruh data lama pada kategori tersebut dan menggantinya dengan isi file baru.</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest pl-1">Jenis Data</label>
                    <select 
                      id="import_tipe"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="BAJU">Produk Jadi (Baju)</option>
                      <option value="BAHAN">Bahan Baku / Kain / Penolong</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest pl-1">Metode Import</label>
                    <select 
                      id="import_method"
                      onChange={(e) => {
                        const agreementBox = document.getElementById('agreement_container');
                        if (e.target.value === 'overwrite') agreementBox.classList.remove('hidden');
                        else agreementBox.classList.add('hidden');
                      }}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="append">Tambah Data (Append)</option>
                      <option value="overwrite">Timpa Data (Overwrite)</option>
                    </select>
                  </div>
                </div>

                <div id="agreement_container" className="hidden bg-red-50 border border-red-100 p-4 rounded-xl">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" id="agreement_check" className="mt-1 w-4 h-4 rounded border-red-300 text-red-600 focus:ring-red-500" />
                    <span className="text-[11px] font-bold text-red-700 leading-tight">SAYA SETUJU untuk menghapus seluruh data lama yang ada di sistem dan menggantinya dengan data dari file ini secara permanen.</span>
                  </label>
                </div>

                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center bg-slate-50/50 hover:bg-slate-50 transition-all relative group">
                  <span className="material-symbols-rounded text-5xl text-slate-300 group-hover:text-emerald-500 transition-colors mb-3">cloud_upload</span>
                  <div className="font-bold text-slate-600">Klik atau seret file Excel ke sini</div>
                  <div className="text-[10px] text-slate-400 mt-1 font-medium tracking-wide">FORMAT: .XLSX ONLY</div>
                  <input 
                    type="file" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    id="file_import" 
                    accept=".xlsx" 
                    onChange={(e) => {
                      if(e.target.files[0]) {
                        document.getElementById('file_label').innerText = "✅ " + e.target.files[0].name;
                        document.getElementById('file_label').classList.add('scale-110');
                      }
                    }}
                  />
                  <div id="file_label" className="mt-4 text-emerald-600 font-black text-xs transition-transform duration-300"></div>
                </div>

                <div className="pt-4 flex justify-between items-center border-t border-slate-100">
                   <button onClick={closeModal} className="text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-600 transition-colors pl-2">Batalkan</button>
                   <button 
                     id="btn_import_submit"
                     onClick={async () => { 
                       const fileInput = document.getElementById('file_import');
                       const tipe = document.getElementById('import_tipe').value;
                       const method = document.getElementById('import_method').value;
                       const agreement = document.getElementById('agreement_check').checked;
                       const btn = document.getElementById('btn_import_submit');
                       
                       if (!fileInput.files[0]) return alert('Silakan pilih file Excel terlebih dahulu!');
                       if (method === 'overwrite' && !agreement) return alert('Anda harus menyetujui perintah penghapusan data lama terlebih dahulu!');
                       
                       const formData = new FormData();
                       formData.append('file', fileInput.files[0]);
                       
                       btn.innerText = "SEDANG MEMPROSES...";
                       btn.disabled = true;
                       btn.classList.add('opacity-50');
                       
                       try {
                         const res = await api.post(`/master/import-excel?tipe=${tipe}&overwrite=${method === 'overwrite'}`, formData, {
                           headers: { 'Content-Type': 'multipart/form-data' }
                         });
                         const result = res.data;
                         if (result.status === 'success') {
                           alert('BERHASIL! ' + result.message);
                           closeModal();
                           fetchData();
                         } else {
                           alert('GAGAL: ' + result.message);
                         }
                       } catch (err) {
                         alert('KESALAHAN: ' + (err.response?.data?.message || err.message));
                       } finally {
                         btn.innerText = "MULAI IMPORT DATA";
                         btn.disabled = false;
                         btn.classList.remove('opacity-50');
                       }
                     }} 
                     className="bg-[#064E3B] text-white px-8 py-3.5 rounded-xl font-black text-xs tracking-[0.1em] shadow-xl shadow-emerald-900/20 hover:bg-black transition-all"
                   >
                     MULAI IMPORT DATA
                   </button>
                </div>
              </div>
            ) : (

            <form onSubmit={submitForm}>
              {/* === INPUTS FOR BARANG === */}
              {(modal.type === 'add_barang' || modal.type === 'edit_barang') && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-1">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Kategori</label>
                    <select name="kategori" value={formData.kategori || ''} onChange={handleInputChange} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm" required>
                      <option value="">-- Pilih --</option>
                      <option value="Bahan Baku (Kain)">Bahan Baku (Kain)</option>
                      <option value="Bahan Pembantu (Benang, Kancing, dll)">Bahan Pembantu</option>
                      <option value="Bahan Penolong (Label, Plastik, dll)">Bahan Penolong</option>
                      <option value="Barang Jadi (Baju)">Barang Jadi (Baju)</option>
                    </select>
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Satuan</label>
                    <input type="text" name="satuan" value={formData.satuan || ''} onChange={handleInputChange} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm" placeholder="Kg / Lusin / Pcs" required />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Kode Model</label>
                    <input type="text" name="model_code" value={formData.model_code || ''} onChange={handleInputChange} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm" required />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Nama Barang</label>
                    <input type="text" name="nama_barang" value={formData.nama_barang || ''} onChange={handleInputChange} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm" required />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">SKU</label>
                    <input type="text" name="kode_sku" value={formData.kode_sku || ''} onChange={handleInputChange} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm" required />
                  </div>
                  <div className="col-span-1">
                    <label className={`block text-xs font-semibold text-slate-500 mb-1 ${formData.kategori?.includes('Barang Jadi') ? '' : 'opacity-30'}`}>Harga Jual (PER LUSIN) {formData.kategori?.includes('Barang Jadi') ? '' : '(Khusus Barang Jadi)'}</label>
                    <input 
                      type="text" 
                      name="harga_jual" 
                      value={formatInputNumber(formData.harga_jual || '')} 
                      onChange={handleInputChange} 
                      className={`w-full p-2.5 border border-slate-200 rounded-lg text-sm font-bold text-emerald-700 ${formData.kategori?.includes('Barang Jadi') ? 'bg-white' : 'bg-slate-100'}`} 
                      disabled={!formData.kategori?.includes('Barang Jadi')}
                      placeholder={formData.kategori?.includes('Barang Jadi') ? 'Rp 0' : 'Hanya untuk Produk Jadi'}
                    />
                    {formData.kategori?.includes('Barang Jadi') && <p className="text-[10px] text-slate-400 mt-1">Sama dengan Rp {(Number(formData.harga_jual || 0) / 12).toLocaleString('id-ID')} / Pcs</p>}
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Harga Modal / HPP (PER PCS)</label>
                    <input type="text" name="harga_modal" value={formatInputNumber(formData.harga_modal || '')} onChange={handleInputChange} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 font-bold" readOnly={modal.type === 'edit_barang' && formData.kategori === 'Barang Jadi (Baju)'} />
                    {modal.type === 'edit_barang' && formData.kategori === 'Barang Jadi (Baju)' ? (
                        <p className="text-[10px] text-emerald-600 font-medium mt-1">HPP dihitung otomatis dari produksi</p>
                    ) : (
                        <p className="text-[10px] text-slate-400 mt-1">Sama dengan Rp {(Number(formData.harga_modal || 0) * 12).toLocaleString('id-ID')} / Lusin</p>
                    )}
                  </div>
                  
                  {modal.type === 'edit_barang' && (
                    <div className="col-span-2 bg-emerald-50 p-4 border border-emerald-100 rounded-xl mt-2 flex gap-4 items-center">
                       <span className="material-symbols-rounded text-emerald-600 text-3xl">inventory</span>
                       <div className="flex-1">
                         <label className="block text-xs font-bold text-emerald-800 mb-1">STOK FISIK SAAT INI (STOCK OPNAME)</label>
                         <p className="text-[11px] text-emerald-700/80 mb-2 leading-tight">Perubahan stok akan secara otomatis menjurnal (BOP Kerusakan / Pendapatan Selisih).</p>
                         <input type="number" step="0.1" name="stok_saat_ini" value={formData.stok_saat_ini || ''} onChange={handleInputChange} className="w-full p-2.5 border-2 border-emerald-300 rounded-lg text-sm font-bold shadow-inner" required />
                       </div>
                    </div>
                  )}
                </div>
              )}

              {/* === INPUTS FOR KARYAWAN === */}
              {(modal.type === 'add_karyawan' || modal.type === 'edit_karyawan') && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Nama Lengkap</label>
                    <input type="text" name="nama_karyawan" value={formData.nama_karyawan || ''} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded-lg text-sm" required />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Divisi</label>
                    <select name="divisi" value={formData.divisi || ''} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded-lg text-sm" required>
                      <option value="">Pilih</option>
                      <option value="Cutting">Cutting</option>
                      <option value="Jahit / Makloon">Jahit / Makloon</option>
                      <option value="Finishing & QC">Finishing & QC</option>
                      <option value="Administrasi Umum">Administrasi Umum</option>
                    </select>
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Tipe Gaji</label>
                    <select name="tipe_gaji" value={formData.tipe_gaji || ''} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded-lg text-sm" required>
                      <option value="">Pilih</option>
                      <option value="Borongan (Per Pcs)">Borongan (Per Pcs)</option>
                      <option value="Mingguan (Tetap)">Mingguan (Tetap)</option>
                      <option value="Bulanan (Tetap)">Bulanan (Tetap)</option>
                    </select>
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Nominal Gaji Pokok (Jika ada)</label>
                    <input type="text" name="nominal_gaji" value={formatInputNumber(formData.nominal_gaji || 0)} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded-lg text-sm" />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Saldo Kasbon Awal (Rp)</label>
                    <input type="text" name="saldo_kasbon_awal" value={formatInputNumber(formData.saldo_kasbon_awal || 0)} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded-lg text-sm" />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">No. HP</label>
                    <input type="text" name="no_hp" value={formData.no_hp || ''} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded-lg text-sm" />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Target Produksi (Pcs/Minggu)</label>
                    <input type="number" name="target_produksi_mingguan" value={formData.target_produksi_mingguan || 0} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded-lg text-sm" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Alamat Tinggal</label>
                    <textarea name="alamat" value={formData.alamat || ''} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded-lg text-sm" rows="2"></textarea>
                  </div>
                </div>
              )}

              {/* MITRA */}
              {(modal.type === 'add_mitra' || modal.type === 'edit_mitra') && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Nama Mitra / Toko</label>
                    <input type="text" name="nama_mitra" value={formData.nama_mitra || ''} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded-lg text-sm" required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Sebagai Kategori</label>
                    <select name="kategori" value={formData.kategori || ''} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded-lg text-sm" required>
                      <option value="">Pilih</option>
                      <option value="Customer / Klien">Customer (Klien)</option>
                      <option value="Supplier Bahan Baku">Supplier</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-1">
                        <label className="block text-xs font-semibold text-slate-500 mb-1">No. HP / WA</label>
                        <input type="text" name="no_hp" value={formData.no_hp || ''} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded-lg text-sm" />
                    </div>
                    <div className="col-span-1">
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Email Address</label>
                        <input type="email" name="email" value={formData.email || ''} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded-lg text-sm" placeholder="kantor@mitra.com" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Saldo Awal Piutang/Utang (Rp)</label>
                        <input type="text" name="saldo_awal" value={formatInputNumber(formData.saldo_awal || 0)} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded-lg text-sm font-bold text-emerald-700" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Alamat Kantor/Toko</label>
                    <textarea name="alamat" value={formData.alamat || ''} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded-lg text-sm" rows="2"></textarea>
                  </div>
                </div>
              )}

              {/* AKUN COA */}
              {modal.type === 'add_akun' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Kode Akun</label>
                    <input type="text" name="kode_akun" placeholder="Cth: 51210" value={formData.kode_akun || ''} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded-lg text-sm font-mono" required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Nama Akun</label>
                    <input type="text" name="nama_akun" placeholder="Cth: Upah Jahit" value={formData.nama_akun || ''} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded-lg text-sm" required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Kategori Akun</label>
                    <select name="kategori" value={formData.kategori || ''} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded-lg text-sm" required>
                      <option value="">Pilih Kategori</option>
                      <option value="Aset">Aset</option>
                      <option value="Kewajiban">Kewajiban</option>
                      <option value="Ekuitas">Ekuitas</option>
                      <option value="Pendapatan">Pendapatan</option>
                      <option value="Beban">Beban</option>
                    </select>
                  </div>
                </div>
              )}

              {/* SALDO AWAL */}
              {modal.type === 'saldo_awal' && (
                <div className="space-y-4">
                  <div className="bg-yellow-50 text-yellow-800 text-xs p-3 rounded flex gap-2">
                     <span className="material-symbols-rounded text-[16px]">info</span>
                     <p>Pemasukan saldo awal ini akan menjurnal Debit Kas/Bank yang dipilih, dan mengkredit ke Modal Disetor Pemilik.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Pilih Akun Penyimpanan</label>
                    <select name="akun_id" value={formData.akun_id || ''} onChange={(e) => {
                      const sel = e.target.options[e.target.selectedIndex];
                      setFormData(p => ({ ...p, akun_id: e.target.value, nama_akun: sel.text.split(' - ')[1] }));
                    }} className="w-full p-2 border border-slate-200 rounded-lg text-sm" required>
                      <option value="">-- Pilih --</option>
                      <option value="11110">11110 - Kas Tunai</option>
                      <option value="11120">11120 - BCA</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Nominal (Rp)</label>
                    <input type="text" name="nominal_saldo" value={formatInputNumber(formData.nominal_saldo || '')} onChange={handleInputChange} className="w-full p-3 border border-slate-200 rounded-lg font-bold text-lg text-emerald-800" required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Keterangan Jurnal</label>
                    <input type="text" name="keterangan" value={formData.keterangan || 'Saldo Awal Modal Operasional'} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded-lg text-sm" required />
                  </div>
                </div>
              )}

              <div className="pt-6 mt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={closeModal} className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Batal</button>
                <button type="submit" disabled={loading} className="px-6 py-2.5 text-sm font-bold bg-[#064E3B] text-white rounded-lg shadow-md hover:bg-emerald-900 transition-colors disabled:opacity-70 disabled:cursor-not-allowed">
                  {loading ? 'Menyimpan...' : 'Simpan Data'}
                </button>
              </div>
            </form>
            )}
          </div>
        </div>
      )}
      {/* ── HELP / TUTORIAL MODAL (DYNAMIC CONTENT) ────────────────── */}
      {showHelp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 slide-in-from-bottom-8 duration-300">
                {/* Header Help */}
                <div className="p-8 text-white flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800">
                    <div className="flex items-center gap-6">
                        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/10 shadow-inner">
                            <span className="material-symbols-rounded text-2xl">
                                {activeTab.includes('Kartu') ? 'inventory' : activeTab === 'Karyawan' ? 'group' : activeTab === 'Mitra Bisnis' ? 'handshake' : activeTab === 'Chart of Accounts' ? 'account_tree' : 'account_balance'}
                            </span>
                        </div>
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tighter">
                                PANDUAN {activeTab.toUpperCase()}
                            </h2>
                            <p className="text-white/70 text-xs font-medium italic">Standard Operating Procedure - Raziq Garmen Master Core</p>
                        </div>
                    </div>
                    <button onClick={() => setShowHelp(false)} className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
                        <span className="material-symbols-rounded">close</span>
                    </button>
                </div>

                {/* Content Help (Scrollable) */}
                <div className="p-10 overflow-y-auto space-y-8 font-outfit text-slate-700">
                    
                    {activeTab.includes('Kartu') && (
                        <div className="space-y-6">
                            <section className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100 space-y-2">
                                <h3 className="font-black text-emerald-800 uppercase text-sm tracking-widest">Manajemen Inventori & SKU</h3>
                                <p className="text-sm leading-relaxed">Ini adalah pusat data barang. <b>Stock Opname</b> dilakukan dengan tombol edit, dan <b>Audit Stok</b> bisa dilihat via ikon histori.</p>
                            </section>
                            <div className="grid grid-cols-2 gap-4 text-xs font-medium">
                                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                                    <p className="font-black text-emerald-700 mb-1 uppercase text-[10px]">Barang Jadi:</p>
                                    <p>Stok dihitung dalam <b>Lusin</b>. Harga modal (HPP) mencakup biaya kain + upah yang diinput saat produksi.</p>
                                </div>
                                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                                    <p className="font-black text-amber-700 mb-1 uppercase text-[10px]">Bahan Baku:</p>
                                    <p>Stok dihitung dalam <b>Kg / Meter</b>. Nilai stok berkurang otomatis saat Anda menginput data "Cutting" di menu produksi.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'Karyawan' && (
                        <div className="space-y-6">
                            <section className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 space-y-2">
                                <h3 className="font-black text-blue-800 uppercase text-sm tracking-widest">SDM & Klasifikasi Gaji</h3>
                                <p className="text-sm leading-relaxed">Pendaftaran karyawan menentukan hak akses dan perhitungan gaji otomatis di sistem.</p>
                            </section>
                            <div className="bg-slate-900 p-6 rounded-3xl text-white space-y-4 shadow-xl">
                                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Logika Penggajian:</p>
                                <ul className="text-[11px] space-y-3 list-disc pl-4 text-slate-300 font-medium">
                                    <li><b>Gaji Tetap:</b> Gaji harian atau bulanan yang tidak tergantung jumlah produksi.</li>
                                    <li><b>Gaji Borongan (Cutter):</b> Gaji yang muncul otomatis di rekap tagihan berdasarkan hasil pcs yang dipotong.</li>
                                    <li><b>Saldo Kasbon:</b> Akan terpotong otomatis jika Anda menginput "Bayar Gaji" di menu Keuangan.</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {activeTab === 'Mitra Bisnis' && (
                        <div className="space-y-6">
                            <section className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 space-y-2">
                                <h3 className="font-black text-indigo-800 uppercase text-sm tracking-widest">Vendor & Customer Management</h3>
                                <p className="text-sm leading-relaxed">Pusat data mitra untuk memantau integritas piutang dan hutang usaha.</p>
                            </section>
                            <div className="p-5 border-l-4 border-emerald-500 bg-emerald-50 rounded-r-xl">
                                <p className="text-[11px] leading-relaxed font-medium italic">"Setiap transaksi di menu Penjualan atau Pembelian yang bersifat <b>Tempo</b> akan langsung mengupdate saldo piutang/hutang mitra yang bersangkutan di halaman ini."</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'Chart of Accounts' && (
                        <div className="space-y-6">
                            <section className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-2 text-center">
                                <h3 className="font-black text-slate-800 uppercase text-sm tracking-widest">Backbone Akuntansi (COA)</h3>
                                <p className="text-sm leading-relaxed">Struktur bagan akun yang digunakan untuk klasifikasi Jurnal Otomatis. Nomor akun adalah identitas unik yang tidak boleh diubah sembarangan.</p>
                            </section>
                            <div className="grid grid-cols-2 gap-2 text-[9px] font-black uppercase tracking-widest">
                                <div className="p-2 bg-emerald-100 text-emerald-800 rounded">1xxx - ASET (KAS, BANK, STOK)</div>
                                <div className="p-2 bg-red-100 text-red-800 rounded">2xxx - KEWAJIBAN (UTANG)</div>
                                <div className="p-2 bg-blue-100 text-blue-800 rounded">3xxx - EKUITAS (MODAL)</div>
                                <div className="p-2 bg-purple-100 text-purple-800 rounded">4xxx - PENDAPATAN</div>
                                <div className="p-2 bg-amber-100 text-amber-800 rounded">5xxx - BIAYA OPERASIONAL</div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'Saldo Awal' && (
                        <div className="space-y-6">
                            <section className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100 space-y-2">
                                <h3 className="font-black text-amber-800 uppercase text-sm tracking-widest">Inisialisasi Sistem</h3>
                                <p className="text-sm leading-relaxed">Digunakan saat pertama kali menggunakan sistem untuk memasukkan saldo riil di rekening bank atau kas tunai perusahaan.</p>
                            </section>
                        </div>
                    )}

                    <div className="pt-6 border-t border-slate-100">
                        <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl justify-center">
                            <span className="material-symbols-rounded text-slate-400">verified_user</span>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter text-center">
                                SUMBER ATURAN: SAK INDONESIA, INTERNAL CONTROL PROCEDURES RAZIQ GARMEN, & DATA INTEGRITY ALGORITHMS
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Help */}
                <div className="p-8 border-t border-slate-100 flex justify-center bg-slate-50/50">
                    <button onClick={() => setShowHelp(false)} className="px-16 py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-black transition-all shadow-xl hover:scale-105 active:scale-95 uppercase tracking-widest text-xs">SAYA MENGERTI, LANJUTKAN KERJA</button>
                </div>
            </div>
        </div>
      )}

      <MitraHistoryModal
        isOpen={isPartnerModalOpen}
        onClose={() => { setIsPartnerModalOpen(false); setSelectedPartner(null); }}
        partner={selectedPartner}
      />
    </div>
  );
}
