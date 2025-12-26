import { useState, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import { TestCaseInSuite } from '../../../types/testsuites';
import { TestCaseService } from '../../../services/testcases';
import { TestSuiteService } from '../../../services/testsuites';

interface EditingTestcase {
  testcase_id: string;
  name: string;
  description: string | undefined;
  browser_type?: string;
  basic_authentication?: { username: string; password: string };
}

interface UseTestcaseHandlersProps {
  projectId: string | undefined;
  selectedSuiteId: string | null;
  selectedSuiteName: string | null;
  fetchTestcasesBySuite: (suiteId: string, suiteName: string) => Promise<void>;
  fetchData: () => Promise<void>;
}

export const useTestcaseHandlers = ({
  projectId,
  selectedSuiteId,
  selectedSuiteName,
  fetchTestcasesBySuite,
  fetchData,
}: UseTestcaseHandlersProps) => {
  // Services
  const testCaseService = useMemo(() => new TestCaseService(), []);
  const suiteService = useMemo(() => new TestSuiteService(), []);

  // Edit testcase state
  const [isEditTestcaseModalOpen, setIsEditTestcaseModalOpen] = useState(false);
  const [editingTestcase, setEditingTestcase] = useState<EditingTestcase | null>(null);
  const [isSavingTestcase, setIsSavingTestcase] = useState(false);
  const [isLoadingTestcaseData, setIsLoadingTestcaseData] = useState(false);

  // Duplicate testcase state
  const [isDuplicateTestcaseModalOpen, setIsDuplicateTestcaseModalOpen] = useState(false);
  const [duplicatingTestcase, setDuplicatingTestcase] = useState<EditingTestcase | null>(null);
  const [duplicatingTestcaseLevel, setDuplicatingTestcaseLevel] = useState<number>(1);
  const [isDuplicatingTestcase, setIsDuplicatingTestcase] = useState(false);
  const [isLoadingDuplicateTestcaseData, setIsLoadingDuplicateTestcaseData] = useState(false);

  // Delete testcase state
  const [isDeleteTestcaseModalOpen, setIsDeleteTestcaseModalOpen] = useState(false);
  const [deletingTestcase, setDeletingTestcase] = useState<TestCaseInSuite | null>(null);
  const [isDeletingTestcase, setIsDeletingTestcase] = useState(false);

  // Edit testcase handlers
  const handleOpenEditTestcase = useCallback(async (testcase: TestCaseInSuite) => {
    if (!testcase || !projectId) return;
    
    try {
      setIsLoadingTestcaseData(true);
      // Load full testcase data from API
      const response = await testCaseService.getTestCases(projectId, 1000, 0);
      if (response.success && response.data) {
        const fullTestcase = response.data.testcases.find(tc => tc.testcase_id === testcase.testcase_id);
        if (fullTestcase) {
          setEditingTestcase({
            testcase_id: fullTestcase.testcase_id,
            name: fullTestcase.name,
            description: fullTestcase.description,
            browser_type: fullTestcase.browser_type,
            basic_authentication: fullTestcase.basic_authentication ? {
              username: fullTestcase.basic_authentication.username || '',
              password: fullTestcase.basic_authentication.password || '',
            } : undefined,
          });
          setIsEditTestcaseModalOpen(true);
        } else {
          toast.error('Testcase not found. Please try again.');
        }
      } else {
        toast.error(response.error || 'Failed to load testcase data. Please try again.');
      }
    } catch (e) {
      toast.error('Failed to load testcase data. Please try again.');
    } finally {
      setIsLoadingTestcaseData(false);
    }
  }, [projectId]);

  const handleSaveEditTestcase = useCallback(async (
    { testcase_id, name, description, basic_authentication, browser_type, actions }:
    { testcase_id: string; name: string; description: string | undefined; basic_authentication?: { username: string; password: string }; browser_type?: string; actions?: any[] }
  ) => {
    if (!testcase_id || isSavingTestcase) return;
    
    try {
      setIsSavingTestcase(true);
      const payload = {
        testcase_id,
        name,
        tag: description || undefined,
        description: description || undefined,
        basic_authentication: basic_authentication || undefined,
        browser_type: browser_type || undefined,
        actions: actions || undefined
      } as any;
      
      const resp = await testCaseService.updateTestCase(payload);
      if (resp.success) {
        // toast.success('Testcase updated successfully!');
        setIsEditTestcaseModalOpen(false);
        setEditingTestcase(null);
        // Reload testcases in suite if the suite is currently selected
        if (selectedSuiteId) {
          await fetchTestcasesBySuite(selectedSuiteId, selectedSuiteName || '');
        }
        // Reload tree to reflect any changes
        await fetchData();
      } else {
        toast.error(resp.error || 'Failed to update testcase. Please try again.');
      }
    } catch (err) {
      toast.error('Failed to update testcase. Please try again.');
    } finally {
      setIsSavingTestcase(false);
    }
  }, [isSavingTestcase, selectedSuiteId, selectedSuiteName, fetchTestcasesBySuite, fetchData]);

  const handleCloseEditTestcaseModal = useCallback(() => {
    if (!isSavingTestcase) {
      setIsEditTestcaseModalOpen(false);
      setEditingTestcase(null);
    }
  }, [isSavingTestcase]);

  // Duplicate testcase handlers
  const handleOpenDuplicateTestcase = useCallback(async (testcase: TestCaseInSuite) => {
    if (!testcase || !projectId) return;
    
    try {
      setIsLoadingDuplicateTestcaseData(true);
      // Save the level of the original testcase
      setDuplicatingTestcaseLevel(testcase.level ?? 1);
      // Load full testcase data from API
      const response = await testCaseService.getTestCases(projectId, 1000, 0);
      if (response.success && response.data) {
        const fullTestcase = response.data.testcases.find(tc => tc.testcase_id === testcase.testcase_id);
        if (fullTestcase) {
          setDuplicatingTestcase({
            testcase_id: fullTestcase.testcase_id,
            name: fullTestcase.name,
            description: fullTestcase.description,
            browser_type: fullTestcase.browser_type,
            basic_authentication: fullTestcase.basic_authentication ? {
              username: fullTestcase.basic_authentication.username || '',
              password: fullTestcase.basic_authentication.password || '',
            } : undefined,
          });
          setIsDuplicateTestcaseModalOpen(true);
        } else {
          toast.error('Testcase not found. Please try again.');
        }
      } else {
        toast.error(response.error || 'Failed to load testcase data. Please try again.');
      }
    } catch (e) {
      toast.error('Failed to load testcase data. Please try again.');
    } finally {
      setIsLoadingDuplicateTestcaseData(false);
    }
  }, [projectId]);

  // Create testcase with actions function for duplicate modal
  const createTestcaseWithActions = useCallback(async (name: string, tag?: string, actions?: any[], basic_authentication?: { username: string; password: string }, browser_type?: string) => {
    if (!projectId) {
      toast.error('Missing project ID');
      return false;
    }
    const payload = { 
      project_id: projectId, 
      name, 
      tag: tag || undefined,
      actions: actions || [],
      basic_authentication: basic_authentication || undefined,
      browser_type: browser_type || undefined
    } as any;
    const resp = await testCaseService.createTestCaseWithActions(payload);
    if (!resp.success) {
      toast.error(resp.error || 'Disconnect from the server. Please try again.');
      return false;
    }
    return true;
  }, [projectId]);

  const handleDuplicateTestcaseSave = useCallback(async (data: { name: string; tag: string; actions: any[]; basic_authentication?: { username: string; password: string }; browser_type?: string }) => {
    if (!selectedSuiteId || isDuplicatingTestcase) return;
    
    try {
      setIsDuplicatingTestcase(true);
      
      // Component DuplicateTestcase already creates the testcase, no need to create again
      // Just need to find the newly created testcase and add it to suite
      
      // Add small delay to ensure testcase has been created
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 1. Fetch testcases to find the newly created testcase
      const response = await testCaseService.getTestCases(projectId || '', 1000, 0);
      if (!response.success || !response.data) {
        toast.error('Failed to find duplicated testcase. Please try again.');
        return;
      }
      
      // 2. Find the newest testcase with matching name (testcase that was just duplicated)
      const newTestcase = response.data.testcases
        .filter(tc => tc.name === data.name)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
      
      if (!newTestcase) {
        toast.error('Failed to find duplicated testcase. Please try again.');
        return;
      }
      
      // 3. Add new testcase to suite with the corresponding level of the original testcase
      const addResp = await suiteService.addTestCasesToSuite({
        test_suite_id: selectedSuiteId,
        testcase_ids: [{
          testcase_id: newTestcase.testcase_id,
          level: duplicatingTestcaseLevel
        }]
      });
      
      if (addResp.success) {
        // toast.success('Testcase duplicated and added to suite successfully!');
        setIsDuplicateTestcaseModalOpen(false);
        setDuplicatingTestcase(null);
        setDuplicatingTestcaseLevel(1);
        // Reload testcases in suite
        if (selectedSuiteId) {
          await fetchTestcasesBySuite(selectedSuiteId, selectedSuiteName || '');
        }
        // Reload tree to reflect changes
        await fetchData();
      } else {
        toast.error(addResp.error || 'Failed to add duplicated testcase to suite. Please try again.');
      }
    } catch (e) {
      toast.error('Failed to duplicate testcase. Please try again.');
    } finally {
      setIsDuplicatingTestcase(false);
    }
  }, [selectedSuiteId, isDuplicatingTestcase, projectId, duplicatingTestcaseLevel, selectedSuiteName, fetchTestcasesBySuite, fetchData]);

  const handleCloseDuplicateTestcaseModal = useCallback(() => {
    if (!isDuplicatingTestcase) {
      setIsDuplicateTestcaseModalOpen(false);
      setDuplicatingTestcase(null);
      setDuplicatingTestcaseLevel(1);
    }
  }, [isDuplicatingTestcase]);

  // Delete testcase handlers
  const handleDeleteTestcase = useCallback(async (testcaseId: string) => {
    if (!testcaseId || !selectedSuiteId || isDeletingTestcase) return;
    
    try {
      setIsDeletingTestcase(true);
      const resp = await suiteService.removeTestCaseFromTestSuite(testcaseId, selectedSuiteId);
      
      if (resp.success) {
        toast.success('Testcase removed from suite successfully');
        setIsDeleteTestcaseModalOpen(false);
        setDeletingTestcase(null);
        // Reload testcases in suite
        if (selectedSuiteId) {
          await fetchTestcasesBySuite(selectedSuiteId, selectedSuiteName || '');
        }
        // Reload tree to reflect changes
        await fetchData();
      } else {
        toast.error(resp.error || 'Failed to remove testcase from suite. Please try again.');
      }
    } catch (e) {
      toast.error('Failed to remove testcase from suite. Please try again.');
    } finally {
      setIsDeletingTestcase(false);
    }
  }, [selectedSuiteId, isDeletingTestcase, selectedSuiteName, fetchTestcasesBySuite, fetchData]);

  const handleCloseDeleteTestcaseModal = useCallback(() => {
    if (!isDeletingTestcase) {
      setIsDeleteTestcaseModalOpen(false);
      setDeletingTestcase(null);
    }
  }, [isDeletingTestcase]);

  // Helper to open delete modal
  const openDeleteModal = useCallback((testcase: TestCaseInSuite) => {
    setDeletingTestcase(testcase);
    setIsDeleteTestcaseModalOpen(true);
  }, []);

  return {
    // Edit testcase state
    isEditTestcaseModalOpen,
    editingTestcase,
    isSavingTestcase,
    isLoadingTestcaseData,
    // Edit testcase handlers
    handleOpenEditTestcase,
    handleSaveEditTestcase,
    handleCloseEditTestcaseModal,
    // Duplicate testcase state
    isDuplicateTestcaseModalOpen,
    duplicatingTestcase,
    duplicatingTestcaseLevel,
    isDuplicatingTestcase,
    isLoadingDuplicateTestcaseData,
    // Duplicate testcase handlers
    handleOpenDuplicateTestcase,
    createTestcaseWithActions,
    handleDuplicateTestcaseSave,
    handleCloseDuplicateTestcaseModal,
    // Delete testcase state
    isDeleteTestcaseModalOpen,
    deletingTestcase,
    isDeletingTestcase,
    // Delete testcase handlers
    handleDeleteTestcase,
    handleCloseDeleteTestcaseModal,
    openDeleteModal,
  };
};

