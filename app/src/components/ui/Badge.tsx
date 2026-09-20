import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import styles from './Badge.module.css';

export function Badge({
  tone = 'neutral',
  icon,
  filled = false,
  children,
  className,
}: {
  tone?: 'neutral' | 'stage' | 'ok' | 'bad' | 'warn';
  icon?: IconName;
  filled?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={clsx('microlabel', styles.badge, styles[tone], filled && styles.filled, className)}>
      {icon ? <Icon name={icon} size={12} /> : null}
      {children}
    </span>
  );
}
