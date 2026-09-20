import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The design guide promises specific contrast ratios (plan/08-DESIGN-GUIDE.md §1.4).
 * A promise nothing checks is a promise that quietly breaks, so these assertions
 * parse the real token file rather than a copy of the values.
 */

const css = readFileSync(resolve(process.cwd(), 'src/app/tokens.css'), 'utf8');

/** Reads a token from a specific block: the `:root` rule or the `[data-theme='dark']` rule. */
function token(name: string, theme: 'light' | 'dark'): string {
  const block =
    theme === 'light'
      ? css.slice(css.indexOf(':root {'), css.indexOf(":root[data-theme='dark']"))
      : css.slice(css.indexOf(":root[data-theme='dark']"));
  const match = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(block);
  if (!match) throw new Error(`token --${name} not found in ${theme} block`);
  return match[1];
}

const channel = (c: number) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return (
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255)
  );
};

export const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const STAGE_HUES = ['stage-english', 'stage-ai', 'stage-technical', 'stage-debug', 'stage-aic', 'stage-cognitive'];

describe('design tokens: contrast', () => {
  for (const theme of ['light', 'dark'] as const) {
    describe(theme, () => {
      it('body text clears AAA (7:1) on paper', () => {
        expect(contrast(token('ink', theme), token('paper', theme))).toBeGreaterThanOrEqual(7);
      });

      it('muted text clears AA (4.5:1) on a raised surface', () => {
        expect(contrast(token('ink-muted', theme), token('paper-raised', theme))).toBeGreaterThanOrEqual(4.5);
      });

      it('faint text clears AA (4.5:1) on a raised surface — it is used at 11px', () => {
        expect(contrast(token('ink-faint', theme), token('paper-raised', theme))).toBeGreaterThanOrEqual(4.5);
      });

      it('the untested colour clears AA on a raised surface', () => {
        expect(contrast(token('unknown', theme), token('paper-raised', theme))).toBeGreaterThanOrEqual(4.5);
      });

      it.each(STAGE_HUES)('%s clears AA against its own ink', (hue) => {
        expect(contrast(token(hue, theme), token('stage-ink', theme))).toBeGreaterThanOrEqual(4.5);
      });

      it.each(STAGE_HUES)('%s clears 3:1 as a border against paper', (hue) => {
        expect(contrast(token(hue, theme), token('paper', theme))).toBeGreaterThanOrEqual(3);
      });

      it.each(['ok', 'bad', 'warn', 'info'])('semantic --%s clears AA on a raised surface', (name) => {
        expect(contrast(token(name, theme), token('paper-raised', theme))).toBeGreaterThanOrEqual(4.5);
      });
    });
  }

  it('correct-green is visually distinct from the AI-coding stage hue', () => {
    // Green must mean "you got it right" everywhere and never read as a stage colour.
    expect(token('ok', 'dark')).not.toBe(token('stage-aic', 'dark'));
    expect(contrast(token('ok', 'dark'), token('stage-aic', 'dark'))).toBeGreaterThan(1.3);
  });

  it('every stage hue is defined in both themes', () => {
    for (const hue of STAGE_HUES) {
      expect(token(hue, 'light')).toMatch(/^#[0-9a-f]{6}$/i);
      expect(token(hue, 'dark')).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
