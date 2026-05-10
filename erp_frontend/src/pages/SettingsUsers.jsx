import React, { useState, useEffect } from 'react';
import api, { getFileUrl } from '../api/api';

export default function SettingsUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    nama_lengkap: '',
    role: 'staff'
  });

  const [editingUser, setEditingUser] = useState(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState({}); // Tracking password visibility

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/users');
      setUsers(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

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
        setFormData(prev => ({ ...prev, foto_url: data.url }));
      }
    } catch (err) { alert('Gagal upload foto'); }
    setPhotoLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let res;
      if (editingUser) {
        res = await api.put(`/users/${editingUser.id}`, formData);
      } else {
        res = await api.post('/users', formData);
      }
      
      if (res.data.status === 'success') {
        alert(editingUser ? 'User diperbarui!' : 'User berhasil ditambahkan!');
        setFormData({ username: '', password: '', nama_lengkap: '', role: 'staff', foto_url: '' });
        setShowAdd(false);
        setEditingUser(null);
        fetchUsers();
      } else {
        // Tampilkan pesan error spesifik dari backend
        alert("Gagal: " + (res.data.message || "Terjadi kesalahan sistem"));
      }
    } catch (err) { 
      console.error(err);
      const msg = err.response?.data?.message || err.message || 'Koneksi ke server terputus';
      alert('Error: ' + msg); 
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '', // Jangan tampilkan password lama
      nama_lengkap: user.nama_lengkap,
      role: user.role,
      foto_url: user.foto_url || ''
    });
    setShowAdd(true);
  };

  const handleToggleActive = async (id, currentStatus) => {
    try {
      const { data } = await api.put(`/users/${id}`, { is_active: !currentStatus });
      if (data.status === 'success') {
        fetchUsers();
      }
    } catch (err) { alert('Gagal mengubah status user'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus user ini?')) return;
    try {
      const { data } = await api.delete(`/users/${id}`);
      if (data.status === 'success') {
        fetchUsers();
      } else {
        alert(data.message);
      }
    } catch (err) { alert('Gagal menghapus user'); }
  };

  const getRoleBadge = (role) => {
    const map = {
      'super_admin': 'bg-purple-100 text-purple-700',
      'owner': 'bg-amber-100 text-amber-700',
      'gm': 'bg-blue-100 text-blue-700',
      'admin': 'bg-emerald-100 text-emerald-700',
      'cutting': 'bg-emerald-500 text-white',
      'staff': 'bg-slate-100 text-slate-700'
    };
    const labels = {
      'super_admin': 'SUPER ADMIN',
      'owner': 'OWNER',
      'gm': 'GENERAL MANAGER / KEPALA OPERASIONAL',
      'admin': 'ADMIN',
      'cutting': 'PETUGAS CUTTING (HP)',
      'staff': 'STAFF'
    };
    return <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${map[role] || map.staff}`}>{labels[role] || role}</span>;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* Header Area */}
      <div className="bg-[#064E3B] p-10 rounded-[3rem] shadow-2xl shadow-emerald-900/20 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-800/30 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <span className="material-symbols-rounded text-5xl">manage_accounts</span>
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tighter font-outfit">Pengaturan User</h1>
              <p className="text-emerald-200 font-medium opacity-80 uppercase tracking-widest text-xs mt-1">Kelola Akun & Hak Akses ERP</p>
            </div>
          </div>
          <button 
            onClick={() => {
              if (showAdd) {
                setShowAdd(false);
                setEditingUser(null);
                setFormData({ username: '', password: '', nama_lengkap: '', role: 'user', foto_url: '' });
              } else {
                setShowAdd(true);
              }
            }}
            className="bg-white text-emerald-900 px-8 py-4 rounded-2xl font-black text-sm hover:scale-105 transition-all shadow-xl flex items-center gap-2"
          >
            <span className="material-symbols-rounded">{showAdd ? 'close' : 'add'}</span>
            {showAdd ? 'BATALKAN' : 'TAMBAH USER BARU'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Area */}
        {showAdd && (
          <div className="lg:col-span-1 animate-in slide-in-from-left-4 duration-500">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 sticky top-20">
              <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                <span className="material-symbols-rounded text-emerald-600">{editingUser ? 'edit' : 'person_add'}</span>
                {editingUser ? 'Edit Profil' : 'Buat User'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Photo Upload Section */}
                <div className="flex flex-col items-center gap-3 mb-6 bg-slate-50 p-6 rounded-3xl border border-dashed border-slate-200">
                   <div className="w-24 h-24 rounded-3xl bg-white border border-slate-100 shadow-sm overflow-hidden relative group">
                      {formData.foto_url ? (
                        <img src={getFileUrl(formData.foto_url)} className="w-full h-full object-cover" alt="Profile" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-emerald-50 text-emerald-600 text-3xl font-black">
                          {formData.nama_lengkap?.charAt(0).toUpperCase() || '?'}
                        </div>
                      )}
                      {photoLoading && <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white"><span className="material-symbols-rounded animate-spin">sync</span></div>}
                      <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-black cursor-pointer uppercase">Ubah Foto</label>
                      <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                   </div>
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Format: JPG/PNG/WebP</p>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-2 block">Username Login</label>
                  <input type="text" required className="w-full bg-slate-50 border-none rounded-xl p-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-2 block">{editingUser ? 'Password Baru (Kosongkan jika tetap)' : 'Password'}</label>
                  <input type="password" required={!editingUser} className="w-full bg-slate-50 border-none rounded-xl p-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-2 block">Nama Lengkap</label>
                  <input type="text" required className="w-full bg-slate-50 border-none rounded-xl p-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20" value={formData.nama_lengkap} onChange={e => setFormData({...formData, nama_lengkap: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-2 block">Role Akses</label>
                  <select className="w-full bg-slate-50 border-none rounded-xl p-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                    <option value="super_admin">SUPER ADMIN</option>
                    <option value="owner">OWNER</option>
                    <option value="gm">GENERAL MANAGER / KEPALA OPERASIONAL</option>
                    <option value="admin">ADMIN</option>
                    <option value="cutting">PETUGAS CUTTING (MOBILE)</option>
                    <option value="staff">STAFF</option>
                  </select>
                </div>
                <button type="submit" className="w-full bg-emerald-600 text-white p-4 rounded-xl font-black text-sm hover:bg-black transition-all shadow-lg shadow-emerald-900/10 mt-4">
                  {editingUser ? 'SIMPAN PERUBAHAN' : 'SIMPAN USER'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* List Area */}
        <div className={showAdd ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <div className="bg-white p-4 rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  <tr>
                    <th className="py-6 px-8">User Profile</th>
                    <th className="py-6 px-8">Credential (User & PW)</th>
                    <th className="py-6 px-8 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-all group">
                      <td className="py-6 px-8">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-black overflow-hidden">
                            {u.foto_url ? (
                                <img src={getFileUrl(u.foto_url)} className="w-full h-full object-cover" alt="" />
                            ) : (u.nama_lengkap || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-black text-slate-800">{u.nama_lengkap}</p>
                            <div className="flex items-center gap-2">
                              {getRoleBadge(u.role)}
                              <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`}></span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-6 px-8">
                        <div className="flex flex-col gap-1">
                          <p className="text-[11px] font-black text-emerald-600 tracking-widest uppercase">@{u.username}</p>
                          <div className="flex items-center gap-2 group/pw">
                            <p className="font-mono font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg text-xs min-w-[80px]">
                              {visiblePasswords[u.id] ? (u.password_plain || 'Encrypted') : '••••••••'}
                            </p>
                            <button 
                              onClick={() => setVisiblePasswords(prev => ({ ...prev, [u.id]: !prev[u.id] }))}
                              className="w-8 h-8 rounded-lg hover:bg-emerald-50 text-slate-300 hover:text-emerald-600 transition-all flex items-center justify-center"
                              title="Lihat Password"
                            >
                              <span className="material-symbols-rounded text-[18px]">
                                {visiblePasswords[u.id] ? 'visibility_off' : 'visibility'}
                              </span>
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="py-6 px-8">
                        <div className="flex items-center justify-center gap-6">
                          {/* Premium Switch Style Toggle */}
                          <div className="flex flex-col items-center gap-1">
                            <button 
                              onClick={() => handleToggleActive(u.id, u.is_active)}
                              disabled={u.username === 'superadmin'}
                              className={`group relative w-14 h-7 rounded-full transition-all duration-300 ${u.is_active ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-slate-200'} ${u.username === 'superadmin' ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer active:scale-90'}`}
                            >
                               <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-300 transform ${u.is_active ? 'translate-x-7' : 'translate-x-0'}`}></div>
                            </button>
                            <span className={`text-[8px] font-black uppercase tracking-widest ${u.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                              {u.is_active ? 'Active' : 'Off'}
                            </span>
                          </div>

                          <div className="h-8 w-px bg-slate-100"></div>

                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleEdit(u)}
                              className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-emerald-600 hover:text-white transition-all shadow-sm flex items-center justify-center group"
                            >
                              <span className="material-symbols-rounded text-[20px]">edit</span>
                            </button>
                            <button 
                              onClick={() => handleDelete(u.id)}
                              disabled={u.username === 'superadmin'}
                              className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-red-500 hover:text-white transition-all disabled:opacity-10 disabled:cursor-not-allowed shadow-sm flex items-center justify-center"
                            >
                              <span className="material-symbols-rounded text-[20px]">delete</span>
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
