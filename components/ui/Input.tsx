import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, rightElement, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-emerald-950">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-emerald-600">
              {icon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`w-full h-11 px-3.5 ${
              icon ? 'pl-10' : ''
            } ${rightElement ? 'pr-11' : ''} bg-[#f0fdf4] text-[#0b3b2e] placeholder-[#64748b]/60 border ${
              error ? 'border-red-400 focus:border-red-500 focus:ring-red-300' : 'border-[#a7f3d0] focus:border-[#10b981] focus:ring-emerald-400/25'
            } rounded-xl text-sm transition-all duration-200 focus:bg-white focus:outline-none focus:ring-4 ${className}`}
            style={{ colorScheme: 'light' }}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-3 flex items-center text-emerald-700">
              {rightElement}
            </div>
          )}
        </div>
        {error ? (
          <p className="text-xs font-medium text-red-500 mt-1">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-[#64748b] mt-1">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
