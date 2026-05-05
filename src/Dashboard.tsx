import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Settings, Wrench, Video, Sparkles, Youtube, Shield, Navigation, Music, Cloud, Cpu } from 'lucide-react';
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
    <div className="min-h-screen bg-black text-white font-sans flex flex-col selection:bg-red-500 overflow-hidden">
      {/* Dynamic Background Element */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-900/10 blur-[120px] rounded-full"></div>
      </div>

      {/* Top Status Bar */}
      <header className="fixed top-0 w-full z-[100] px-8 h-20 flex items-center justify-between glass">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-700 to-black flex items-center justify-center border border-zinc-800">
               <Cpu className="w-5 h-5 text-zinc-400" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 leading-none mb-1">System status</p>
              <h2 className="font-display font-bold text-sm tracking-tight">OS VER 2.0.4</h2>
            </div>
          </div>
          <div className="h-8 w-px bg-zinc-800"></div>
          <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
             <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest leading-none">Online</span>
          </div>
        </div>

        <div className="flex items-center gap-8">
           <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 leading-none mb-1">User identity</p>
              <p className="font-display font-bold text-sm tracking-tight text-white">49H-025.89</p>
           </div>
           <button className="w-12 h-12 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-center hover:bg-zinc-800 transition-colors">
              <Settings className="w-6 h-6 text-zinc-400" />
           </button>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 pt-32 pb-12 px-8 z-10 flex flex-col justify-center">
        <div className="max-w-7xl mx-auto w-full">
          
          <div className="mb-16">
            <motion.h1 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-7xl font-display font-black text-white italic tracking-tighter leading-none mb-4"
            >
              DRIVE <span className="text-zinc-800 not-italic">INTELLIGENT</span>
            </motion.h1>
            <motion.div 
               initial={{ x: -20, opacity: 0 }}
               animate={{ x: 0, opacity: 1 }}
               transition={{ delay: 0.2 }}
               className="flex items-center gap-4"
            >
               <div className="px-4 py-1.5 bg-white text-black text-xs font-black uppercase tracking-widest rounded-sm">Premium Console</div>
               <p className="text-zinc-500 text-lg font-medium italic">Chào anh Kevin, hệ thống đã sẵn sàng.</p>
            </motion.div>
          </div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {/* KevinTube */}
            <motion.button 
              variants={itemVariants}
              onClick={() => navigate('/kevintube')}
              className="group relative h-80 bg-zinc-900/40 border border-zinc-800/50 rounded-[2.5rem] p-10 overflow-hidden card-hover text-left flex flex-col justify-between"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-red-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-black border border-zinc-800 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:border-red-600/50 transition-all duration-500">
                  <Youtube className="w-10 h-10 text-red-600" />
                </div>
                <h2 className="text-4xl font-display font-black text-white italic truncate tracking-tighter mb-2 uppercase">KevinTube</h2>
                <p className="text-zinc-500 font-medium leading-relaxed max-w-[200px]">Thế giới giải trí không giới hạn ngay trên tay lái.</p>
              </div>

              <div className="relative z-10 flex items-center justify-between">
                <div className="w-12 h-12 rounded-full border border-zinc-800 flex items-center justify-center group-hover:border-red-600 group-hover:bg-red-600 transition-all duration-500">
                  <Play className="w-5 h-5 text-white fill-current translate-x-0.5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 group-hover:text-red-600 duration-500">Launch module</span>
              </div>
            </motion.button>

            {/* AutoPricing */}
            <motion.button 
              variants={itemVariants}
              onClick={() => navigate('/auto-pricing')}
              className="group relative h-80 bg-zinc-900/40 border border-zinc-800/50 rounded-[2.5rem] p-10 overflow-hidden card-hover text-left flex flex-col justify-between"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-black border border-zinc-800 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:border-blue-600/50 transition-all duration-500">
                  <Navigation className="w-10 h-10 text-blue-500" />
                </div>
                <h2 className="text-4xl font-display font-black text-white italic truncate tracking-tighter mb-2 uppercase">Pricing</h2>
                <p className="text-zinc-500 font-medium leading-relaxed max-w-[200px]">Tính toán cước phí thông minh dựa trên hành trình.</p>
              </div>

              <div className="relative z-10 flex items-center justify-between">
                <div className="w-12 h-12 rounded-full border border-zinc-800 flex items-center justify-center group-hover:border-blue-600 group-hover:bg-blue-600 transition-all duration-500">
                  <Play className="w-5 h-5 text-white fill-current translate-x-0.5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 group-hover:text-blue-600 duration-500">Start engine</span>
              </div>
            </motion.button>

            {/* Third Column - Smart Widgets Placeholder */}
            <motion.div 
               variants={itemVariants}
               className="grid grid-rows-2 gap-8"
            >
               <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2rem] p-8 flex items-center gap-6 group hover:border-zinc-700 transition-colors">
                  <div className="w-14 h-14 rounded-2xl bg-black border border-zinc-800 flex items-center justify-center">
                    <Music className="w-8 h-8 text-zinc-600 group-hover:text-zinc-200 transition-colors" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg uppercase tracking-tight">Audio Hub</h3>
                    <p className="text-xs font-bold text-zinc-500 tracking-widest mt-1">NO INPUT DETECTED</p>
                  </div>
               </div>
               
               <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2rem] p-8 flex items-center gap-6 group hover:border-zinc-700 transition-colors">
                  <div className="w-14 h-14 rounded-2xl bg-black border border-zinc-800 flex items-center justify-center">
                    <Cloud className="w-8 h-8 text-zinc-600 group-hover:text-zinc-200 transition-colors" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg uppercase tracking-tight">Climate</h3>
                    <p className="text-xs font-bold text-zinc-500 tracking-widest mt-1">SYNCED • 24°C</p>
                  </div>
               </div>
            </motion.div>
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
