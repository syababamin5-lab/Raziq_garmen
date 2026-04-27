import React, { useState, useEffect } from 'react';
import { submitTerimaPiutang, submitBayarUtang, submitMutasi, submitBayarKasbon, getSaldo } from '../api/keuanganApi';
import { formatRp, formatInputNumber, parseNumber } from '../utils/formatters';

export default function KasPiutang() {
  const [activeTab, setActiveTab] = useState('piutang');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [saldo, setSaldo] = useState({ kas: 0, bank: 0 });

  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [karyawan, setKaryawan] = useState([]);

  // FORMS
  const [piutangForm, setPiutangForm] = useState({ customer_id: '', nominal: '', sumber: 'Kas Tunai', tgl: new Date().toISOString().split('T')[0], keterangan: 'Pelunasan Piutang' });
  const [utangForm, setUtangForm] = useState({ supplier_id: '', nominal: '', sumber: 'Bank', tgl: new Date().toISOString().split('T')[0], keterangan: 'Pelunasan Utang Material' });
  const [mutasiForm, setMutasiForm] = useState({ jenis: 'Setor Tunai', nominal: '', tgl: new Date().toISOString().split('T')[0] });
  const [kasbonForm, setKasbonForm] = useState({ karyawan_id: '', nominal: '', sumber: 'Kas Tunai', tgl: new Date().toISOString().split('T')[0] });

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
  }, []);

  const handleSubmit = async (type) => {
    setLoading(true);
    let res;
    try {
        if (type === 'piutang') res = await submitTerimaPiutang({ ...piutangForm, nominal: Number(piutangForm.nominal) });
        if (type === 'utang') res = await submitBayarUtang({ ...utangForm, nominal: Number(utangForm.nominal) });
        if (type === 'mutasi') res = await submitMutasi({ ...mutasiForm, nominal: Number(mutasiForm.nominal) });
        if (type === 'kasbon') res = await submitBayarKasbon({ ...kasbonForm, nominal: Number(kasbonForm.nominal) });

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
        {['Kas Tunai', 'Bank'].map(s => (
            <button key={s} onClick={() => setVal(s)} className={`px-6 py-2 rounded-lg text-xs font-black transition-all ${val === s ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>
                {s.toUpperCase()}
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
                <div className="bg-emerald-50 px-5 py-3 rounded-2xl border border-emerald-100">
                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Saldo Kas Tunai</p>
                    <p className="text-lg font-black text-emerald-800">{formatRp(saldo.kas)}</p>
                </div>
                <div className="bg-blue-50 px-5 py-3 rounded-2xl border border-blue-100">
                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Saldo Bank</p>
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
                    <h2 className="text-xl font-black text-[#064E3B]">Penerimaan Piutang Customer</h2>
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
                    <h2 className="text-xl font-black text-[#064E3B]">Pelunasan Utang ke Supplier</h2>
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
                    <h2 className="text-xl font-black text-[#064E3B]">Mutasi Antar Kas & Bank</h2>
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
                                <span className="text-[10px] font-bold">REKENING BANK</span>
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
                    <h2 className="text-xl font-black text-[#064E3B]">Cicilan Pembayaran Kasbon</h2>
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
    </div>
  );
}
