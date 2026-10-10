import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', ...props }) => {
  return (
    <div
      aria-hidden="true"
      className={`bg-emerald-100/60 rounded-xl animate-shimmer relative overflow-hidden ${className}`}
      {...props}
    />
  );
};
