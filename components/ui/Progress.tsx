'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface ProgressProps {
  value: number; // 0 to 100
  max?: number;
  variant?: 'emerald' | 'amber' | 'red' | 'blue';
  height?: 'sm' | 'md' | 'lg';
  className?: string;
  showLabel?: boolean;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  variant = 'emerald',
  height = 'md',
  className = '',
  showLabel = false,
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  const variantGradients = {
    emerald: 'bg-gradient-to-r from-[#059669] to-[#10b981]',
    amber: 'bg-gradient-to-r from-[#d97706] to-[#f59e0b]',
    red: 'bg-gradient-to-r from-[#dc2626] to-[#ef4444]',
    blue: 'bg-gradient-to-r from-[#2563eb] to-[#3b82f6]',
  };

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between text-xs font-semibold text-emerald-950 mb-1">
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
      <div className={`w-full bg-emerald-100/70 rounded-full overflow-hidden ${heightClasses[height]}`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={`h-full rounded-full ${variantGradients[variant]}`}
        />
      </div>
    </div>
  );
};
