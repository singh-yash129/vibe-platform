/**
 * RemediationOverlay.tsx
 *
 * Full-screen glassmorphism overlay shown during LOOP_LOCKED mode.
 * Renders the 3-bullet decoy note and provides the "Challenge AI" button.
 * An animated countdown ring shows the remaining time in the current loop pass.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useCrevsStore } from '@/store/player-store';
import { useDecoyNote } from '@/hooks/crevs-hooks';
import ChallengeAIModal from './ChallengeAIModal';

interface RemediationOverlayProps {
  /** Called when the loop is fully unlocked (challenge passed or re-quiz passed) */
  onUnlocked?: () => void;
}

/** Animated SVG ring countdown — pure CSS, no requestAnimationFrame needed */
function CountdownRing({
  totalSeconds,
  currentSeconds,
}: {
  totalSeconds: number;
  currentSeconds: number;
}) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = currentSeconds / totalSeconds;
  const dashOffset = circumference * (1 - progress);

  return (
    <svg
      width="140"
      height="140"
      viewBox="0 0 140 140"
      className="crevs-ring"
      role="img"
      aria-label={`${currentSeconds} seconds remaining in review loop`}
    >
      {/* Background track */}
      <circle
        cx="70"
        cy="70"
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="8"
      />
      {/* Progress arc */}
      <circle
        cx="70"
        cy="70"
        r={radius}
        fill="none"
        stroke="url(#crevs-grad)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        transform="rotate(-90 70 70)"
        style={{ transition: 'stroke-dashoffset 0.9s linear' }}
      />
      <defs>
        <linearGradient id="crevs-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
      {/* Seconds text */}
      <text
        x="70"
        y="70"
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        fontSize="24"
        fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif"
      >
        {currentSeconds}
      </text>
      <text
        x="70"
        y="95"
        textAnchor="middle"
        fill="rgba(255,255,255,0.6)"
        fontSize="10"
        fontFamily="Inter, system-ui, sans-serif"
      >
        sec
      </text>
    </svg>
  );
}

const LOOP_DURATION_S = 45;

