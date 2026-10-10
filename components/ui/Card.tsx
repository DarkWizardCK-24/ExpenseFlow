import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  lift?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, lift = true, padding = 'md', className = '', ...props }, ref) => {
    const paddingClasses = {
      none: '',
      sm: 'p-3.5 sm:p-4',
      md: 'p-5 sm:p-6',
      lg: 'p-6 sm:p-8',
    };

    return (
      <div
        ref={ref}
        className={`bg-white rounded-2xl shadow-card border border-emerald-100/80 transition-[box-shadow,transform,border-color] duration-200 ${
          lift ? 'hover:-translate-y-0.5 hover:shadow-card-hover' : ''
        } ${paddingClasses[padding]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
