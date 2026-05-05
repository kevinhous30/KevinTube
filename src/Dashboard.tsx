import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Settings, Wrench, Video, Sparkles, Youtube, Shield } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col">
      {/* Header */}
      <header className="w-full bg-black border-b border-zinc-800 px-6 h-20 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center mr-3 shadow-lg shadow-red-900/20">
             <Wrench className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight leading-none">Master Tools</h1>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] mt-1">Premium Edition</p>
          </div>
        </div>
        
        <div className="flex items-center">
           <div className="text-[11px] bg-zinc-800 px-3 py-1 rounded-lg border border-zinc-700 text-zinc-300 font-bold">
              v2.0
           </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-12">
         <div className="max-w-5xl mx-auto">
            
            <div className="mb-10">
               <h1 className="text-4xl font-bold text-white mb-2">Chào anh Kevin,</h1>
               <div className="flex items-center">
                 <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></div>
                 <p className="text-zinc-400 text-lg font-medium">
                   Tài 49H02589 • Đã sẵn sàng làm việc
                 </p>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               
               {/* KevinTube Card */}
               <button 
                 onClick={() => navigate('/kevintube')}
                 className="group relative flex flex-col bg-[#111] hover:bg-[#151515] active:scale-[0.98] border border-zinc-800 rounded-[2rem] p-8 transition-all duration-200 text-left"
               >
                 <div className="w-16 h-16 rounded-2xl bg-black border border-zinc-800 flex items-center justify-center mb-6 group-hover:border-red-500/50 transition-colors">
                    <Youtube className="w-10 h-10 text-[#FF0000]" />
                 </div>
                 
                 <div className="mb-4">
                   <h2 className="text-2xl font-bold text-white mb-1">KevinTube</h2>
                   <p className="text-zinc-500 text-sm">Xem video giải trí không quảng cáo, chất lượng cao.</p>
                 </div>

                 <div className="mt-auto flex items-center text-red-500 font-bold text-sm">
                    Mở ứng dụng <Play className="w-3 h-3 ml-2 fill-current" />
                 </div>
               </button>

               {/* AutoPricing Card */}
               <button 
                 onClick={() => navigate('/auto-pricing')}
                 className="group relative flex flex-col bg-[#111] hover:bg-[#151515] active:scale-[0.98] border border-zinc-800 rounded-[2rem] p-8 transition-all duration-200 text-left"
               >
                 <div className="w-16 h-16 rounded-2xl bg-black border border-zinc-800 flex items-center justify-center mb-6 group-hover:border-blue-500/50 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
                 </div>
                 
                 <div className="mb-4">
                   <h2 className="text-2xl font-bold text-white mb-1">Tính Cước Xe</h2>
                   <p className="text-zinc-500 text-sm">Công cụ tính giá cước tự động dựa trên vị trí và AI.</p>
                 </div>

                 <div className="mt-auto flex items-center text-blue-500 font-bold text-sm">
                    Khởi động <Play className="w-3 h-3 ml-2 fill-current" />
                 </div>
               </button>

               {/* Placeholder */}
               <div className="flex flex-col bg-zinc-900/20 border border-dashed border-zinc-800 rounded-[2rem] p-8 opacity-50 grayscale">
                 <div className="w-16 h-16 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-center mb-6">
                    <Sparkles className="w-10 h-10 text-zinc-700" />
                 </div>
                 <h2 className="text-2xl font-bold text-zinc-700 mb-1">Sắp ra mắt</h2>
                 <p className="text-zinc-800 text-sm">Chúng tôi đang phát triển thêm nhiều tiện ích mới cho bạn.</p>
               </div>

            </div>
         </div>
      </main>
    </div>
  );
}
