/**
 * BreakButton.tsx
 *
 * The "May I Drink Water? 💧" button for the video player controls bar.
 *
 * Behaviour:
 *  - In NORMAL mode: shows a small button in the controls
 *  - On click: video pauses, 5-minute countdown overlay appears
 *  - During break: full-screen overlay with ring countdown and "Resume" button
 *  - On "Resume" (or when timer hits 0): proctoring reactivates, video resumes
 *
 * Proctoring note shown to the student during the break so they understand the
 * suspension is intentional and they are NOT being monitored.
 */
import type { HlsPlayerHandle } from '@/components/HlsVideoPlayer';
import { useBreakState } from '@/hooks/useBreakState';

interface BreakButtonProps {
  playerRef: React.RefObject<HlsPlayerHandle | null>;
  /** Whether to show a compact icon-only button (for tight control bars) */
  compact?: boolean;
}

/** Animated SVG ring for the break countdown */
function BreakRing({ secondsRemaining }: { secondsRemaining: number }) {
  const total = 5 * 60;
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const progress = secondsRemaining / total;
  const dashOffset = circumference * (1 - progress);

  const mins = Math.floor(secondsRemaining / 60);
  const secs = secondsRemaining % 60;
  const label = `${mins}:${secs.toString().padStart(2, '0')}`;

  return (
    <svg width="180" height="180" viewBox="0 0 180 180" aria-label={`${label} remaining`}>
      <circle cx="90" cy="90" r={radius} fill="none" stroke="rgba(56,189,248,0.12)" strokeWidth="10" />
      <circle
        cx="90"
        cy="90"
        r={radius}
        fill="none"
        stroke="url(#break-grad)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        transform="rotate(-90 90 90)"
        style={{ transition: 'stroke-dashoffset 0.9s linear' }}
      />
      <defs>
        <linearGradient id="break-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
      </defs>
      <text x="90" y="82" textAnchor="middle" fill="white" fontSize="30" fontWeight="700" fontFamily="Inter, system-ui">
        {label}
      </text>
      <text x="90" y="106" textAnchor="middle" fill="rgba(148,163,184,0.8)" fontSize="13" fontFamily="Inter, system-ui">
        break remaining
      </text>
    </svg>
  );
}

export default function BreakButton({ playerRef, compact = false }: BreakButtonProps) {
  const { isOnBreak, secondsRemaining, startBreak, endBreak } = useBreakState({ playerRef });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        /* ── Trigger button ── */
        .brk-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: ${compact ? '6px 10px' : '8px 14px'};
          background: rgba(56,189,248,0.1);
          border: 1px solid rgba(56,189,248,0.25);
          border-radius: 10px;
          color: #38bdf8;
          font-size: ${compact ? '12px' : '13px'};
          font-weight: 500;
          font-family: 'Inter', system-ui, sans-serif;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s, transform 0.15s;
          white-space: nowrap;
        }

        .brk-btn:hover {
          background: rgba(56,189,248,0.18);
          border-color: rgba(56,189,248,0.4);
          transform: translateY(-1px);
        }

        .brk-btn:active { transform: translateY(0); }

        /* ── Break overlay ── */
        .brk-overlay {
          position: fixed;
          inset: 0;
          z-index: 8500;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(2,6,23,0.88);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          font-family: 'Inter', system-ui, sans-serif;
          animation: brk-in 0.35s ease-out;
          gap: 32px;
        }

        @keyframes brk-in {
          from { opacity: 0; transform: scale(0.97); }
          to   { opacity: 1; transform: scale(1); }
        }

        .brk-icon-wrap {
          font-size: 64px;
          animation: brk-sway 3s ease-in-out infinite;
        }

        @keyframes brk-sway {
          0%, 100% { transform: rotate(-8deg); }
          50%       { transform: rotate(8deg); }
        }

        .brk-title {
          font-size: 28px;
          font-weight: 700;
          color: #f1f5f9;
          margin: 0;
          letter-spacing: -0.5px;
          text-align: center;
        }

        .brk-proctoring-badge {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 20px;
          background: rgba(52,211,153,0.08);
          border: 1px solid rgba(52,211,153,0.25);
          border-radius: 14px;
          font-size: 14px;
          color: #34d399;
          font-weight: 500;
          max-width: 420px;
          text-align: center;
          line-height: 1.5;
        }

        .brk-proctoring-dot {
          width: 8px;
          height: 8px;
          background: #34d399;
          border-radius: 50%;
          flex-shrink: 0;
          animation: brk-blink 1.5s ease-in-out infinite;
        }

        @keyframes brk-blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }

        .brk-resume-btn {
          padding: 16px 40px;
          background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%);
          border: none;
          border-radius: 14px;
          color: white;
          font-size: 16px;
          font-weight: 600;
          font-family: 'Inter', system-ui, sans-serif;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.15s;
          display: flex;
          align-items: center;
          gap: 8px;
          letter-spacing: -0.2px;
        }

        .brk-resume-btn:hover { opacity: 0.92; transform: translateY(-2px); }
        .brk-resume-btn:active { transform: translateY(0); }

        .brk-hint {
          font-size: 13px;
          color: rgba(100,116,139,0.8);
          text-align: center;
          max-width: 340px;
          line-height: 1.5;
        }
      `}</style>

      {/* ── Trigger button (shown in player controls) ── */}
      {!isOnBreak && (
        <button
          id="crevs-break-btn"
          className="brk-btn"
          onClick={startBreak}
          title="Take a 5-minute break — proctoring will pause"
        >
          💧 {compact ? '' : 'May I Drink Water?'}
        </button>
      )}

      {/* ── Break overlay ── */}
      {isOnBreak && (
        <div className="brk-overlay" role="dialog" aria-modal="true" aria-label="Break timer">
          <div className="brk-icon-wrap" aria-hidden="true">💧</div>

          <h1 className="brk-title">Enjoy your break!</h1>

          <BreakRing secondsRemaining={secondsRemaining} />

          <div className="brk-proctoring-badge">
            <div className="brk-proctoring-dot" />
            🛡️ Proctoring is paused — you will NOT be monitored during this break
          </div>

          <button
            id="crevs-resume-btn"
            className="brk-resume-btn"
            onClick={endBreak}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            Resume Learning
          </button>

          <p className="brk-hint">
            Proctoring will automatically reactivate when you resume, or when the
            timer reaches zero.
          </p>
        </div>
      )}
    </>
  );
}
