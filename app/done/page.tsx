'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle } from 'lucide-react';

export default function DonePage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    window.history.pushState(null, '', window.location.href);
    window.onpopstate = () => window.history.go(1);

    // Clean up any leftover session data
    sessionStorage.removeItem('vote_receipt');

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { clearInterval(timer); window.onpopstate = null; };
  }, [router]);

  const circumference = 2 * Math.PI * 32; // r=32

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="max-w-sm w-full space-y-8 text-center">

        {/* Check icon with countdown ring */}
        <div className="animate-fade-up">
          <div className="relative w-28 h-28 mx-auto mb-6">
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 72 72">
              <circle cx="36" cy="36" r="32" fill="none" stroke="var(--color-border)" strokeWidth="2.5" />
              <circle
                cx="36" cy="36" r="32" fill="none"
                stroke="var(--color-success)" strokeWidth="2.5"
                strokeDasharray={circumference}
                strokeDashoffset={(circumference * (10 - countdown)) / 10}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
            </svg>
            <div className="absolute inset-2 rounded-full bg-[var(--color-success-bg)] flex items-center justify-center animate-success">
              <CheckCircle className="w-11 h-11 text-[var(--color-success)]" />
            </div>
          </div>

          <h1 className="text-3xl font-bold mb-3">Vote Submitted!</h1>
          <p className="text-[var(--color-text-muted)] text-sm leading-relaxed">
            Thank you for participating in the betterment of our beloved<br />
            <span className="font-semibold text-[var(--color-text-secondary)]">Palawan State University – Narra</span>.
          </p>
        </div>

        {/* Message card */}
        <div className="ballot-message-card animate-fade-up stagger-2 space-y-3">
          <p>
            Your ballot has been securely recorded. Every vote counts in shaping the future of our campus community.
          </p>
          <p className="text-shimmer text-base font-bold tracking-wide">
            FOR THE STUDENT, BY THE STUDENT
          </p>
        </div>

        {/* Countdown */}
        <div className="animate-fade-up stagger-3">
          <p className="text-sm text-[var(--color-text-muted)]">
            Resetting in <span className="font-bold text-[var(--color-text-primary)] tabular-nums">{countdown}</span> seconds
          </p>
        </div>

      </div>
    </main>
  );
}
