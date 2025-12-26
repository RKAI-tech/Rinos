import React from 'react';
import { GroupSuiteItem } from '../../../types/group';

interface SuiteContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  suite: GroupSuiteItem | null;
  isRunningSuite: boolean;
  onAction: (action: 'run' | 'add_cases' | 'edit' | 'delete') => void;
}

const SuiteContextMenu: React.FC<SuiteContextMenuProps> = ({
  visible,
  x,
  y,
  suite,
  isRunningSuite,
  onAction,
}) => {
  if (!visible || !suite) return null;

  return (
    <div
      className="sm-suite-context-menu sm-testcase-context-menu"
      style={{
        position: 'fixed',
        left: `${x}px`,
        top: `${y}px`,
        zIndex: 1000,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        className="sm-context-menu-item"
        onClick={() => onAction('run')}
        disabled={isRunningSuite}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        Run
      </button>
      <button
        className="sm-context-menu-item"
        onClick={() => onAction('add_cases')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
        Add cases
      </button>
      <button
        className="sm-context-menu-item"
        onClick={() => onAction('edit')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        Edit
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

export default SuiteContextMenu;

