import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PrayerTimes = () => {
  const [timings, setTimings] = useState(null);
  const [locationName, setLocationName] = useState('Bandung');
  const [nextPrayer, setNextPrayer] = useState(null);

  useEffect(() => {
    const fetchPrayerTimes = async (lat, lon) => {
      try {
        const url = lat && lon 
          ? `https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=2`
          : `https://api.aladhan.com/v1/timingsByCity?city=Bandung&country=Indonesia&method=2`;
        
        const response = await axios.get(url);
        const data = response.data.data;
        setTimings(data.timings);
        
        if (data.meta && data.meta.timezone) {
           // Jika ingin menampilkan nama kota lebih akurat, butuh reverse geocoding. 
           // Untuk sekarang kita pakai indikator umum jika geolocation aktif.
        }
      } catch (error) {
        console.error("Error fetching prayer times", error);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchPrayerTimes(position.coords.latitude, position.coords.longitude);
          setLocationName("Lokasi Anda");
        },
        () => {
          fetchPrayerTimes(); // Fallback to Bandung
        }
      );
    } else {
      fetchPrayerTimes();
    }
  }, []);

  useEffect(() => {
    if (!timings) return;
    
    const calculateNextPrayer = () => {
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
          
          if (prayerTime > now) {
              upcoming = { name: p.label, time: timings[p.key] };
              break;
          }
      }
      
      if (!upcoming) {
          upcoming = { name: 'Subuh (Besok)', time: timings['Fajr'] };
      }
      setNextPrayer(upcoming);
    };

    calculateNextPrayer();
    const interval = setInterval(calculateNextPrayer, 60000); // Update setiap menit
    return () => clearInterval(interval);
  }, [timings]);

  if (!nextPrayer) return null;

  return (
    <div className="flex items-center gap-3 px-5 py-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white shadow-lg animate-fade-in group hover:bg-white/20 transition-all cursor-default">
      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-400/20 text-emerald-300">
        <span className="material-symbols-rounded text-2xl group-hover:rotate-12 transition-transform">mosque</span>
      </div>
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-black text-emerald-200 tracking-[0.1em]">Jadwal Shalat</span>
          <span className="w-1 h-1 rounded-full bg-white/30"></span>
          <span className="text-[10px] font-bold text-white/60">{locationName}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-base font-black tracking-tight">{nextPrayer.name}</span>
          <span className="text-emerald-400 font-bold">•</span>
          <span className="text-base font-bold tabular-nums text-emerald-50">{nextPrayer.time}</span>
        </div>
      </div>
    </div>
  );
};

export default PrayerTimes;
