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
      {/* Header - Solid background for car */}
      <header className="fixed top-0 w-full z-[100] h-20 px-8 flex items-center justify-between bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-6">
          <button 
             onClick={() => navigate('/')}
             className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center active:scale-90"
          >
            <Home className="w-5 h-5 text-zinc-400" />
          </button>
          <div className="flex items-center gap-3 cursor-pointer group" onClick={clearSearch}>
            <div className="w-9 h-9 bg-red-700 rounded-xl flex items-center justify-center">
              <Youtube className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-black text-xl tracking-tighter hidden md:block">KEVINTUBE</span>
          </div>
        </div>

        <div className="flex-1 max-w-xl mx-8">
          <form onSubmit={handleSearch} className="relative group">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Tìm kiếm phim, ca nhạc..."
              className="w-full bg-black border border-zinc-800 rounded-xl pl-12 pr-10 py-3 text-sm outline-none focus:border-red-600 transition-all placeholder:text-zinc-700 font-medium"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 transition-colors" />
            <AnimatePresence>
              {urlInput && (
                <button 
                  type="button" 
                  onClick={() => setUrlInput('')} 
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </AnimatePresence>
          </form>
        </div>

        <div className="flex items-center gap-4">
           <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-zinc-800 border border-zinc-700 font-black text-[9px] text-zinc-500 uppercase tracking-widest">
              <div className="w-1.5 h-1.5 rounded-full bg-red-600"></div>
              Live Mode
           </div>
        </div>
      </header>

      {/* Navigation - Solid background */}
      <nav className="fixed top-20 w-full z-50 px-8 py-4 bg-zinc-900 border-b border-zinc-800 overflow-x-auto no-scrollbar">
        <div className="max-w-[1800px] mx-auto flex items-center gap-2">
          <button 
            onClick={() => setActiveTab('suggested')}
            className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeTab === 'suggested' ? 'bg-red-700 text-white' : 'bg-transparent text-zinc-600 border border-zinc-800'}`}
          >
            Đề xuất
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeTab === 'history' ? 'bg-red-700 text-white' : 'bg-transparent text-zinc-600 border border-zinc-800'}`}
          >
            Đã xem
          </button>
          <div className="h-4 w-px bg-zinc-800 mx-2"></div>
          {['Âm nhạc', 'Trực tiếp', 'Hài hước', 'Xe hơi', 'Phim'].map(cat => (
             <button key={cat} className="px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap bg-transparent text-zinc-600 border border-zinc-800">
                {cat}
             </button>
          ))}
        </div>
      </nav>

      <main className="pt-48 pb-32 px-8 min-h-screen relative z-10">
        <div className="max-w-[1800px] mx-auto">
          {error && (
            <div className="mb-8 p-4 rounded-xl bg-red-900/30 text-red-500 text-xs font-bold text-center border border-red-900/50">
              {error}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="w-full aspect-video bg-zinc-900 rounded-2xl mb-4"></div>
                  <div className="space-y-2 h-4 bg-zinc-900 rounded-lg w-full"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-8 gap-y-12">
              <AnimatePresence mode="popLayout">
                {displayVideos.map((video, index) => (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    key={video.videoId + index}
                    onClick={() => playVideo(video)}
                    className="flex flex-col group active:scale-95 transition-all text-left"
                  >
                    <div className="relative aspect-video w-full bg-zinc-900 rounded-2xl overflow-hidden mb-4 border border-zinc-800">
                      <img 
                        src={video.thumbnail || video.image} 
                        alt={video.title} 
                        className="w-full h-full object-cover" 
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors"></div>
                      
                      {video.timestamp && (
                        <div className="absolute bottom-3 right-3 bg-black/80 px-2 py-1 rounded text-[9px] font-black text-white">
                          {video.timestamp}
                        </div>
                      )}
                      
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                         <div className="w-14 h-14 bg-red-700/90 rounded-full flex items-center justify-center scale-75 group-hover:scale-100 transition-transform">
                            <Play className="w-6 h-6 text-white fill-current" />
                         </div>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-xl bg-zinc-800 shrink-0 flex items-center justify-center border border-zinc-700">
                        <User className="w-5 h-5 text-zinc-500" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold line-clamp-2 leading-tight text-white/90 group-hover:text-white transition-colors">{video.title}</h3>
                        <div className="mt-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-zinc-600">
                           <span>{video.author?.name || 'KEVINTUBE'}</span>
                           <span className="w-1 h-1 rounded-full bg-zinc-800"></span>
                           <span>{formatViews(video.views || 0)}</span>
                        </div>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>

              {displayVideos.length === 0 && (
                 <div className="col-span-full flex flex-col items-center justify-center py-40 text-center">
                    <Youtube className="w-12 h-12 text-zinc-800 mb-4" />
                    <h2 className="text-xl font-display font-black text-zinc-700 uppercase italic">Tín hiệu trống</h2>
                    <p className="text-zinc-800 mt-2 font-bold text-sm">Vui lòng nhập từ khóa tìm kiếm.</p>
                 </div>
              )}
            </div>
          )}
        </div>
      </main>
      
      {/* Overlay - Car Optimized */}
      <AnimatePresence>
        {activeVideo && !activeVideo.isMinimized && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] bg-black flex flex-col"
          >
            {/* Top Bar */}
            <div className="h-16 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-6 shrink-0 z-50">
               <div className="flex items-center gap-4">
                 <button 
                   onClick={() => setActiveVideo(p => p ? { ...p, isMinimized: true } : null)} 
                   className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center active:scale-90"
                 >
                   <ChevronDown className="w-6 h-6 text-white" />
                 </button>
                 <div className="hidden sm:block">
                   <p className="text-xs font-bold text-zinc-400 truncate max-w-md">{activeVideo.details?.title}</p>
                 </div>
               </div>
               
               <button 
                 onClick={() => setActiveVideo(null)} 
                 className="w-10 h-10 rounded-xl bg-red-700 flex items-center justify-center active:scale-95"
               >
                 <X className="w-6 h-6 text-white" />
               </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar" ref={playerContainerRef}>
              <div className="aspect-video w-full bg-black sticky top-0 z-40">
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
                  onEnd={handleVideoEnded}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>

              <div className="p-8 max-w-6xl mx-auto w-full space-y-10">
                <div className="flex flex-col lg:flex-row gap-12">
                  <div className="flex-1">
                    <h1 className="text-2xl font-black leading-tight tracking-tight mb-8">{activeVideo.details?.title}</h1>
                    
                    <div className="flex items-center justify-between p-6 rounded-2xl bg-zinc-900 border border-zinc-800 mb-8">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center border border-zinc-800">
                           <User className="w-6 h-6 text-zinc-600" />
                        </div>
                        <div>
                           <p className="font-bold text-base">{activeVideo.details?.author?.name}</p>
                           <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mt-1">{formatViews(activeVideo.details?.views || 0)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 mb-10">
                       <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-zinc-900 rounded-xl border border-zinc-800 text-[10px] font-black uppercase tracking-widest text-zinc-500"><Volume2 className="w-4 h-4" /> Audio</button>
                       <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-zinc-900 rounded-xl border border-zinc-800 text-[10px] font-black uppercase tracking-widest text-zinc-500"><MessageSquare className="w-4 h-4" /> Chat</button>
                       <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-zinc-900 rounded-xl border border-zinc-800 text-[10px] font-black uppercase tracking-widest text-zinc-500"><Subtitles className="w-4 h-4" /> CC</button>
                    </div>
                  </div>

                  <div className="lg:w-[400px] shrink-0">
                    <h3 className="font-black text-xs uppercase tracking-[0.2em] mb-6 text-zinc-500">Video tiếp theo</h3>
                    <div className="flex flex-col gap-6">
                      {activeVideo.related?.slice(0, 10).map((v, i) => (
                        <button key={i} onClick={() => playVideo(v)} className="flex gap-4 text-left group">
                           <div className="relative w-32 aspect-video shrink-0 rounded-lg overflow-hidden border border-zinc-800">
                              <img src={v.thumbnail} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/20"></div>
                           </div>
                           <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold line-clamp-2 leading-tight group-hover:text-red-500 transition-colors">{v.title}</h4>
                              <p className="text-[9px] font-black uppercase mt-1.5 text-zinc-600 truncate">{v.author?.name}</p>
                           </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Minimized Player - Car optimized */}
      <AnimatePresence>
        {activeVideo?.isMinimized && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            onClick={() => setActiveVideo(p => p ? { ...p, isMinimized: false } : null)}
            className="fixed bottom-4 right-4 left-4 md:left-auto md:w-[400px] h-20 bg-zinc-900 border border-zinc-800 rounded-2xl z-[9000] flex items-center p-2 shadow-2xl cursor-pointer"
          >
            <div className="w-28 h-full shrink-0 overflow-hidden rounded-xl relative">
               <img src={activeVideo.details?.thumbnail || activeVideo.details?.image} className="w-full h-full object-cover" />
               <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <Play className="w-5 h-5 text-white fill-current" />
               </div>
            </div>
            <div className="flex-1 ml-4 min-w-0">
               <p className="text-[8px] font-black uppercase tracking-widest text-red-600 mb-0.5">Background</p>
               <p className="text-xs font-bold truncate text-white">{activeVideo.details?.title || 'Đang phát'}</p>
               <p className="text-[9px] font-black uppercase text-zinc-600 truncate">{activeVideo.details?.author?.name}</p>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); setActiveVideo(null); }} 
              className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-600"
            >
               <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
