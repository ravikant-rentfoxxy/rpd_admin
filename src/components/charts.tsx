'use client';

import { useState } from 'react';
import { ACTIVITY_COLORS, activityType, num, pct } from '@/lib/format';

type TrendPoint = { date: string; activities: number; verified: number; members: number };

const W = 720;
const H = 220;
const PAD = { top: 12, right: 8, bottom: 26, left: 30 };

function niceMax(value: number) {
  if (value <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * magnitude * 4 >= value) ?? 10;
  return step * magnitude * 4;
}

function shortDay(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/** Daily activities (with the verified share) and new members over the trend window. */
export function TrendChart({ points }: { points: TrendPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(1, ...points.map((p) => Math.max(p.activities, p.members))));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const slot = innerW / Math.max(1, points.length);
  const barW = Math.max(3, slot * 0.62);
  const y = (value: number) => PAD.top + innerH - (value / max) * innerH;
  const ticks = [0, max / 4, max / 2, (3 * max) / 4, max];
  const memberPath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${PAD.left + slot * i + slot / 2},${y(p.members)}`)
    .join(' ');
  const active = hover == null ? null : points[hover];

  return (
    <div>
      <div className="between" style={{ marginBottom: 8, flexWrap: 'wrap' }}>
        <div className="chart-legend">
          <span>
            <i style={{ background: '#d9d2f0' }} />
            Activities
          </span>
          <span>
            <i style={{ background: 'var(--brand-mid)' }} />
            Verified
          </span>
          <span>
            <i style={{ background: 'var(--accent)', height: 3, borderRadius: 2, verticalAlign: 3 }} />
            New members
          </span>
        </div>
        <div className="chart-tip num">
          {active
            ? `${shortDay(active.date)} · ${active.activities} activities · ${active.verified} verified · ${active.members} joined`
            : 'Hover a day for details'}
        </div>
      </div>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Activity trend for the last 30 days">
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(tick)} y2={y(tick)} stroke="#ecebf1" />
            <text x={PAD.left - 6} y={y(tick) + 4} textAnchor="end" fontSize="10.5" fill="#9a94a6">
              {Math.round(tick)}
            </text>
          </g>
        ))}
        {points.map((p, i) => {
          const x = PAD.left + slot * i + (slot - barW) / 2;
          return (
            <g key={p.date} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={PAD.left + slot * i} y={PAD.top} width={slot} height={innerH} fill={hover === i ? '#f3f1f8' : 'transparent'} />
              <rect x={x} y={y(p.activities)} width={barW} height={Math.max(0, PAD.top + innerH - y(p.activities))} rx={2} fill="#d9d2f0" />
              <rect x={x} y={y(p.verified)} width={barW} height={Math.max(0, PAD.top + innerH - y(p.verified))} rx={2} fill="#3a2685" />
              {i % 5 === 0 || i === points.length - 1 ? (
                <text x={PAD.left + slot * i + slot / 2} y={H - 8} textAnchor="middle" fontSize="10.5" fill="#9a94a6">
                  {shortDay(p.date)}
                </text>
              ) : null}
            </g>
          );
        })}
        <path d={memberPath} fill="none" stroke="#ef8120" strokeWidth={2} strokeLinejoin="round" pointerEvents="none" />
      </svg>
    </div>
  );
}

export function ActivityMix({ rows }: { rows: { type: string; count: number }[] }) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  return (
    <div>
      {rows.map((row) => {
        const share = pct(row.count, total);
        const color = ACTIVITY_COLORS[row.type] ?? '#9a94a6';
        return (
          <div className="bar-row" key={row.type}>
            <div className="between">
              <span className="row" style={{ gap: 8 }}>
                <i style={{ width: 9, height: 9, borderRadius: 99, background: color, display: 'inline-block' }} />
                <span className="strong">{activityType(row.type)}</span>
              </span>
              <span className="num small">
                <b>{num(row.count)}</b> <span className="muted">· {share}%</span>
              </span>
            </div>
            <div className="progress">
              <i style={{ width: `${share}%`, background: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
