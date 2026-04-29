import React from 'react';

const PrayerModal = ({ isOpen, onClose, prayerName }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-emerald-950/80 backdrop-blur-md"
        onClick={onClose}
      ></div>
      
      {/* Modal Content */}
      <div className="relative bg-white rounded-[3rem] overflow-hidden shadow-2xl w-full max-w-lg animate-in zoom-in duration-300">
        {/* Header Image */}
        <div className="relative h-64 overflow-hidden">
          <img 
            src="/prayer_bg.png" 
            alt="Prayer Time" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-8 text-white">
            <h2 className="text-4xl font-black tracking-tighter">Waktunya Shalat</h2>
            <p className="text-emerald-300 font-bold uppercase tracking-widest text-sm">Panggilan Adzan {prayerName}</p>
          </div>
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/40 transition-colors"
          >
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>
        
        {/* Motivational Text */}
        <div className="p-10 text-center space-y-6">
          <div className="space-y-2">
            <h3 className="text-2xl font-black text-slate-800 leading-tight">
              "Shalatlah tepat waktu, niscaya Allah akan memudahkan urusanmu."
            </h3>
            <p className="text-slate-500 font-medium">
              Dunia sementara, akhirat selamanya. Mari luruskan niat, rapatkan barisan untuk menjemput ridha-Nya.
            </p>
          </div>
          
          <div className="flex flex-col gap-3 pt-4">
            <button 
              onClick={onClose}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
            >
              SAYA SIAP SHALAT SEKARANG
            </button>
            <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">
              RAZIQ GARMEN | SPIRITUAL & PROFESSIONAL
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrayerModal;
