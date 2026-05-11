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
        window.dispatchEvent(new CustomEvent('update-company-config'));
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) { alert('Gagal memperbarui profil'); }
    setLoading(false);
  };

  return (
    <div className="w-full px-4 md:px-10 space-y-8 pb-20">
      {/* Header */}
      <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 flex items-center gap-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-full bg-emerald-500/5 -rotate-12 translate-x-10"></div>
        <div className="w-24 h-24 rounded-3xl bg-emerald-900 flex items-center justify-center text-white shadow-2xl overflow-hidden relative group cursor-pointer">
          {config.logo_base64 || config.logo_url ? (
            <img src={config.logo_base64 || config.logo_url} className="w-full h-full object-contain p-2" alt="Logo" />
          ) : <span className="material-symbols-rounded text-5xl">business</span>}
          
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

          {/* Section: Rekening Bank */}
          <div>
            <h3 className="text-xs font-black text-emerald-600 uppercase tracking-[0.2em] mb-6 border-b pb-2">Informasi Rekening Bank (Untuk Invoice)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-2 block">Nama Bank</label>
                <input type="text" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none" value={config.nama_bank || ''} onChange={e => setConfig({...config, nama_bank: e.target.value})} placeholder="Contoh: BCA" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-2 block">Nomor Rekening</label>
                <input type="text" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none" value={config.no_rekening || ''} onChange={e => setConfig({...config, no_rekening: e.target.value})} placeholder="000-000-0000" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-2 block">Atas Nama (A/N)</label>
                <input type="text" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none" value={config.atas_nama_bank || ''} onChange={e => setConfig({...config, atas_nama_bank: e.target.value})} placeholder="Contoh: PT RAZIQ GARMENT" />
              </div>
            </div>
          </div>

          {/* Section: Pengaturan TTD Khusus (No-Code) */}
          <div>
            <h3 className="text-xs font-black text-emerald-600 uppercase tracking-[0.2em] mb-6 border-b pb-2">Kustomisasi Penanda Tangan (TTD Dokumen)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
              {/* TTD Invoice */}
              <div className="bg-slate-50 p-6 rounded-3xl space-y-4">
                <h4 className="text-[11px] font-black text-slate-500 uppercase flex items-center gap-2">
                  <span className="material-symbols-rounded text-sm">receipt_long</span> TANDA TANGAN INVOICE
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Nama</label>
                    <input type="text" className="w-full bg-white rounded-xl p-3 text-xs font-bold text-slate-700 outline-none border border-slate-100" value={config.ttd_invoice_nama || ''} onChange={e => setConfig({...config, ttd_invoice_nama: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Jabatan</label>
                    <input type="text" className="w-full bg-white rounded-xl p-3 text-xs font-bold text-slate-700 outline-none border border-slate-100" value={config.ttd_invoice_jabatan || ''} onChange={e => setConfig({...config, ttd_invoice_jabatan: e.target.value})} />
                  </div>
                </div>
              </div>

              {/* TTD PO */}
              <div className="bg-slate-50 p-6 rounded-3xl space-y-4">
                <h4 className="text-[11px] font-black text-slate-500 uppercase flex items-center gap-2">
                  <span className="material-symbols-rounded text-sm">shopping_cart</span> TANDA TANGAN PURCHASE ORDER
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Nama</label>
                    <input type="text" className="w-full bg-white rounded-xl p-3 text-xs font-bold text-slate-700 outline-none border border-slate-100" value={config.ttd_po_nama || ''} onChange={e => setConfig({...config, ttd_po_nama: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Jabatan</label>
                    <input type="text" className="w-full bg-white rounded-xl p-3 text-xs font-bold text-slate-700 outline-none border border-slate-100" value={config.ttd_po_jabatan || ''} onChange={e => setConfig({...config, ttd_po_jabatan: e.target.value})} />
                  </div>
                </div>
              </div>

              {/* TTD Laporan (Pimpinan) */}
              <div className="bg-slate-50 p-6 rounded-3xl space-y-4">
                <h4 className="text-[11px] font-black text-slate-500 uppercase flex items-center gap-2">
                  <span className="material-symbols-rounded text-sm">analytics</span> TANDA TANGAN LAPORAN (PIMPINAN)
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Nama</label>
                    <input type="text" className="w-full bg-white rounded-xl p-3 text-xs font-bold text-slate-700 outline-none border border-slate-100" value={config.ttd_laporan_nama || ''} onChange={e => setConfig({...config, ttd_laporan_nama: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Jabatan</label>
                    <input type="text" className="w-full bg-white rounded-xl p-3 text-xs font-bold text-slate-700 outline-none border border-slate-100" value={config.ttd_laporan_jabatan || ''} onChange={e => setConfig({...config, ttd_laporan_jabatan: e.target.value})} />
                  </div>
                </div>
              </div>

              {/* TTD Laporan (Admin Pembuat) */}
              <div className="bg-emerald-50/50 p-6 rounded-3xl space-y-4 border border-emerald-100/50">
                <h4 className="text-[11px] font-black text-emerald-600 uppercase flex items-center gap-2">
                  <span className="material-symbols-rounded text-sm">person_edit</span> TANDA TANGAN ADMIN (PEMBUAT)
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest block mb-1">Nama Admin</label>
                    <input type="text" className="w-full bg-white rounded-xl p-3 text-xs font-bold text-emerald-700 outline-none border border-emerald-100" value={config.ttd_admin_nama || ''} onChange={e => setConfig({...config, ttd_admin_nama: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest block mb-1">Jabatan Admin</label>
                    <input type="text" className="w-full bg-white rounded-xl p-3 text-xs font-bold text-emerald-700 outline-none border border-emerald-100" value={config.ttd_admin_jabatan || ''} onChange={e => setConfig({...config, ttd_admin_jabatan: e.target.value})} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Tanda Tangan Digital */}
          <div>
            <h3 className="text-xs font-black text-emerald-600 uppercase tracking-[0.2em] mb-6 border-b pb-2">Tanda Tangan Digital (TTD Pimpinan)</h3>
            <div className="flex flex-col md:flex-row items-start gap-10">
          <div className="w-full md:w-64 aspect-square bg-slate-100 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-6 text-center group hover:border-emerald-500 transition-all cursor-pointer relative overflow-hidden">
                {config.ttd_base64 || config.ttd_url ? (
                  <img src={config.ttd_base64 || config.ttd_url} alt="TTD Preview" className="w-full h-full object-contain" />
                ) : (
                  <>
                    <span className="material-symbols-rounded text-4xl text-slate-300 mb-2 group-hover:text-emerald-500 transition-all">signature</span>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Belum Ada Tanda Tangan</p>
                  </>
                )}
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
              </div>
              <div className="flex-1 space-y-4">
                <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
                  <h4 className="font-black text-emerald-900 text-sm mb-2 uppercase italic">📜 Penting!</h4>
                  <ul className="text-[11px] text-emerald-700 font-medium space-y-2 list-disc pl-4">
                    <li>Gunakan gambar transparan (PNG) untuk hasil terbaik.</li>
                    <li>Tanda tangan ini akan otomatis muncul di seluruh invoice dan laporan PDF.</li>
                    <li>Jika tidak diunggah, sistem akan menggunakan Barcode Validasi sebagai pengganti.</li>
                  </ul>
                </div>
                <button 
                  type="button"
                  onClick={() => setConfig({...config, ttd_url: null})}
                  className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline"
                >
                  Hapus Tanda Tangan (Gunakan Barcode)
                </button>
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
