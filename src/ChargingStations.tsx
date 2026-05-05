import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, BatteryCharging, ExternalLink, Map as MapIcon, ArrowLeft, Navigation2, Zap, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

export default function ChargingStations() {
  const navigate = useNavigate();
  // Using the shared link directly or an embedded version if allowed
  // For demo, we'll show an immersive UI with a button to open the real Google Map
  const mapsUrl = "https://maps.app.goo.gl/BP3b9SGY3CNhkBF37";

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-emerald-500 overflow-hidden flex flex-col">
      {/* Background Decor - Simplified for car */}
      <div className="fixed inset-0 bg-black pointer-events-none"></div>

      {/* Header - Solid background for car accessibility */}
      <header className="relative z-50 h-20 px-8 flex items-center justify-between bg-zinc-900 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-6">
          <button 
             onClick={() => navigate('/')}
             className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center active:scale-90"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
          </button>
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 bg-emerald-700 rounded-xl flex items-center justify-center">
                <BatteryCharging className="w-6 h-6 text-white" />
             </div>
             <div>
                <h1 className="font-display font-black text-xl tracking-tighter uppercase italic leading-none">Energy Finder</h1>
                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mt-1">VinFast Charging Network</p>
             </div>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-4 px-4 py-2 rounded-xl bg-zinc-800 border border-zinc-700 font-black text-[9px] text-zinc-500 uppercase tracking-widest">
           <Zap className="w-3.5 h-3.5 text-emerald-500" />
           System Ready
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative z-10 flex flex-col lg:flex-row overflow-hidden">
         {/* Sidebar Controls - Solid background */}
         <div className="w-full lg:w-[380px] bg-zinc-900 border-r border-zinc-800 p-8 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-10">
               <div>
                  <h2 className="text-2xl font-display font-black italic tracking-tighter uppercase mb-2">Trạm sạc <span className="text-emerald-500">Gần nhất</span></h2>
                  <p className="text-zinc-500 font-medium leading-relaxed text-sm">Hệ thống trạm sạc thông minh được đồng bộ cho xe của bạn.</p>
               </div>

               <div className="space-y-6">
                  <div className="p-6 rounded-[2rem] bg-black border border-zinc-800">
                     <div className="flex items-center justify-between mb-4">
                        <span className="px-2 py-0.5 bg-emerald-700 rounded text-[9px] font-black uppercase tracking-widest text-white">POINT A1</span>
                        <div className="flex items-center gap-2">
                           <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                           <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">OK</span>
                        </div>
                     </div>
                     <h3 className="text-lg font-bold mb-2">Trạm Sạc VinFast</h3>
                     <p className="text-zinc-500 text-xs mb-6 leading-relaxed">Địa điểm trạm sạc được tối ưu cho lộ trình hiện tại của bạn.</p>
                     
                     <a 
                        href={mapsUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-full py-4 bg-emerald-700 hover:bg-emerald-600 text-white font-black rounded-xl flex items-center justify-center gap-3 transition-all text-[10px] uppercase tracking-[0.2em]"
                     >
                        <Navigation2 className="w-4 h-4 fill-current" />
                        Dẫn đường Maps
                     </a>
                  </div>

                  <div className="p-5 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center gap-4">
                     <div className="w-12 h-12 rounded-xl bg-black border border-zinc-700 flex items-center justify-center shrink-0">
                        <Zap className="w-6 h-6 text-zinc-700" />
                     </div>
                     <div>
                        <h4 className="font-bold text-[10px] uppercase tracking-tight text-zinc-500 leading-none mb-1">Ports Available</h4>
                        <p className="font-display font-bold text-base text-white">4 Thiết bị trống</p>
                     </div>
                  </div>
               </div>
            </div>

            <div className="mt-10 pt-6 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                   <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Unit Price</p>
                      <p className="text-sm font-bold text-zinc-400">3,355 VNĐ/kWh</p>
                   </div>
                   <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center border border-zinc-700">
                      <ExternalLink className="w-4 h-4 text-zinc-500" />
                   </div>
                </div>
            </div>
         </div>

         {/* Map Placeholder Area */}
         <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
             {/* Simple background for car display compatibility */}
             <div className="absolute inset-0 bg-zinc-950"></div>
             
             <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="relative z-10 text-center px-10"
              >
                <div className="w-20 h-20 bg-emerald-900/30 rounded-3xl flex items-center justify-center mb-6 mx-auto border border-emerald-800/50">
                   <MapIcon className="w-10 h-10 text-emerald-500" />
                </div>
                <h3 className="text-2xl font-display font-black uppercase italic tracking-tighter mb-4">Mở bản đồ <span className="text-emerald-500">Trực tiếp</span></h3>
                <p className="text-zinc-600 max-w-sm mx-auto mb-8 font-medium text-sm">Nhấn nút bên dưới để mở điểm sạc đã ghim trên Google Maps nhằm đảm bảo tính chính xác nhất.</p>
                <a 
                   href={mapsUrl} 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="inline-flex items-center gap-4 px-10 py-4 bg-white text-black font-black rounded-2xl hover:bg-zinc-200 transition-all text-xs uppercase tracking-[0.2em]"
                >
                   Kích hoạt bản đồ
                   <ExternalLink className="w-4 h-4" />
                </a>
             </motion.div>

             {/* Minimal Decorative Indicators */}
             <div className="absolute bottom-6 right-6 flex gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                   <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                   <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                </div>
             </div>
         </div>
      </main>
    </div>
  );
}
