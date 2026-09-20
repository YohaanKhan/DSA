import { clsx } from 'clsx';
import styles from './Drill.module.css';

/**
 * The quiet zone. No border, no tint, 68ch, 1.7 line-height — this is the text
 * you read most, so the chrome stays out of it (design guide: loud chrome,
 * quiet content).
 */
export function QuestionStem({
  stem,
  code,
}: {
  stem: string;
  code?: { language: string; source: string };
}) {
  return (
    <div>
      <p className={styles.stem}>{stem}</p>
      {code ? (
        <pre className={styles.code} aria-label={`${code.language} code`}>
          <code>{code.source}</code>
        </pre>
      ) : null}
    </div>
  );
}

/** Numbered source for trace items, so the stepper can point at a line. */
export function NumberedSource({ source, highlightLine }: { source: string; highlightLine?: number }) {
  const lines = source.replace(/\n$/, '').split('\n');
  const width = String(lines.length).length;
  return (
    <pre className={styles.code}>
      <code>
        {lines.map((line, i) => (
          <div
            key={i}
            style={
              highlightLine === i + 1
                ? {
                    background: 'var(--stage-current-soft, transparent)',
                    boxShadow: 'inset 3px 0 0 0 var(--stage-current, transparent)',
                  }
                : undefined
            }
          >
            <span className={clsx(styles.lineNo)} style={{ color: 'var(--ink-faint)', userSelect: 'none' }}>
              {String(i + 1).padStart(width, ' ')}
              {'  '}
            </span>
            {line || ' '}
          </div>
        ))}
      </code>
    </pre>
  );
}
