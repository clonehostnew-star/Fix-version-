'use client';

import { useEffect, useState } from 'react';

export default function AnimatedBackground() {
  const [leaves, setLeaves] = useState<Array<{
    id: number;
    x: number;
    y: number;
    rotation: number;
    speed: number;
    delay: number;
    size: number;
  }>>([]);

  const [stars, setStars] = useState<Array<{
    id: number;
    x: number;
    y: number;
    opacity: number;
    size: number;
    delay: number;
  }>>([]);

  useEffect(() => {
    // Generate leaves
    const newLeaves = Array.from({ length: 25 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      rotation: Math.random() * 360,
      speed: 0.5 + Math.random() * 1.5,
      delay: Math.random() * 5,
      size: 0.8 + Math.random() * 0.4,
    }));
    setLeaves(newLeaves);

    // Generate stars
    const newStars = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      opacity: 0.3 + Math.random() * 0.7,
      size: 0.5 + Math.random() * 1,
      delay: Math.random() * 3,
    }));
    setStars(newStars);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Wind Direction Indicator */}
      <div className="absolute top-4 right-4 text-green-400 opacity-60 animate-pulse">
        <div className="flex items-center gap-2">
          <span className="text-sm">🌬️</span>
          <span className="text-xs">Wind: →</span>
        </div>
      </div>

      {/* Animated Leaves */}
      {leaves.map((leaf) => (
        <div
          key={leaf.id}
          className="absolute text-green-400 animate-float-leaf"
          style={{
            left: `${leaf.x}%`,
            top: `${leaf.y}%`,
            transform: `rotate(${leaf.rotation}deg) scale(${leaf.size})`,
            animationDelay: `${leaf.delay}s`,
            animationDuration: `${8 + leaf.speed * 2}s`,
          }}
        >
          🍃
        </div>
      ))}

      {/* Glowing Stars */}
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute text-yellow-300 animate-twinkle"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            opacity: star.opacity,
            transform: `scale(${star.size})`,
            animationDelay: `${star.delay}s`,
            animationDuration: `${2 + Math.random() * 2}s`,
          }}
        >
          ✨
        </div>
      ))}

      {/* Wind Effect Lines */}
      <div className="absolute inset-0">
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            className="absolute h-px bg-gradient-to-r from-transparent via-green-300/30 to-transparent animate-wind-line"
            style={{
              top: `${10 + i * 10}%`,
              left: '-100%',
              width: '200%',
              animationDelay: `${i * 0.5}s`,
              animationDuration: '8s',
            }}
          />
        ))}
      </div>

      {/* Floating Particles */}
      {Array.from({ length: 15 }, (_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-green-300/40 rounded-full animate-float-particle"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 4}s`,
            animationDuration: `${6 + Math.random() * 4}s`,
          }}
        />
      ))}
    </div>
  );
}