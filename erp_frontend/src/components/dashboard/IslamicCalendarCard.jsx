import React, { useState, useEffect } from 'react';
import axios from 'axios';

const IslamicCalendarCard = () => {
  const [hijriDate, setHijriDate] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);

  // List of major Islamic holidays (approximate or fixed in Hijri)
  // In a real app, you might fetch this or use a library, 
  // but for a dashboard widget, a curated list is often better for performance.
  const majorEvents = [
    { name: 'Tahun Baru Islam', day: 1, month: 1 },
    { name: 'Asyura', day: 10, month: 1 },
    { name: 'Maulid Nabi SAW', day: 12, month: 3 },
    { name: 'Isra Mi\'raj', day: 27, month: 7 },
    { name: 'Nisfu Sya\'ban', day: 15, month: 8 },
    { name: 'Awal Ramadhan', day: 1, month: 9 },
    { name: 'Nuzulul Qur\'an', day: 17, month: 9 },
    { name: 'Idul Fitri', day: 1, month: 10 },
    { name: 'Idul Adha', day: 10, month: 12 },
    { name: 'Hari Tasyrik', day: 11, month: 12 },
    { name: 'Hari Tasyrik', day: 12, month: 12 },
    { name: 'Hari Tasyrik', day: 13, month: 12 },
  ];

  useEffect(() => {
    const fetchHijri = async () => {
      try {
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const yyyy = today.getFullYear();
        
        const response = await axios.get(`https://api.aladhan.com/v1/gToH/${dd}-${mm}-${yyyy}`);
        const data = response.data.data.hijri;
        setHijriDate(data);
        
        // Find upcoming events
        const currentMonth = parseInt(data.month.number);
        const currentDay = parseInt(data.day);
        
        const upcoming = majorEvents
          .map(event => {
            // Simple logic to find if it's coming up this year or next
            let diffMonths = event.month - currentMonth;
            if (diffMonths < 0) diffMonths += 12;
            
            return { ...event, diff: diffMonths };
          })
          .sort((a, b) => {
            if (a.month === currentMonth) {
              if (a.day >= currentDay && b.month === currentMonth) return a.day - b.day;
              if (a.day < currentDay && b.month === currentMonth) return 1;
            }
            return a.diff - b.diff;
          })
          .slice(0, 3); // Show next 3 events

        setHolidays(upcoming);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching Hijri date", error);
        setLoading(false);
      }
    };

    fetchHijri();
  }, []);

  if (loading) return (
    <div className="bg-white/10 backdrop-blur-md border border-white/10 p-5 rounded-3xl w-full max-w-xs animate-pulse">
        <div className="h-4 bg-white/20 rounded w-1/2 mb-4"></div>
        <div className="h-8 bg-white/20 rounded w-full mb-2"></div>
        <div className="h-4 bg-white/20 rounded w-2/3"></div>
    </div>
  );

  if (!hijriDate) return null;

  // Check if today is a major event
  const todayEvent = majorEvents.find(
    event => event.day === parseInt(hijriDate.day) && event.month === parseInt(hijriDate.month.number)
  );

  // If today is not a major event, don't show the card
  if (!todayEvent) return null;

  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/10 p-5 rounded-3xl w-full max-w-md flex items-center gap-5 hover:bg-white/15 transition-all group overflow-hidden relative">
      {/* Decorative Moon */}
      <div className="absolute -right-4 -top-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <span className="material-symbols-rounded text-8xl text-white">brightness_3</span>
      </div>

      <div className="flex flex-col items-center justify-center min-w-[70px] h-[70px] bg-emerald-500/20 rounded-2xl border border-emerald-400/30 text-emerald-100">
        <span className="text-2xl font-black leading-none">{hijriDate.day}</span>
        <span className="text-[10px] font-bold uppercase tracking-tighter opacity-80">{hijriDate.month.en.substring(0, 3)}</span>
      </div>

      <div className="flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black text-amber-400 animate-pulse uppercase tracking-widest">Hari Besar Islam</span>
            <span className="w-1 h-1 rounded-full bg-white/30"></span>
            <span className="text-[10px] font-bold text-white/50">{hijriDate.year} H</span>
        </div>
        <h4 className="text-white font-black text-lg tracking-tight leading-tight mb-2">
            {todayEvent.name}
        </h4>
        <p className="text-[10px] font-medium text-emerald-100/70">
            {hijriDate.day} {hijriDate.month.en} {hijriDate.year}
        </p>
        
        <div className="flex flex-wrap gap-2">
            {holidays.map((h, i) => (
                <div key={i} className={`px-2 py-0.5 rounded-full text-[9px] font-bold border transition-colors ${i === 0 && h.month === parseInt(hijriDate.month.number) && h.day === parseInt(hijriDate.day) ? 'bg-amber-500 border-amber-400 text-white animate-pulse' : 'bg-white/5 border-white/10 text-white/70'}`}>
                    {h.name}
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default IslamicCalendarCard;
