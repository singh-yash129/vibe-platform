import React from 'react';

/**
 * Premium ViBe Loader — dual orbital rings (amber outer + violet inner)
 * with a pulsing gradient center dot. Pure CSS + SVG, no styled-components.
 */
const Loader = () => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
      }}
    >
      <style>{`
        @keyframes vibe-spin-cw {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes vibe-spin-ccw {
          from { transform: rotate(0deg); }
          to   { transform: rotate(-360deg); }
        }
        @keyframes loader-center-pulse {
          0%, 100% { transform: translate(-50%,-50%) scale(1);   opacity: 1; }
          50%       { transform: translate(-50%,-50%) scale(1.7); opacity: 0.4; }
        }
      `}</style>

      <div style={{ position: 'relative', width: 72, height: 72 }}>
        {/* Outer amber ring */}
        <svg
          width="72" height="72" viewBox="0 0 72 72" fill="none"
          style={{ position: 'absolute', inset: 0, animation: 'vibe-spin-cw 1.4s linear infinite' }}
        >
          <defs>
            <linearGradient id="lo-amber" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="hsl(38 95% 60%)" />
              <stop offset="100%" stopColor="hsl(38 95% 60% / 0)" />
            </linearGradient>
          </defs>
          <circle cx="36" cy="36" r="32"
            stroke="url(#lo-amber)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="160 40"
          />
        </svg>

        {/* Inner violet ring */}
        <svg
          width="72" height="72" viewBox="0 0 72 72" fill="none"
          style={{ position: 'absolute', inset: 0, animation: 'vibe-spin-ccw 1s linear infinite' }}
        >
          <defs>
            <linearGradient id="lo-violet" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="hsl(262 83% 70%)" />
              <stop offset="100%" stopColor="hsl(262 83% 70% / 0)" />
            </linearGradient>
          </defs>
          <circle cx="36" cy="36" r="20"
            stroke="url(#lo-violet)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="90 35"
          />
        </svg>

        {/* Center glow dot */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, hsl(38 95% 60%), hsl(262 83% 70%))',
            animation: 'loader-center-pulse 1.4s ease-in-out infinite',
            boxShadow: '0 0 18px hsl(262 83% 70% / 0.7)',
          }}
        />
      </div>
    </div>
  );
};

export default Loader;
