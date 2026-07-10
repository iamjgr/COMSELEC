'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (res.ok) {
        // Store in localStorage for client-side API calls
        localStorage.setItem('admin_session', data.session);
        // The httpOnly cookie is automatically set by the server response — used by middleware
        router.push('/admin');
      } else {
        setError('Incorrect password. Try again.');
      }
    } catch {
      setError('Could not connect. Check your network.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0F1117] flex items-center justify-center p-6">
      {/* Background subtle texture */}
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

        {/* Card */}
        <div className="bg-white/[0.05] border border-white/[0.08] rounded-2xl p-8 backdrop-blur-sm">
          <p className="text-white/60 text-sm font-medium mb-6">Enter your admin password to continue</p>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                {error}
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
              disabled={isLoading || !password}
              className="w-full bg-gradient-to-r from-[#9B7248] to-[#7C5C3A] text-white font-semibold text-sm px-4 py-3 rounded-xl hover:from-[#A87D54] hover:to-[#8A6644] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 mt-2"
            >
              {isLoading ? 'Verifying...' : 'Access Dashboard'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
