import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import './SidebarNavigator.css';

interface NavigationItem {
  id: string;
  label: string;
  path?: string;
  isActive?: boolean;
  icon?: React.ReactNode; // optional override icon
}

interface SidebarNavigatorProps {
  items: NavigationItem[];
  onNavigate?: (path: string) => void;
  projectId?: string;
}

const SidebarNavigator: React.FC<SidebarNavigatorProps> = ({ items, onNavigate, projectId: propProjectId }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { projectId: urlProjectId } = useParams<{ projectId: string }>();
  
  // Use prop projectId first, fallback to URL projectId
  const projectId = propProjectId || urlProjectId;

  // Use provided items directly
  const navigationItems = items;

  const handleItemClick = (item: NavigationItem) => {
    if (item.path && !item.isActive) {
      if (onNavigate) {
        onNavigate(item.path);
      } else {
        navigate(item.path);
      }
    }
  };

  const renderDefaultIcon = (item: NavigationItem) => {
    const commonProps = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
    switch (item.id) {
      case 'testcases':
        return (
          <svg {...commonProps}>
            <rect x="3" y="4" width="18" height="16" rx="2"/>
            <path d="M7 8h10M7 12h10M7 16h6"/>
          </svg>
        );
      case 'test-suites':
        return (
          <svg {...commonProps}>
            <path d="M4 7l8 -4 8 4v10l-8 4-8-4z"/>
            <path d="M12 3v18"/>
          </svg>
        );
      case 'databases':
        return (
          <svg {...commonProps}>
            <ellipse cx="12" cy="5" rx="8" ry="3"/>
            <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/>
            <path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>
          </svg>
        );
      case 'cookies':
        return (
          <svg {...commonProps}>
            <path d="M19 12a7 7 0 1 1-7-7 3 3 0 0 0 3 3 3 3 0 0 0 3 3 3 3 0 0 0 1 1"/>
            <circle cx="9" cy="10" r="1"/>
            <circle cx="14" cy="15" r="1"/>
            <circle cx="10" cy="16" r="1"/>
          </svg>
        );
      case 'queries':
        return (
          <svg {...commonProps}>
            <circle cx="11" cy="11" r="6"/>
            <path d="M16.5 16.5L21 21"/>
          </svg>
        );
      case 'variables':
        return (
          <svg {...commonProps}>
            <path d="M4 8h6a3 3 0 0 1 0 6H4"/>
            <path d="M14 8h6"/>
            <path d="M14 14h6"/>
          </svg>
        );
      case 'change-log':
        return (
          <svg {...commonProps}>
            <path d="M12 8v5l3 3"/>
            <circle cx="12" cy="12" r="9"/>
          </svg>
        );
      case 'suites-manager':
        return (
          <svg {...commonProps}>
            <rect x="4" y="7" width="16" height="10" rx="5" />
            <path d="M8 7V5a4 4 0 0 1 8 0v2" />
          </svg>
        );
      default:
        return (
          <svg {...commonProps}>
            <rect x="4" y="5" width="16" height="14" rx="2"/>
            <path d="M4 9h16"/>
          </svg>
        );
    }
  };

  return (
    <div className="sidebar-navigator">
      <div className="sidebar-menu">
        {navigationItems.map((item) => (
          <div
            key={item.id}
            className={`menu-item ${item.isActive ? 'active' : ''}`}
            onClick={() => handleItemClick(item)}
          >
            <div className="menu-item-content">
              <span className="menu-icon" aria-hidden>
                {item.icon ? item.icon : renderDefaultIcon(item)}
              </span>
              <span className="menu-text">{item.label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SidebarNavigator;
