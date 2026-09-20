/**
 * The emoji replacement. Readiness banding is communicated with a geometric
 * glyph AND a colour AND a text label — never colour alone, because roughly
 * 1 in 12 people cannot rely on the red/green distinction.
 * See plan/08-DESIGN-GUIDE.md §5.
 */
export type Band = 'safe' | 'on-track' | 'shaky' | 'at-risk' | 'untested';

export const BAND_LABEL: Record<Band, string> = {
  safe: 'SAFE',
  'on-track': 'ON TRACK',
  shaky: 'SHAKY',
  'at-risk': 'AT RISK',
  untested: 'UNTESTED',
};

export const BAND_COLOR: Record<Band, string> = {
  safe: 'var(--ok)',
  'on-track': 'var(--ok)',
  shaky: 'var(--warn)',
  'at-risk': 'var(--bad)',
  untested: 'var(--unknown)',
};

/** Maps a 0-100 readiness score (or null when untested) to a band. */
export function bandFor(readiness: number | null): Band {
  if (readiness === null || Number.isNaN(readiness)) return 'untested';
  if (readiness >= 85) return 'safe';
  if (readiness >= 70) return 'on-track';
  if (readiness >= 50) return 'shaky';
  return 'at-risk';
}

export function StatusGlyph({ band, size = 16 }: { band: Band; size?: number }) {
  const color = BAND_COLOR[band];
  const common = { width: size, height: size, viewBox: '0 0 16 16', 'aria-hidden': true as const };

  switch (band) {
    case 'safe':
      // Filled square with a corner notch cut out — the "best" state reads as distinct.
      return (
        <svg {...common}>
          <polygon points="1,1 11,1 15,5 15,15 1,15" fill={color} />
        </svg>
      );
    case 'on-track':
      return (
        <svg {...common}>
          <rect x="1" y="1" width="14" height="14" fill={color} />
        </svg>
      );
    case 'shaky':
      // Diagonal split: half filled, half hollow.
      return (
        <svg {...common}>
          <rect x="2" y="2" width="12" height="12" fill="none" stroke={color} strokeWidth="2" />
          <polygon points="2,14 14,2 14,14" fill={color} />
        </svg>
      );
    case 'at-risk':
      return (
        <svg {...common}>
          <rect x="2" y="2" width="12" height="12" fill="none" stroke={color} strokeWidth="2" />
        </svg>
      );
    case 'untested':
      return (
        <svg {...common}>
          <rect
            x="2" y="2" width="12" height="12"
            fill="none" stroke={color} strokeWidth="2" strokeDasharray="3 2.5"
          />
        </svg>
      );
  }
}
