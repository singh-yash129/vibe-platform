import React from 'react';

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
      {/* Orbital rings */}
      <div style={{ position: 'relative', width: 72, height: 72 }}>
        {/* Outer ring — amber gradient */}
        <svg
          width="72"
          height="72"
          viewBox="0 0 72 72"
          fill="none"
          style={{ position: 'absolute', inset: 0, animation: 'vibe-spin-cw 1.4s linear infinite' }}
        >
          <defs>
            <linearGradient id="loader-outer-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(38 95% 58%)" />
              <stop offset="100%" stopColor="hsl(38 95% 58% / 0)" />
            </linearGradient>
          </defs>
          <circle
            cx="36" cy="36" r="32"
            stroke="url(#loader-outer-grad)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="160 40"
          />
        </svg>

        {/* Inner ring — violet gradient */}
        <svg
          width="72"
          height="72"
          viewBox="0 0 72 72"
          fill="none"
          style={{ position: 'absolute', inset: 0, animation: 'vibe-spin-ccw 1.0s linear infinite' }}
        >
          <defs>
            <linearGradient id="loader-inner-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(262 83% 70%)" />
              <stop offset="100%" stopColor="hsl(262 83% 70% / 0)" />
            </linearGradient>
          </defs>
          <circle
            cx="36" cy="36" r="20"
            stroke="url(#loader-inner-grad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="90 35"
          />
        </svg>

        {/* Center pulse dot */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, hsl(38 95% 60%), hsl(262 83% 70%))',
            animation: 'loader-pulse 1.4s ease-in-out infinite',
            boxShadow: '0 0 16px hsl(262 83% 70% / 0.6)',
          }}
        />
      </div>

      <style>{`
        @keyframes vibe-spin-cw {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes vibe-spin-ccw {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        @keyframes loader-pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          50% { transform: translate(-50%, -50%) scale(1.6); opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default Loader;


const Loader = () => {
  return (
    <StyledWrapper>
      <div className="loader">
        <div className="circle">
          <div className="dot" />
          <div className="outline" />
        </div>
        <div className="circle">
          <div className="dot" />
          <div className="outline" />
        </div>
        <div className="circle">
          <div className="dot" />
          <div className="outline" />
        </div>
        <div className="circle">
          <div className="dot" />
          <div className="outline" />
        </div>
      </div>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  .loader {
    display: flex;
    justify-content: center;
    align-items: center;
    --color: hsl(0, 0%, 87%);
    --animation: 2s ease-in-out infinite;
  }

  .loader .circle {
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    width: 20px;
    height: 20px;
    border: solid 2px var(--color);
    border-radius: 50%;
    margin: 0 10px;
    background-color: transparent;
    animation: circle-keys var(--animation);
  }

  .loader .circle .dot {
    position: absolute;
    transform: translate(-50%, -50%);
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background-color: var(--color);
    animation: dot-keys var(--animation);
  }

  .loader .circle .outline {
    position: absolute;
    transform: translate(-50%, -50%);
    width: 20px;
    height: 20px;
    border-radius: 50%;
    animation: outline-keys var(--animation);
  }

  .circle:nth-child(2) {
    animation-delay: 0.3s;
  }

  .circle:nth-child(3) {
    animation-delay: 0.6s;
  }

  .circle:nth-child(4) {
    animation-delay: 0.9s;
  }

  .circle:nth-child(5) {
    animation-delay: 1.2s;
  }

  .circle:nth-child(2) .dot {
    animation-delay: 0.3s;
  }

  .circle:nth-child(3) .dot {
    animation-delay: 0.6s;
  }

  .circle:nth-child(4) .dot {
    animation-delay: 0.9s;
  }

  .circle:nth-child(5) .dot {
    animation-delay: 1.2s;
  }

  .circle:nth-child(1) .outline {
    animation-delay: 0.9s;
  }

  .circle:nth-child(2) .outline {
    animation-delay: 1.2s;
  }

  .circle:nth-child(3) .outline {
    animation-delay: 1.5s;
  }

  .circle:nth-child(4) .outline {
    animation-delay: 1.8s;
  }

  .circle:nth-child(5) .outline {
    animation-delay: 2.1s;
  }

  @keyframes circle-keys {
    0% {
      transform: scale(1);
      opacity: 1;
    }

    50% {
      transform: scale(1.5);
      opacity: 0.5;
    }

    100% {
      transform: scale(1);
      opacity: 1;
    }
  }

  @keyframes dot-keys {
    0% {
      transform: scale(1);
    }

    50% {
      transform: scale(0);
    }

    100% {
      transform: scale(1);
    }
  }

  @keyframes outline-keys {
    0% {
      transform: scale(0);
      outline: solid 20px var(--color);
      outline-offset: 0;
      opacity: 1;
    }

    100% {
      transform: scale(1);
      outline: solid 0 transparent;
      outline-offset: 20px;
      opacity: 0;
    }
  }`;

export default Loader;
