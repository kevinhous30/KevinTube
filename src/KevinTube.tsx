/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Play, Search, X, Flame, Clock, User, ArrowLeft, History, Maximize2, Minimize2, ChevronDown, Trash2, Sparkles, Volume2, MessageSquare, VolumeX, Home, Youtube } from 'lucide-react';
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
    <div className="min-h-screen bg-black text-white font-sans flex flex-col">
      {/* YouTube-Style Header */}
      <header className="fixed top-0 w-full z-[100] bg-zinc-900 border-b border-zinc-800 h-20 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={clearSearch}>
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-900/40">
            <Youtube className="w-7 h-7 text-white" />
          </div>
          <span className="font-bold text-2xl tracking-tighter hidden sm:block">KevinTube</span>
        </div>

        <div className="flex-1 max-w-2xl mx-10">
          <form onSubmit={handleSearch} className="relative group">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Tìm kiếm video hoặc dán link YouTube..."
              className="w-full bg-black border border-zinc-800 rounded-2xl pl-12 pr-4 py-3 text-lg outline-none focus:border-red-600 transition-all placeholder:text-zinc-700"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-zinc-600 group-focus-within:text-red-600" />
            {urlInput && (
              <button type="button" onClick={() => setUrlInput('')} className="absolute right-4 top-1/2 -translate-y-1/2">
                <X className="w-6 h-6 text-zinc-500" />
              </button>
            )}
          </form>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center border border-zinc-700 active:bg-zinc-700 transition-colors">
            <Home className="w-6 h-6 text-white" />
          </button>
        </div>
      </header>

      {/* Main Feed Content */}
      <main className="flex-1 pt-24 pb-20 px-6 overflow-y-auto">
        <div className="max-w-[1800px] mx-auto">
          {/* Categories */}
          <div className="flex items-center gap-3 mb-8 overflow-x-auto no-scrollbar pb-2">
            <button 
              onClick={() => setActiveTab('suggested')}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${activeTab === 'suggested' ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700'}`}
            >
              🎉 Đề xuất
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${activeTab === 'history' ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700'}`}
            >
              🕒 Đã xem
            </button>
            <div className="h-6 w-px bg-zinc-800 mx-2"></div>
            <button className="px-6 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap bg-zinc-900 text-zinc-400 border border-zinc-800">Âm nhạc</button>
            <button className="px-6 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap bg-zinc-900 text-zinc-400 border border-zinc-800">Trực tiếp</button>
            <button className="px-6 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap bg-zinc-900 text-zinc-400 border border-zinc-800">Tin tức</button>
          </div>

          {error && (
            <div className="mb-8 p-4 rounded-2xl bg-red-900/20 text-red-500 text-sm text-center border border-red-500/30">
              {error}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="w-full aspect-video bg-zinc-900 rounded-2xl mb-4"></div>
                  <div className="space-y-3 px-2">
                    <div className="h-4 bg-zinc-900 rounded-md w-full"></div>
                    <div className="h-3 bg-zinc-900 rounded-md w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-6 gap-y-10">
              {displayVideos.map((video, index) => (
                <button
                  key={video.videoId + index}
                  onClick={() => playVideo(video)}
                  className="flex flex-col group active:scale-95 transition-all text-left"
                >
                  <div className="relative aspect-video w-full bg-zinc-900 rounded-2xl overflow-hidden mb-4 border border-zinc-800 group-hover:border-red-600/50 transition-colors">
                    <img 
                      src={video.thumbnail || video.image} 
                      alt={video.title} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
                    {video.timestamp && (
                      <div className="absolute bottom-3 right-3 bg-black/90 text-xs font-black px-2 py-1 rounded-lg text-white">
                        {video.timestamp}
                      </div>
                    )}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-red-600/0 group-hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0">
                       <Play className="w-6 h-6 text-white fill-current" />
                    </div>
                  </div>
                  <div className="flex gap-4 px-1">
                    <div className="w-10 h-10 rounded-2xl bg-zinc-900 shrink-0 flex items-center justify-center border border-zinc-800">
                      <User className="w-6 h-6 text-zinc-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold line-clamp-2 leading-tight mb-2 text-zinc-100 group-hover:text-red-500 transition-colors">{video.title}</h3>
                      <div className="flex flex-col text-xs text-zinc-500 font-medium">
                        <span className="hover:text-zinc-300 transition-all">{video.author?.name || 'YouTube Channel'}</span>
                        <span className="mt-1">{formatViews(video.views || 0)}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}

              {displayVideos.length === 0 && (
                 <div className="col-span-full flex flex-col items-center justify-center py-40 text-center">
                    <div className="w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center mb-6">
                      <Youtube className="w-10 h-10 text-zinc-800" />
                    </div>
                    <h2 className="text-xl font-bold text-zinc-500">Khám phá nội dung mới</h2>
                    <p className="text-zinc-600 mt-2">Nhập từ khóa tìm kiếm để bắt đầu trải nghiệm</p>
                 </div>
              )}
            </div>
          )}
        </div>
      </main>
      
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

