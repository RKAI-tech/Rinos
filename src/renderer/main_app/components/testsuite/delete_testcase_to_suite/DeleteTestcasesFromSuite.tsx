import React, { useEffect, useMemo, useState } from 'react';
import './DeleteTestcasesFromSuite.css';
import { TestSuiteService } from '../../../services/testsuites';
import { TestCaseInSuite } from '../../../types/testsuites';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  testSuiteId?: string | null;
  onRemove?: (testcaseIds: string[]) => void | Promise<void>;
}

interface GroupedTestCases {
  [level: number]: TestCaseInSuite[];
}

const EditTestcaseFromSuite: React.FC<Props> = ({ isOpen, onClose, testSuiteId, onRemove }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testCases, setTestCases] = useState<TestCaseInSuite[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [draggedTestcaseId, setDraggedTestcaseId] = useState<string | null>(null);
  const [dragOverLevel, setDragOverLevel] = useState<number | null>(null);
  const [updatingLevelIds, setUpdatingLevelIds] = useState<Set<string>>(new Set());
  const svc = useMemo(() => new TestSuiteService(), []);

  // Group test cases by level
  const groupedByLevel = useMemo(() => {
    const grouped: GroupedTestCases = {};
    testCases.forEach(tc => {
      const level = tc.level ?? 0;
      if (!grouped[level]) {
        grouped[level] = [];
      }
      grouped[level].push(tc);
    });
    return grouped;
  }, [testCases]);

  // Get sorted levels
  const levels = useMemo(() => {
    return Object.keys(groupedByLevel)
      .map(Number)
      .sort((a, b) => a - b);
  }, [groupedByLevel]);

  // Auto-select first level when levels are loaded
  useEffect(() => {
    if (levels.length > 0 && selectedLevel === null) {
      setSelectedLevel(levels[0]);
    }
  }, [levels, selectedLevel]);

  // Load test cases
  useEffect(() => {
    const load = async () => {
      if (!isOpen || !testSuiteId) return;
      try {
        setLoading(true);
        setError(null);
        const resp = await svc.getTestCasesBySuite({ test_suite_id: testSuiteId });
        if (resp.success && resp.data) {
          setTestCases(resp.data.testcases || []);
        } else {
          setError(resp.error || 'Failed to load testcases');
          setTestCases([]);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'An error occurred');
        setTestCases([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isOpen, testSuiteId, svc]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTestCases([]);
      setSelectedLevel(null);
      setDeletingIds(new Set());
      setError(null);
    }
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, testcaseId: string) => {
    setDraggedTestcaseId(testcaseId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', testcaseId);
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedTestcaseId(null);
    setDragOverLevel(null);
  };

  // Handle drag over level
  const handleDragOver = (e: React.DragEvent, level: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverLevel(level);
  };

  // Handle drag leave
  const handleDragLeave = () => {
    setDragOverLevel(null);
  };

  // Handle drop on level
  const handleDropOnLevel = async (e: React.DragEvent, targetLevel: number) => {
    e.preventDefault();
    setDragOverLevel(null);

    if (!testSuiteId || !draggedTestcaseId) return;

    // Find the test case
    const testCase = testCases.find(tc => tc.testcase_id === draggedTestcaseId);
    if (!testCase) return;

    // Check if level is actually changing
    const currentLevel = testCase.level ?? 0;
    if (currentLevel === targetLevel) {
      setDraggedTestcaseId(null);
      return;
    }

    try {
      setUpdatingLevelIds(prev => new Set(prev).add(draggedTestcaseId));
      setError(null);

      // Call API to update level
      const resp = await svc.updateTestCaseLevel({
        test_suite_id: testSuiteId,
        testcase_ids: [{
          testcase_id: draggedTestcaseId,
          level: targetLevel
        }]
      });

      if (resp.success) {
        // Update local state
        setTestCases(prev => prev.map(tc => 
          tc.testcase_id === draggedTestcaseId 
            ? { ...tc, level: targetLevel }
            : tc
        ));

        // If we moved from current level, switch to target level if current level becomes empty
        if (selectedLevel === currentLevel) {
          const remainingInCurrentLevel = testCases.filter(
            tc => tc.testcase_id !== draggedTestcaseId && (tc.level ?? 0) === currentLevel
          );
          if (remainingInCurrentLevel.length === 0) {
            setSelectedLevel(targetLevel);
          }
        } else if (selectedLevel === targetLevel) {
          // If we moved to current level, it will show up automatically
        }
      } else {
        setError(resp.error || 'Failed to update test case level');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred while updating level');
    } finally {
      setUpdatingLevelIds(prev => {
        const next = new Set(prev);
        next.delete(draggedTestcaseId);
        return next;
      });
      setDraggedTestcaseId(null);
    }
  };

  // Handle delete test case
  const handleDelete = async (testcaseId: string) => {
    if (!testSuiteId || deletingIds.has(testcaseId)) return;

    // Find the test case to get its level
    const testCase = testCases.find(tc => tc.testcase_id === testcaseId);
    const testCaseLevel = testCase?.level ?? 0;

    try {
      setDeletingIds(prev => new Set(prev).add(testcaseId));
      const resp = await svc.removeTestCaseFromTestSuite(testcaseId, testSuiteId);
      
      if (resp.success) {
        // Remove from local state
        const updatedTestCases = testCases.filter(tc => tc.testcase_id !== testcaseId);
        setTestCases(updatedTestCases);
        
        // Check if current level becomes empty after deletion
        const remainingInLevel = updatedTestCases.filter(tc => (tc.level ?? 0) === testCaseLevel);
        if (remainingInLevel.length === 0 && selectedLevel === testCaseLevel) {
          // Current level is now empty, switch to another level
          const remainingLevels = [...new Set(updatedTestCases.map(tc => tc.level ?? 0))].sort((a, b) => a - b);
          if (remainingLevels.length > 0) {
            setSelectedLevel(remainingLevels[0]);
          } else {
            setSelectedLevel(null);
          }
        }
        
        // Call onRemove callback if provided
        if (onRemove) {
          await onRemove([testcaseId]);
        }
      } else {
        setError(resp.error || 'Failed to remove test case');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred while removing test case');
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(testcaseId);
        return next;
      });
    }
  };

  if (!isOpen) return null;

  const currentLevelTestCases = selectedLevel !== null ? (groupedByLevel[selectedLevel] || []) : [];

  return (
    <div className="tsuite-edit-modal-overlay">
      <div className="tsuite-edit-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="tsuite-edit-modal-header">
          <h2 className="tsuite-edit-modal-title">Edit Testcases in Suite</h2>
          <button className="tsuite-edit-modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="tsuite-edit-content">
          {/* Sidebar with levels */}
          <div className="tsuite-edit-sidebar">
            <div className="tsuite-edit-sidebar-header">Levels</div>
            <div className="tsuite-edit-levels-list">
              {loading && <div className="tsuite-edit-loading">Loading...</div>}
              {!loading && levels.length === 0 && (
                <div className="tsuite-edit-empty">No levels found</div>
              )}
              {!loading && levels.map(level => (
                <button
                  key={level}
                  className={`tsuite-edit-level-item ${selectedLevel === level ? 'active' : ''} ${dragOverLevel === level ? 'drag-over' : ''}`}
                  onClick={() => setSelectedLevel(level)}
                  onDragOver={(e) => handleDragOver(e, level)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDropOnLevel(e, level)}
                >
                  <span className="tsuite-edit-level-number">Level {level}</span>
                  <span className="tsuite-edit-level-count">({groupedByLevel[level]?.length || 0})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Main content area */}
          <div className="tsuite-edit-main">
            {error && <div className="tsuite-edit-error">{error}</div>}
            
            {loading && (
              <div className="tsuite-edit-loading">Loading testcases...</div>
            )}

            {!loading && selectedLevel === null && (
              <div className="tsuite-edit-empty">Select a level to view testcases</div>
            )}

            {!loading && selectedLevel !== null && currentLevelTestCases.length === 0 && (
              <div className="tsuite-edit-empty">No testcases found for Level {selectedLevel}</div>
            )}

            {!loading && selectedLevel !== null && currentLevelTestCases.length > 0 && (
              <div className="tsuite-edit-testcases-list">
                {currentLevelTestCases.map(tc => (
                  <div 
                    key={tc.testcase_id} 
                    className={`tsuite-edit-testcase-item ${draggedTestcaseId === tc.testcase_id ? 'dragging' : ''} ${updatingLevelIds.has(tc.testcase_id) ? 'updating' : ''}`}
                    draggable={!deletingIds.has(tc.testcase_id) && !updatingLevelIds.has(tc.testcase_id)}
                    onDragStart={(e) => handleDragStart(e, tc.testcase_id)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="tsuite-edit-testcase-drag-handle" title="Drag to change level">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="9" cy="5" r="1.5" fill="currentColor" opacity="0.4"/>
                        <circle cx="15" cy="5" r="1.5" fill="currentColor" opacity="0.4"/>
                        <circle cx="9" cy="12" r="1.5" fill="currentColor" opacity="0.4"/>
                        <circle cx="15" cy="12" r="1.5" fill="currentColor" opacity="0.4"/>
                        <circle cx="9" cy="19" r="1.5" fill="currentColor" opacity="0.4"/>
                        <circle cx="15" cy="19" r="1.5" fill="currentColor" opacity="0.4"/>
                      </svg>
                    </div>
                    <div className="tsuite-edit-testcase-info">
                      <span className="tsuite-edit-testcase-name">{tc.name}</span>
                      {tc.description && (
                        <span className="tsuite-edit-testcase-desc">{tc.description}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {updatingLevelIds.has(tc.testcase_id) && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ animation: 'spin 1s linear infinite' }}>
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="32" strokeDashoffset="32">
                            <animate attributeName="stroke-dasharray" dur="1s" values="0 32;16 16;0 32;0 32" repeatCount="indefinite"/>
                            <animate attributeName="stroke-dashoffset" dur="1s" values="0;-16;-32;-32" repeatCount="indefinite"/>
                          </circle>
                        </svg>
                      )}
                      <button
                        className="tsuite-edit-delete-btn"
                        onClick={() => handleDelete(tc.testcase_id)}
                        disabled={deletingIds.has(tc.testcase_id) || updatingLevelIds.has(tc.testcase_id)}
                        title="Remove from suite"
                      >
                        {deletingIds.has(tc.testcase_id) ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="32" strokeDashoffset="32">
                              <animate attributeName="stroke-dasharray" dur="1s" values="0 32;16 16;0 32;0 32" repeatCount="indefinite"/>
                              <animate attributeName="stroke-dashoffset" dur="1s" values="0;-16;-32;-32" repeatCount="indefinite"/>
                            </circle>
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="tsuite-edit-modal-actions">
          <button className="tsuite-edit-btn-close" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default EditTestcaseFromSuite;


