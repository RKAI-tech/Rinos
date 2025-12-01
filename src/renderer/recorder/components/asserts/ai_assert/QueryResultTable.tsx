import React from 'react';
import './QueryResultTable.css';

interface QueryResultTableProps {
  data: any[];
  maxHeight?: number;
}

const QueryResultTable: React.FC<QueryResultTableProps> = ({ data, maxHeight = 300 }) => {
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="qrt-no-results">
        No results to display
      </div>
    );
  }

  // Extract all unique keys from the data
  const allKeys = new Set<string>();
  data.forEach((row) => {
    if (row && typeof row === 'object') {
      Object.keys(row).forEach((key) => allKeys.add(key));
    }
  });
  
  const columns = Array.from(allKeys);

  return (
    <div className="qrt-container" style={{ maxHeight: `${maxHeight}px` }}>
      <div className="qrt-table-wrapper">
        <table className="qrt-table">
          <thead>
            <tr>
              {columns.map((column, idx) => (
                <th key={idx} className="qrt-header">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIdx) => (
              <tr key={rowIdx} className="qrt-row">
                {columns.map((column, colIdx) => (
                  <td key={colIdx} className="qrt-cell">
                    {String(row[column] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default QueryResultTable;
