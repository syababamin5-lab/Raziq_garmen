import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PrayerModal from './PrayerModal';

const PrayerTimesCompact = () => {
  const [timings, setTimings] = useState(null);
  const [nextPrayer, setNextPrayer] = useState(null);
  const [timeLeft, setTimeLeft] = useState("");
  const [isWarning, setIsWarning] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lastNotified, setLastNotified] = useState("");

  useEffect(() => {
    const fetchPrayerTimes = async (lat, lon) => {
      try {
        const url = lat && lon 
          ? `https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=2`
          : `https://api.aladhan.com/v1/timingsByCity?city=Bandung&country=Indonesia&method=2`;
        
        const response = await axios.get(url);
        setTimings(response.data.data.timings);
      } catch (error) {
        console.error("Error fetching prayer times", error);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => fetchPrayerTimes(position.coords.latitude, position.coords.longitude),
        () => fetchPrayerTimes()
      );
    } else {
      fetchPrayerTimes();
    }
  }, []);

  useEffect(() => {
    if (!timings) return;
    
    const calculateTime = () => {
      const now = new Date();
      const prayerNames = [
        { key: 'Fajr', label: 'Subuh' },
        { key: 'Dhuhr', label: 'Dzuhur' },
        { key: 'Asr', label: 'Ashar' },
        { key: 'Maghrib', label: 'Maghrib' },
        { key: 'Isha', label: 'Isya' }
      ];
      
      let upcoming = null;
      let justReached = null;

      for (let p of prayerNames) {
          const [hour, minute] = timings[p.key].split(':');
          const prayerTime = new Date();
          prayerTime.setHours(parseInt(hour), parseInt(minute), 0);
          
          // Cek apakah ada adzan yang tiba (dalam 2 detik terakhir agar tidak terlewat)
          const diffToPrayer = prayerTime - now;
          if (diffToPrayer <= 0 && diffToPrayer > -2000) {
            justReached = p.label;
          }

          if (!upcoming && prayerTime > now) {
              upcoming = { name: p.label, timeObj: prayerTime };
          }
      }
      
      if (!upcoming) {
          const [hour, minute] = timings['Fajr'].split(':');
          const prayerTime = new Date();
          prayerTime.setDate(prayerTime.getDate() + 1);
          prayerTime.setHours(parseInt(hour), parseInt(minute), 0);
          upcoming = { name: 'Subuh (Besok)', timeObj: prayerTime };
      }

      setNextPrayer(upcoming);

      // Hitung selisih untuk countdown
      const diffMs = upcoming.timeObj - now;
      const diffMins = Math.floor(diffMs / 60000);
      const diffSecs = Math.floor((diffMs % 60000) / 1000);

      setTimeLeft(`${String(Math.floor(Math.max(0, diffMins) / 60)).padStart(2, '0')}:${String(Math.max(0, diffMins) % 60).padStart(2, '0')}:${String(Math.max(0, diffSecs)).padStart(2, '0')}`);
      
      // Trigger Pop-up saat waktu Shalat Tiba
      if (justReached && lastNotified !== justReached) {
        setIsModalOpen(true);
        setLastNotified(justReached);
      }

      // Warning 7 menit (sebelumnya 10 menit)
      if (diffMins <= 7 && diffMins >= 0) {
        setIsWarning(true);
      } else {
        setIsWarning(false);
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [timings, lastNotified]);

  if (!timings) return <div className="text-[10px] text-slate-300 animate-pulse font-bold uppercase tracking-widest">Menghubungkan Jadwal...</div>;
  if (!nextPrayer) return null;

  return (
    <>
      <div className="flex items-center gap-2">
        <div 
          onClick={() => setIsModalOpen(true)}
          className={`
            flex items-center gap-3 px-4 py-1.5 rounded-full border transition-all duration-500 cursor-pointer group
            ${isWarning 
              ? 'bg-red-50 border-red-200 animate-pulse scale-105 shadow-lg shadow-red-500/10' 
              : 'bg-emerald-50 border-emerald-100 shadow-sm hover:bg-emerald-100'}
          `}
          title="Klik untuk Simulasi Pop-up"
        >
          <div className={`
            flex items-center justify-center w-7 h-7 rounded-full transition-transform group-hover:scale-110
            ${isWarning ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}
          `}>
            <span className="material-symbols-rounded text-base">mosque</span>
          </div>
          
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className={`text-[9px] font-black uppercase tracking-widest ${isWarning ? 'text-red-600' : 'text-emerald-700'}`}>
                {isWarning ? 'PERSIAPAN ADZAN' : 'MENUJU'} {nextPrayer.name}
              </span>
              {isWarning && <span className="w-1 h-1 rounded-full bg-red-500 animate-ping"></span>}
            </div>
            <div className="flex items-center gap-2 -mt-1">
              <span className={`text-xs font-black tabular-nums ${isWarning ? 'text-red-800' : 'text-slate-800'}`}>
                {timeLeft}
              </span>
              <span className="text-[10px] font-bold text-slate-400">Lagi</span>
            </div>
        </div>
      </div>
      </div>

      <PrayerModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        prayerName={nextPrayer.name} 
      />
    </>
  );
};

export default PrayerTimesCompact;
