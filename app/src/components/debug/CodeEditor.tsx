'use client';

import { clsx } from 'clsx';
import { useMemo, useRef } from 'react';
import { tokenizeLines, type Token } from '@/lib/highlight';
import styles from './CodeEditor.module.css';

/**
 * A textarea layered over a syntax-highlighted <pre>, the standard technique.
 *
 * Deliberately not Monaco: ~5 MB, CDN-loaded by default (breaking the offline
 * requirement) and a fight to match the design system. This is ~100 lines with
 * no dependency, and it does everything a 20-minute debugging round needs.
 */
export function CodeEditor({
  value,
  onChange,
  readOnly = false,
  markedLines = [],
  ariaLabel,
}: {
  value: string;
  onChange?: (next: string) => void;
  readOnly?: boolean;
  /** Lines to highlight — used to point at the bug once the exercise ends. */
  markedLines?: number[];
  ariaLabel: string;
}) {
  const lines = useMemo(() => tokenizeLines(value), [value]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const marked = new Set(markedLines);

  return (
    <div ref={scrollRef} className={clsx(styles.wrap, readOnly && styles.locked)}>
      <div className={styles.grid}>
        <div className={styles.gutter} aria-hidden>
          {lines.map((_, i) => `${i + 1}\n`).join('')}
        </div>

        <div className={styles.codeArea}>
          <pre className={clsx(styles.shared, styles.highlighted)} aria-hidden>
            <code>
              {lines.map((tokens, i) => (
                <div key={i} className={clsx(marked.has(i + 1) && styles.lineMarked)}>
                  {tokens.length === 0 ? ' ' : tokens.map((t, j) => <Tok key={j} token={t} />)}
                </div>
              ))}
            </code>
          </pre>

          <textarea
            className={clsx(styles.shared, styles.input)}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            readOnly={readOnly}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            aria-label={ariaLabel}
            onKeyDown={(e) => {
              // Tab indents rather than leaving the field.
              if (e.key !== 'Tab' || readOnly || !onChange) return;
              e.preventDefault();
              const el = e.currentTarget;
              const { selectionStart: start, selectionEnd: end } = el;
              onChange(`${value.slice(0, start)}  ${value.slice(end)}`);
              requestAnimationFrame(() => el.setSelectionRange(start + 2, start + 2));
            }}
          />
        </div>
      </div>
    </div>
  );
}

function Tok({ token }: { token: Token }) {
  if (token.kind === 'plain') return <>{token.text}</>;
  return <span className={styles[token.kind]}>{token.text}</span>;
}
