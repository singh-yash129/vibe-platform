/**
 * HeatmapView.tsx
 *
 * Professor/Admin analytics view: a heatmap of student decoy-challenge
 * interactions bucketed by 30-second video timestamp windows.
 *
 * Built with pure CSS grid — no external chart library required.
 * Each cell's intensity encodes the `catchRate` (0–1).
 * Hovering a cell shows a tooltip with the full bucket stats.
 */
import { useState } from 'react';
import { useHeatmap, type HeatmapBucket } from '@/hooks/crevs-hooks';

interface HeatmapViewProps {
  courseId: string;
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function catchRateColor(rate: number): string {
  // Interpolate from red (0%) → amber (50%) → green (100%)
  if (rate < 0.5) {
    const t = rate * 2;
    const r = Math.round(239 + (245 - 239) * (1 - t));
    const g = Math.round(68  + (158 - 68) * t);
    const b = 68;
    return `rgb(${r},${g},${b})`;
  } else {
    const t = (rate - 0.5) * 2;
    const r = Math.round(245 - 193 * t);
    const g = Math.round(158 + (211 - 158) * t);
    const b = Math.round(11  + (99 - 11) * t);
    return `rgb(${r},${g},${b})`;
  }
}

function HeatCell({ bucket }: { bucket: HeatmapBucket }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const intensity = Math.max(0.08, bucket.catchRate);
  const bgColor = catchRateColor(bucket.catchRate);

  return (
    <div
      className="hm-cell"
      style={{ background: bgColor, opacity: 0.15 + intensity * 0.85 }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      role="gridcell"
      aria-label={`${formatTimestamp(bucket.timestampBucket)}: ${Math.round(bucket.catchRate * 100)}% catch rate, ${bucket.totalChallenges} challenges`}
      tabIndex={0}
    >
      {showTooltip && (
        <div className="hm-tooltip">
          <strong>{formatTimestamp(bucket.timestampBucket)} — {formatTimestamp(bucket.timestampBucket + 30)}</strong>
          <div className="hm-tooltip-row">
            <span>Total Challenges</span><span>{bucket.totalChallenges}</span>
          </div>
          <div className="hm-tooltip-row">
            <span>Decoys Caught</span><span style={{ color: '#34d399' }}>{bucket.decoyCaughtCount}</span>
          </div>
          <div className="hm-tooltip-row">
            <span>Missed / False</span><span style={{ color: '#f87171' }}>{bucket.decoyMissedCount}</span>
          </div>
          <div className="hm-tooltip-row hm-tooltip-rate">
            <span>Catch Rate</span><span>{Math.round(bucket.catchRate * 100)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HeatmapView({ courseId }: HeatmapViewProps) {
  const { data: buckets, isLoading, isError, refetch } = useHeatmap(courseId);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        .hm-root {
          background: linear-gradient(145deg, #1e1b4b 0%, #0f172a 100%);
          border: 1px solid rgba(167,139,250,0.15);
          border-radius: 20px;
          padding: 32px;
          font-family: 'Inter', system-ui, sans-serif;
        }

        .hm-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 28px;
        }

        .hm-title {
          font-size: 20px;
          font-weight: 700;
          color: #f1f5f9;
          margin: 0;
          letter-spacing: -0.3px;
        }

        .hm-subtitle {
          font-size: 13px;
          color: rgba(148,163,184,0.7);
          margin: 6px 0 0;
        }

        .hm-refresh-btn {
          padding: 8px 14px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          color: #94a3b8;
          font-size: 13px;
          font-family: 'Inter', system-ui;
          cursor: pointer;
          transition: background 0.15s;
        }
        .hm-refresh-btn:hover { background: rgba(255,255,255,0.09); }

        .hm-legend {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }

        .hm-legend-label { font-size: 12px; color: rgba(148,163,184,0.7); }

        .hm-legend-grad {
          flex: 1;
          max-width: 200px;
          height: 10px;
          border-radius: 5px;
          background: linear-gradient(to right, #ef4444, #f59e0b, #34d399);
        }

        .hm-scroll {
          overflow-x: auto;
          padding-bottom: 8px;
        }

        .hm-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          min-width: max-content;
        }

        .hm-cell {
          position: relative;
          width: 36px;
          height: 36px;
          border-radius: 6px;
          cursor: pointer;
          transition: transform 0.15s, opacity 0.15s;
          flex-shrink: 0;
        }

        .hm-cell:hover {
          transform: scale(1.15);
          z-index: 10;
        }

        .hm-tooltip {
          position: absolute;
          bottom: calc(100% + 8px);
          left: 50%;
          transform: translateX(-50%);
          background: rgba(15,23,42,0.97);
          border: 1px solid rgba(167,139,250,0.3);
          border-radius: 10px;
          padding: 10px 14px;
          width: 200px;
          z-index: 100;
          font-size: 12px;
          color: #e2e8f0;
          box-shadow: 0 12px 30px rgba(0,0,0,0.5);
          pointer-events: none;
        }

        .hm-tooltip strong {
          display: block;
          font-size: 11px;
          color: #a78bfa;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .hm-tooltip-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 3px 0;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .hm-tooltip-rate {
          border-bottom: none;
          margin-top: 4px;
          font-weight: 600;
        }

        .hm-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 24px;
          gap: 12px;
          color: rgba(100,116,139,0.8);
          font-size: 14px;
          text-align: center;
        }

        .hm-empty-icon {
          font-size: 40px;
          opacity: 0.6;
        }

        .hm-skeleton {
          height: 36px;
          background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%);
          background-size: 200% 100%;
          border-radius: 6px;
          animation: hm-shimmer 1.5s infinite;
        }

        @keyframes hm-shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }

        .hm-stats-bar {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-top: 28px;
          border-top: 1px solid rgba(255,255,255,0.06);
          padding-top: 24px;
        }

        .hm-stat {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          padding: 14px 16px;
        }

        .hm-stat-val {
          font-size: 24px;
          font-weight: 700;
          color: white;
          line-height: 1;
        }

        .hm-stat-key {
          font-size: 12px;
          color: rgba(100,116,139,0.9);
          margin-top: 6px;
        }
      `}</style>

      <div id="crevs-heatmap" className="hm-root">
        <div className="hm-header">
          <div>
            <h2 className="hm-title">🔥 CREVS Interaction Heatmap</h2>
            <p className="hm-subtitle">
              Student challenge submissions by 30-second video timestamp bucket
            </p>
          </div>
          <button className="hm-refresh-btn" onClick={() => refetch()}>
            ↻ Refresh
          </button>
        </div>

        {/* Legend */}
        <div className="hm-legend">
          <span className="hm-legend-label">Low catch rate</span>
          <div className="hm-legend-grad" />
          <span className="hm-legend-label">High catch rate</span>
        </div>

        {/* Grid */}
        <div className="hm-scroll">
          {isLoading ? (
            <div className="hm-grid">
              {Array.from({ length: 40 }, (_, i) => (
                <div key={i} className="hm-skeleton" style={{ width: 36 }} />
              ))}
            </div>
          ) : isError ? (
            <div className="hm-empty">
              <div className="hm-empty-icon">⚠️</div>
              <div>Failed to load heatmap data.</div>
            </div>
          ) : !buckets?.length ? (
            <div className="hm-empty">
              <div className="hm-empty-icon">📊</div>
              <div>No challenge submissions yet for this course.</div>
              <div>Data will appear as students interact with decoy notes.</div>
            </div>
          ) : (
            <div className="hm-grid" role="grid" aria-label="Heatmap grid">
              {buckets.map(bucket => (
                <HeatCell key={bucket.timestampBucket} bucket={bucket} />
              ))}
            </div>
          )}
        </div>

        {/* Summary stats */}
        {buckets && buckets.length > 0 && (() => {
          const total = buckets.reduce((s, b) => s + b.totalChallenges, 0);
          const caught = buckets.reduce((s, b) => s + b.decoyCaughtCount, 0);
          const avgRate = total > 0 ? Math.round((caught / total) * 100) : 0;
          const hotBucket = [...buckets].sort((a, b) => b.totalChallenges - a.totalChallenges)[0];
          return (
            <div className="hm-stats-bar">
              <div className="hm-stat">
                <div className="hm-stat-val">{total}</div>
                <div className="hm-stat-key">Total Challenges</div>
              </div>
              <div className="hm-stat">
                <div className="hm-stat-val" style={{ color: '#34d399' }}>{avgRate}%</div>
                <div className="hm-stat-key">Overall Catch Rate</div>
              </div>
              <div className="hm-stat">
                <div className="hm-stat-val" style={{ color: '#f87171' }}>
                  {hotBucket ? formatTimestamp(hotBucket.timestampBucket) : '—'}
                </div>
                <div className="hm-stat-key">Hottest Segment</div>
              </div>
            </div>
          );
        })()}
      </div>
    </>
  );
}
