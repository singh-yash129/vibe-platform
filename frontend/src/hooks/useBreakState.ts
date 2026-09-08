/**
 * useBreakState.ts
 *
 * "May I Drink Water?" break state manager.
 *
 * Responsibilities:
 *  - `startBreak()`: pauses the video, sets `proctoringActive = false`, starts
 *    a 5-minute countdown
 *  - `endBreak()`: resumes the video, restores `proctoringActive = true`, clears timer
 *  - Automatically ends the break when the 5-minute countdown hits zero
 *  - Exposes `secondsRemaining` for the UI countdown ring
 *
 * Proctoring integration:
 *  All proctoring hooks (use-emotion, anomaly detection) read `proctoringActive`
 *  from `useCrevsStore`. When false, they no-op silently. This hook is the
 *  ONLY place that toggles that flag.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import type { HlsPlayerHandle } from '@/components/HlsVideoPlayer';
import { useCrevsStore } from '@/store/player-store';

const BREAK_DURATION_S = 5 * 60; // 300 seconds

interface UseBreakStateOptions {
  playerRef: React.RefObject<HlsPlayerHandle | null>;
}

interface UseBreakStateReturn {
  isOnBreak: boolean;
  secondsRemaining: number;
  startBreak: () => void;
  endBreak: () => void;
}

export function useBreakState({ playerRef }: UseBreakStateOptions): UseBreakStateReturn {
  const { crevsMode, enterBreak, exitBreak, breakEndTime } = useCrevsStore();
  const isOnBreak = crevsMode === 'BREAK';

  const [secondsRemaining, setSecondsRemaining] = useState(0);

  // Track the interval for cleanup
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearCountdown = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  /** Pause the video and enter break mode */
  const startBreak = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    player.pauseVideo();
    enterBreak(); // sets proctoringActive = false in the store
    setSecondsRemaining(BREAK_DURATION_S);
  }, [playerRef, enterBreak]);

  /** Resume the video and exit break mode */
  const endBreak = useCallback(() => {
    clearCountdown();
    exitBreak(); // sets proctoringActive = true in the store
    setSecondsRemaining(0);
    const player = playerRef.current;
    if (player) {
      // Small delay to let the UI animate away before video resumes
      setTimeout(() => player.playVideo(), 400);
    }
  }, [clearCountdown, exitBreak, playerRef]);

  // ── Countdown ticker ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOnBreak || breakEndTime === null) {
      clearCountdown();
      return;
    }

    // Sync immediately on mount
    const remaining = Math.max(
      0,
      Math.round((breakEndTime - Date.now()) / 1000),
    );
    setSecondsRemaining(remaining);

    intervalRef.current = setInterval(() => {
      const secs = Math.max(
        0,
        Math.round(((useCrevsStore.getState().breakEndTime ?? 0) - Date.now()) / 1000),
      );
      setSecondsRemaining(secs);

      if (secs <= 0) {
        // Break time expired — auto-resume
        endBreak();
      }
    }, 1000);

    return clearCountdown;
  }, [isOnBreak, breakEndTime, clearCountdown, endBreak]);

  return { isOnBreak, secondsRemaining, startBreak, endBreak };
}
