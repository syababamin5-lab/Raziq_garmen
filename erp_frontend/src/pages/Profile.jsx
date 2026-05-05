import React, { useState, useEffect } from 'react';
import api, { getFileUrl } from '../api/api';

export default function Profile() {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));
  const [loading, setLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    id: user.id,
    username: user.username,
    new_username: user.username,
    nama_lengkap: user.nama_lengkap || '',
    email: user.email || '',
    no_hp: user.no_hp || '',
    password: '',
    foto_url: user.foto_url || '',
    foto_base64: user.foto_base64 || ''
  });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setPhotoLoading(true);
    const form = new FormData();
    form.append('file', file);
    
    try {
      const { data } = await api.post('/users/upload-photo', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (data.status === 'success') {
        setFormData(prev => ({ ...prev, foto_base64: data.url }));
      }
    } catch (err) { alert('Gagal upload foto'); }
    setPhotoLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.put('/auth/profile', formData);
      if (data.status === 'success') {
        alert('Profil berhasil diperbarui!');
        
        // Jika ada token baru (karena ganti username), simpan ke localStorage
        if (data.access_token) {
          localStorage.setItem('token', data.access_token);
        }

        // Update local storage user data
        const updatedUser = { ...user, ...data.user };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        setFormData(prev => ({ ...prev, username: updatedUser.username, new_username: updatedUser.username, password: '' }));
      } else {
        alert(data.message);
      }
    } catch (err) { alert('Gagal memperbarui profil'); }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="bg-[#064E3B] p-10 rounded-[3rem] shadow-2xl shadow-emerald-900/20 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-800/30 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative z-10 flex items-center gap-6">
          <div className="w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 overflow-hidden">
            {formData.foto_base64 || formData.foto_url ? (
               <img src={formData.foto_base64 || getFileUrl(formData.foto_url)} className="w-full h-full object-cover" alt="" />
            ) : <span className="material-symbols-rounded text-5xl">person</span>}
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter font-outfit">Profil Saya</h1>
            <p className="text-emerald-200 font-medium opacity-80 uppercase tracking-widest text-xs mt-1">Kelola Informasi Pribadi Anda</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Kiri: Foto */}
          <div className="flex flex-col items-center justify-center space-y-4 border-r border-slate-100 pr-8">
             <div className="w-48 h-48 rounded-[2.5rem] bg-slate-50 border border-slate-200 shadow-inner overflow-hidden relative group">
                {formData.foto_base64 || formData.foto_url ? (
                  <img src={formData.foto_base64 || getFileUrl(formData.foto_url)} className="w-full h-full object-cover" alt="Profile" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <span className="material-symbols-rounded text-7xl">image</span>
                  </div>
                )}
                {photoLoading && <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white"><span className="material-symbols-rounded animate-spin">sync</span></div>}
                <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer">
                  <span className="material-symbols-rounded text-3xl">photo_camera</span>
                  <span className="text-[10px] font-black uppercase tracking-widest mt-2">Ganti Foto</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </label>
             </div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Klik gambar untuk mengubah foto</p>
          </div>

          {/* Kanan: Form Data */}
          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-2 block">Username Login</label>
              <input 
                type="text" 
                className="w-full bg-slate-50 border-none rounded-xl p-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20" 
                value={formData.new_username} 
                onChange={e => setFormData({...formData, new_username: e.target.value})} 
              />
              <p className="text-[9px] text-slate-400 mt-1 pl-2 italic">Ganti username ini jika ingin mengubah ID untuk login.</p>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-2 block">Nama Lengkap</label>
              <input type="text" required className="w-full bg-slate-50 border-none rounded-xl p-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20" value={formData.nama_lengkap} onChange={e => setFormData({...formData, nama_lengkap: e.target.value})} />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-2 block">Email</label>
              <input type="email" className="w-full bg-slate-50 border-none rounded-xl p-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-2 block">Nomor HP</label>
              <input type="text" className="w-full bg-slate-50 border-none rounded-xl p-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20" value={formData.no_hp} onChange={e => setFormData({...formData, no_hp: e.target.value})} />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-2 block">Password Baru (Kosongkan jika tidak ganti)</label>
              <input type="password" placeholder="••••••••" className="w-full bg-slate-50 border-none rounded-xl p-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-emerald-600 text-white p-5 rounded-2xl font-black text-sm hover:bg-black transition-all shadow-xl shadow-emerald-900/10 flex items-center justify-center gap-2"
            >
              {loading ? <span className="material-symbols-rounded animate-spin">sync</span> : <span className="material-symbols-rounded">save</span>}
              SIMPAN PERUBAHAN PROFIL
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
