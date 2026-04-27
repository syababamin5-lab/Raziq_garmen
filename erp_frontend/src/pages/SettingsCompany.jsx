import React, { useState, useEffect } from 'react';
import api from '../api/api';

export default function SettingsCompany() {
  const [config, setConfig] = useState({
    nama_perusahaan: '',
    alamat: '',
    no_telp: '',
    email: '',
    website: '',
    nama_pemilik: '',
    jabatan_pemilik: '',
    logo_url: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const fetchConfig = async () => {
    try {
      const { data } = await api.get('/company-config');
      setConfig(data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    try {
      const { data } = await api.post('/company-config', config);
      if (data.status === 'success') {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) { alert('Gagal memperbarui profil'); }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 flex items-center gap-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-full bg-emerald-500/5 -rotate-12 translate-x-10"></div>
        <div className="w-24 h-24 rounded-3xl bg-emerald-900 flex items-center justify-center text-white shadow-2xl">
          <span className="material-symbols-rounded text-5xl">business</span>
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tighter font-outfit uppercase">Profil Perusahaan</h1>
          <p className="text-slate-500 font-medium">Identitas Resmi & Informasi Kontak Garmen</p>
        </div>
      </div>

      <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Section: Data Umum */}
          <div>
            <h3 className="text-xs font-black text-emerald-600 uppercase tracking-[0.2em] mb-6 border-b pb-2">Informasi Utama</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-2 block">Nama Perusahaan</label>
                <input type="text" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none" value={config.nama_perusahaan} onChange={e => setConfig({...config, nama_perusahaan: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-2 block">No. Telepon / WA</label>
                <input type="text" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none" value={config.no_telp} onChange={e => setConfig({...config, no_telp: e.target.value})} />
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-2 block">Alamat Lengkap</label>
                <textarea rows="3" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none" value={config.alamat} onChange={e => setConfig({...config, alamat: e.target.value})}></textarea>
              </div>
            </div>
          </div>

          {/* Section: Penanggung Jawab */}
          <div>
            <h3 className="text-xs font-black text-emerald-600 uppercase tracking-[0.2em] mb-6 border-b pb-2">Pejabat Berwenang (Untuk Laporan/PDF)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-2 block">Nama Pimpinan / Pemilik</label>
                <input type="text" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none" value={config.nama_pemilik} onChange={e => setConfig({...config, nama_pemilik: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-2 block">Jabatan</label>
                <input type="text" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none" value={config.jabatan_pemilik} onChange={e => setConfig({...config, jabatan_pemilik: e.target.value})} />
              </div>
            </div>
          </div>

          {/* Section: Digital */}
          <div>
            <h3 className="text-xs font-black text-emerald-600 uppercase tracking-[0.2em] mb-6 border-b pb-2">Kontak Digital</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-2 block">Email Perusahaan</label>
                <input type="email" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none" value={config.email} onChange={e => setConfig({...config, email: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-2 block">Website</label>
                <input type="text" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none" value={config.website} onChange={e => setConfig({...config, website: e.target.value})} />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-6 border-t">
            {success && (
              <div className="flex items-center gap-2 text-emerald-600 font-black animate-bounce">
                <span className="material-symbols-rounded">check_circle</span>
                PROFIL BERHASIL DIPERBARUI!
              </div>
            )}
            <div />
            <button type="submit" disabled={loading} className="bg-[#064E3B] text-white px-12 py-4 rounded-2xl font-black tracking-widest text-sm hover:bg-black transition-all shadow-2xl shadow-emerald-900/20 disabled:opacity-50">
              {loading ? 'MENYIMPAN...' : 'SIMPAN PERUBAHAN'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
