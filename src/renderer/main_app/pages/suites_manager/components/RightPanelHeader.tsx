import React from 'react';
import { GroupSuiteItem } from '../../../types/group';
import { TestCaseInSuite } from '../../../types/testsuites';
import { formatPassRate } from '../utils/suitesManagerUtils';

interface RightPanelHeaderProps {
  selectedSuiteId: string | null;
  selectedSuiteName: string;
  selectedSuite: GroupSuiteItem | null;
  testcases: TestCaseInSuite[];
  testcasesSearchText: string;
  isLoadingTestcases: boolean;
  isRunningSuite: boolean;
  isExportingSuite: boolean;
  isCreatingTestcaseInSuite: boolean;
  isAddingCases: boolean;
  isNewTestcaseMenuOpen: boolean;
  onReloadTestcases: () => void;
  onRunAgain: () => void;
  onExport: () => void;
  onClearSuite: () => void;
  onOpenCreateTestcaseInSuite: () => void;
  onOpenAddExistedCase: () => void;
  onToggleNewTestcaseMenu: () => void;
}

const RightPanelHeader: React.FC<RightPanelHeaderProps> = ({
  selectedSuiteId,
  selectedSuiteName,
  selectedSuite,
  testcases,
  testcasesSearchText,
  isLoadingTestcases,
  isRunningSuite,
  isExportingSuite,
  isCreatingTestcaseInSuite,
  isAddingCases,
  isNewTestcaseMenuOpen,
  onReloadTestcases,
  onRunAgain,
  onExport,
  onClearSuite,
  onOpenCreateTestcaseInSuite,
  onOpenAddExistedCase,
  onToggleNewTestcaseMenu,
}) => {
  return (
    <div className="suites-right-panel-header">
      {selectedSuiteId ? (
        <>
          <div className="suites-right-panel-title-wrapper">
            <h2 className="suites-right-panel-title">{selectedSuiteName}</h2>
            {selectedSuite && (
              <div className="suites-right-panel-stats">
                <div className="suites-right-panel-stat-item">
                  <span className="suites-right-panel-stat-label">Total Cases</span>
                  <span className="suites-right-panel-stat-value">
                    {testcases.length}
                  </span>
                </div>
                <div className="suites-right-panel-stat-item">
                  <span className="suites-right-panel-stat-label">Pass Rate</span>
                  <span className="suites-right-panel-stat-value suites-right-panel-stat-rate">
                    {formatPassRate(selectedSuite)}
                  </span>
                </div>
                <div className="suites-right-panel-stat-item">
                  <span className="suites-right-panel-stat-label">Passed</span>
                  <span className="suites-right-panel-stat-value suites-right-panel-stat-passed">
                    {selectedSuite.test_passed ?? 0}
                  </span>
                </div>
                <div className="suites-right-panel-stat-item">
                  <span className="suites-right-panel-stat-label">Failed</span>
                  <span className="suites-right-panel-stat-value suites-right-panel-stat-failed">
                    {selectedSuite.test_failed ?? 0}
                  </span>
                </div>
              </div>
            )}
            <div className="suites-right-panel-actions">
              <button
                className={`suites-right-panel-action-btn suites-right-panel-reload-btn ${isLoadingTestcases ? 'is-loading' : ''}`}
                onClick={onReloadTestcases}
                disabled={isLoadingTestcases}
                aria-label="Reload testcases"
                title="Reload testcases"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 11a8.1 8.1 0 0 0-15.5-2" />
                  <path d="M4 5v4h4" />
                  <path d="M4 13a8.1 8.1 0 0 0 15.5 2" />
                  <path d="M20 19v-4h-4" />
                </svg>
              </button>
              <button
                className={`suites-right-panel-action-btn suites-right-panel-run-btn ${isRunningSuite ? 'is-running' : ''}`}
                onClick={onRunAgain}
                disabled={isRunningSuite || isLoadingTestcases}
                aria-label="Run"
                title="Run"
              >
                {isRunningSuite ? (
                  <>
                    <span className="suites-right-panel-spinner" />
                    Running...
                  </>
                ) : (
                  'Run'
                )}
              </button>
              <button
                className="suites-right-panel-action-btn suites-right-panel-export-btn"
                onClick={onExport}
                disabled={isExportingSuite || isLoadingTestcases}
                aria-label="Export"
                title="Export"
              >
                {isExportingSuite ? 'Exporting...' : 'Export'}
              </button>
              <div className="sm-new-testcase-wrapper">
                <button
                  className="suites-right-panel-action-btn suites-right-panel-new-testcase-btn"
                  onClick={onToggleNewTestcaseMenu}
                  disabled={isCreatingTestcaseInSuite || isLoadingTestcases}
                  aria-label="New testcase"
                  title="New testcase"
                  aria-haspopup="true"
                  aria-expanded={isNewTestcaseMenuOpen}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14" />
                    <path d="M5 12h14" />
                  </svg>
                  New testcase
                </button>
                {isNewTestcaseMenuOpen && (
                  <div className="sm-new-menu" role="menu">
                    <button 
                      className="sm-new-item" 
                      onClick={onOpenCreateTestcaseInSuite} 
                      role="menuitem"
                      disabled={isCreatingTestcaseInSuite || isLoadingTestcases}
                    >
                      Create new case
                    </button>
                    <button 
                      className="sm-new-item" 
                      onClick={onOpenAddExistedCase} 
                      role="menuitem"
                      disabled={isAddingCases || isLoadingTestcases}
                    >
                      Add existed case
                    </button>
                  </div>
                )}
              </div>
              <button
                className="suites-right-panel-close-btn"
                onClick={onClearSuite}
                aria-label="Close suite"
                title="Close suite"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18" />
                  <path d="M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </>
      ) : (
        <h2 className="suites-right-panel-title">Testcases</h2>
      )}
    </div>
  );
};

export default RightPanelHeader;

