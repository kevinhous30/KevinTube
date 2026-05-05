import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Settings, Wrench, Video, Sparkles, Youtube, Shield } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-red-600 flex flex-col">
      {/* Compact Header for Car screens */}
      <header className="w-full z-30 bg-black border-b border-zinc-900 px-6 h-16 flex items-center justify-between sticky top-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center border border-zinc-800">
             <Wrench className="w-4 h-4 text-red-500" />
          </div>
          <span className="font-bold text-lg tracking-tight">Master Tools</span>
        </div>
        
        <div className="flex items-center gap-3">
           <div className="text-[10px] bg-zinc-900 px-2 py-1 rounded-full border border-zinc-800 text-zinc-500 font-bold uppercase tracking-widest">
              v2.0
           </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
         <div className="max-w-4xl mx-auto">
            
            <div className="mb-8 pl-2">
               <h1 className="text-2xl font-bold text-white mb-1">Chào anh Kevin,</h1>
               <p className="text-zinc-500 text-sm">
                 Tài 49H02589 • Chọn ứng dụng để bắt đầu
               </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               
               {/* KevinTube Card - Ultra High Contrast */}
               <button 
                 onClick={() => navigate('/kevintube')}
                 className="group relative flex items-center gap-4 bg-zinc-900 active:bg-zinc-800 border border-zinc-800 rounded-2xl p-5 transition-all"
               >
                 <div className="w-14 h-14 rounded-xl bg-black border border-zinc-800 flex items-center justify-center shrink-0">
                    <Youtube className="w-8 h-8 text-[#FF0000]" />
                 </div>
                 
                 <div className="flex-1 text-left">
                   <h2 className="text-xl font-bold text-white">KevinTube</h2>
                   <p className="text-zinc-500 text-xs line-clamp-1">Xem YouTube không quảng cáo</p>
                 </div>

                 <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-4 h-4 text-zinc-300" />
                 </div>
               </button>

               {/* AutoPricing Card - Ultra High Contrast */}
               <button 
                 onClick={() => navigate('/auto-pricing')}
                 className="group relative flex items-center gap-4 bg-zinc-900 active:bg-zinc-800 border border-zinc-800 rounded-2xl p-5 transition-all"
               >
                 <div className="w-14 h-14 rounded-xl bg-black border border-zinc-800 flex items-center justify-center shrink-0">
                    <svg xmlns="http://www.w3.org/20.0.0" className="w-8 h-8 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
                 </div>
                 
                 <div className="flex-1 text-left">
                   <h2 className="text-xl font-bold text-white">Tính Cước Xe</h2>
                   <p className="text-zinc-500 text-xs line-clamp-1">Tự động hóa giá hợp đồng</p>
                 </div>

                 <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-4 h-4 text-zinc-300" />
                 </div>
               </button>

               {/* Analytics - Placeholder */}
               <div className="flex items-center gap-4 bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-5 opacity-40">
                 <div className="w-14 h-14 rounded-xl bg-black/50 border border-zinc-800/50 flex items-center justify-center shrink-0">
                    <Sparkles className="w-8 h-8 text-zinc-600" />
                 </div>
                 <div className="flex-1 text-left">
                   <h2 className="text-xl font-bold text-zinc-500">Sắp ra mắt</h2>
                   <p className="text-zinc-600 text-xs">Thêm công cụ mới</p>
                 </div>
               </div>

            </div>
         </div>
      </main>
    </div>
  );
}