export default function RemediationOverlay({ onUnlocked }: RemediationOverlayProps) {
  const { crevsMode, loopStart, loopEnd, currentNoteId, currentRemediationSessionId } =
    useCrevsStore();
  const isVisible = crevsMode === 'LOOP_LOCKED' || crevsMode === 'CHALLENGE_PENDING';

  const [loopSecondsRemaining, setLoopSecondsRemaining] = useState(LOOP_DURATION_S);
  const [loopCount, setLoopCount] = useState(0);
  const [challengeOpen, setChallengeOpen] = useState(false);
  const loopStartTimeRef = useRef<number>(Date.now());

  const { data: note, isLoading: noteLoading } = useDecoyNote(currentNoteId);

  // ── Loop pass counter ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isVisible) return;
    loopStartTimeRef.current = Date.now();
    setLoopSecondsRemaining(LOOP_DURATION_S);

    const id = setInterval(() => {
      const elapsed = Math.round((Date.now() - loopStartTimeRef.current) / 1000);
      const remaining = Math.max(0, LOOP_DURATION_S - (elapsed % LOOP_DURATION_S));
      setLoopSecondsRemaining(remaining);
      if (elapsed > 0 && elapsed % LOOP_DURATION_S === 0) {
        setLoopCount(c => c + 1);
        loopStartTimeRef.current = Date.now();
      }
    }, 1000);

    return () => clearInterval(id);
  }, [isVisible]);

  const handleChallengeClose = useCallback(
    (passed: boolean) => {
      setChallengeOpen(false);
      if (passed) {
        onUnlocked?.();
      }
    },
    [onUnlocked],
  );

  if (!isVisible) return null;

  return (
    <>
      {/* ── Styles (inline scoped to avoid CSS file dep) ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        .crevs-overlay {
          position: fixed;
          inset: 0;
          z-index: 9000;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(2, 6, 23, 0.82);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          font-family: 'Inter', system-ui, sans-serif;
          animation: crevs-fadeIn 0.35s ease-out;
        }

        @keyframes crevs-fadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to   { opacity: 1; transform: scale(1); }
        }

        .crevs-card {
          background: linear-gradient(135deg, rgba(30,27,75,0.95) 0%, rgba(15,23,42,0.95) 100%);
          border: 1px solid rgba(167,139,250,0.25);
          border-radius: 24px;
          padding: 40px 44px;
          width: min(680px, 92vw);
          box-shadow:
            0 0 0 1px rgba(167,139,250,0.08),
            0 40px 80px rgba(0,0,0,0.6),
            0 0 120px rgba(99,102,241,0.15);
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .crevs-header {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .crevs-lock-icon {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #7c3aed, #2563eb);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          animation: crevs-pulse 2.5s ease-in-out infinite;
        }

        @keyframes crevs-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(124,58,237,0.4); }
          50% { box-shadow: 0 0 0 12px rgba(124,58,237,0); }
        }

        .crevs-title {
          font-size: 20px;
          font-weight: 700;
          color: #f1f5f9;
          margin: 0;
          letter-spacing: -0.3px;
        }

        .crevs-subtitle {
          font-size: 13px;
          color: rgba(148,163,184,0.9);
          margin: 4px 0 0;
        }

        .crevs-body {
          display: flex;
          gap: 32px;
          align-items: flex-start;
        }

        .crevs-ring-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .crevs-loop-badge {
          font-size: 11px;
          color: rgba(148,163,184,0.8);
          background: rgba(255,255,255,0.05);
          border-radius: 20px;
          padding: 3px 10px;
          border: 1px solid rgba(255,255,255,0.08);
        }

        .crevs-note-section {
          flex: 1;
        }

        .crevs-note-label {
          font-size: 11px;
          font-weight: 600;
          color: #a78bfa;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 14px;
        }

        .crevs-note-loading {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .crevs-skeleton {
          height: 14px;
          background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
          background-size: 200% 100%;
          border-radius: 8px;
          animation: crevs-shimmer 1.5s infinite;
        }

        @keyframes crevs-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        .crevs-bullets {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .crevs-bullet {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 16px;
          background: rgba(255,255,255,0.03);
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.06);
          transition: border-color 0.2s;
        }

        .crevs-bullet:hover {
          border-color: rgba(167,139,250,0.2);
        }

        .crevs-bullet-num {
          width: 22px;
          height: 22px;
          background: linear-gradient(135deg, #7c3aed, #2563eb);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          color: white;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .crevs-bullet-text {
          font-size: 14px;
          line-height: 1.6;
          color: #cbd5e1;
        }

        .crevs-footer {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .crevs-hint {
          font-size: 12px;
          color: rgba(148,163,184,0.7);
          text-align: center;
          line-height: 1.5;
        }

        .crevs-btn-challenge {
          width: 100%;
          padding: 14px 24px;
          background: linear-gradient(135deg, #7c3aed 0%, #2563eb 100%);
          color: white;
          font-size: 15px;
          font-weight: 600;
          border: none;
          border-radius: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: opacity 0.2s, transform 0.15s;
          letter-spacing: -0.2px;
        }

        .crevs-btn-challenge:hover {
          opacity: 0.92;
          transform: translateY(-1px);
        }

        .crevs-btn-challenge:active {
          transform: translateY(0);
        }

        .crevs-warning {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: rgba(245,158,11,0.08);
          border: 1px solid rgba(245,158,11,0.2);
          border-radius: 10px;
          font-size: 12px;
          color: #fbbf24;
        }
      `}</style>

      <div className="crevs-overlay" role="dialog" aria-modal="true" aria-label="Remediation Review">
        <div className="crevs-card">
          {/* ── Header ── */}
          <div className="crevs-header">
            <div className="crevs-lock-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <div>
              <p className="crevs-title">Smart Review — Loop Locked 🔁</p>
              <p className="crevs-subtitle">
                Review the 45-second segment below. Read the AI summary carefully.
              </p>
            </div>
          </div>

          {/* ── Body ── */}
          <div className="crevs-body">
            {/* Countdown ring */}
            <div className="crevs-ring-col">
              <CountdownRing
                totalSeconds={LOOP_DURATION_S}
                currentSeconds={loopSecondsRemaining}
              />
              <span className="crevs-loop-badge">
                Loop {loopCount + 1}
              </span>
            </div>

            {/* Bullets */}
            <div className="crevs-note-section">
              <p className="crevs-note-label">📝 AI Summary Note</p>
              {noteLoading || !note ? (
                <div className="crevs-note-loading">
                  <div className="crevs-skeleton" style={{ width: '90%' }} />
                  <div className="crevs-skeleton" style={{ width: '80%' }} />
                  <div className="crevs-skeleton" style={{ width: '85%' }} />
                </div>
              ) : (
                <ul className="crevs-bullets">
                  {note.bullets.map((bullet, i) => (
                    <li key={i} className="crevs-bullet">
                      <span className="crevs-bullet-num">{i + 1}</span>
                      <span className="crevs-bullet-text">{bullet}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="crevs-footer">
            <div className="crevs-warning">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              One of these bullets <em>might</em> contain a subtle error — or they might all be correct. Think critically!
            </div>

            <p className="crevs-hint">
              Spot the error? Earn reputation points by challenging the AI ↓
            </p>

            <button
              id="crevs-challenge-btn"
              className="crevs-btn-challenge"
              onClick={() => setChallengeOpen(true)}
              disabled={noteLoading}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
              Challenge AI — I Found an Error!
            </button>
          </div>
        </div>
      </div>

      {/* ── Challenge Modal ── */}
      {challengeOpen && currentNoteId && currentRemediationSessionId && (
        <ChallengeAIModal
          noteId={currentNoteId}
          sessionId={currentRemediationSessionId}
          onClose={handleChallengeClose}
        />
      )}
    </>
  );
}
