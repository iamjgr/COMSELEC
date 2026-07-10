'use client';

import React from 'react';

/** Generic pulsing skeleton block */
const Sk = ({ className }: { className: string }) => (
  <div className={`bg-gray-200 animate-pulse rounded-lg ${className}`} />
);

/* ─── Dashboard ─────────────────────────────────────────────────────────── */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Sk className="h-7 w-52" />
          <Sk className="h-4 w-36" />
        </div>
        <Sk className="h-9 w-28 rounded-xl" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Sk className="h-3 w-20" />
              <Sk className="h-8 w-8 rounded-xl" />
            </div>
            <Sk className="h-8 w-16" />
            <Sk className="h-3 w-28" />
          </div>
        ))}
      </div>

      {/* Progress bar card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Sk className="h-5 w-40" />
          <Sk className="h-5 w-20" />
        </div>
        <Sk className="h-3 w-full rounded-full" />
        <div className="flex justify-between">
          <Sk className="h-3 w-24" />
          <Sk className="h-3 w-24" />
        </div>
      </div>

      {/* Two column section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
            <Sk className="h-5 w-32" />
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="flex items-center gap-3">
                <Sk className="h-8 w-8 rounded-lg shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Sk className="h-3 w-3/4" />
                  <Sk className="h-2.5 w-1/2" />
                </div>
                <Sk className="h-6 w-12 rounded-full" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Results / Summary ─────────────────────────────────────────────────── */
export function ResultsSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Sk className="h-7 w-44" />
          <Sk className="h-4 w-56" />
        </div>
        <Sk className="h-9 w-24 rounded-xl" />
      </div>

      {/* Turnout bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
        <div className="flex justify-between">
          <Sk className="h-4 w-40" />
          <Sk className="h-4 w-12" />
        </div>
        <Sk className="h-3 w-full rounded-full" />
        <Sk className="h-3 w-32" />
      </div>

      {/* Position cards */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <Sk className="h-3 w-3 rounded-full" />
            <Sk className="h-5 w-32" />
            <Sk className="h-5 w-12 rounded-full ml-auto" />
          </div>
          <div className="p-4 space-y-3">
            {Array.from({ length: 2 }).map((_, j) => (
              <div key={j} className="flex items-center gap-4 p-3 rounded-xl bg-gray-50">
                <Sk className="h-10 w-10 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Sk className="h-4 w-40" />
                  <Sk className="h-2.5 w-full rounded-full" />
                </div>
                <Sk className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Candidates ─────────────────────────────────────────────────────────── */
export function CandidatesSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Sk className="h-7 w-44" />
          <Sk className="h-4 w-36" />
        </div>
        <Sk className="h-9 w-32 rounded-xl" />
      </div>

      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <Sk className="h-5 w-32" />
            <Sk className="h-5 w-8 rounded-full" />
          </div>
          <div className="divide-y divide-gray-50">
            {Array.from({ length: 2 }).map((_, j) => (
              <div key={j} className="px-6 py-4 flex items-center gap-4">
                <Sk className="h-10 w-10 rounded-xl shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Sk className="h-4 w-40" />
                  <Sk className="h-3 w-28" />
                </div>
                <Sk className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Voters ─────────────────────────────────────────────────────────────── */
export function VoterTableSkeleton() {
  return (
    <>
      {Array.from({ length: 7 }).map((_, i) => (
        <tr key={i} className="border-b border-gray-50">
          <td className="px-5 py-4"><Sk className="h-5 w-20 rounded-md" /></td>
          <td className="px-5 py-4">
            <div className="flex items-center gap-3">
              <Sk className="h-8 w-8 rounded-full shrink-0" />
              <div className="space-y-1.5">
                <Sk className="h-3.5 w-32" />
                <Sk className="h-3 w-20" />
              </div>
            </div>
          </td>
          <td className="px-5 py-4"><Sk className="h-3.5 w-24" /></td>
          <td className="px-5 py-4"><Sk className="h-6 w-16 rounded-full" /></td>
          <td className="px-5 py-4"><Sk className="h-6 w-6 rounded-lg" /></td>
        </tr>
      ))}
    </>
  );
}

/* ─── Config / Setup ─────────────────────────────────────────────────────── */
export function ConfigSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Sk className="h-7 w-44" />
          <Sk className="h-4 w-56" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 pb-0">
        {['Elections', 'Election Setup', 'Programs'].map((_, i) => (
          <Sk key={i} className="h-8 w-24 rounded-t-lg" />
        ))}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <Sk className="h-5 w-28" />
              <Sk className="h-7 w-16 rounded-lg" />
            </div>
            <div className="px-6 py-4 space-y-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50">
                  <div className="space-y-1.5">
                    <Sk className="h-4 w-36" />
                    <Sk className="h-3 w-24" />
                  </div>
                  <div className="flex gap-1">
                    <Sk className="h-7 w-7 rounded-lg" />
                    <Sk className="h-7 w-7 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
