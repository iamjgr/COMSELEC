'use client';

/**
 * Floating music toggle button — no splash.
 * Used on pages other than landing (candidates, live-results).
 * On mount it resumes music if the user had it playing before navigating away.
 */

import React, { useEffect, useState } from 'react';
import {
  playMusic,
  pauseMusic,
  isActuallyPlaying,
  isMusicPlaying,
} from '@/lib/backgroundMusic';

export default function MusicToggle() {
  const [playing, setPlaying] = useState(false);
  const [visible, setVisible] = useState(false);
  const [ripple, setRipple] = useState(false);

  const syncPlaying = () => setPlaying(isActuallyPlaying());

  useEffect(() => {
    // Resume music if it was playing before the user navigated here
    if (isMusicPlaying()) {
      playMusic().then(syncPlaying);
    }
    const t = setTimeout(() => setVisible(true), 300);
    const id = setInterval(syncPlaying, 500);
    return () => { clearTimeout(t); clearInterval(id); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = async () => {
    if (ripple) return;
    setRipple(true);
    setTimeout(() => setRipple(false), 600);
    if (isActuallyPlaying()) {
      pauseMusic();
      setPlaying(false);
    } else {
      await playMusic();
      syncPlaying();
    }
  };

  return (
    <>
      <div
        className={`fixed bottom-6 right-6 z-50 transition-all duration-700 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        {playing && (
          <>
            <span className="absolute inset-0 rounded-full animate-ping"
              style={{ background: 'rgba(196,153,58,0.25)', animationDuration: '1.8s' }} />
            <span className="absolute inset-0 rounded-full animate-ping"
              style={{ background: 'rgba(196,153,58,0.12)', animationDuration: '2.4s', animationDelay: '0.6s' }} />
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
          {ripple && (
            <span className="absolute inset-0 rounded-full animate-ping"
              style={{ background: 'rgba(196,153,58,0.3)', animationDuration: '0.6s' }} />
          )}

          {playing ? (
            <svg width="20" height="20" viewBox="0 0 20 20"
              className="relative z-10" style={{ color: '#C4993A' }}>
              <rect x="2"  y="10" width="3" height="8"  rx="1.5" fill="currentColor"
                style={{ transformOrigin: 'bottom', animation: 'eq-bar 0.9s ease-in-out infinite' }} />
              <rect x="7"  y="5"  width="3" height="13" rx="1.5" fill="currentColor"
                style={{ transformOrigin: 'bottom', animation: 'eq-bar 0.9s ease-in-out infinite', animationDelay: '0.2s' }} />
              <rect x="12" y="8"  width="3" height="10" rx="1.5" fill="currentColor"
                style={{ transformOrigin: 'bottom', animation: 'eq-bar 0.9s ease-in-out infinite', animationDelay: '0.4s' }} />
              <rect x="17" y="12" width="3" height="6"  rx="1.5" fill="currentColor"
                style={{ transformOrigin: 'bottom', animation: 'eq-bar 0.9s ease-in-out infinite', animationDelay: '0.15s' }} />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
              className="relative z-10" style={{ color: 'rgba(196,153,58,0.65)' }}>
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          )}
        </button>
      </div>

      <style>{`
        @keyframes eq-bar {
          0%, 100% { transform: scaleY(0.5); }
          50%       { transform: scaleY(1); }
        }
      `}</style>
    </>
  );
}
