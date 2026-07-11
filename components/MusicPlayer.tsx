'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  playMusic,
  pauseMusic,
  isActuallyPlaying,
  isMusicPlaying,
} from '@/lib/backgroundMusic';

export default function MusicPlayer() {
  const [playing, setPlaying] = useState(false);
  const [visible, setVisible] = useState(false);
  const [ripple, setRipple] = useState(false);
  const hasInteracted = useRef(false);

  // On mount: if user previously had music on, auto-play (browser may allow it
  // after first interaction on page). Show after a short delay so it fades in nicely.
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 800);
    const playing = isMusicPlaying();
    if (playing) {
      playMusic().then(() => setPlaying(isActuallyPlaying()));
    }
    return () => clearTimeout(timer);
  }, []);

  // Keep UI in sync if audio is stopped externally (e.g., vote page pauses it)
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaying(isActuallyPlaying());
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const toggle = async () => {
    if (ripple) return;
    setRipple(true);
    setTimeout(() => setRipple(false), 600);

    if (!hasInteracted.current) hasInteracted.current = true;

    if (isActuallyPlaying()) {
      pauseMusic();
      setPlaying(false);
    } else {
      await playMusic();
      setPlaying(isActuallyPlaying());
    }
  };

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 transition-all duration-700 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      {/* Glow pulse rings when playing */}
      {playing && (
        <>
          <span
            className="absolute inset-0 rounded-full animate-ping"
            style={{
              background: 'rgba(196,153,58,0.25)',
              animationDuration: '1.8s',
            }}
          />
          <span
            className="absolute inset-0 rounded-full animate-ping"
            style={{
              background: 'rgba(196,153,58,0.12)',
              animationDuration: '2.4s',
              animationDelay: '0.6s',
            }}
          />
        </>
      )}

      <button
        onClick={toggle}
        aria-label={playing ? 'Pause background music' : 'Play background music'}
        className="relative w-12 h-12 rounded-full flex items-center justify-center overflow-hidden
                   transition-all duration-300 hover:scale-110 active:scale-95 focus:outline-none
                   focus-visible:ring-2 focus-visible:ring-[#C4993A] focus-visible:ring-offset-2"
        style={{
          background: playing
            ? 'linear-gradient(135deg, rgba(196,153,58,0.22), rgba(160,120,40,0.14))'
            : 'rgba(18,13,6,0.82)',
          border: playing
            ? '1.5px solid rgba(196,153,58,0.55)'
            : '1.5px solid rgba(196,153,58,0.2)',
          boxShadow: playing
            ? '0 0 18px rgba(196,153,58,0.28), 0 4px 16px rgba(0,0,0,0.5)'
            : '0 4px 16px rgba(0,0,0,0.45)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Ripple effect on click */}
        {ripple && (
          <span
            className="absolute inset-0 rounded-full animate-ping"
            style={{ background: 'rgba(196,153,58,0.3)', animationDuration: '0.6s' }}
          />
        )}

        {playing ? (
          /* ── Animated equalizer bars when playing ── */
          <svg
            width="20" height="20" viewBox="0 0 20 20"
            className="relative z-10"
            style={{ color: '#C4993A' }}
          >
            <rect x="2" y="10" width="3" height="8" rx="1.5" fill="currentColor"
              style={{ transformOrigin: 'bottom', animation: 'eq-bar 0.9s ease-in-out infinite' }} />
            <rect x="7" y="5" width="3" height="13" rx="1.5" fill="currentColor"
              style={{ transformOrigin: 'bottom', animation: 'eq-bar 0.9s ease-in-out infinite', animationDelay: '0.2s' }} />
            <rect x="12" y="8" width="3" height="10" rx="1.5" fill="currentColor"
              style={{ transformOrigin: 'bottom', animation: 'eq-bar 0.9s ease-in-out infinite', animationDelay: '0.4s' }} />
            <rect x="17" y="12" width="3" height="6" rx="1.5" fill="currentColor"
              style={{ transformOrigin: 'bottom', animation: 'eq-bar 0.9s ease-in-out infinite', animationDelay: '0.15s' }} />
          </svg>
        ) : (
          /* ── Music note icon when paused ── */
          <svg
            width="20" height="20" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round"
            className="relative z-10"
            style={{ color: 'rgba(196,153,58,0.65)' }}
          >
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        )}
      </button>

      {/* Tooltip label */}
      <div
        className="absolute bottom-full right-0 mb-2 pointer-events-none"
        style={{ minWidth: 'max-content' }}
      >
        <div
          className="px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-widest opacity-0
                     group-hover:opacity-100 transition-opacity"
          style={{
            background: 'rgba(18,13,6,0.88)',
            border: '1px solid rgba(196,153,58,0.2)',
            color: 'rgba(196,153,58,0.8)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {playing ? 'Pause music' : 'Play music'}
        </div>
      </div>

      {/* Keyframes injected inline */}
      <style>{`
        @keyframes eq-bar {
          0%, 100% { transform: scaleY(0.5); }
          50%       { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}
