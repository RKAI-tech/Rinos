import { useState, useCallback } from 'react';

export const useColumnSort = (initialColumn: string | null = 'updated', initialDirection: 'asc' | 'desc' = 'desc') => {
  const [sortColumn, setSortColumn] = useState<string | null>(initialColumn);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(initialDirection);

  const handleColumnSort = useCallback((column: string) => {
    if (sortColumn === column) {
      // Toggle direction if clicking the same column
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column with ascending direction
      setSortColumn(column);
      setSortDirection('asc');
    }
  }, [sortColumn]);

  return {
    sortColumn,
    sortDirection,
    handleColumnSort,
    setSortColumn,
    setSortDirection,
  };
};

