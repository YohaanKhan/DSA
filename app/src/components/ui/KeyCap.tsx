import { clsx } from 'clsx';
import styles from './KeyCap.module.css';

export function KeyCap({ children, active = false }: { children: string; active?: boolean }) {
  return <kbd className={clsx(styles.cap, active && styles.active)}>{children}</kbd>;
}
