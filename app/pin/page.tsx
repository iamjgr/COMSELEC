'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export default function PinPage() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lockout, setLockout] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    const session = localStorage.getItem('voter_session');
    if (!session) router.push('/scan');
  }, [router]);

  const verifyPin = useCallback(async (currentPin: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const session = localStorage.getItem('voter_session');
      const res = await fetch('/api/verify-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session}`,
        },
        body: JSON.stringify({ pin: currentPin }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'WRONG_PIN') {
          setError(`Incorrect PIN. ${data.attemptsLeft} ${data.attemptsLeft === 1 ? 'attempt' : 'attempts'} remaining.`);
          setShake(true);
          setTimeout(() => setShake(false), 500);
          setPin('');
        } else if (data.error === 'PIN_LOCKED') {
          setLockout(true);
          setError(null);
          setPin('');
        } else if (data.error === 'ALREADY_VOTED') {
          // Vote was submitted from another device — redirect to summary if we have it
          router.push('/voted');
        } else if (data.error === 'ELECTION_PAUSED') {
          setError('Voting is temporarily paused. Please wait for a COMELEC officer to resume it and try again.');
          setPin('');
        } else if (data.error === 'UNAUTHORIZED') {
          setError('Session expired. Please scan your QR code again.');
          setTimeout(() => router.push('/scan'), 2000);
        } else {
          setError('Something went wrong. Please try again.');
          setPin('');
        }
      } else {
        localStorage.setItem('voter_session', data.session);
        router.push('/vote/1');
      }
    } catch (err) {
      console.error(err);
      setError('Network error. Please try again.');
      setPin('');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (pin.length === 4) verifyPin(pin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  const handleKey = (key: string) => {
    if (isLoading || lockout) return;
    if (key === 'del') { setPin(p => p.slice(0, -1)); setError(null); return; }
    if (key === 'clr') { setPin(''); setError(null); return; }
    if (pin.length < 4) { setPin(p => p + key); setError(null); }
  };

  const keys = ['1','2','3','4','5','6','7','8','9','clr','0','del'];

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-6 pt-14">
      <div className="max-w-sm w-full space-y-8">

        {/* Header */}
        <div className="animate-fade-up">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-text-muted)] mb-3">
            Step 2 of 2
          </p>
          <h1 className="text-2xl font-bold mb-1">Enter your PIN</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Use the 4-digit PIN you received along with your QR code.
          </p>
        </div>

        {/* Lockout screen */}
        {lockout ? (
          <div className="card animate-fade-scale p-10 flex flex-col items-center text-center gap-5">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m2-6V7m0 0a4 4 0 110 8 4 4 0 010-8z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">PIN Locked</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                You have entered an incorrect PIN <strong>5 times</strong>. Your voting access has been locked for security.
              </p>
            </div>
            <div className="w-full bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-amber-800">📋 What to do next</p>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                Please approach a <strong>COMELEC Officer</strong> and show them your Student ID to request a PIN reset.
              </p>
            </div>
          </div>
        ) : (
          <div className="card animate-fade-up stagger-1 p-8">
            {/* Error */}
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-[var(--color-danger-bg)] border border-[var(--color-danger)] animate-fade-scale">
                <p className="text-sm text-[var(--color-danger)]">{error}</p>
              </div>
            )}

          {/* Dots */}
          <div className={`flex justify-center gap-5 mb-10 ${shake ? 'animate-wiggle' : ''}`}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`pin-dot ${i < pin.length ? 'filled' : ''}`} />
            ))}
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-4 place-items-center">
            {keys.map(key => (
              <button
                key={key}
                onClick={() => handleKey(key)}
                disabled={isLoading || lockout}
                className={`pin-key ${key === 'del' || key === 'clr' ? 'special' : ''}`}
              >
                {isLoading && key === '0' ? (
                  <div className="w-5 h-5 rounded-full border-2 border-[var(--color-border-strong)] border-t-[var(--color-accent)] animate-spin" />
                ) : key === 'del' ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          </div>
        )}
      </div>
    </main>
  );
}
