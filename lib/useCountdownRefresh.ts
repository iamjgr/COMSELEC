'use client';

/**
 * useCountdownRefresh
 *
 * Polls `onRefresh` on a wall-clock-aligned interval so ALL clients count
 * down to the same second regardless of when they loaded the page.
 *
 * How it works:
 *   Refreshes fire at every multiple of `intervalSeconds` past the Unix epoch.
 *   e.g. with intervalSeconds=10: refreshes at :00, :10, :20, :30, :40, :50
 *   Every browser calculates secondsLeft = interval - (now % interval)
 *   so user A opening at :03 sees "7s" and user B opening at :07 also sees "3s".
 *
 * Usage:
 *   const { secondsLeft, triggerRefresh } = useCountdownRefresh({
 *     onRefresh: () => fetchResults(true),
 *     intervalSeconds: 10,
 *   });
 */

import { useEffect, useRef, useState, useCallback } from 'react';

interface Options {
  /** Called on every automatic refresh and when triggerRefresh() is invoked */
  onRefresh: () => void | Promise<void>;
  /** Interval in seconds — must divide evenly into 60 (e.g. 5, 10, 15, 30). Default: 10 */
  intervalSeconds?: number;
  /** Pause the countdown while true (e.g. during initial load). Default: false */
  enabled?: boolean;
}

/** Returns seconds remaining until the next wall-clock-aligned boundary */
function getSecondsLeft(intervalSeconds: number): number {
  const nowSeconds = Date.now() / 1000;
  const remainder = nowSeconds % intervalSeconds;
  const left = intervalSeconds - remainder;
  // Clamp to [1, intervalSeconds] so we never show 0 or a fractional display
  return Math.max(1, Math.ceil(left));
}

export function useCountdownRefresh({
  onRefresh,
  intervalSeconds = 10,
  enabled = true,
}: Options) {
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const [secondsLeft, setSecondsLeft] = useState(() => getSecondsLeft(intervalSeconds));

  // Manual trigger — refreshes immediately (does not re-align the wall clock)
  const triggerRefresh = useCallback(() => {
    onRefreshRef.current();
    // After a manual refresh, re-sync the displayed countdown to wall clock
    setSecondsLeft(getSecondsLeft(intervalSeconds));
  }, [intervalSeconds]);

  useEffect(() => {
    if (!enabled) return;

    const tick = () => {
      const left = getSecondsLeft(intervalSeconds);
      setSecondsLeft(left);

      // Fire refresh when we hit the boundary (left === intervalSeconds means
      // we just crossed a boundary — the modulo wrapped back to ~0)
      if (left === intervalSeconds) {
        onRefreshRef.current();
      }
    };

    // Align the first tick to the next whole second so the display is smooth
    const msUntilNextSecond = 1000 - (Date.now() % 1000);
    let interval: ReturnType<typeof setInterval>;

    const timeout = setTimeout(() => {
      tick(); // fire immediately on alignment
      interval = setInterval(tick, 1000);
    }, msUntilNextSecond);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [enabled, intervalSeconds]);

  // Re-sync display when enabled flips on
  useEffect(() => {
    if (enabled) setSecondsLeft(getSecondsLeft(intervalSeconds));
  }, [enabled, intervalSeconds]);

  return { secondsLeft, triggerRefresh };
}
