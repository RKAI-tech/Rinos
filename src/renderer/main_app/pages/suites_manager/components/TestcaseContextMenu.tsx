import React from 'react';
import { TestCaseInSuite } from '../../../types/testsuites';

interface TestcaseContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  testcase: TestCaseInSuite | null;
  isChangeLevelSubmenuOpen: boolean;
  changingLevelTestcase: TestCaseInSuite | null;
  newLevelValue: string;
  isUpdatingTestcaseLevel: boolean;
  changeLevelInputRef: React.RefObject<HTMLInputElement | null>;
  onAction: (action: 'evidence' | 'edit' | 'duplicate' | 'change_level' | 'delete') => void;
  onLevelValueChange: (value: string) => void;
  onChangeLevelSubmit: () => void;
  onChangeLevelCancel: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

const TestcaseContextMenu: React.FC<TestcaseContextMenuProps> = ({
  visible,
  x,
  y,
  testcase,
  isChangeLevelSubmenuOpen,
  changingLevelTestcase,
  newLevelValue,
  isUpdatingTestcaseLevel,
  changeLevelInputRef,
  onAction,
  onLevelValueChange,
  onChangeLevelSubmit,
  onChangeLevelCancel,
  onKeyDown,
}) => {
  if (!visible || !testcase) return null;

  return (
    <div
      className="sm-testcase-context-menu-wrapper"
      style={{
        position: 'fixed',
        left: `${x}px`,
        top: `${y}px`,
        zIndex: 1000,
        display: 'flex',
        gap: '8px',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="sm-testcase-context-menu">
        <button
          className="sm-context-menu-item"
          onClick={() => onAction('evidence')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
            <path d="M16 13H8" />
            <path d="M16 17H8" />
            <path d="M10 9H8" />
          </svg>
          Evidence
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
          className="sm-context-menu-item"
          onClick={() => onAction('duplicate')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          Duplicate
        </button>
        <button
          className={`sm-context-menu-item ${isChangeLevelSubmenuOpen ? 'is-active' : ''}`}
          onClick={() => onAction('change_level')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          Change level
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto' }}>
            <path d="M9 18l6-6-6-6" />
          </svg>
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
      {isChangeLevelSubmenuOpen && changingLevelTestcase && (
        <div className="sm-change-level-submenu">
          <div className="sm-change-level-submenu-header">
            <label className="sm-change-level-label">Level</label>
          </div>
          <div className="sm-change-level-submenu-content">
            <input
              ref={changeLevelInputRef}
              type="number"
              min="1"
              className="sm-change-level-input"
              value={newLevelValue}
              onChange={(e) => onLevelValueChange(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={isUpdatingTestcaseLevel}
              autoFocus
            />
            <div className="sm-change-level-actions">
              <button
                className="sm-change-level-btn sm-change-level-btn-primary"
                onClick={onChangeLevelSubmit}
                disabled={isUpdatingTestcaseLevel}
              >
                {isUpdatingTestcaseLevel ? 'Updating...' : 'OK'}
              </button>
              <button
                className="sm-change-level-btn sm-change-level-btn-secondary"
                onClick={onChangeLevelCancel}
                disabled={isUpdatingTestcaseLevel}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestcaseContextMenu;

