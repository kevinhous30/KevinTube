/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Play, Search, X, Flame, Clock, User, ArrowLeft, History, Maximize2, Minimize2, ChevronDown, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
}

function extractVideoId(url: string): string | null {
  if (!url) return null;
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname.includes('youtube.com')) {
      if (parsedUrl.pathname === '/watch') {
        return parsedUrl.searchParams.get('v');
      }
      if (parsedUrl.pathname.startsWith('/embed/')) {
        return parsedUrl.pathname.split('/')[2];
      }
      if (parsedUrl.pathname.startsWith('/v/')) {
        return parsedUrl.pathname.split('/')[2];
      }
      if (parsedUrl.pathname.startsWith('/shorts/')) {
        return parsedUrl.pathname.split('/')[2];
      }
    } else if (parsedUrl.hostname === 'youtu.be') {
      return parsedUrl.pathname.substring(1);
    }
  } catch (e) {
    // Ignore URL parsing errors and fall back to regex
  }

  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = url.match(regex);
  if (match && match[1]) {
    return match[1];
  }
  return null;
}

function formatViews(views: number): string {
  if (views >= 1000000) {
    return (views / 1000000).toFixed(1) + 'M views';
  }
  if (views >= 1000) {
    return (views / 1000).toFixed(1) + 'K views';
  }
  return views + ' views';
}

