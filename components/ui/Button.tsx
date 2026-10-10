'use client';

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { Spinner } from './Spinner';

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      loadingText,
      icon,
      children,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98]';

    const sizeClasses = {
      sm: 'text-xs px-3.5 py-1.5 h-8 gap-1.5 min-h-[36px]',
      md: 'text-sm px-4 py-2.5 h-11 gap-2 min-h-[44px]',
      lg: 'text-base px-6 py-3.5 h-13 gap-2.5 min-h-[50px] font-semibold',
    };

    const variantClasses = {
      primary:
        'bg-gradient-to-r from-[#047857] to-[#10b981] text-white shadow-emerald hover:brightness-105 active:brightness-95 border border-emerald-600/20',
      secondary:
        'bg-emerald-50 text-emerald-800 hover:bg-emerald-100/80 active:bg-emerald-200/60 border border-emerald-200/60',
      outline:
        'bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-50/70 hover:border-emerald-400',
      danger:
        'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 hover:border-red-300',
      ghost:
        'bg-transparent text-emerald-800 hover:bg-emerald-50 active:bg-emerald-100',
    };

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
        disabled={disabled || loading}
        className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
        {...props}
      >
        {loading ? (
          <>
            <Spinner size="sm" light={variant === 'primary'} />
            <span>{loadingText || children}</span>
          </>
        ) : (
          <>
            {icon && <span className="flex-shrink-0">{icon}</span>}
            {children}
          </>
        )}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
