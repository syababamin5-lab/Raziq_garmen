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
    w-full border-none rounded-2xl p-4 font-bold transition-all outline-none
    ${isEditing 
      ? 'bg-white ring-2 ring-emerald-500/20 text-slate-800 shadow-inner' 
      : 'bg-slate-50/50 text-slate-500 cursor-not-allowed'}
    ${isTextArea ? 'resize-none' : ''}
  `;

  return (
    <div className="w-full px-4 md:px-10 space-y-8 pb-20">
      {/* Header */}
      <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-full bg-emerald-500/5 -rotate-12 translate-x-10"></div>
        
        <div className="flex items-center gap-8">
          <div className="w-24 h-24 rounded-3xl bg-emerald-900 flex items-center justify-center text-white shadow-2xl overflow-hidden relative group">
            {config.logo_base64 || config.logo_url ? (
              <img src={config.logo_base64 || config.logo_url} className="w-full h-full object-contain p-2" alt="Logo" />
            ) : <span className="material-symbols-rounded text-5xl">business</span>}
            
            {isEditing && (
              <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[8px] font-bold uppercase cursor-pointer">
                <span className="material-symbols-rounded text-xl mb-1">upload</span>
                Ganti Logo
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
            <h1 className="text-3xl font-black text-slate-800 tracking-tighter font-outfit uppercase">Profil Perusahaan</h1>
            <p className="text-slate-500 font-medium">Identitas Resmi & Informasi Kontak Garmen</p>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          {!isEditing ? (
            <button 
              type="button"
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-3 px-6 py-3 bg-emerald-100 text-emerald-700 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all shadow-sm active:scale-95"
            >
              <span className="material-symbols-rounded text-lg">edit_note</span>
              Edit Profil
            </button>
          ) : (
            <button 
              type="button"
              onClick={() => { setIsEditing(false); fetchConfig(); }}
              className="flex items-center gap-3 px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all shadow-sm active:scale-95"
            >
              <span className="material-symbols-rounded text-lg">close</span>
              Batal
            </button>
          )}
        </div>
      </div>

      <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Section: Data Umum */}
          <div className={`p-8 rounded-[2.5rem] transition-all duration-500 ${isEditing ? 'bg-emerald-50/30' : 'bg-slate-50/20'}`}>
            <h3 className="text-xs font-black text-emerald-600 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                <span className="material-symbols-rounded text-[18px]">info</span>
              </span>
              Informasi Utama
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-2 block">Nama Perusahaan</label>
                <input type="text" readOnly={!isEditing} className={inputClass()} value={config.nama_perusahaan} onChange={e => setConfig({...config, nama_perusahaan: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-2 block">No. Telepon / WA</label>
                <input type="text" readOnly={!isEditing} className={inputClass()} value={config.no_telp} onChange={e => setConfig({...config, no_telp: e.target.value})} />
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-2 block">Alamat Lengkap</label>
                <textarea rows="3" readOnly={!isEditing} className={inputClass(true)} value={config.alamat} onChange={e => setConfig({...config, alamat: e.target.value})}></textarea>
              </div>
            </div>
          </div>

          {/* Section: Penanggung Jawab */}
          <div className="p-8">
            <h3 className="text-xs font-black text-emerald-600 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                <span className="material-symbols-rounded text-[18px]">verified_user</span>
              </span>
              Pejabat Berwenang
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-2 block">Nama Pimpinan / Pemilik</label>
                <input type="text" readOnly={!isEditing} className={inputClass()} value={config.nama_pemilik} onChange={e => setConfig({...config, nama_pemilik: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-2 block">Jabatan</label>
                <input type="text" readOnly={!isEditing} className={inputClass()} value={config.jabatan_pemilik} onChange={e => setConfig({...config, jabatan_pemilik: e.target.value})} />
              </div>
            </div>
          </div>

          {/* Section: Rekening Bank */}
          <div className={`p-8 rounded-[2.5rem] transition-all duration-500 ${isEditing ? 'bg-blue-50/30' : 'bg-slate-50/20'}`}>
            <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                <span className="material-symbols-rounded text-[18px]">account_balance</span>
              </span>
              Informasi Rekening Bank
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-2 block">Nama Bank</label>
                <input type="text" readOnly={!isEditing} className={inputClass()} value={config.nama_bank || ''} onChange={e => setConfig({...config, nama_bank: e.target.value})} placeholder="Contoh: BCA" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-2 block">Nomor Rekening</label>
                <input type="text" readOnly={!isEditing} className={inputClass()} value={config.no_rekening || ''} onChange={e => setConfig({...config, no_rekening: e.target.value})} placeholder="000-000-0000" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-2 block">Atas Nama (A/N)</label>
                <input type="text" readOnly={!isEditing} className={inputClass()} value={config.atas_nama_bank || ''} onChange={e => setConfig({...config, atas_nama_bank: e.target.value})} placeholder="Contoh: PT RAZIQ GARMENT" />
              </div>
            </div>
          </div>

          {/* Section: Pengaturan TTD Khusus (No-Code) */}
          <div className="p-8">
            <h3 className="text-xs font-black text-slate-600 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                <span className="material-symbols-rounded text-[18px]">pen_size</span>
              </span>
              Kustomisasi Penanda Tangan
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-10">
              {/* TTD Invoice */}
              <div className={`p-6 rounded-3xl space-y-6 transition-all ${isEditing ? 'bg-slate-50 border-2 border-emerald-500/10' : 'bg-slate-50/50'}`}>
                <h4 className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 tracking-widest">
                  <span className="material-symbols-rounded text-sm">receipt_long</span> TANDA TANGAN INVOICE
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Nama</label>
                    <input type="text" readOnly={!isEditing} className={`w-full p-3 text-xs font-bold rounded-xl outline-none border transition-all ${isEditing ? 'bg-white border-emerald-100 text-slate-700 shadow-sm' : 'bg-transparent border-transparent text-slate-500'}`} value={config.ttd_invoice_nama || ''} onChange={e => setConfig({...config, ttd_invoice_nama: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Jabatan</label>
                    <input type="text" readOnly={!isEditing} className={`w-full p-3 text-xs font-bold rounded-xl outline-none border transition-all ${isEditing ? 'bg-white border-emerald-100 text-slate-700 shadow-sm' : 'bg-transparent border-transparent text-slate-500'}`} value={config.ttd_invoice_jabatan || ''} onChange={e => setConfig({...config, ttd_invoice_jabatan: e.target.value})} />
                  </div>
                </div>
              </div>

              {/* TTD PO */}
              <div className={`p-6 rounded-3xl space-y-6 transition-all ${isEditing ? 'bg-slate-50 border-2 border-emerald-500/10' : 'bg-slate-50/50'}`}>
                <h4 className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 tracking-widest">
                  <span className="material-symbols-rounded text-sm">shopping_cart</span> TANDA TANGAN PURCHASE ORDER
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Nama</label>
                    <input type="text" readOnly={!isEditing} className={`w-full p-3 text-xs font-bold rounded-xl outline-none border transition-all ${isEditing ? 'bg-white border-emerald-100 text-slate-700 shadow-sm' : 'bg-transparent border-transparent text-slate-500'}`} value={config.ttd_po_nama || ''} onChange={e => setConfig({...config, ttd_po_nama: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Jabatan</label>
                    <input type="text" readOnly={!isEditing} className={`w-full p-3 text-xs font-bold rounded-xl outline-none border transition-all ${isEditing ? 'bg-white border-emerald-100 text-slate-700 shadow-sm' : 'bg-transparent border-transparent text-slate-500'}`} value={config.ttd_po_jabatan || ''} onChange={e => setConfig({...config, ttd_po_jabatan: e.target.value})} />
                  </div>
                </div>
              </div>

              {/* TTD Laporan (Pimpinan) */}
              <div className={`p-6 rounded-3xl space-y-6 transition-all ${isEditing ? 'bg-slate-50 border-2 border-emerald-500/10' : 'bg-slate-50/50'}`}>
                <h4 className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 tracking-widest">
                  <span className="material-symbols-rounded text-sm">analytics</span> TANDA TANGAN LAPORAN (PIMPINAN)
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Nama</label>
                    <input type="text" readOnly={!isEditing} className={`w-full p-3 text-xs font-bold rounded-xl outline-none border transition-all ${isEditing ? 'bg-white border-emerald-100 text-slate-700 shadow-sm' : 'bg-transparent border-transparent text-slate-500'}`} value={config.ttd_laporan_nama || ''} onChange={e => setConfig({...config, ttd_laporan_nama: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Jabatan</label>
                    <input type="text" readOnly={!isEditing} className={`w-full p-3 text-xs font-bold rounded-xl outline-none border transition-all ${isEditing ? 'bg-white border-emerald-100 text-slate-700 shadow-sm' : 'bg-transparent border-transparent text-slate-500'}`} value={config.ttd_laporan_jabatan || ''} onChange={e => setConfig({...config, ttd_laporan_jabatan: e.target.value})} />
                  </div>
                </div>
              </div>

              {/* TTD Laporan (Admin Pembuat) */}
              <div className={`p-6 rounded-3xl space-y-6 transition-all border ${isEditing ? 'bg-emerald-50/50 border-emerald-200' : 'bg-emerald-50/20 border-emerald-100/30'}`}>
                <h4 className="text-[10px] font-black text-emerald-600 uppercase flex items-center gap-2 tracking-widest">
                  <span className="material-symbols-rounded text-sm">person_edit</span> TANDA TANGAN ADMIN (PEMBUAT)
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest block mb-1">Nama Admin</label>
                    <input type="text" readOnly={!isEditing} className={`w-full p-3 text-xs font-bold rounded-xl outline-none border transition-all ${isEditing ? 'bg-white border-emerald-100 text-emerald-700 shadow-sm' : 'bg-transparent border-transparent text-emerald-400'}`} value={config.ttd_admin_nama || ''} onChange={e => setConfig({...config, ttd_admin_nama: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest block mb-1">Jabatan Admin</label>
                    <input type="text" readOnly={!isEditing} className={`w-full p-3 text-xs font-bold rounded-xl outline-none border transition-all ${isEditing ? 'bg-white border-emerald-100 text-emerald-700 shadow-sm' : 'bg-transparent border-transparent text-emerald-400'}`} value={config.ttd_admin_jabatan || ''} onChange={e => setConfig({...config, ttd_admin_jabatan: e.target.value})} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Tanda Tangan Digital */}
          <div className="p-8">
            <h3 className="text-xs font-black text-emerald-600 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                <span className="material-symbols-rounded text-[18px]">signature</span>
              </span>
              Tanda Tangan Digital
            </h3>
            <div className="flex flex-col md:flex-row items-start gap-12">
              <div className={`w-full md:w-64 aspect-square rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center p-8 text-center transition-all relative overflow-hidden ${isEditing ? 'bg-white border-emerald-500 shadow-xl cursor-pointer' : 'bg-slate-50/50 border-slate-200 cursor-not-allowed'}`}>
                {config.ttd_base64 || config.ttd_url ? (
                  <img src={config.ttd_base64 || config.ttd_url} alt="TTD Preview" className="w-full h-full object-contain" />
                ) : (
                  <>
                    <span className="material-symbols-rounded text-5xl text-slate-300 mb-4">signature</span>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Belum Ada Tanda Tangan</p>
                  </>
                )}
                {isEditing && (
                  <input 
                    type="file" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    accept="image/*"
                    onChange={async (e) => {
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
                    }}
                  />
                )}
              </div>
              <div className="flex-1 space-y-6">
                <div className="p-8 bg-emerald-50 rounded-[2rem] border border-emerald-100/50">
                  <h4 className="font-black text-emerald-900 text-sm mb-4 uppercase italic flex items-center gap-2">
                    <span className="material-symbols-rounded text-lg">lightbulb</span> Panduan Penggunaan
                  </h4>
                  <ul className="text-[11px] text-emerald-700 font-bold space-y-3">
                    <li className="flex items-start gap-3"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 flex-shrink-0"></span> Gunakan gambar transparan (PNG) untuk hasil cetak laporan terbaik.</li>
                    <li className="flex items-start gap-3"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 flex-shrink-0"></span> Tanda tangan akan otomatis muncul di seluruh Invoice, PO, dan Laporan.</li>
                    <li className="flex items-start gap-3"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 flex-shrink-0"></span> Jika dikosongkan, sistem beralih menggunakan Barcode Keamanan.</li>
                  </ul>
                </div>
                {isEditing && (
                  <button 
                    type="button"
                    onClick={() => setConfig({...config, ttd_url: null, ttd_base64: null})}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-sm"
                  >
                    <span className="material-symbols-rounded text-sm">delete_sweep</span>
                    Hapus Tanda Tangan
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-8 border-t border-slate-100">
            {success ? (
              <div className="flex items-center gap-3 text-emerald-600 font-black animate-in fade-in slide-in-from-left-4 duration-500 bg-emerald-50 px-6 py-3 rounded-2xl border border-emerald-100">
                <span className="material-symbols-rounded text-xl">check_circle</span>
                PROFIL BERHASIL DIPERBARUI!
              </div>
            ) : <div />}
            
            {isEditing && (
              <div className="flex items-center gap-4">
                <button 
                  type="button"
                  onClick={() => { setIsEditing(false); fetchConfig(); }}
                  className="px-8 py-4 rounded-2xl font-black tracking-widest text-sm text-slate-500 hover:bg-slate-100 transition-all"
                >
                  BATAL
                </button>
                <button type="submit" disabled={loading} className="bg-[#064E3B] text-white px-12 py-4 rounded-2xl font-black tracking-widest text-sm hover:bg-black transition-all shadow-2xl shadow-emerald-900/30 disabled:opacity-50 active:scale-95">
                  {loading ? 'MENYIMPAN...' : 'SIMPAN PERUBAHAN'}
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
