'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle } from 'lucide-react';

export default function DonePage() {
  const router = useRouter();
  const [receipt, setReceipt] = useState<{ reference: string; timestamp: string } | null>(null);
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    window.history.pushState(null, '', window.location.href);
    window.onpopstate = () => window.history.go(1);

    const stored = sessionStorage.getItem('vote_receipt');
    if (stored) setReceipt(JSON.parse(stored));

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          sessionStorage.removeItem('vote_receipt');
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

        {/* Check icon */}
        <div className="animate-fade-up">
          <div className="relative w-28 h-28 mx-auto mb-6">
            {/* Countdown ring */}
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

          <h1 className="text-3xl font-bold mb-2">Vote Submitted</h1>
          <p className="text-[var(--color-text-muted)] text-sm">
            Your ballot has been recorded successfully.
          </p>
        </div>

        {/* Receipt */}
        {receipt && (
          <div className="receipt-card animate-fade-up stagger-2 text-left">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] mb-5 pb-3 border-b border-dashed border-[var(--color-border-strong)]">
              Official Receipt
            </p>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-[var(--color-text-muted)] mb-1">Reference Code</p>
                <p className="font-mono text-lg font-bold text-[var(--color-text-primary)] tracking-wider">
                  {receipt.reference}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-muted)] mb-1">Date & Time</p>
                <p className="text-sm font-medium text-[var(--color-text-secondary)]">
                  {new Date(receipt.timestamp).toLocaleString('en-PH', { dateStyle: 'long', timeStyle: 'short' })}
                </p>
              </div>
            </div>
          </div>
        )}

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
