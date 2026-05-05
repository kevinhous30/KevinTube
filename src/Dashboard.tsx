import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Settings, Wrench, Video, Sparkles, Youtube, Shield, Navigation, Music, Cloud, Cpu, BatteryCharging } from 'lucide-react';
import { motion } from 'motion/react';

export default function Dashboard() {
  const navigate = useNavigate();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1 
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { 
        type: 'spring' as const, 
        stiffness: 300, 
        damping: 24 
      }
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col selection:bg-red-500 overflow-x-hidden">
      {/* Static Background */}
      <div className="fixed inset-0 bg-black pointer-events-none"></div>

      {/* Top Status Bar - Solid Background for Car compatibility */}
      <header className="fixed top-0 w-full z-[100] px-8 h-20 flex items-center justify-between bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center border border-zinc-700">
               <Cpu className="w-5 h-5 text-zinc-400" />
            </div>
            <div className="flex flex-col">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 leading-none mb-1">System</p>
              <h2 className="font-display font-bold text-xs tracking-tight">OS VER 2.0.4</h2>
            </div>
          </div>
          <div className="h-8 w-px bg-zinc-800"></div>
          <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-green-500"></div>
             <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none">Online</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
           <div className="text-right flex flex-col items-end">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 leading-none mb-1">Identity</p>
              <p className="font-display font-bold text-xs tracking-tight text-white">49H-025.89</p>
           </div>
           <button className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
              <Settings className="w-5 h-5 text-zinc-400" />
           </button>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 pt-28 pb-12 px-8 z-10 flex flex-col">
        <div className="max-w-7xl mx-auto w-full">
          
          <div className="mb-10">
            <motion.h1 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-6xl font-display font-black text-white italic tracking-tighter leading-none mb-3"
            >
              DRIVE <span className="text-zinc-700 not-italic">INTELLIGENT</span>
            </motion.h1>
            <div className="flex items-center gap-4">
               <div className="px-3 py-1 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-sm">Premium Console</div>
               <p className="text-zinc-500 text-base font-medium italic">Chào anh Kevin, hệ thống đã sẵn sàng.</p>
            </div>
          </div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {/* KevinTube */}
            <motion.button 
              variants={itemVariants}
              onClick={() => navigate('/kevintube')}
              className="group relative h-72 bg-zinc-900 border border-zinc-800 rounded-[2rem] p-8 overflow-hidden text-left flex flex-col justify-between"
            >
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-black border border-zinc-800 flex items-center justify-center mb-6">
                  <Youtube className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-3xl font-display font-black text-white italic tracking-tighter mb-2 uppercase">KevinTube</h2>
                <p className="text-zinc-500 text-sm font-medium leading-relaxed">Giải trí không giới hạn.</p>
              </div>

              <div className="relative z-10 flex items-center justify-between">
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                  <Play className="w-4 h-4 text-white fill-current" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Launch</span>
              </div>
            </motion.button>

            {/* AutoPricing */}
            <motion.button 
              variants={itemVariants}
              onClick={() => navigate('/auto-pricing')}
              className="group relative h-72 bg-zinc-900 border border-zinc-800 rounded-[2rem] p-8 overflow-hidden text-left flex flex-col justify-between"
            >
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-black border border-zinc-800 flex items-center justify-center mb-6">
                  <Navigation className="w-8 h-8 text-blue-500" />
                </div>
                <h2 className="text-3xl font-display font-black text-white italic tracking-tighter mb-2 uppercase">Tính Cước</h2>
                <p className="text-zinc-500 text-sm font-medium leading-relaxed">Cước phí thông minh.</p>
              </div>

              <div className="relative z-10 flex items-center justify-between">
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                  <Play className="w-4 h-4 text-white fill-current" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Start</span>
              </div>
            </motion.button>

            {/* Charging Stations */}
            <motion.button 
              variants={itemVariants}
              onClick={() => navigate('/charging-stations')}
              className="group relative h-72 bg-zinc-900 border border-zinc-800 rounded-[2rem] p-8 overflow-hidden text-left flex flex-col justify-between"
            >
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-black border border-zinc-800 flex items-center justify-center mb-6">
                  <BatteryCharging className="w-8 h-8 text-emerald-500" />
                </div>
                <h2 className="text-3xl font-display font-black text-white italic tracking-tighter mb-2 uppercase">Trạm sạc</h2>
                <p className="text-zinc-500 text-sm font-medium leading-relaxed">Mạng lưới VinFast.</p>
              </div>

              <div className="relative z-10 flex items-center justify-between">
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                  <Play className="w-4 h-4 text-white fill-current" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Locate</span>
              </div>
            </motion.button>

            {/* Widgets */}
            <div className="grid grid-rows-2 gap-6">
               <div className="bg-zinc-900 border border-zinc-800 rounded-[1.5rem] p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-black border border-zinc-800 flex items-center justify-center">
                    <Music className="w-6 h-6 text-zinc-600" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-base uppercase tracking-tight">Audio</h3>
                    <p className="text-[9px] font-bold text-zinc-500 tracking-widest">OFFLINE</p>
                  </div>
               </div>
               
               <div className="bg-zinc-900 border border-zinc-800 rounded-[1.5rem] p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-black border border-zinc-800 flex items-center justify-center">
                    <Cloud className="w-6 h-6 text-zinc-600" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-base uppercase tracking-tight">Climate</h3>
                    <p className="text-[9px] font-bold text-zinc-500 tracking-widest">24°C</p>
                  </div>
               </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Decorative Car Silhouette at Bottom */}
      <div className="fixed bottom-[-40px] left-1/2 -translate-x-1/2 w-[80%] h-40 opacity-[0.03] pointer-events-none">
        <svg viewBox="0 0 100 20" className="w-full h-full fill-white">
          <path d="M10,18 C10,18 15,10 30,10 L70,10 C85,10 90,18 90,18 L10,18 Z M25,18 A3,3 0 1,1 19,18 A3,3 0 1,1 25,18 Z M81,18 A3,3 0 1,1 75,18 A3,3 0 1,1 81,18 Z" />
        </svg>
      </div>
    </div>
  );
}
