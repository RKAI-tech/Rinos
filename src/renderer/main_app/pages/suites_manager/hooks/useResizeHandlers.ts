import { useState, useRef, useCallback, useEffect } from 'react';

interface ColumnWidths {
  name: number;
  description: number;
  status: number;
  browser: number;
  order: number;
  updated: number;
}

interface UsePanelResizeProps {
  leftPanelRef: React.RefObject<HTMLDivElement | null>;
  leftPanelWidth: number | null;
  setLeftPanelWidth: React.Dispatch<React.SetStateAction<number | null>>;
}

interface UseColumnResizeProps {
  columnWidths: ColumnWidths;
  setColumnWidths: React.Dispatch<React.SetStateAction<ColumnWidths>>;
}

interface UseRowResizeProps {
  rowHeights: Map<string, number>;
  setRowHeights: React.Dispatch<React.SetStateAction<Map<string, number>>>;
}

// Panel resize hook
export const usePanelResize = ({
  leftPanelRef,
  leftPanelWidth,
  setLeftPanelWidth,
}: UsePanelResizeProps) => {
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartXRef = useRef<number>(0);
  const resizeStartWidthRef = useRef<number>(0);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartXRef.current = e.clientX;
    if (leftPanelRef.current) {
      resizeStartWidthRef.current = leftPanelRef.current.offsetWidth;
    }
  }, [leftPanelRef]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!leftPanelRef.current) return;
      const container = leftPanelRef.current.parentElement;
      if (!container) return;
      
      const deltaX = e.clientX - resizeStartXRef.current;
      const newWidth = resizeStartWidthRef.current + deltaX;
      const minWidth = 300;
      
      // Calculate available width: container width minus resizer width (4px) minus minimum right panel width
      const containerWidth = container.offsetWidth;
      const resizerWidth = 4;
      const minRightPanelWidth = 400; // Minimum width for right panel to be usable
      const maxWidth = Math.max(minWidth, containerWidth - resizerWidth - minRightPanelWidth);
      
      // Clamp width between min and max, ensuring it doesn't exceed viewport
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      setLeftPanelWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, leftPanelRef, setLeftPanelWidth]);

  return {
    isResizing,
    handleResizeStart,
  };
};

