/**
 * Custom SVG sparkline. Hard polyline, no curve smoothing, no gradient fill —
 * a charting library would fight the design language for 100 KB.
 */
export function ReadinessSparkline({
  points,
  width = 120,
  height = 28,
}: {
  points: (number | null)[];
  width?: number;
  height?: number;
}) {
  const known = points.filter((p): p is number => p !== null);
  if (known.length < 2) {
    return (
      <svg width={width} height={height} aria-hidden>
        <line
          x1="0" y1={height - 1} x2={width} y2={height - 1}
          stroke="var(--unknown)" strokeWidth="2" strokeDasharray="3 3"
        />
      </svg>
    );
  }

  const max = 100;
  const step = points.length > 1 ? width / (points.length - 1) : width;
  const coords = points.map((p, i) => {
    const v = p ?? 0;
    return `${(i * step).toFixed(1)},${(height - (v / max) * (height - 2) - 1).toFixed(1)}`;
  });

  const first = known[0];
  const last = known[known.length - 1];
  const trend = last > first ? 'var(--ok)' : last < first ? 'var(--bad)' : 'var(--ink-muted)';

  return (
    <svg width={width} height={height} aria-hidden>
      <polyline
        points={coords.join(' ')}
        fill="none"
        stroke={trend}
        strokeWidth="2"
        strokeLinejoin="miter"
        strokeLinecap="square"
      />
    </svg>
  );
}
