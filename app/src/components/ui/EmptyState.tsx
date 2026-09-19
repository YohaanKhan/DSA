import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import styles from './EmptyState.module.css';

export function EmptyState({
  icon,
  title,
  meta,
  children,
  action,
}: {
  icon: IconName;
  title: string;
  meta?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={styles.wrap}>
      <span className={styles.mark}>
        <Icon name={icon} size={28} />
      </span>
      {meta ? <span className={clsx('microlabel', styles.meta)}>{meta}</span> : null}
      <span className={styles.title}>{title}</span>
      <p className={styles.body}>{children}</p>
      {action}
    </div>
  );
}
