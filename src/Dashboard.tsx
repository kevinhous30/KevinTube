import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Settings, Wrench, Video, Sparkles, Youtube, Shield } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-red-500 selection:text-white flex flex-col">
      {/* Header */}
      <header className="w-full z-30 bg-zinc-950 border-b border-zinc-900 border-b-2">
        <div className="max-w-[1600px] mx-auto px-6 h-20 sm:h-24 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-zinc-900 flex items-center justify-center border border-zinc-800 shadow-lg">
               <Wrench className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-500" />
            </div>
            <span className="font-display font-bold text-xl sm:text-3xl tracking-tight hidden sm:block">Kevin Master Tools</span>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <Shield className="w-5 h-5 text-zinc-400" />
             </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 sm:p-12 relative overflow-y-auto">
         <div className="max-w-[1600px] mx-auto">
            
            <div className="mb-10 sm:mb-16">
               <h1 className="text-3xl sm:text-5xl font-display font-bold text-white mb-4">Workspace Manager</h1>
               <p className="text-zinc-400 text-lg sm:text-xl max-w-2xl">
                 Master Tools được tạo bởi anh Kevin, tài 49H02589
               </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
               
               {/* KevinTube Card */}
               <button 
                 onClick={() => navigate('/kevintube')}
                 className="group relative flex flex-col text-left bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 hover:border-red-500/50 rounded-3xl p-6 sm:p-8 transition-all duration-300 overflow-hidden"
               >
                 <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                 
                 <div className="w-16 h-16 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center mb-6 shadow-md relative z-10 group-hover:scale-110 group-hover:border-red-500/30 transition-transform duration-500">
                    <Youtube className="w-8 h-8 text-red-500" />
                 </div>
                 
                 <div className="relative z-10 flex-1 flex flex-col">
                   <h2 className="text-2xl font-bold text-white mb-3 flex items-center gap-2">
                     KevinTube
                   </h2>
                   <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                     Xem Youtube không giới hạn, không quảng cáo....
                   </p>
                   
                   <div className="mt-auto flex items-center text-red-400 font-medium text-sm group-hover:text-red-300 transition-colors">
                     <span>Launch App</span>
                     <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                     </svg>
                   </div>
                 </div>
               </button>

               {/* AutoPricing Card */}
               <button 
                 onClick={() => navigate('/auto-pricing')}
                 className="group relative flex flex-col text-left bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 hover:border-indigo-500/50 rounded-3xl p-6 sm:p-8 transition-all duration-300 overflow-hidden"
               >
                 <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                 
                 <div className="w-16 h-16 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center mb-6 shadow-md relative z-10 group-hover:scale-110 group-hover:border-indigo-500/30 transition-transform duration-500">
                    <svg xmlns="http://www.w3.org/0.0.0.0" className="w-8 h-8 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
                 </div>
                 
                 <div className="relative z-10 flex-1 flex flex-col">
                   <h2 className="text-2xl font-bold text-white mb-3 flex items-center gap-2">
                     Auto Tính Cước Xe
                   </h2>
                   <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                     Hỗ trợ tài xế tính cước hợp đồng tự động cho các chuyến xe
                   </p>
                   
                   <div className="mt-auto flex items-center text-indigo-400 font-medium text-sm group-hover:text-indigo-300 transition-colors">
                     <span>Launch App</span>
                     <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                     </svg>
                   </div>
                 </div>
               </button>

               {/* Placeholder Card 1 */}
               <div className="group relative flex flex-col text-left bg-zinc-900/20 border border-zinc-800/50 rounded-3xl p-6 sm:p-8 cursor-not-allowed overflow-hidden opacity-60">
                 <div className="w-16 h-16 rounded-2xl bg-zinc-950 border border-zinc-800/50 flex items-center justify-center mb-6">
                    <Settings className="w-8 h-8 text-zinc-500" />
                 </div>
                 
                 <div className="flex-1 flex flex-col">
                   <h2 className="text-2xl font-bold text-zinc-300 mb-3 flex items-center gap-2">
                     Analytics Engine
                     <span className="text-[10px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-400 px-2 py-1 rounded-full ml-auto">Coming Soon</span>
                   </h2>
                   <p className="text-zinc-500 text-sm leading-relaxed mb-6">
                     Deep insights and metrics tracking for all your active workloads and datasets.
                   </p>
                 </div>
               </div>

            </div>
         </div>
      </main>
    </div>
  );
}
