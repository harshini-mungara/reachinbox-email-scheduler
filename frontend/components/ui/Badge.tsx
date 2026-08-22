import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = 'default',
  ...props
}) => {
  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
          {
            'bg-slate-100 text-slate-800 border-slate-200': variant === 'default',
            'bg-emerald-50 text-emerald-700 border-emerald-200': variant === 'success',
            'bg-amber-50 text-amber-700 border-amber-200': variant === 'warning',
            'bg-red-50 text-red-700 border-red-200': variant === 'danger',
            'bg-sky-50 text-sky-700 border-sky-200': variant === 'info',
          }
        ),
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
