import React from 'react';

interface ExportProgressModalProps {
  visible: boolean;
  progress: number; // 0-100
  text?: string;
}

const ExportProgressModal: React.FC<ExportProgressModalProps> = ({
  visible,
  progress,
  text = 'Exporting...',
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
        zIndex: 2147483647,
      }}
    >
      <div
        style={{
          background: 'white',
          padding: '24px 32px',
          borderRadius: '12px',
          minWidth: '300px',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 500, color: '#374151' }}>
          {text}
        </div>
        <div
          style={{
            width: '100%',
            height: '8px',
            background: '#e5e7eb',
            borderRadius: '4px',
            overflow: 'hidden',
            marginBottom: '8px',
          }}
        >
          <div
            style={{
              width: `${Math.min(100, Math.max(0, progress))}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #6366f1 0%, #7c3aed 100%)',
              borderRadius: '4px',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        <div style={{ textAlign: 'center', fontSize: '14px', color: '#6b7280', fontWeight: 500 }}>
          {Math.round(progress)}%
        </div>
      </div>
    </div>
  );
};

export default ExportProgressModal;
