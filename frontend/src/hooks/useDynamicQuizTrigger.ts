/**
 * useDynamicQuizTrigger.ts
 *
 * Fires a quiz trigger after a randomly chosen watch-time interval between
 * 5 and 10 minutes of CONTINUOUS playback.
 *
 * "Continuous" means:
 *  - The student is in NORMAL mode (not LOOP_LOCKED, not BREAK)
 *  - The video is actually playing (tracked via the `isPlaying` prop)
 *  - Proctoring is active (so a student on break is not penalised)
 *
 * The interval is RE-RANDOMISED after each trigger, so the pattern is never
 * predictable. The state is EPHEMERAL — it resets on page reload, which
 * prevents a student from predicting the next trigger by reloading.
 *
 * Usage:
 *   const { shouldTrigger, acknowledge } = useDynamicQuizTrigger({ isPlaying });
 *   useEffect(() => { if (shouldTrigger) { showQuiz(); acknowledge(); } }, [shouldTrigger]);
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useCrevsStore } from '@/store/player-store';

interface UseDynamicQuizTriggerOptions {
  /** Pass the current playing state of the video player */
  isPlaying: boolean;
}

interface UseDynamicQuizTriggerReturn {
  /** True for exactly one render cycle when the quiz should fire */
  shouldTrigger: boolean;
  /** Call this immediately after consuming `shouldTrigger` to reset it */
  acknowledge: () => void;
}

export function useDynamicQuizTrigger({
  isPlaying,
}: UseDynamicQuizTriggerOptions): UseDynamicQuizTriggerReturn {
  const [shouldTrigger, setShouldTrigger] = useState(false);
  const {
    crevsMode,
    proctoringActive,
    quizIntervalMs,
    lastQuizTriggerTime,
    acknowledgeQuizTrigger,
  } = useCrevsStore();

  // Refs to avoid stale closures inside the interval
  const isMountedRef = useRef(true);
  const watchStartRef = useRef<number | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Track cumulative watch time using a tick-based accumulator
  // We tick every second only when all preconditions are met
  useEffect(() => {
    const shouldCount =
      isPlaying &&
      proctoringActive &&
      crevsMode === 'NORMAL' &&
      !shouldTrigger; // don't accumulate while a trigger is pending

    if (!shouldCount) {
      watchStartRef.current = null;
      return;
    }

    if (watchStartRef.current === null) {
      watchStartRef.current = Date.now();
    }

    const intervalId = setInterval(() => {
      if (!isMountedRef.current) return;

      const now = Date.now();
      const elapsed = now - (watchStartRef.current ?? now);

      // Check against the randomised threshold
      if (elapsed >= quizIntervalMs) {
        setShouldTrigger(true);
        watchStartRef.current = null; // Reset accumulator
      }
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [isPlaying, proctoringActive, crevsMode, shouldTrigger, quizIntervalMs]);

  const acknowledge = useCallback(() => {
    setShouldTrigger(false);
    watchStartRef.current = null;
    acknowledgeQuizTrigger(); // Picks a new random interval
  }, [acknowledgeQuizTrigger]);

  return { shouldTrigger, acknowledge };
}
