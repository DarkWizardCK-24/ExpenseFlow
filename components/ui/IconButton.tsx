'use client';

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

export interface IconButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: 'green' | 'emerald' | 'blue' | 'red' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  label: string; // for accessibility
  children: React.ReactNode;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ variant = 'green', size = 'md', label, children, className = '', disabled, ...props }, ref) => {
    const sizeClasses = {
      sm: 'w-7 h-7 min-w-[28px] min-h-[28px] p-1 text-xs rounded-lg',
      md: 'w-9 h-9 min-w-[36px] min-h-[36px] p-2 text-sm rounded-xl',
      lg: 'w-11 h-11 min-w-[44px] min-h-[44px] p-2.5 text-base rounded-xl',
    };

    const variantClasses = {
      green: 'bg-[#d1fae5] text-[#059669] hover:bg-[#a7f3d0] active:bg-[#6ee7b7] border border-emerald-200/50',
      emerald: 'bg-[#ecfdf5] text-[#047857] hover:bg-[#d1fae5] active:bg-[#a7f3d0] border border-emerald-200/60',
      blue: 'bg-[#dbeafe] text-[#2563eb] hover:bg-[#bfdbfe] active:bg-[#93c5fd] border border-blue-200/50',
      red: 'bg-[#fee2e2] text-[#dc2626] hover:bg-[#fecaca] active:bg-[#fca5a5] border border-red-200/50',
      ghost: 'bg-transparent text-slate-600 hover:bg-emerald-50 active:bg-emerald-100',
    };

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: disabled ? 1 : 0.92 }}
        aria-label={label}
        title={label}
        disabled={disabled}
        className={`inline-flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 disabled:opacity-40 disabled:pointer-events-none ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);

IconButton.displayName = 'IconButton';
