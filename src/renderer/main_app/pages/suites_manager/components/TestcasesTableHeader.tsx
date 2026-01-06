import React from 'react';

interface ColumnWidths {
  name: number;
  description: number;
  status: number;
  browser: number;
  order: number;
  updated: number;
}

interface TestcasesTableHeaderProps {
  columnWidths: ColumnWidths;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
  onColumnSort: (column: string) => void;
  onColumnResizeStart: (e: React.MouseEvent, handleId: 'name-desc' | 'desc-status' | 'status-browser' | 'browser-order' | 'order-updated' | 'updated-actions') => void;
}

const TestcasesTableHeader: React.FC<TestcasesTableHeaderProps> = ({
  columnWidths,
  sortColumn,
  sortDirection,
  onColumnSort,
  onColumnResizeStart,
}) => {
  const SortIcon = ({ direction }: { direction: 'asc' | 'desc' }) => (
    <span className={`sm-sort-icon ${direction === 'asc' ? 'is-asc' : 'is-desc'}`}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {direction === 'asc' ? (
          <path d="M12 19V5M5 12l7-7 7 7" />
        ) : (
          <path d="M12 5v14M19 12l-7 7-7-7" />
        )}
      </svg>
    </span>
  );

  const HeaderCell = ({ 
    column, 
    label, 
    width, 
    minWidth, 
    resizeHandleId 
  }: { 
    column: string; 
    label: string; 
    width?: number; 
    minWidth?: number; 
    resizeHandleId?: string;
  }) => {
    const isSorted = sortColumn === column;
    const hasResizeHandle = resizeHandleId !== undefined;

    return (
      <div 
        className={`sm-testcases-header-cell sm-testcases-header-${column} ${isSorted ? 'is-sorted' : ''}`}
        style={{ 
          width: width ? `${width}px` : undefined, 
          minWidth: minWidth ? `${minWidth}px` : undefined 
        }}
        onClick={(e) => {
          if (!hasResizeHandle || !(e.target as HTMLElement).closest('.sm-column-resize-handle')) {
            onColumnSort(column);
          }
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
          {label}
          {isSorted && <SortIcon direction={sortDirection} />}
        </span>
        {hasResizeHandle && (
          <div 
            className="sm-column-resize-handle"
            onMouseDown={(e) => onColumnResizeStart(e, resizeHandleId as 'name-desc' | 'desc-status' | 'status-browser' | 'browser-order' | 'order-updated' | 'updated-actions')}
          />
        )}
      </div>
    );
  };

  return (
    <div className="sm-testcases-header">
      <div 
        className="sm-testcases-header-content"
        style={{
          gridTemplateColumns: `${columnWidths.name}px ${columnWidths.description}px ${columnWidths.status}px ${columnWidths.browser}px ${columnWidths.order}px 1fr 40px`
        }}
      >
        <HeaderCell 
          column="name" 
          label="Name" 
          width={columnWidths.name} 
          minWidth={columnWidths.name}
          resizeHandleId="name-desc"
        />
        <HeaderCell 
          column="description" 
          label="Description" 
          width={columnWidths.description} 
          minWidth={columnWidths.description}
          resizeHandleId="desc-status"
        />
        <HeaderCell 
          column="status" 
          label="Status" 
          width={columnWidths.status} 
          minWidth={columnWidths.status}
          resizeHandleId="status-browser"
        />
        <HeaderCell 
          column="browser" 
          label="Browser" 
          width={columnWidths.browser} 
          minWidth={columnWidths.browser}
          resizeHandleId="browser-order"
        />
        <HeaderCell 
          column="order" 
          label="Order" 
          width={columnWidths.order} 
          minWidth={columnWidths.order}
          resizeHandleId="order-updated"
        />
        <HeaderCell 
          column="updated" 
          label="Updated" 
          minWidth={columnWidths.updated}
          resizeHandleId="updated-actions"
        />
        <div 
          className="sm-testcases-header-cell sm-testcases-header-actions"
          style={{ width: '40px', minWidth: '40px' }}
        >
        </div>
      </div>
    </div>
  );
};

export default TestcasesTableHeader;

