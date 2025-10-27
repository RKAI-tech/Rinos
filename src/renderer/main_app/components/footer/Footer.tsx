import React from 'react';
import './Footer.css';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-content">
        <span className="footer-text">
        Copyright © {currentYear} <span className="rikkeai-text">Rikkeisoft Corporation</span>. All rights reserved. 
        </span>
      </div>
    </footer>
  );
};

export default Footer;
