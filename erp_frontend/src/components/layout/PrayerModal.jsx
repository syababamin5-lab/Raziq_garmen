import React from 'react';
import ReactDOM from 'react-dom';

const PrayerModal = ({ isOpen, onClose, prayerName }) => {
  if (!isOpen) return null;

  const quotesMapping = {
    "Subuh": {
      title: "Awali Hari dengan Sujud",
      quote: "Awali harimu dengan sujud kepada-Nya, niscaya keberkahan akan menyertaimu sepanjang hari.",
      sub: "Rezeki yang berkah dimulai dari ketaatan di waktu fajar."
    },
    "Dzuhur": {
      title: "Istirahat Terbaik",
      quote: "Di tengah penatnya pekerjaan, ingatlah bahwa shalat adalah istirahat terbaik bagi jiwa.",
      sub: "Segarkan kembali semangatmu dengan menghadap Sang Pencipta."
    },
    "Jum'at": {
      title: "Jum'at Barokah",
      quote: "Hari terbaik yang matahari terbit padanya adalah hari Jum'at. Mari raih keberkahan hari ini.",
      sub: "Segerakan langkah menuju rumah Allah untuk meraih ridha-Nya."
    },
    "Persiapan Jum'at": {
      title: "Waktunya Bersiap",
      quote: "15 Menit lagi Adzan Jum'at. Mari segera bersuci, mengenakan pakaian terbaik, dan menuju Masjid.",
      sub: "Jangan terlambat, karena malaikat mencatat siapa yang datang lebih awal."
    },
    "Ashar": {
      title: "Prioritas Utama",
      quote: "Jangan biarkan kesibukan sore hari melalaikanmu dari kewajiban utama.",
      sub: "Kesuksesan sejati adalah saat pekerjaan tidak menghalangi ibadah."
    },
    "Maghrib": {
      title: "Syukuri Hari Ini",
      quote: "Syukuri nikmat hari ini dengan shalat tepat waktu. Mari tutup hari dengan ketaatan.",
      sub: "Kemenangan hari ini adalah saat kita tetap teguh dalam barisan-Nya."
    },
    "Isya": {
      title: "Ketenangan Jiwa",
      quote: "Istirahatkan ragamu, namun jangan lupakan penciptamu. Shalat Isya adalah ketenangan.",
      sub: "Mari akhiri hari dengan syukur dan doa agar esok menjadi lebih baik."
    },
    "Default": {
      title: "Panggilan Kebaikan",
      quote: "Shalatlah tepat waktu, niscaya Allah akan memudahkan urusanmu.",
      sub: "Dunia sementara, akhirat selamanya. Mari luruskan niat, rapatkan barisan."
    }
  };

  const currentContent = quotesMapping[prayerName] || quotesMapping["Default"];

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-3xl p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 cursor-pointer"
        onClick={onClose}
      ></div>
      
      {/* Modal Box - Guaranteed Center */}
      <div className="relative bg-white rounded-[3.5rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] w-full max-w-xl animate-in zoom-in duration-500 flex flex-col items-center">
        
        {/* Header Image Section */}
        <div className="relative w-full h-80 overflow-hidden">
          <img 
            src="/prayer_bg.png" 
            alt="Prayer Time" 
            className="w-full h-full object-cover scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent flex flex-col justify-end p-12 text-center items-center">
            <div className="mb-4 px-4 py-1.5 rounded-full bg-emerald-500 text-[10px] font-black uppercase tracking-[0.3em] text-white shadow-2xl">
              ADZAN {prayerName.toUpperCase()} TIBA
            </div>
            <h2 className="text-5xl font-black text-white tracking-tighter drop-shadow-2xl uppercase leading-none">
              {currentContent.title}
            </h2>
          </div>
          
          <button 
            onClick={onClose}
            className="absolute top-10 right-10 w-12 h-12 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-red-500 transition-all z-50 hover:scale-110 active:scale-95 border border-white/10"
          >
            <span className="material-symbols-rounded text-2xl">close</span>
          </button>
        </div>
        
        {/* Content Section */}
        <div className="p-16 text-center flex flex-col items-center gap-10">
          <div className="space-y-6">
            <h3 className="text-3xl font-black text-slate-800 leading-[1.2]">
              "{currentContent.quote}"
            </h3>
            <div className="w-24 h-2 bg-emerald-500 mx-auto rounded-full opacity-20"></div>
            <p className="text-slate-500 font-bold text-lg italic leading-relaxed opacity-80">
              {currentContent.sub}
            </p>
          </div>
          
          <div className="w-full flex flex-col items-center gap-6">
            <button 
              onClick={onClose}
              className="w-full group relative bg-emerald-600 hover:bg-emerald-500 text-white font-black py-6 px-12 rounded-[2.5rem] shadow-2xl shadow-emerald-600/40 transition-all active:scale-95 overflow-hidden"
            >
              <div className="relative z-10 flex items-center justify-center gap-4 text-2xl uppercase tracking-tighter">
                <span className="material-symbols-rounded text-3xl">mosque</span>
                SAYA SIAP BERIBADAH
              </div>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
            </button>
            
            <div className="flex flex-col items-center gap-2 opacity-30">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.6em]">
                RAZIQ GARMEN SYSTEM
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PrayerModal;
