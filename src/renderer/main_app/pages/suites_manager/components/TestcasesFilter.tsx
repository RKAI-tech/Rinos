import React, { useRef, useEffect, useState } from 'react';
import { BrowserType } from '../../../types/testcases';

interface TestcasesFilterProps {
  sortedLevels: number[];
  selectedOrderFilter: number | null;
  selectedStatusFilter: string | null;
  selectedBrowserFilter: string | null;
  isFilterModalOpen: boolean;
  onOrderFilterChange: (order: number | null) => void;
  onStatusFilterChange: (status: string | null) => void;
  onBrowserFilterChange: (browser: string | null) => void;
  onToggleModal: () => void;
  onCloseModal: () => void;
}

const TestcasesFilter: React.FC<TestcasesFilterProps> = ({
  sortedLevels,
  selectedOrderFilter,
  selectedStatusFilter,
  selectedBrowserFilter,
  isFilterModalOpen,
  onOrderFilterChange,
  onStatusFilterChange,
  onBrowserFilterChange,
  onToggleModal,
  onCloseModal,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Local state for temporary filter values (before applying)
  const [tempOrderFilter, setTempOrderFilter] = useState<number | null>(selectedOrderFilter);
  const [tempStatusFilter, setTempStatusFilter] = useState<string | null>(selectedStatusFilter);
  const [tempBrowserFilter, setTempBrowserFilter] = useState<string | null>(selectedBrowserFilter);

  // Reset temporary values when modal opens to match current filter values
  useEffect(() => {
    if (isFilterModalOpen) {
      setTempOrderFilter(selectedOrderFilter);
      setTempStatusFilter(selectedStatusFilter);
      setTempBrowserFilter(selectedBrowserFilter);
    }
  }, [isFilterModalOpen, selectedOrderFilter, selectedStatusFilter, selectedBrowserFilter]);

  // Status options
  const statusOptions = ['All', 'Running', 'Passed', 'Failed', 'Draft'];

  // Browser options
  const browserOptions = [
    'All',
    BrowserType.chrome,
    BrowserType.firefox,
    BrowserType.edge,
    BrowserType.safari,
  ];

  // Format browser name for display
  const formatBrowserName = (browser: string) => {
    if (browser === 'All') return 'All';
    return browser.charAt(0).toUpperCase() + browser.slice(1).toLowerCase();
  };

  // Handle click outside to close modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isFilterModalOpen &&
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        onCloseModal();
      }
    };

    if (isFilterModalOpen) {
      document.addEventListener('mousedown', handleClickOutside, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [isFilterModalOpen, onCloseModal]);

  const handleOrderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setTempOrderFilter(value === 'All' ? null : parseInt(value, 10));
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setTempStatusFilter(value === 'All' ? null : value);
  };

  const handleBrowserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setTempBrowserFilter(value === 'All' ? null : value);
  };

  const handleApply = () => {
    onOrderFilterChange(tempOrderFilter);
    onStatusFilterChange(tempStatusFilter);
    onBrowserFilterChange(tempBrowserFilter);
    onCloseModal();
  };

  const handleReset = () => {
    setTempOrderFilter(null);
    setTempStatusFilter(null);
    setTempBrowserFilter(null);
  };

  return (
    <div className="sm-testcases-filter-wrapper" ref={wrapperRef}>
      <button
        className="sm-testcases-filter-button"
        onClick={onToggleModal}
        aria-haspopup="true"
        aria-expanded={isFilterModalOpen}
      >
        <span className="sm-testcases-filter-icon" aria-hidden>
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
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
        </span>
        Filter
      </button>
      {isFilterModalOpen && (
        <div className="sm-testcases-filter-modal" ref={modalRef}>
          <div className="sm-testcases-filter-content">
            <div className="sm-testcases-filter-row">
              {/* Order Filter */}
              <div className="sm-testcases-filter-group">
                <label className="sm-testcases-filter-label">Order</label>
                <select
                  className="sm-testcases-filter-dropdown"
                  value={tempOrderFilter === null ? 'All' : tempOrderFilter.toString()}
                  onChange={handleOrderChange}
                >
                  <option value="All">All</option>
                  {sortedLevels.map((level) => (
                    <option key={level} value={level.toString()}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="sm-testcases-filter-group">
                <label className="sm-testcases-filter-label">Status</label>
                <select
                  className="sm-testcases-filter-dropdown"
                  value={tempStatusFilter === null ? 'All' : tempStatusFilter}
                  onChange={handleStatusChange}
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status === 'All' ? 'All' : status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              {/* Browser Filter */}
              <div className="sm-testcases-filter-group">
                <label className="sm-testcases-filter-label">Browser</label>
                <select
                  className="sm-testcases-filter-dropdown"
                  value={tempBrowserFilter === null ? 'All' : tempBrowserFilter}
                  onChange={handleBrowserChange}
                >
                  {browserOptions.map((browser) => (
                    <option key={browser} value={browser === 'All' ? 'All' : browser}>
                      {formatBrowserName(browser)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="sm-testcases-filter-actions">
              <button
                className="sm-testcases-filter-reset-btn"
                onClick={handleReset}
                type="button"
              >
                Reset
              </button>
              <button
                className="sm-testcases-filter-apply-btn"
                onClick={handleApply}
                type="button"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestcasesFilter;