// Column resize hook
export const useColumnResize = ({
  columnWidths,
  setColumnWidths,
}: UseColumnResizeProps) => {
  const [isResizingColumn, setIsResizingColumn] = useState<string | null>(null);
  const tableResizeStartXRef = useRef<number>(0);
  const tableResizeStartWidthRef = useRef<ColumnWidths | null>(null);

  const handleColumnResizeStart = useCallback((e: React.MouseEvent, boundary: 'name-desc' | 'desc-status' | 'status-browser' | 'browser-order' | 'order-updated' | 'updated-actions') => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizingColumn(boundary);
    tableResizeStartXRef.current = e.clientX;
    tableResizeStartWidthRef.current = { ...columnWidths };
  }, [columnWidths]);

  const handleColumnResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizingColumn || !tableResizeStartWidthRef.current) return;

    const deltaX = e.clientX - tableResizeStartXRef.current;
    const minWidths = {
      name: 150,
      description: 150,
      status: 100,
      browser: 100,
      order: 85,
      updated: 120,
    };

    if (isResizingColumn === 'name-desc') {
      const newNameWidth = Math.max(minWidths.name, tableResizeStartWidthRef.current.name + deltaX);
      setColumnWidths((prev) => ({ 
        ...prev, 
        name: newNameWidth
      }));
    } else if (isResizingColumn === 'desc-status') {
      const newDescWidth = Math.max(minWidths.description, tableResizeStartWidthRef.current.description + deltaX);
      setColumnWidths((prev) => ({ 
        ...prev, 
        description: newDescWidth
      }));
    } else if (isResizingColumn === 'status-browser') {
      const newStatusWidth = Math.max(minWidths.status, tableResizeStartWidthRef.current.status + deltaX);
      setColumnWidths((prev) => ({ 
        ...prev, 
        status: newStatusWidth
      }));
    } else if (isResizingColumn === 'browser-order') {
      const newBrowserWidth = Math.max(minWidths.browser, tableResizeStartWidthRef.current.browser + deltaX);
      setColumnWidths((prev) => ({ 
        ...prev, 
        browser: newBrowserWidth
      }));
    } else if (isResizingColumn === 'order-updated') {
      const newOrderWidth = Math.max(minWidths.order, tableResizeStartWidthRef.current.order + deltaX);
      const newUpdatedWidth = Math.max(minWidths.updated, tableResizeStartWidthRef.current.updated - (newOrderWidth - tableResizeStartWidthRef.current.order));
      setColumnWidths((prev) => ({ 
        ...prev, 
        order: newOrderWidth,
        updated: newUpdatedWidth
      }));
    } else if (isResizingColumn === 'updated-actions') {
      const newUpdatedWidth = Math.max(minWidths.updated, tableResizeStartWidthRef.current.updated + deltaX);
      setColumnWidths((prev) => ({ 
        ...prev, 
        updated: newUpdatedWidth
      }));
    }
  }, [isResizingColumn, setColumnWidths]);

  const handleColumnResizeEnd = useCallback(() => {
    setIsResizingColumn(null);
    tableResizeStartWidthRef.current = null;
  }, []);

  // Set up global mouse move and mouse up listeners for column resize
  useEffect(() => {
    if (isResizingColumn) {
      document.addEventListener('mousemove', handleColumnResizeMove);
      document.addEventListener('mouseup', handleColumnResizeEnd);
      return () => {
        document.removeEventListener('mousemove', handleColumnResizeMove);
        document.removeEventListener('mouseup', handleColumnResizeEnd);
      };
    }
  }, [isResizingColumn, handleColumnResizeMove, handleColumnResizeEnd]);

  return {
    isResizingColumn,
    handleColumnResizeStart,
    handleColumnResizeMove,
    handleColumnResizeEnd,
  };
};

// Row resize hook
export const useRowResize = ({
  rowHeights,
  setRowHeights,
}: UseRowResizeProps) => {
  const [isResizingRow, setIsResizingRow] = useState<string | null>(null);
  const tableResizeStartYRef = useRef<number>(0);
  const tableResizeStartHeightRef = useRef<number>(0);

  const handleRowResizeStart = useCallback((e: React.MouseEvent, testcaseId: string, currentHeight: number) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizingRow(testcaseId);
    tableResizeStartYRef.current = e.clientY;
    tableResizeStartHeightRef.current = currentHeight;
  }, []);

  const handleRowResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizingRow || tableResizeStartHeightRef.current === 0) return;

    const deltaY = e.clientY - tableResizeStartYRef.current;
    const minHeight = 32;
    const newHeight = Math.max(minHeight, tableResizeStartHeightRef.current + deltaY);

    setRowHeights((prev) => {
      const next = new Map(prev);
      next.set(isResizingRow!, newHeight);
      return next;
    });
  }, [isResizingRow, setRowHeights]);

  const handleRowResizeEnd = useCallback(() => {
    setIsResizingRow(null);
    tableResizeStartHeightRef.current = 0;
  }, []);

  // Set up global mouse move and mouse up listeners for row resize
  useEffect(() => {
    if (isResizingRow) {
      document.addEventListener('mousemove', handleRowResizeMove);
      document.addEventListener('mouseup', handleRowResizeEnd);
      return () => {
        document.removeEventListener('mousemove', handleRowResizeMove);
        document.removeEventListener('mouseup', handleRowResizeEnd);
      };
    }
  }, [isResizingRow, handleRowResizeMove, handleRowResizeEnd]);

  return {
    isResizingRow,
    handleRowResizeStart,
    handleRowResizeMove,
    handleRowResizeEnd,
  };
};

