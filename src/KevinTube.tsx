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
    <div className="min-h-screen bg-[#0f0f0f] text-white font-sans selection:bg-red-500">
      <div className="flex flex-col min-h-screen">
        {/* Mobile-Style Header - High Contrast for Cars */}
        <header className="fixed top-0 w-full z-[8000] bg-[#0f0f0f] border-b border-zinc-800 h-14 px-3 flex items-center justify-between gap-3 overflow-hidden">
          <div className="flex items-center gap-2 shrink-0" onClick={clearSearch}>
            <Play className="w-7 h-7 text-red-600 fill-current" />
            <span className="font-bold text-lg tracking-tighter hidden xs:block">KevinTube</span>
          </div>

          <form onSubmit={handleSearch} className="flex-1 max-w-md mx-1">
            <div className="relative flex items-center">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Tìm trên YouTube..."
                className="w-full bg-[#121212] border border-zinc-700 rounded-full py-2 pl-4 pr-10 text-sm outline-none focus:border-blue-500 placeholder:text-zinc-500"
              />
              {urlInput && (
                <button
                  type="button"
                  onClick={() => setUrlInput('')}
                  className="absolute right-12 p-2 text-zinc-500 active:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button type="submit" className="absolute right-0 top-0 bottom-0 px-3 flex items-center justify-center bg-zinc-800 rounded-r-full border-l border-zinc-700 active:bg-zinc-700">
                <Search className="w-4 h-4 text-zinc-300" />
              </button>
            </div>
          </form>

          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => navigate('/')} className="w-10 h-10 flex items-center justify-center active:bg-zinc-800 rounded-full transition-colors" title="Về Dashboard">
              <Home className="w-6 h-6" />
            </button>
          </div>
        </header>

        {/* Categories / Navigation Tabs - Swipeable Style */}
        <div className="fixed top-14 w-full z-[7000] bg-[#0f0f0f] border-b border-zinc-800 h-12 flex items-center px-4 gap-3 overflow-x-auto no-scrollbar shadow-md">
           <button 
            onClick={() => { setActiveTab('suggested'); setIsSearching(false); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${activeTab === 'suggested' && !isSearching ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-300 active:bg-zinc-700'}`}
           >
            Trang chủ
           </button>
           <button 
            onClick={() => { setActiveTab('history'); setIsSearching(false); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${activeTab === 'history' && !isSearching ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-300 active:bg-zinc-700'}`}
           >
            Lịch sử
           </button>
           <div className="h-5 w-[1px] bg-zinc-800 shrink-0" />
           <span className="text-[10px] text-zinc-600 uppercase font-bold tracking-widest whitespace-nowrap">Dành cho ô tô</span>
        </div>

        {/* Main Feed Content - Mobile Scroll Design */}
        <main className="flex-1 pt-28 pb-20 px-0 relative">
          <div className="max-w-3xl mx-auto">
            <div className="px-4 pb-4 flex items-center justify-between">
               <h2 className="text-xl font-bold">
                 {isSearching ? 'Kết quả tìm kiếm' : activeTab === 'history' ? 'Lịch sử xem' : 'Gợi ý cho bạn'}
               </h2>
               {activeTab === 'history' && history.length > 0 && !isSearching && (
                 <button 
                  onClick={() => { setHistory([]); localStorage.removeItem('kevintube_history'); }}
                  className="text-xs font-bold text-red-500 active:bg-red-500/10 px-2 py-1 rounded"
                 >
                  XÓA TẤT CẢ
                 </button>
               )}
            </div>

            {error && (
              <div className="mx-4 my-4 p-3 rounded-lg bg-red-900/20 border border-red-500/50 text-red-500 text-xs">
                {error}
              </div>
            )}

            {loading && !isSearching && activeTab !== 'history' ? (
              <div className="flex flex-col gap-6 p-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="w-full aspect-video bg-zinc-900 rounded-lg mb-3"></div>
                    <div className="h-4 bg-zinc-900 rounded-md w-3/4 mb-2"></div>
                    <div className="h-3 bg-zinc-900 rounded-md w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col">
                {displayVideos.map((video, index) => (
                  <button
                    key={video.videoId + index}
                    onClick={() => playVideo(video)}
                    className="flex flex-col w-full mb-6 active:bg-zinc-900 transition-colors text-left"
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
                    <div className="flex gap-3 p-4">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 shrink-0 flex items-center justify-center border border-zinc-700">
                        <User className="w-5 h-5 text-zinc-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold line-clamp-2 leading-snug mb-1 text-zinc-100">{video.title}</h3>
                        <p className="text-[11px] text-zinc-500 flex items-center gap-1">
                          <span className="font-semibold text-zinc-400">{video.author?.name || 'YouTube Channel'}</span>
                          <span>•</span>
                          <span>{formatViews(video.views || 0)} lượt xem</span>
                        </p>
                      </div>
                    </div>
                  </button>
                ))}

                {displayVideos.length === 0 && !loading && (
                   <div className="flex flex-col items-center justify-center py-24 text-center px-6">
                      <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-6">
                         {activeTab === 'history' ? <History className="w-10 h-10 text-zinc-700" /> : <Play className="w-10 h-10 text-zinc-700" />}
                      </div>
                      <h2 className="text-lg font-bold mb-2">Chưa có video nào</h2>
                      <p className="text-zinc-500 text-xs">Hãy tìm kiếm nội dung bạn muốn xem hoặc dán link YouTube.</p>
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
          {/* Player Top Controls */}
          <div className="h-14 bg-black/50 flex items-center justify-between px-4 sticky top-0 z-[10010]">
             <button onClick={(e) => { e.stopPropagation(); setActiveVideo(p => p ? { ...p, isMinimized: true } : null); }} className="p-2 active:bg-white/10 rounded-full"><ChevronDown className="w-8 h-8" /></button>
             <button onClick={(e) => { e.stopPropagation(); setActiveVideo(null); }} className="p-2 text-red-500 active:bg-red-500/10 rounded-full"><X className="w-8 h-8" /></button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="aspect-video w-full bg-black sticky top-14 z-[10005]">
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
                    fs: 1
                  }
                }}
                onReady={(e) => {
                  try { e.target.playVideo(); } catch(err) {}
                }}
                onEnd={handleVideoEnded}
                style={{ width: '100%', height: '100%' }}
              />
            </div>

            <div className="p-4">
              <h1 className="text-lg font-bold mb-3">{activeVideo.details?.title}</h1>
              <div className="flex items-center gap-3 py-3 border-b border-zinc-800">
                <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center">
                   <User className="w-6 h-6 text-zinc-500" />
                </div>
                <div>
                   <p className="font-bold text-sm">{activeVideo.details?.author?.name}</p>
                   <p className="text-xs text-zinc-500">{formatViews(activeVideo.details?.views || 0)} views</p>
                </div>
              </div>

              {/* Related Videos List */}
              <div className="mt-6">
                <h3 className="font-bold text-sm mb-4">Video liên quan</h3>
                <div className="flex flex-col gap-4">
                  {activeVideo.related?.slice(0, 10).map((v, i) => (
                    <button key={i} onClick={() => playVideo(v)} className="flex gap-3 active:bg-zinc-800 rounded-lg p-1 text-left">
                       <img src={v.thumbnail} className="w-32 aspect-video object-cover rounded-md flex-shrink-0" />
                       <div className="flex-1 min-w-0">
                          <h4 className="text-[13px] font-medium line-clamp-2 leading-tight">{v.title}</h4>
                          <p className="text-[11px] text-zinc-500 mt-1">{v.author?.name}</p>
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
             <img src={activeVideo.thumbnail || activeVideo.image} className="w-full h-full object-cover rounded-l-lg" />
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

