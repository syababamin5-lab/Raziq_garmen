import React, { useState, useEffect } from 'react';
import { submitInvoice, submitReturPenjualan, voidInvoice, getPenjualanHistory, getInvoiceDetails, bayarInvoiceCepat } from '../api/penjualanApi';
import { formatRp, formatInputNumber, parseNumber, getLocalDate, getLocalTimestamp } from '../utils/formatters';
import InvoiceDetailModal from '../components/dashboard/InvoiceDetailModal';

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
    const [meta, setMeta] = useState({ customer_id: '', metode: 'Tunai', tgl: getLocalDate(), dp: 0, dp_sumber: 'Kas Tunai', diskon: 0 });

    // RETUR FORM
    const [returForm, setReturForm] = useState({
        tgl_retur: getLocalDate(),
        alasan: 'Barang Cacat / Rusak',
        sumber_refund: 'BCA'
    });
    const [invDetails, setInvDetails] = useState([]);
    const [payModal, setPayModal] = useState({ open: false, no_invoice: '', nama_customer: '', total_tagihan: 0, uang_muka: 0, nominal: 0, sumber_dana: 'Kas Tunai' });

    // Invoice Detail Modal (icon mata)
    const [invoiceModal, setInvoiceModal] = useState({ open: false, invoice: null });

    // REAL-TIME BALANCES
    const [balances, setBalances] = useState({ tunai: 0, bank: 0 });
    const [helpContext, setHelpContext] = useState('input'); // 'input' | 'retur' | 'history'
    const [showHelp, setShowHelp] = useState(false);

    const fetchBalances = async () => {
        try {
            const res = await fetch('/api/dashboard/balances').then(r => r.json());
            if (res.success) setBalances({ tunai: res.tunai, bank: res.bank });
        } catch (err) { console.error("Balance Fetch Error:", err); }
    };

    const fetchData = async () => {
        try {
            fetchBalances(); // Initial fetch
            const [resCust, resProd, resHist] = await Promise.all([
                fetch('/api/master/mitra').then(r => r.json()),
                fetch('/api/master/barang').then(r => r.json()),
                getPenjualanHistory()
            ]);
            setCustomers(resCust.filter(m => m.kategori === 'Customer / Klien'));
            setProducts(resProd.filter(b => 
                (b.kategori === 'Barang Jadi (Baju)' || b.kategori === 'BARANG_JADI')
            ));
            if (resHist.success) setHistory(resHist.data.list);
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchBalances, 10000); // Poll balances every 10s
        return () => clearInterval(interval);
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
                tgl_jual: meta.tgl === getLocalDate() ? getLocalTimestamp() : meta.tgl,
                customer_id: Number(meta.customer_id),
                metode: meta.metode,
                dp: Number(meta.dp),
                dp_sumber: meta.dp_sumber || 'Kas Tunai',
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
        const remaining = item.qty - (item.qty_retur || 0);
        if (returForm.qty_retur > remaining) return alert(`Retur tidak boleh melebihi sisa barang (${remaining} LS)!`);

        setLoading(true);
        try {
            const res = await submitReturPenjualan({ 
                ...returForm, 
                tgl_retur: returForm.tgl_retur === getLocalDate() ? getLocalTimestamp() : returForm.tgl_retur 
            });
            if (res.success) {
                setMsg({ text: res.message, type: 'success' });
                setReturForm({ ...returForm, no_invoice: '', kode_sku: '', qty_retur: 0, sumber_refund: 'BCA' });
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

    const handleBayarCepatSubmit = async (e) => {
        e.preventDefault();
        if (!payModal.no_invoice || payModal.nominal <= 0) return alert("Nominal tidak valid!");

        if (!window.confirm(`Yakin melunasi Invoice ${payModal.no_invoice} sebesar ${formatRp(payModal.nominal)}?`)) return;

        setLoading(true);
        try {
            const res = await bayarInvoiceCepat({
                no_invoice: payModal.no_invoice,
                nominal: payModal.nominal,
                sumber_dana: payModal.sumber_dana,
                tgl: getLocalTimestamp()
            });
            if (res.success) {
                setMsg({ text: res.message, type: 'success' });
                setPayModal({ open: false, no_invoice: '', nama_customer: '', nominal: 0, sumber_dana: 'Kas Tunai' });
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

                {/* Real-time Balances UI */}
                <div className="ml-auto flex items-center gap-4">
                    <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex flex-col items-center min-w-[140px] shadow-sm">
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Saldo Kas Tunai
                        </span>
                        <h3 className="text-xl font-black text-emerald-900">{formatRp(balances.tunai)}</h3>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex flex-col items-center min-w-[140px] shadow-sm">
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                            Saldo BCA
                        </span>
                        <h3 className="text-xl font-black text-blue-900">{formatRp(balances.bank)}</h3>
                    </div>
                </div>
            </div>

            {msg.text && (
                <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 ${msg.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
                    <span className="material-symbols-rounded">{msg.type === 'error' ? 'error' : 'check_circle'}</span>
                    <span className="font-bold">{msg.text}</span>
                </div>
            )}

            {/* TABS */}
            <div className="flex items-center gap-4">
                <div className="flex space-x-1 p-1 bg-slate-100 rounded-2xl w-fit border border-slate-200 shadow-sm">
                    {[
                        { id: 'input', label: 'Input Penjualan', icon: 'add_shopping_cart' },
                        { id: 'retur', label: 'Retur Barang', icon: 'keyboard_return' },
                        { id: 'history', label: 'Riwayat & Void', icon: 'history' }
                    ].map(t => (
                        <div key={t.id} className="relative group/tab">
                            <button
                                onClick={() => { setActiveTab(t.id); setMsg({ text: '', type: '' }); }}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === t.id ? 'bg-[#10B981] text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'
                                    }`}
                            >
                                <span className="material-symbols-rounded text-lg">{t.icon}</span>
                                {t.label}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-[2rem] p-8 shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-slate-100 min-h-[500px]">

                {/* TAB 1: INPUT */}
                {activeTab === 'input' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">1. Tambah Produk</label>
                                    <button 
                                        onClick={() => { setHelpContext('input'); setShowHelp(true); }}
                                        className="w-6 h-6 rounded-full flex items-center justify-center bg-slate-500/10 backdrop-blur-md text-slate-400 hover:bg-emerald-500 hover:text-white transition-all shadow-sm border border-white/50"
                                        title="Bantuan Input Penjualan"
                                    >
                                        <span className="material-symbols-rounded text-[14px]">info</span>
                                    </button>
                                </div>
                                <select
                                    className="w-full p-3 border rounded-xl font-medium bg-white"
                                    onChange={(e) => {
                                        const p = products.find(prod => prod.id === Number(e.target.value));
                                        if (p) setCartForm({ ...cartForm, id: p.id, sku: p.kode_sku, nama: p.nama_barang, harga: p.harga_jual });
                                    }}
                                >
                                    <option value="">-- Pilih Model Baju --</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.nama_barang} 
                                            {p.stok_saat_ini > 0 ? ` (${(p.stok_saat_ini / 12).toFixed(1)} LS)` : ' (STOK HABIS)'}
                                        </option>
                                    ))}
                                </select>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 px-1">LUSIN</label>
                                        <input type="number" step="0.5" className="w-full p-3 border rounded-xl font-black" value={cartForm.qty} onChange={e => setCartForm({ ...cartForm, qty: Number(e.target.value) })} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 px-1">HARGA / LS</label>
                                        <input type="text" className="w-full p-3 border rounded-xl font-bold text-emerald-600 bg-emerald-50/30" value={formatInputNumber(cartForm.harga)} onChange={e => setCartForm({ ...cartForm, harga: parseNumber(e.target.value) })} />
                                    </div>
                                </div>

                                <button onClick={addToCart} className="w-full bg-[#064E3B] text-white p-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black shadow-lg transition-all">
                                    <span className="material-symbols-rounded">add_circle</span>
                                    Masukkan ke Keranjang
                                </button>
                            </div>

                            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">2. Informasi Nota</label>
                                <input type="date" className="w-full p-3 border rounded-xl text-sm" value={meta.tgl} onChange={e => setMeta({ ...meta, tgl: e.target.value })} />
                                <select className="w-full p-3 border rounded-xl text-sm font-bold" value={meta.customer_id} onChange={e => setMeta({ ...meta, customer_id: e.target.value })}>
                                    <option value="">-- Pilih Customer --</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.nama_mitra}</option>)}
                                </select>
                                <div className="flex bg-slate-100 p-1 rounded-xl">
                                    {["Tunai", "Transfer", "Piutang (Tempo)"].map(m => (
                                        <button key={m} onClick={() => setMeta({ ...meta, metode: m })} className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${meta.metode === m ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400'}`}>{m.toUpperCase()}</button>
                                    ))}
                                </div>
                                {meta.metode === 'Piutang (Tempo)' && (
                                    <div className="space-y-2">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-amber-600 px-1">UANG MUKA (DP) - OPSIONAL</label>
                                            <input type="text" placeholder="Masukkan DP (Opsional)" className="w-full p-3 border rounded-xl text-sm font-bold bg-amber-50 border-amber-200 text-amber-700" value={formatInputNumber(meta.dp)} onChange={e => setMeta({ ...meta, dp: parseNumber(e.target.value) })} />
                                        </div>
                                        {meta.dp > 0 && (
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-amber-600 px-1">DP MASUK KE</label>
                                                <div className="flex bg-amber-50 border border-amber-200 p-1 rounded-xl">
                                                    {['Kas Tunai', 'BCA'].map(s => (
                                                        <button key={s} type="button" onClick={() => setMeta({ ...meta, dp_sumber: s })} className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${meta.dp_sumber === s ? 'bg-amber-500 text-white shadow-sm' : 'text-amber-600'}`}>
                                                            {s === 'Kas Tunai' ? '💵 KAS TUNAI' : '🏦 BCA'}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-red-500 px-1">DISKON NOTA KESELURUHAN</label>
                                    <input type="text" placeholder="Masukkan Diskon" className="w-full p-3 border rounded-xl text-sm font-bold bg-red-50/30 border-red-200 text-red-600" value={formatInputNumber(meta.diskon)} onChange={e => setMeta({ ...meta, diskon: parseNumber(e.target.value) })} />
                                </div>
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
                                                <td className="py-4 text-right">
                                                    <div className="font-black text-slate-800">{formatRp(item.qty * item.harga)}</div>
                                                    <div className="text-[10px] text-slate-400">Rp {(item.harga / 12).toLocaleString('id-ID')} / Pcs</div>
                                                </td>
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
                                    {meta.diskon > 0 && (
                                        <div className="flex justify-between items-center text-red-400 text-sm font-bold">
                                            <span>DISKON NOTA (-)</span>
                                            <span>{formatRp(meta.diskon)}</span>
                                        </div>
                                    )}
                                    {meta.metode === 'Piutang (Tempo)' && meta.dp > 0 && (
                                        <div className="flex justify-between items-center text-amber-400 text-sm font-bold">
                                            <span>UANG MUKA / DP (-)</span>
                                            <span>{formatRp(meta.dp)}</span>
                                        </div>
                                    )}
                                    <hr className="border-slate-800" />
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-[10px] font-black text-emerald-400 tracking-widest uppercase">
                                                {meta.metode === 'Piutang (Tempo)' && meta.dp > 0 ? 'Sisa Piutang' : 'Total Tagihan Bersih'}
                                            </p>
                                            <h2 className="text-4xl font-black">
                                                {formatRp(totalTagihan - (meta.metode === 'Piutang (Tempo)' ? (meta.dp || 0) : 0))}
                                            </h2>
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
                        <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <span className="material-symbols-rounded text-amber-600 text-4xl">assignment_return</span>
                                <div>
                                    <h2 className="text-xl font-black text-amber-900 leading-tight">Input Retur Penjualan</h2>
                                    <p className="text-amber-700 text-sm font-medium">Proses barang dikembalikan dari customer dan pembalikan HPP.</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => { setHelpContext('retur'); setShowHelp(true); }}
                                className="w-8 h-8 rounded-full flex items-center justify-center bg-amber-600/10 backdrop-blur-md text-amber-600 hover:bg-amber-600 hover:text-white transition-all shadow-sm border border-amber-200"
                                title="Bantuan Retur Barang"
                            >
                                <span className="material-symbols-rounded text-[18px]">info</span>
                            </button>
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
                                        <select className="w-full p-4 border rounded-xl font-medium" value={returForm.kode_sku} onChange={e => setReturForm({ ...returForm, kode_sku: e.target.value })}>
                                            <option value="">-- Pilih Barang --</option>
                                            {invDetails
                                                .filter(d => (d.qty - (d.qty_retur || 0)) > 0)
                                                .map(d => (
                                                <option key={d.kode_sku} value={d.kode_sku}>
                                                    {d.nama_barang} (Beli: {d.qty} LS {d.qty_retur > 0 ? `| Sisa: ${d.qty - d.qty_retur} LS` : ''})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-xs font-bold text-slate-500 mb-1">JUMLAH RETUR (LUSIN)</label>
                                        <input type="number" step="0.5" className="w-full p-4 border rounded-xl font-black" value={returForm.qty_retur} onChange={e => setReturForm({ ...returForm, qty_retur: Number(e.target.value) })} />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-xs font-bold text-slate-500 mb-1">TANGGAL TERIMA RETUR</label>
                                        <input type="date" className="w-full p-4 border rounded-xl" value={returForm.tgl_retur} onChange={e => setReturForm({ ...returForm, tgl_retur: e.target.value })} />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 mb-1">ALASAN RETUR</label>
                                        <input type="text" className="w-full p-4 border rounded-xl" value={returForm.alasan} onChange={e => setReturForm({ ...returForm, alasan: e.target.value })} />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 mb-1">SUMBER DANA PENGEMBALIAN (JIKA ADA REFUND DP)</label>
                                        <div className="flex bg-slate-100 p-1 rounded-xl">
                                            {['Kas Tunai', 'BCA'].map(s => (
                                                <button key={s} type="button" onClick={() => setReturForm({ ...returForm, sumber_refund: s })} className={`flex-1 py-3 text-[10px] font-black rounded-lg transition-all ${returForm.sumber_refund === s ? 'bg-white shadow-sm text-amber-600' : 'text-slate-400'}`}>
                                                    {s === 'Kas Tunai' ? '💵 KAS TUNAI' : '🏦 BCA'}
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1 font-medium italic">*Uang akan dikeluarkan dari akun ini jika ada DP yang harus dikembalikan ke customer.</p>
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
                        <div className="flex justify-between items-center mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <div className="flex items-center gap-3">
                                <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">Riwayat 50 Invoice Terakhir</h3>
                                <button 
                                    onClick={() => { setHelpContext('history'); setShowHelp(true); }}
                                    className="w-7 h-7 rounded-full flex items-center justify-center bg-slate-500/10 backdrop-blur-md text-slate-400 hover:bg-slate-700 hover:text-white transition-all shadow-sm border border-white"
                                    title="Bantuan Riwayat & Void"
                                >
                                    <span className="material-symbols-rounded text-[16px]">info</span>
                                </button>
                            </div>
                            <button onClick={fetchData} className="p-2 border rounded-full hover:bg-slate-200 bg-white transition-all shadow-sm"><span className="material-symbols-rounded">sync</span></button>
                        </div>

                        <div className="overflow-x-auto border border-slate-100 rounded-[2rem]">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <tr>
                                        <th className="py-5 px-6">Tgl & No Invoice</th>
                                        <th className="py-5 px-6">Customer</th>
                                        <th className="py-5 px-6 text-right">Tagihan</th>
                                        <th className="py-5 px-6 text-center">Status / Metode</th>
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
                                                <div className="flex flex-col items-center gap-1">
                                                    {h.status === 'Lunas' ? (
                                                        <span className="px-2 py-1 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-700">✅ LUNAS</span>
                                                    ) : (
                                                        <>
                                                            <span className="px-2 py-1 rounded-md text-[10px] font-black bg-amber-100 text-amber-700">⏳ TEMPO</span>
                                                            <span className="text-[10px] font-black text-red-500">
                                                                Sisa: {new Intl.NumberFormat('id-ID', {style: 'currency', currency: 'IDR', maximumFractionDigits: 0}).format(h.sisa_tagihan || 0)}
                                                            </span>
                                                        </>
                                                    )}
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">{h.metode_bayar}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                <div className="flex justify-end gap-2 items-center">
                                                    {/* 👁 Lihat Detail */}
                                                    <button
                                                        onClick={() => setInvoiceModal({
                                                            open: true,
                                                            invoice: {
                                                                no_invoice: h.no_invoice,
                                                                nama_produk: h.nama_customer,
                                                                nama_customer: h.nama_customer,
                                                                tanggal: new Date(h.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }),
                                                                total_tagihan: h.total_tagihan,
                                                                uang_muka: h.uang_muka || 0,
                                                                diskon: h.diskon || 0,
                                                                status: h.status
                                                            }
                                                        })}
                                                        className="p-2 bg-sky-50 text-sky-600 rounded-xl hover:bg-sky-500 hover:text-white transition-all"
                                                        title="Lihat Detail Invoice"
                                                    >
                                                        <span className="material-symbols-rounded text-lg">visibility</span>
                                                    </button>

                                                    {/* 💸 Terima Pelunasan */}
                                                    {h.status !== 'Lunas' && (
                                                        <button
                                                            onClick={() => {
                                                                const sisaAktual = h.sisa_tagihan > 0 ? h.sisa_tagihan : (h.total_tagihan - (h.uang_muka || 0));
                                                                setPayModal({ open: true, no_invoice: h.no_invoice, nama_customer: h.nama_customer, total_tagihan: h.total_tagihan, uang_muka: h.uang_muka || 0, nominal: sisaAktual, sumber_dana: 'Kas Tunai' });
                                                            }}
                                                            className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-500 hover:text-white transition-all flex items-center gap-1"
                                                            title="Terima Pelunasan Invoice"
                                                        >
                                                            <span className="material-symbols-rounded text-lg">payments</span>
                                                            <span className="text-[10px] font-bold hidden xl:inline">💸 Terima Pelunasan</span>
                                                        </button>
                                                    )}

                                                    {/* 🖨️ Cetak PDF */}
                                                    <a
                                                        href={`${import.meta.env.VITE_API_BASE_URL || ''}/api/penjualan/print/${h.no_invoice}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all inline-block"
                                                        title="Cetak Invoice PDF"
                                                    >
                                                        <span className="material-symbols-rounded text-lg">print</span>
                                                    </a>

                                                    {/* 🗑️ Void - Hanya tampil jika belum Lunas */}
                                                    {h.status !== 'Lunas' ? (
                                                        <button
                                                            onClick={() => handleVoid(h.no_invoice)}
                                                            className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                                                            title="Hapus Invoice (Hanya untuk invoice belum lunas)"
                                                        >
                                                            <span className="material-symbols-rounded text-lg">delete_sweep</span>
                                                        </button>
                                                    ) : (
                                                        <div
                                                            className="p-2 bg-slate-100 text-slate-300 rounded-xl cursor-not-allowed"
                                                            title="Invoice Lunas tidak dapat dihapus. Hubungi Super Admin jika ada kesalahan data."
                                                        >
                                                            <span className="material-symbols-rounded text-lg">lock</span>
                                                        </div>
                                                    )}
                                                </div>
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

            {/* PAY MODAL */}
            {payModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                        <div className="bg-emerald-500 p-6 text-white text-center">
                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                <span className="material-symbols-rounded text-3xl">payments</span>
                            </div>
                            <h2 className="text-xl font-black">Terima Pelunasan</h2>
                            <p className="text-emerald-100 text-sm font-medium">Invoice: {payModal.no_invoice}</p>
                        </div>

                        <form onSubmit={handleBayarCepatSubmit} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">CUSTOMER</label>
                                    <input type="text" className="w-full p-4 border rounded-xl font-bold bg-slate-50 text-slate-600" value={payModal.nama_customer} disabled />
                                </div>
                                {payModal.uang_muka > 0 && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
                                        <span className="material-symbols-rounded text-amber-500 text-xl">payments</span>
                                        <div>
                                            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">DP Sudah Diterima Sebelumnya</p>
                                            <p className="font-black text-amber-700">{formatRp(payModal.uang_muka)}</p>
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">SISA PIUTANG YANG DILUNASI</label>
                                    <input type="text" className="w-full p-4 border rounded-xl font-black text-emerald-600 bg-emerald-50" value={formatInputNumber(payModal.nominal)} disabled />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">SUMBER DANA (MASUK KE)</label>
                                    <select
                                        className="w-full p-4 border rounded-xl font-bold text-slate-700"
                                        value={payModal.sumber_dana}
                                        onChange={(e) => setPayModal({ ...payModal, sumber_dana: e.target.value })}
                                    >
                                        <option value="Kas Tunai">Kas Tunai (11110)</option>
                                        <option value="BCA">BCA (11120)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setPayModal({ ...payModal, open: false })}
                                    className="flex-1 py-4 font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 py-4 font-black text-white bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-200 rounded-xl transition-all"
                                >
                                    {loading ? 'Proses...' : 'LUNASKAN SEKARANG'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Invoice Detail Modal (icon mata) ────────────────── */}
            <InvoiceDetailModal
                isOpen={invoiceModal.open}
                onClose={() => setInvoiceModal({ open: false, invoice: null })}
                invoice={invoiceModal.invoice}
            />

            {/* ── HELP / TUTORIAL MODAL (DYNAMIC CONTENT) ────────────────── */}
            {showHelp && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 slide-in-from-bottom-8 duration-300">
                        {/* Header Help */}
                        <div className={`p-8 text-white flex items-center justify-between bg-gradient-to-r ${
                            helpContext === 'input' ? 'from-[#064E3B] to-[#10B981]' : 
                            helpContext === 'retur' ? 'from-amber-600 to-amber-500' : 
                            'from-slate-800 to-slate-700'
                        }`}>
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 bg-white/20 rounded-[2rem] flex items-center justify-center backdrop-blur-sm border border-white/30 shadow-inner">
                                    <span className="material-symbols-rounded text-3xl">
                                        {helpContext === 'input' ? 'shopping_cart' : helpContext === 'retur' ? 'assignment_return' : 'history'}
                                    </span>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black uppercase tracking-tighter leading-none mb-2">
                                        PANDUAN {helpContext === 'input' ? 'INPUT PENJUALAN' : helpContext === 'retur' ? 'RETUR BARANG' : 'RIWAYAT & VOID'}
                                    </h2>
                                    <p className="text-white/70 text-sm font-medium">Sistem Akuntansi & Manajemen Gudang Raziq Garmen v2.0</p>
                                </div>
                            </div>
                            <button onClick={() => setShowHelp(false)} className="w-12 h-12 rounded-2xl bg-black/10 hover:bg-black/20 flex items-center justify-center transition-all border border-white/10">
                                <span className="material-symbols-rounded">close</span>
                            </button>
                        </div>

                        {/* Content Help (Scrollable) */}
                        <div className="p-10 overflow-y-auto space-y-10 font-outfit text-slate-700">
                            
                            {helpContext === 'input' && (
                                <>
                                    {/* Section 1: Data Utama */}
                                    <section className="space-y-4">
                                        <div className="flex items-center gap-3 text-emerald-800">
                                            <span className="material-symbols-rounded font-black">edit_note</span>
                                            <h3 className="text-xl font-black uppercase tracking-tight">1. Detail Pengisian Form</h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="bg-slate-50 p-6 rounded-[1.5rem] border border-slate-100 shadow-sm">
                                                <p className="font-black text-slate-900 mb-2 flex items-center gap-2 italic">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> 
                                                    Produk & Satuan Lusin
                                                </p>
                                                <p className="text-sm leading-relaxed text-slate-600">
                                                    Pilih model baju yang tersedia. Input jumlah menggunakan satuan <b>Lusin (LS)</b>. 
                                                    <br/><span className="text-[11px] font-bold text-emerald-600">(1 Lusin = 12 Pcs)</span>. 
                                                    Sistem akan menghitung harga per pcs secara otomatis untuk membantu verifikasi nilai jual.
                                                </p>
                                            </div>
                                            <div className="bg-slate-50 p-6 rounded-[1.5rem] border border-slate-100 shadow-sm">
                                                <p className="font-black text-slate-900 mb-2 flex items-center gap-2 italic">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> 
                                                    Metode & Customer
                                                </p>
                                                <p className="text-sm leading-relaxed text-slate-600">
                                                    <b>Tunai/Transfer</b>: Pembayaran lunas seketika, saldo kas/bank bertambah.
                                                    <br/><b>Tempo</b>: Penjualan kredit yang akan menambah <b>Piutang Customer</b> di laporan Neraca.
                                                </p>
                                            </div>
                                            <div className="bg-slate-50 p-6 rounded-[1.5rem] border border-slate-100 shadow-sm">
                                                <p className="font-black text-slate-900 mb-2 flex items-center gap-2 italic">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> 
                                                    DP (Uang Muka)
                                                </p>
                                                <p className="text-sm leading-relaxed text-slate-600">
                                                    Khusus metode Tempo, Anda bisa mencatat pembayaran awal. Pilih akun <b>Kas Tunai</b> atau <b>BCA</b> sebagai tempat penyimpanan uang DP tersebut.
                                                </p>
                                            </div>
                                            <div className="bg-slate-50 p-6 rounded-[1.5rem] border border-slate-100 shadow-sm">
                                                <p className="font-black text-slate-900 mb-2 flex items-center gap-2 italic">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> 
                                                    Diskon Nota
                                                </p>
                                                <p className="text-sm leading-relaxed text-slate-600">
                                                    Potongan harga final dalam bentuk rupiah yang mengurangi total tagihan bersih (Net Sales) pada satu nomor invoice.
                                                </p>
                                            </div>
                                        </div>
                                    </section>

                                    {/* Section 2: Alur Keranjang */}
                                    <section className="space-y-4">
                                        <div className="flex items-center gap-3 text-blue-800">
                                            <span className="material-symbols-rounded font-black">checklist</span>
                                            <h3 className="text-xl font-black uppercase tracking-tight">2. Alur Penggunaan (Workflow)</h3>
                                        </div>
                                        <div className="space-y-3">
                                            {[
                                                "<b>Pilih Barang</b> -> Masukkan Qty & Harga -> Klik <b>Masukkan ke Keranjang</b>.",
                                                "Sistem akan memvalidasi stok. Jika stok kurang dari permintaan, transaksi ditolak.",
                                                "Lengkapi data <b>Informasi Nota</b> (Customer, Tgl, Metode).",
                                                "Periksa <b>Ringkasan Nota</b> di sisi kanan. Pastikan Total Bruto & Diskon sesuai.",
                                                "Klik <b>TERBITKAN INVOICE</b>. Sistem akan menyimpan data ke Database & mencatat Jurnal Akuntansi."
                                            ].map((txt, i) => (
                                                <div key={i} className="flex gap-4 items-center bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
                                                    <span className="w-8 h-8 rounded-full bg-blue-600 text-white flex-shrink-0 flex items-center justify-center text-xs font-black shadow-lg">{i+1}</span>
                                                    <p className="text-sm font-medium" dangerouslySetInnerHTML={{ __html: txt }}></p>
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    {/* Section 3: Dampak Sistem */}
                                    <section className="bg-slate-900 rounded-[2.5rem] p-10 text-white space-y-6 shadow-2xl relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-8 opacity-10">
                                            <span className="material-symbols-rounded text-[120px]">analytics</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-emerald-400">
                                            <span className="material-symbols-rounded text-3xl">account_balance</span>
                                            <h3 className="text-xl font-black uppercase tracking-tight">3. Pengaruh ke Laporan Keuangan</h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                                            <div className="space-y-3">
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Otomatisasi Stok</p>
                                                <p className="text-sm text-slate-300 leading-relaxed font-medium">
                                                    Sistem otomatis mengurangi jumlah barang di gudang <b>(Persediaan Barang Jadi)</b> sesuai SKU yang terjual.
                                                </p>
                                            </div>
                                            <div className="space-y-3">
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Otomatisasi Jurnal</p>
                                                <ul className="text-[11px] space-y-1.5 font-mono text-emerald-400">
                                                    <li>[DB] Kas/Bank/Piutang (+)</li>
                                                    <li>[CR] Pendapatan Penjualan (+)</li>
                                                    <li>[DB] Harga Pokok Penjualan (HPP) (+)</li>
                                                    <li>[CR] Persediaan Barang Jadi (-)</li>
                                                </ul>
                                            </div>
                                        </div>
                                        <div className="pt-4 border-t border-white/10 text-center">
                                            <p className="text-xs text-slate-400 font-bold italic tracking-wide">"Penjualan ini akan langsung muncul di Dashboard & Laporan Laba Rugi periode berjalan."</p>
                                        </div>
                                    </section>
                                </>
                            )}

                            {helpContext === 'retur' && (
                                <>
                                    {/* Section 1: Input Retur */}
                                    <section className="space-y-4">
                                        <div className="flex items-center gap-3 text-amber-800">
                                            <span className="material-symbols-rounded font-black">assignment_return</span>
                                            <h3 className="text-xl font-black uppercase tracking-tight">1. Prosedur Retur Penjualan</h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="bg-amber-50/50 p-6 rounded-[1.5rem] border border-amber-100">
                                                <p className="font-black text-amber-900 mb-2 italic">Referensi Invoice</p>
                                                <p className="text-sm leading-relaxed text-amber-800/80">
                                                    Retur WAJIB merujuk pada nomor invoice asli. Ini untuk memastikan bahwa barang yang dikembalikan memang pernah terjual dan nilainya sesuai.
                                                </p>
                                            </div>
                                            <div className="bg-amber-50/50 p-6 rounded-[1.5rem] border border-amber-100">
                                                <p className="font-black text-amber-900 mb-2 italic">Validasi Sisa Barang</p>
                                                <p className="text-sm leading-relaxed text-amber-800/80">
                                                    Sistem mencatat riwayat retur per invoice. Anda tidak bisa meretur barang melebihi jumlah sisa barang yang masih ada pada customer.
                                                </p>
                                            </div>
                                            <div className="bg-amber-50/50 p-6 rounded-[1.5rem] border border-amber-100 col-span-2">
                                                <p className="font-black text-amber-900 mb-2 italic">Refund & Dana Pengembalian</p>
                                                <p className="text-sm leading-relaxed text-amber-800/80">
                                                    Jika customer meminta pengembalian uang (karena sudah lunas atau ada DP), tentukan dari mana uang diambil (Kas Tunai/BCA). Sistem akan mencatat jurnal pengeluaran kas otomatis.
                                                </p>
                                            </div>
                                        </div>
                                    </section>

                                    {/* Section 2: Dampak Retur */}
                                    <section className="space-y-4">
                                        <div className="flex items-center gap-3 text-emerald-800">
                                            <span className="material-symbols-rounded font-black">autorenew</span>
                                            <h3 className="text-xl font-black uppercase tracking-tight">2. Apa Pengaruhnya ke Sistem?</h3>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-5 bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100">
                                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-emerald-600"><span className="material-symbols-rounded">inventory</span></div>
                                                <div>
                                                    <p className="font-black text-emerald-900 text-sm">Stok Kembali (Restock)</p>
                                                    <p className="text-xs text-slate-600 italic">Jumlah barang di gudang otomatis bertambah kembali setelah retur divalidasi.</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-5 bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100">
                                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-emerald-600"><span className="material-symbols-rounded">credit_card_off</span></div>
                                                <div>
                                                    <p className="font-black text-emerald-900 text-sm">Koreksi Piutang / Hutang Balik</p>
                                                    <p className="text-xs text-slate-600 italic">Nilai piutang customer akan berkurang otomatis sesuai nilai barang yang diretur.</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-5 bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100">
                                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-emerald-600"><span className="material-symbols-rounded">account_tree</span></div>
                                                <div>
                                                    <p className="font-black text-emerald-900 text-sm">Pembalikan HPP (Accounting Reversal)</p>
                                                    <p className="text-xs text-slate-600 italic">Mencatat Jurnal Balik: Debit Persediaan dan Kredit HPP untuk menjaga akurasi Laba Rugi.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                </>
                            )}

                            {helpContext === 'history' && (
                                <>
                                    {/* Section 1: Monitoring & Tools */}
                                    <section className="space-y-4">
                                        <div className="flex items-center gap-3 text-slate-800">
                                            <span className="material-symbols-rounded font-black">manage_search</span>
                                            <h3 className="text-xl font-black uppercase tracking-tight">1. Pengelolaan Transaksi</h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="border border-slate-200 p-5 rounded-2xl bg-white shadow-sm flex gap-4">
                                                <span className="material-symbols-rounded text-sky-500">visibility</span>
                                                <div>
                                                    <p className="font-black text-sm">Lihat Detail</p>
                                                    <p className="text-xs text-slate-500">Melihat rincian barang, diskon, dan status pembayaran tiap nota secara lengkap.</p>
                                                </div>
                                            </div>
                                            <div className="border border-slate-200 p-5 rounded-2xl bg-white shadow-sm flex gap-4">
                                                <span className="material-symbols-rounded text-emerald-500">payments</span>
                                                <div>
                                                    <p className="font-black text-sm">Terima Pelunasan</p>
                                                    <p className="text-xs text-slate-500">Mencatat uang masuk untuk invoice berstatus "Tempo". Ini akan mengurangi saldo Piutang.</p>
                                                </div>
                                            </div>
                                            <div className="border border-slate-200 p-5 rounded-2xl bg-white shadow-sm flex gap-4">
                                                <span className="material-symbols-rounded text-slate-500">print</span>
                                                <div>
                                                    <p className="font-black text-sm">Cetak PDF</p>
                                                    <p className="text-xs text-slate-500">Mengunduh dokumen nota fisik standar Raziq Garmen untuk arsip atau dikirim ke customer.</p>
                                                </div>
                                            </div>
                                            <div className="border border-slate-200 p-5 rounded-2xl bg-white shadow-sm flex gap-4">
                                                <span className="material-symbols-rounded text-red-500">delete_sweep</span>
                                                <div>
                                                    <p className="font-black text-sm">Void (Batalkan)</p>
                                                    <p className="text-xs text-slate-500">Membatalkan seluruh transaksi, mengembalikan stok, dan menghapus jurnal keuangan.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    {/* Section 2: Aturan Void & Lunas */}
                                    <section className="bg-red-50 border-2 border-red-200 p-8 rounded-[2.5rem] space-y-5">
                                        <div className="flex items-center gap-3 text-red-700">
                                            <span className="material-symbols-rounded font-black text-3xl">security</span>
                                            <h3 className="text-xl font-black uppercase tracking-tight">Aturan Keamanan Audit (PENTING)</h3>
                                        </div>
                                        <div className="space-y-3 text-sm text-red-900 leading-relaxed font-medium">
                                            <p>
                                                <b>VOIDING</b>: Hanya diperbolehkan untuk invoice yang <b>BELUM LUNAS</b>. 
                                                Void akan menghapus permanen jejak keuangan transaksi tersebut untuk mengoreksi kesalahan input sebelum uang benar-benar diterima penuh.
                                            </p>
                                            <p className="p-4 bg-white/50 rounded-xl border border-red-100">
                                                <b>STATUS LUNAS (LOCK)</b>: Jika invoice sudah berstatus "Lunas" (ditandai ikon gembok), sistem akan <b>MENGUNCI</b> fitur Void. 
                                                Hal ini dilakukan untuk menjaga integritas laporan arus kas. Jika ada kesalahan pada nota lunas, hubungi <b>Super Admin</b> untuk prosedur penyesuaian manual.
                                            </p>
                                        </div>
                                    </section>
                                </>
                            )}

                            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200 text-center">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Integritas Data Penjualan</p>
                                <p className="text-xs text-slate-500 italic font-medium leading-relaxed mb-4">
                                    "Setiap klik simpan di modul ini diawasi oleh sistem audit internal untuk memastikan kecocokan antara stok gudang fisik dan laporan laba rugi perusahaan."
                                </p>
                                <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-100 justify-center">
                                    <span className="material-symbols-rounded text-slate-400 text-sm">menu_book</span>
                                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">
                                        Sumber Aturan: SAK Indonesia & Algoritma Jurnal Otomatis Raziq Garmen v2
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Footer Help */}
                        <div className="p-8 border-t border-slate-100 flex justify-center bg-slate-50/50">
                            <button onClick={() => setShowHelp(false)} className="px-16 py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-black transition-all shadow-xl hover:scale-105 active:scale-95">SAYA MENGERTI, TUTUP PANDUAN</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
