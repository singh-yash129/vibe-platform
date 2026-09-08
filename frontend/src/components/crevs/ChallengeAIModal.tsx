/**
 * ChallengeAIModal.tsx
 *
 * The "Challenge AI" submission modal — a student who believes they've found
 * the intentional decoy error writes their correction here.
 *
 * On success: shows confetti + reputation badge increment animation.
 * On miss/false alarm: shows encouraging feedback without penalty.
 */
import { useState, useCallback, useEffect } from 'react';
import { useSubmitChallenge } from '@/hooks/crevs-hooks';
import { useCrevsStore } from '@/store/player-store';

interface ChallengeAIModalProps {
  noteId: string;
  sessionId: string;
  /** courseId and videoItemId pulled from parent context — pass them in */
  courseId?: string;
  videoItemId?: string;
  onClose: (passed: boolean) => void;
}

/** Minimal confetti burst rendered as CSS particles */
function ConfettiBurst() {
  const colors = ['#a78bfa', '#38bdf8', '#f472b6', '#34d399', '#fbbf24'];
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
    left: Math.random() * 100,
    delay: Math.random() * 0.6,
    rotation: Math.random() * 360,
    size: 6 + Math.random() * 8,
  }));

  return (
    <div className="cai-confetti-container" aria-hidden="true">
      <style>{`
        .cai-confetti-container {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 10;
        }
        .cai-particle {
          position: absolute;
          top: -10px;
          border-radius: 2px;
          animation: cai-fall 1.4s ease-in forwards;
        }
        @keyframes cai-fall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
      {particles.map(p => (
        <div
          key={p.id}
          className="cai-particle"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
    </div>
  );
}

export default function ChallengeAIModal({
  noteId,
  sessionId,
  courseId = '',
  videoItemId = '',
  onClose,
}: ChallengeAIModalProps) {
  const [correction, setCorrection] = useState('');
  const [result, setResult] = useState<{
    isDecoyCaught: boolean;
    reputationGranted: number;
    newReputationScore: number;
    feedback: string;
  } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const { mutateAsync: submitChallenge, isPending } = useSubmitChallenge();
  const { openChallenge, closeChallenge } = useCrevsStore();

  useEffect(() => {
    openChallenge();
    return () => {};
  }, [openChallenge]);

  const handleSubmit = useCallback(async () => {
    if (!correction.trim() || isPending) return;

    try {
      const data = await submitChallenge({
        sessionId,
        noteId,
        courseId,
        videoItemId,
        studentCorrection: correction.trim(),
      });
      setResult(data);
      if (data.isDecoyCaught) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2000);
      }
    } catch (err) {
      console.error('[CREVS] Challenge submission error:', err);
    }
  }, [correction, isPending, submitChallenge, sessionId, noteId, courseId, videoItemId]);

  const handleClose = useCallback(() => {
    const passed = result?.isDecoyCaught ?? false;
    closeChallenge(passed);
    onClose(passed);
  }, [result, closeChallenge, onClose]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        .cai-backdrop {
          position: fixed;
          inset: 0;
          z-index: 9500;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Inter', system-ui, sans-serif;
          animation: cai-fade 0.2s ease-out;
        }

        @keyframes cai-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        .cai-modal {
          position: relative;
          background: linear-gradient(145deg, #1e1b4b 0%, #0f172a 100%);
          border: 1px solid rgba(167,139,250,0.3);
          border-radius: 20px;
          padding: 36px 40px;
          width: min(560px, 92vw);
          box-shadow: 0 40px 80px rgba(0,0,0,0.7), 0 0 60px rgba(99,102,241,0.12);
          animation: cai-slide 0.25s ease-out;
        }

        @keyframes cai-slide {
          from { transform: translateY(20px); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }

        .cai-close {
          position: absolute;
          top: 16px;
          right: 16px;
          background: rgba(255,255,255,0.05);
          border: none;
          border-radius: 8px;
          color: rgba(148,163,184,0.8);
          width: 32px;
          height: 32px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s;
        }
        .cai-close:hover { background: rgba(255,255,255,0.1); }

        .cai-icon-badge {
          width: 52px;
          height: 52px;
          background: linear-gradient(135deg, #7c3aed, #2563eb);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }

        .cai-title {
          font-size: 22px;
          font-weight: 700;
          color: #f1f5f9;
          margin: 0 0 8px;
          letter-spacing: -0.4px;
        }

        .cai-desc {
          font-size: 14px;
          color: rgba(148,163,184,0.85);
          margin: 0 0 28px;
          line-height: 1.6;
        }

        .cai-textarea {
          width: 100%;
          min-height: 120px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(167,139,250,0.2);
          border-radius: 12px;
          color: #e2e8f0;
          font-size: 14px;
          font-family: 'Inter', system-ui, sans-serif;
          padding: 14px 16px;
          resize: vertical;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s;
          line-height: 1.6;
        }
        .cai-textarea:focus {
          border-color: rgba(167,139,250,0.5);
          box-shadow: 0 0 0 3px rgba(124,58,237,0.1);
        }
        .cai-textarea::placeholder { color: rgba(100,116,139,0.7); }

        .cai-char-count {
          text-align: right;
          font-size: 11px;
          color: rgba(100,116,139,0.7);
          margin: 6px 0 20px;
        }

        .cai-submit {
          width: 100%;
          padding: 14px 24px;
          border: none;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .cai-submit:not(:disabled) {
          background: linear-gradient(135deg, #7c3aed, #2563eb);
          color: white;
        }
        .cai-submit:not(:disabled):hover { opacity: 0.9; transform: translateY(-1px); }
        .cai-submit:disabled {
          background: rgba(255,255,255,0.08);
          color: rgba(148,163,184,0.5);
          cursor: not-allowed;
        }

        .cai-result {
          padding: 20px;
          border-radius: 14px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-top: 4px;
        }

        .cai-result--caught {
          background: rgba(52,211,153,0.07);
          border: 1px solid rgba(52,211,153,0.25);
        }

        .cai-result--miss {
          background: rgba(148,163,184,0.05);
          border: 1px solid rgba(148,163,184,0.15);
        }

        .cai-result-emoji {
          font-size: 36px;
          text-align: center;
          animation: cai-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes cai-pop {
          from { transform: scale(0); }
          to   { transform: scale(1); }
        }

        .cai-result-feedback {
          font-size: 15px;
          line-height: 1.65;
          color: #e2e8f0;
          text-align: center;
        }

        .cai-rep-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 20px;
          background: linear-gradient(135deg, rgba(124,58,237,0.2), rgba(37,99,235,0.2));
          border: 1px solid rgba(167,139,250,0.3);
          border-radius: 30px;
          font-size: 14px;
          font-weight: 600;
          color: #a78bfa;
        }

        .cai-done-btn {
          width: 100%;
          padding: 12px 20px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          color: #cbd5e1;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s;
          font-family: 'Inter', system-ui, sans-serif;
        }
        .cai-done-btn:hover { background: rgba(255,255,255,0.09); }

        .cai-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: cai-spin 0.7s linear infinite;
          display: inline-block;
        }
        @keyframes cai-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div className="cai-backdrop" role="dialog" aria-modal="true" aria-label="Challenge AI Modal">
        <div className="cai-modal">
          {showConfetti && <ConfettiBurst />}

          {!result && (
            <button
              className="cai-close"
              onClick={handleClose}
              aria-label="Close modal"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}

          {!result ? (
            <>
              <div className="cai-icon-badge">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </div>

              <h2 className="cai-title">Challenge the AI ⚡</h2>
              <p className="cai-desc">
                Think you've spotted a subtle error in the summary? Describe what
                you believe is incorrect and what the correct information should be.
                Your reputation grows when you're right!
              </p>

              <textarea
                id="crevs-challenge-textarea"
                className="cai-textarea"
                placeholder="e.g. Bullet 2 says X is Y, but based on the lecture it should be Z because..."
                value={correction}
                onChange={e => setCorrection(e.target.value.slice(0, 600))}
                maxLength={600}
              />
              <p className="cai-char-count">{correction.length} / 600</p>

              <button
                id="crevs-challenge-submit-btn"
                className="cai-submit"
                onClick={handleSubmit}
                disabled={isPending || correction.trim().length < 10}
              >
                {isPending ? (
                  <><span className="cai-spinner" /> Analysing…</>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Submit Correction
                  </>
                )}
              </button>
            </>
          ) : (
            <div className={`cai-result ${result.isDecoyCaught ? 'cai-result--caught' : 'cai-result--miss'}`}>
              <div className="cai-result-emoji">
                {result.isDecoyCaught ? '🎯' : result.reputationGranted === 0 ? '🔍' : '✅'}
              </div>

              <p className="cai-result-feedback">{result.feedback}</p>

              {result.reputationGranted > 0 && (
                <div className="cai-rep-badge">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                  +{result.reputationGranted} Reputation Points
                  &nbsp;·&nbsp;
                  Total: {result.newReputationScore}
                </div>
              )}

              <button
                id="crevs-challenge-close-btn"
                className="cai-done-btn"
                onClick={handleClose}
              >
                {result.isDecoyCaught ? '🔓 Continue (Loop Unlocked)' : 'Close'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
