import React from 'react';

interface TestcasesLevelsPanelProps {
  sortedLevels: number[];
  selectedLevel: number | null;
  onLevelSelect: (level: number | null) => void;
}

const TestcasesLevelsPanel: React.FC<TestcasesLevelsPanelProps> = ({
  sortedLevels,
  selectedLevel,
  onLevelSelect,
}) => {
  return (
    <div className="sm-testcases-levels-panel">
      <div className="sm-testcases-levels-label">Order</div>
      <div className="sm-testcases-levels-list">
        {/* All option */}
        <div
          className={`sm-testcase-level-item sm-testcase-level-item-all ${selectedLevel === null ? 'is-selected' : ''}`}
          onClick={() => onLevelSelect(null)}
        >
          <div className="sm-testcase-level-icon">
            <span className="sm-testcase-level-text">All</span>
          </div>
        </div>
        {sortedLevels.map((level) => {
          const isSelected = selectedLevel === level;

          return (
            <div
              key={`level-${level}`}
              className={`sm-testcase-level-item ${isSelected ? 'is-selected' : ''}`}
              onClick={() => onLevelSelect(level)}
            >
              <div className="sm-testcase-level-icon">
                <span className="sm-testcase-level-number">{level}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TestcasesLevelsPanel;

