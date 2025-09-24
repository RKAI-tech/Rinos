import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import './SidebarNavigator.css';

interface NavigationItem {
  id: string;
  label: string;
  path?: string;
  isActive?: boolean;
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

  return (
    <div className="sidebar-navigator">
      <div className="sidebar-menu">
        {navigationItems.map((item) => (
          <div
            key={item.id}
            className={`menu-item ${item.isActive ? 'active' : ''}`}
            onClick={() => handleItemClick(item)}
          >
            <span className="menu-text">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SidebarNavigator;
