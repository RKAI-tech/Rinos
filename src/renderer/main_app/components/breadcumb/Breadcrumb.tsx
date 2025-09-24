import React from 'react';
import './Breadcrumb.css';

export interface BreadcrumbItem {
  label: string;
  path?: string;
  isActive?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  onNavigate?: (path: string) => void;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, onNavigate }) => {
  const handleItemClick = (item: BreadcrumbItem) => {
    if (item.path && !item.isActive && onNavigate) {
      onNavigate(item.path);
    }
  };

  return (
    <div className="breadcrumb">
      <div className="breadcrumb-content">
        <div className="breadcrumb-container">
          {items.map((item, index) => (
            <React.Fragment key={index}>
              {index > 0 && (
                <span className="breadcrumb-separator">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              )}
              <button
                className={`breadcrumb-item ${item.isActive ? 'active' : ''}`}
                onClick={() => handleItemClick(item)}
                disabled={item.isActive || !item.path}
              >
                {item.label}
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Breadcrumb;
