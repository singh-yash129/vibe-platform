/**
 * BreakButton.tsx — "May I Drink Water? 💧" Break system
 *
 * Premium cinematic overlay with:
 *  - Animated water-drop trigger button with ripple + gradient glow
 *  - Full-screen glassmorphism break overlay
 *  - Liquid SVG countdown ring with shimmer
 *  - Floating particle emojis
 *  - Proctoring-paused badge with pulse indicator
 *  - Spring-animated resume button
 */
import React, { useRef, useEffect } from 'react';
import type { HlsPlayerHandle } from '@/components/HlsVideoPlayer';
import { useBreakState } from '@/hooks/useBreakState';

interface BreakButtonProps {
  playerRef: React.RefObject<HlsPlayerHandle | null>;
  compact?: boolean;
}

/** Liquid SVG ring countdown */
function LiquidRing({ secondsRemaining }: { secondsRemaining: number }) {
  const total = 5 * 60;
  const r = 80;
  const circumference = 2 * Math.PI * r;
  const progress = secondsRemaining / total;
  const dashOffset = circumference * (1 - progress);
  const mins = Math.floor(secondsRemaining / 60);
  const secs = secondsRemaining % 60;
  const label = `${mins}:${secs.toString().padStart(2, '0')}`;

  // Color interpolates from amber (full) → violet (almost done)
  const t = 1 - progress;
  const hue = Math.round(38 + t * (262 - 38));

  return (
    <div style={{ position: 'relative', width: 200, height: 200 }}>
      <svg width="200" height="200" viewBox="0 0 200 200" aria-label={`${label} remaining`}>
        <defs>
          <linearGradient id="brk-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={`hsl(${hue} 90% 65%)`} />
            <stop offset="100%" stopColor={`hsl(${hue + 40} 83% 70%)`} />
          </linearGradient>
          <filter id="brk-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        {/* Track */}
        <circle cx="100" cy="100" r={r} fill="none"
          stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
        {/* Progress */}
        <circle cx="100" cy="100" r={r} fill="none"
          stroke="url(#brk-ring-grad)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 100 100)"
          filter="url(#brk-glow)"
          style={{ transition: 'stroke-dashoffset 0.95s cubic-bezier(0.22,1,0.36,1)' }}
        />
        {/* Center content */}
        <text x="100" y="90" textAnchor="middle"
          fill="white" fontSize="36" fontWeight="800"
          fontFamily="'Syne',sans-serif" letterSpacing="-1">
          {label}
        </text>
        <text x="100" y="115" textAnchor="middle"
          fill="rgba(200,200,255,0.6)" fontSize="13"
          fontFamily="'Inter',sans-serif">
          break remaining
        </text>
        <text x="100" y="140" textAnchor="middle" fontSize="28">💧</text>
      </svg>
    </div>
  );
}

/** Floating particle emojis in the background */
function FloatingParticles() {
  const particles = ['💧', '🌊', '✨', '💦', '🫧', '⭐', '💧', '🌊', '🫧', '✨'];
  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {particles.map((emoji, i) => (
        <span key={i} style={{
          position: 'absolute',
          left: `${(i * 11 + 3) % 95}%`,
          top: `${(i * 17 + 10) % 85}%`,
          fontSize: `${16 + (i % 3) * 8}px`,
          opacity: 0.15 + (i % 4) * 0.05,
          animation: `float-slow ${4 + (i % 3) * 2}s ease-in-out infinite`,
          animationDelay: `${i * 0.4}s`,
        }}>
          {emoji}
        </span>
      ))}
    </div>
  );
}

