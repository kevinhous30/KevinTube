/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Play, Search, X, Flame, Clock, User, ArrowLeft, History, Maximize2, Minimize2, ChevronDown, Trash2, Sparkles, Volume2, MessageSquare, VolumeX, Home, Youtube, Share2, MoreVertical, Subtitles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import YouTube from 'react-youtube';
import { useNavigate } from 'react-router-dom';

interface SearchResult {
  videoId: string;
  title: string;
  thumbnail: string;
  image: string;
  timestamp: string;
  author: { name: string };
  views: number;
}

interface VideoState {
  id: string;
  isMinimized: boolean;
  details?: SearchResult;
  related?: SearchResult[];
}

function extractVideoId(url: string): string | null {
  if (!url) return null;
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname.includes('youtube.com')) {
      if (parsedUrl.pathname === '/watch') return parsedUrl.searchParams.get('v');
      if (parsedUrl.pathname.startsWith('/embed/')) return parsedUrl.pathname.split('/')[2];
      if (parsedUrl.pathname.startsWith('/v/')) return parsedUrl.pathname.split('/')[2];
      if (parsedUrl.pathname.startsWith('/shorts/')) return parsedUrl.pathname.split('/')[2];
    } else if (parsedUrl.hostname === 'youtu.be') {
      return parsedUrl.pathname.substring(1);
    }
  } catch (e) {}
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = url.match(regex);
  return (match && match[1]) ? match[1] : null;
}

function formatViews(views: number): string {
  if (views >= 1000000) return (views / 1000000).toFixed(1) + 'M lượt xem';
  if (views >= 1000) return (views / 1000).toFixed(1) + 'K lượt xem';
  return views + ' lượt xem';
}

