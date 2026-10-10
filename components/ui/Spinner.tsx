import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  light?: boolean;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className = '', light = false }) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-9 h-9 border-[3px]',
  };

  const colorClass = light
    ? 'border-white/30 border-t-white'
    : 'border-emerald-200 border-t-emerald-600';

  return (
    <div
      role="status"
      aria-label="Loading"
      className={`inline-block rounded-full animate-spin ${sizeClasses[size]} ${colorClass} ${className}`}
    />
  );
};
