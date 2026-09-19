'use client';

import { clsx } from 'clsx';
import { Button } from '@/components/ui/Button';
import { daysUntil } from '@/lib/config/stages';
import { useIsHydrated, useTheme } from '@/lib/hooks/useClientState';
import styles from './TopBar.module.css';

/**
 * The exam countdown is permanent and deliberately a little uncomfortable.
 * Rendered client-side only, because the server and the browser can disagree
 * about "today" across timezones and that would hydrate mismatched.
 */
export function TopBar({ examDate }: { examDate: string }) {
  const hydrated = useIsHydrated();
  const [theme, setTheme] = useTheme();
  // Computed only after hydration: the server and the browser can disagree about
  // "today" across timezones, which would hydrate mismatched.
  const days = hydrated ? daysUntil(examDate) : null;

  return (
    <header className={styles.bar}>
      <div className={styles.countdown}>
        {days === null ? (
          <span className={clsx('microlabel', styles.muted)}>Loading…</span>
        ) : days < 0 ? (
          <span className="microlabel">Exam date passed</span>
        ) : (
          <>
            <span
              className={clsx('tabular', styles.days, days <= 2 && styles.urgent, days > 2 && days <= 4 && styles.soon)}
            >
              {days}
            </span>
            <span className={clsx('microlabel', styles.muted)}>
              {days === 1 ? 'day to exam' : 'days to exam'}
            </span>
          </>
        )}
      </div>

      <div className={styles.spacer} />

      <Button
        variant="ghost"
        size="sm"
        icon={theme === 'dark' ? 'sun' : 'moon'}
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      >
        {theme === 'dark' ? 'Light' : 'Dark'}
      </Button>
    </header>
  );
}
