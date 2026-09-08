import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Persisted player preferences ────────────────────────────────────────────

interface PlayerPreferences {
  playbackRate: number;
  volume: number;
  subtitlesEnabled: boolean;
  setPlaybackRate: (rate: number) => void;
  setVolume: (volume: number) => void;
  setSubtitlesEnabled: (enabled: boolean) => void;
}

export const usePlayerStore = create<PlayerPreferences>()(
  persist(
    (set) => ({
      playbackRate: 1.0, // Default playback rate
      volume: 100,
      subtitlesEnabled: false,
      setPlaybackRate: (rate: number) => set({ playbackRate: rate }),
      setVolume: (volume) => set({ volume }),
      setSubtitlesEnabled: (enabled) => set({ subtitlesEnabled: enabled }),
    }),
    {
      name: 'player-storage', // unique name for localStorage
    }
  )
);

// ─── CREVS ephemeral session state (NOT persisted) ────────────────────────────
// This slice is intentionally NOT in a persist() wrapper. It is always reset to
// safe defaults on page reload — if a student refreshes mid-break, proctoring
// reactivates automatically, which is the safer fallback.

export type CrevsMode =
  | 'NORMAL'            // Standard playback
  | 'LOOP_LOCKED'       // Smart Rewind active — student is in a 45s review loop
  | 'BREAK'             // "May I Drink Water?" break — proctoring suspended
  | 'CHALLENGE_PENDING'; // Student has opened the "Challenge AI" modal

interface CrevsState {
  /** Current CREVS operational mode */
  crevsMode: CrevsMode;
  /** Loop start time in seconds (loopStart = transcriptTimestamp - 15) */
  loopStart: number | null;
  /** Loop end time in seconds (loopStart + 45) */
  loopEnd: number | null;
  /** Unix timestamp (ms) when the break expires */
  breakEndTime: number | null;
  /**
   * When false, all proctoring hooks (emotion capture, anomaly detection) must
   * be silently suppressed. Set to false during BREAK mode.
   */
  proctoringActive: boolean;
  /**
   * Randomised watch-time threshold (ms) for the next dynamic quiz trigger.
   * Refreshed after each quiz fires.
   */
  quizIntervalMs: number;
  /** Timestamp (ms) of the last quiz trigger — used to measure elapsed watch time */
  lastQuizTriggerTime: number;
  /** The noteId of the current remediation decoy note */
  currentNoteId: string | null;
  /** The sessionId of the active remediation session */
  currentRemediationSessionId: string | null;

  // ── Actions ──────────────────────────────────────────────────────────────
  /** Enter loop-lock mode after a failed quiz */
  enterLoopLock: (loopStart: number, loopEnd: number, sessionId: string, noteId: string) => void;
  /** Exit loop-lock and return to normal playback */
  exitLoopLock: () => void;
  /** Begin a break — suspends proctoring, starts countdown */
  enterBreak: () => void;
  /** End a break — restores proctoring */
  exitBreak: () => void;
  /** Mark the current quiz interval as fired, randomise the next one */
  acknowledgeQuizTrigger: () => void;
  /** Open the Challenge AI modal */
  openChallenge: () => void;
  /** Close the Challenge AI modal (back to LOOP_LOCKED or NORMAL) */
  closeChallenge: (passed: boolean) => void;
}

/** Returns a random quiz interval between 5 and 10 minutes (in ms) */
function randomQuizInterval(): number {
  const MIN_MINUTES = 5;
  const MAX_MINUTES = 10;
  return (Math.random() * (MAX_MINUTES - MIN_MINUTES) + MIN_MINUTES) * 60 * 1000;
}

const BREAK_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export const useCrevsStore = create<CrevsState>()((set, get) => ({
  crevsMode: 'NORMAL',
  loopStart: null,
  loopEnd: null,
  breakEndTime: null,
  proctoringActive: true,
  quizIntervalMs: randomQuizInterval(),
  lastQuizTriggerTime: Date.now(),
  currentNoteId: null,
  currentRemediationSessionId: null,

  enterLoopLock: (loopStart, loopEnd, sessionId, noteId) =>
    set({
      crevsMode: 'LOOP_LOCKED',
      loopStart,
      loopEnd,
      currentRemediationSessionId: sessionId,
      currentNoteId: noteId,
    }),

  exitLoopLock: () =>
    set({
      crevsMode: 'NORMAL',
      loopStart: null,
      loopEnd: null,
      currentRemediationSessionId: null,
      currentNoteId: null,
    }),

  enterBreak: () =>
    set({
      crevsMode: 'BREAK',
      breakEndTime: Date.now() + BREAK_DURATION_MS,
      proctoringActive: false, // 🛡️ Suspend proctoring
    }),

  exitBreak: () =>
    set({
      crevsMode: 'NORMAL',
      breakEndTime: null,
      proctoringActive: true, // 🛡️ Restore proctoring
    }),

  acknowledgeQuizTrigger: () =>
    set({
      lastQuizTriggerTime: Date.now(),
      quizIntervalMs: randomQuizInterval(), // pick a fresh random interval
    }),

  openChallenge: () => set({ crevsMode: 'CHALLENGE_PENDING' }),

  closeChallenge: (passed: boolean) => {
    if (passed) {
      get().exitLoopLock();
    } else {
      set({ crevsMode: 'LOOP_LOCKED' });
    }
  },
}));
