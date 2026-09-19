import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import styles from './Panel.module.css';

export interface PanelProps {
  title?: ReactNode;
  /** Right-hand slot in the header strip. */
  action?: ReactNode;
  /** Colour the header with the current stage hue (default) or keep it neutral. */
  headerTone?: 'stage' | 'plain';
  raised?: boolean;
  tinted?: boolean;
  padded?: boolean;
  className?: string;
  children: ReactNode;
}

export function Panel({
  title,
  action,
  headerTone = 'stage',
  raised = true,
  tinted = false,
  padded = true,
  className,
  children,
}: PanelProps) {
  return (
    <section
      className={clsx(
        styles.panel,
        raised ? styles.raised : styles.flat,
        tinted && styles.tinted,
        className,
      )}
    >
      {title ? (
        <header className={clsx(styles.header, headerTone === 'plain' && styles.headerPlain)}>
          <span className="microlabel">{title}</span>
          {action}
        </header>
      ) : null}
      <div className={padded ? styles.body : undefined}>{children}</div>
    </section>
  );
}
