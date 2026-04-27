import React, { useState, useEffect } from 'react';
import { submitInvoice, submitReturPenjualan, voidInvoice, getPenjualanHistory, getInvoiceDetails } from '../api/penjualanApi';
import { formatRp, formatInputNumber, parseNumber } from '../utils/formatters';

export default function PenjualanRetur() {
  const [activeTab, setActiveTab] = useState('input');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [history, setHistory] = useState([]);

  // POS CART
  const [cart, setCart] = useState([]);
  const [cartForm, setCartForm] = useState({ id: '', sku: '', nama: '', qty: 1, harga: 0 });
  const [meta, setMeta] = useState({ customer_id: '', metode: 'Tunai', tgl: new Date().toISOString().split('T')[0], dp: 0, diskon: 0 });

  // RETUR FORM
  const [returForm, setReturForm] = useState({ 
    no_invoice: '', 
    kode_sku: '', 
    qty_retur: 0, 
    tgl_retur: new Date().toISOString().split('T')[0], 
    alasan: 'Barang Cacat / Rusak' 
  });
  const [invDetails, setInvDetails] = useState([]);

  const fetchData = async () => {
    try {
      const [resCust, resProd, resHist] = await Promise.all([
        fetch('/api/master/mitra').then(r => r.json()),
        fetch('/api/master/barang').then(r => r.json()),
        getPenjualanHistory()
      ]);
      setCustomers(resCust.filter(m => m.kategori === 'Customer / Klien'));
      setProducts(resProd.filter(b => b.kategori === 'Barang Jadi (Baju)' && b.stok_saat_ini > 0));
      if (resHist.success) setHistory(resHist.data.list);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addToCart = () => {
    if (!cartForm.id || cartForm.qty <= 0) return alert("Pilih barang & jumlah valid!");
    
    const prod = products.find(p => p.id === Number(cartForm.id));
    if (cartForm.qty * 12 > prod.stok_saat_ini) {
        return alert(`Stok tidak cukup! Tersisa ${(prod.stok_saat_ini / 12).toFixed(1)} Lusin`);
    }

    setCart([...cart, { ...cartForm }]);
    setCartForm({ id: '', sku: '', nama: '', qty: 1, harga: 0 });
  };

  const removeFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const handleInvoiceSubmit = async () => {
    if (cart.length === 0 || !meta.customer_id) return alert("Lengkapi data nota!");
    setLoading(true);
    try {
        const res = await submitInvoice({
            tgl_jual: meta.tgl,
            customer_id: Number(meta.customer_id),
            metode: meta.metode,
            dp: Number(meta.dp),
            diskon: Number(meta.diskon),
            items: cart.map(i => ({ ...i, id: Number(i.id) }))
        });
        if (res.success) {
            setMsg({ text: res.message, type: 'success' });
            setCart([]);
            fetchData();
        } else setMsg({ text: res.message, type: 'error' });
    } catch (err) { setMsg({ text: err.message, type: 'error' }); }
    setLoading(false);
  };

  const handleReturSubmit = async (e) => {
    e.preventDefault();
    if (!returForm.no_invoice || !returForm.kode_sku || returForm.qty_retur <= 0) return alert("Lengkapi data retur!");
    
    const item = invDetails.find(d => d.kode_sku === returForm.kode_sku);
    if (returForm.qty_retur > item.qty) return alert("Retur tidak boleh melebihi jumlah jual!");

    setLoading(true);
    try {
        const res = await submitReturPenjualan(returForm);
        if (res.success) {
            setMsg({ text: res.message, type: 'success' });
            setReturForm({ ...returForm, no_invoice: '', kode_sku: '', qty_retur: 0 });
            setInvDetails([]);
            fetchData();
        } else setMsg({ text: res.message, type: 'error' });
    } catch (err) { setMsg({ text: err.message, type: 'error' }); }
    setLoading(false);
  };

  const handleVoid = async (noInv) => {
    if (!window.confirm(`Void Invoice ${noInv}? Stok akan kembali dan jurnal akan dihapus permanen!`)) return;
    setLoading(true);
    try {
        const res = await voidInvoice(noInv);
        if (res.success) {
            setMsg({ text: res.message, type: 'success' });
            fetchData();
        } else setMsg({ text: res.message, type: 'error' });
    } catch (err) { setMsg({ text: err.message, type: 'error' }); }
    setLoading(false);
  };

  const loadInvDetails = async (noInv) => {
    setReturForm({ ...returForm, no_invoice: noInv, kode_sku: '' });
    if (!noInv) return setInvDetails([]);
    try {
        const res = await getInvoiceDetails(noInv);
        if (res.success) setInvDetails(res.data.details);
    } catch (err) { console.error(err); }
  };

  const totalCart = cart.reduce((a, b) => a + (b.qty * b.harga), 0);
  const totalTagihan = totalCart - meta.diskon;

  return (
    <div className="max-w-6xl mx-auto pb-10 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-100">
            <span className="material-symbols-rounded text-3xl">point_of_sale</span>
        </div>
        <div>
            <h1 className="text-2xl font-black text-slate-800 font-outfit uppercase tracking-tighter">Penjualan & Retur</h1>
            <p className="text-slate-500 text-sm font-medium">Kasir POS dan manajemen pengembalian barang jadi.</p>
        </div>
      </div>

      {msg.text && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 ${msg.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
          <span className="material-symbols-rounded">{msg.type === 'error' ? 'error' : 'check_circle'}</span>
          <span className="font-bold">{msg.text}</span>
        </div>
      )}

      {/* TABS */}
      <div className="flex space-x-1 p-1 bg-slate-100 rounded-2xl w-fit">
        {[
            { id: 'input', label: 'Input Penjualan', icon: 'add_shopping_cart' },
            { id: 'retur', label: 'Retur Barang', icon: 'keyboard_return' },
            { id: 'history', label: 'Riwayat & Void', icon: 'history' }
        ].map(t => (
            <button
                key={t.id}
                onClick={() => { setActiveTab(t.id); setMsg({text:'', type:''}); }}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    activeTab === t.id ? 'bg-[#10B981] text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'
                }`}
            >
                <span className="material-symbols-rounded text-lg">{t.icon}</span>
                {t.label}
            </button>
        ))}
      </div>

      <div className="bg-white rounded-[2rem] p-8 shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-slate-100 min-h-[500px]">
        
        {/* TAB 1: INPUT */}
        {activeTab === 'input' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">1. Tambah Produk</label>
                        <select 
                            className="w-full p-3 border rounded-xl font-medium bg-white"
                            onChange={(e) => {
                                const p = products.find(prod => prod.id === Number(e.target.value));
                                if (p) setCartForm({ ...cartForm, id: p.id, sku: p.kode_sku, nama: p.nama_barang, harga: p.harga_jual });
                            }}
                        >
                            <option value="">-- Pilih Model Baju --</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.nama_barang} ({(p.stok_saat_ini/12).toFixed(1)} LS)</option>)}
                        </select>
                        
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="text-[10px] font-bold text-slate-500 px-1">LUSIN</label>
                                <input type="number" step="0.5" className="w-full p-3 border rounded-xl font-black" value={cartForm.qty} onChange={e => setCartForm({...cartForm, qty: Number(e.target.value)})} />
                             </div>
                             <div>
                                <label className="text-[10px] font-bold text-slate-500 px-1">HARGA / LS</label>
                                <input type="text" className="w-full p-3 border rounded-xl font-bold text-emerald-600 bg-emerald-50/30" value={formatInputNumber(cartForm.harga)} onChange={e => setCartForm({...cartForm, harga: parseNumber(e.target.value)})} />
                             </div>
                        </div>

                        <button onClick={addToCart} className="w-full bg-[#064E3B] text-white p-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black shadow-lg transition-all">
                             <span className="material-symbols-rounded">add_circle</span>
                             Masukkan ke Keranjang
                        </button>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                         <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">2. Informasi Nota</label>
                         <input type="date" className="w-full p-3 border rounded-xl text-sm" value={meta.tgl} onChange={e => setMeta({...meta, tgl: e.target.value})} />
                         <select className="w-full p-3 border rounded-xl text-sm font-bold" value={meta.customer_id} onChange={e => setMeta({...meta, customer_id: e.target.value})}>
                            <option value="">-- Pilih Customer --</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.nama_mitra}</option>)}
                         </select>
                         <div className="flex bg-slate-100 p-1 rounded-xl">
                            {["Tunai", "Transfer", "Piutang (Tempo)"].map(m => (
                                <button key={m} onClick={() => setMeta({...meta, metode: m})} className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${meta.metode === m ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400'}`}>{m.toUpperCase()}</button>
                            ))}
                         </div>
                         {meta.metode === 'Piutang (Tempo)' && (
                            <input type="text" placeholder="Uang Muka (DP)" className="w-full p-3 border rounded-xl text-sm font-bold bg-amber-50 border-amber-100" value={formatInputNumber(meta.dp)} onChange={e => setMeta({...meta, dp: parseNumber(e.target.value)})} />
                         )}
                         <input type="text" placeholder="Diskon Keseluruhan" className="w-full p-3 border rounded-xl text-sm font-bold border-red-100 text-red-500" value={formatInputNumber(meta.diskon)} onChange={e => setMeta({...meta, diskon: parseNumber(e.target.value)})} />
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                        <h3 className="text-xl font-black text-slate-800">Ringkasan Nota Penjualan</h3>
                        <button onClick={() => setCart([])} className="text-xs font-bold text-red-500 hover:underline">Hapus Semua</button>
                    </div>

                    <div className="min-h-[250px]">
                        <table className="w-full text-left text-sm">
                            <thead className="text-[10px] font-black uppercase text-slate-400 border-b">
                                <tr>
                                    <th className="py-4">Barang</th>
                                    <th className="py-4">Qty</th>
                                    <th className="py-4 text-right">Subtotal</th>
                                    <th className="py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {cart.map((item, i) => (
                                    <tr key={i}>
                                        <td className="py-4">
                                            <div className="font-bold text-slate-800">{item.nama}</div>
                                            <div className="text-[10px] font-mono text-slate-400">{item.sku}</div>
                                        </td>
                                        <td className="py-4 font-medium">{item.qty} Lusin</td>
                                        <td className="py-4 text-right font-black text-slate-800">{formatRp(item.qty * item.harga)}</td>
                                        <td className="py-4 text-right">
                                            <button onClick={() => removeFromCart(i)} className="text-red-400 hover:text-red-600"><span className="material-symbols-rounded">close</span></button>
                                        </td>
                                    </tr>
                                ))}
                                {cart.length === 0 && <tr><td colSpan="4" className="py-20 text-center text-slate-300 font-medium italic">Keranjang belanja kosong.</td></tr>}
                            </tbody>
                        </table>
                    </div>

                    {cart.length > 0 && (
                        <div className="bg-slate-900 rounded-3xl p-8 text-white space-y-4 shadow-2xl">
                            <div className="flex justify-between items-center text-slate-400 text-sm font-bold">
                                <span>TOTAL BRUTO</span>
                                <span>{formatRp(totalCart)}</span>
                            </div>
                            <div className="flex justify-between items-center text-red-400 text-sm font-bold">
                                <span>DISKON NOTA (-)</span>
                                <span>{formatRp(meta.diskon)}</span>
                            </div>
                            <hr className="border-slate-800" />
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-[10px] font-black text-emerald-400 tracking-widest uppercase">Total Tagihan Bersih</p>
                                    <h2 className="text-4xl font-black">{formatRp(totalTagihan)}</h2>
                                </div>
                                <button onClick={handleInvoiceSubmit} disabled={loading} className="bg-[#10B981] text-white px-10 py-4 rounded-2xl font-black text-lg shadow-lg hover:shadow-emerald-500/40 hover:scale-105 transition-all">
                                    {loading ? 'MEMPROSES...' : 'TERBITKAN INVOICE'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* TAB 2: RETUR */}
        {activeTab === 'retur' && (
            <div className="max-w-2xl mx-auto space-y-8">
                <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 flex items-center gap-4">
                    <span className="material-symbols-rounded text-amber-600 text-4xl">assignment_return</span>
                    <div>
                        <h2 className="text-xl font-black text-amber-900 leading-tight">Input Retur Penjualan</h2>
                        <p className="text-amber-700 text-sm font-medium">Proses barang dikembalikan dari customer dan pembalikan HPP.</p>
                    </div>
                </div>

                <form onSubmit={handleReturSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <label className="block text-xs font-bold text-slate-500 mb-1">CARI NOMOR INVOICE</label>
                        <select className="w-full p-4 border rounded-2xl font-bold text-lg" value={returForm.no_invoice} onChange={e => loadInvDetails(e.target.value)}>
                            <option value="">-- Pilih Invoice --</option>
                            {history.slice(0, 20).map(h => <option key={h.no_invoice} value={h.no_invoice}>{h.no_invoice} - {h.nama_customer}</option>)}
                        </select>
                    </div>

                    {returForm.no_invoice && (
                        <div className="grid grid-cols-2 gap-4 animate-in fade-in transition-all">
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-slate-500 mb-1">PILIH MODEL BAJU YANG DIRETAK</label>
                                <select className="w-full p-4 border rounded-xl font-medium" value={returForm.kode_sku} onChange={e => setReturForm({...returForm, kode_sku: e.target.value})}>
                                    <option value="">-- Pilih Barang --</option>
                                    {invDetails.map(d => <option key={d.kode_sku} value={d.kode_sku}>{d.nama_barang} (Beli: {d.qty} LS)</option>)}
                                </select>
                            </div>
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-slate-500 mb-1">JUMLAH RETUR (LUSIN)</label>
                                <input type="number" step="0.5" className="w-full p-4 border rounded-xl font-black" value={returForm.qty_retur} onChange={e => setReturForm({...returForm, qty_retur: Number(e.target.value)})} />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-slate-500 mb-1">TANGGAL TERIMA RETUR</label>
                                <input type="date" className="w-full p-4 border rounded-xl" value={returForm.tgl_retur} onChange={e => setReturForm({...returForm, tgl_retur: e.target.value})} />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-slate-500 mb-1">ALASAN RETUR</label>
                                <input type="text" className="w-full p-4 border rounded-xl" value={returForm.alasan} onChange={e => setReturForm({...returForm, alasan: e.target.value})} />
                            </div>
                            <button type="submit" disabled={loading} className="col-span-2 bg-amber-600 text-white p-5 rounded-2xl font-black text-lg shadow-xl hover:bg-amber-700 transition-all flex items-center justify-center gap-3">
                                <span className="material-symbols-rounded">save</span>
                                {loading ? 'MEMPROSES...' : 'KONFIRMASI RETUR BARANG'}
                            </button>
                        </div>
                    )}
                </form>
            </div>
        )}

        {/* TAB 3: RIWAYAT */}
        {activeTab === 'history' && (
            <div className="space-y-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-slate-800">Riwayat 50 Invoice Terakhir</h3>
                    <button onClick={fetchData} className="p-2 border rounded-full hover:bg-slate-50"><span className="material-symbols-rounded">sync</span></button>
                </div>

                <div className="overflow-x-auto border border-slate-100 rounded-[2rem]">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <tr>
                                <th className="py-5 px-6">Tgl & No Invoice</th>
                                <th className="py-5 px-6">Customer</th>
                                <th className="py-5 px-6 text-right">Tagihan</th>
                                <th className="py-5 px-6 text-center">Metode</th>
                                <th className="py-5 px-6 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {history.map(h => (
                                <tr key={h.no_invoice} className="hover:bg-slate-50/50 transition-all">
                                    <td className="py-4 px-6">
                                        <div className="font-black text-emerald-700">{h.no_invoice}</div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase">{new Date(h.tanggal).toLocaleDateString('id-ID')}</div>
                                    </td>
                                    <td className="py-4 px-6 font-bold text-slate-800">{h.nama_customer}</td>
                                    <td className="py-4 px-6 text-right font-black text-slate-700">{formatRp(h.total_tagihan)}</td>
                                    <td className="py-4 px-6 text-center">
                                        <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${h.metode_bayar === 'Piutang (Tempo)' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{h.metode_bayar.toUpperCase()}</span>
                                    </td>
                                    <td className="py-4 px-6 text-right flex justify-end gap-2">
                                        <button 
                                            onClick={() => window.open(`${import.meta.env.VITE_API_BASE_URL || ''}/api/penjualan/print/${h.no_invoice}`, '_blank')}
                                            className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all" 
                                            title="Cetak Invoice"
                                        >
                                            <span className="material-symbols-rounded text-lg">print</span>
                                        </button>
                                        <button onClick={() => handleVoid(h.no_invoice)} className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all" title="Void Invoice (Hapus)">
                                            <span className="material-symbols-rounded text-lg">delete_sweep</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {history.length === 0 && <tr><td colSpan="5" className="py-20 text-center text-slate-300 italic font-medium">Belum ada transaksi penjualan tercatat.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
