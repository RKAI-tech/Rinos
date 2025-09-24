import React from 'react';
import './Footer.css';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-content">
        <span className="footer-text">
          Made by <span className="rikkeai-text">RikkeAI</span> • © {currentYear}
        </span>
      </div>
    </footer>
  );
};

export default Footer;
