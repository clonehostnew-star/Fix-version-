'use client';

import { useEffect, useState } from 'react';

export default function WelcomeBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show banner after a short delay
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-40 overflow-hidden">
      <div className="bg-gradient-to-r from-green-600 via-green-500 to-green-600 text-white py-3 px-4 shadow-lg">
        <div className="animate-slide-banner whitespace-nowrap">
          <span className="inline-block mr-8 text-lg font-semibold">
            🌳 Welcome to WABOT TREE HOSTING - Your Ultimate WhatsApp Bot Hosting Solution! 🚀
          </span>
          <span className="inline-block mr-8 text-lg font-semibold">
            🌳 Welcome to WABOT TREE HOSTING - Your Ultimate WhatsApp Bot Hosting Solution! 🚀
          </span>
          <span className="inline-block mr-8 text-lg font-semibold">
            🌳 Welcome to WABOT TREE HOSTING - Your Ultimate WhatsApp Bot Hosting Solution! 🚀
          </span>
        </div>
      </div>
      
      {/* Glowing effect overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-glow-sweep pointer-events-none"></div>
    </div>
  );
}