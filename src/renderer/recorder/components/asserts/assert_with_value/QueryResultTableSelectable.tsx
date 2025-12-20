import React from 'react';
import './QueryResultTableSelectable.css';

interface QueryResultSelectInfo {
  value: string;
  column: string;
}

interface QueryResultTableSelectableProps {
  data: any[];
  maxHeight?: number;
  onSelectCell: (info: QueryResultSelectInfo) => void;
  selectedValue?: string;
}

const QueryResultTableSelectable: React.FC<QueryResultTableSelectableProps> = ({ 
  data, 
  maxHeight = 300,
  onSelectCell,
  selectedValue
}) => {
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
  
  // Chỉ giữ các cột mà có ít nhất một giá trị primitive (string/number/boolean/null)
  const columns = Array.from(allKeys).filter((column) =>
    data.some((row) => {
      if (!row || typeof row !== 'object') return false;
      const cellValue = row[column];
      const t = typeof cellValue;
      return (
        cellValue === null ||
        t === 'string' ||
        t === 'number' ||
        t === 'boolean'
      );
    })
  );

  const handleCellClick = (row: any, column: string) => {
    const cellValue = row && typeof row === 'object' ? row[column] : undefined;
    const cellValueStr = cellValue === null || cellValue === undefined ? '' : String(cellValue);
    onSelectCell({ value: cellValueStr, column });
  };

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
                {columns.map((column, colIdx) => {
                  const cellValue = row && typeof row === 'object' ? row[column] : undefined;
                  const cellValueStr = cellValue === null || cellValue === undefined ? '' : String(cellValue);
                  const isSelected = selectedValue === cellValueStr;
                  
                  return (
                    <td 
                      key={colIdx} 
                      className={`qrt-cell ${isSelected ? 'qrt-cell-selected' : ''}`}
                      onClick={() => handleCellClick(row, column)}
                    >
                      <div className="qrt-cell-content">
                        <span className="qrt-cell-text">{cellValueStr}</span>
                        <button
                          className="qrt-select-btn"
                          title="Select this value"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCellClick(row, column);
                          }}
                        >
                          <i className="fas fa-plus"></i>
                        </button>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default QueryResultTableSelectable;