export default function App() {
  const [urlInput, setUrlInput] = useState('');
  const [activeVideo, setActiveVideo] = useState<VideoState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<SearchResult[]>([]);
  const [history, setHistory] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'trending' | 'history'>('trending');

  useEffect(() => {
    fetchTrending();
    const saved = localStorage.getItem('kevintube_history');
    if (saved) {
      try { setHistory(JSON.parse(saved)); } catch(e){}
    }
  }, []);

  const addToHistory = (video: SearchResult) => {
    setHistory(prev => {
      const newHistory = [video, ...prev.filter(v => v.videoId !== video.videoId)].slice(0, 50);
      localStorage.setItem('kevintube_history', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const fetchTrending = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/trending');
      if (!res.ok) throw new Error('Failed to fetch trending videos');
      const data = await res.json();
      setVideos(data);
      setIsSearching(false);
    } catch (err) {
      setError('Could not load videos. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const playVideo = (video: SearchResult) => {
    setActiveVideo({ id: video.videoId, isMinimized: false, details: video });
    addToHistory(video);
  };

  const playVideoById = async (id: string) => {
    setActiveVideo({ id, isMinimized: false });
    try {
      const res = await fetch(`/api/video/${id}`);
      if (res.ok) {
        const data = await res.json();
        setActiveVideo(prev => prev?.id === id ? { ...prev, details: data } : prev);
        addToHistory(data);
      }
    } catch(e){}
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setError(null);

    // If it's a URL, play it directly
    const id = extractVideoId(urlInput);
    if (id) {
      playVideoById(id);
      return;
    }

    // Otherwise, perform search
    setLoading(true);
    setIsSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(urlInput)}`);
      if (!res.ok) throw new Error('Failed to search videos');
      const data = await res.json();
      setVideos(data);
    } catch (err) {
      setError('Search failed. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setUrlInput('');
    setIsSearching(false);
    setActiveTab('trending');
    fetchTrending();
  };

  const displayVideos = isSearching ? videos : (activeTab === 'history' ? history : videos);

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-red-500/30">
      <div className="flex flex-col h-screen overflow-hidden">
        {/* Header / Navbar */}
        <header className="flex-none fixed top-0 w-full z-30 bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-900 border-b-2">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-20 sm:h-24 flex items-center justify-between gap-3 sm:gap-6">
            <div className="flex items-center gap-3 cursor-pointer shrink-0" onClick={clearSearch}>
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-500/20">
                <Play className="w-5 h-5 sm:w-7 sm:h-7 text-white fill-white ml-0.5 sm:ml-1" />
              </div>
              <span className="font-display font-bold text-xl sm:text-3xl tracking-tight hidden md:block">KevinTube</span>
            </div>

            <form onSubmit={handleSearch} className="flex-1 max-w-4xl w-full">
              <div className="relative flex items-center group">
                <div className="absolute left-4 sm:left-6 text-zinc-500 group-focus-within:text-red-500 transition-colors pointer-events-none">
                  <Search className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="Search or paste link..."
                  className="w-full bg-zinc-900/80 border-2 border-zinc-800 focus:border-red-500/50 rounded-full py-3 sm:py-5 pl-12 sm:pl-16 pr-12 sm:pr-16 text-base sm:text-xl outline-none transition-all placeholder:text-zinc-500 focus:bg-zinc-900 shadow-inner"
                />
                {urlInput && (
                  <button
                    type="button"
                    onClick={() => setUrlInput('')}
                    className="absolute right-2 sm:right-3 p-2 sm:p-4 text-zinc-500 hover:text-white transition-colors rounded-full hover:bg-zinc-800"
                  >
                    <X className="w-5 h-5 sm:w-7 sm:h-7" />
                  </button>
                )}
              </div>
            </form>

            <div className="flex items-center gap-2 shrink-0 md:w-[13rem] justify-end">
              <button 
                onClick={() => { setActiveTab('history'); setIsSearching(false); }}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-full transition-colors ${activeTab === 'history' && !isSearching ? 'bg-red-600 shadow-lg shadow-red-500/20 text-white' : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
                title="History"
              >
                <History className="w-5 h-5 sm:w-6 sm:h-6" />
                <span className="hidden lg:inline font-medium text-lg">History</span>
              </button>
              <button 
                onClick={() => { setActiveTab('trending'); setIsSearching(false); }}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-full transition-colors ${activeTab === 'trending' && !isSearching ? 'bg-red-600 shadow-lg shadow-red-500/20 text-white' : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
                title="Trending"
              >
                <Flame className="w-5 h-5 sm:w-6 sm:h-6" />
                <span className="hidden lg:inline font-medium text-lg">Trending</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto pt-24 sm:pt-32 pb-24 sm:pb-32 px-4 sm:px-6 shadow-inner relative">
          <div className="max-w-[1600px] mx-auto">
            <div className="flex items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-10">
              <div className="flex items-center gap-3 sm:gap-4 truncate">
                {isSearching ? (
                  <>
                    <button 
                      onClick={clearSearch}
                      className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-full bg-zinc-900 flex items-center justify-center hover:bg-zinc-800 transition-colors active:scale-95"
                      aria-label="Back to Trending"
                    >
                      <ArrowLeft className="w-6 h-6 sm:w-7 sm:h-7 text-zinc-400" />
                    </button>
                    <h2 className="text-2xl sm:text-3xl font-display font-bold text-white truncate">Search Results</h2>
                  </>
                ) : activeTab === 'history' ? (
                  <>
                    <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-full bg-red-500/10 flex items-center justify-center">
                      <History className="w-6 h-6 sm:w-7 sm:h-7 text-red-500" />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-display font-bold text-white truncate">Watch History</h2>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-full bg-red-500/10 flex items-center justify-center">
                      <Flame className="w-6 h-6 sm:w-7 sm:h-7 text-red-500" />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-display font-bold text-white truncate">Trending Now</h2>
                  </>
                )}
              </div>
              
              {!isSearching && activeTab === 'history' && history.length > 0 && (
                   <button 
                      onClick={() => { setHistory([]); localStorage.removeItem('kevintube_history'); }}
                      className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
                   >
                      <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="font-medium text-sm sm:text-base hidden sm:block">Clear</span> 
                      <span className="font-medium text-sm sm:text-base sm:hidden">Clear</span> 
                   </button>
              )}
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 mb-8 max-w-md">
                {error}
              </div>
            )}

            {loading && !isSearching && activeTab !== 'history' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="w-full aspect-video bg-zinc-900 rounded-xl mb-3"></div>
                    <div className="h-4 bg-zinc-900 rounded-md w-3/4 mb-2"></div>
                    <div className="h-3 bg-zinc-900 rounded-md w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8 sm:gap-y-12">
                {displayVideos.map((video, index) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index > 15 ? 0 : index * 0.05 }}
                    key={video.videoId + index}
                    className="group flex flex-col active:scale-[0.98] transition-transform"
                  >
                    <div 
                      className="relative w-full aspect-video rounded-2xl overflow-hidden mb-3 sm:mb-4 bg-zinc-900 border border-zinc-800/50 shadow-md cursor-pointer"
                      onClick={() => playVideo(video)}
                    >
                      <img
                        src={video.image || video.thumbnail}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-300"></div>
                      {video.timestamp && (
                        <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 bg-black/80 backdrop-blur-md text-xs sm:text-sm font-semibold px-2 sm:px-2.5 py-1 rounded-md text-zinc-100 border border-white/10">
                          {video.timestamp}
                        </div>
                      )}
                    </div>
                    
                    <div className="px-1 sm:px-2 cursor-pointer flex-1 flex flex-col" onClick={() => playVideo(video)}>
                      <h3 className="font-semibold text-zinc-100 line-clamp-2 leading-snug group-hover:text-red-400 transition-colors mb-2 text-base sm:text-lg">
                        {video.title}
                      </h3>
                      
                      <div className="text-zinc-400 text-sm sm:text-base flex flex-col gap-1 mt-auto">
                        <span className="flex items-center gap-1.5 font-medium text-zinc-300">
                          <User className="w-4 h-4" />
                          {video.author?.name || 'Unknown'}
                        </span>
                        <span className="flex items-center gap-1.5 opacity-80">
                          <Clock className="w-4 h-4" />
                          {formatViews(video.views || 0)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
            
            {(!loading && displayVideos.length === 0 && !error) && (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                {activeTab === 'history' && !isSearching ? (
                  <>
                    <History className="w-16 h-16 mb-4 opacity-20" />
                    <p className="text-lg">Your watch history is empty.</p>
                  </>
                ) : (
                  <>
                    <Search className="w-16 h-16 mb-4 opacity-20" />
                    <p className="text-lg">No videos found. Try a different search.</p>
                  </>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Floating / FullScreen Player */}
      <AnimatePresence>
        {activeVideo && (
          <motion.div
            layout
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={
              activeVideo.isMinimized
                ? "fixed bottom-0 sm:bottom-6 right-0 sm:right-6 w-full sm:w-[500px] bg-zinc-950 sm:rounded-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] sm:shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-50 border-t sm:border border-zinc-800 overflow-hidden flex flex-col"
                : "fixed inset-0 z-50 bg-black flex flex-col"
            }
          >
            {/* Top Bar Navigation (Player) */}
            <div className={`flex items-center justify-between px-3 sm:px-6 py-2 sm:py-4 bg-zinc-900/90 backdrop-blur-xl border-b border-white/5 ${activeVideo.isMinimized ? 'shrink-0' : 'absolute top-0 left-0 right-0 z-20'}`}>
               <div className="flex items-center gap-3 sm:gap-4 truncate pr-4">
                  {!activeVideo.isMinimized && (
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-red-600/20 flex items-center justify-center border border-red-500/20 shrink-0 shadow-lg">
                      <Play className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 fill-red-500 ml-1" />
                    </div>
                  )}
                  <div className="flex flex-col truncate">
                    <span className={`font-display font-bold truncate ${activeVideo.isMinimized ? 'text-sm sm:text-base text-zinc-100' : 'text-xl sm:text-2xl text-white drop-shadow-md'}`}>
                      {activeVideo.details?.title || 'KevinTube Player'}
                    </span>
                    {activeVideo.isMinimized && activeVideo.details && (
                      <span className="text-xs text-zinc-400 truncate mt-0.5">{activeVideo.details.author?.name}</span>
                    )}
                  </div>
               </div>
               
               <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                  <button 
                    onClick={() => setActiveVideo(p => p ? { ...p, isMinimized: !p.isMinimized } : null)}
                    className="p-2 sm:p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors backdrop-blur-md"
                  >
                    {activeVideo.isMinimized ? <Maximize2 className="w-5 h-5" /> : <ChevronDown className="w-6 h-6" />}
                  </button>
                  <button 
                    onClick={() => setActiveVideo(null)}
                    className="p-2 sm:p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors hover:text-red-400 hover:bg-red-500/10 backdrop-blur-md"
                  >
                    <X className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
               </div>
            </div>

            {/* Video Player Iframe */}
            <div className={`flex-1 w-full relative bg-black ${activeVideo.isMinimized ? '' : 'mt-[4.5rem] sm:mt-[5.5rem]'}`}>
              <div className={activeVideo.isMinimized ? "w-full aspect-video" : "absolute inset-0"}>
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${activeVideo.id}?autoplay=1&modestbranding=1&rel=0&iv_load_policy=3&controls=1`}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="w-full h-full border-none"
                ></iframe>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

