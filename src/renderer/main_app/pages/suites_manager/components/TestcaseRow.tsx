import React, { useRef } from 'react';
import { TestCaseInSuite } from '../../../types/testsuites';
import { formatBrowserType, formatDate } from '../utils/suitesManagerUtils';

interface ColumnWidths {
  name: number;
  description: number;
  status: number;
  browser: number;
  order: number;
  updated: number;
}

interface TestcaseRowProps {
  testcase: TestCaseInSuite;
  columnWidths: ColumnWidths;
  rowHeight: number;
  isDragging: boolean;
  isResizing: boolean;
  onRowClick: (testcaseId: string) => void;
  onContextMenu: (e: React.MouseEvent, testcase: TestCaseInSuite) => void;
  onActionsClick: (e: React.MouseEvent, testcase: TestCaseInSuite) => void;
  onRowResizeStart: (e: React.MouseEvent, testcaseId: string, currentHeight: number) => void;
}

const TestcaseRow: React.FC<TestcaseRowProps> = ({
  testcase,
  columnWidths,
  rowHeight,
  isDragging,
  isResizing,
  onRowClick,
  onContextMenu,
  onActionsClick,
  onRowResizeStart,
}) => {
  const status = (testcase.status || '').toLowerCase();
  const statusClass = status === 'running' ? 'running' :
    status === 'passed' || status === 'success' ? 'passed' :
    status === 'failed' || status === 'error' ? 'failed' :
    status === 'draft' ? 'draft' : 'draft';

  const statusText = status === 'running' ? 'Running' :
    status === 'passed' || status === 'success' ? 'Passed' :
    status === 'failed' || status === 'error' ? 'Failed' :
    status === 'draft' ? 'Draft' : 'N/A';

  const justFinishedResizingRef = useRef(false);

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as Element;
    const isClickingOnContextMenu = target.closest('.sm-testcase-context-menu');
    const isClickingOnResizeHandle = target.closest('.sm-row-resize-handle');
    const isClickingOnActionsButton = target.closest('.sm-testcase-actions-button');
    
    // Prevent click if row is being resized or was just resized
    if (!isClickingOnContextMenu && !isClickingOnResizeHandle && !isClickingOnActionsButton && !isResizing) {
      onRowClick(testcase.testcase_id);
    }
  };

  return (
    <div 
      className={`sm-testcase-row ${isDragging ? 'is-dragging' : ''} ${isResizing ? 'is-resizing' : ''}`}
      style={{
        cursor: 'pointer',
        height: `${rowHeight}px`,
        minHeight: `${rowHeight}px`,
        gridTemplateColumns: `${columnWidths.name}px ${columnWidths.description}px ${columnWidths.status}px ${columnWidths.browser}px ${columnWidths.order}px 1fr 40px`
      }}
      onClick={handleClick}
      onContextMenu={(e) => onContextMenu(e, testcase)}
    >
      <div 
        className="sm-testcase-cell sm-testcase-cell-name"
        style={{ width: `${columnWidths.name}px`, minWidth: `${columnWidths.name}px` }}
      >
        {testcase.name || '—'}
      </div>
      <div 
        className="sm-testcase-cell sm-testcase-cell-description" 
        title={testcase.description || ''}
        style={{ width: `${columnWidths.description}px`, minWidth: `${columnWidths.description}px` }}
      >
        <span className="sm-testcase-cell-description-text">
          {testcase.description || '—'}
        </span>
      </div>
      <div 
        className="sm-testcase-cell sm-testcase-cell-status"
        style={{ width: `${columnWidths.status}px`, minWidth: `${columnWidths.status}px` }}
      >
        <span className={`sm-testcase-status ${statusClass}`}>
          {statusText}
        </span>
      </div>
      <div 
        className="sm-testcase-cell sm-testcase-cell-browser"
        style={{ width: `${columnWidths.browser}px`, minWidth: `${columnWidths.browser}px` }}
      >
        {formatBrowserType(testcase.browser_type)}
      </div>
      <div 
        className="sm-testcase-cell sm-testcase-cell-order"
        style={{ width: `${columnWidths.order}px`, minWidth: `${columnWidths.order}px` }}
      >
        {testcase.level ?? '—'}
      </div>
      <div 
        className="sm-testcase-cell sm-testcase-cell-updated"
        style={{ minWidth: `${columnWidths.updated}px` }}
      >
        {formatDate(testcase.updated_at || testcase.created_at)}
      </div>
      <div 
        className="sm-testcase-cell sm-testcase-cell-actions"
        style={{ width: '40px', minWidth: '40px' }}
      >
        <button
          className="sm-testcase-actions-button"
          onClick={(e) => {
            e.stopPropagation();
            onActionsClick(e, testcase);
          }}
          aria-label="More options"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
        </button>
      </div>
      <div 
        className="sm-row-resize-handle"
        onMouseDown={(e) => {
          onRowResizeStart(e, testcase.testcase_id, rowHeight);
        }}
        onMouseUp={() => {
          // Mark that resize just finished to prevent click event
          justFinishedResizingRef.current = true;
          // Clear the flag after a short delay to allow click event to be ignored
          setTimeout(() => {
            justFinishedResizingRef.current = false;
          }, 100);
        }}
      />
    </div>
  );
};

export default TestcaseRow;

