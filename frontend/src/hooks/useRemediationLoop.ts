/**
 * useRemediationLoop.ts
 *
 * Core micro-remediation engine for the Smart Rewind & Loop-Lock feature.
 *
 * Responsibilities:
 *  - On activation: seeks the video to `loopStart` and starts playback
 *  - While active: on every `timeupdate`, if `currentTime >= loopEnd`, seeks
 *    back to `loopStart` (implements the 45-second review loop)
 *  - Exposes `unlock()` which is ONLY called externally after a successful
 *    challenge or repeat correct answer — it disconnects the loop enforcement
 *
 * Design decisions:
 *  - Uses a `ref` for the player handle so the loop enforcement callback never
 *    captures a stale closure
 *  - The `useEffect` cleanup always stops the loop if the component unmounts
 *    (e.g. student navigates away mid-loop), preventing ghost seeks
 */
import { useEffect, useRef, useCallback } from 'react';
import type { HlsPlayerHandle } from '@/components/HlsVideoPlayer';
import { useCrevsStore } from '@/store/player-store';

interface UseRemediationLoopOptions {
  playerRef: React.RefObject<HlsPlayerHandle | null>;
  enabled: boolean;
}

interface UseRemediationLoopReturn {
  isLocked: boolean;
  /** Force-unlock the loop (call after the student passes a challenge or re-quiz) */
  unlock: () => void;
}

export function useRemediationLoop({
  playerRef,
  enabled,
}: UseRemediationLoopOptions): UseRemediationLoopReturn {
  const { loopStart, loopEnd, crevsMode, exitLoopLock } = useCrevsStore();
  const isLocked = crevsMode === 'LOOP_LOCKED';

  // Keep these in refs so the interval callback always sees current values
  const loopStartRef = useRef(loopStart);
  const loopEndRef = useRef(loopEnd);
  loopStartRef.current = loopStart;
  loopEndRef.current = loopEnd;

  const isLockedRef = useRef(isLocked);
  isLockedRef.current = isLocked;

  // ── Seek to loop start on activation ────────────────────────────────────
  useEffect(() => {
    if (!enabled || !isLocked || loopStart === null) return;
    const player = playerRef.current;
    if (!player) return;

    // Brief delay to let the player stabilise after a quiz dismissal
    const t = setTimeout(() => {
      if (loopStartRef.current !== null) {
        player.seekTo(loopStartRef.current);
        player.playVideo();
      }
    }, 300);

    return () => clearTimeout(t);
  }, [enabled, isLocked, loopStart, playerRef]);

  // ── Loop enforcement via polling interval ───────────────────────────────
  // We use setInterval at 250ms rather than subscribing to the native
  // `timeupdate` event because:
  //  1. HlsPlayerHandle is imperative — we can't attach DOM listeners here
  //  2. 250ms polling is imperceptible to users (<0.25s overshoot) and cheap
  useEffect(() => {
    if (!enabled || !isLocked) return;

    const intervalId = setInterval(() => {
      if (!isLockedRef.current) {
        clearInterval(intervalId);
        return;
      }
      const player = playerRef.current;
      if (!player || loopEndRef.current === null || loopStartRef.current === null)
        return;

      const currentTime = player.getCurrentTime();
      if (currentTime >= loopEndRef.current) {
        // Loop back — student has completed one 45-second review pass
        player.seekTo(loopStartRef.current);
      }
    }, 250);

    return () => clearInterval(intervalId);
  }, [enabled, isLocked, playerRef]);

  const unlock = useCallback(() => {
    exitLoopLock();
  }, [exitLoopLock]);

  return { isLocked, unlock };
}
