'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { Icon } from '@/components/ui/Icon';
import { usePersistentFlag } from '@/lib/hooks/useClientState';
import { NAV_ITEMS } from '@/lib/config/stages';
import styles from './NavRail.module.css';

const RAIL_KEY = 'exceller.rail.open';

export function NavRail() {
  const pathname = usePathname();
  const [open, setOpen] = usePersistentFlag(RAIL_KEY, true);

  return (
    <nav
      className={clsx(styles.rail, open ? styles.open : styles.collapsed)}
      aria-label="Main navigation"
    >
      <div className={styles.brand}>
        <span className={styles.mark} aria-hidden>EX</span>
        {open ? <span className={clsx('microlabel', styles.brandText)}>Exceller Trainer</span> : null}
      </div>

      {NAV_ITEMS.map((item) => {
        const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx('microlabel', styles.item, active && styles.active)}
            aria-current={active ? 'page' : undefined}
            title={open ? undefined : item.label}
          >
            <Icon name={item.icon} size={20} />
            <span>{item.label}</span>
          </Link>
        );
      })}

      <div className={styles.spacer} />

      <button
        type="button"
        className={clsx('microlabel', styles.item)}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={open ? 'Collapse navigation' : 'Expand navigation'}
      >
        <Icon name="chevron" size={20} rotate={open ? 180 : 0} />
        <span>Collapse</span>
      </button>
    </nav>
  );
}
