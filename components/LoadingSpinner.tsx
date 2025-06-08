
import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', color = 'text-sky-400' }) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex justify-center items-center">
      <div
        className={`animate-spin rounded-full border-t-2 border-b-2 ${sizeClasses[size]} ${color} border-opacity-50`}
        style={{ borderTopColor: 'currentColor', borderBottomColor: 'currentColor', borderLeftColor: 'transparent', borderRightColor: 'transparent' }}
      ></div>
    </div>
  );
};

export default LoadingSpinner;
