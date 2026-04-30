import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { getCurrentUser } from '../../api/authApi'
import api, { getFileUrl } from '../../api/api'

export default function Sidebar({ isOpen }) {
  const user = getCurrentUser();
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMenus = async () => {
      try {
        const { data } = await api.get('/menus');
        // Filter: Hanya yang aktif, sesuai role user, DAN bukan merupakan panel dashboard
        const filtered = data.filter(m => {
          const isRoleMatch = m.roles.split(',').includes(user?.role);
          const isNotPanel = m.path !== 'DASHBOARD_PANEL';
          
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
      {/* ── User Profile ── */}
      <div className={`px-5 py-6 border-b border-white/10 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 md:opacity-100'}`}>
        <div className="flex items-center gap-3 overflow-hidden">
          {(user?.foto_base64 || user?.foto_url) ? (
            <img 
              src={user.foto_base64 || getFileUrl(user.foto_url)} 
              className="w-10 h-10 rounded-xl object-cover border border-white/20 shadow-inner flex-shrink-0" 
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
              className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center text-white font-black text-lg shadow-inner flex-shrink-0"
              style={{ display: (user?.foto_base64 || user?.foto_url) ? 'none' : 'flex' }}
            >
              {user?.nama_lengkap?.charAt(0).toUpperCase() || 'R'}
            </div>
          )}
          {isOpen && (
             <div className="animate-in fade-in duration-500 overflow-hidden">
                <p className="text-white font-extrabold text-sm leading-tight truncate">{user?.nama_lengkap || 'User'} </p>
                <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest truncate">
                  {user?.role === 'super_admin' ? 'Super Admin' : 
                   user?.role === 'gm' ? 'General Manager' : 
                   user?.role === 'owner' ? 'Owner' : 
                   user?.role === 'admin' ? 'Admin' : 
                   user?.role === 'staff' ? 'Staff' : user?.role?.replace('_', ' ')}
                </p>
             </div>
          )}
        </div>
      </div>

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
    </aside>
  )
}
