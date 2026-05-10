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
  const [activePrayerName, setActivePrayerName] = useState("");

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
      const isFriday = now.getDay() === 5;
      const prayerNames = [
        { key: 'Fajr', label: 'Subuh' },
        { key: 'Dhuhr', label: isFriday ? 'Jum\'at' : 'Dzuhur' },
        { key: 'Asr', label: 'Ashar' },
        { key: 'Maghrib', label: 'Maghrib' },
        { key: 'Isha', label: 'Isya' }
      ];
      
      let upcoming = null;

      for (let p of prayerNames) {
          const [hour, minute] = timings[p.key].split(':');
          const prayerTime = new Date();
          prayerTime.setHours(parseInt(hour), parseInt(minute), 0);
          
          // Trigger Pop-up: Jika waktu shalat tiba (toleransi 1 menit agar tidak terlewat)
          const diffToPrayer = prayerTime - now;
          if (diffToPrayer <= 500 && diffToPrayer > -60000 && lastNotified !== p.label) {
            setActivePrayerName(p.label);
            setIsModalOpen(true);
            setLastNotified(p.label);
          }

          // KHUSUS JUM'AT: Peringatan 15 menit sebelum Dzuhur
          if (isFriday && p.key === 'Dhuhr') {
            const warningTime = new Date(prayerTime.getTime() - 15 * 60000);
            const diffToWarning = warningTime - now;
            if (diffToWarning <= 500 && diffToWarning > -60000 && lastNotified !== 'Persiapan Jum\'at') {
              setActivePrayerName('Persiapan Jum\'at');
              setIsModalOpen(true);
              setLastNotified('Persiapan Jum\'at');
            }
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
      const diffMins = Math.floor(Math.max(0, diffMs) / 60000);
      const diffSecs = Math.floor((Math.max(0, diffMs) % 60000) / 1000);

      // Format countdown yang presisi
      const h = String(Math.floor(diffMins / 60)).padStart(2, '0');
      const m = String(diffMins % 60).padStart(2, '0');
      const s = String(diffSecs).padStart(2, '0');
      setTimeLeft(`${h}:${m}:${s}`);
      
      // Warning normal 7 menit
      // KHUSUS JUM'AT: Warning visual mulai 20 menit sebelum
      const warningThreshold = (isFriday && upcoming.name === 'Jum\'at') ? 20 : 7;
      
      if (diffMins <= warningThreshold && diffMs > 0) {
        setIsWarning(true);
      } else {
        setIsWarning(false);
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [timings, lastNotified]);

  if (!timings) return <div className="text-[10px] text-emerald-100/30 animate-pulse font-bold uppercase tracking-widest">Menghubungkan Jadwal...</div>;
  if (!nextPrayer) return null;

  return (
    <>
      <div className="flex items-center gap-2">
        <div 
          onClick={() => {
            setActivePrayerName(nextPrayer.name);
            setIsModalOpen(true);
          }}
          className={`
            flex items-center gap-3 px-4 py-1.5 rounded-full border transition-all duration-500 cursor-pointer group
            ${isWarning 
              ? 'bg-red-50 border-red-200 animate-pulse scale-105 shadow-lg' 
              : 'bg-slate-50 border-slate-100 shadow-sm hover:bg-slate-100'}
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
              <span className={`text-[9px] font-black uppercase tracking-widest ${isWarning ? 'text-red-400' : 'text-emerald-400'}`}>
                {isWarning ? 'PERSIAPAN ADZAN' : 'MENUJU'} {nextPrayer.name}
              </span>
              {isWarning && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>}
            </div>
            <div className="flex items-center gap-2 -mt-1">
              <span className={`text-xs font-black tabular-nums ${isWarning ? 'text-red-700' : 'text-slate-800'}`}>
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
        prayerName={activePrayerName} 
      />
    </>
  );
};

export default PrayerTimesCompact;
