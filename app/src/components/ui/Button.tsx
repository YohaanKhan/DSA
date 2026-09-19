'use client';

import { clsx } from 'clsx';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import styles from './Button.module.css';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'solid' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: IconName;
  iconAfter?: IconName;
  loading?: boolean;
  fullWidth?: boolean;
  children?: ReactNode;
}

export function Button({
  variant = 'outline',
  size = 'md',
  icon,
  iconAfter,
  loading = false,
  fullWidth = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'microlabel',
        // .press carries the hard shadow; ghost is deliberately flat, and relying
        // on CSS-module order to override it is fragile.
        variant !== 'ghost' && 'press',
        styles.btn,
        styles[size],
        styles[variant],
        fullWidth && styles.full,
        loading && styles.loadingWrap,
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {icon ? <Icon name={icon} size={size === 'lg' ? 20 : 16} /> : null}
      {children}
      {iconAfter ? <Icon name={iconAfter} size={size === 'lg' ? 20 : 16} /> : null}
      {loading ? <span className={styles.loadingBar} /> : null}
    </button>
  );
}
