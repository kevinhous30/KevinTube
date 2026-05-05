import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, MapPin, Search, Navigation, Calculator, Car, Fuel, Loader2, ArrowRight } from 'lucide-react';
import { GoogleGenAI, Type, Schema } from '@google/genai';

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

  // Click outside to close autocomplete
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
      
      if (type === 'departure') {
        setDepartureResults(data);
      } else {
        setDestinationResults(data);
      }
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
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [departure]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (destination && destination !== destinationLocation?.display_name) {
        searchLocation(destination, 'destination');
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [destination]);

  const selectDeparture = (loc: Location) => {
    setDeparture(loc.display_name);
    setDepartureLocation(loc);
    setDepartureResults([]);
  };

  const selectDestination = (loc: Location) => {
    setDestination(loc.display_name);
    setDestinationLocation(loc);
    setDestinationResults([]);
  };

  const calculateFares = async () => {
    if (!departureLocation || !destinationLocation) {
      setError("Vui lòng chọn Điểm đi và Điểm đến từ danh sách gợi ý.");
      return;
    }

    setIsCalculating(true);
    setError(null);
    setRoutes([]);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        setError("Missing GEMINI_API_KEY environment variable. Vui lòng kiểm tra cấu hình trong Settings.");
        setIsCalculating(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      
       const responseSchema: Schema = {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Tên tuyến đường, ví dụ: Qua cao tốc Pháp Vân" },
              distance: { type: Type.NUMBER, description: "Khoảng cách tính bằng km (chỉ là số)" },
              duration: { type: Type.STRING, description: "Thời gian di chuyển dự kiến, ví dụ: 2 giờ 30 phút" },
              tollBooths: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: "Tên trạm thu phí" },
                    fee: { type: Type.INTEGER, description: "Phí qua trạm bằng VNĐ" }
                  },
                  required: ["name", "fee"]
                }
              },
              totalTollFee: { type: Type.INTEGER, description: "Tổng phí qua trạm bằng VNĐ" },
              proposedPrice: { type: Type.INTEGER, description: "Giá hợp đồng đề xuất thu của khách bằng VNĐ" },
              lowestPrice: { type: Type.INTEGER, description: "Giá hợp đồng thấp nhất để đảm bảo lợi nhuận bằng VNĐ" },
              note: { type: Type.STRING, description: "Ghi chú thêm nếu có lợi thế/bất lợi của tuyến đường" }
            },
            required: ["name", "distance", "duration", "tollBooths", "totalTollFee", "proposedPrice", "lowestPrice", "note"]
          }
       };

      const prompt = `Bạn là một chuyên gia điều hành xe dịch vụ tại Việt Nam.
Tôi muốn bạn tính cước xe cho một chuyến đi với các thông tin sau:
- Loại xe: ${carType}
- Loại nhiên liệu: ${fuelType}
- Điểm đi: ${departureLocation.display_name}
- Điểm đến: ${destinationLocation.display_name}

Dựa trên thông tin địa lý Việt Nam thực tế, hãy ước lượng ÍT NHẤT 2 HOẶC 3 tuyến đường khả thi để đi từ điểm đi tới điểm đến (ví dụ: một đường cao tốc nếu có, một đường quốc lộ, vv.).
Với mỗi tuyến đường: 
- Liệt kê CÁC TÊN TRẠM THU PHÍ (nếu có) trên tuyến đường đó và phí ước tính áp dụng cho BIỂU PHÍ CỦA LOẠI XE ${carType}. Nếu không có trạm nào thì mảng tollBooths để rỗng.
- Tính tổng tiền phí cầu đường.
- Ước lượng quãng đường.
- Gợi ý giá tiền thu khách (đã bao gồm xăng xe, cầu đường, lương tài xế, hao mòn, lợi nhuận) sao cho hợp lý so với giá thị trường Việt Nam. Ghi nhớ xe ${fuelType} thì chi phí nhiên liệu sẽ khác nhau (xe điện thường tiết kiệm hơn).
- Gợi ý giá thu thấp nhất để vẫn đảm bảo lợi nhuận (giá lủng sàn).
- Đảm bảo trả số lượng phần tử mảng nhiều hơn 1 nếu có thể. Khác biệt giữa các lộ trình nên ở việc đi cao tốc hoặc không, hoặc đi hướng khác.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: responseSchema,
          temperature: 0.2,
        }
      });

      const text = response.text;

      if (text) {
        const routesResult = JSON.parse(text) as RouteSuggestion[];
        setRoutes(routesResult);
      } else {
        setError("AI không thể tạo ra kết quả. Vui lòng thử lại.");
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Đã có lỗi xảy ra trong quá trình tính toán tuyến đường.");
    } finally {
      setIsCalculating(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col">
      {/* Header */}
      <header className="w-full bg-zinc-900 border-b border-zinc-800 h-20 px-6 flex items-center justify-between sticky top-0 z-[100]">
        <div className="flex items-center gap-4">
          <button 
              onClick={() => navigate('/')}
              className="w-12 h-12 bg-black border border-zinc-700 rounded-xl flex items-center justify-center active:bg-zinc-800 transition-colors"
            >
              <Home className="w-6 h-6 text-zinc-300" />
          </button>
          <div className="flex items-center gap-3">
            <Calculator className="w-6 h-6 text-blue-500" />
            <h1 className="font-bold text-2xl tracking-tight">Tính Cước Xe</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 overflow-y-auto w-full max-w-4xl mx-auto space-y-6">
        
        {/* Form Selection */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <label className="block text-sm font-black text-zinc-500 mb-2 uppercase tracking-widest flex items-center gap-2">
                        <Car className="w-4 h-4 text-zinc-600" /> Loại xe
                    </label>
                    <select 
                        value={carType}
                        onChange={e => setCarType(e.target.value)}
                        className="w-full bg-black border border-zinc-700 rounded-2xl px-5 py-4 text-lg font-bold outline-none focus:border-blue-500 transition-colors appearance-none cursor-pointer"
                    >
                        {['4 chỗ', '7 chỗ', '9 chỗ', '16 chỗ', '29 chỗ'].map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-black text-zinc-500 mb-2 uppercase tracking-widest flex items-center gap-2">
                        <Fuel className="w-4 h-4 text-zinc-600" /> Nhiên liệu
                    </label>
                    <div className="flex gap-3">
                        {['Xăng', 'Điện'].map(t => (
                            <button
                                key={t}
                                onClick={() => setFuelType(t)}
                                className={`flex-1 py-4 rounded-2xl border-2 font-bold text-lg transition-all ${fuelType === t ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-900/40' : 'bg-black border-zinc-700 text-zinc-500 hover:border-zinc-500'}`}
                            >
                                {t === 'Xăng' ? '⛽ Xăng' : '⚡ Điện'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="relative" ref={departureRef}>
                    <label className="block text-sm font-black text-zinc-500 mb-2 uppercase tracking-widest flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-emerald-500" /> Điểm xuất phát
                    </label>
                    <div className="relative group">
                        <input 
                            type="text" 
                            placeholder="Nhập địa chỉ bắt đầu..."
                            value={departure}
                            onChange={(e) => {
                                setDeparture(e.target.value);
                                if (e.target.value === '') setDepartureLocation(null);
                            }}
                            className="w-full bg-black border border-zinc-700 rounded-2xl pl-14 pr-6 py-4 text-lg outline-none focus:border-emerald-500 transition-all text-white placeholder:text-zinc-800"
                        />
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-zinc-600 group-focus-within:text-emerald-500" />
                    </div>

                    {departureResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-800 border border-zinc-700 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden z-[1000]">
                            {departureResults.map((loc, i) => (
                                <button key={i} onClick={() => selectDeparture(loc)} className="w-full text-left px-5 py-4 hover:bg-zinc-700 border-b border-zinc-700 last:border-0 transition-colors">
                                    <div className="font-bold text-white text-base truncate">{loc.display_name.split(',')[0]}</div>
                                    <div className="text-xs text-zinc-400 truncate mt-1">{loc.display_name}</div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="relative" ref={destinationRef}>
                    <label className="block text-sm font-black text-zinc-500 mb-2 uppercase tracking-widest flex items-center gap-2">
                        <Navigation className="w-4 h-4 text-red-500" /> Điểm đến
                    </label>
                    <div className="relative group">
                        <input 
                            type="text" 
                            placeholder="Nhập địa chỉ kết thúc..."
                            value={destination}
                            onChange={(e) => {
                                setDestination(e.target.value);
                                if (e.target.value === '') setDestinationLocation(null);
                            }}
                            className="w-full bg-black border border-zinc-700 rounded-2xl pl-14 pr-6 py-4 text-lg outline-none focus:border-red-500 transition-all text-white placeholder:text-zinc-800"
                        />
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-zinc-600 group-focus-within:text-red-500" />
                    </div>
                    {destinationResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-800 border border-zinc-700 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden z-[1000]">
                            {destinationResults.map((loc, i) => (
                                <button key={i} onClick={() => selectDestination(loc)} className="w-full text-left px-5 py-4 hover:bg-zinc-700 border-b border-zinc-700 last:border-0 transition-colors">
                                    <div className="font-bold text-white text-base truncate">{loc.display_name.split(',')[0]}</div>
                                    <div className="text-xs text-zinc-400 truncate mt-1">{loc.display_name}</div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <button 
                onClick={calculateFares}
                disabled={isCalculating || !departureLocation || !destinationLocation}
                className="w-full mt-10 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] disabled:opacity-30 disabled:active:scale-100 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 transition-all text-xl shadow-xl shadow-blue-900/30"
            >
                {isCalculating ? <Loader2 className="w-6 h-6 animate-spin" /> : <Calculator className="w-6 h-6" />}
                {isCalculating ? 'ĐANG TÍNH TOÁN...' : 'BẮT ĐẦU DỰ TOÁN'}
            </button>
            
            {error && (
              <div className="mt-6 p-4 bg-red-900/30 border border-red-500/30 text-red-400 rounded-xl text-center text-sm font-medium">
                {error}
              </div>
            )}
        </div>

        {/* Results */}
        {routes.length > 0 && (
            <div className="space-y-6 pb-20">
                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-zinc-800"></div>
                  <p className="text-xs font-black text-zinc-500 uppercase tracking-[0.3em]">Kết quả lộ trình</p>
                  <div className="h-px flex-1 bg-zinc-800"></div>
                </div>
                
                <div className="grid grid-cols-1 gap-6">
                    {routes.map((route, index) => (
                        <div key={index} className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                            <div className="p-8 border-b border-zinc-800 bg-gradient-to-r from-zinc-800/20 to-transparent flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="px-2 py-0.5 bg-blue-600 text-[10px] font-black rounded uppercase tracking-tighter">Option {index + 1}</span>
                                      <h4 className="font-bold text-white text-2xl">{route.name}</h4>
                                    </div>
                                    <div className="flex items-center gap-4 text-zinc-500 font-bold text-sm uppercase tracking-widest">
                                      <span>⏱️ {route.duration}</span>
                                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-700"></span>
                                      <span>📍 {route.distance} KM</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-8 space-y-8">
                                <div className="bg-black p-6 rounded-2xl text-lg text-zinc-400 italic border-l-4 border-blue-600 leading-relaxed capitalize">
                                    "{route.note}"
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                  <div className="space-y-4">
                                      <div className="flex justify-between text-xs font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2">
                                          <span>Phí cầu đường</span>
                                          <span className="text-yellow-500">{formatCurrency(route.totalTollFee)}</span>
                                      </div>
                                      {route.tollBooths.length > 0 ? (
                                          <div className="space-y-3">
                                              {route.tollBooths.map((b, i) => (
                                                  <div key={i} className="flex justify-between text-sm font-medium">
                                                      <span className="text-zinc-400">{i+1}. {b.name}</span>
                                                      <span className="text-zinc-500">{formatCurrency(b.fee)}</span>
                                                  </div>
                                              ))}
                                          </div>
                                      ) : (
                                        <div className="bg-zinc-800/30 rounded-xl p-4 text-center text-zinc-600 text-sm font-bold">
                                          Không có trạm thu phí
                                        </div>
                                      )}
                                  </div>

                                  <div className="flex flex-col gap-4">
                                      <div className="flex-1 bg-[#1a1a1a] border border-emerald-500/20 rounded-3xl p-6 flex flex-col items-center justify-center text-center shadow-lg">
                                          <div className="text-[11px] text-emerald-500 font-black mb-2 uppercase tracking-widest">Giá niêm yết</div>
                                          <div className="text-3xl font-black text-emerald-400 tracking-tight">{formatCurrency(route.proposedPrice)}</div>
                                      </div>
                                      <div className="flex-1 bg-[#1a1a1a] border border-red-500/20 rounded-3xl p-6 flex flex-col items-center justify-center text-center shadow-lg">
                                          <div className="text-[11px] text-red-500 font-black mb-2 uppercase tracking-widest">Giá sàn tối thiểu</div>
                                          <div className="text-3xl font-black text-red-400 tracking-tight">{formatCurrency(route.lowestPrice)}</div>
                                      </div>
                                  </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </main>
    </div>
  );
}
