import React from 'react';
import { getInitials, getAvatarGradient } from '@/lib/format';

interface AvatarProps {
  name: string;
  photoURL?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  photoURL,
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs font-semibold',
    md: 'w-10 h-10 text-sm font-semibold',
    lg: 'w-14 h-14 text-lg font-semibold',
    xl: 'w-20 h-20 text-2xl font-bold',
  };

  const gradient = getAvatarGradient(name || 'ExpenseFlow');
  const initials = getInitials(name || 'User');

  return (
    <div
      style={{ background: gradient }}
      role="img"
      aria-label={`Avatar for ${name}`}
      className={`rounded-2xl flex items-center justify-center text-white shadow-sm border-2 border-white/80 select-none tracking-wider shrink-0 overflow-hidden transition-transform ${sizeClasses[size]} ${className}`}
    >
      {photoURL ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </div>
  );
};
