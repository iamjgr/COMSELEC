import React from 'react';

export function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.min(100, Math.max(0, (current / total) * 100));
  return (
    <div className="space-y-1.5">
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-[var(--color-text-muted)] text-right tabular-nums">
        {current} / {total}
      </p>
    </div>
  );
}
