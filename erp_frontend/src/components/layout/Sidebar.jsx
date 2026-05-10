import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { getCurrentUser } from '../../api/authApi'
import api, { getFileUrl } from '../../api/api'

export default function Sidebar({ isOpen }) {
  const user = getCurrentUser();
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const getHolidayTheme = () => {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    const day = now.getDate();

    // Hari Buruh (1 Mei)
    if (month === 5 && day === 1) {
      return {
        id: 'buruh',
        name: 'Hari Buruh Internasional',
        color: 'from-red-700 to-slate-900',
        icon: 'engineering',
        bg: 'bg-red-500/10'
      };
    }

    // Ramadan 2026 (Sekitar Feb 18 - Mar 19)
    if ((month === 2 && day >= 18) || (month === 3 && day <= 19)) {
      return {
        id: 'ramadan',
        name: 'Ramadan Kareem',
        color: 'from-emerald-900 to-emerald-600',
        icon: 'dark_mode',
        bg: 'bg-emerald-500/10'
      };
    }

    // Idul Fitri 2026 (Sekitar Mar 20 - Mar 25)
    if (month === 3 && day >= 20 && day <= 25) {
      return {
        id: 'lebaran',
        name: 'Idul Fitri 1447H',
        color: 'from-emerald-600 to-yellow-500',
        icon: 'celebration',
        bg: 'bg-yellow-500/10'
      };
    }

    // Hari Kemerdekaan (17 Agustus)
    if (month === 8 && day >= 10 && day <= 20) {
      return {
        id: 'kemerdekaan',
        name: 'HUT RI 81',
        color: 'from-red-600 to-white',
        icon: 'flag',
        bg: 'bg-red-500/10',
        textColor: 'text-red-600'
      };
    }

    // Default Theme (Modern Business)
    return {
      id: 'default',
      name: 'Raziq Garmen ERP',
      color: 'from-slate-900 to-emerald-900',
      icon: 'verified_user',
      bg: 'bg-emerald-500/5'
    };
  };

  const theme = getHolidayTheme();

  useEffect(() => {
    const fetchMenus = async () => {
      try {
        const { data } = await api.get('/menus');
        // Filter: Hanya yang aktif, sesuai role user, DAN bukan merupakan panel dashboard
        const filtered = data.filter(m => {
          const isRoleMatch = m.roles.split(',').includes(user?.role);
          const isNotPanel = m.path !== 'DASHBOARD_PANEL';
          
          // HAK ISTIMEWA SUPER ADMIN: Abaikan status is_active (Selalu tampil)
          if (user?.role === 'super_admin') {
            return isRoleMatch && isNotPanel;
          }

          // Filter khusus Owner & GM (Hanya Dashboard, Laporan, Riwayat, Profile)
          if (user?.role === 'owner' || user?.role === 'gm') {
             const allowed = ['dashboard', 'laporan', 'riwayat', 'profile'];
             return m.is_active === 1 && allowed.includes(m.id_menu) && isNotPanel;
          }

          return m.is_active === 1 && isRoleMatch && isNotPanel;
        });
        setMenus(filtered);
      } catch (err) {
        console.error("Gagal mengambil menu:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMenus();
  }, [user]);

  if (loading) return null;

  return (
    <aside className={`
      fixed top-0 left-0 h-full bg-[#064E3B] flex flex-col shadow-xl z-50
      transition-all duration-300 ease-in-out
      ${isOpen ? 'w-64 translate-x-0' : 'w-0 md:w-20 -translate-x-full md:translate-x-0'}
    `}>
      {/* ── User Profile (Clickable) ── */}
      <button 
        onClick={() => setShowProfileModal(true)}
        className={`px-5 py-6 border-b border-white/10 transition-all duration-300 hover:bg-white/5 active:scale-95 text-left w-full group ${isOpen ? 'opacity-100' : 'opacity-0 md:opacity-100'}`}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="relative">
            {(user?.foto_base64 || user?.foto_url) ? (
              <img 
                src={user.foto_base64 || getFileUrl(user.foto_url)} 
                className="w-10 h-10 rounded-xl object-cover border border-white/20 shadow-lg flex-shrink-0 group-hover:border-emerald-400 transition-colors" 
                alt="" 
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.style.display = 'none';
                  const sibling = e.target.nextSibling;
                  if (sibling) sibling.style.display = 'flex';
                }}
              />
            ) : null}
            {(!user?.foto_base64 && !user?.foto_url) || (user?.foto_base64 || user?.foto_url) && (
              <div 
                className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center text-white font-black text-lg shadow-inner flex-shrink-0 border border-white/10"
                style={{ display: (user?.foto_base64 || user?.foto_url) ? 'none' : 'flex' }}
              >
                {user?.nama_lengkap?.charAt(0).toUpperCase() || 'R'}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-[#064E3B] rounded-full"></div>
          </div>
          {isOpen && (
             <div className="animate-in fade-in duration-500 overflow-hidden flex-1">
                <p className="text-white font-extrabold text-sm leading-tight truncate">{user?.nama_lengkap || 'User'} </p>
                <p className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] truncate">
                  {user?.role === 'super_admin' ? 'Super Admin' : 
                   user?.role === 'gm' ? 'General Manager' : 
                   user?.role === 'owner' ? 'Owner' : 
                   user?.role === 'admin' ? 'Admin' : 
                   user?.role === 'staff' ? 'Staff' : user?.role?.replace('_', ' ')}
                </p>
             </div>
          )}
        </div>
      </button>

      {/* ── Navigasi Utama ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar">
        {menus.map((item, index) => {
          if (item.is_divider) {
            return (
              <div key={`divider-${index}`} className="pt-6 pb-2 px-4">
                <div className="border-t border-white/10 mb-3"></div>
                {isOpen && item.nama_menu && (
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-1">
                    {item.nama_menu}
                  </p>
                )}
              </div>
            )
          }

          return (
            <NavLink
              key={item.id_menu}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold 
                transition-all duration-200 group relative
                ${isActive
                  ? 'bg-emerald-500 text-white shadow-lg'
                  : 'text-emerald-100/70 hover:bg-emerald-800 hover:text-white'
                }
                ${!isOpen ? 'justify-center p-0 h-10 w-10 mx-auto mb-1' : ''}`
              }
              title={!isOpen ? item.nama_menu : ''}
            >
              <span className={`material-symbols-rounded text-[22px] flex-shrink-0 transition-transform duration-200 group-hover:scale-110`}>
                {item.icon}
              </span>
              {isOpen && <span className="truncate animate-in slide-in-from-left-2">{item.nama_menu}</span>}
              
              {!isOpen && (
                <div className="absolute left-14 bg-emerald-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl border border-emerald-700 font-bold uppercase tracking-widest">
                    {item.nama_menu}
                </div>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* ── Footer ── */}
      <div className="px-3 py-4 border-t border-white/10">
        <button 
           onClick={() => window.location.href = '/penjualan'}
           className={`flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold rounded-xl transition-all duration-300 shadow-md ${isOpen ? 'w-full py-2.5 px-4' : 'w-10 h-10 mx-auto'}`}>
          <span className="material-symbols-rounded text-[20px]">add</span>
          {isOpen && <span className="whitespace-nowrap">New Order</span>}
        </button>
      </div>

      {/* ── PROFILE DETAIL MODAL (DYNAMIC THEME) ── */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 slide-in-from-bottom-8 duration-500">
                
                {/* Header Profile with Dynamic Theme */}
                <div className={`p-8 pb-16 text-white relative bg-gradient-to-br ${theme.color}`}>
                    <div className="absolute top-0 right-0 p-6 opacity-20 rotate-12">
                        <span className="material-symbols-rounded text-9xl">{theme.icon}</span>
                    </div>
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-24 h-24 rounded-3xl overflow-hidden border-4 border-white/30 shadow-2xl mb-4 bg-white/20 backdrop-blur-md">
                             {(user?.foto_base64 || user?.foto_url) ? (
                                <img src={user.foto_base64 || getFileUrl(user.foto_url)} className="w-full h-full object-cover" alt="" />
                             ) : (
                                <div className="w-full h-full flex items-center justify-center text-3xl font-black">{user?.nama_lengkap?.charAt(0)}</div>
                             )}
                        </div>
                        <h2 className="text-2xl font-black tracking-tight">{user?.nama_lengkap}</h2>
                        <div className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-[0.2em] mt-2 border border-white/20">
                            {user?.role?.replace('_', ' ')}
                        </div>
                    </div>
                    
                    {/* Theme Banner */}
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2 border border-slate-100 whitespace-nowrap">
                        <span className={`material-symbols-rounded text-[20px] ${theme.id === 'default' ? 'text-emerald-600' : 'text-red-600 animate-pulse'}`}>{theme.icon}</span>
                        <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{theme.name}</p>
                    </div>
                </div>

                {/* Account Details */}
                <div className="p-8 pt-12 space-y-6 bg-white">
                    <div className="grid grid-cols-2 gap-4">
                        <div className={`p-4 rounded-2xl border border-slate-100 ${theme.bg}`}>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Username</p>
                            <p className="text-sm font-bold text-slate-800">@{user?.username || 'user'}</p>
                        </div>
                        <div className={`p-4 rounded-2xl border border-slate-100 ${theme.bg}`}>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Status Akun</p>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                <p className="text-sm font-bold text-emerald-700">Aktif</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Informasi Pekerjaan</p>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-rounded text-slate-400 text-[18px]">verified_user</span>
                                <p className="text-xs font-bold text-slate-700">Hak Akses: <span className="text-emerald-700 uppercase">{user?.role}</span></p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-rounded text-slate-400 text-[18px]">apartment</span>
                                <p className="text-xs font-bold text-slate-700">Divisi: <span className="text-slate-500">Internal Management</span></p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-4 grid grid-cols-2 gap-4">
                        <button 
                            onClick={() => { setShowProfileModal(false); window.location.href = '/profile'; }}
                            className="flex items-center justify-center gap-2 py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all active:scale-95 shadow-sm"
                        >
                            <span className="material-symbols-rounded text-[18px]">manage_accounts</span>
                            Setting
                        </button>
                        <button 
                            onClick={() => {
                                if (window.confirm("Yakin ingin keluar dari sistem?")) {
                                    localStorage.removeItem('token');
                                    localStorage.removeItem('user');
                                    window.location.href = '/login';
                                }
                            }}
                            className="flex items-center justify-center gap-2 py-3.5 bg-red-50 text-red-600 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all active:scale-95 shadow-sm"
                        >
                            <span className="material-symbols-rounded text-[18px]">logout</span>
                            Logout
                        </button>
                    </div>
                </div>

                {/* Modal Footer Close */}
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-center">
                    <button 
                        onClick={() => setShowProfileModal(false)}
                        className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-800 transition-colors"
                    >
                        Tutup Jendela Detail
                    </button>
                </div>
            </div>
        </div>
      )}
    </aside>
  )
}
