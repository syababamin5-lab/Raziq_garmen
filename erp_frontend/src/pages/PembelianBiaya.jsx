import React, { useState, useEffect } from 'react';
import { 
    submitPembelianBahan, 
    submitOpex, 
    submitAset, 
    runPenyusutan, 
    getAsetSummary,
    getAsetList,
    getPembelianList,
    getPembelianDetails,
    submitReturPembelian,
    bayarPOCepat,
    voidPembelian
} from '../api/pembelianApi';
import { getDashboardSummary } from '../api/dashboardApi';
import { formatRp, formatInputNumber, parseNumber } from '../utils/formatters';
import PurchaseDetailModal from '../components/dashboard/PurchaseDetailModal';

export default function PembelianBiaya() {
  const [activeTab, setActiveTab] = useState('bahan');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [balance, setBalance] = useState({ tunai: 0, bank: 0 });

  // Data for Selects
  const [suppliers, setSuppliers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [coa, setCoa] = useState([]);
  const [asetSummary, setAsetSummary] = useState([]);
  const [asetList, setAsetList] = useState([]);
  const [susutStatus, setSusutStatus] = useState({ sudah_susut: false, jumlah_susut: 0, bulan: '' });

  // CART (State untuk Pembelian Bahan)
  const [cart, setCart] = useState([]);
  const [cartForm, setCartForm] = useState({ sku: '', nama: '', qty: 1, harga: 0, kat: 'Bahan Baku (Kain)' });
  const [bahanMeta, setBahanMeta] = useState({ supplier_id: '', metode: 'Kas Tunai', tgl: new Date().toISOString().split('T')[0], dp: 0, dp_sumber: 'Kas Tunai', diskon: 0 });

  // Purchase Detail Modal (icon mata)
  const [purchaseModal, setPurchaseModal] = useState({ open: false, po: null });

  // OPEX FORM
  const [opexForm, setOpexForm] = useState({ tgl: new Date().toISOString().split('T')[0], akun: '', nominal: 0, ket: '', sumber: 'Kas Tunai' });

  // ASET FORM
  const [asetForm, setAsetForm] = useState({ tgl: new Date().toISOString().split('T')[0], akun: '13210', nama_barang: '', nominal: 0, sumber: 'Kas Tunai' });

  // RETUR FORM
  const [poList, setPoList] = useState([]);
  const [poDetails, setPoDetails] = useState([]);
  const [returForm, setReturForm] = useState({ 
    no_po: '', 
    kode_sku: '', 
    qty_retur: 0, 
    tgl_retur: new Date().toISOString().split('T')[0], 
    alasan: 'Barang Cacat / Rusak' 
  });
  const [payModal, setPayModal] = useState({ open: false, no_po: '', nama_supplier: '', nominal: 0, sumber_dana: 'Kas Tunai' });

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isBos = user.role === 'bos';

  const fetchData = async () => {
    try {
      const [resSupp, resInv, resCoa, resAset, resAsetList] = await Promise.all([
        fetch('/api/master/mitra').then(r => r.json()),
        fetch('/api/master/barang').then(r => r.json()),
        fetch('/api/master/akun').then(r => r.json()),
        getAsetSummary(),
        getAsetList()
      ]);
      setSuppliers(resSupp.filter(m => m.kategori === 'Supplier Bahan Baku'));
      setInventory(resInv.filter(b => b.kategori !== 'Barang Jadi (Baju)'));
      setCoa(resCoa.filter(a => a.kategori === 'Beban'));
      if (resAset.success) {
        setAsetSummary(resAset.data.summary);
        setSusutStatus(resAset.data.status_susut || { sudah_susut: false, jumlah_susut: 0, bulan: '' });
      }
      if (resAsetList.success) setAsetList(resAsetList.data.list);
      
      const dash = await getDashboardSummary();
      setBalance({
        tunai: dash?.keuangan?.sisa_saldo_tunai || 0,
        bank: dash?.keuangan?.sisa_saldo_bank || 0
      });
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchData();
    loadPoList();
  }, []);

  const addToCart = () => {
    if (!cartForm.sku || !cartForm.nama) return alert("Pilih barang atau isi Nama/SKU!");
    setCart([...cart, { ...cartForm }]);
    setCartForm({ sku: '', nama: '', qty: 1, harga: 0, kat: 'Bahan Baku (Kain)' });
  };

  const removeFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const handleBahanSubmit = async () => {
    if (cart.length === 0) return alert("Keranjang kosong!");
    if (!bahanMeta.supplier_id) return alert("Pilih Supplier!");
    setLoading(true);
    try {
      const res = await submitPembelianBahan({
        tgl_po: bahanMeta.tgl,
        supplier_id: Number(bahanMeta.supplier_id),
        metode_pembayaran: bahanMeta.metode,
        dp: Number(bahanMeta.dp),
        dp_sumber: bahanMeta.dp_sumber,
        diskon: Number(bahanMeta.diskon),
        items: cart
      });
      if (res.success) {
        setMsg({ text: res.message, type: 'success' });
        setCart([]);
        setBahanMeta({ ...bahanMeta, dp: 0, diskon: 0 });
        loadPoList();
      } else {
        setMsg({ text: res.message, type: 'error' });
      }
    } catch (err) { setMsg({ text: err.message, type: 'error' }); }
    setLoading(false);
  };

  const handleOpexSubmit = async (e) => {
    e.preventDefault();
    if (!opexForm.akun || opexForm.nominal <= 0) return alert("Lengkapi data!");
    setLoading(true);
    try {
        const selAkun = coa.find(a => a.kode_akun === opexForm.akun);
        const res = await submitOpex({
            tgl_opex: opexForm.tgl,
            kode_akun_opex: opexForm.akun,
            nama_akun_opex: selAkun ? selAkun.nama_akun : '',
            keterangan: opexForm.ket,
            nominal: Number(opexForm.nominal),
            sumber_dana: opexForm.sumber
        });
        if (res.success) {
            setMsg({ text: res.message, type: 'success' });
            setOpexForm({ ...opexForm, nominal: 0, ket: '' });
        } else setMsg({ text: res.message, type: 'error' });
    } catch (err) { setMsg({ text: err.message, type: 'error' }); }
    setLoading(false);
  };

  const handleAsetSubmit = async (e) => {
    e.preventDefault();
    if (asetForm.nominal <= 0 || !asetForm.nama_barang) return alert("Lengkapi data!");
    setLoading(true);
    try {
        const asetNames = { 
          "13110": "Tanah & Bangunan", 
          "13210": "Mesin Produksi", 
          "13310": "Kendaraan", 
          "13410": "Inventaris / IT",
          "11410": "Sewa Dibayar di Muka"
        };
        const res = await submitAset({
            tgl_aset: asetForm.tgl,
            kode_akun_aset: asetForm.akun,
            nama_akun_aset: asetNames[asetForm.akun],
            nama_barang: asetForm.nama_barang,
            nominal: Number(asetForm.nominal),
            sumber_dana: asetForm.sumber,
            masa_bulan: asetForm.masa_bulan || 12
        });
        if (res.success) {
            setMsg({ text: res.message, type: 'success' });
            setAsetForm({ ...asetForm, nominal: 0, nama_barang: '' });
            fetchData(); // Refresh summary
        } else setMsg({ text: res.message, type: 'error' });
    } catch (err) { setMsg({ text: err.message, type: 'error' }); }
    setLoading(false);
  };

  const handlePenyusutan = async () => {
    if (!window.confirm("Jalankan penyusutan otomatis bulan ini?")) return;
    setLoading(true);
    try {
        const res = await runPenyusutan();
        alert(res.message);
    } catch (err) { alert(err.message); }
    setLoading(false);
  };

  const loadPoList = async () => {
    try {
        const res = await getPembelianList();
        if (res.success) setPoList(res.data.list);
    } catch (err) { console.error(err); }
  };

  const handlePoChange = async (noPo) => {
    setReturForm({ ...returForm, no_po: noPo, kode_sku: '' });
    if (!noPo) { setPoDetails([]); return; }
    try {
        const res = await getPembelianDetails(noPo);
        if (res.success) setPoDetails(res.data.details);
    } catch (err) { console.error(err); }
  };

  const handleReturSubmit = async (e) => {
    e.preventDefault();
    if (!returForm.no_po || !returForm.kode_sku || returForm.qty_retur <= 0) return alert("Lengkapi data retur!");
    
    const item = poDetails.find(d => d.kode_sku === returForm.kode_sku);
    if (returForm.qty_retur > item.qty) return alert(`Jumlah retur (${returForm.qty_retur}) tidak boleh melebihi jumlah beli (${item.qty})!`);

    setLoading(true);
    try {
        const res = await submitReturPembelian(returForm);
        if (res.success) {
            setMsg({ text: res.message, type: 'success' });
            setReturForm({ ...returForm, no_po: '', kode_sku: '', qty_retur: 0 });
            setPoDetails([]);
            fetchData(); // Update inventory
        } else setMsg({ text: res.message, type: 'error' });
    } catch (err) { setMsg({ text: err.message, type: 'error' }); }
    setLoading(false);
  };

  const handleBayarPOCepatSubmit = async (e) => {
    e.preventDefault();
    if (!payModal.no_po || payModal.nominal <= 0) return alert("Nominal tidak valid!");
    
    if (!window.confirm(`Yakin melunasi PO ${payModal.no_po} sebesar ${formatRp(payModal.nominal)}?`)) return;

    setLoading(true);
    try {
        const res = await bayarPOCepat({
            no_po: payModal.no_po,
            nominal: payModal.nominal,
            sumber_dana: payModal.sumber_dana
        });
        if (res.success) {
            setMsg({ text: res.message, type: 'success' });
            setPayModal({ open: false, no_po: '', nama_supplier: '', nominal: 0, sumber_dana: 'Kas Tunai' });
            loadPoList();
            fetchData();
        } else setMsg({ text: res.message, type: 'error' });
    } catch (err) { setMsg({ text: err.message, type: 'error' }); }
    setLoading(false);
  };

  const handleVoid = async (noPo) => {
    if (!window.confirm(`Void PO ${noPo}? Stok akan dikurangi dan jurnal akan dihapus permanen!`)) return;
    setLoading(true);
    try {
        const res = await voidPembelian(noPo);
        if (res.success) {
            setMsg({ text: res.message, type: 'success' });
            loadPoList();
            fetchData();
        } else setMsg({ text: res.message, type: 'error' });
    } catch (err) { setMsg({ text: err.message, type: 'error' }); }
    setLoading(false);
  };

  const TABS = [
    { id: 'bahan', label: 'Beli Bahan', icon: 'package' },
    { id: 'opex', label: 'Biaya/Opex', icon: 'account_balance_wallet' },
    { id: 'retur', label: 'Retur Beli', icon: 'keyboard_return' },
    { id: 'history', label: 'Riwayat & Void', icon: 'history' },
    { id: 'aset', label: 'Aset Tetap', icon: 'computer' },
  ];

  return (
    <div className="max-w-6xl mx-auto pb-10 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
            <span className="material-symbols-rounded text-emerald-600 text-3xl">local_mall</span>
        </div>
        <div>
            <h1 className="text-2xl font-black text-[#064E3B] font-outfit">Pembelian & Pengeluaran</h1>
            <p className="text-slate-500 text-sm font-medium">Manajemen finansial pengadaan bahan & biaya operasional pabrik.</p>
        </div>
        
        <div className="flex-1"></div>

        <div className="flex gap-4">
            <div className="bg-emerald-50 border border-emerald-100 px-5 py-3 rounded-2xl">
                <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-1">Saldo Tunai</p>
                <p className="text-xl font-black text-emerald-900 leading-none">{formatRp(balance.tunai)}</p>
            </div>
            <div className="bg-blue-50 border border-blue-100 px-5 py-3 rounded-2xl">
                <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-1">Saldo Bank</p>
                <p className="text-xl font-black text-blue-900 leading-none">{formatRp(balance.bank)}</p>
            </div>
        </div>
      </div>

      {msg.text && (
        <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 ${msg.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
          <span className="material-symbols-rounded">{msg.type === 'error' ? 'error' : 'check_circle'}</span>
          <span className="font-bold">{msg.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex overflow-x-auto space-x-1 p-1 bg-slate-100 rounded-xl">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setMsg({text:'', type:''}); }}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === tab.id 
                ? 'bg-[#064E3B] text-white shadow-lg' 
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span className="material-symbols-rounded text-[20px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
        
        {/* BELI BAHAN */}
        {activeTab === 'bahan' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Input Barang</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">PILIH BARANG GUDANG</label>
                    <select 
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-medium"
                        onChange={(e) => {
                            const b = inventory.find(i => i.id === Number(e.target.value));
                            if (b) setCartForm({ ...cartForm, sku: b.kode_sku, nama: b.nama_barang, harga: b.harga_modal, kat: b.kategori });
                        }}
                    >
                        <option value="">-- Pilih Barang Lama --</option>
                        {inventory.map(b => <option key={b.id} value={b.id}>[{b.kategori}] {b.nama_barang}</option>)}
                    </select>
                  </div>

                  <div className="relative py-2 text-center">
                    <span className="bg-slate-50 px-3 text-[10px] font-bold text-slate-400 relative z-10">ATAU INPUT BARU</span>
                    <hr className="absolute top-1/2 w-full border-slate-200" />
                  </div>

                  <input type="text" placeholder="Nama Barang Baru" className="w-full p-3 border border-slate-200 rounded-xl text-sm" value={cartForm.nama} onChange={e => setCartForm({...cartForm, nama: e.target.value})} />
                  <input type="text" placeholder="SKU Baru" className="w-full p-3 border border-slate-200 rounded-xl text-sm" value={cartForm.sku} onChange={e => setCartForm({...cartForm, sku: e.target.value})} />
                  
                  <div className="grid grid-cols-2 gap-3">
                    <input type="number" placeholder="Qty" className="p-3 border border-slate-200 rounded-xl text-sm font-bold" value={cartForm.qty} onChange={e => setCartForm({...cartForm, qty: Number(e.target.value)})} />
                    <input type="text" placeholder="Harga" className="p-3 border border-slate-200 rounded-xl text-sm font-bold" value={formatInputNumber(cartForm.harga)} onChange={e => setCartForm({...cartForm, harga: parseNumber(e.target.value)})} />
                  </div>

                  <button onClick={addToCart} className="w-full bg-emerald-50 text-[#10B981] p-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-100 transition-all border border-emerald-100">
                    <span className="material-symbols-rounded">add_shopping_cart</span>
                    Tambah ke Nota
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="flex justify-between items-end border-b pb-4">
                <h3 className="text-xl font-bold text-slate-800">Detail Nota Pembelian</h3>
                <button onClick={() => setCart([])} className="text-xs font-bold text-red-500 hover:underline">Kosongkan Nota</button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest border-b">
                    <tr>
                      <th className="py-3 px-2">Barang</th>
                      <th className="py-3 px-2">Qty</th>
                      <th className="py-3 px-2">Harga</th>
                      <th className="py-3 px-2 text-right">Subtotal</th>
                      <th className="py-3 px-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cart.map((item, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-4 px-2">
                            <div className="font-bold text-slate-800">{item.nama}</div>
                            <div className="text-[10px] font-mono text-slate-400">{item.sku}</div>
                        </td>
                        <td className="py-4 px-2">{item.qty}</td>
                        <td className="py-4 px-2">{formatRp(item.harga)}</td>
                        <td className="py-4 px-2 text-right font-bold">{formatRp(item.qty * item.harga)}</td>
                        <td className="py-4 px-2 text-right">
                            <button onClick={() => removeFromCart(i)} className="text-red-400 hover:text-red-600"><span className="material-symbols-rounded text-lg">delete</span></button>
                        </td>
                      </tr>
                    ))}
                    {cart.length === 0 && <tr><td colSpan="5" className="py-10 text-center text-slate-400 font-medium">Belum ada barang di keranjang.</td></tr>}
                  </tbody>
                  {cart.length > 0 && (
                    <tfoot>
                        <tr className="bg-slate-900 text-white">
                            <td colSpan="3" className="p-4 font-bold text-right rounded-bl-xl">TOTAL TAGIHAN</td>
                            <td className="p-4 font-black text-right text-lg">{formatRp(cart.reduce((a, b) => a + (b.qty * b.harga), 0))}</td>
                            <td className="rounded-br-xl"></td>
                        </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {cart.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">TANGGAL NOTA</label>
                        <input type="date" className="w-full p-2.5 bg-slate-50 border rounded-lg" value={bahanMeta.tgl} onChange={e => setBahanMeta({...bahanMeta, tgl: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">SUPPLIER</label>
                        <select className="w-full p-2.5 bg-slate-50 border rounded-lg" value={bahanMeta.supplier_id} onChange={e => setBahanMeta({...bahanMeta, supplier_id: e.target.value})}>
                            <option value="">-- Pilih Vendor --</option>
                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.nama_mitra}</option>)}
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 mb-2">METODE PEMBAYARAN</label>
                        <div className="flex gap-4">
                            {["Kas Tunai", "Transfer Bank", "Utang Dagang"].map(m => (
                                <label key={m} className={`flex-1 p-3 border rounded-xl flex items-center gap-2 cursor-pointer transition-all ${bahanMeta.metode === m ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500' : 'bg-white hover:bg-slate-50'}`}>
                                    <input type="radio" className="hidden" name="metode" value={m} checked={bahanMeta.metode === m} onChange={e => setBahanMeta({...bahanMeta, metode: e.target.value})} />
                                    <span className="material-symbols-rounded text-sm">{m === 'Utang Dagang' ? 'calendar_month' : 'payments'}</span>
                                    <span className="text-sm font-bold">{m}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    {bahanMeta.metode === 'Utang Dagang' && (
                        <div className="md:col-span-2 grid grid-cols-2 gap-4 animate-in fade-in">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-amber-600 px-1 uppercase tracking-widest">Uang Muka (DP) - Opsional</label>
                                <input type="text" placeholder="Masukkan DP" className="w-full p-3 border rounded-xl text-sm font-bold bg-amber-50 border-amber-200 text-amber-700" value={formatInputNumber(bahanMeta.dp)} onChange={e => setBahanMeta({...bahanMeta, dp: parseNumber(e.target.value)})} />
                            </div>
                            {bahanMeta.dp > 0 && (
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-amber-600 px-1 uppercase tracking-widest">DP Dibayar Via</label>
                                    <div className="flex bg-amber-50 border border-amber-200 p-1 rounded-xl">
                                        {['Kas Tunai', 'Transfer Bank'].map(s => (
                                            <button key={s} type="button" onClick={() => setBahanMeta({...bahanMeta, dp_sumber: s})} className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${bahanMeta.dp_sumber === s ? 'bg-amber-500 text-white shadow-sm' : 'text-amber-600'}`}>
                                                {s.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <div className="md:col-span-2">
                        <label className="text-[10px] font-bold text-red-500 px-1 uppercase tracking-widest">Potongan / Diskon Nota</label>
                        <input type="text" placeholder="Masukkan Diskon" className="w-full p-3 border rounded-xl text-sm font-bold bg-red-50/30 border-red-200 text-red-600" value={formatInputNumber(bahanMeta.diskon)} onChange={e => setBahanMeta({...bahanMeta, diskon: parseNumber(e.target.value)})} />
                    </div>
                    <div className="md:col-span-2 pt-4">
                        <button 
                          onClick={handleBahanSubmit} 
                          disabled={loading || isBos} 
                          className={`w-full p-4 rounded-2xl font-black text-lg shadow-xl transition-all flex items-center justify-center gap-3 ${isBos ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-100'}`}
                        >
                            <span className="material-symbols-rounded">save</span>
                            {isBos ? 'VIEW ONLY (BOS)' : loading ? 'MEMPROSES...' : 'TERBITKAN NOTA PEMBELIAN'}
                        </button>
                    </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* OPEX */}
        {activeTab === 'opex' && (
          <div className="max-w-2xl mx-auto space-y-8">
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <h2 className="text-xl font-black text-slate-800 mb-2 flex items-center gap-2">
                    <span className="material-symbols-rounded text-emerald-600 text-3xl">precision_manufacturing</span>
                    Pencatatan Biaya Pabrik
                </h2>
                <p className="text-slate-500 text-sm">Input pengeluaran rutin seperti BTKL (Gaji), Tagihan Listrik, atau Jasa Sablon.</p>
            </div>

            <form onSubmit={handleOpexSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-1">
                        <label className="block text-xs font-bold text-slate-500 mb-1">TANGGAL PEMBAYARAN</label>
                        <input type="date" className="w-full p-3 border border-slate-200 rounded-xl" value={opexForm.tgl} onChange={e => setOpexForm({...opexForm, tgl: e.target.value})} />
                    </div>
                    <div className="col-span-1">
                         <label className="block text-xs font-bold text-slate-500 mb-1">SUMBER DANA</label>
                         <select className="w-full p-3 border border-slate-200 rounded-xl font-bold text-emerald-700" value={opexForm.sumber} onChange={e => setOpexForm({...opexForm, sumber: e.target.value})}>
                            <option value="Kas Tunai">Kas Tunai</option>
                            <option value="Bank">Bank</option>
                         </select>
                    </div>
                    <div className="col-span-2">
                         <label className="block text-xs font-bold text-slate-500 mb-1">KATEGORI PENGELUARAN (COA)</label>
                         <select className="w-full p-3 border border-slate-200 rounded-xl font-medium" value={opexForm.akun} onChange={e => setOpexForm({...opexForm, akun: e.target.value})}>
                            <option value="">-- Pilih Akun Biaya --</option>
                            {coa.map(a => <option key={a.kode_akun} value={a.kode_akun}>{a.kode_akun} - {a.nama_akun}</option>)}
                         </select>
                    </div>
                    <div className="col-span-2">
                         <label className="block text-xs font-bold text-slate-500 mb-1">KETERANGAN RINCI</label>
                         <input type="text" placeholder="Contoh: Pembayaran Listrik Gudang Maret / Gaji Tukang" className="w-full p-3 border border-slate-200 rounded-xl" value={opexForm.ket} onChange={e => setOpexForm({...opexForm, ket: e.target.value})} />
                    </div>
                    <div className="col-span-2">
                         <label className="block text-xs font-bold text-slate-500 mb-1 text-emerald-600">NOMINAL PENGELUARAN (RP)</label>
                         <input type="text" className="w-full p-4 border-2 border-emerald-100 bg-emerald-50 rounded-2xl text-2xl font-black text-emerald-800" value={formatInputNumber(opexForm.nominal)} onChange={e => setOpexForm({...opexForm, nominal: parseNumber(e.target.value)})} />
                    </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading || isBos} 
                  className={`w-full p-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl transition-all ${isBos ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-[#064E3B] text-white hover:bg-emerald-900'}`}
                >
                    <span className="material-symbols-rounded">payments</span>
                    {isBos ? 'VIEW ONLY (BOS)' : loading ? 'MENYIMPAN...' : 'CATAT PENGELUARAN'}
                </button>
            </form>
          </div>
        )}

        {/* RETUR */}
        {activeTab === 'retur' && (
          <div className="max-w-2xl mx-auto">
             <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 mb-8 flex items-center gap-4">
                <span className="material-symbols-rounded text-amber-600 text-3xl">keyboard_return</span>
                <div>
                    <h2 className="text-xl font-black text-amber-900">Retur Pembelian (Bahan Baku)</h2>
                    <p className="text-amber-700 text-sm">Kembalikan bahan ke supplier dan kurangi utang atau terima kembali dana.</p>
                </div>
             </div>

             <form onSubmit={handleReturSubmit} className="space-y-6">
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">CARI NOMOR PO (NOTAS BELI)</label>
                    <div className="flex gap-2">
                        <select 
                            className="flex-1 p-3 border border-slate-200 rounded-xl"
                            value={returForm.no_po}
                            onChange={(e) => handlePoChange(e.target.value)}
                        >
                            <option value="">-- Pilih Nota PO --</option>
                            {poList.map(po => <option key={po.no_po} value={po.no_po}>{po.no_po} - {po.nama_supplier} ({formatRp(po.total_tagihan)})</option>)}
                        </select>
                        <button type="button" onClick={loadPoList} className="bg-slate-100 p-3 rounded-xl hover:bg-slate-200 transition-all">
                             <span className="material-symbols-rounded">sync</span>
                        </button>
                    </div>
                </div>

                {returForm.no_po && (
                    <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-500 mb-1">PILIH BARANG YANG DIRETAK</label>
                            <select 
                                className="w-full p-3 border border-slate-200 rounded-xl font-medium"
                                value={returForm.kode_sku}
                                onChange={(e) => setReturForm({ ...returForm, kode_sku: e.target.value })}
                            >
                                <option value="">-- Pilih Barang --</option>
                                {poDetails.map(d => <option key={d.kode_sku} value={d.kode_sku}>{d.nama_barang} (Beli: {d.qty} Kg)</option>)}
                            </select>
                        </div>

                        <div className="col-span-1">
                            <label className="block text-xs font-bold text-slate-500 mb-1">JUMLAH RETUR (KG)</label>
                            <input 
                                type="number" 
                                className="w-full p-3 border border-slate-200 rounded-xl"
                                value={returForm.qty_retur}
                                onChange={(e) => setReturForm({ ...returForm, qty_retur: Number(e.target.value) })}
                            />
                        </div>

                        <div className="col-span-1">
                            <label className="block text-xs font-bold text-slate-500 mb-1">TANGGAL RETUR</label>
                            <input 
                                type="date" 
                                className="w-full p-3 border border-slate-200 rounded-xl"
                                value={returForm.tgl_retur}
                                onChange={(e) => setReturForm({ ...returForm, tgl_retur: e.target.value })}
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-500 mb-1">ALASAN PENGEMBALIAN</label>
                            <input 
                                type="text" 
                                className="w-full p-3 border border-slate-200 rounded-xl"
                                value={returForm.alasan}
                                onChange={(e) => setReturForm({ ...returForm, alasan: e.target.value })}
                            />
                        </div>

                        <div className="col-span-2 pt-4">
                            <button 
                              type="submit" 
                              disabled={loading || isBos} 
                              className={`w-full p-4 rounded-2xl font-bold shadow-xl transition-all flex items-center justify-center gap-3 ${isBos ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-amber-600 hover:bg-amber-700 text-white'}`}
                            >
                                <span className="material-symbols-rounded">assignment_return</span>
                                {isBos ? 'VIEW ONLY (BOS)' : loading ? 'MEMPROSES RETUR...' : 'KONFIRMASI RETUR PEMBELIAN'}
                            </button>
                        </div>
                    </div>
                )}
             </form>

             {!returForm.no_po && (
                 <div className="text-center py-20 border-2 border-dashed border-slate-100 rounded-3xl mt-6">
                    <span className="material-symbols-rounded text-6xl text-slate-100 mb-4 tracking-[0.5em]">search</span>
                    <p className="text-slate-400 font-medium">Pilih nomor nota PO di atas untuk memulai retur.</p>
                 </div>
             )}
          </div>
        )}

        {/* ASET */}
        {/* HISTORY */}
        {activeTab === 'history' && (
            <div className="space-y-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-slate-800">Riwayat 50 Pembelian Terakhir</h3>
                    <button onClick={loadPoList} className="p-2 border rounded-full hover:bg-slate-50"><span className="material-symbols-rounded">sync</span></button>
                </div>

                <div className="overflow-x-auto border border-slate-100 rounded-[2rem]">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <tr>
                                <th className="py-5 px-6">Tgl & No PO</th>
                                <th className="py-5 px-6">Supplier</th>
                                <th className="py-5 px-6 text-right">Tagihan</th>
                                <th className="py-5 px-6 text-center">Status / Metode</th>
                                <th className="py-5 px-6 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {poList.map(h => (
                                <tr key={h.no_po} className="hover:bg-slate-50/50 transition-all">
                                    <td className="py-4 px-6">
                                        <div className="font-black text-blue-700">{h.no_po}</div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase">{new Date(h.tanggal).toLocaleDateString('id-ID')}</div>
                                    </td>
                                    <td className="py-4 px-6 font-bold text-slate-800">{h.nama_supplier}</td>
                                    <td className="py-4 px-6 text-right font-black text-slate-700">{formatRp(h.total_tagihan)}</td>
                                    <td className="py-4 px-6 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            {h.status === 'Lunas' ? (
                                                <span className="px-2 py-1 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-700">✅ LUNAS</span>
                                            ) : (
                                                <span className="px-2 py-1 rounded-md text-[10px] font-black bg-amber-100 text-amber-700">⏳ TEMPO</span>
                                            )}
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">{h.metode_bayar}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <div className="flex justify-end gap-2 items-center">
                                            {/* 👁 Lihat Detail */}
                                            <button
                                                onClick={() => setPurchaseModal({
                                                    open: true,
                                                    po: {
                                                        no_po: h.no_po,
                                                        nama_supplier: h.nama_supplier,
                                                        tanggal: new Date(h.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }),
                                                        total_tagihan: h.total_tagihan,
                                                        uang_muka: h.uang_muka || 0,
                                                        diskon: h.diskon || 0,
                                                        status: h.status
                                                    }
                                                })}
                                                className="p-2 bg-sky-50 text-sky-600 rounded-xl hover:bg-sky-500 hover:text-white transition-all"
                                                title="Lihat Detail PO"
                                            >
                                                <span className="material-symbols-rounded text-lg">visibility</span>
                                            </button>

                                            {/* 💸 Bayar Utang */}
                                            {h.status !== 'Lunas' && !isBos && (
                                                <button 
                                                    onClick={() => setPayModal({ open: false, no_po: h.no_po, nama_supplier: h.nama_supplier, nominal: h.total_tagihan - (h.uang_muka || 0), sumber_dana: 'Kas Tunai' })}
                                                    className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-500 hover:text-white transition-all flex items-center gap-1"
                                                    title="Bayar Utang PO"
                                                >
                                                    <span className="material-symbols-rounded text-lg">payments</span>
                                                    <span className="text-[10px] font-bold hidden xl:inline">💸 Bayar Utang</span>
                                                </button>
                                            )}

                                            {/* 🖨️ Cetak PDF */}
                                            <button 
                                                onClick={() => window.open(`${import.meta.env.VITE_API_BASE_URL || ''}/api/pembelian/print/${h.no_po}`, '_blank')}
                                                className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all" 
                                                title="Cetak Nota PO PDF"
                                            >
                                                <span className="material-symbols-rounded text-lg">print</span>
                                            </button>

                                            {/* 🗑️ Void */}
                                            {!isBos && (
                                              <button onClick={() => handleVoid(h.no_po)} className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all" title="Void PO (Hapus)">
                                                  <span className="material-symbols-rounded text-lg">delete_sweep</span>
                                              </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {poList.length === 0 && <tr><td colSpan="5" className="py-20 text-center text-slate-300 italic font-medium">Belum ada transaksi pembelian tercatat.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
        
        {activeTab === 'aset' && (
          <div className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                    <div className="bg-emerald-100/30 p-5 rounded-2xl border border-emerald-100">
                        <h3 className="text-emerald-800 font-black flex items-center gap-2 uppercase text-xs tracking-widest"><span className="material-symbols-rounded">add_circle</span> Beli Aset Baru</h3>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">TANGGAL PEROLEHAN</label>
                            <input type="date" className="w-full p-2.5 border rounded-lg" value={asetForm.tgl} onChange={e => setAsetForm({...asetForm, tgl: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">KATEGORI ASET</label>
                            <select className="w-full p-2.5 border rounded-lg font-bold" value={asetForm.akun} onChange={e => setAsetForm({...asetForm, akun: e.target.value})}>
                                <option value="13110">13110 - Tanah & Bangunan (Aset Tetap)</option>
                                <option value="13210">13210 - Mesin Produksi (Aset Tetap)</option>
                                <option value="13310">13310 - Kendaraan (Aset Tetap)</option>
                                <option value="13410">13410 - Inventaris / IT (Aset Tetap)</option>
                                <option value="11410">11410 - Sewa Dibayar di Muka (Aset Lancar)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">NAMA BARANG ASET</label>
                            <input type="text" placeholder="Contoh: Mesin Jahit Juki DDL" className="w-full p-2.5 border rounded-lg" value={asetForm.nama_barang} onChange={e => setAsetForm({...asetForm, nama_barang: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">HARGA/NILAI (RP)</label>
                            <input type="text" className="w-full p-2.5 border rounded-lg font-black text-lg" value={formatInputNumber(asetForm.nominal)} onChange={e => setAsetForm({...asetForm, nominal: parseNumber(e.target.value)})} />
                        </div>
                        {asetForm.akun === '11410' && (
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 animate-in fade-in">
                                <label className="block text-xs font-black text-blue-700 mb-1 tracking-tighter">MASA AMORTISASI (BULAN)</label>
                                <input 
                                    type="number" 
                                    placeholder="Contoh: 12 untuk 1 thn, 60 untuk 5 thn" 
                                    className="w-full p-2.5 border border-blue-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" 
                                    value={asetForm.masa_bulan || 12} 
                                    onChange={e => setAsetForm({...asetForm, masa_bulan: Number(e.target.value)})} 
                                />
                                <p className="text-[10px] text-blue-600 mt-2 italic font-medium leading-tight">
                                    *Sistem akan membagi otomatis biaya sewa sebesar Rp {(asetForm.nominal / (asetForm.masa_bulan || 12)).toLocaleString('id-ID')} setiap bulan.
                                </p>
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">SUMBER DANA</label>
                            <select className="w-full p-2.5 border rounded-lg" value={asetForm.sumber} onChange={e => setAsetForm({...asetForm, sumber: e.target.value})}>
                                <option value="Kas Tunai">Kas Tunai</option>
                                <option value="Bank">Bank</option>
                                <option value="Modal Awal (Khusus Aset Lama)">Modal Awal (Aset Lama)</option>
                            </select>
                        </div>
                        <button 
                          onClick={handleAsetSubmit} 
                          disabled={loading || isBos} 
                          className={`w-full p-3 rounded-xl font-bold shadow-lg transition-all ${isBos ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-[#10B981] text-white hover:shadow-emerald-200'}`}
                        >
                             {isBos ? 'VIEW ONLY (BOS)' : 'CATAT ASET BARU'}
                        </button>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-blue-100/30 p-5 rounded-2xl border border-blue-100">
                        <h3 className="text-blue-800 font-black flex items-center gap-2 uppercase text-xs tracking-widest"><span className="material-symbols-rounded">info</span> AI Standard Costing</h3>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                        <h4 className="font-bold text-slate-700">Ringkasan Penyusutan</h4>
                        <div className="space-y-3">
                            {asetSummary.map((item, i) => (
                                <div key={i} className="flex justify-between items-center text-sm border-b pb-2">
                                    <span className="text-slate-500 font-medium">{item.kategori}</span>
                                    <div className="text-right">
                                        <div className="font-bold text-slate-800">{formatRp(item.total)}</div>
                                        <div className="text-[10px] text-red-500 font-bold">-{formatRp(item.susut_bulan)}/Bln</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                             <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Bulan Ini</span>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${susutStatus.sudah_susut ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {susutStatus.sudah_susut ? 'SUDAH' : 'BELUM'}
                                </span>
                             </div>
                             <p className="text-xs font-bold text-slate-700">
                                {susutStatus.sudah_susut 
                                    ? `Penyusutan ${susutStatus.bulan} sudah dilakukan sebanyak ${susutStatus.jumlah_susut} kali.`
                                    : `Penyusutan untuk bulan ${susutStatus.bulan} belum diproses.`}
                             </p>
                        </div>

                        <div className="pt-4">
                            <button onClick={handlePenyusutan} className="w-full bg-slate-900 text-white p-3 rounded-xl font-black text-xs tracking-tighter hover:bg-black transition-all flex items-center justify-center gap-2">
                                <span className="material-symbols-rounded text-sm">auto_fix_high</span>
                                JALANKAN PENYUSUTAN OTOMATIS BULAN INI
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <hr className="border-slate-100" />
            
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <span className="material-symbols-rounded text-[#064E3B]">table_view</span>
                    Daftar Aset Pabrik Terdaftar
                </h3>
                <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black tracking-widest">
                            <tr>
                                <th className="py-4 px-6">Tgl Perolehan</th>
                                <th className="py-4 px-6">Kategori Akun</th>
                                <th className="py-4 px-6">Nama Barang</th>
                                <th className="py-4 px-6 text-center">Status Perolehan</th>
                                <th className="py-4 px-6 text-right">Nilai Perolehan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {asetList.map((aset, i) => (
                                <tr key={aset.id} className="hover:bg-slate-50/50 transition-all">
                                    <td className="py-3 px-6 text-slate-500 font-medium">{aset.tanggal}</td>
                                    <td className="py-3 px-6">
                                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">[{aset.kode_akun}] {aset.nama_akun}</span>
                                    </td>
                                    <td className="py-3 px-6 font-bold text-slate-800">{aset.nama_barang}</td>
                                    <td className="py-3 px-6 text-center">
                                         {aset.sumber === 'Legacy (Modal Awal)' ? (
                                             <span className="px-3 py-1 rounded-full text-[9px] font-black bg-amber-100 text-amber-700 border border-amber-200 uppercase tracking-widest">Legacy / Aset Lama</span>
                                         ) : (
                                             <span className="px-3 py-1 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-700 border border-emerald-200 uppercase tracking-widest">Baru / Pembelian</span>
                                         )}
                                     </td>
                                    <td className="py-3 px-6 text-right font-black text-emerald-700">{formatRp(aset.nominal)}</td>
                                </tr>
                            ))}
                            {asetList.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="py-10 text-center text-slate-400 font-medium italic">Belum ada aset tetap yang terdaftar.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
          </div>
        )}

      </div>

      {/* PAY MODAL */}
      {payModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="bg-blue-600 p-6 text-white text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="material-symbols-rounded text-3xl">payments</span>
              </div>
              <h2 className="text-xl font-black">Pelunasan Utang PO</h2>
              <p className="text-blue-100 text-sm font-medium">Nomor PO: {payModal.no_po}</p>
            </div>
            
            <form onSubmit={handleBayarPOCepatSubmit} className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">SUPPLIER</label>
                  <input type="text" className="w-full p-4 border rounded-xl font-bold bg-slate-50 text-slate-600" value={payModal.nama_supplier} disabled />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">NOMINAL TAGIHAN</label>
                  <input type="text" className="w-full p-4 border rounded-xl font-black text-blue-600 bg-blue-50" value={formatInputNumber(payModal.nominal)} disabled />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">SUMBER DANA (KELUAR DARI)</label>
                  <select 
                    className="w-full p-4 border rounded-xl font-bold text-slate-700"
                    value={payModal.sumber_dana}
                    onChange={(e) => setPayModal({...payModal, sumber_dana: e.target.value})}
                  >
                    <option value="Kas Tunai">Kas Tunai (11110)</option>
                    <option value="Kas di Bank">Kas di Bank (11120)</option>
                  </select>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setPayModal({...payModal, open: false})}
                  className="flex-1 py-4 font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-4 font-black text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 rounded-xl transition-all"
                >
                  {loading ? 'Proses...' : 'LUNASKAN SEKARANG'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Purchase Detail Modal (icon mata) ────────────────── */}
      <PurchaseDetailModal
        isOpen={purchaseModal.open}
        onClose={() => setPurchaseModal({ open: false, po: null })}
        po={purchaseModal.po}
      />

    </div>
  );
}
