'use client';

import { useEffect, useState } from 'react';

export default function LoadingScreen() {
  const [loadingText, setLoadingText] = useState('');
  const [currentChar, setCurrentChar] = useState(0);
  const [highlightedPart, setHighlightedPart] = useState(0);

  const siteName = 'WABOT TREE HOSTING';
  const welcomeMessage = 'Welcome to WABOT TREE HOSTING - Your Ultimate WhatsApp Bot Hosting';

  useEffect(() => {
    // Typewriter effect for site name
    const typeInterval = setInterval(() => {
      if (currentChar < siteName.length) {
        setLoadingText(siteName.slice(0, currentChar + 1));
        setCurrentChar(prev => prev + 1);
      }
    }, 150);

    // Highlighting effect for tree parts
    const highlightInterval = setInterval(() => {
      setHighlightedPart(prev => (prev + 1) % 4);
    }, 800);

    return () => {
      clearInterval(typeInterval);
      clearInterval(highlightInterval);
    };
  }, [currentChar]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-green-900 via-green-800 to-green-700 flex items-center justify-center z-50">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating Leaves */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute text-green-400 opacity-60 animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
            }}
          >
            🍃
          </div>
        ))}
        
        {/* Glowing Stars */}
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute text-yellow-300 animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${1 + Math.random() * 1}s`,
            }}
          >
            ✨
          </div>
        ))}
      </div>

      {/* Main Loading Content */}
      <div className="relative z-10 text-center">
        {/* Tree with WhatsApp Symbol */}
        <div className="mb-8">
          {/* Tree Trunk */}
          <div className="mx-auto w-16 h-24 bg-gradient-to-b from-amber-800 to-amber-900 rounded-full mb-2"></div>
          
          {/* Tree Branches and Leaves */}
          <div className="relative">
            {/* Main Branch */}
            <div className="mx-auto w-32 h-4 bg-gradient-to-r from-amber-700 to-amber-800 rounded-full mb-2"></div>
            
            {/* Leaves Layer 1 */}
            <div className="flex justify-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-full transition-all duration-500 ${
                highlightedPart === 0 ? 'bg-green-400 shadow-lg shadow-green-400/50' : 'bg-green-600'
              }`}></div>
              <div className={`w-8 h-8 rounded-full transition-all duration-500 ${
                highlightedPart === 1 ? 'bg-green-400 shadow-lg shadow-green-400/50' : 'bg-green-600'
              }`}></div>
              <div className={`w-8 h-8 rounded-full transition-all duration-500 ${
                highlightedPart === 2 ? 'bg-green-400 shadow-lg shadow-green-400/50' : 'bg-green-600'
              }`}></div>
            </div>
            
            {/* Leaves Layer 2 */}
            <div className="flex justify-center gap-1 mb-2">
              <div className={`w-6 h-6 rounded-full transition-all duration-500 ${
                highlightedPart === 3 ? 'bg-green-400 shadow-lg shadow-green-400/50' : 'bg-green-600'
              }`}></div>
              <div className={`w-6 h-6 rounded-full transition-all duration-500 ${
                highlightedPart === 0 ? 'bg-green-400 shadow-lg shadow-green-400/50' : 'bg-green-600'
              }`}></div>
            </div>
            
            {/* WhatsApp Symbol */}
            <div className="absolute -right-8 top-2">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/50 animate-bounce">
                <span className="text-white text-xl">📱</span>
              </div>
            </div>
          </div>
        </div>

        {/* Site Name with Typewriter Effect */}
        <div className="mb-4">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-2">
            {loadingText}
            <span className="animate-pulse">|</span>
          </h1>
        </div>

        {/* Welcome Message */}
        <div className="mb-8">
          <p className="text-lg md:text-xl text-green-100 max-w-2xl mx-auto leading-relaxed">
            {welcomeMessage}
          </p>
        </div>

        {/* Loading Bar */}
        <div className="w-64 md:w-96 mx-auto bg-green-800 rounded-full h-3 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-green-400 to-green-300 rounded-full animate-loading-bar"></div>
        </div>

        {/* Loading Text */}
        <div className="mt-4 text-green-200">
          <p className="text-sm md:text-base">Growing your bot hosting experience...</p>
        </div>

        {/* Animated Elements */}
        <div className="mt-8 flex justify-center gap-4">
          <div className="w-3 h-3 bg-green-400 rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-3 h-3 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  );
}