export default function KevinTube() {
  const navigate = useNavigate();
  const [urlInput, setUrlInput] = useState('');
  const [activeVideo, setActiveVideo] = useState<VideoState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<SearchResult[]>([]);
  const [history, setHistory] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'suggested' | 'history'>('suggested');
  
  const playerContainerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (playerContainerRef.current && activeVideo && !activeVideo.isMinimized) {
      playerContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeVideo?.id]);

  useEffect(() => {
    let loadedHistory: SearchResult[] = [];
    const saved = localStorage.getItem('kevintube_history');
    if (saved) {
      try { 
        loadedHistory = JSON.parse(saved);
        setHistory(loadedHistory); 
      } catch(e){}
    }
    fetchSuggested(loadedHistory);
  }, []);

  const addToHistory = (video: SearchResult) => {
    setHistory(prev => {
      const newHistory = [video, ...prev.filter(v => v.videoId !== video.videoId)].slice(0, 50);
      localStorage.setItem('kevintube_history', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const fetchSuggested = async (currentHistory: SearchResult[]) => {
    setLoading(true);
    setError(null);
    try {
      if (currentHistory && currentHistory.length > 0) {
        const recent = currentHistory[0];
        const q = `${recent.author?.name || ''} ${recent.title.split(' ').slice(0, 3).join(' ')}`.trim();
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (!res.ok) throw new Error('Failed to fetch suggested videos');
        const data = await res.json();
        if (data && data.length > 0) {
          setVideos(data);
        } else {
          const fallbackRes = await fetch('/api/trending');
          const fallbackData = await fallbackRes.json();
          setVideos(fallbackData);
        }
      } else {
        const res = await fetch('/api/trending');
        if (!res.ok) throw new Error('Failed to fetch trending videos');
        const data = await res.json();
        setVideos(data);
      }
      setIsSearching(false);
    } catch (err) {
      setError('Không thể tải video. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedVideos = async (id: string, title?: string) => {
    try {
      const q = title ? title.split(' ').slice(0, 4).join(' ') : 'trending';
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        const related = data.filter((v: SearchResult) => v.videoId !== id);
        setActiveVideo(prev => prev?.id === id ? { ...prev, related } : prev);
      }
    } catch (e) {
      console.error('Failed to fetch related videos', e);
    }
  };

  const playVideo = (video: SearchResult) => {
    setActiveVideo({ id: video.videoId, isMinimized: false, details: video, related: [] });
    addToHistory(video);
    fetchRelatedVideos(video.videoId, video.title);
  };

  const playVideoById = async (id: string) => {
    setActiveVideo({ id, isMinimized: false });
    try {
      const res = await fetch(`/api/video/${id}`);
      if (res.ok) {
        const data = await res.json();
        setActiveVideo(prev => prev?.id === id ? { ...prev, details: data } : prev);
        addToHistory(data);
        fetchRelatedVideos(id, data.title);
      } else {
        fetchRelatedVideos(id);
      }
    } catch(e){
      fetchRelatedVideos(id);
    }
  };

  const handleVideoEnded = () => {
    if (activeVideo && activeVideo.related && activeVideo.related.length > 0) {
      playVideo(activeVideo.related[0]);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    setError(null);
    const id = extractVideoId(urlInput);
    if (id) {
      playVideoById(id);
      return;
    }
    setLoading(true);
    setIsSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(urlInput)}`);
      if (!res.ok) throw new Error('Failed to search videos');
      const data = await res.json();
      setVideos(data);
    } catch (err) {
      setError('Tìm kiếm thất bại. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setUrlInput('');
    setIsSearching(false);
    setActiveTab('suggested');
    fetchSuggested(history);
    if (activeVideo && !activeVideo.isMinimized) {
      setActiveVideo(prev => prev ? { ...prev, isMinimized: true } : null);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const displayVideos = isSearching ? videos : (activeTab === 'history' ? history : videos);

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-red-500 overflow-x-hidden">
      {/* Premium Header */}
      <header className="fixed top-0 w-full z-[100] h-20 px-8 flex items-center justify-between glass border-b border-white/[0.03]">
        <div className="flex items-center gap-6">
          <button 
             onClick={() => navigate('/')}
             className="w-12 h-12 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-center hover:bg-zinc-800 transition-all active:scale-90"
          >
            <Home className="w-6 h-6 text-zinc-400" />
          </button>
          <div className="flex items-center gap-3 cursor-pointer group" onClick={clearSearch}>
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-900/30 group-hover:scale-110 transition-transform">
              <Youtube className="w-6 h-6 text-white" />
            </div>
            <span className="font-display font-black text-2xl tracking-tighter hidden md:block">KEVINTUBE</span>
          </div>
        </div>

        <div className="flex-1 max-w-xl mx-8">
          <form onSubmit={handleSearch} className="relative group">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Tìm kiếm phim, ca nhạc hoặc dán link..."
              className="w-full bg-zinc-900/50 border border-zinc-800/50 rounded-2xl pl-12 pr-12 py-3.5 text-base outline-none focus:bg-zinc-800/50 focus:border-red-500/50 focus:ring-4 focus:ring-red-500/5 transition-all placeholder:text-zinc-600 font-medium"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-red-500 transition-colors" />
            <AnimatePresence>
              {urlInput && (
                <motion.button 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  type="button" 
                  onClick={() => setUrlInput('')} 
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              )}
            </AnimatePresence>
          </form>
        </div>

        <div className="flex items-center gap-4">
           {/* User Avatar / Status */}
           <div className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-2xl bg-zinc-900/50 border border-zinc-800">
              <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></div>
              <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase">Live Mode</span>
           </div>
        </div>
      </header>

      {/* Categories & Navigation */}
      <nav className="fixed top-20 w-full z-50 px-8 py-6 glass border-b border-white/[0.03] overflow-x-auto no-scrollbar">
        <div className="max-w-[1800px] mx-auto flex items-center gap-3">
          <button 
            onClick={() => setActiveTab('suggested')}
            className={`px-8 py-2.5 rounded-full text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all duration-300 ${activeTab === 'suggested' ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'bg-transparent text-zinc-500 hover:text-zinc-200 border border-zinc-800'}`}
          >
            Đề xuất
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`px-8 py-2.5 rounded-full text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all duration-300 ${activeTab === 'history' ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'bg-transparent text-zinc-500 hover:text-zinc-200 border border-zinc-800'}`}
          >
            Đã xem
          </button>
          <div className="h-4 w-px bg-zinc-800 mx-4"></div>
          {['Âm nhạc', 'Trực tiếp', 'Hài hước', 'Phim truyện', 'Tin tức', 'Công nghệ', 'Xe hơi'].map(cat => (
             <button key={cat} className="px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest whitespace-nowrap bg-transparent text-zinc-500 hover:text-zinc-200 border border-zinc-800 transition-all hover:border-zinc-700">
                {cat}
             </button>
          ))}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="pt-52 pb-32 px-8 min-h-screen">
        <div className="max-w-[1800px] mx-auto">
          {error && (
            <motion.div 
               initial={{ opacity: 0, y: -10 }}
               animate={{ opacity: 1, y: 0 }}
               className="mb-10 p-6 rounded-[2rem] bg-red-500/10 text-red-500 text-sm font-bold text-center border border-red-500/20 glass-red"
            >
              {error}
            </motion.div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-10">
              {[...Array(15)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="w-full aspect-video bg-zinc-900/50 rounded-[2.5rem] mb-6"></div>
                  <div className="space-y-4 px-4">
                    <div className="h-6 bg-zinc-900/50 rounded-lg w-full"></div>
                    <div className="h-4 bg-zinc-900/50 rounded-lg w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <motion.div 
               layout
               className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-10 gap-y-16"
            >
              <AnimatePresence mode="popLayout">
                {displayVideos.map((video, index) => (
                  <motion.button
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.03 }}
                    key={video.videoId + index}
                    onClick={() => playVideo(video)}
                    className="flex flex-col group active:scale-95 transition-all text-left"
                  >
                    <div className="relative aspect-video w-full bg-zinc-900 rounded-[2.5rem] overflow-hidden mb-6 border border-white/5 group-hover:border-red-500/50 transition-all duration-500 shadow-2xl group-hover:shadow-red-900/20">
                      <img 
                        src={video.thumbnail || video.image} 
                        alt={video.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ease-out" 
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/10 transition-colors duration-500"></div>
                      
                      {video.timestamp && (
                        <div className="absolute bottom-4 right-4 glass px-3 py-1.5 rounded-xl text-[10px] font-black text-white shadow-xl">
                          {video.timestamp}
                        </div>
                      )}
                      
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
                         <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform duration-500 translate-y-8 group-hover:translate-y-0">
                            <Play className="w-8 h-8 text-white fill-current" />
                         </div>
                      </div>
                    </div>

                    <div className="px-3 flex gap-5">
                      <div className="w-12 h-12 rounded-2xl bg-zinc-900/50 shrink-0 flex items-center justify-center border border-zinc-800 shadow-lg group-hover:border-red-500/30 transition-colors">
                        <User className="w-6 h-6 text-zinc-500 group-hover:text-red-500 transition-colors" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg font-bold line-clamp-2 leading-[1.3] text-white/90 group-hover:text-white transition-colors tracking-tight">{video.title}</h3>
                        <div className="mt-2.5 flex items-center gap-3">
                           <span className="text-xs font-black uppercase tracking-[0.1em] text-zinc-500 group-hover:text-zinc-400 transition-colors">{video.author?.name || 'VÔ DANH'}</span>
                           <span className="w-1 h-1 rounded-full bg-zinc-800"></span>
                           <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{formatViews(video.views || 0)}</span>
                        </div>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>

              {displayVideos.length === 0 && (
                 <div className="col-span-full flex flex-col items-center justify-center py-40 text-center">
                    <div className="w-32 h-32 bg-zinc-900/30 rounded-[3rem] flex items-center justify-center mb-8 border border-zinc-800 transition-all hover:scale-110">
                      <Youtube className="w-16 h-16 text-zinc-800" />
                    </div>
                    <h2 className="text-3xl font-display font-black italic uppercase tracking-tighter text-zinc-600">No Content Signal</h2>
                    <p className="text-zinc-700 mt-3 font-medium text-lg">Hệ thống đang chờ lệnh tìm kiếm của bạn.</p>
                 </div>
              )}
            </motion.div>
          )}
        </div>
      </main>
      
      {/* Immersive Video Player Overlay */}
      <AnimatePresence>
        {activeVideo && !activeVideo.isMinimized && (
          <motion.div 
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[10000] bg-black flex flex-col pointer-events-auto"
          >
            {/* Player Top Controls */}
            <div className="h-24 bg-gradient-to-b from-black via-black/80 to-transparent flex items-center justify-between px-8 fixed top-0 left-0 right-0 z-[10010]">
               <div className="flex items-center gap-6">
                 <button 
                   onClick={() => setActiveVideo(p => p ? { ...p, isMinimized: true } : null)} 
                   className="w-14 h-14 rounded-2xl glass hover:bg-white/10 flex items-center justify-center transition-all active:scale-90"
                 >
                   <ChevronDown className="w-8 h-8 text-white" />
                 </button>
                 <div className="h-10 w-px bg-white/10"></div>
                 <div className="hidden sm:block">
                   <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 mb-0.5">Now Playing</p>
                   <p className="text-sm font-bold text-white max-w-lg truncate">{activeVideo.details?.title}</p>
                 </div>
               </div>
               
               <div className="flex items-center gap-4">
                  <button className="w-14 h-14 rounded-2xl glass hover:bg-white/10 flex items-center justify-center transition-all hidden sm:flex">
                    <Share2 className="w-6 h-6 text-zinc-400" />
                  </button>
                  <button 
                    onClick={() => setActiveVideo(null)} 
                    className="w-14 h-14 rounded-2xl bg-red-600 hover:bg-red-500 flex items-center justify-center transition-all shadow-lg shadow-red-900/40 active:scale-95"
                  >
                    <X className="w-8 h-8 text-white" />
                  </button>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar" ref={playerContainerRef}>
              <div className="aspect-video w-full bg-black sticky top-0 z-[10005] shadow-[0_30px_100px_rgba(0,0,0,1)]">
                <YouTube
                  key={activeVideo.id}
                  videoId={activeVideo.id}
                  className="w-full h-full"
                  opts={{
                    width: '100%',
                    height: '100%',
                    playerVars: {
                      autoplay: 1,
                      playsinline: 1,
                      modestbranding: 1,
                      rel: 0,
                      fs: 1,
                      color: 'red',
                      iv_load_policy: 3
                    }
                  }}
                  onReady={(e) => {
                    try { e.target.playVideo(); } catch(err) {}
                  }}
                  onEnd={handleVideoEnded}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>

              <div className="p-10 lg:p-20 bg-black max-w-7xl mx-auto w-full">
                <div className="flex flex-col lg:flex-row gap-16">
                  {/* Left Column: Info */}
                  <div className="flex-1">
                    <h1 className="text-4xl lg:text-5xl font-display font-black leading-tight tracking-tighter mb-10">{activeVideo.details?.title}</h1>
                    
                    <div className="flex items-center justify-between p-8 rounded-[2.5rem] bg-zinc-900/40 border border-zinc-800/50 mb-12">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-black rounded-[1.25rem] flex items-center justify-center border border-zinc-800 shadow-xl">
                           <User className="w-8 h-8 text-zinc-600" />
                        </div>
                        <div>
                           <p className="font-display font-bold text-xl tracking-tight">{activeVideo.details?.author?.name}</p>
                           <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 mt-1">{formatViews(activeVideo.details?.views || 0)} • verified signal</p>
                        </div>
                      </div>
                      <button className="bg-white text-black px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-zinc-200 transition-colors active:scale-95 shadow-xl">
                        Theo dõi
                      </button>
                    </div>

                    <div className="flex gap-4 mb-16 px-4">
                       <button className="flex-1 flex items-center justify-center gap-3 py-4 bg-zinc-900/50 rounded-2xl border border-zinc-800 hover:bg-zinc-800 transition-colors text-xs font-black uppercase tracking-widest text-zinc-400"><Volume2 className="w-4 h-4" /> Audio Boost</button>
                       <button className="flex-1 flex items-center justify-center gap-3 py-4 bg-zinc-900/50 rounded-2xl border border-zinc-800 hover:bg-zinc-800 transition-colors text-xs font-black uppercase tracking-widest text-zinc-400"><MessageSquare className="w-4 h-4" /> Chat Hub</button>
                       <button className="flex-1 flex items-center justify-center gap-3 py-4 bg-zinc-900/50 rounded-2xl border border-zinc-800 hover:bg-zinc-800 transition-colors text-xs font-black uppercase tracking-widest text-zinc-400"><Subtitles className="w-4 h-4" /> Captions</button>
                    </div>
                  </div>

                  {/* Right Column: Related */}
                  <div className="lg:w-[450px] shrink-0">
                    <div className="flex items-center justify-between mb-8 px-4">
                       <h3 className="font-display font-black text-2xl uppercase italic italic tracking-tighter">Next <span className="text-red-600">Sync</span></h3>
                       <div className="px-3 py-1 bg-red-600/10 border border-red-500/20 rounded-md">
                          <span className="text-[9px] font-black tracking-widest text-red-500 uppercase">Auto Next</span>
                       </div>
                    </div>
                    <div className="flex flex-col gap-8">
                      {activeVideo.related?.slice(0, 12).map((v, i) => (
                        <motion.button 
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          key={i} 
                          onClick={() => playVideo(v)} 
                          className="flex gap-6 active:scale-[0.98] transition-all text-left group"
                        >
                           <div className="relative w-44 aspect-video shrink-0 rounded-2xl overflow-hidden shadow-2xl border border-white/5 ring-1 ring-white/5">
                              <img src={v.thumbnail} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                              <div className="absolute inset-0 bg-black/30 group-hover:bg-transparent transition-colors"></div>
                              {v.timestamp && (
                                 <div className="absolute bottom-2 right-2 glass text-[8px] font-black px-1.5 py-0.5 rounded-lg">
                                    {v.timestamp}
                                 </div>
                              )}
                           </div>
                           <div className="flex-1 min-w-0 flex flex-col justify-center">
                              <h4 className="text-base font-bold line-clamp-2 leading-tight tracking-tight group-hover:text-red-500 transition-colors">{v.title}</h4>
                              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mt-2 truncate">{v.author?.name}</p>
                           </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modern Minimized Player */}
      <AnimatePresence>
        {activeVideo?.isMinimized && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            onClick={() => setActiveVideo(p => p ? { ...p, isMinimized: false } : null)}
            className="fixed bottom-6 right-6 left-6 md:left-auto md:w-[450px] group h-24 bg-zinc-950/95 border border-white/10 rounded-[2rem] z-[9000] flex items-center p-2 backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] cursor-pointer hover:border-red-500/30 transition-all animate-glow"
          >
            <div className="w-36 h-full shrink-0 overflow-hidden rounded-[1.5rem] relative">
               <img src={activeVideo.details?.thumbnail || activeVideo.details?.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
               <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <Play className="w-6 h-6 text-white fill-current" />
               </div>
            </div>
            <div className="flex-1 ml-5 mr-2 min-w-0">
               <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-600 mb-1">In background</p>
               <p className="text-sm font-bold truncate text-white tracking-tight">{activeVideo.details?.title || 'Đang phát...'}</p>
               <p className="text-[11px] font-black uppercase tracking-widest text-zinc-500 mt-1 truncate">{activeVideo.details?.author?.name}</p>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); setActiveVideo(null); }} 
              className="w-14 h-14 flex items-center justify-center rounded-2xl hover:bg-white/5 text-zinc-500 hover:text-white transition-all mr-2"
            >
               <X className="w-6 h-6" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