export default function BreakButton({ playerRef, compact = false }: BreakButtonProps) {
  const { isOnBreak, secondsRemaining, startBreak, endBreak } = useBreakState({ playerRef });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;500;600;700&display=swap');

        /* ── Trigger button ── */
        #crevs-break-btn {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: ${compact ? '5px 10px' : '8px 16px'};
          background: linear-gradient(135deg, rgba(56,189,248,0.12), rgba(129,140,248,0.12));
          border: 1px solid rgba(129,140,248,0.3);
          border-radius: 12px;
          color: #a5b4fc;
          font-size: ${compact ? '12px' : '13px'};
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.22,1,0.36,1);
          overflow: hidden;
          white-space: nowrap;
        }
        #crevs-break-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, hsl(38 95% 58% / 0), hsl(262 83% 70% / 0));
          transition: background 0.3s;
        }
        #crevs-break-btn:hover {
          background: linear-gradient(135deg, rgba(56,189,248,0.22), rgba(129,140,248,0.22));
          border-color: rgba(129,140,248,0.55);
          color: #c7d2fe;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(129,140,248,0.25);
        }
        #crevs-break-btn:active { transform: translateY(0); }

        /* Ripple on click */
        .brk-ripple {
          position: absolute;
          border-radius: 50%;
          background: rgba(129,140,248,0.3);
          animation: brk-ripple-anim 0.6s ease-out forwards;
          pointer-events: none;
        }
        @keyframes brk-ripple-anim {
          from { width: 0; height: 0; opacity: 1; }
          to   { width: 120px; height: 120px; margin: -60px; opacity: 0; }
        }

        /* ── Full-screen overlay ── */
        #crevs-break-overlay {
          position: fixed;
          inset: 0;
          z-index: 9000;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 28px;
          font-family: 'Inter', sans-serif;
          animation: brk-overlay-in 0.4s cubic-bezier(0.22,1,0.36,1);
        }
        @keyframes brk-overlay-in {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }

        /* Animated mesh gradient background */
        .brk-bg {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 80% 60% at 20% 30%, rgba(56,189,248,0.18) 0%, transparent 60%),
            radial-gradient(ellipse 60% 80% at 80% 70%, rgba(129,140,248,0.15) 0%, transparent 60%),
            rgba(5, 5, 18, 0.97);
          backdrop-filter: blur(40px);
          -webkit-backdrop-filter: blur(40px);
        }

        .brk-title {
          font-size: 32px;
          font-weight: 800;
          color: #f0f4ff;
          margin: 0;
          letter-spacing: -0.5px;
          font-family: 'Syne', sans-serif;
          text-align: center;
        }

        .brk-subtitle {
          font-size: 15px;
          color: rgba(148,163,184,0.75);
          text-align: center;
          margin: -16px 0 0;
        }

        .brk-proctor-badge {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 22px;
          background: rgba(52,211,153,0.06);
          border: 1px solid rgba(52,211,153,0.2);
          border-radius: 16px;
          font-size: 14px;
          color: #6ee7b7;
          font-weight: 500;
          max-width: 400px;
          text-align: center;
          line-height: 1.5;
        }

        .brk-proctor-dot {
          width: 8px;
          height: 8px;
          min-width: 8px;
          border-radius: 50%;
          background: #34d399;
          animation: brk-proctor-blink 1.5s ease-in-out infinite;
        }
        @keyframes brk-proctor-blink {
          0%, 100% { opacity: 1; box-shadow: 0 0 6px rgba(52,211,153,0.8); }
          50%       { opacity: 0.3; box-shadow: none; }
        }

        #crevs-resume-btn {
          padding: 16px 44px;
          background: linear-gradient(135deg, hsl(200 90% 50%), hsl(262 83% 65%));
          border: none;
          border-radius: 16px;
          color: white;
          font-size: 16px;
          font-weight: 700;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.2s cubic-bezier(0.22,1,0.36,1), box-shadow 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          letter-spacing: -0.2px;
          box-shadow: 0 8px 32px rgba(99,102,241,0.35);
        }
        #crevs-resume-btn:hover {
          opacity: 0.92;
          transform: translateY(-3px);
          box-shadow: 0 16px 40px rgba(99,102,241,0.5);
        }
        #crevs-resume-btn:active { transform: translateY(0); }

        .brk-hint {
          font-size: 12px;
          color: rgba(100,116,139,0.65);
          text-align: center;
          max-width: 300px;
          line-height: 1.6;
        }

        /* Emoji float from globals.css used by particles */
        @keyframes float-slow {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          33%       { transform: translateY(-14px) rotate(3deg); }
          66%       { transform: translateY(-7px) rotate(-2deg); }
        }
      `}</style>

      {/* ── Trigger button ── */}
      {!isOnBreak && (
        <button
          id="crevs-break-btn"
          title="Take a 5-minute hydration break — proctoring pauses"
          onClick={(e) => {
            // Ripple effect
            const btn = e.currentTarget;
            const ripple = document.createElement('span');
            ripple.className = 'brk-ripple';
            const rect = btn.getBoundingClientRect();
            ripple.style.left = `${e.clientX - rect.left}px`;
            ripple.style.top = `${e.clientY - rect.top}px`;
            btn.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
            startBreak();
          }}
        >
          <span style={{ fontSize: compact ? '14px' : '16px', animation: 'float-slow 3s ease-in-out infinite' }}>💧</span>
          {!compact && (
            <span>May I Drink Water?</span>
          )}
          {!compact && (
            <span style={{ fontSize: '10px', opacity: 0.6, fontWeight: 400 }}>5 min</span>
          )}
        </button>
      )}

      {/* ── Break overlay ── */}
      {isOnBreak && (
        <div id="crevs-break-overlay" role="dialog" aria-modal="true" aria-label="Hydration break">
          {/* Animated mesh gradient background */}
          <div className="brk-bg" />

          {/* Floating emoji particles */}
          <FloatingParticles />

          {/* Title */}
          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
            <h1 className="brk-title">
              💧 Hydration Break
            </h1>
            <p className="brk-subtitle">Step away, relax — you've earned this! 🌊</p>
          </div>

          {/* Liquid ring countdown */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <LiquidRing secondsRemaining={secondsRemaining} />
          </div>

          {/* Proctoring paused badge */}
          <div className="brk-proctor-badge" style={{ position: 'relative', zIndex: 1 }}>
            <div className="brk-proctor-dot" />
            <span>🛡️ Proctoring is paused — you will NOT be monitored during this break</span>
          </div>

          {/* Resume button */}
          <button
            id="crevs-resume-btn"
            onClick={endBreak}
            style={{ position: 'relative', zIndex: 1 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            Resume Learning ✨
          </button>

          <p className="brk-hint" style={{ position: 'relative', zIndex: 1 }}>
            Proctoring auto-resumes when the timer ends or you click Resume.
            Stay hydrated! 💦
          </p>
        </div>
      )}
    </>
  );
}
