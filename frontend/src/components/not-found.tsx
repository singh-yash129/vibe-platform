import { type FC, useEffect, useState } from "react"
import { useAuthStore } from "@/store/auth-store"
import { useNavigate } from "@tanstack/react-router"

export const NotFoundComponent: FC = () => {
  const { isAuthenticated, user } = useAuthStore()
  const navigate = useNavigate()
  const [countdown, setCountdown] = useState(5)
  const [isRedirecting, setIsRedirecting] = useState(false)

  const getHomeRoute = () => {
    if (isAuthenticated && user?.role) {
      return `/${user.role.toLowerCase()}`
    }
    return "/auth"
  }

  const handleRedirect = () => {
    setIsRedirecting(true)
    setTimeout(() => {
      navigate({ to: getHomeRoute() })
    }, 300)
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          handleRedirect()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const progressPercentage = ((5 - countdown) / 5) * 100

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;500;600&display=swap');

        .nf-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          position: relative;
          overflow: hidden;
          background: hsl(240 8% 5%);
          font-family: 'Inter', sans-serif;
        }

        /* Ambient background orbs */
        .nf-orb-1 {
          position: absolute;
          width: 600px; height: 600px;
          border-radius: 50%;
          background: radial-gradient(circle, hsl(262 83% 65% / 0.12) 0%, transparent 70%);
          top: -200px; left: -100px;
          pointer-events: none;
          animation: float-slow 8s ease-in-out infinite;
        }
        .nf-orb-2 {
          position: absolute;
          width: 500px; height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, hsl(38 95% 58% / 0.08) 0%, transparent 70%);
          bottom: -150px; right: -80px;
          pointer-events: none;
          animation: float-slow 10s ease-in-out infinite reverse;
        }

        @keyframes float-slow {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          33%       { transform: translateY(-20px) rotate(2deg); }
          66%       { transform: translateY(-10px) rotate(-1deg); }
        }

        /* Glitch 404 */
        .nf-glitch-wrap {
          position: relative;
          display: inline-block;
          margin-bottom: 8px;
        }
        .nf-404 {
          font-size: clamp(100px, 18vw, 180px);
          font-weight: 800;
          font-family: 'Syne', sans-serif;
          letter-spacing: -0.05em;
          line-height: 1;
          background: linear-gradient(135deg, #ffffff 0%, hsl(262 83% 80%) 50%, hsl(38 95% 65%) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          user-select: none;
        }
        .nf-404::before,
        .nf-404::after {
          content: '404';
          position: absolute;
          top: 0; left: 0;
          font-size: clamp(100px, 18vw, 180px);
          font-weight: 800;
          font-family: 'Syne', sans-serif;
          letter-spacing: -0.05em;
          line-height: 1;
          -webkit-text-fill-color: transparent;
          -webkit-background-clip: text;
          background-clip: text;
        }
        .nf-404::before {
          background: linear-gradient(135deg, hsl(262 83% 70%), hsl(262 83% 70% / 0));
          -webkit-background-clip: text;
          background-clip: text;
          animation: glitch-1 3.5s infinite;
          opacity: 0.7;
        }
        .nf-404::after {
          background: linear-gradient(135deg, hsl(38 95% 58%), hsl(38 95% 58% / 0));
          -webkit-background-clip: text;
          background-clip: text;
          animation: glitch-2 3.5s infinite;
          opacity: 0.7;
        }
        @keyframes glitch-1 {
          0%, 90%, 100% { clip-path: inset(0 0 100% 0); transform: translate(0); }
          92% { clip-path: inset(20% 0 50% 0); transform: translate(-4px, 0); }
          94% { clip-path: inset(60% 0 10% 0); transform: translate(4px, 0); }
          96% { clip-path: inset(5% 0 75% 0); transform: translate(-2px, 0); }
        }
        @keyframes glitch-2 {
          0%, 88%, 100% { clip-path: inset(0 0 100% 0); transform: translate(0); }
          89% { clip-path: inset(40% 0 30% 0); transform: translate(4px, 0); }
          91% { clip-path: inset(70% 0 5% 0); transform: translate(-4px, 0); }
          93% { clip-path: inset(15% 0 65% 0); transform: translate(2px, 0); }
        }

        /* Card */
        .nf-card {
          position: relative;
          z-index: 10;
          text-align: center;
          padding: 48px 40px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 28px;
          backdrop-filter: blur(40px);
          -webkit-backdrop-filter: blur(40px);
          max-width: 460px;
          width: 100%;
          box-shadow: 0 32px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.03);
          animation: scale-in 0.5s cubic-bezier(0.22,1,0.36,1);
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.92) translateY(16px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }

        /* Progress bar */
        .nf-progress-track {
          height: 3px;
          background: rgba(255,255,255,0.06);
          border-radius: 3px;
          overflow: hidden;
          margin: 20px 0;
        }
        .nf-progress-fill {
          height: 100%;
          border-radius: 3px;
          background: linear-gradient(to right, hsl(38 95% 58%), hsl(262 83% 70%));
          box-shadow: 0 0 8px hsl(262 83% 70% / 0.5);
          transition: width 0.95s cubic-bezier(0.22,1,0.36,1);
        }

        /* Button */
        .nf-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 28px;
          background: linear-gradient(135deg, hsl(262 83% 58%), hsl(220 80% 65%));
          border: none;
          border-radius: 14px;
          color: white;
          font-size: 14px;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.2s cubic-bezier(0.22,1,0.36,1), box-shadow 0.2s;
          box-shadow: 0 8px 24px rgba(99,102,241,0.35);
        }
        .nf-btn:hover {
          opacity: 0.9;
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(99,102,241,0.5);
        }
        .nf-btn:active { transform: translateY(0); }

        /* Floating particles */
        .nf-particle {
          position: absolute;
          pointer-events: none;
          animation: float-slow var(--dur, 5s) ease-in-out infinite;
          animation-delay: var(--delay, 0s);
          font-size: var(--size, 20px);
          opacity: 0.08;
        }
      `}</style>

      <div className="nf-root">
        {/* Background orbs */}
        <div className="nf-orb-1" />
        <div className="nf-orb-2" />

        {/* Floating particles */}
        {['⭐', '💫', '✨', '🌟', '⚡', '💥', '🔮', '🌀'].map((p, i) => (
          <span
            key={i}
            className="nf-particle"
            style={{
              left: `${10 + i * 12}%`,
              top: `${15 + (i % 3) * 25}%`,
              '--dur': `${4 + (i % 3)}s`,
              '--delay': `${i * 0.5}s`,
              '--size': `${18 + (i % 3) * 10}px`,
            } as React.CSSProperties}
          >
            {p}
          </span>
        ))}

        {/* Card */}
        <div className="nf-card">
          {/* 404 glitch text */}
          <div className="nf-glitch-wrap">
            <div className="nf-404" aria-label="404">404</div>
          </div>

          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: '#f0f4ff',
              marginBottom: 8,
              fontFamily: "'Syne', sans-serif",
              letterSpacing: '-0.02em',
            }}
          >
            Page Not Found
          </h1>

          <p style={{ fontSize: 14, color: 'rgba(148,163,184,0.75)', lineHeight: 1.6, marginBottom: 4 }}>
            This page wandered off into the void. You'll be redirected in{" "}
            <span style={{ color: 'hsl(262 83% 70%)', fontWeight: 700 }}>{countdown}s</span>
          </p>

          {/* Auto-redirect progress */}
          <div className="nf-progress-track">
            <div className="nf-progress-fill" style={{ width: `${progressPercentage}%` }} />
          </div>

          <button
            className="nf-btn"
            onClick={handleRedirect}
            disabled={isRedirecting}
            style={{ opacity: isRedirecting ? 0.6 : 1 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
            </svg>
            {isRedirecting ? "Redirecting…" : "Take me home"}
          </button>
        </div>
      </div>
    </>
  )
}
