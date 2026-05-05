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
      // @ts-ignore
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : undefined);
      if (!apiKey) {
        setError("Missing GEMINI API KEY. Nếu bạn deploy trên Vercel, hãy thêm biến môi trường VITE_GEMINI_API_KEY trong Project Settings > Environment Variables nhé.");
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
              distance: { type: Type.NUMBER, description: "Khoảng cách tính bằng km" },
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

Dựa trên thông tin địa lý Việt Nam thực tế, hãy ước lượng các tuyến đường khả thi nhất để đi từ điểm đi tới điểm đến. 
Với mỗi tuyến đường: 
- Liệt kê CÁC TÊN TRẠM THU PHÍ (nếu có) trên tuyến đường đó và phí ước tính áp dụng cho BIỂU PHÍ CỦA LOẠI XE ${carType}.
- Tính tổng tiền phí cầu đường.
- Ước lượng quãng đường.
- Gợi ý giá tiền thu khách (đã bao gồm xăng xe, cầu đường, lương tài xế, hao mòn, lợi nhuận) sao cho hợp lý so với giá thị trường Việt Nam. Ghi nhớ xe ${fuelType} thì chi phí nhiên liệu sẽ khác nhau (xe điện thường tiết kiệm hơn).
- Gợi ý giá thu thấp nhất để vẫn đảm bảo lợi nhuận (giá lủng sàn).`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: responseSchema,
          temperature: 0.2, // Low temp for more accurate data representation
        }
      });

      if (response.text) {
        const result = JSON.parse(response.text) as RouteSuggestion[];
        setRoutes(result);
      } else {
        setError("AI không thể tạo ra kết quả. Vui lòng thử lại.");
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Đã có lỗi xảy ra trong quá trình tính toán.");
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
      <header className="w-full z-30 bg-zinc-950 border-b border-zinc-900 sticky top-0">
        <div className="max-w-[1600px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
                onClick={() => navigate('/')}
                className="flex items-center justify-center w-10 h-10 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-all focus:outline-none"
                title="Back to Dashboard"
              >
                <Home className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                 <Calculator className="w-5 h-5 text-indigo-400" />
              </div>
              <span className="font-display font-bold text-xl tracking-tight hidden sm:block">Auto Tính Cước Xe</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 sm:p-8 lg:p-12 overflow-y-auto w-full max-w-7xl mx-auto space-y-8">
        
        {/* Form Selection */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 sm:p-8">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-white">
                <Navigation className="w-5 h-5 text-indigo-400" />
                Thông tin hành trình
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2 flex items-center gap-2">
                        <Car className="w-4 h-4" /> Loại xe
                    </label>
                    <select 
                        value={carType}
                        onChange={e => setCarType(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-colors appearance-none"
                    >
                        {['4 chỗ', '7 chỗ', '9 chỗ', '16 chỗ', '29 chỗ'].map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2 flex items-center gap-2">
                        <Fuel className="w-4 h-4" /> Loại nhiên liệu
                    </label>
                    <div className="flex gap-4">
                        {['Xăng', 'Điện'].map(t => (
                            <label key={t} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border cursor-pointer transition-colors ${fuelType === t ? 'bg-indigo-500/10 border-indigo-500 text-indigo-300' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}>
                                <input 
                                    type="radio" 
                                    name="fuelType" 
                                    value={t} 
                                    checked={fuelType === t} 
                                    onChange={() => setFuelType(t)}
                                    className="hidden" 
                                />
                                {t}
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="relative" ref={departureRef}>
                    <label className="block text-sm font-medium text-zinc-400 mb-2 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-emerald-400" /> Điểm đi
                    </label>
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="Nhập địa chỉ, tên đường, khu vực..."
                            value={departure}
                            onChange={(e) => {
                                setDeparture(e.target.value);
                                if (e.target.value === '') {
                                    setDepartureLocation(null);
                                }
                            }}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-11 pr-4 py-3 outline-none focus:border-emerald-500 transition-colors text-white placeholder-zinc-600"
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    </div>

                    {departureResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl overflow-hidden z-20">
                            {departureResults.map((loc, i) => (
                                <button 
                                    key={i}
                                    onClick={() => selectDeparture(loc)}
                                    className="w-full text-left px-4 py-3 hover:bg-zinc-700 border-b border-zinc-700/50 last:border-0 transition-colors"
                                >
                                    <div className="font-medium text-zinc-200 line-clamp-1">{loc.display_name.split(',')[0]}</div>
                                    <div className="text-sm text-zinc-400 line-clamp-1">{loc.display_name}</div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="relative" ref={destinationRef}>
                    <label className="block text-sm font-medium text-zinc-400 mb-2 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-red-400" /> Điểm đến
                    </label>
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="Nhập địa chỉ, tên đường, khu vực..."
                            value={destination}
                            onChange={(e) => {
                                setDestination(e.target.value);
                                if (e.target.value === '') {
                                    setDestinationLocation(null);
                                }
                            }}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-11 pr-4 py-3 outline-none focus:border-red-500 transition-colors text-white placeholder-zinc-600"
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    </div>
                    {destinationResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl overflow-hidden z-20">
                            {destinationResults.map((loc, i) => (
                                <button 
                                    key={i}
                                    onClick={() => selectDestination(loc)}
                                    className="w-full text-left px-4 py-3 hover:bg-zinc-700 border-b border-zinc-700/50 last:border-0 transition-colors"
                                >
                                    <div className="font-medium text-zinc-200 line-clamp-1">{loc.display_name.split(',')[0]}</div>
                                    <div className="text-sm text-zinc-400 line-clamp-1">{loc.display_name}</div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

             {/* Action Button */}
            <div className="mt-8 flex justify-end">
                <button 
                  onClick={calculateFares}
                  disabled={isCalculating || !departureLocation || !destinationLocation}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                >
                  {isCalculating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Đang xử lý AI...
                    </>
                  ) : (
                    <>
                      Dự toán chuyến đi
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
            </div>
            
            {error && (
                <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">
                    {error}
                </div>
            )}
        </div>

        {/* Results */}
        {routes.length > 0 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
                <h3 className="text-2xl font-bold font-display flex items-center gap-3">
                   Tìm thấy <span className="text-indigo-400">{routes.length}</span> tuyến đường khả thi
                </h3>
                
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {routes.map((route, index) => (
                        <div key={index} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 flex flex-col hover:border-indigo-500/30 transition-colors">
                            <div className="flex justify-between items-start gap-4 mb-4">
                                <div>
                                    <div className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-800/50 px-2.5 py-0.5 text-xs font-semibold text-zinc-300 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 mb-3">
                                        Lộ trình {index + 1}
                                    </div>
                                    <h4 className="text-xl font-bold text-white leading-tight">{route.name}</h4>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className="text-2xl font-display font-bold text-indigo-400">{route.distance} km</div>
                                    <div className="text-sm text-zinc-500">{route.duration}</div>
                                </div>
                            </div>
                            
                            <p className="text-sm text-zinc-400 mb-6 italic border-l-2 border-zinc-700 pl-3">
                                "{route.note}"
                            </p>
                            
                            <div className="bg-zinc-950 rounded-2xl p-5 mb-6 flex-1">
                                <h5 className="text-sm font-medium text-zinc-300 mb-4 flex items-center justify-between">
                                    <span>Trạm Thu Phí Dự Kiến ({route.tollBooths.length})</span>
                                    <span className="text-zinc-500 font-normal">Tổng: <span className="text-yellow-400/90 font-medium">{formatCurrency(route.totalTollFee)}</span></span>
                                </h5>
                                
                                {route.tollBooths.length === 0 ? (
                                    <div className="text-sm text-emerald-400/80 bg-emerald-400/10 py-2 border border-emerald-400/20 px-3 rounded-lg flex items-center justify-center">
                                        Không có trạm thu phí trên tuyến đường này
                                    </div>
                                ) : (
                                    <ul className="space-y-2">
                                        {route.tollBooths.map((booth, i) => (
                                            <li key={i} className="flex justify-between items-center text-sm">
                                                <span className="text-zinc-400 truncate pr-4">{booth.name}</span>
                                                <span className="font-mono text-zinc-300 shrink-0">{formatCurrency(booth.fee)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center">
                                    <div className="text-xs text-emerald-300/70 mb-1 font-medium uppercase tracking-wider">Giá Hợp Đồng Thu Khách</div>
                                    <div className="text-xl sm:text-2xl font-bold text-emerald-400">{formatCurrency(route.proposedPrice)}</div>
                                </div>
                                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center">
                                    <div className="text-xs text-red-300/70 mb-1 font-medium uppercase tracking-wider">Giá Thấp Nhất (Lủng Sàn)</div>
                                    <div className="text-xl sm:text-2xl font-bold text-red-400">{formatCurrency(route.lowestPrice)}</div>
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
