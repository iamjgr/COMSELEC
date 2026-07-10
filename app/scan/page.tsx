'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Html5Qrcode } from 'html5-qrcode';
import { CheckCircle, Upload } from 'lucide-react';

const QRScanner = dynamic(() => import('@/components/QRScanner'), { ssr: false });

type Status = 'scanning' | 'loading' | 'success' | 'error';

const errorMessages: Record<string, string> = {
  INVALID_TOKEN: "This QR code was not recognized. Make sure you're scanning the one sent to you by COMELEC.",
  ELECTION_NOT_ACTIVE: "The election has not been opened for voting yet. Please wait for a COMELEC officer to start it.",
  ELECTION_PAUSED: "Voting is temporarily paused. Please wait for a COMELEC officer to resume it and try again later.",
  VOTING_NOT_STARTED: "Voting has not started yet. Please wait until the scheduled voting time.",
  ELECTION_CLOSED: "Voting has already ended.",
  default: "Something went wrong. Please try again.",
};


export default function ScanPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('scanning');
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [studentInfo, setStudentInfo] = useState<{ name: string; course: string; year: string } | null>(null);

  const handleScanSuccess = async (token: string) => {
    setStatus('loading');
    try {
      const res = await fetch('/api/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorCode(data.error || 'default');
        setStatus('error');
      } else if (data.has_voted) {
        // Voter already voted — require PIN re-entry before showing their ballot (privacy)
        localStorage.setItem('voter_session', data.session);
        sessionStorage.setItem('viewing_receipt', 'true');
        setStudentInfo({ name: data.name, course: data.course, year: data.year });
        setStatus('success');
      } else {
        localStorage.setItem('voter_session', data.session);
        setStudentInfo({ name: data.name, course: data.course, year: data.year });
        setStatus('success');
      }
    } catch {
      setErrorCode('default');
      setStatus('error');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setStatus('loading');
    try {
      const html5QrCode = new Html5Qrcode("hidden-reader");
      const result = await html5QrCode.scanFile(file, true);
      handleScanSuccess(result);
    } catch (err) {
      setErrorCode('INVALID_TOKEN');
      setStatus('error');
    }
  };

  const retry = () => { setStatus('scanning'); setErrorCode(null); };

  return (
    <main className="scan-page flex min-h-screen flex-col items-center justify-start p-6 pt-14">
      <div className="max-w-sm w-full space-y-6">

        {/* Header */}
        <div className="animate-fade-up">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#C4993A] mb-3">
            Step 1 of 2
          </p>
          <h1 className="text-2xl font-bold mb-1 text-[#1A1A1A]">Scan your QR code</h1>
          <p className="text-sm text-[#666666]">
            Hold the QR code from Messenger up to the camera below.
          </p>
        </div>

        {/* SUCCESS */}
        {status === 'success' && studentInfo && (
          <div className="card-gold-border animate-fade-scale">
            <div className="card-inner text-center">
              <div className="relative w-20 h-20 mx-auto mb-5">
                <div className="absolute inset-0 rounded-full bg-[var(--color-success-bg)]" style={{ animation: 'orb-drift 3s ease-in-out infinite alternate' }} />
                <div className="relative w-full h-full rounded-full bg-[var(--color-success-bg)] flex items-center justify-center animate-success">
                  <CheckCircle className="w-10 h-10 text-[var(--color-success)]" />
                </div>
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-success)] mb-2">
                Verified
              </p>
              <h2 className="text-xl font-bold text-[#1A1A1A] mb-1">{studentInfo.name}</h2>
              <p className="text-sm text-[#666666] mb-8">
                {studentInfo.course} · Year {studentInfo.year}
              </p>
              <button className="btn-primary" style={{ background: 'linear-gradient(135deg, #B8920E, #C4993A)', color: '#fff' }} onClick={() => router.push('/pin')}>
                Continue
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* SCANNER + ERROR */}
        {status !== 'success' && (
          <div className="card-gold-border animate-fade-up stagger-1">
          <div className="card-inner p-4">
            {status === 'error' && errorCode && (
              <div className="mb-4 p-4 rounded-xl bg-[var(--color-danger-bg)] border border-[var(--color-danger)] animate-fade-scale">
                <p className="text-sm text-[var(--color-danger)] mb-3">
                  {errorMessages[errorCode] || errorMessages.default}
                </p>
                <button
                  onClick={retry}
                  className="text-xs font-semibold text-[var(--color-danger)] border-b border-[var(--color-danger)] border-opacity-50 pb-0.5"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Viewfinder */}
            {(status === 'scanning' || status === 'loading') && (
              <div className="relative aspect-square w-full rounded-2xl overflow-hidden border border-[var(--color-border-strong)] bg-black mb-4">
                <QRScanner onScanSuccess={handleScanSuccess} />

                {/* Corner brackets */}
                <div className="absolute inset-0 pointer-events-none z-10">
                  {[
                    'top-3 left-3 border-t-2 border-l-2',
                    'top-3 right-3 border-t-2 border-r-2',
                    'bottom-3 left-3 border-b-2 border-l-2',
                    'bottom-3 right-3 border-b-2 border-r-2',
                  ].map((cls, i) => (
                    <div key={i} className={`absolute w-7 h-7 ${cls} rounded-sm`} style={{ borderColor: '#C4993A' }} />
                  ))}
                  {/* Animated scan line */}
                  <div className="scan-line" />
                </div>

                {/* Loading overlay */}
                {status === 'loading' && (
                  <div className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center z-20 animate-fade-scale">
                    <div className="w-11 h-11 rounded-full border-[3px] border-[var(--color-accent-light)] border-t-[var(--color-accent)] animate-spin mb-3" />
                    <p className="text-white/80 text-sm font-medium">Verifying</p>
                  </div>
                )}
              </div>
            )}

            {/* Divider */}
            <div className="flex items-center my-4">
              <div className="flex-1 h-px bg-[var(--color-border)]" />
              <span className="px-3 text-xs text-[var(--color-text-muted)]">or</span>
              <div className="flex-1 h-px bg-[var(--color-border)]" />
            </div>

            <label className="btn-secondary cursor-pointer" style={{ background: 'white', borderColor: '#C4993A', color: '#9B7520' }}>
              <Upload className="w-4 h-4" />
              Upload QR Image
              <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            </label>
            <div id="hidden-reader" style={{ display: 'none' }} />
          </div>
          </div>
        )}

      </div>
    </main>
  );
}
