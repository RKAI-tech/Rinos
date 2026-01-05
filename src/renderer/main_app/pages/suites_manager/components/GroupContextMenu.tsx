import React, { useEffect, useRef, useState } from 'react';
import { TreeGroup } from '../utils/treeOperations';

interface GroupContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  group: TreeGroup | null;
  onAction: (action: 'new_group' | 'new_suite' | 'rename' | 'delete') => void;
}

const GroupContextMenu: React.FC<GroupContextMenuProps> = ({
  visible,
  x,
  y,
  group,
  onAction,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState({ x, y });

  useEffect(() => {
    if (!visible || !menuRef.current) return;

    const adjustPosition = () => {
      const menu = menuRef.current;
      if (!menu) return;

      const rect = menu.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const padding = 8; // Padding from viewport edges

      let adjustedX = x;
      let adjustedY = y;

      // Adjust horizontal position
      if (rect.right > viewportWidth - padding) {
        adjustedX = viewportWidth - rect.width - padding;
      }
      if (adjustedX < padding) {
        adjustedX = padding;
      }

      // Adjust vertical position
      if (rect.bottom > viewportHeight - padding) {
        adjustedY = viewportHeight - rect.height - padding;
      }
      if (adjustedY < padding) {
        adjustedY = padding;
      }

      setAdjustedPosition({ x: adjustedX, y: adjustedY });
    };

    // Adjust position after render using requestAnimationFrame to ensure DOM is updated
    requestAnimationFrame(() => {
      requestAnimationFrame(adjustPosition);
    });

    // Re-adjust on window resize or scroll
    window.addEventListener('resize', adjustPosition);
    window.addEventListener('scroll', adjustPosition, true);

    return () => {
      window.removeEventListener('resize', adjustPosition);
      window.removeEventListener('scroll', adjustPosition, true);
    };
  }, [visible, x, y]);

  // Reset position when menu becomes visible
  useEffect(() => {
    if (visible) {
      setAdjustedPosition({ x, y });
    }
  }, [visible, x, y]);

  if (!visible || !group) return null;

  return (
    <div
      ref={menuRef}
      className="sm-group-context-menu sm-testcase-context-menu"
      style={{
        position: 'fixed',
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
        zIndex: 10001,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        className="sm-context-menu-item"
        onClick={() => onAction('new_group')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v7a3 3 0 0 1-3 3H5a2 2 0 0 1-2-2z" />
        </svg>
        New group
      </button>
      <button
        className="sm-context-menu-item"
        onClick={() => onAction('new_suite')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
          <path d="M14 3v6h6" />
        </svg>
        New suite
      </button>
      <button
        className="sm-context-menu-item"
        onClick={() => onAction('rename')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        Rename
      </button>
      <button
        className="sm-context-menu-item sm-context-menu-item-danger"
        onClick={() => onAction('delete')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
        Delete
      </button>
    </div>
  );
};

export default GroupContextMenu;

