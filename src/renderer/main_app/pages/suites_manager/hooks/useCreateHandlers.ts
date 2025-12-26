import { useState, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import { TestSuiteService } from '../../../services/testsuites';
import { TestCaseService } from '../../../services/testcases';

interface UseCreateHandlersProps {
  projectId: string | undefined;
  selectedGroupId: string | null;
  selectedSuiteId: string | null;
  selectedSuiteName: string;
  selectedLevel: number | null;
  setNewMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsNewTestcaseMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setExpanded: React.Dispatch<React.SetStateAction<Set<string>>>;
  fetchData: () => Promise<void>;
  fetchTestcasesBySuite: (suiteId: string, suiteName: string) => Promise<void>;
  setAddingSuite: React.Dispatch<React.SetStateAction<any>>;
  setIsAddCasesModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectedSuite: any;
}

export const useCreateHandlers = ({
  projectId,
  selectedGroupId,
  selectedSuiteId,
  selectedSuiteName,
  selectedLevel,
  setNewMenuOpen,
  setIsNewTestcaseMenuOpen,
  setExpanded,
  fetchData,
  fetchTestcasesBySuite,
  setAddingSuite,
  setIsAddCasesModalOpen,
  selectedSuite,
}: UseCreateHandlersProps) => {
  // Services
  const suiteService = useMemo(() => new TestSuiteService(), []);
  const testCaseService = useMemo(() => new TestCaseService(), []);

  // Create suite state
  const [isCreateSuiteModalOpen, setIsCreateSuiteModalOpen] = useState(false);
  const [isCreatingSuite, setIsCreatingSuite] = useState(false);
  const [creatingSuiteGroupId, setCreatingSuiteGroupId] = useState<string | null>(null);

  // Create testcase in suite state
  const [isCreateTestcaseInSuiteModalOpen, setIsCreateTestcaseInSuiteModalOpen] = useState(false);
  const [isCreatingTestcaseInSuite, setIsCreatingTestcaseInSuite] = useState(false);
  const [creatingTestcaseDefaultLevel, setCreatingTestcaseDefaultLevel] = useState<number>(1);

  // Click new suite handler
  const handleClickNewSuite = useCallback(() => {
    setNewMenuOpen(false);
    setCreatingSuiteGroupId(selectedGroupId); // Save current group_id
    setIsCreateSuiteModalOpen(true);
  }, [selectedGroupId, setNewMenuOpen]);

  // Close create suite modal handler
  const handleCloseCreateSuiteModal = useCallback(() => {
    if (!isCreatingSuite) {
      setIsCreateSuiteModalOpen(false);
      setCreatingSuiteGroupId(null); // Clear when closing modal
    }
  }, [isCreatingSuite]);

  // Save create suite handler
  const handleSaveCreateSuite = useCallback(async (data: { projectId: string; name: string; description: string; browser_type?: string }) => {
    if (!projectId || isCreatingSuite) return;
    
    try {
      setIsCreatingSuite(true);
      const payload = {
        project_id: projectId,
        name: data.name,
        description: data.description,
        browser_type: data.browser_type,
        group_id: creatingSuiteGroupId || undefined,
      };
      
      const resp = await suiteService.createTestSuite(payload);
      
      if (resp.success) {
        toast.success('Test suite created successfully');
        setIsCreateSuiteModalOpen(false);
        // Expand the selected group if one was selected
        if (creatingSuiteGroupId) {
          setExpanded((prev) => {
            const next = new Set(prev);
            next.add(creatingSuiteGroupId);
            return next;
          });
        }
        // Reload tree to show the new suite
        await fetchData();
        // Clear saved group_id after successful creation
        setCreatingSuiteGroupId(null);
      } else {
        toast.error(resp.error || 'Failed to create test suite. Please try again.');
      }
    } catch (e) {
      toast.error('Failed to create test suite. Please try again.');
    } finally {
      setIsCreatingSuite(false);
    }
  }, [projectId, isCreatingSuite, creatingSuiteGroupId, suiteService, setExpanded, fetchData]);

  // Open create testcase in suite handler
  const handleOpenCreateTestcaseInSuite = useCallback(() => {
    if (!selectedSuiteId) return;
    setIsNewTestcaseMenuOpen(false);
    // Set default level to selected level if available, otherwise 1
    const defaultLevel = selectedLevel !== null ? selectedLevel : 1;
    setCreatingTestcaseDefaultLevel(defaultLevel);
    setIsCreateTestcaseInSuiteModalOpen(true);
  }, [selectedSuiteId, selectedLevel, setIsNewTestcaseMenuOpen]);

  // Open add existed case handler
  const handleOpenAddExistedCase = useCallback(() => {
    if (!selectedSuiteId || !selectedSuite) return;
    setIsNewTestcaseMenuOpen(false);
    setAddingSuite(selectedSuite);
    setIsAddCasesModalOpen(true);
  }, [selectedSuiteId, selectedSuite, setIsNewTestcaseMenuOpen, setAddingSuite, setIsAddCasesModalOpen]);

  // Close create testcase in suite modal handler
  const handleCloseCreateTestcaseInSuiteModal = useCallback(() => {
    if (!isCreatingTestcaseInSuite) {
      setIsCreateTestcaseInSuiteModalOpen(false);
      setCreatingTestcaseDefaultLevel(1);
    }
  }, [isCreatingTestcaseInSuite]);

  // Save create testcase in suite handler
  const handleSaveCreateTestcaseInSuite = useCallback(async (data: { projectId: string; name: string; tag: string; browser_type?: string; level: number }) => {
    if (!projectId || !selectedSuiteId || isCreatingTestcaseInSuite) return;
    
    try {
      setIsCreatingTestcaseInSuite(true);
      
      // 1. Create the testcase
      const createPayload = {
        project_id: projectId,
        name: data.name,
        tag: data.tag || undefined,
        browser_type: data.browser_type || undefined
      };
      
      const createResp = await testCaseService.createTestCase(createPayload);
      
      if (!createResp.success) {
        toast.error(createResp.error || 'Failed to create testcase. Please try again.');
        return;
      }
      
      // 2. Wait a bit to ensure the testcase is created in the database
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 3. Fetch testcases to find the newly created one
      const response = await testCaseService.getTestCases(projectId, 1000, 0);
      if (!response.success || !response.data) {
        toast.error('Failed to find created testcase. Please try again.');
        return;
      }
      
      // 4. Find the newly created testcase by name (most recent one with matching name)
      const newTestcase = response.data.testcases
        .filter(tc => tc.name === data.name)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
      
      if (!newTestcase) {
        toast.error('Failed to find created testcase. Please try again.');
        return;
      }
      
      // 5. Add the testcase to the suite with the specified level
      const addResp = await suiteService.addTestCasesToSuite({
        test_suite_id: selectedSuiteId,
        testcase_ids: [{
          testcase_id: newTestcase.testcase_id,
          level: data.level
        }]
      });
      
      if (addResp.success) {
        // toast.success('Testcase created and added to suite successfully!');
        setIsCreateTestcaseInSuiteModalOpen(false);
        setCreatingTestcaseDefaultLevel(1);
        // Reload testcases in suite
        await fetchTestcasesBySuite(selectedSuiteId, selectedSuiteName);
        // Reload tree to reflect changes
        await fetchData();
      } else {
        toast.error(addResp.error || 'Failed to add testcase to suite. Please try again.');
      }
    } catch (e) {
      toast.error('Failed to create testcase. Please try again.');
    } finally {
      setIsCreatingTestcaseInSuite(false);
    }
  }, [projectId, selectedSuiteId, selectedSuiteName, isCreatingTestcaseInSuite, testCaseService, suiteService, fetchTestcasesBySuite, fetchData]);

  return {
    // Create suite state
    isCreateSuiteModalOpen,
    isCreatingSuite,
    creatingSuiteGroupId,
    // Create suite handlers
    handleClickNewSuite,
    handleCloseCreateSuiteModal,
    handleSaveCreateSuite,
    // Create testcase in suite state
    isCreateTestcaseInSuiteModalOpen,
    isCreatingTestcaseInSuite,
    creatingTestcaseDefaultLevel,
    // Create testcase in suite handlers
    handleOpenCreateTestcaseInSuite,
    handleCloseCreateTestcaseInSuiteModal,
    handleSaveCreateTestcaseInSuite,
    // Add existed case handler
    handleOpenAddExistedCase,
    // Setters for context menu handlers
    setCreatingSuiteGroupId,
    setIsCreateSuiteModalOpen,
  };
};

