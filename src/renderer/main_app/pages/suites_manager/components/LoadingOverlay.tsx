import React from 'react';

interface LoadingOverlayProps {
  visible: boolean;
  text?: string;
  zIndex?: number;
  padding?: string;
  borderRadius?: string;
  gap?: string;
  fontSize?: string;
  fontWeight?: number;
  color?: string;
  boxShadow?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  text = 'Loading...',
  zIndex = 2147483646,
  padding = '20px',
  borderRadius = '8px',
  gap = '12px',
  fontSize,
  fontWeight,
  color,
  boxShadow,
}) => {
  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex
      }}
    >
      <div
        style={{
          background: 'white',
          padding,
          borderRadius,
          display: 'flex',
          alignItems: 'center',
          gap,
          boxShadow: boxShadow || '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)'
        }}
      >
        <div className="suites-loading-spinner" aria-hidden>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeDasharray="32" strokeDashoffset="32" opacity="0.3"/>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeDasharray="32" strokeDashoffset="24"/>
          </svg>
        </div>
        {text && (
          <span style={{ fontSize, fontWeight, color }}>
            {text}
          </span>
        )}
      </div>
    </div>
  );
};

export default LoadingOverlay;

