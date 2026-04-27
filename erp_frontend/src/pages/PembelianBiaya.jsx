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
    submitReturPembelian
} from '../api/pembelianApi';
import { getDashboardSummary } from '../api/dashboardApi';
import { formatRp, formatInputNumber, parseNumber } from '../utils/formatters';

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
  const [bahanMeta, setBahanMeta] = useState({ supplier_id: '', metode: 'Kas Tunai', tgl: new Date().toISOString().split('T')[0] });

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
        items: cart
      });
      if (res.success) {
        setMsg({ text: res.message, type: 'success' });
        setCart([]);
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
        const asetNames = { "13110": "Tanah & Bangunan", "13210": "Mesin Produksi", "13310": "Kendaraan", "13410": "Inventaris / IT" };
        const res = await submitAset({
            tgl_aset: asetForm.tgl,
            kode_akun_aset: asetForm.akun,
            nama_akun_aset: asetNames[asetForm.akun],
            nama_barang: asetForm.nama_barang,
            nominal: Number(asetForm.nominal),
            sumber_dana: asetForm.sumber
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

  const TABS = [
    { id: 'bahan', label: 'Beli Bahan', icon: 'package' },
    { id: 'opex', label: 'Biaya/Opex', icon: 'account_balance_wallet' },
    { id: 'retur', label: 'Retur Beli', icon: 'keyboard_return' },
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
                                <label key={m} className={`flex-1 p-3 border rounded-xl flex items-center gap-2 cursor-pointer transition-all ${bahanMeta.metode === m ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500' : 'bg-white hover:bg-slate-50'}`}>
                                    <input type="radio" className="hidden" name="metode" value={m} checked={bahanMeta.metode === m} onChange={e => setBahanMeta({...bahanMeta, metode: e.target.value})} />
                                    <span className="material-symbols-rounded text-sm">{m === 'Utang Dagang' ? 'calendar_month' : 'payments'}</span>
                                    <span className="text-sm font-bold">{m}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="md:col-span-2 pt-4">
                        <button onClick={handleBahanSubmit} disabled={loading} className="w-full bg-[#10B981] hover:bg-emerald-600 text-white p-4 rounded-2xl font-black text-lg shadow-xl shadow-emerald-100 transition-all flex items-center justify-center gap-3">
                            <span className="material-symbols-rounded">save</span>
                            {loading ? 'MEMPROSES...' : 'SIMPAN & UPDATE GUDANG'}
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
                <h2 className="text-xl font-black text-slate-800 mb-2">💸 Pencatatan Biaya Pabrik</h2>
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

                <button type="submit" disabled={loading} className="w-full bg-[#064E3B] text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-900 shadow-xl transition-all">
                    <span className="material-symbols-rounded">payments</span>
                    {loading ? 'MENYIMPAN...' : 'CATAT PENGELUARAN'}
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
                            <button type="submit" disabled={loading} className="w-full bg-amber-600 hover:bg-amber-700 text-white p-4 rounded-2xl font-bold shadow-xl transition-all flex items-center justify-center gap-3">
                                <span className="material-symbols-rounded">assignment_return</span>
                                {loading ? 'MEMPROSES RETUR...' : 'KONFIRMASI RETUR PEMBELIAN'}
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
                                <option value="13110">13110 - Tanah & Bangunan</option>
                                <option value="13210">13210 - Mesin Produksi</option>
                                <option value="13310">13310 - Kendaraan</option>
                                <option value="13410">13410 - Inventaris / IT</option>
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
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">SUMBER DANA</label>
                            <select className="w-full p-2.5 border rounded-lg" value={asetForm.sumber} onChange={e => setAsetForm({...asetForm, sumber: e.target.value})}>
                                <option value="Kas Tunai">Kas Tunai</option>
                                <option value="Bank">Bank</option>
                                <option value="Modal Awal (Khusus Aset Lama)">Modal Awal (Aset Lama)</option>
                            </select>
                        </div>
                        <button onClick={handleAsetSubmit} disabled={loading} className="w-full bg-[#10B981] text-white p-3 rounded-xl font-bold shadow-lg hover:shadow-emerald-200">
                             CATAT ASET BARU
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
                                    <td className="py-3 px-6 text-right font-black text-emerald-700">{formatRp(aset.nominal)}</td>
                                </tr>
                            ))}
                            {asetList.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="py-10 text-center text-slate-400 font-medium italic">Belum ada aset tetap yang terdaftar.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
