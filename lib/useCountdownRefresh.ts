'use client';

/**
 * useCountdownRefresh
 *
 * Polls `onRefresh` every `intervalSeconds` and exposes a live countdown
 * so the UI can show "Refreshes in 8s".
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
  /** How many seconds between automatic refreshes. Default: 10 */
  intervalSeconds?: number;
  /** Set to false to pause the countdown (e.g. while loading). Default: true */
  enabled?: boolean;
}

export function useCountdownRefresh({
  onRefresh,
  intervalSeconds = 10,
  enabled = true,
}: Options) {
  const [secondsLeft, setSecondsLeft] = useState(intervalSeconds);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  // Reset + restart countdown
  const reset = useCallback(() => {
    setSecondsLeft(intervalSeconds);
  }, [intervalSeconds]);

  // Manual trigger — refreshes immediately and resets the countdown
  const triggerRefresh = useCallback(() => {
    onRefreshRef.current();
    reset();
  }, [reset]);

  useEffect(() => {
    if (!enabled) return;

    const tick = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          // Fire the refresh and reset
          onRefreshRef.current();
          return intervalSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(tick);
  }, [enabled, intervalSeconds]);

  // Reset countdown when enabled flips back on (e.g. after initial load)
  useEffect(() => {
    if (enabled) reset();
  }, [enabled, reset]);

  return { secondsLeft, triggerRefresh };
}
