import { useState, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import { GroupSuiteItem } from '../../../types/group';
import { TestcaseId } from '../../../types/testsuites';
import { TestSuiteService } from '../../../services/testsuites';

interface UseSuiteHandlersProps {
  selectedSuiteId: string | null;
  selectedSuiteName: string;
  selectedSuite: GroupSuiteItem | null;
  setSelectedSuiteId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedSuiteName: React.Dispatch<React.SetStateAction<string>>;
  setSelectedSuite: React.Dispatch<React.SetStateAction<GroupSuiteItem | null>>;
  setTestcases: React.Dispatch<React.SetStateAction<any[]>>;
  setTestcasesError: React.Dispatch<React.SetStateAction<string | null>>;
  setExpandedTestcaseLevels: React.Dispatch<React.SetStateAction<Set<number>>>;
  setSelectedLevel: React.Dispatch<React.SetStateAction<number | null>>;
  setSortColumn: React.Dispatch<React.SetStateAction<string | null>>;
  setSortDirection: React.Dispatch<React.SetStateAction<'asc' | 'desc'>>;
  setIsLoadingTestcases: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedGroupId: React.Dispatch<React.SetStateAction<string | null>>;
  fetchTestcasesBySuite: (suiteId: string, suiteName: string) => Promise<void>;
  fetchData: () => Promise<void>;
}

export const useSuiteHandlers = ({
  selectedSuiteId,
  selectedSuiteName,
  selectedSuite,
  setSelectedSuiteId,
  setSelectedSuiteName,
  setSelectedSuite,
  setTestcases,
  setTestcasesError,
  setExpandedTestcaseLevels,
  setSelectedLevel,
  setSortColumn,
  setSortDirection,
  setIsLoadingTestcases,
  setSelectedGroupId,
  fetchTestcasesBySuite,
  fetchData,
}: UseSuiteHandlersProps) => {
  // Services
  const suiteService = useMemo(() => new TestSuiteService(), []);

  // Suite state
  const [isRunningSuite, setIsRunningSuite] = useState(false);
  const [isExportingSuite, setIsExportingSuite] = useState(false);
  const [isDeleteSuiteModalOpen, setIsDeleteSuiteModalOpen] = useState(false);
  const [deletingSuite, setDeletingSuite] = useState<GroupSuiteItem | null>(null);
  const [isDeletingSuite, setIsDeletingSuite] = useState(false);
  const [isEditSuiteModalOpen, setIsEditSuiteModalOpen] = useState(false);
  const [editingSuite, setEditingSuite] = useState<GroupSuiteItem | null>(null);
  const [isSavingSuite, setIsSavingSuite] = useState(false);
  const [isAddCasesModalOpen, setIsAddCasesModalOpen] = useState(false);
  const [addingSuite, setAddingSuite] = useState<GroupSuiteItem | null>(null);
  const [isAddingCases, setIsAddingCases] = useState(false);

  // Suite click handler
  const handleSuiteClick = useCallback((suite: GroupSuiteItem, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (selectedSuiteId === suite.test_suite_id) {
      // If clicking the same suite, deselect it - no loading needed
      setSelectedSuiteId(null);
      setSelectedSuiteName('');
      setSelectedSuite(null);
      setTestcases([]);
      setTestcasesError(null);
      setExpandedTestcaseLevels(new Set());
      setSelectedLevel(null);
      return;
    }
    // Set loading state for testcases only before fetching
    setIsLoadingTestcases(true);
    setSelectedSuiteId(suite.test_suite_id);
    setSelectedSuiteName(suite.name);
    setSelectedSuite(suite);
    setSelectedGroupId(null); // Clear selected group when clicking suite
    setSelectedLevel(null); // Reset selected level when opening a new suite
    // Reset sort to default when switching suites
    setSortColumn('updated_at');
    setSortDirection('desc');
    // fetchTestcasesBySuite will be called by useEffect when selectedSuiteId changes
  }, [
    selectedSuiteId,
    setSelectedSuiteId,
    setSelectedSuiteName,
    setSelectedSuite,
    setTestcases,
    setTestcasesError,
    setExpandedTestcaseLevels,
    setSelectedLevel,
    setIsLoadingTestcases,
    setSelectedGroupId,
    setSortColumn,
    setSortDirection,
  ]);

  // Clear suite handler
  const handleClearSuite = useCallback(() => {
    setSelectedSuiteId(null);
    setSelectedSuiteName('');
    setSelectedSuite(null);
    setTestcases([]);
    setTestcasesError(null);
    setExpandedTestcaseLevels(new Set());
    setSelectedLevel(null);
  }, [
    setSelectedSuiteId,
    setSelectedSuiteName,
    setSelectedSuite,
    setTestcases,
    setTestcasesError,
    setExpandedTestcaseLevels,
    setSelectedLevel,
  ]);

  // Run suite handler
  const handleRunAgain = useCallback(async () => {
    if (!selectedSuiteId || isRunningSuite) return;
    try {
      setIsRunningSuite(true);
      const resp = await suiteService.executeTestSuite({ test_suite_id: selectedSuiteId });
      if (resp.success) {
        // toast.success('Test suite execution started');
        // Reload testcases after a short delay
        setTimeout(() => {
          fetchTestcasesBySuite(selectedSuiteId, selectedSuiteName);
        }, 1000);
      } else {
        toast.error(resp.error || 'Failed to execute test suite. Please try again.');
      }
    } catch (e) {
      toast.error('Failed to execute test suite. Please try again.');
    } finally {
      setIsRunningSuite(false);
    }
  }, [selectedSuiteId, isRunningSuite, selectedSuiteName, fetchTestcasesBySuite, suiteService]);

  // Export suite handler
  const handleExport = useCallback(async () => {
    if (!selectedSuiteId || isExportingSuite) return;
    try {
      setIsExportingSuite(true);
      const response = await suiteService.exportTestSuite({ test_suite_id: selectedSuiteId });
      
      if (!response.success) {
        toast.error(response.error || 'Failed to export test suite. Please try again.');
        return;
      }

      if (response.blob && response.filename) {
        const url = URL.createObjectURL(response.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        // toast.success('Exported test suite to Excel');
      } else {
        toast.error(response.error || 'No file received from server');
      }
    } catch (e) {
      toast.error('Export failed. Please try again.');
    } finally {
      setIsExportingSuite(false);
    }
  }, [selectedSuiteId, isExportingSuite, suiteService]);

  // Reload testcases handler
  const handleReloadTestcases = useCallback(() => {
    if (!selectedSuiteId) return;
    fetchTestcasesBySuite(selectedSuiteId, selectedSuiteName);
  }, [selectedSuiteId, selectedSuiteName, fetchTestcasesBySuite]);

  // Delete suite handler
  const handleDeleteSuite = useCallback(async (suiteId: string) => {
    if (!suiteId) return;
    try {
      setIsDeletingSuite(true);
      const resp = await suiteService.deleteTestSuite(suiteId);
      if (resp.success) {
        toast.success('Suite deleted successfully');
        // If deleted suite was selected, clear selection
        if (selectedSuiteId === suiteId) {
          handleClearSuite();
        }
        // Reload tree
        await fetchData();
        setIsDeleteSuiteModalOpen(false);
        setDeletingSuite(null);
      } else {
        toast.error(resp.error || 'Failed to delete suite. Please try again.');
      }
    } catch (e) {
      toast.error('Failed to delete suite. Please try again.');
    } finally {
      setIsDeletingSuite(false);
    }
  }, [selectedSuiteId, suiteService, handleClearSuite, fetchData]);

  // Close delete suite modal handler
  const handleCloseDeleteSuiteModal = useCallback(() => {
    if (!isDeletingSuite) {
      setIsDeleteSuiteModalOpen(false);
      setDeletingSuite(null);
    }
  }, [isDeletingSuite]);

  // Save suite handler
  const handleSaveSuite = useCallback(async (data: { test_suite_id: string; name: string; description: string; browser_type?: string }) => {
    if (!data.test_suite_id) return;
    try {
      setIsSavingSuite(true);
      const resp = await suiteService.updateTestSuite({
        test_suite_id: data.test_suite_id,
        name: data.name,
        description: data.description,
        browser_type: data.browser_type
      });
      if (resp.success) {
        // toast.success('Suite updated successfully');
        // Reload tree to reflect changes
        await fetchData();
        // If edited suite was selected, update selected suite info
        if (selectedSuiteId === data.test_suite_id) {
          setSelectedSuiteName(data.name);
          // Reload testcases to get updated info
          fetchTestcasesBySuite(data.test_suite_id, data.name);
        }
        setIsEditSuiteModalOpen(false);
        setEditingSuite(null);
      } else {
        toast.error(resp.error || 'Failed to update suite. Please try again.');
      }
    } catch (e) {
      toast.error('Failed to update suite. Please try again.');
    } finally {
      setIsSavingSuite(false);
    }
  }, [selectedSuiteId, suiteService, setSelectedSuiteName, fetchData, fetchTestcasesBySuite]);

  // Close edit suite modal handler
  const handleCloseEditSuiteModal = useCallback(() => {
    if (!isSavingSuite) {
      setIsEditSuiteModalOpen(false);
      setEditingSuite(null);
    }
  }, [isSavingSuite]);

  // Add cases handler
  const handleAddCases = useCallback(async (testcaseIds: TestcaseId[]) => {
    if (!addingSuite || isAddingCases) return;
    try {
      setIsAddingCases(true);
      const resp = await suiteService.addTestCasesToSuite({
        test_suite_id: addingSuite.test_suite_id,
        testcase_ids: testcaseIds,
      });
      if (resp.success) {
        // toast.success('Testcases added to suite successfully');
        setIsAddCasesModalOpen(false);
        setAddingSuite(null);
        // If the suite is currently selected, reload testcases
        if (selectedSuiteId === addingSuite.test_suite_id) {
          fetchTestcasesBySuite(addingSuite.test_suite_id, addingSuite.name);
        }
        // Reload tree to reflect changes
        await fetchData();
      } else {
        toast.error(resp.error || 'Failed to add testcases. Please try again.');
      }
    } catch (e) {
      toast.error('Failed to add testcases. Please try again.');
    } finally {
      setIsAddingCases(false);
    }
  }, [addingSuite, isAddingCases, selectedSuiteId, suiteService, fetchTestcasesBySuite, fetchData]);

  // Close add cases modal handler
  const handleCloseAddCasesModal = useCallback(() => {
    if (!isAddingCases) {
      setIsAddCasesModalOpen(false);
      setAddingSuite(null);
    }
  }, [isAddingCases]);

  return {
    // Suite state
    isRunningSuite,
    isExportingSuite,
    isDeleteSuiteModalOpen,
    deletingSuite,
    isDeletingSuite,
    isEditSuiteModalOpen,
    editingSuite,
    isSavingSuite,
    isAddCasesModalOpen,
    addingSuite,
    isAddingCases,
    // Suite handlers
    handleSuiteClick,
    handleClearSuite,
    handleRunAgain,
    handleExport,
    handleReloadTestcases,
    handleDeleteSuite,
    handleCloseDeleteSuiteModal,
    handleSaveSuite,
    handleCloseEditSuiteModal,
    handleAddCases,
    handleCloseAddCasesModal,
    // Setters for context menu handlers
    setDeletingSuite,
    setIsDeleteSuiteModalOpen,
    setEditingSuite,
    setIsEditSuiteModalOpen,
    setAddingSuite,
    setIsAddCasesModalOpen,
    setIsRunningSuite,
  };
};

