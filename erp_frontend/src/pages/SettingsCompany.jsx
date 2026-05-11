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
    logo_url: '',
    logo_base64: '',
    ttd_base64: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

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
        setIsEditing(false);
        window.dispatchEvent(new CustomEvent('update-company-config'));
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) { alert('Gagal memperbarui profil'); }
    setLoading(false);
  };

  const inputClass = (isTextArea = false) => `
    w-full border rounded-xl p-3 text-sm font-semibold transition-all outline-none
    ${isEditing 
      ? 'bg-white border-emerald-500/30 ring-4 ring-emerald-500/5 text-slate-800 shadow-sm' 
      : 'bg-slate-50/50 border-transparent text-slate-500 cursor-not-allowed'}
    ${isTextArea ? 'resize-none' : ''}
  `;

  const labelClass = "text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1.5 block ml-1";

  return (
    <div className="w-full max-w-6xl mx-auto px-4 md:px-6 space-y-6 pb-20 font-outfit">
      {/* LUXURY HEADER */}
      <div className="bg-slate-900 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-600/5 rounded-full translate-y-1/2 -translate-x-1/4 blur-2xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-700 p-[2px] shadow-xl group relative">
              <div className="w-full h-full bg-slate-900 rounded-[calc(1rem-2px)] flex items-center justify-center overflow-hidden">
                {config.logo_base64 || config.logo_url ? (
                  <img src={config.logo_base64 || config.logo_url} className="w-full h-full object-contain p-2" alt="Logo" />
                ) : <span className="material-symbols-rounded text-3xl text-emerald-500">corporate_fare</span>}
              </div>
              {isEditing && (
                <label className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center text-white text-[8px] font-bold uppercase cursor-pointer rounded-2xl">
                  <span className="material-symbols-rounded text-lg mb-1">photo_camera</span>
                  Upload
                  <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const formData = new FormData();
                    formData.append('file', file);
                    try {
                      const { data } = await api.post('/company-config/upload-logo', formData);
                      if (data.status === 'success') {
                        setConfig({...config, logo_base64: data.url});
                      }
                    } catch (err) { alert('Gagal upload logo'); }
                  }} />
                </label>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight uppercase leading-none mb-1">Profil Perusahaan</h1>
              <div className="flex items-center gap-2">
                <span className="h-[2px] w-8 bg-emerald-500"></span>
                <p className="text-slate-400 text-xs font-medium tracking-wide uppercase">Identity & Corporate Branding</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isEditing ? (
              <button 
                type="button"
                onClick={() => setIsEditing(true)}
                className="group flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-white hover:text-emerald-900 transition-all shadow-lg active:scale-95"
              >
                <span className="material-symbols-rounded text-lg group-hover:rotate-12 transition-transform">edit_square</span>
                Ubah Data
              </button>
            ) : (
              <button 
                type="button"
                onClick={() => { setIsEditing(false); fetchConfig(); }}
                className="flex items-center gap-2 px-6 py-3 bg-slate-800 text-slate-300 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-95 border border-slate-700"
              >
                <span className="material-symbols-rounded text-lg">cancel</span>
                Batal
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MAIN FORM CONTENT */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* LEFT COLUMN: PRIMARY INFO */}
            <div className="p-8 space-y-8 border-r border-slate-50">
              {/* SECTION: BASIC INFO */}
              <div className="space-y-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shadow-md">
                    <span className="material-symbols-rounded text-emerald-500 text-lg">business</span>
                  </div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Informasi Utama</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className={labelClass}>Nama Perusahaan Resmi</label>
                    <input type="text" readOnly={!isEditing} className={inputClass()} value={config.nama_perusahaan} onChange={e => setConfig({...config, nama_perusahaan: e.target.value})} />
                  </div>
                  <div>
                    <label className={labelClass}>Kontak / WhatsApp</label>
                    <input type="text" readOnly={!isEditing} className={inputClass()} value={config.no_telp} onChange={e => setConfig({...config, no_telp: e.target.value})} />
                  </div>
                  <div>
                    <label className={labelClass}>Email Corporate</label>
                    <input type="text" readOnly={!isEditing} className={inputClass()} value={config.email} onChange={e => setConfig({...config, email: e.target.value})} />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClass}>Alamat Lengkap Kantor/Gudang</label>
                    <textarea rows="2" readOnly={!isEditing} className={inputClass(true)} value={config.alamat} onChange={e => setConfig({...config, alamat: e.target.value})}></textarea>
                  </div>
                </div>
              </div>

              {/* SECTION: MANAGEMENT */}
              <div className="space-y-5 pt-4 border-t border-slate-50">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shadow-md">
                    <span className="material-symbols-rounded text-emerald-500 text-lg">shield_person</span>
                  </div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Penanggung Jawab</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Nama Pimpinan</label>
                    <input type="text" readOnly={!isEditing} className={inputClass()} value={config.nama_pemilik} onChange={e => setConfig({...config, nama_pemilik: e.target.value})} />
                  </div>
                  <div>
                    <label className={labelClass}>Jabatan</label>
                    <input type="text" readOnly={!isEditing} className={inputClass()} value={config.jabatan_pemilik} onChange={e => setConfig({...config, jabatan_pemilik: e.target.value})} />
                  </div>
                </div>
              </div>

              {/* SECTION: BANK */}
              <div className="space-y-5 pt-4 border-t border-slate-50">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shadow-md">
                    <span className="material-symbols-rounded text-emerald-500 text-lg">payments</span>
                  </div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Informasi Keuangan</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>Bank</label>
                    <input type="text" readOnly={!isEditing} className={inputClass()} value={config.nama_bank || ''} onChange={e => setConfig({...config, nama_bank: e.target.value})} placeholder="BCA/Mandiri" />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClass}>No. Rekening</label>
                    <input type="text" readOnly={!isEditing} className={inputClass()} value={config.no_rekening || ''} onChange={e => setConfig({...config, no_rekening: e.target.value})} />
                  </div>
                  <div className="md:col-span-3">
                    <label className={labelClass}>Nama Pemilik Rekening</label>
                    <input type="text" readOnly={!isEditing} className={inputClass()} value={config.atas_nama_bank || ''} onChange={e => setConfig({...config, atas_nama_bank: e.target.value})} />
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: DOCUMENT CUSTOMIZATION */}
            <div className="bg-slate-50/50 p-8 space-y-8">
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shadow-md">
                    <span className="material-symbols-rounded text-emerald-500 text-lg">history_edu</span>
                  </div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Otoritas Tanda Tangan</h3>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {/* TTD BOXES - COMPACT VERSION */}
                  {[
                    { title: 'Invoice Penjualan', prefix: 'ttd_invoice', icon: 'description' },
                    { title: 'Purchase Order', prefix: 'ttd_po', icon: 'shopping_bag' },
                    { title: 'Laporan Utama', prefix: 'ttd_laporan', icon: 'analytics' },
                    { title: 'Admin Pembuat', prefix: 'ttd_admin', icon: 'edit_note' }
                  ].map((ttd) => (
                    <div key={ttd.prefix} className={`p-4 rounded-2xl border transition-all ${isEditing ? 'bg-white border-emerald-100 shadow-sm' : 'bg-slate-100/50 border-transparent'}`}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="material-symbols-rounded text-emerald-600 text-sm">{ttd.icon}</span>
                        <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{ttd.title}</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <input 
                          type="text" 
                          placeholder="Nama" 
                          readOnly={!isEditing} 
                          className="w-full bg-slate-50/80 border-none rounded-lg p-2 text-[11px] font-bold text-slate-700 outline-none placeholder:text-slate-300" 
                          value={config[`${ttd.prefix}_nama`] || ''} 
                          onChange={e => setConfig({...config, [`${ttd.prefix}_nama`]: e.target.value})} 
                        />
                        <input 
                          type="text" 
                          placeholder="Jabatan" 
                          readOnly={!isEditing} 
                          className="w-full bg-slate-50/80 border-none rounded-lg p-2 text-[11px] font-bold text-slate-700 outline-none placeholder:text-slate-300" 
                          value={config[`${ttd.prefix}_jabatan`] || ''} 
                          onChange={e => setConfig({...config, [`${ttd.prefix}_jabatan`]: e.target.value})} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* DIGITAL SIGNATURE */}
              <div className="pt-6 border-t border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <span className="material-symbols-rounded text-emerald-600">signature</span> Digital Specimen
                  </h3>
                  {isEditing && (config.ttd_base64 || config.ttd_url) && (
                    <button type="button" onClick={() => setConfig({...config, ttd_url: null, ttd_base64: null})} className="text-[10px] text-red-500 font-bold hover:underline">Hapus TTD</button>
                  )}
                </div>
                
                <div className={`w-full h-32 rounded-2xl border-2 border-dashed flex items-center justify-center relative overflow-hidden transition-all ${isEditing ? 'bg-white border-emerald-500 cursor-pointer shadow-inner' : 'bg-slate-200/50 border-slate-300'}`}>
                  {config.ttd_base64 || config.ttd_url ? (
                    <img src={config.ttd_base64 || config.ttd_url} alt="TTD" className="h-full object-contain p-2" />
                  ) : (
                    <div className="text-center">
                      <span className="material-symbols-rounded text-slate-300">stylus</span>
                      <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Belum Ada TTD</p>
                    </div>
                  )}
                  {isEditing && (
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append('file', file);
                      try {
                        const { data } = await api.post('/company-config/upload-ttd', formData);
                        if (data.status === 'success') {
                          setConfig({...config, ttd_base64: data.url});
                        }
                      } catch (err) { alert('Gagal upload TTD'); }
                    }} />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* FOOTER ACTION */}
          {isEditing && (
            <div className="p-6 bg-slate-900 flex items-center justify-between animate-in slide-in-from-bottom-full duration-300">
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest pl-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Perubahan belum disimpan
              </p>
              <div className="flex items-center gap-4">
                <button type="button" onClick={() => { setIsEditing(false); fetchConfig(); }} className="text-white text-xs font-bold uppercase tracking-widest px-6 py-3 hover:text-red-400 transition-colors">Batal</button>
                <button type="submit" disabled={loading} className="bg-emerald-500 text-white px-10 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-white hover:text-emerald-900 transition-all shadow-xl active:scale-95">
                  {loading ? 'Processing...' : 'Simpan Perubahan'}
                </button>
              </div>
            </div>
          )}

          {success && (
            <div className="p-4 bg-emerald-500 text-white text-center text-[10px] font-black uppercase tracking-[0.3em] animate-in fade-in zoom-in duration-500">
              Data Perusahaan Berhasil Disinkronisasi!
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
