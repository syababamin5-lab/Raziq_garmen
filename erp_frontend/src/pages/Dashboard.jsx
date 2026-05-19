import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/api'
import { getDashboardSummary, updateTarget } from '../api/dashboardApi'
import { formatRp } from '../utils/formatters'
import KeuanganCard from '../components/dashboard/KeuanganCard'
import PenjualanPanel from '../components/dashboard/PenjualanPanel'
import GudangCards from '../components/dashboard/GudangCards'
import ProduksiPanel from '../components/dashboard/ProduksiPanel'
import TotalProduksiPanel from '../components/dashboard/TotalProduksiPanel'
import InvoiceDetailModal from '../components/dashboard/InvoiceDetailModal'
import PrayerTimes from '../components/dashboard/PrayerTimes'
import IslamicCalendarCard from '../components/dashboard/IslamicCalendarCard'
import AIAssistantHub from '../components/dashboard/AIAssistantHub'
import MitraHistoryModal from '../components/dashboard/MitraHistoryModal'

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedPartner, setSelectedPartner] = useState(null)
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false)
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [dashSettings, setDashSettings] = useState({ showProduksi: true, showPenjualan: true, showKeuangan: true });

  const quotes = [
    "Kesuksesan adalah hasil dari persiapan, kerja keras, dan belajar dari kegagalan.",
    "Disiplin adalah jembatan antara target dan pencapaian nyata.",
    "Bisnis yang hebat dibangun oleh tim yang solid, bukan hanya satu individu.",
    "Kualitas produk adalah janji kita kepada pelanggan yang harus selalu ditepati.",
    "Jangan menunggu peluang datang, jemputlah peluang itu dengan inovasi.",
    "Fokuslah pada efisiensi hari ini untuk kejayaan pabrik di masa depan.",
    "Setiap jahitan yang rapi adalah cerminan dedikasi kita pada kesempurnaan.",
    "Sesungguhnya Allah menyukai orang-orang yang bekerja dengan profesional (Ihsan).",
    "Bekerjalah untuk duniamu seolah-olah kamu hidup selamanya, dan beramallah untuk akhiratmu seolah-olah kamu mati esok.",
    "Allah tidak membebani seseorang melainkan sesuai dengan kesanggupannya. (QS. Al-Baqarah: 286)",
    "Karena sesungguhnya sesudah kesulitan itu ada kemudahan. (QS. Al-Insyirah: 5)",
    "Jika kamu bersyukur, niscaya Aku akan menambah (nikmat) kepadamu. (QS. Ibrahim: 7)",
    "Barangsiapa yang bertaqwa kepada Allah, niscaya Dia akan mengadakan jalan keluar baginya. (QS. At-Talaq: 2)",
    "Harta yang paling baik adalah harta yang berada pada tangan orang yang shalih.",
    "Kejujuran dalam berbisnis adalah kunci keberkahan yang abadi.",
    "Pimpinlah dengan hati, kelola dengan logika, dan eksekusi dengan semangat.",
    "Inovasi membedakan antara pemimpin dan pengikut.",
    "Waktu adalah modal yang paling berharga, gunakanlah dengan bijaksana.",
    "Jangan takut gagal, takutlah jika kita tidak pernah mencoba.",
    "Visi tanpa eksekusi hanyalah halusinasi.",
    "Pelanggan yang puas adalah iklan terbaik untuk bisnis kita.",
    "Kebaikan yang tidak terorganisir akan dikalahkan oleh kebatilan yang terorganisir.",
    "Sebaik-baik manusia adalah yang paling bermanfaat bagi orang lain.",
    "Tangan di atas lebih baik daripada tangan di bawah.",
    "Rizki tidak akan tertukar, maka bekerjalah dengan tenang dan jujur.",
    "Jadikan pekerjaanmu sebagai ladang ibadah, maka lelahmu akan menjadi lillah.",
    "Kesabaran adalah kunci kesuksesan dalam menghadapi setiap tantangan bisnis.",
    "Teruslah bertumbuh, karena di dalam pertumbuhan ada kehidupan.",
    "Keadilan dalam memimpin adalah pondasi loyalitas tim.",
    "Bersama kesulitan ada kemudahan, maka jangan pernah menyerah.",
    "Doa adalah senjata orang mukmin, iringilah setiap usahamu dengan doa.",
    "Kunci kebahagiaan adalah bersyukur dalam setiap keadaan.",
    "Berbuat baiklah kepada bawahanmu, karena mereka adalah tangan kanan kesuksesanmu.",
    "Rencana yang matang adalah separuh dari keberhasilan.",
    "Jangan menunda pekerjaan hari ini untuk besok, karena esok punya tantangan sendiri.",
    "Kekuatan sebuah tim terletak pada kesamaan visi dan rasa saling percaya.",
    "Keberanian untuk memulai adalah langkah terbesar menuju kemenangan.",
    "Jadilah pemimpin yang menginspirasi, bukan sekadar memerintah.",
    "Detail kecil seringkali menentukan hasil besar.",
    "Pertumbuhan bisnis yang sehat dimulai dari pengelolaan keuangan yang jujur.",
    "Syukuri setiap pcss produk yang terjual, karena itu adalah pintu rezeki yang terbuka.",
    "Berikan yang terbaik hari ini, Allah akan memberikan yang terbaik untukmu esok.",
    "Tekunlah dalam kebaikan, niscaya kebaikan akan datang kepadamu berlipat ganda.",
    "Etika bisnis yang tinggi adalah aset yang tak ternilai harganya.",
    "Saling menghormati antar divisi adalah kunci kelancaran produksi.",
    "Jadikan setiap komplain pelanggan sebagai guru untuk perbaikan kita.",
    "Ketenangan dalam bekerja membuahkan hasil yang maksimal.",
    "Jangan pernah berhenti belajar, karena dunia bisnis selalu berputar.",
    "Keberkahan usaha terletak pada niat yang lurus and cara yang benar."
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 11) return "Selamat Pagi";
    if (hour < 15) return "Selamat Siang";
    if (hour < 19) return "Selamat Sore";
    return "Selamat Malam";
  };

  const [randomQuote] = useState(() => quotes[Math.floor(Math.random() * quotes.length)]);

  useEffect(() => {
    api.get('/menus').then(({ data }) => {
      const isSuper = user.role === 'super_admin';
      const settings = {
        showKeuangan: data.find(m => m.id_menu === 'dash_keuangan')?.roles.split(',').includes(user.role),
        showPenjualan: data.find(m => m.id_menu === 'dash_penjualan')?.roles.split(',').includes(user.role),
        showProduksi: data.find(m => m.id_menu === 'dash_produksi')?.roles.split(',').includes(user.role)
      };
      setDashSettings(settings);
    }).catch(err => console.error("Gagal memuat setting dashboard:", err));

    getDashboardSummary()
      .then((res) => {
        setData(res)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to fetch dashboard:', err)
        setLoading(false)
      })
  }, [])

  const handleSetTarget = async () => {
    const currentTarget = data?.gudang?.cutting_target_pcs || 1000;
    const res = prompt("Masukkan Target Cutting Mingguan Baru (Pcs):", currentTarget);
    if (res !== null) {
      const newTarget = parseInt(res);
      if (isNaN(newTarget)) return alert("Masukkan angka yang valid!");

      try {
        setLoading(true);
        const apiRes = await updateTarget(newTarget);
        if (apiRes.success) {
          const refreshedData = await getDashboardSummary();
          setData(refreshedData);
          alert(apiRes.message);
        } else {
          alert("Gagal: " + apiRes.message);
        }
      } catch (err) {
        console.error(err);
        alert("Terjadi kesalahan koneksi.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {['bos', 'owner', 'gm'].includes(user.role) && (
        <div className="relative overflow-hidden bg-gradient-to-r from-[#064E3B] to-[#10B981] p-8 rounded-[2.5rem] shadow-xl shadow-emerald-900/10 mb-8 border border-white/10 group transition-all duration-500 hover:scale-[1.01]">
          <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
          <div className="absolute bottom-[-20%] left-[5%] w-32 h-32 bg-emerald-400/20 rounded-full blur-2xl"></div>

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-inner animate-pulse">
                <span className="material-symbols-rounded text-4xl">king_bed</span>
              </div>
              <div>
                <h1 className="text-3xl font-black text-white tracking-tighter leading-tight">
                  {getGreeting()}, <span className="text-emerald-200">Owner {user.nama_lengkap}</span>!
                </h1>
                <p className="text-emerald-50/70 font-medium text-sm mt-1 tracking-wide flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  Semoga hari hari bos menyenangkan.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch md:items-center gap-4 w-full md:w-auto">
              {['super_admin', 'bos', 'owner', 'gm', 'admin'].includes(user.role) && (
                <button 
                  onClick={async () => {
                    if (confirm("Jalankan Rekonsiliasi Data? Ini akan menyamakan semua nama akun serta menyinkronkan saldo piutang, hutang, dan kasbon agar sama persis dengan jurnal transaksi Buku Besar.")) {
                      try {
                        setLoading(true);
                        const res = await api.post('/dashboard/reconcile');
                        alert(res.data.message);
                        window.location.reload();
                      } catch (err) {
                        alert("Gagal: " + err.message);
                      } finally {
                        setLoading(false);
                      }
                    }
                  }}
                  className="bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-2xl border border-white/20 flex items-center gap-2 transition-all group/btn"
                >
                  <span className="material-symbols-rounded text-xl group-hover/btn:rotate-180 transition-all duration-500">sync</span>
                  <span className="text-[10px] font-black uppercase tracking-widest">Rekonsiliasi Data</span>
                </button>
              )}
              <div className="flex flex-col gap-2">
                <PrayerTimes />
                <IslamicCalendarCard />
              </div>
              <div className="bg-white/10 backdrop-blur-md border border-white/10 p-5 rounded-3xl max-w-md flex items-center gap-4 hover:bg-white/15 transition-colors group/quote">
                <span className="material-symbols-rounded text-emerald-300 text-3xl">format_quote</span>
                <p className="italic text-white text-xs font-medium leading-relaxed">
                  "{randomQuote}"
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {dashSettings.showKeuangan && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KeuanganCard
            label="Sisa Saldo Tunai"
            value={formatRp(data?.keuangan?.sisa_saldo_tunai)}
            icon="payments"
            badge="LIVE"
            badgeType="live"
            loading={loading}
          />
          <KeuanganCard
            label="Sisa Saldo Bank"
            value={formatRp(data?.keuangan?.sisa_saldo_bank)}
            icon="account_balance"
            badge="LIVE"
            badgeType="live"
            loading={loading}
          />
          <KeuanganCard
            label="Total Uang Masuk"
            value={formatRp(data?.keuangan?.total_uang_masuk_bulan_ini)}
            icon="trending_up"
            badge="+Masuk"
            badgeType="up"
            sub="Bulan Ini"
            loading={loading}
          />
          <KeuanganCard
            label="Total Uang Keluar"
            value={formatRp(data?.keuangan?.total_uang_keluar_bulan_ini)}
            icon="trending_down"
            badge="-Keluar"
            badgeType="down"
            sub="Bulan Ini"
            loading={loading}
          />
        </div>
      )}

      {(dashSettings.showPenjualan || dashSettings.showProduksi) && (
        <div className={`grid gap-4 ${dashSettings.showPenjualan && dashSettings.showProduksi ? 'grid-cols-1 md:grid-cols-12' : 'grid-cols-1'}`}>
          {dashSettings.showPenjualan && (
            <div className={dashSettings.showProduksi ? "md:col-span-4" : "md:col-span-12"}>
              <PenjualanPanel
                data={data?.penjualan_terkini}
                loading={loading}
                onItemClick={(item) => {
                  setSelectedInvoice(item)
                  setIsModalOpen(true)
                }}
              />
            </div>
          )}
          {dashSettings.showProduksi && (
            <div className={dashSettings.showPenjualan ? "md:col-span-5" : "md:col-span-8"}>
              <ProduksiPanel
                gudang={data?.gudang}
                salesAnalytics={data?.sales_analytics}
                loading={loading}
              />
            </div>
          )}
          {dashSettings.showProduksi && (
            <div className={dashSettings.showPenjualan ? "md:col-span-3" : "md:col-span-4"}>
              <TotalProduksiPanel 
                productionAnalytics={data?.production_analytics}
                loading={loading}
              />
            </div>
          )}
        </div>
      )}

      <div className="space-y-4 pt-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-rounded text-[24px] text-emerald-700">factory</span>
          <h2 className="text-lg font-extrabold text-slate-800">Status Gudang Akhir</h2>
        </div>
        <GudangCards
          gudang={data?.gudang}
          loading={loading}
          onSetTarget={handleSetTarget}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-12">
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col h-full hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 shadow-inner">
              <span className="material-symbols-rounded text-2xl">account_balance_wallet</span>
            </div>
            <div>
              <h3 className="font-black text-slate-800 tracking-tighter uppercase text-sm">Piutang Klien</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tagihan Belum Lunas</p>
            </div>
          </div>
          <div className="flex-1 space-y-3">
            {data?.top_piutang?.map((item, idx) => (
              <div 
                key={idx} 
                onClick={() => {
                  setSelectedPartner(item);
                  setIsPartnerModalOpen(true);
                }}
                className="flex justify-between items-center p-3.5 bg-slate-50 rounded-2xl hover:bg-emerald-50 transition-colors group cursor-pointer"
              >
                <div>
                  <div className="text-xs font-black text-slate-800 uppercase group-hover:text-emerald-700 transition-colors">{item.nama_mitra}</div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase">Customer</div>
                </div>
                <div className="text-sm font-black text-emerald-700">{formatRp(item.nominal)}</div>
              </div>
            ))}
            {(!data?.top_piutang || data?.top_piutang.length === 0) && (
              <div className="text-center py-12 text-slate-300 font-bold text-xs italic">TIDAK ADA PIUTANG KLIEN</div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col h-full hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center text-red-700 shadow-inner">
              <span className="material-symbols-rounded text-2xl">outbox</span>
            </div>
            <div>
              <h3 className="font-black text-slate-800 tracking-tighter uppercase text-sm">Hutang Supplier</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tagihan Harus Dibayar</p>
            </div>
          </div>
          <div className="flex-1 space-y-3">
            {data?.top_utang?.map((item, idx) => (
              <div 
                key={idx} 
                onClick={() => {
                  setSelectedPartner(item);
                  setIsPartnerModalOpen(true);
                }}
                className="flex justify-between items-center p-3.5 bg-slate-50 rounded-2xl hover:bg-red-50 transition-colors group cursor-pointer"
              >
                <div>
                  <div className="text-xs font-black text-slate-800 uppercase group-hover:text-red-700 transition-colors">{item.nama_mitra}</div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase">Supplier</div>
                </div>
                <div className="text-sm font-black text-red-700">{formatRp(item.nominal)}</div>
              </div>
            ))}
            {(!data?.top_utang || data?.top_utang.length === 0) && (
              <div className="text-center py-12 text-slate-300 font-bold text-xs italic">TIDAK ADA HUTANG SUPPLIER</div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col h-full hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700 shadow-inner">
              <span className="material-symbols-rounded text-2xl">person_search</span>
            </div>
            <div>
              <h3 className="font-black text-slate-800 tracking-tighter uppercase text-sm">Kasbon Karyawan</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pinjaman Staf & Karyawan</p>
            </div>
          </div>
          <div className="flex-1 space-y-3">
            {data?.top_kasbon?.map((item, idx) => (
              <div 
                key={idx} 
                onClick={() => {
                  setSelectedPartner(item);
                  setIsPartnerModalOpen(true);
                }}
                className="flex justify-between items-center p-3.5 bg-slate-50 rounded-2xl hover:bg-amber-50 transition-colors group cursor-pointer"
              >
                <div>
                  <div className="text-xs font-black text-slate-800 uppercase group-hover:text-amber-700 transition-colors">{item.nama_mitra}</div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase">Karyawan</div>
                </div>
                <div className="text-sm font-black text-amber-700">{formatRp(item.nominal)}</div>
              </div>
            ))}
            {(!data?.top_kasbon || data?.top_kasbon.length === 0) && (
              <div className="text-center py-12 text-slate-300 font-bold text-xs italic">TIDAK ADA KASBON AKTIF</div>
            )}
          </div>
        </div>
      </div>

      <InvoiceDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        invoice={selectedInvoice}
      />

      <MitraHistoryModal
        isOpen={isPartnerModalOpen}
        onClose={() => {
          setIsPartnerModalOpen(false);
          setSelectedPartner(null);
        }}
        partner={selectedPartner}
      />
    </div>
  )
}
