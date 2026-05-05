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
      {/* Background Decor - Simplified for Car */}
      <div className="fixed inset-0 bg-black pointer-events-none"></div>

      {/* Header - Solid background for car accessibility */}
      <header className="fixed top-0 w-full z-[100] h-20 px-8 flex items-center justify-between bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-6">
          <button 
             onClick={() => navigate('/')}
             className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center active:scale-90"
          >
            <Home className="w-5 h-5 text-zinc-400" />
          </button>
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-blue-700 rounded-xl flex items-center justify-center">
                <Calculator className="w-5 h-5 text-white" />
             </div>
             <h1 className="font-display font-black text-xl tracking-tighter uppercase italic">Tính Cước</h1>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-4 px-4 py-2 rounded-xl bg-zinc-800 border border-zinc-700">
           <Gauge className="w-4 h-4 text-blue-500" />
           <span className="text-[9px] font-black tracking-widest text-zinc-400 uppercase">AI ACTIVE</span>
        </div>
      </header>

      <main className="pt-28 pb-40 px-6 max-w-4xl mx-auto z-10 relative">
        <motion.div 
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl space-y-8"
        >
          {/* Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Car className="w-4 h-4 text-zinc-600" /> Phương tiện
              </label>
              <div className="grid grid-cols-3 gap-2">
                 {['4 chỗ', '7 chỗ', '16 chỗ'].map(t => (
                    <button 
                      key={t}
                      onClick={() => setCarType(t)}
                      className={`py-3 rounded-xl border-2 font-bold transition-all text-xs ${carType === t ? 'bg-white text-black border-white' : 'bg-black border-zinc-800 text-zinc-500'}`}
                    >
                      {t}
                    </button>
                 ))}
              </div>
            </div>
            <div>
              <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Fuel className="w-4 h-4 text-zinc-600" /> Động lực
              </label>
              <div className="flex gap-2">
                {['Xăng', 'Điện'].map(t => (
                  <button
                    key={t}
                    onClick={() => setFuelType(t)}
                    className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all text-xs ${fuelType === t ? 'bg-blue-700 border-blue-600 text-white' : 'bg-black border-zinc-800 text-zinc-500'}`}
                  >
                    {t === 'Xăng' ? '⛽ Xăng' : '⚡ Điện'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="h-px bg-zinc-800"></div>

          {/* Locations */}
          <div className="space-y-6">
            <div className="relative" ref={departureRef}>
              <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-500" /> Điểm đi
              </label>
              <div className="relative group">
                <input 
                  type="text" 
                  placeholder="Nhập địa điểm đi..."
                  value={departure}
                  onChange={(e) => { setDeparture(e.target.value); if (e.target.value === '') setDepartureLocation(null); }}
                  className="w-full bg-black border border-zinc-800 rounded-2xl pl-12 pr-10 py-3.5 text-base outline-none focus:border-blue-500 transition-all text-white placeholder:text-zinc-700 font-medium"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
                {departure && <button onClick={() => setDeparture('')} className="absolute right-4 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-zinc-500" /></button>}
              </div>

              <AnimatePresence>
                {departureResults.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute top-full left-0 right-0 mt-2 h-72 overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-[1000] no-scrollbar"
                  >
                    {departureResults.map((loc, i) => (
                      <button key={i} onClick={() => { setDeparture(loc.display_name); setDepartureLocation(loc); setDepartureResults([]); }} className="w-full text-left px-6 py-4 hover:bg-zinc-800 border-b border-zinc-800/50 transition-colors">
                        <div className="font-bold text-white text-sm truncate">{loc.display_name.split(',')[0]}</div>
                        <div className="text-[10px] text-zinc-500 truncate mt-1 tracking-wider">{loc.display_name}</div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="relative" ref={destinationRef}>
              <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Navigation className="w-4 h-4 text-red-500" /> Điểm đến
              </label>
              <div className="relative group">
                <input 
                  type="text" 
                  placeholder="Nhập địa điểm đến..."
                  value={destination}
                  onChange={(e) => { setDestination(e.target.value); if (e.target.value === '') setDestinationLocation(null); }}
                  className="w-full bg-black border border-zinc-800 rounded-2xl pl-12 pr-10 py-3.5 text-base outline-none focus:border-red-500 transition-all text-white placeholder:text-zinc-700 font-medium"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
                {destination && <button onClick={() => setDestination('')} className="absolute right-4 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-zinc-500" /></button>}
              </div>
              <AnimatePresence>
                {destinationResults.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute top-full left-0 right-0 mt-2 h-72 overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-[1000] no-scrollbar"
                  >
                    {destinationResults.map((loc, i) => (
                      <button key={i} onClick={() => { setDestination(loc.display_name); setDestinationLocation(loc); setDestinationResults([]); }} className="w-full text-left px-6 py-4 hover:bg-zinc-800 border-b border-zinc-800/50 transition-colors">
                        <div className="font-bold text-white text-sm truncate">{loc.display_name.split(',')[0]}</div>
                        <div className="text-[10px] text-zinc-500 truncate mt-1 tracking-wider">{loc.display_name}</div>
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
            className="w-full bg-blue-700 hover:bg-blue-600 disabled:bg-zinc-900 disabled:text-zinc-700 border border-blue-600/20 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 transition-all text-lg"
          >
            {isCalculating ? <Loader2 className="w-6 h-6 animate-spin" /> : <Calculator className="w-6 h-6" />}
            {isCalculating ? 'ĐANG DỰ TOÁN...' : 'TÍNH CƯỚC NGAY'}
          </button>
          
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 flex items-start gap-4 rounded-xl bg-red-900/30 border border-red-900/50"
              >
                <Info className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-red-400 text-xs font-bold leading-relaxed">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Results Stream */}
        <AnimatePresence>
          {routes.length > 0 && (
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="mt-12 space-y-10"
            >
                <div className="flex items-center gap-4">
                   <h2 className="text-2xl font-display font-black italic tracking-tighter uppercase shrink-0">Lộ trình <span className="text-blue-500">tối ưu</span></h2>
                   <div className="h-px w-full bg-zinc-800"></div>
                </div>
                
                {routes.map((route, index) => (
                    <div key={index} className="bg-zinc-900 border border-zinc-800 rounded-[2rem] overflow-hidden shadow-2xl">
                        <div className="p-8 border-b border-zinc-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="px-2 py-0.5 bg-blue-700 rounded text-[9px] font-black uppercase tracking-widest text-white">R0{index + 1}</span>
                                  <h4 className="font-display font-black text-xl italic uppercase tracking-tighter">{route.name}</h4>
                                </div>
                                <div className="flex items-center gap-4 text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                                   <div className="flex items-center gap-2">
                                      <Clock className="w-3 h-3 text-blue-500" /> {route.duration}
                                   </div>
                                   <div className="flex items-center gap-2">
                                      <MapPin className="w-3 h-3 text-emerald-500" /> {route.distance} KM
                                   </div>
                                </div>
                            </div>
                            <div className="bg-emerald-950/30 px-4 py-2 rounded-xl border border-emerald-900/50">
                               <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">System Verified</span>
                            </div>
                        </div>
                        
                        <div className="p-8 space-y-8">
                            <div className="bg-black p-6 rounded-2xl border border-zinc-800">
                                <p className="text-sm text-zinc-400 font-medium italic leading-relaxed">"{route.note}"</p>
                            </div>
                            
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                              <div className="space-y-4">
                                  <div className="flex justify-between items-end pb-2 border-b border-zinc-800">
                                      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Cầu đường</span>
                                      <span className="text-base font-black text-white">{formatCurrency(route.totalTollFee)}</span>
                                  </div>
                                  {route.tollBooths.length > 0 ? (
                                      <div className="space-y-2">
                                          {route.tollBooths.map((b, i) => (
                                              <div key={i} className="flex justify-between items-center bg-zinc-800/50 p-3 rounded-xl border border-zinc-800">
                                                  <span className="text-[10px] font-bold text-zinc-300">{b.name}</span>
                                                  <span className="text-[10px] font-black text-zinc-500">{formatCurrency(b.fee)}</span>
                                              </div>
                                          ))}
                                      </div>
                                  ) : null}
                              </div>

                              <div className="flex flex-col gap-4">
                                  <div className="bg-emerald-900/20 border border-emerald-800/50 rounded-2xl p-6 text-center">
                                      <div className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500 mb-1">Dự toán thu khách</div>
                                      <div className="text-3xl font-display font-black text-white italic tracking-tighter">{formatCurrency(route.proposedPrice)}</div>
                                  </div>
                                  <div className="bg-zinc-800/50 border border-zinc-800 rounded-xl p-4 text-center">
                                      <div className="text-[8px] font-black uppercase tracking-widest text-zinc-600">Giá sàn bảo hòa</div>
                                      <div className="text-lg font-display font-black text-white/40">{formatCurrency(route.lowestPrice)}</div>
                                  </div>
                              </div>
                            </div>
                        </div>
                    </div>
                ))}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
