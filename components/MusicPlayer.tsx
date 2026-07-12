'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  playMusic,
  pauseMusic,
  isActuallyPlaying,
  setMusicPreference,
} from '@/lib/backgroundMusic';

interface Props {
  onEnter?: () => void;
}

export default function MusicPlayer({ onEnter }: Props) {
  const [playing, setPlaying] = useState(false);
  const [btnVisible, setBtnVisible] = useState(false);
  const [ripple, setRipple] = useState(false);

  // Splash always shows — starts fully visible, no flicker
  const [showSplash, setShowSplash] = useState(true);
  const [splashOut, setSplashOut] = useState(false);
  const [pressed, setPressed] = useState(false);
  // tap feedback states
  const [tapBurst, setTapBurst] = useState(false);
  const [ringBoost, setRingBoost] = useState(false);

  const syncPlaying = () => setPlaying(isActuallyPlaying());

  useEffect(() => {
    const id = setInterval(syncPlaying, 500);
    return () => clearInterval(id);
  }, []);

  const handleEnter = async () => {
    if (pressed) return;
    setPressed(true);

    // Trigger tap burst rings + ring speed boost immediately
    setTapBurst(true);
    setRingBoost(true);
    setTimeout(() => setTapBurst(false), 700);
    setTimeout(() => setRingBoost(false), 600);

    setMusicPreference(true);
    await playMusic();
    syncPlaying();

    // Wait a beat so the tap animation is visible before exit begins
    setTimeout(() => {
      setSplashOut(true);
      onEnter?.(); // signal LandingClient to start entrance animations
      setTimeout(() => {
        setShowSplash(false);
        setSplashOut(false);
        setTimeout(() => setBtnVisible(true), 100);
      }, 800);
    }, 320);
  };

  const toggleMusic = async () => {
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
      {/* ─────────────── SPLASH OVERLAY ─────────────── */}
      {showSplash && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
          style={{
            background: '#0a0602',
            transition: splashOut
              ? 'opacity 0.7s cubic-bezier(0.4,0,0.2,1), transform 0.7s cubic-bezier(0.4,0,0.2,1)'
              : 'none',
            opacity: splashOut ? 0 : 1,
            transform: splashOut ? 'scale(1.04)' : 'scale(1)',
            pointerEvents: splashOut ? 'none' : 'auto',
          }}
        >
          {/* Radial ambient glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(196,153,58,0.07) 0%, transparent 100%)',
            }}
          />

          {/* Subtle grid texture */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(196,153,58,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(196,153,58,0.5) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />

          {/* ── Centred content ── */}
          <div className="relative flex flex-col items-center gap-10">
            {/* Logo + rings — clickable */}
            <button
              onClick={handleEnter}
              aria-label="Enter"
              className="relative focus:outline-none"
              style={{
                transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)',
                transform: pressed ? 'scale(0.88)' : 'scale(1)',
              }}
            >
              {/* Outer slow-spin ring — speeds up on tap */}
              <div
                className="absolute rounded-full"
                style={{
                  inset: '-22px',
                  border: '1px solid rgba(196,153,58,0.18)',
                  animation: ringBoost
                    ? 'splash-spin 1.8s linear infinite'
                    : 'splash-spin 14s linear infinite',
                  transition: 'animation-duration 0.2s',
                }}
              />
              {/* Dashed accent ring — speeds up on tap */}
              <div
                className="absolute rounded-full"
                style={{
                  inset: '-12px',
                  border: '1px dashed rgba(196,153,58,0.28)',
                  animation: ringBoost
                    ? 'splash-spin-rev 1.2s linear infinite'
                    : 'splash-spin-rev 10s linear infinite',
                  transition: 'animation-duration 0.2s',
                }}
              />

              {/* Pulse rings — idle draw-the-eye, hidden on tap */}
              {!pressed && (
                <>
                  <div
                    className="absolute rounded-full"
                    style={{
                      inset: 0,
                      animation: 'splash-pulse 2.2s ease-out infinite',
                      border: '2px solid rgba(196,153,58,0.35)',
                    }}
                  />
                  <div
                    className="absolute rounded-full"
                    style={{
                      inset: 0,
                      animation: 'splash-pulse 2.2s ease-out infinite',
                      animationDelay: '1.1s',
                      border: '2px solid rgba(196,153,58,0.2)',
                    }}
                  />
                </>
              )}

              {/* Tap burst rings — 3 fast expanding rings on click */}
              {tapBurst && (
                <>
                  <div className="absolute rounded-full pointer-events-none"
                    style={{ inset: 0, animation: 'tap-burst 0.65s cubic-bezier(0,0,0.2,1) forwards',
                      border: '2.5px solid rgba(196,153,58,0.9)' }} />
                  <div className="absolute rounded-full pointer-events-none"
                    style={{ inset: 0, animation: 'tap-burst 0.65s cubic-bezier(0,0,0.2,1) forwards',
                      animationDelay: '0.08s',
                      border: '2px solid rgba(196,153,58,0.55)' }} />
                  <div className="absolute rounded-full pointer-events-none"
                    style={{ inset: 0, animation: 'tap-burst 0.65s cubic-bezier(0,0,0.2,1) forwards',
                      animationDelay: '0.16s',
                      border: '1.5px solid rgba(196,153,58,0.3)' }} />
                </>
              )}

              {/* Logo container */}
              <div
                className="relative flex items-center justify-center rounded-full overflow-hidden"
                style={{
                  width: 148,
                  height: 148,
                  background: pressed
                    ? 'rgba(40,28,12,0.95)'
                    : 'rgba(28,20,10,0.9)',
                  border: pressed
                    ? '1.5px solid rgba(196,153,58,0.7)'
                    : '1.5px solid rgba(196,153,58,0.3)',
                  boxShadow: pressed
                    ? '0 0 56px rgba(196,153,58,0.55), 0 0 100px rgba(196,153,58,0.18), inset 0 0 32px rgba(196,153,58,0.12)'
                    : '0 0 24px rgba(196,153,58,0.2), 0 0 60px rgba(196,153,58,0.07)',
                  transition: 'box-shadow 0.25s ease, border-color 0.25s ease, background 0.25s ease',
                }}
              >
                <Image
                  src="/comseleclogo.png"
                  alt="COMSELEC"
                  fill
                  sizes="148px"
                  style={{ objectFit: 'contain', padding: '16px' }}
                  priority
                />
              </div>
            </button>

            {/* Label */}
            <div className="flex flex-col items-center gap-2 text-center">
              <h1 className="text-shimmer text-4xl font-extrabold tracking-tight">
                PAGHIRANG &apos;26
              </h1>
            </div>

            {/* Breathing tap hint — fades out when pressed */}
            <div
              className="flex flex-col items-center gap-2"
              style={{
                animation: pressed ? 'none' : 'splash-breathe 2.4s ease-in-out infinite',
                opacity: pressed ? 0 : 1,
                transition: 'opacity 0.25s ease',
                pointerEvents: 'none',
              }}
            >
              {/* Chevron arrow pointing up at the logo */}
              <svg
                width="16" height="10" viewBox="0 0 16 10" fill="none"
                style={{ color: 'rgba(196,153,58,0.45)', marginBottom: 2 }}
              >
                <path d="M1 9L8 2L15 9" stroke="currentColor" strokeWidth="1.8"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.18em]"
                style={{ color: 'rgba(196,153,58,0.55)' }}
              >
                Tap to Enter
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────── FLOATING MUSIC BUTTON ─────────────── */}
      <div
        className={`fixed bottom-6 right-6 z-50 transition-all duration-700 ${
          btnVisible
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-4 pointer-events-none'
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
          onClick={toggleMusic}
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

      {/* ─────────────── KEYFRAMES ─────────────── */}
      <style>{`
        @keyframes eq-bar {
          0%, 100% { transform: scaleY(0.5); }
          50%       { transform: scaleY(1); }
        }
        @keyframes splash-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes splash-spin-rev {
          from { transform: rotate(0deg); }
          to   { transform: rotate(-360deg); }
        }
        @keyframes splash-pulse {
          0%   { transform: scale(1);    opacity: 0.8; }
          100% { transform: scale(1.7);  opacity: 0; }
        }
        @keyframes splash-breathe {
          0%, 100% { opacity: 0.55; transform: translateY(0); }
          50%       { opacity: 1;    transform: translateY(-4px); }
        }
        @keyframes tap-burst {
          0%   { transform: scale(1);   opacity: 1; }
          100% { transform: scale(2.6); opacity: 0; }
        }
      `}</style>
    </>
  );
}
