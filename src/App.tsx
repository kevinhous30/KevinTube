/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
                      className="w-full bg-zinc-900/80 border-2 border-zinc-800 focus:border-red-500/50 rounded-full py-4 sm:py-5 pl-14 sm:pl-16 pr-14 sm:pr-16 text-lg sm:text-xl outline-none transition-all placeholder:text-zinc-500 focus:bg-zinc-900 shadow-inner"
                    />
                    {urlInput && (
                      <button
                        type="button"
                        onClick={() => setUrlInput('')}
                        className="absolute right-2 sm:right-3 p-3 sm:p-4 text-zinc-500 hover:text-white transition-colors rounded-full hover:bg-zinc-800"
                      >
                        <X className="w-6 h-6 sm:w-7 sm:h-7" />
                      </button>
                    )}
                  </div>
                </form>

                <div className="hidden md:block md:w-[13rem] shrink-0"></div> {/* Spacer for balance */}
              </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto pt-24 sm:pt-32 pb-20 sm:pb-16 px-4 sm:px-6 shadow-inner">
              <div className="max-w-[1600px] mx-auto">
                <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-10">
                  {isSearching ? (
                    <>
                      <button 
                        onClick={clearSearch}
                        className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-full bg-zinc-900 flex items-center justify-center hover:bg-zinc-800 transition-colors active:scale-95"
                        aria-label="Back to Trending"
                      >
                        <ArrowLeft className="w-6 h-6 sm:w-7 sm:h-7 text-zinc-400" />
                      </button>
                      <h2 className="text-2xl sm:text-3xl font-display font-bold text-white w-full truncate">Search Results</h2>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-full bg-red-500/10 flex items-center justify-center">
                        <Flame className="w-6 h-6 sm:w-7 sm:h-7 text-red-500" />
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-display font-bold text-white">Trending Now</h2>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8 sm:gap-y-12">
                    {videos.map((video) => (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={video.videoId}
                        className="group flex flex-col active:scale-[0.98] transition-transform"
                      >
                        <div 
                          className="relative w-full aspect-video rounded-2xl overflow-hidden mb-3 sm:mb-4 bg-zinc-900 border border-zinc-800/50 shadow-md cursor-pointer"
                          onClick={() => setVideoId(video.videoId)}
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
                        
                        <div className="px-1 sm:px-2 cursor-pointer flex-1 flex flex-col" onClick={() => setVideoId(video.videoId)}>
                          <h3 className="font-semibold text-zinc-100 line-clamp-2 leading-snug group-hover:text-red-400 transition-colors mb-2 text-base sm:text-lg">
                            {video.title}
                          </h3>
                          
                          <div className="text-zinc-400 text-sm sm:text-base flex flex-col gap-1 mt-auto">
                            <span className="flex items-center gap-1.5 font-medium text-zinc-300">
                              <User className="w-4 h-4" />
                              {video.author.name}
                            </span>
                            <span className="flex items-center gap-1.5 opacity-80">
                              <Clock className="w-4 h-4" />
                              {formatViews(video.views)}
                            </span>
                          </div>
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
            className="fixed top-0 left-0 right-0 bottom-0 z-50 bg-black w-full h-full"
          >
            {/* Top Bar Navigation (Player) */}
            <motion.div 
              initial={{ y: -100 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.2, type: 'spring', damping: 20 }}
              className="absolute top-0 left-0 right-0 p-4 sm:p-6 flex justify-between items-center z-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-red-600/20 backdrop-blur-md flex items-center justify-center border border-red-500/20 shadow-lg">
                  <Play className="w-6 h-6 text-red-500 fill-red-500 ml-1" />
                </div>
                <span className="font-display font-bold text-xl sm:text-2xl tracking-tight drop-shadow-md text-white">KevinTube</span>
              </div>
              
              <button 
                onClick={clearVideo}
                className="pointer-events-auto h-14 px-6 sm:px-8 bg-black/60 hover:bg-black/80 backdrop-blur-xl rounded-full flex items-center gap-3 text-white font-medium transition-all group border border-white/20 active:scale-95 shadow-2xl"
              >
                <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform duration-300" />
                <span className="text-lg">Back</span>
              </button>
            </motion.div>

            {/* Video Player */}
            <div className="absolute top-0 left-0 w-full h-full bg-black z-10">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0&iv_load_policy=3&controls=1`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full border-none"
              ></iframe>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

