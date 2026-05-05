/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Play, Search, X, Flame, Clock, User, ArrowLeft, History, Maximize2, Minimize2, ChevronDown, Trash2, Sparkles, Volume2, MessageSquare, VolumeX, Home } from 'lucide-react';
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
        // Find a recent history item to base suggestions on, preferably one with an author
        const recent = currentHistory[0];
        // Create a query based on author and partial title
        const q = `${recent.author?.name || ''} ${recent.title.split(' ').slice(0, 3).join(' ')}`.trim();
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (!res.ok) throw new Error('Failed to fetch suggested videos');
        const data = await res.json();
        if (data && data.length > 0) {
          setVideos(data);
        } else {
          // Fallback to trending if search returned no results
          const fallbackRes = await fetch('/api/trending');
          const fallbackData = await fallbackRes.json();
          setVideos(fallbackData);
        }
      } else {
        // Fallback to trending if no history
        const res = await fetch('/api/trending');
        if (!res.ok) throw new Error('Failed to fetch trending videos');
        const data = await res.json();
        setVideos(data);
      }
      setIsSearching(false);
    } catch (err) {
      setError('Could not load videos. Please try again later.');
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
    setActiveTab('suggested');
    fetchSuggested(history);
    if (activeVideo && !activeVideo.isMinimized) {
      setActiveVideo(prev => prev ? { ...prev, isMinimized: true } : null);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const displayVideos = isSearching ? videos : (activeTab === 'history' ? history : videos);

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white font-sans selection:bg-red-600">
      <div className="flex flex-col min-h-screen">
        {/* YouTube-Style Header */}
        <header className="fixed top-0 w-full z-[8000] bg-[#121212]/95 backdrop-blur-md border-b border-white/5 h-12 px-4 flex items-center justify-between">
          <div className="flex items-center gap-1 cursor-pointer" onClick={clearSearch}>
            <div className="w-7 h-7 bg-[#FF0000] rounded-lg flex items-center justify-center">
              <Play className="w-4 h-4 text-white fill-current ml-0.5" />
            </div>
            <span className="font-bold text-lg tracking-tighter">KevinTube</span>
          </div>

          <div className="flex items-center gap-2">
            {!isSearching ? (
              <button 
                onClick={() => setIsSearching(true)}
                className="p-2 active:bg-white/10 rounded-full transition-colors"
              >
                <Search className="w-5 h-5 text-zinc-300" />
              </button>
            ) : (
               <form onSubmit={handleSearch} className="flex items-center gap-2">
                <input
                  autoFocus
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="Tìm kiếm..."
                  className="bg-transparent border-none outline-none text-sm w-32 sm:w-48 placeholder:text-zinc-600"
                />
                <button type="submit" className="hidden" />
                <button type="button" onClick={() => setIsSearching(false)} className="p-1">
                   <X className="w-5 h-5 text-zinc-500" />
                </button>
               </form>
            )}
            <button onClick={() => navigate('/')} className="p-2 active:bg-white/10 rounded-full transition-colors">
              <Home className="w-5 h-5 text-zinc-300" />
            </button>
          </div>
        </header>

        {/* Categories Chips */}
        {!isSearching && (
          <div className="fixed top-12 w-full z-[7000] bg-[#121212]/95 backdrop-blur-md border-b border-white/5 h-11 flex items-center px-4 gap-2 overflow-x-auto no-scrollbar">
            <button 
              onClick={() => { setActiveTab('suggested'); }}
              className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${activeTab === 'suggested' ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-300'}`}
            >
              Tất cả
            </button>
            <button 
              onClick={() => { setActiveTab('history'); }}
              className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${activeTab === 'history' ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-300'}`}
            >
              Đã xem
            </button>
          </div>
        )}

        {/* Main Feed Content */}
        <main className={`flex-1 ${!isSearching ? 'pt-24' : 'pt-16'} pb-16 px-0`}>
          <div className="max-w-3xl mx-auto space-y-2">
            {error && (
              <div className="mx-4 my-2 p-3 rounded bg-red-900/20 text-red-500 text-xs text-center border border-red-500/20">
                {error}
              </div>
            )}

            {loading ? (
              <div className="space-y-4 px-0">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="w-full aspect-video bg-zinc-900"></div>
                    <div className="p-4 space-y-2">
                      <div className="h-4 bg-zinc-900 rounded-md w-3/4"></div>
                      <div className="h-3 bg-zinc-900 rounded-md w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col">
                {displayVideos.map((video, index) => (
                  <button
                    key={video.videoId + index}
                    onClick={() => playVideo(video)}
                    className="flex flex-col w-full active:bg-zinc-900/80 transition-colors text-left"
                  >
                    <div className="relative aspect-video w-full bg-zinc-900">
                      <img 
                        src={video.thumbnail || video.image} 
                        alt={video.title} 
                        className="w-full h-full object-cover" 
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                      {video.timestamp && (
                        <div className="absolute bottom-2 right-2 bg-black/80 text-[10px] font-bold px-1.5 py-0.5 rounded text-white">
                          {video.timestamp}
                        </div>
                      )}
                    </div>
                    <div className="p-3 flex gap-3">
                      <div className="w-9 h-9 rounded-full bg-zinc-800 shrink-0 flex items-center justify-center border border-white/5">
                        <User className="w-5 h-5 text-zinc-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold line-clamp-2 leading-tight mb-0.5 text-zinc-100">{video.title}</h3>
                        <p className="text-[11px] text-zinc-400">
                          {video.author?.name || 'YouTube Channel'} • {formatViews(video.views || 0)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}

                {displayVideos.length === 0 && (
                   <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                      <Play className="w-12 h-12 text-zinc-800 mb-4" />
                      <h2 className="text-sm font-bold text-zinc-500">Không tìm thấy video nào</h2>
                   </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Full-Screen / Mobile-Optimized Player Overlay */}
      {activeVideo && (
        <div className={`fixed inset-0 z-[10000] bg-black flex flex-col ${activeVideo.isMinimized ? 'hidden' : 'block'}`}>
          {/* Player Top Controls - Floating Look */}
          <div className="h-14 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between px-4 fixed top-0 left-0 right-0 z-[10010]">
             <button onClick={(e) => { e.stopPropagation(); setActiveVideo(p => p ? { ...p, isMinimized: true } : null); }} className="p-2.5 active:bg-white/10 rounded-full bg-black/20 backdrop-blur-sm shadow-xl"><ChevronDown className="w-8 h-8" /></button>
             <div className="flex-1 px-4 truncate text-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 drop-shadow-md">Đang phát</span>
             </div>
             <button onClick={(e) => { e.stopPropagation(); setActiveVideo(null); }} className="p-2.5 text-zinc-100 active:bg-red-600 rounded-full bg-black/20 backdrop-blur-sm shadow-xl"><X className="w-8 h-8" /></button>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar">
            <div className="aspect-video w-full bg-black sticky top-0 z-[10005] shadow-2xl">
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

            <div className="p-6 bg-[#0f0f0f]">
              <h1 className="text-xl font-bold mb-4 leading-tight">{activeVideo.details?.title}</h1>
              
              <div className="flex items-center justify-between py-4 border-y border-zinc-900 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800">
                     <User className="w-7 h-7 text-zinc-600" />
                  </div>
                  <div>
                     <p className="font-bold text-md">{activeVideo.details?.author?.name}</p>
                     <p className="text-xs text-zinc-500 font-medium">{formatViews(activeVideo.details?.views || 0)} views</p>
                  </div>
                </div>
                <button className="bg-zinc-100 text-[#0f0f0f] px-5 py-2 rounded-full text-sm font-bold active:scale-95 transition-transform">
                  Theo dõi
                </button>
              </div>

              {/* Related Videos List - Vertical Minimalist */}
              <div className="mt-2">
                <div className="flex items-center justify-between mb-6">
                   <h3 className="font-bold text-lg">Tiếp theo</h3>
                   <span className="text-[10px] bg-zinc-900 text-zinc-500 px-2 py-0.5 rounded font-black">AUTO PLAY</span>
                </div>
                <div className="flex flex-col gap-6">
                  {activeVideo.related?.slice(0, 15).map((v, i) => (
                    <button key={i} onClick={() => playVideo(v)} className="flex gap-4 active:bg-zinc-900/50 rounded-xl p-1 text-left group">
                       <div className="relative w-40 aspect-video shrink-0 rounded-lg overflow-hidden shadow-lg border border-zinc-900">
                          <img src={v.thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          {v.timestamp && (
                             <div className="absolute bottom-1 right-1 bg-black/90 text-[8px] font-bold px-1 rounded">
                                {v.timestamp}
                             </div>
                          )}
                       </div>
                       <div className="flex-1 min-w-0 py-1">
                          <h4 className="text-sm font-bold line-clamp-2 leading-tight group-active:text-red-500">{v.title}</h4>
                          <p className="text-[11px] text-zinc-500 mt-1.5 font-medium">{v.author?.name}</p>
                          <p className="text-[10px] text-zinc-700 mt-0.5">{formatViews(v.views || 0)}</p>
                       </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Minimized Player - Bottom Tab Style */}
      {activeVideo?.isMinimized && (
        <div 
          onClick={() => setActiveVideo(p => p ? { ...p, isMinimized: false } : null)}
          className="fixed bottom-1 right-1 left-1 h-16 bg-zinc-900 border border-zinc-800 rounded-xl z-[9000] flex items-center px-1 overflow-hidden shadow-[0_-10px_30px_rgba(0,0,0,0.5)]"
        >
          <div className="w-28 h-full shrink-0">
             <img src={activeVideo.details?.thumbnail || activeVideo.details?.image} className="w-full h-full object-cover rounded-l-lg" />
          </div>
          <div className="flex-1 px-3 min-w-0">
             <p className="text-[11px] font-bold truncate text-white">{activeVideo.details?.title || 'Đang chơi...'}</p>
             <p className="text-[10px] text-zinc-500 truncate">{activeVideo.details?.author?.name}</p>
          </div>
          <button onClick={(e) => { e.stopPropagation(); setActiveVideo(null); }} className="p-4 active:bg-zinc-800 rounded-full">
             <X className="w-6 h-6 text-zinc-400" />
          </button>
        </div>
      )}

    </div>
  );
}

