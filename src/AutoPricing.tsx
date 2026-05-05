import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, MapPin, Search, Navigation, Calculator, Car, Fuel, Loader2, ArrowRight, X, Info, ShieldCheck, Gauge, Clock } from 'lucide-react';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import { motion, AnimatePresence } from 'motion/react';

interface Location {
  display_name: string;
  lat: string;
  lon: string;
}

interface TollBooth {
  name: string;
  fee: number;
}

interface RouteSuggestion {
  name: string;
  distance: number;
  duration: string;
  tollBooths: TollBooth[];
  totalTollFee: number;
  proposedPrice: number;
  lowestPrice: number;
  note: string;
}

export default function AutoPricing() {
  const navigate = useNavigate();
  const [carType, setCarType] = useState('4 chỗ');
  const [fuelType, setFuelType] = useState('Xăng');
  
  const [departure, setDeparture] = useState('');
  const [departureLocation, setDepartureLocation] = useState<Location | null>(null);
  const [departureResults, setDepartureResults] = useState<Location[]>([]);
  const [isSearchingDeparture, setIsSearchingDeparture] = useState(false);
  
  const [destination, setDestination] = useState('');
  const [destinationLocation, setDestinationLocation] = useState<Location | null>(null);
  const [destinationResults, setDestinationResults] = useState<Location[]>([]);
  const [isSearchingDestination, setIsSearchingDestination] = useState(false);

  const [isCalculating, setIsCalculating] = useState(false);
  const [routes, setRoutes] = useState<RouteSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);

  const departureRef = useRef<HTMLDivElement>(null);
  const destinationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (departureRef.current && !departureRef.current.contains(event.target as Node)) {
        setDepartureResults([]);
      }
      if (destinationRef.current && !destinationRef.current.contains(event.target as Node)) {
        setDestinationResults([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchLocation = async (query: string, type: 'departure' | 'destination') => {
    if (!query) {
      if (type === 'departure') setDepartureResults([]);
      else setDestinationResults([]);
      return;
    }
    if (type === 'departure') setIsSearchingDeparture(true);
    else setIsSearchingDestination(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&countrycodes=vn&addressdetails=1&limit=5`);
      const data = await res.json();
      if (type === 'departure') setDepartureResults(data);
      else setDestinationResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      if (type === 'departure') setIsSearchingDeparture(false);
      else setIsSearchingDestination(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (departure && departure !== departureLocation?.display_name) {
        searchLocation(departure, 'departure');
      }
    }, 600);
    return () => clearTimeout(timeoutId);
  }, [departure]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (destination && destination !== destinationLocation?.display_name) {
        searchLocation(destination, 'destination');
      }
    }, 600);
    return () => clearTimeout(timeoutId);
  }, [destination]);

  const calculateFares = async () => {
    if (!departureLocation || !destinationLocation) {
      setError("Hãy chọn địa chỉ cụ thể từ danh sách gợi ý.");
      return;
    }
    setIsCalculating(true);
    setError(null);
    setRoutes([]);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        setError("Chưa cấu hình API Key. Vui lòng kiểm tra lại.");
        setIsCalculating(false);
        return;
      }
      const ai = new GoogleGenAI({ apiKey });
      const responseSchema: Schema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            distance: { type: Type.NUMBER },
            duration: { type: Type.STRING },
            tollBooths: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  fee: { type: Type.INTEGER }
                },
                required: ["name", "fee"]
              }
            },
            totalTollFee: { type: Type.INTEGER },
            proposedPrice: { type: Type.INTEGER },
            lowestPrice: { type: Type.INTEGER },
            note: { type: Type.STRING }
          },
          required: ["name", "distance", "duration", "tollBooths", "totalTollFee", "proposedPrice", "lowestPrice", "note"]
        }
      };
      const prompt = `Bạn là chuyên gia tính cước vận tải tại Việt Nam. Tính cước cho:
- Loại xe: ${carType}, Nhiên liệu: ${fuelType}
- Từ: ${departureLocation.display_name}
- Đến: ${destinationLocation.display_name}
Yêu cầu 2-3 tuyến đường (Cao tốc, quốc lộ). Phí cầu đường theo biểu giá thực tế xe ${carType} tại VN. Giá proposedPrice là giá thu khách, lowestPrice là giá bảo hòa vốn/lãi mỏng.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: responseSchema,
          temperature: 0.1,
        }
      });
      const text = response.text;
      if (text) {
        setRoutes(JSON.parse(text) as RouteSuggestion[]);
      } else {
        setError("Không thể tính toán. Vui lòng thử lại.");
      }
    } catch (err: any) {
      setError(err.message || "Lỗi hệ thống khi dự toán.");
    } finally {
      setIsCalculating(false);
    }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-600 overflow-x-hidden">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-600/5 blur-[120px] rounded-full"></div>
      </div>

      {/* Header */}
      <header className="fixed top-0 w-full z-[100] h-20 px-8 flex items-center justify-between glass border-b border-white/5">
        <div className="flex items-center gap-6">
          <button 
             onClick={() => navigate('/')}
             className="w-12 h-12 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-center hover:bg-zinc-800 transition-all active:scale-90"
          >
            <Home className="w-6 h-6 text-zinc-400" />
          </button>
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/30">
                <Calculator className="w-6 h-6 text-white" />
             </div>
             <h1 className="font-display font-black text-2xl tracking-tighter uppercase italic">Smart Pricing</h1>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-4 px-5 py-2.5 rounded-2xl bg-zinc-900/50 border border-zinc-800 shadow-xl">
           <Gauge className="w-4 h-4 text-blue-500 animate-pulse" />
           <span className="text-[10px] font-black tracking-[0.3em] text-zinc-400 uppercase">AI Processor Active</span>
        </div>
      </header>

      <main className="pt-32 pb-40 px-6 max-w-4xl mx-auto z-10 relative">
        <motion.div 
           initial={{ y: 20, opacity: 0 }}
           animate={{ y: 0, opacity: 1 }}
           className="bg-zinc-900/40 border border-zinc-800/50 rounded-[3rem] p-10 backdrop-blur-3xl shadow-2xl space-y-10"
        >
          {/* Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                <Car className="w-4 h-4 text-zinc-600" /> Phương tiện
              </label>
              <div className="grid grid-cols-3 gap-3">
                 {['4 chỗ', '7 chỗ', '16 chỗ'].map(t => (
                   <button 
                     key={t}
                     onClick={() => setCarType(t)}
                     className={`py-3.5 rounded-2xl border-2 font-bold transition-all text-sm ${carType === t ? 'bg-white text-black border-white shadow-xl translate-y-[-2px]' : 'bg-black/40 border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}
                   >
                     {t}
                   </button>
                 ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                <Fuel className="w-4 h-4 text-zinc-600" /> Hệ thống động lực
              </label>
              <div className="flex gap-3">
                {['Xăng', 'Điện'].map(t => (
                  <button
                    key={t}
                    onClick={() => setFuelType(t)}
                    className={`flex-1 py-3.5 rounded-2xl border-2 font-bold transition-all text-sm ${fuelType === t ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/40 translate-y-[-2px]' : 'bg-black/40 border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}
                  >
                    {t === 'Xăng' ? '⛽ Năng lượng hóa thạch' : '⚡ Động cơ điện'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="h-px bg-zinc-800/50"></div>

          {/* Locations */}
          <div className="space-y-8">
            <div className="relative" ref={departureRef}>
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-500" /> Lộ trình xuất phát
              </label>
              <div className="relative group">
                <input 
                  type="text" 
                  placeholder="Nhập địa điểm khởi hành..."
                  value={departure}
                  onChange={(e) => { setDeparture(e.target.value); if (e.target.value === '') setDepartureLocation(null); }}
                  className="w-full bg-black/40 border border-zinc-800 rounded-3xl pl-14 pr-12 py-4.5 text-lg outline-none focus:bg-black/60 focus:border-blue-500 transition-all text-white placeholder:text-zinc-700 font-medium"
                />
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-zinc-600 group-focus-within:text-blue-500" />
                {departure && <button onClick={() => setDeparture('')} className="absolute right-6 top-1/2 -translate-y-1/2"><X className="w-5 h-5 text-zinc-500" /></button>}
              </div>

              <AnimatePresence>
                {departureResults.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 right-0 mt-4 h-80 overflow-y-auto glass border border-white/10 rounded-[2rem] shadow-2xl z-[1000] no-scrollbar"
                  >
                    {departureResults.map((loc, i) => (
                      <button key={i} onClick={() => { setDeparture(loc.display_name); setDepartureLocation(loc); setDepartureResults([]); }} className="w-full text-left px-8 py-6 hover:bg-white/5 border-b border-white/[0.03] transition-colors group">
                        <div className="font-bold text-white text-lg truncate group-hover:text-blue-400 transition-colors">{loc.display_name.split(',')[0]}</div>
                        <div className="text-xs text-zinc-500 truncate mt-1.5 uppercase font-black tracking-widest">{loc.display_name}</div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="relative" ref={destinationRef}>
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                <Navigation className="w-4 h-4 text-red-500" /> Điểm đến mong muốn
              </label>
              <div className="relative group">
                <input 
                  type="text" 
                  placeholder="Nhập địa lý kết thúc..."
                  value={destination}
                  onChange={(e) => { setDestination(e.target.value); if (e.target.value === '') setDestinationLocation(null); }}
                  className="w-full bg-black/40 border border-zinc-800 rounded-3xl pl-14 pr-12 py-4.5 text-lg outline-none focus:bg-black/60 focus:border-red-500 transition-all text-white placeholder:text-zinc-700 font-medium"
                />
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-zinc-600 group-focus-within:text-red-500" />
                {destination && <button onClick={() => setDestination('')} className="absolute right-6 top-1/2 -translate-y-1/2"><X className="w-5 h-5 text-zinc-500" /></button>}
              </div>
              <AnimatePresence>
                {destinationResults.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 right-0 mt-4 h-80 overflow-y-auto glass border border-white/10 rounded-[2rem] shadow-2xl z-[1000] no-scrollbar"
                  >
                    {destinationResults.map((loc, i) => (
                      <button key={i} onClick={() => { setDestination(loc.display_name); setDestinationLocation(loc); setDestinationResults([]); }} className="w-full text-left px-8 py-6 hover:bg-white/5 border-b border-white/[0.03] transition-colors group">
                        <div className="font-bold text-white text-lg truncate group-hover:text-red-400 transition-colors">{loc.display_name.split(',')[0]}</div>
                        <div className="text-xs text-zinc-500 truncate mt-1.5 uppercase font-black tracking-widest">{loc.display_name}</div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <button 
            onClick={calculateFares}
            disabled={isCalculating || !departureLocation || !destinationLocation}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-900 disabled:opacity-40 disabled:border-zinc-800 border border-blue-400/20 text-white font-black py-6 rounded-3xl flex items-center justify-center gap-4 transition-all text-xl shadow-2xl shadow-blue-900/40 active:scale-95"
          >
            {isCalculating ? <Loader2 className="w-8 h-8 animate-spin" /> : <Calculator className="w-8 h-8" />}
            {isCalculating ? 'ĐANG PHÂN TÍCH...' : 'DỰ TOÁN HÀNH TRÌNH'}
          </button>
          
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="p-5 flex items-start gap-4 rounded-3xl bg-red-500/5 border border-red-500/20 glass-red"
              >
                <Info className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm font-bold leading-relaxed">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Results Stream */}
        <AnimatePresence>
          {routes.length > 0 && (
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               className="mt-20 space-y-12"
            >
                <div className="flex items-center gap-6">
                   <h2 className="text-4xl font-display font-black italic tracking-tighter uppercase shrink-0">Lộ trình <span className="text-blue-600">tối ưu</span></h2>
                   <div className="h-px w-full bg-zinc-800"></div>
                </div>
                
                {routes.map((route, index) => (
                    <motion.div 
                      initial={{ x: index % 2 === 0 ? -20 : 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: index * 0.2 }}
                      key={index} 
                      className="bg-zinc-900/40 border border-zinc-800/50 rounded-[3rem] overflow-hidden shadow-2xl glass"
                    >
                        <div className="p-10 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div>
                                <div className="flex items-center gap-3 mb-3">
                                  <span className="px-3 py-1 bg-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest text-white">ROUTE 0{index + 1}</span>
                                  <h4 className="font-display font-black text-3xl italic uppercase tracking-tighter">{route.name}</h4>
                                </div>
                                <div className="flex items-center gap-6">
                                   <div className="flex items-center gap-3">
                                      <Clock className="w-4 h-4 text-blue-500" />
                                      <span className="text-xs font-black uppercase tracking-widest text-zinc-400">{route.duration}</span>
                                   </div>
                                   <div className="w-1 h-1 rounded-full bg-zinc-800"></div>
                                   <div className="flex items-center gap-3">
                                      <MapPin className="w-4 h-4 text-emerald-500" />
                                      <span className="text-xs font-black uppercase tracking-widest text-zinc-400">{route.distance} KM</span>
                                   </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 bg-zinc-800/50 px-6 py-4 rounded-2xl border border-zinc-700">
                               <ShieldCheck className="w-5 h-5 text-emerald-500" />
                               <span className="text-xs font-black uppercase tracking-widest text-emerald-500">Verified System</span>
                            </div>
                        </div>
                        
                        <div className="p-10 space-y-10">
                            <div className="bg-black/60 p-8 rounded-[2rem] border border-white/5 relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600"></div>
                                <p className="text-lg text-zinc-400 font-medium italic relative z-10 leading-relaxed">"{route.note}"</p>
                            </div>
                            
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                              <div className="space-y-6">
                                  <div className="flex justify-between items-end pb-3 border-b border-zinc-800">
                                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Chi tiết phí cầu đường</span>
                                      <span className="text-lg font-black text-white">{formatCurrency(route.totalTollFee)}</span>
                                  </div>
                                  {route.tollBooths.length > 0 ? (
                                      <div className="space-y-3">
                                          {route.tollBooths.map((b, i) => (
                                              <div key={i} className="flex justify-between items-center bg-zinc-800/30 p-4 rounded-2xl border border-white/5">
                                                  <span className="text-xs font-bold text-zinc-300">{i+1}. {b.name}</span>
                                                  <span className="text-sm font-black text-zinc-500">{formatCurrency(b.fee)}</span>
                                              </div>
                                          ))}
                                      </div>
                                  ) : (
                                    <div className="bg-zinc-800/20 rounded-2xl p-6 text-center text-zinc-700 text-xs font-black uppercase tracking-widest border border-dashed border-zinc-800">
                                      KHÔNG PHÁT SINH PHÍ TRẠM
                                    </div>
                                  )}
                              </div>

                              <div className="grid grid-cols-1 gap-6">
                                  <div className="relative overflow-hidden bg-emerald-600/10 border border-emerald-500/20 rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center group">
                                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/5 blur-3xl rounded-full"></div>
                                      <div className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500 mb-2">Giá niêm yết thu khách</div>
                                      <div className="text-5xl font-display font-black text-white italic tracking-tighter group-hover:scale-110 transition-transform duration-500">{formatCurrency(route.proposedPrice)}</div>
                                      <div className="mt-4 px-4 py-1.5 bg-emerald-600 text-[10px] font-black text-white uppercase tracking-widest rounded-full">Recommended</div>
                                  </div>
                                  <div className="bg-zinc-900/60 border border-zinc-800 rounded-[2rem] p-6 flex flex-col items-center justify-center text-center">
                                      <div className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 mb-1">Giá sàn lủng (Hợp đồng tối thiểu)</div>
                                      <div className="text-2xl font-display font-black text-white/50">{formatCurrency(route.lowestPrice)}</div>
                                  </div>
                              </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
