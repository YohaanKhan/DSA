import type { SVGProps } from 'react';

/**
 * The hand-built icon set. 24x24 grid, 2px stroke, square caps, mitre joins,
 * geometric forms drawn on a 4px sub-grid — corners wherever a corner will do.
 * `currentColor` only; never a hardcoded fill. See plan/08-DESIGN-GUIDE.md §5.
 *
 * The product contains no emoji. Everything pictorial comes from here.
 */
export type IconName =
  | 'dashboard' | 'drill' | 'trace' | 'debug' | 'aic' | 'games' | 'comm'
  | 'mock' | 'review' | 'log' | 'settings' | 'timer' | 'check' | 'cross'
  | 'flag' | 'chevron' | 'spark' | 'lock' | 'unlock' | 'sun' | 'moon' | 'menu';

const PATHS: Record<IconName, React.ReactNode> = {
  // Four unequal rectangles in a 2x2 — deliberately not a symmetric grid.
  dashboard: (
    <>
      <rect x="3" y="3" width="8" height="10" />
      <rect x="13" y="3" width="8" height="6" />
      <rect x="3" y="15" width="8" height="6" />
      <rect x="13" y="11" width="8" height="10" />
    </>
  ),
  // Three nested V shapes — drilling down.
  drill: (
    <>
      <polyline points="4,5 12,12 20,5" />
      <polyline points="4,11 12,18 20,11" />
      <polyline points="8,17 12,20 16,17" />
    </>
  ),
  // Lines with a bracket, one line offset — stepping through execution.
  trace: (
    <>
      <polyline points="7,4 4,4 4,20 7,20" />
      <line x1="9" y1="8" x2="20" y2="8" />
      <line x1="13" y1="12" x2="20" y2="12" />
      <line x1="9" y1="16" x2="20" y2="16" />
    </>
  ),
  // A rectangle with one corner broken away.
  debug: (
    <>
      <polyline points="3,3 15,3 21,9 21,21 3,21 3,3" />
      <polyline points="15,3 15,9 21,9" />
      <line x1="7" y1="14" x2="15" y2="14" />
    </>
  ),
  // Two overlapping squares, one dashed — you plus the assistant.
  aic: (
    <>
      <rect x="3" y="3" width="12" height="12" />
      <rect x="9" y="9" width="12" height="12" strokeDasharray="3 3" />
    </>
  ),
  // A grid with one cell filled.
  games: (
    <>
      <rect x="3" y="3" width="18" height="18" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <line x1="15" y1="3" x2="15" y2="21" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <rect x="9" y="9" width="6" height="6" fill="currentColor" stroke="none" />
    </>
  ),
  // A speech block with a hard notch.
  comm: (
    <>
      <polyline points="3,4 21,4 21,16 9,16 4,21 4,16 3,16 3,4" />
      <line x1="7" y1="9" x2="17" y2="9" />
      <line x1="7" y1="12.5" x2="13" y2="12.5" />
    </>
  ),
  // Clipboard with a check bar.
  mock: (
    <>
      <polyline points="8,4 4,4 4,21 20,21 20,4 16,4" />
      <rect x="8" y="2" width="8" height="4" />
      <polyline points="8,13 11,16 16,10" />
    </>
  ),
  // A cycle drawn with straight segments.
  review: (
    <>
      <polyline points="4,10 4,5 9,5" />
      <polyline points="4,5 9,10 15,10 20,15 20,20" />
      <polyline points="20,14 20,19 15,19" />
    </>
  ),
  // Stacked rectangles with a left rule.
  log: (
    <>
      <line x1="4" y1="3" x2="4" y2="21" />
      <rect x="8" y="4" width="13" height="4" />
      <rect x="8" y="10" width="13" height="4" />
      <rect x="8" y="16" width="13" height="4" />
    </>
  ),
  // A slider track with two square handles.
  settings: (
    <>
      <line x1="3" y1="8" x2="21" y2="8" />
      <line x1="3" y1="16" x2="21" y2="16" />
      <rect x="7" y="5" width="6" height="6" fill="currentColor" stroke="none" />
      <rect x="13" y="13" width="6" height="6" fill="currentColor" stroke="none" />
    </>
  ),
  // A square clock with hard hands.
  timer: (
    <>
      <rect x="4" y="5" width="16" height="16" />
      <polyline points="12,10 12,14 16,14" />
      <line x1="9" y1="2" x2="15" y2="2" />
      <line x1="12" y1="2" x2="12" y2="5" />
    </>
  ),
  check: <polyline points="4,13 9,18 20,6" />,
  cross: (
    <>
      <line x1="5" y1="5" x2="19" y2="19" />
      <line x1="19" y1="5" x2="5" y2="19" />
    </>
  ),
  flag: (
    <>
      <line x1="6" y1="3" x2="6" y2="21" />
      <polygon points="6,4 19,4 16,9 19,14 6,14" />
    </>
  ),
  chevron: <polyline points="9,5 16,12 9,19" />,
  // A four-point star — personal best.
  spark: <polygon points="12,2 14,10 22,12 14,14 12,22 10,14 2,12 10,10" />,
  lock: (
    <>
      <rect x="4" y="10" width="16" height="11" />
      <polyline points="8,10 8,6 16,6 16,10" />
    </>
  ),
  unlock: (
    <>
      <rect x="4" y="10" width="16" height="11" />
      <polyline points="8,10 8,6 16,6" />
    </>
  ),
  sun: (
    <>
      <rect x="8" y="8" width="8" height="8" />
      <line x1="12" y1="1" x2="12" y2="4" />
      <line x1="12" y1="20" x2="12" y2="23" />
      <line x1="1" y1="12" x2="4" y2="12" />
      <line x1="20" y1="12" x2="23" y2="12" />
    </>
  ),
  moon: <polygon points="20,15 13,18 7,14 8,6 13,3 11,9 13,14" />,
  menu: (
    <>
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </>
  ),
};

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
  /** Rotation in degrees — used for the four chevron directions. */
  rotate?: 0 | 90 | 180 | 270;
  /** Accessible label. Omit for decorative icons (the default). */
  title?: string;
}

export function Icon({ name, size = 20, rotate = 0, title, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      style={rotate ? { transform: `rotate(${rotate}deg)` } : undefined}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {PATHS[name]}
    </svg>
  );
}
