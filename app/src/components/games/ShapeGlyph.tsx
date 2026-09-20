import type { Shape } from '@/lib/games/switch';

/**
 * The eight Switch Challenge symbols, drawn on the same 24x24 grid as the icon
 * set. Geometric, flat, and distinguishable at a glance at 40px — telling two
 * of them apart must never be part of the puzzle.
 */
const PATHS: Record<Shape, React.ReactNode> = {
  triangle: <polygon points="12,3 22,21 2,21" />,
  square: <rect x="3" y="3" width="18" height="18" />,
  circle: <circle cx="12" cy="12" r="9.5" />,
  diamond: <polygon points="12,2 22,12 12,22 2,12" />,
  star: <polygon points="12,2 14.6,9.2 22,9.6 16.2,14.4 18.2,21.6 12,17.4 5.8,21.6 7.8,14.4 2,9.6 9.4,9.2" />,
  hexagon: <polygon points="7,3 17,3 22,12 17,21 7,21 2,12" />,
  chevron: <polygon points="3,3 12,3 21,12 12,21 3,21 12,12" />,
  cross: <polygon points="8,2 16,2 16,8 22,8 22,16 16,16 16,22 8,22 8,16 2,16 2,8 8,8" />,
};

export function ShapeGlyph({ shape, size = 40 }: { shape: Shape; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="var(--edge)"
      strokeWidth={1.5}
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[shape]}
    </svg>
  );
}

/** Shapes need a spoken name too — the board is read by keyboard as well. */
export const shapeName = (shape: Shape): string => shape;
