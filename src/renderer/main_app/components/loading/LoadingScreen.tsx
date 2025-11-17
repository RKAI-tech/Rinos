import React from 'react';
import './LoadingScreen.css';

const LoadingScreen: React.FC = () => {
  return (
    <div className="loading-screen">
      <div className="loading-card">
        <div className="loading-pulse">
          <div className="loading-spinner" />
        </div>
        <p className="loading-message">Loading...</p>
      </div>
    </div>
  );
};

export default LoadingScreen;

