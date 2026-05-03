/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Play, Search, X, Flame, Clock, User, ArrowLeft } from 'lucide-react';
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
  const [videoId, setVideoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    fetchTrending();
  }, []);

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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setError(null);

    // If it's a URL, play it directly
    const id = extractVideoId(urlInput);
    if (id) {
      setVideoId(id);
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

  const clearVideo = () => {
    setVideoId(null);
  };

  const clearSearch = () => {
    setUrlInput('');
    fetchTrending();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-red-500/30">
      <AnimatePresence mode="wait">
        {!videoId ? (
          <motion.div 
            key="explore"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col h-screen overflow-hidden"
          >
            {/* Header / Navbar */}
            <header className="flex-none fixed top-0 w-full z-30 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-900/50">
              <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 cursor-pointer" onClick={clearSearch}>
                  <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center">
                    <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                  </div>
                  <span className="font-display font-bold text-xl tracking-tight hidden sm:block">KevinTube</span>
                </div>

                <form onSubmit={handleSearch} className="flex-1 max-w-2xl mx-4">
                  <div className="relative flex items-center group">
                    <div className="absolute left-4 text-zinc-500 group-focus-within:text-red-500 transition-colors">
                      <Search className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="Search or paste YouTube link..."
                      className="w-full bg-zinc-900/50 border border-zinc-800 focus:border-red-500/50 rounded-full py-2.5 pl-11 pr-4 text-sm sm:text-base outline-none transition-all placeholder:text-zinc-600 focus:bg-zinc-900"
                    />
                    {urlInput && (
                      <button
                        type="button"
                        onClick={() => setUrlInput('')}
                        className="absolute right-4 text-zinc-500 hover:text-white transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </form>

                <div className="w-8 h-8 sm:w-24"></div> {/* Spacer for balance */}
              </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto pt-24 pb-12 px-4 scroll-smooth">
              <div className="max-w-7xl mx-auto">
                <div className="flex items-center gap-3 mb-8">
                  {isSearching ? (
                    <>
                      <button 
                        onClick={clearSearch}
                        className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center hover:bg-zinc-800 transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4 text-zinc-400" />
                      </button>
                      <h2 className="text-2xl font-display font-bold">Search Results</h2>
                    </>
                  ) : (
                    <>
                      <Flame className="w-6 h-6 text-red-500" />
                      <h2 className="text-2xl font-display font-bold">Trending Now</h2>
                    </>
                  )}
                </div>

                {error && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 mb-8 max-w-md">
                    {error}
                  </div>
                )}

                {loading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
                    {[...Array(12)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="w-full aspect-video bg-zinc-900 rounded-xl mb-3"></div>
                        <div className="h-4 bg-zinc-900 rounded-md w-3/4 mb-2"></div>
                        <div className="h-3 bg-zinc-900 rounded-md w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10">
                    {videos.map((video) => (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={video.videoId}
                        className="group cursor-pointer flex flex-col"
                        onClick={() => setVideoId(video.videoId)}
                      >
                        <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-3 bg-zinc-900">
                          <img
                            src={video.image || video.thumbnail}
                            alt={video.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-300"></div>
                          {video.timestamp && (
                            <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm text-xs font-medium px-1.5 py-0.5 rounded text-zinc-200">
                              {video.timestamp}
                            </div>
                          )}
                        </div>
                        
                        <h3 className="font-medium text-zinc-100 line-clamp-2 leading-snug group-hover:text-red-400 transition-colors mb-1.5 text-sm sm:text-base">
                          {video.title}
                        </h3>
                        
                        <div className="text-zinc-400 text-xs sm:text-sm flex flex-col gap-0.5">
                          <span className="flex items-center gap-1.5">
                            <User className="w-3 h-3" />
                            {video.author.name}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3" />
                            {formatViews(video.views)}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
                
                {!loading && videos.length === 0 && !error && (
                  <div className="text-center py-20 text-zinc-500">
                    No videos found. Try a different search.
                  </div>
                )}
              </div>
            </main>
          </motion.div>
        ) : (
          <motion.div 
            key="player"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-50 bg-black flex flex-col"
          >
            {/* Top Bar Navigation (Player) */}
            <motion.div 
              initial={{ y: -100 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.2, type: 'spring', damping: 20 }}
              className="absolute top-0 left-0 right-0 p-4 sm:p-6 flex justify-between items-center z-10 bg-gradient-to-b from-black/80 to-transparent pointer-events-none"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-600/20 backdrop-blur-md flex items-center justify-center border border-red-500/20 hidden sm:flex">
                  <Play className="w-4 h-4 text-red-500 fill-red-500 ml-0.5" />
                </div>
                <span className="font-display font-bold text-lg sm:text-xl tracking-tight drop-shadow-md">KevinTube</span>
              </div>
              
              <button 
                onClick={clearVideo}
                className="pointer-events-auto h-10 sm:h-12 px-4 sm:px-6 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center gap-2 text-white font-medium transition-all group border border-white/10 hover:border-white/20"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-1 transition-transform duration-300" />
                <span className="text-sm sm:text-base">Back</span>
              </button>
            </motion.div>

            {/* Video Player */}
            <div className="flex-1 w-full h-full bg-black">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0&iv_load_policy=3&controls=1`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full"
              ></iframe>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

