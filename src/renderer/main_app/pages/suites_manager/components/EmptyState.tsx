import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  text: string;
  className?: string;
  iconSize?: number;
}

const EmptyState: React.FC<EmptyStateProps> = ({ 
  icon, 
  text, 
  className = '',
  iconSize = 48 
}) => {
  const defaultIcon = (
    <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="#9aa1af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <path d="M14 3v6h6" />
    </svg>
  );

  return (
    <div className={`suites-empty ${className}`}>
      <div className={`suites-empty-icon ${className.includes('right-panel') ? 'suites-right-panel-empty-icon' : ''}`} aria-hidden>
        {icon || defaultIcon}
      </div>
      <p className={className.includes('right-panel') ? 'suites-right-panel-empty-text' : ''}>{text}</p>
    </div>
  );
};

export default EmptyState;

