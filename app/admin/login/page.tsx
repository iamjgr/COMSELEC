'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type Step = 'password' | 'pin';

export default function AdminLogin() {
  const router = useRouter();

  // --- Step 1: Password ---
  const [step, setStep] = useState<Step>('password');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  // Intermediate token carried between steps (never stored to localStorage)
  const [intermediateToken, setIntermediateToken] = useState<string | null>(null);

  // --- Step 2: PIN ---
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isPinLoading, setIsPinLoading] = useState(false);
  const [pinShake, setPinShake] = useState(false);
  const [pinLocked, setPinLocked] = useState(false);

  // ── Password submit ──────────────────────────────────────────────────────────
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPasswordLoading(true);
    setPasswordError(null);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (res.ok) {
        setIntermediateToken(data.intermediate);
        setStep('pin');
      } else if (res.status === 429) {
        setPasswordError(data.message ?? 'Too many failed attempts. Please wait before trying again.');
      } else if (data.attemptsLeft !== undefined && data.attemptsLeft > 0) {
        setPasswordError(`Incorrect password. ${data.attemptsLeft} attempt${data.attemptsLeft === 1 ? '' : 's'} left before lockout.`);
      } else if (data.attemptsLeft === 0) {
        setPasswordError('Too many failed attempts. You are locked out for 15 minutes.');
      } else {
        setPasswordError('Incorrect password. Try again.');
      }
    } catch {
      setPasswordError('Could not connect. Check your network.');
    } finally {
      setIsPasswordLoading(false);
    }
  };

  // ── PIN verification ─────────────────────────────────────────────────────────
  const verifyPin = useCallback(async (currentPin: string) => {
    if (!intermediateToken) return;
    setIsPinLoading(true);
    setPinError(null);

    try {
      const res = await fetch('/api/admin/verify-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${intermediateToken}`,
        },
        body: JSON.stringify({ pin: currentPin }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('admin_session', data.session);
        router.push('/admin');
      } else if (res.status === 429) {
        setPinLocked(true);
        setPinError(data.message ?? 'Too many failed attempts. Please wait before trying again.');
        setPin('');
      } else if (data.error === 'INVALID_PIN') {
        const left = data.attemptsLeft ?? 0;
        setPinError(
          left > 0
            ? `Incorrect PIN. ${left} attempt${left === 1 ? '' : 's'} remaining.`
            : 'Too many failed attempts. You are locked out for 15 minutes.'
        );
        setPinShake(true);
        setTimeout(() => setPinShake(false), 500);
        setPin('');
      } else if (data.error === 'UNAUTHORIZED') {
        // Intermediate token expired (5 min window)
        setPinError('Session expired. Please enter your password again.');
        setTimeout(() => {
          setStep('password');
          setPin('');
          setPinError(null);
          setIntermediateToken(null);
        }, 2000);
      } else {
        setPinError('Something went wrong. Please try again.');
        setPin('');
      }
    } catch {
      setPinError('Network error. Please try again.');
      setPin('');
    } finally {
      setIsPinLoading(false);
    }
  }, [intermediateToken, router]);

  useEffect(() => {
    if (pin.length === 4) verifyPin(pin);
  }, [pin, verifyPin]);

  const handlePinKey = (key: string) => {
    if (isPinLoading || pinLocked) return;
    if (key === 'del') { setPin(p => p.slice(0, -1)); setPinError(null); return; }
    if (key === 'clr') { setPin(''); setPinError(null); return; }
    if (pin.length < 4) { setPin(p => p + key); setPinError(null); }
  };

  const pinKeys = ['1','2','3','4','5','6','7','8','9','clr','0','del'];

  return (
    <main className="min-h-screen bg-[#0F1117] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80vw_60vw_at_50%_-20%,rgba(155,114,72,0.12),transparent)] pointer-events-none" />

      <div className="relative w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-[#9B7248] to-[#6B4E2E] items-center justify-center mb-6 shadow-lg shadow-black/40">
            <span className="text-white font-black text-xl tracking-tight">C</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">COMELEC Admin</h1>
          <p className="text-white/40 text-sm">PSU Narra Campus Elections</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {(['password', 'pin'] as Step[]).map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-2 text-xs font-semibold transition-colors ${
                step === s ? 'text-[#9B7248]' : s === 'pin' && step === 'password' ? 'text-white/20' : 'text-white/40'
              }`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                  step === s
                    ? 'bg-[#9B7248] text-white'
                    : s === 'pin' && step === 'password'
                    ? 'bg-white/10 text-white/20'
                    : 'bg-white/20 text-white/60'
                }`}>
                  {i + 1}
                </div>
                {s === 'password' ? 'Password' : 'PIN'}
              </div>
              {i === 0 && (
                <div className={`h-px w-8 transition-colors ${step === 'pin' ? 'bg-[#9B7248]/60' : 'bg-white/10'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* ── Step 1: Password ── */}
        {step === 'password' && (
          <div className="bg-white/[0.05] border border-white/[0.08] rounded-2xl p-8 backdrop-blur-sm">
            <p className="text-white/60 text-sm font-medium mb-6">Enter your admin password to continue</p>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {passwordError && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                  {passwordError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/[0.07] border border-white/[0.10] rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#9B7248]/60 focus:bg-white/[0.09] transition-all text-sm"
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={isPasswordLoading || !password}
                className="w-full bg-gradient-to-r from-[#9B7248] to-[#7C5C3A] text-white font-semibold text-sm px-4 py-3 rounded-xl hover:from-[#A87D54] hover:to-[#8A6644] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 mt-2"
              >
                {isPasswordLoading ? 'Verifying...' : 'Continue'}
              </button>
            </form>
          </div>
        )}

        {/* ── Step 2: PIN ── */}
        {step === 'pin' && (
          <div className="bg-white/[0.05] border border-white/[0.08] rounded-2xl p-8 backdrop-blur-sm">
            <p className="text-white/60 text-sm font-medium mb-6 text-center">
              Enter your 4-digit admin PIN
            </p>

            {pinError && (
              <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mb-6">
                {pinError}
              </div>
            )}

            {pinLocked ? (
              /* Lockout state */
              <div className="flex flex-col items-center text-center gap-4 py-4">
                <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m2-6V7a4 4 0 10-8 0v4" />
                    <rect x="3" y="11" width="18" height="11" rx="2" strokeWidth={2} />
                  </svg>
                </div>
                <p className="text-sm text-white/40 leading-relaxed">
                  Please wait for the lockout period to expire before trying again.
                </p>
                <button
                  onClick={() => { setStep('password'); setPin(''); setPinError(null); setPinLocked(false); setIntermediateToken(null); }}
                  className="mt-2 text-xs text-white/30 hover:text-white/50 transition-colors border-b border-white/20 pb-0.5"
                >
                  ← Back to password
                </button>
              </div>
            ) : (
              <>
                {/* PIN dots */}
                <div className={`flex justify-center gap-5 mb-8 ${pinShake ? 'animate-wiggle' : ''}`}>
                  {[0, 1, 2, 3].map(i => (
                    <div
                      key={i}
                      className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                        i < pin.length
                          ? 'bg-[#9B7248] border-[#9B7248]'
                          : 'bg-transparent border-white/20'
                      }`}
                    />
                  ))}
                </div>

                {/* Keypad */}
                <div className="grid grid-cols-3 gap-3 place-items-center">
                  {pinKeys.map(key => (
                    <button
                      key={key}
                      onClick={() => handlePinKey(key)}
                      disabled={isPinLoading}
                      className={`w-16 h-16 rounded-2xl text-white font-semibold text-lg transition-all duration-150 disabled:opacity-40 ${
                        key === 'del' || key === 'clr'
                          ? 'bg-white/[0.07] border border-white/[0.10] text-sm hover:bg-white/[0.12] active:bg-white/[0.15]'
                          : 'bg-white/[0.07] border border-white/[0.10] hover:bg-white/[0.12] active:bg-[#9B7248]/30 active:border-[#9B7248]/40'
                      }`}
                    >
                      {isPinLoading && key === '0' ? (
                        <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white/60 animate-spin mx-auto" />
                      ) : key === 'del' ? (
                        <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6H8.5a2 2 0 00-1.6.8L3 12l3.9 5.2a2 2 0 001.6.8H12m0-12l4 6-4 6m4-6H12" />
                        </svg>
                      ) : key === 'clr' ? (
                        <span className="text-[13px] font-semibold tracking-wide">CLR</span>
                      ) : (
                        key
                      )}
                    </button>
                  ))}
                </div>

                {/* Back to password */}
                <button
                  onClick={() => { setStep('password'); setPin(''); setPinError(null); setIntermediateToken(null); }}
                  className="mt-6 w-full text-center text-xs text-white/30 hover:text-white/50 transition-colors"
                >
                  ← Back to password
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
