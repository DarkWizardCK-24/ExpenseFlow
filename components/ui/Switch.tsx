'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  label,
  description,
}) => {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      {(label || description) && (
        <div className="flex-1">
          {label && (
            <span className="text-sm font-semibold text-[#0b3b2e] block">
              {label}
            </span>
          )}
          {description && (
            <span className="text-xs text-[#64748b] block mt-0.5">
              {description}
            </span>
          )}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 relative flex items-center ${
          checked ? 'bg-[#059669]' : 'bg-emerald-200/80'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <motion.div
          animate={{ x: checked ? 20 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="w-5 h-5 bg-white rounded-full shadow-md"
        />
      </button>
    </div>
  );
};
