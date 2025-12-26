import React from 'react';

interface LoadingSpinnerProps {
  text?: string;
  className?: string;
  size?: number;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  text = 'Loading...', 
  className = '',
  size = 24 
}) => {
  return (
    <div className={`suites-loading ${className}`}>
      <div className="suites-loading-spinner" aria-hidden>
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeDasharray="32" strokeDashoffset="32" opacity="0.3"/>
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeDasharray="32" strokeDashoffset="24"/>
        </svg>
      </div>
      {text && <span>{text}</span>}
    </div>
  );
};

export default LoadingSpinner;

