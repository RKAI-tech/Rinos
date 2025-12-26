import React, { useMemo } from 'react';

interface TestcasesPaginationProps {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
}

const TestcasesPagination: React.FC<TestcasesPaginationProps> = ({
  currentPage,
  totalPages,
  itemsPerPage,
  totalItems,
  onPageChange,
  onItemsPerPageChange,
}) => {
  // Don't render if no items
  if (totalItems === 0) {
    return null;
  }

  // Calculate page numbers to show: current page ± 2
  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }, [currentPage, totalPages]);

  const handleFirstPage = () => {
    if (currentPage > 1) {
      onPageChange(1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handleLastPage = () => {
    if (currentPage < totalPages) {
      onPageChange(totalPages);
    }
  };

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newItemsPerPage = parseInt(e.target.value, 10);
    onItemsPerPageChange(newItemsPerPage);
  };

  return (
    <div className="sm-testcases-pagination">
      {/* Per Page Dropdown */}
      <div className="sm-testcases-pagination-per-page">
        <select
          className="sm-testcases-pagination-dropdown"
          value={itemsPerPage}
          onChange={handleItemsPerPageChange}
        >
          <option value={20}>20</option>
          <option value={30}>30</option>
          <option value={50}>50</option>
        </select>
        <span className="sm-testcases-pagination-per-page-text">per Page</span>
      </div>

      {/* Navigation Buttons */}
      <div className="sm-testcases-pagination-controls">
        {/* First Page */}
        <button
          className="sm-testcases-pagination-btn sm-testcases-pagination-btn-icon"
          onClick={handleFirstPage}
          disabled={currentPage === 1}
          aria-label="First page"
          title="First page"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="11 17 6 12 11 7" />
            <polyline points="18 17 13 12 18 7" />
          </svg>
        </button>

        {/* Previous Page */}
        <button
          className="sm-testcases-pagination-btn sm-testcases-pagination-btn-icon"
          onClick={handlePreviousPage}
          disabled={currentPage === 1}
          aria-label="Previous page"
          title="Previous page"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Page Numbers */}
        <div className="sm-testcases-pagination-pages">
          {pageNumbers.map((page) => (
            <button
              key={page}
              className={`sm-testcases-pagination-page ${
                currentPage === page ? 'active' : ''
              }`}
              onClick={() => onPageChange(page)}
              aria-label={`Page ${page}`}
              aria-current={currentPage === page ? 'page' : undefined}
            >
              {page}
            </button>
          ))}
        </div>

        {/* Next Page */}
        <button
          className="sm-testcases-pagination-btn sm-testcases-pagination-btn-icon"
          onClick={handleNextPage}
          disabled={currentPage === totalPages}
          aria-label="Next page"
          title="Next page"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        {/* Last Page */}
        <button
          className="sm-testcases-pagination-btn sm-testcases-pagination-btn-icon"
          onClick={handleLastPage}
          disabled={currentPage === totalPages}
          aria-label="Last page"
          title="Last page"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="13 17 18 12 13 7" />
            <polyline points="6 17 11 12 6 7" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default TestcasesPagination;
