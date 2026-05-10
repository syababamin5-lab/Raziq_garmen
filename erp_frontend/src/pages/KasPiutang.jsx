import React, { useState, useEffect } from 'react';
import { submitTerimaPiutang, submitBayarUtang, submitMutasi, submitBayarKasbon, getSaldo } from '../api/keuanganApi';
import { formatRp, formatInputNumber, parseNumber, getLocalDate, getLocalTimestamp } from '../utils/formatters';

export default function KasPiutang() {
  const [activeTab, setActiveTab] = useState('piutang');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [saldo, setSaldo] = useState({ kas: 0, bank: 0 });
  const [showHelp, setShowHelp] = useState(false);
  const [helpContext, setHelpContext] = useState('piutang');

  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [karyawan, setKaryawan] = useState([]);

  // FORMS
  const [piutangForm, setPiutangForm] = useState({ customer_id: '', nominal: '', sumber: 'Kas Tunai', tgl: getLocalDate(), keterangan: 'Pelunasan Piutang' });
  const [utangForm, setUtangForm] = useState({ supplier_id: '', nominal: '', sumber: 'BCA', tgl: getLocalDate(), keterangan: 'Pelunasan Utang Material' });
  const [mutasiForm, setMutasiForm] = useState({ jenis: 'Setor Tunai', nominal: '', tgl: getLocalDate() });
  const [kasbonForm, setKasbonForm] = useState({ karyawan_id: '', nominal: '', sumber: 'Kas Tunai', tgl: getLocalDate() });

  const fetchData = async () => {
    try {
      const [resMitra, resKary, resSaldo] = await Promise.all([
        fetch('/api/master/mitra').then(r => r.json()),
        fetch('/api/master/karyawan').then(r => r.json()),
        getSaldo()
      ]);
      setCustomers(resMitra.filter(m => m.kategori === 'Customer / Klien' && m.saldo_piutang > 0));
      setSuppliers(resMitra.filter(m => m.kategori === 'Supplier Bahan Baku' && m.saldo_utang > 0));
      setKaryawan(resKary.filter(k => k.saldo_kasbon > 0));
      if (resSaldo.success) setSaldo(resSaldo.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Polling saldo tiap 10 detik
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (type) => {
    setLoading(true);
    let res;
    try {
        if (type === 'piutang') {
            const finalTgl = piutangForm.tgl === getLocalDate() ? getLocalTimestamp() : piutangForm.tgl;
            res = await submitTerimaPiutang({ ...piutangForm, nominal: Number(piutangForm.nominal), tgl: finalTgl });
        }
        if (type === 'utang') {
            const finalTgl = utangForm.tgl === getLocalDate() ? getLocalTimestamp() : utangForm.tgl;
            res = await submitBayarUtang({ ...utangForm, nominal: Number(utangForm.nominal), tgl: finalTgl });
        }
        if (type === 'mutasi') {
            const finalTgl = mutasiForm.tgl === getLocalDate() ? getLocalTimestamp() : mutasiForm.tgl;
            res = await submitMutasi({ ...mutasiForm, nominal: Number(mutasiForm.nominal), tgl: finalTgl });
        }
        if (type === 'kasbon') {
            const finalTgl = kasbonForm.tgl === getLocalDate() ? getLocalTimestamp() : kasbonForm.tgl;
            res = await submitBayarKasbon({ ...kasbonForm, nominal: Number(kasbonForm.nominal), tgl: finalTgl });
        }

        if (res.success) {
            setMsg({ text: res.message, type: 'success' });
            fetchData();
            // Reset forms
            if (type === 'piutang') setPiutangForm({ ...piutangForm, customer_id: '', nominal: '' });
            if (type === 'utang') setUtangForm({ ...utangForm, supplier_id: '', nominal: '' });
            if (type === 'mutasi') setMutasiForm({ ...mutasiForm, nominal: '' });
            if (type === 'kasbon') setKasbonForm({ ...kasbonForm, karyawan_id: '', nominal: '' });
        } else {
            setMsg({ text: res.message, type: 'error' });
        }
    } catch (err) { setMsg({ text: err.message, type: 'error' }); }
    setLoading(false);
  };

  const renderSourceRadio = (val, setVal) => (
    <div className="flex gap-4 p-1 bg-slate-100 rounded-xl w-fit">
        {['Kas Tunai', 'BCA'].map(s => (
            <button key={s} onClick={() => setVal(s)} className={`px-6 py-2 rounded-lg text-xs font-black transition-all ${val === s ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>
                {s === 'BCA' ? 'BCA' : s.toUpperCase()}
            </button>
        ))}
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#064E3B] flex items-center justify-center text-white shadow-lg">
                    <span className="material-symbols-rounded text-3xl">account_balance_wallet</span>
                </div>
                <div>
                    <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter font-outfit">Manajemen Kas & Piutang</h1>
                    <p className="text-slate-500 text-sm font-medium">Pusat kontrol arus kas, pelunasan utang, dan piutang usaha.</p>
                </div>
            </div>

            <div className="flex gap-4">
                <div className="bg-emerald-50 px-5 py-3 rounded-2xl border border-emerald-100 flex flex-col items-center min-w-[120px]">
                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Saldo Kas Tunai
                    </p>
                    <p className="text-lg font-black text-emerald-800">{formatRp(saldo.kas)}</p>
                </div>
                <div className="bg-blue-50 px-5 py-3 rounded-2xl border border-blue-100 flex flex-col items-center min-w-[120px]">
                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                        Saldo BCA
                    </p>
                    <p className="text-lg font-black text-blue-800">{formatRp(saldo.bank)}</p>
                </div>
            </div>
        </div>

        {msg.text && (
            <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 ${msg.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
                <span className="material-symbols-rounded">{msg.type === 'error' ? 'error' : 'check_circle'}</span>
                <span className="font-bold">{msg.text}</span>
            </div>
        )}

        <div className="flex space-x-2 p-1 bg-slate-100 rounded-2xl w-fit overflow-hidden">
            {[
                { id: 'piutang', label: 'Terima Piutang', icon: 'call_received' },
                { id: 'utang', label: 'Bayar Utang', icon: 'call_made' },
                { id: 'mutasi', label: 'Mutasi Kas/Bank', icon: 'compare_arrows' },
                { id: 'kasbon', label: 'Bayar Kasbon', icon: 'person' }
            ].map(t => (
                <button key={t.id} onClick={() => { setActiveTab(t.id); setMsg({text:'', type:''}); }} className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === t.id ? 'bg-[#10B981] text-white shadow-lg' : 'text-slate-500 hover:bg-slate-200'}`}>
                    <span className="material-symbols-rounded text-lg">{t.icon}</span>
                    {t.label}
                </button>
            ))}
        </div>

        <div className="bg-white p-10 rounded-[2.5rem] shadow-[0_15px_40px_rgba(0,0,0,0.03)] border border-slate-100 min-h-[400px]">
            
            {activeTab === 'piutang' && (
                <div className="max-w-xl space-y-8 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-black text-[#064E3B]">Penerimaan Piutang Customer</h2>
                            <button 
                                onClick={() => { setHelpContext('piutang'); setShowHelp(true); }}
                                className="w-6 h-6 rounded-full flex items-center justify-center bg-emerald-500/10 backdrop-blur-md text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm border border-emerald-100"
                            >
                                <span className="material-symbols-rounded text-[14px]">info</span>
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => window.open(`/api/reports-mitra/cetak-kartu?type=piutang&mitra_id=${piutangForm.customer_id}`, '_blank')}
                                disabled={!piutangForm.customer_id}
                                className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-[10px] hover:bg-emerald-100 disabled:opacity-50 transition-all border border-emerald-200"
                                title="Cetak Kartu Individu"
                            >
                                <span className="material-symbols-rounded text-sm">print</span> CETAK KARTU
                            </button>
                            <button 
                                onClick={() => window.open(`/api/reports-mitra/cetak-semua?type=piutang`, '_blank')}
                                className="flex items-center gap-2 px-3 py-2 bg-slate-50 text-slate-600 rounded-xl font-bold text-[10px] hover:bg-slate-100 transition-all border border-slate-200"
                            >
                                <span className="material-symbols-rounded text-sm">summarize</span> CETAK SEMUA KARTU PIUTANG
                            </button>
                        </div>
                    </div>
                    <div className="grid gap-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Pilih Customer</label>
                            <select className="w-full p-4 border rounded-2xl font-bold text-slate-700 bg-slate-50/50" value={piutangForm.customer_id} onChange={e => setPiutangForm({...piutangForm, customer_id: e.target.value})}>
                                <option value="">-- Pilih Mitra --</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.nama_mitra} (Sisa: {formatRp(c.saldo_piutang)})</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Nominal Pelunasan</label>
                                <input type="text" className="w-full p-4 border rounded-2xl font-black text-xl text-emerald-600 bg-emerald-50/20" value={formatInputNumber(piutangForm.nominal)} onChange={e => setPiutangForm({...piutangForm, nominal: parseNumber(e.target.value)})} placeholder="Rp 0" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Tanggal Terima</label>
                                <input type="date" className="w-full p-4 border rounded-2xl font-bold text-slate-700" value={piutangForm.tgl} onChange={e => setPiutangForm({...piutangForm, tgl: e.target.value})} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Diterima Melalui</label>
                            {renderSourceRadio(piutangForm.sumber, (v) => setPiutangForm({...piutangForm, sumber: v}))}
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Keterangan Tambahan</label>
                            <input type="text" className="w-full p-4 border rounded-2xl font-medium" value={piutangForm.keterangan} onChange={e => setPiutangForm({...piutangForm, keterangan: e.target.value})} />
                        </div>
                        <button onClick={() => handleSubmit('piutang')} disabled={loading} className="w-full bg-[#10B981] text-white p-5 rounded-2xl font-black text-lg shadow-xl hover:bg-[#064E3B] hover:scale-[1.02] transition-all">
                            {loading ? 'MEMPROSES...' : 'POSTING PENERIMAAN'}
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'utang' && (
                <div className="max-w-xl space-y-8 animate-in fade-in slide-in-from-bottom-2 text-slate-800">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-black text-[#064E3B]">Pelunasan Utang ke Supplier</h2>
                            <button 
                                onClick={() => { setHelpContext('utang'); setShowHelp(true); }}
                                className="w-6 h-6 rounded-full flex items-center justify-center bg-red-500/10 backdrop-blur-md text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm border border-red-100"
                            >
                                <span className="material-symbols-rounded text-[14px]">info</span>
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => window.open(`/api/reports-mitra/cetak-kartu?type=hutang&mitra_id=${utangForm.supplier_id}`, '_blank')}
                                disabled={!utangForm.supplier_id}
                                className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-700 rounded-xl font-bold text-[10px] hover:bg-red-100 disabled:opacity-50 transition-all border border-red-200"
                                title="Cetak Kartu Individu"
                            >
                                <span className="material-symbols-rounded text-sm">print</span> CETAK KARTU
                            </button>
                            <button 
                                onClick={() => window.open(`/api/reports-mitra/cetak-semua?type=hutang`, '_blank')}
                                className="flex items-center gap-2 px-3 py-2 bg-slate-50 text-slate-600 rounded-xl font-bold text-[10px] hover:bg-slate-100 transition-all border border-slate-200"
                            >
                                <span className="material-symbols-rounded text-sm">summarize</span> CETAK SEMUA KARTU HUTANG
                            </button>
                        </div>
                    </div>
                    <div className="grid gap-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Pilih Supplier</label>
                            <select className="w-full p-4 border rounded-2xl font-bold text-slate-700 bg-slate-50/50" value={utangForm.supplier_id} onChange={e => setUtangForm({...utangForm, supplier_id: e.target.value})}>
                                <option value="">-- Pilih Mitra --</option>
                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.nama_mitra} (Utang: {formatRp(s.saldo_utang)})</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Nominal Bayar</label>
                                <input type="text" className="w-full p-4 border rounded-2xl font-black text-xl text-red-600 bg-red-50/20" value={formatInputNumber(utangForm.nominal)} onChange={e => setUtangForm({...utangForm, nominal: parseNumber(e.target.value)})} placeholder="Rp 0" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Tanggal Bayar</label>
                                <input type="date" className="w-full p-4 border rounded-2xl font-bold" value={utangForm.tgl} onChange={e => setUtangForm({...utangForm, tgl: e.target.value})} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Sumber Dana Pelunasan</label>
                            {renderSourceRadio(utangForm.sumber, (v) => setUtangForm({...utangForm, sumber: v}))}
                        </div>
                        <button onClick={() => handleSubmit('utang')} disabled={loading} className="w-full bg-[#10B981] text-white p-5 rounded-2xl font-black text-lg shadow-xl hover:bg-[#064E3B] hover:scale-[1.02] transition-all">
                            {loading ? 'MEMPROSES...' : 'POSTING PEMBAYARAN UTANG'}
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'mutasi' && (
                <div className="max-w-xl space-y-8 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-black text-[#064E3B]">Mutasi Antar Kas & Bank</h2>
                        <button 
                            onClick={() => { setHelpContext('mutasi'); setShowHelp(true); }}
                            className="w-6 h-6 rounded-full flex items-center justify-center bg-slate-500/10 backdrop-blur-md text-slate-500 hover:bg-slate-700 hover:text-white transition-all shadow-sm border border-slate-200"
                        >
                            <span className="material-symbols-rounded text-[14px]">info</span>
                        </button>
                    </div>
                    <div className="grid gap-8">
                        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                            {['Setor Tunai', 'Tarik Tunai'].map(j => (
                                <button key={j} onClick={() => setMutasiForm({...mutasiForm, jenis: j})} className={`flex-1 py-4 text-xs font-black rounded-xl transition-all ${mutasiForm.jenis === j ? 'bg-white shadow-md text-emerald-700' : 'text-slate-400'}`}>
                                    {j.toUpperCase()}
                                </button>
                            ))}
                        </div>
                        <div className="p-8 border-2 border-dashed border-slate-100 rounded-[2rem] flex items-center justify-center gap-6">
                            <div className="text-center group">
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 transition-all ${mutasiForm.jenis === 'Setor Tunai' ? 'bg-emerald-100 text-emerald-600 scale-110' : 'bg-slate-100 text-slate-400'}`}>
                                    <span className="material-symbols-rounded">payments</span>
                                </div>
                                <span className="text-[10px] font-bold">KAS TUNAI</span>
                            </div>
                            <span className="material-symbols-rounded text-slate-300 text-4xl animate-pulse">keyboard_double_arrow_right</span>
                            <div className="text-center group">
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 transition-all ${mutasiForm.jenis === 'Tarik Tunai' ? 'bg-blue-100 text-blue-600 scale-110' : 'bg-slate-100 text-slate-400'}`}>
                                    <span className="material-symbols-rounded">account_balance</span>
                                </div>
                                <span className="text-[10px] font-bold uppercase">BCA</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Nominal Mutasi</label>
                                <input type="text" className="w-full p-4 border rounded-2xl font-black text-xl bg-slate-50" value={formatInputNumber(mutasiForm.nominal)} onChange={e => setMutasiForm({...mutasiForm, nominal: parseNumber(e.target.value)})} placeholder="Rp 0" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Tanggal</label>
                                <input type="date" className="w-full p-4 border rounded-2xl font-bold" value={mutasiForm.tgl} onChange={e => setMutasiForm({...mutasiForm, tgl: e.target.value})} />
                            </div>
                        </div>
                        <button onClick={() => handleSubmit('mutasi')} disabled={loading} className="w-full bg-[#064E3B] text-white p-5 rounded-2xl font-black text-lg shadow-xl hover:bg-black hover:scale-[1.02] transition-all">
                            {loading ? 'MEMPROSES...' : 'EKSEKUSI MUTASI DANA'}
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'kasbon' && (
                <div className="max-w-xl space-y-8 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-black text-[#064E3B]">Cicilan Pembayaran Kasbon</h2>
                            <button 
                                onClick={() => { setHelpContext('kasbon'); setShowHelp(true); }}
                                className="w-6 h-6 rounded-full flex items-center justify-center bg-blue-500/10 backdrop-blur-md text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-blue-100"
                            >
                                <span className="material-symbols-rounded text-[14px]">info</span>
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => window.open(`/api/reports-mitra/cetak-kartu?type=kasbon&mitra_id=${kasbonForm.karyawan_id}`, '_blank')}
                                disabled={!kasbonForm.karyawan_id}
                                className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-xl font-bold text-[10px] hover:bg-blue-100 disabled:opacity-50 transition-all border border-blue-200"
                                title="Cetak Kartu Individu"
                            >
                                <span className="material-symbols-rounded text-sm">print</span> CETAK KARTU
                            </button>
                            <button 
                                onClick={() => window.open(`/api/reports-mitra/cetak-semua?type=kasbon`, '_blank')}
                                className="flex items-center gap-2 px-3 py-2 bg-slate-50 text-slate-600 rounded-xl font-bold text-[10px] hover:bg-slate-100 transition-all border border-slate-200"
                            >
                                <span className="material-symbols-rounded text-sm">summarize</span> CETAK SEMUA KARTU KASBON
                            </button>
                        </div>
                    </div>
                    <div className="grid gap-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Pilih Karyawan</label>
                            <select className="w-full p-4 border rounded-2xl font-bold text-slate-700" value={kasbonForm.karyawan_id} onChange={e => setKasbonForm({...kasbonForm, karyawan_id: e.target.value})}>
                                <option value="">-- Nama Karyawan --</option>
                                {karyawan.map(k => <option key={k.id} value={k.id}>{k.nama_karyawan} (Sisa Bon: {formatRp(k.saldo_kasbon)})</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Nominal Cicilan</label>
                                <input type="text" className="w-full p-4 border rounded-2xl font-black text-xl text-emerald-600 bg-emerald-50/20" value={formatInputNumber(kasbonForm.nominal)} onChange={e => setKasbonForm({...kasbonForm, nominal: parseNumber(e.target.value)})} placeholder="Rp 0" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Tanggal Cicilan</label>
                                <input type="date" className="w-full p-4 border rounded-2xl font-bold" value={kasbonForm.tgl} onChange={e => setKasbonForm({...kasbonForm, tgl: e.target.value})} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Setoran Melalui</label>
                            {renderSourceRadio(kasbonForm.sumber, (v) => setKasbonForm({...kasbonForm, sumber: v}))}
                        </div>
                        <button onClick={() => handleSubmit('kasbon')} disabled={loading} className="w-full bg-[#10B981] text-white p-5 rounded-2xl font-black text-lg shadow-xl hover:bg-[#064E3B] hover:scale-[1.02] transition-all">
                            {loading ? 'MEMPROSES...' : 'POSTING CICILAN KASBON'}
                        </button>
                    </div>
                </div>
            )}
        </div>

        {/* ── HELP / TUTORIAL MODAL (DYNAMIC CONTENT) ────────────────── */}
        {showHelp && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 slide-in-from-bottom-8 duration-300">
                    {/* Header Help */}
                    <div className={`p-8 text-white flex items-center justify-between bg-gradient-to-r ${
                        helpContext === 'piutang' ? 'from-emerald-700 to-emerald-500' : 
                        helpContext === 'utang' ? 'from-rose-700 to-rose-500' : 
                        helpContext === 'mutasi' ? 'from-slate-700 to-slate-500' :
                        'from-blue-700 to-blue-500'
                    }`}>
                        <div className="flex items-center gap-6">
                            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-inner">
                                <span className="material-symbols-rounded text-2xl">
                                    {helpContext === 'piutang' ? 'call_received' : helpContext === 'utang' ? 'call_made' : helpContext === 'mutasi' ? 'compare_arrows' : 'person'}
                                </span>
                            </div>
                            <div>
                                <h2 className="text-xl font-black uppercase tracking-tighter">
                                    PANDUAN {helpContext === 'piutang' ? 'TERIMA PIUTANG' : helpContext === 'utang' ? 'BAYAR UTANG' : helpContext === 'mutasi' ? 'MUTASI KAS/BANK' : 'PELUNASAN KASBON'}
                                </h2>
                                <p className="text-white/70 text-xs font-medium italic">Standard Operating Procedure - Raziq Garmen Finance</p>
                            </div>
                        </div>
                        <button onClick={() => setShowHelp(false)} className="w-10 h-10 rounded-xl bg-black/10 hover:bg-black/20 flex items-center justify-center transition-all">
                            <span className="material-symbols-rounded">close</span>
                        </button>
                    </div>

                    {/* Content Help (Scrollable) */}
                    <div className="p-10 overflow-y-auto space-y-8 font-outfit text-slate-700">
                        
                        {helpContext === 'piutang' && (
                            <div className="space-y-6">
                                <section className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100 space-y-2">
                                    <h3 className="font-black text-emerald-800 uppercase text-sm tracking-widest">Apa itu Terima Piutang?</h3>
                                    <p className="text-sm leading-relaxed">Mencatat uang masuk dari customer yang membayar tagihan nota <b>Tempo</b>. Transaksi ini akan mengurangi saldo piutang customer di laporan Kartu Piutang.</p>
                                </section>
                                <section className="space-y-3">
                                    <h3 className="font-black text-slate-800 uppercase text-sm tracking-widest pl-2">Aturan Akuntansi (Journal Impact)</h3>
                                    <ul className="text-xs space-y-2 font-medium">
                                        <li className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> [DEBIT] <b>Kas / Bank</b> bertambah (Aset lancar bertambah).</li>
                                        <li className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100"><span className="w-2 h-2 rounded-full bg-red-500"></span> [KREDIT] <b>Piutang Dagang</b> berkurang (Aset piutang berkurang).</li>
                                    </ul>
                                </section>
                            </div>
                        )}

                        {helpContext === 'utang' && (
                            <div className="space-y-6">
                                <section className="bg-rose-50/50 p-6 rounded-2xl border border-rose-100 space-y-2">
                                    <h3 className="font-black text-rose-800 uppercase text-sm tracking-widest">Apa itu Bayar Utang?</h3>
                                    <p className="text-sm leading-relaxed">Mencatat pengeluaran uang perusahaan untuk melunasi kewajiban belanja bahan baku/material ke <b>Supplier</b>.</p>
                                </section>
                                <section className="space-y-3">
                                    <h3 className="font-black text-slate-800 uppercase text-sm tracking-widest pl-2">Aturan Akuntansi (Journal Impact)</h3>
                                    <ul className="text-xs space-y-2 font-medium">
                                        <li className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> [DEBIT] <b>Utang Usaha</b> berkurang (Kewajiban berkurang).</li>
                                        <li className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100"><span className="w-2 h-2 rounded-full bg-red-500"></span> [KREDIT] <b>Kas / Bank</b> berkurang (Aset kas berkurang).</li>
                                    </ul>
                                </section>
                            </div>
                        )}

                        {helpContext === 'mutasi' && (
                            <div className="space-y-6">
                                <section className="bg-slate-100 p-6 rounded-2xl border border-slate-200 space-y-2">
                                    <h3 className="font-black text-slate-800 uppercase text-sm tracking-widest">Apa itu Mutasi Kas/Bank?</h3>
                                    <p className="text-sm leading-relaxed">Memindahkan dana antar akun internal perusahaan. <b>Setor Tunai</b> memindahkan dari Kas ke Bank. <b>Tarik Tunai</b> memindahkan dari Bank ke Kas.</p>
                                </section>
                                <section className="bg-amber-50 p-5 rounded-2xl border border-amber-200">
                                    <p className="text-xs font-black text-amber-800 mb-1 italic">Catatan Penting:</p>
                                    <p className="text-[11px] text-amber-700 leading-relaxed font-medium">Mutasi tidak mempengaruhi Laba Rugi (Pendapatan/Biaya). Ini hanya perpindahan saldo antar akun Aset (Neraca).</p>
                                </section>
                            </div>
                        )}

                        {helpContext === 'kasbon' && (
                            <div className="space-y-6">
                                <section className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 space-y-2">
                                    <h3 className="font-black text-blue-800 uppercase text-sm tracking-widest">Apa itu Bayar Kasbon?</h3>
                                    <p className="text-sm leading-relaxed">Mencatat pengembalian uang (cicilan) dari karyawan yang memiliki pinjaman perusahaan. Ini akan mengurangi beban utang karyawan di Kartu Kasbon.</p>
                                </section>
                                <section className="bg-slate-900 rounded-[2rem] p-6 text-white text-center">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">Integritas Keuangan</p>
                                    <p className="text-xs italic text-slate-300">Setiap transaksi di modul ini diaudit berdasarkan prinsip akuntansi berpasangan (Double-Entry Bookkeeping) sesuai standar PSAK.</p>
                                </section>
                            </div>
                        )}

                        <div className="pt-6 border-t border-slate-100">
                            <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl">
                                <span className="material-symbols-rounded text-slate-400">menu_book</span>
                                <p className="text-[10px] text-slate-500 font-medium">
                                    <b>Sumber Aturan:</b> Standar Akuntansi Keuangan (SAK) Indonesia & Algoritma Jurnal Otomatis Raziq Garmen Backend v2.
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
