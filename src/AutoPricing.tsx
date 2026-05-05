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
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-indigo-500 selection:text-white flex flex-col">
      {/* Header */}
      <header className="w-full z-30 bg-black border-b border-zinc-900 sticky top-0 h-14 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
              onClick={() => navigate('/')}
              className="flex items-center justify-center w-9 h-9 bg-zinc-900 border border-zinc-800 active:bg-zinc-800 text-zinc-400 rounded-lg transition-all"
            >
              <Home className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-500" />
            <span className="font-bold text-lg tracking-tight">Tính Cước Xe</span>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 overflow-y-auto w-full max-w-4xl mx-auto space-y-4">
        
        {/* Form Selection */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block text-[11px] font-bold text-zinc-500 mb-1.5 uppercase tracking-wider">
                        Loại xe
                    </label>
                    <select 
                        value={carType}
                        onChange={e => setCarType(e.target.value)}
                        className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition-colors"
                    >
                        {['4 chỗ', '7 chỗ', '9 chỗ', '16 chỗ', '29 chỗ'].map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-[11px] font-bold text-zinc-500 mb-1.5 uppercase tracking-wider">
                        Nhiên liệu
                    </label>
                    <div className="flex gap-2">
                        {['Xăng', 'Điện'].map(t => (
                            <label key={t} className={`flex-1 flex items-center justify-center py-2 rounded-lg border cursor-pointer text-xs font-bold transition-all ${fuelType === t ? 'bg-blue-600 border-blue-500 text-white' : 'bg-black border-zinc-800 text-zinc-500 active:bg-zinc-900'}`}>
                                <input type="radio" name="fuelType" value={t} checked={fuelType === t} onChange={() => setFuelType(t)} className="hidden" />
                                {t}
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="relative" ref={departureRef}>
                    <label className="block text-[11px] font-bold text-zinc-500 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-emerald-500" /> Điểm đi
                    </label>
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="Nhập nơi đi..."
                            value={departure}
                            onChange={(e) => {
                                setDeparture(e.target.value);
                                if (e.target.value === '') setDepartureLocation(null);
                            }}
                            className="w-full bg-black border border-zinc-800 rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:border-emerald-500 transition-colors text-white placeholder-zinc-700"
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                    </div>

                    {departureResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden z-20">
                            {departureResults.map((loc, i) => (
                                <button key={i} onClick={() => selectDeparture(loc)} className="w-full text-left px-3 py-2 hover:bg-zinc-800 border-b border-zinc-800 last:border-0 text-sm">
                                    <div className="font-bold text-zinc-300 truncate">{loc.display_name.split(',')[0]}</div>
                                    <div className="text-[10px] text-zinc-500 truncate">{loc.display_name}</div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="relative" ref={destinationRef}>
                    <label className="block text-[11px] font-bold text-zinc-500 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-red-500" /> Điểm đến
                    </label>
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="Nhập nơi đến..."
                            value={destination}
                            onChange={(e) => {
                                setDestination(e.target.value);
                                if (e.target.value === '') setDestinationLocation(null);
                            }}
                            className="w-full bg-black border border-zinc-800 rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:border-red-500 transition-colors text-white placeholder-zinc-700"
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                    </div>
                    {destinationResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden z-20">
                            {destinationResults.map((loc, i) => (
                                <button key={i} onClick={() => selectDestination(loc)} className="w-full text-left px-3 py-2 hover:bg-zinc-800 border-b border-zinc-800 last:border-0 text-sm">
                                    <div className="font-bold text-zinc-300 truncate">{loc.display_name.split(',')[0]}</div>
                                    <div className="text-[10px] text-zinc-500 truncate">{loc.display_name}</div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <button 
                onClick={calculateFares}
                disabled={isCalculating || !departureLocation || !destinationLocation}
                className="w-full mt-6 bg-blue-600 active:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20"
            >
                {isCalculating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
                {isCalculating ? 'Đang tính toán...' : 'Dự toán chuyến đi'}
            </button>
            
            {error && <div className="mt-4 p-3 bg-red-900/20 border border-red-500/20 text-red-400 rounded-lg text-[11px] text-center">{error}</div>}
        </div>

        {/* Results */}
        {routes.length > 0 && (
            <div className="space-y-4 pb-10">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center px-4">Đã tìm thấy {routes.length} lộ trình phù hợp</p>
                
                <div className="grid grid-cols-1 gap-4">
                    {routes.map((route, index) => (
                        <div key={index} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50">
                                <div>
                                    <h4 className="font-bold text-white text-sm">{route.name}</h4>
                                    <p className="text-[10px] text-zinc-500">{route.duration}</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-black text-blue-500">{route.distance} <span className="text-[10px]">km</span></div>
                                </div>
                            </div>
                            
                            <div className="p-4 space-y-4">
                                <div className="bg-black/40 rounded-lg p-3 text-[11px] text-zinc-400 italic">
                                    "{route.note}"
                                </div>
                                
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[11px] font-bold text-zinc-500 uppercase">
                                        <span>Phí cầu đường ({route.tollBooths.length})</span>
                                        <span className="text-yellow-500">{formatCurrency(route.totalTollFee)}</span>
                                    </div>
                                    {route.tollBooths.length > 0 && (
                                        <div className="grid grid-cols-1 gap-1 pl-2 border-l border-zinc-800">
                                            {route.tollBooths.slice(0, 3).map((b, i) => (
                                                <div key={i} className="flex justify-between text-[10px] text-zinc-500">
                                                    <span className="truncate pr-4">{b.name}</span>
                                                    <span>{formatCurrency(b.fee)}</span>
                                                </div>
                                            ))}
                                            {route.tollBooths.length > 3 && <div className="text-[9px] text-zinc-600">...và {route.tollBooths.length - 3} trạm khác</div>}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
                                        <div className="text-[9px] text-emerald-500/80 mb-0.5 font-bold uppercase tracking-wider">Giá khách</div>
                                        <div className="text-base font-black text-emerald-400">{formatCurrency(route.proposedPrice)}</div>
                                    </div>
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                                        <div className="text-[9px] text-red-500/80 mb-0.5 font-bold uppercase tracking-wider">Giá lủng sàn</div>
                                        <div className="text-base font-black text-red-400">{formatCurrency(route.lowestPrice)}</div>
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
