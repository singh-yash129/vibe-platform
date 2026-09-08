/**
 * ReputationBadge.tsx
 *
 * Student CREVS reputation badge — shows the current reputation score,
 * decoys caught, and a tier label. Can be embedded anywhere (player sidebar,
 * profile page, course header).
 */
import { useStudentProfile } from '@/hooks/crevs-hooks';

interface ReputationBadgeProps {
  /** Show the full card vs. a compact inline chip */
  variant?: 'card' | 'chip';
}

interface Tier {
  label: string;
  minScore: number;
  color: string;
  gradient: string;
  emoji: string;
}

const TIERS: Tier[] = [
  { label: 'Scholar', minScore: 0,    color: '#94a3b8', gradient: 'linear-gradient(135deg,#334155,#475569)', emoji: '📚' },
  { label: 'Analyst', minScore: 150,  color: '#34d399', gradient: 'linear-gradient(135deg,#065f46,#059669)', emoji: '🔬' },
  { label: 'Skeptic', minScore: 400,  color: '#38bdf8', gradient: 'linear-gradient(135deg,#0c4a6e,#0284c7)', emoji: '🔭' },
  { label: 'Detector', minScore: 800, color: '#a78bfa', gradient: 'linear-gradient(135deg,#4c1d95,#7c3aed)', emoji: '🎯' },
  { label: 'Oracle',  minScore: 1500, color: '#fbbf24', gradient: 'linear-gradient(135deg,#78350f,#d97706)', emoji: '⚡' },
];

function getTier(score: number): Tier {
  return [...TIERS].reverse().find(t => score >= t.minScore) ?? TIERS[0];
}

export default function ReputationBadge({ variant = 'card' }: ReputationBadgeProps) {
  const { data: profile, isLoading } = useStudentProfile();
  const tier = getTier(profile?.reputationScore ?? 0);
  const catchRate =
    profile && profile.decoysEncountered > 0
      ? Math.round((profile.decoysCaught / profile.decoysEncountered) * 100)
      : 0;

  if (variant === 'chip') {
    return (
      <>
        <style>{`
          .rep-chip {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 5px 12px;
            background: rgba(167,139,250,0.1);
            border: 1px solid rgba(167,139,250,0.25);
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
            font-family: 'Inter', system-ui, sans-serif;
            color: #a78bfa;
            white-space: nowrap;
          }
          .rep-chip-score { color: white; }
        `}</style>
        <div id="crevs-reputation-chip" className="rep-chip">
          <span>{tier.emoji}</span>
          <span className="rep-chip-score">
            {isLoading ? '…' : (profile?.reputationScore ?? 0)} pts
          </span>
          <span style={{ color: tier.color }}>{tier.label}</span>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        .rep-card {
          background: linear-gradient(145deg, #1e1b4b 0%, #0f172a 100%);
          border: 1px solid rgba(167,139,250,0.2);
          border-radius: 20px;
          padding: 28px 28px 24px;
          font-family: 'Inter', system-ui, sans-serif;
          min-width: 240px;
          position: relative;
          overflow: hidden;
        }

        .rep-glow {
          position: absolute;
          top: -40px;
          right: -40px;
          width: 180px;
          height: 180px;
          border-radius: 50%;
          opacity: 0.12;
          pointer-events: none;
        }

        .rep-tier-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 16px;
        }

        .rep-score-row {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin-bottom: 4px;
        }

        .rep-score {
          font-size: 46px;
          font-weight: 800;
          color: white;
          line-height: 1;
          letter-spacing: -2px;
        }

        .rep-score-label {
          font-size: 14px;
          color: rgba(148,163,184,0.7);
          font-weight: 500;
        }

        .rep-divider {
          height: 1px;
          background: rgba(255,255,255,0.06);
          margin: 18px 0;
        }

        .rep-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .rep-stat {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          padding: 10px 12px;
        }

        .rep-stat-val {
          font-size: 20px;
          font-weight: 700;
          color: white;
          line-height: 1;
          margin-bottom: 4px;
        }

        .rep-stat-key {
          font-size: 11px;
          color: rgba(100,116,139,0.9);
          line-height: 1.3;
        }

        .rep-skeleton {
          height: 14px;
          background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%);
          background-size: 200% 100%;
          border-radius: 8px;
          animation: rep-shimmer 1.5s infinite;
        }

        @keyframes rep-shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
      `}</style>

      <div id="crevs-reputation-card" className="rep-card">
        <div className="rep-glow" style={{ background: tier.gradient }} />

        <div className="rep-tier-badge" style={{ background: `${tier.color}20`, color: tier.color, border: `1px solid ${tier.color}40` }}>
          {tier.emoji} {tier.label}
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="rep-skeleton" style={{ width: '60%' }} />
            <div className="rep-skeleton" style={{ width: '40%' }} />
          </div>
        ) : (
          <>
            <div className="rep-score-row">
              <span className="rep-score">{profile?.reputationScore ?? 0}</span>
              <span className="rep-score-label">reputation pts</span>
            </div>

            <div className="rep-divider" />

            <div className="rep-stats">
              <div className="rep-stat">
                <div className="rep-stat-val">{profile?.decoysCaught ?? 0}</div>
                <div className="rep-stat-key">Decoys Caught</div>
              </div>
              <div className="rep-stat">
                <div className="rep-stat-val">{catchRate}%</div>
                <div className="rep-stat-key">Catch Rate</div>
              </div>
              <div className="rep-stat">
                <div className="rep-stat-val">{profile?.remediationSessions ?? 0}</div>
                <div className="rep-stat-key">Review Loops</div>
              </div>
              <div className="rep-stat">
                <div className="rep-stat-val">{profile?.remediationPasses ?? 0}</div>
                <div className="rep-stat-key">Loops Passed</div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
