import { useState, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import { logErrorAndGetFriendlyMessage } from '../../../../shared/utils/friendlyError';
import { TestCaseInSuite } from '../../../types/testsuites';
import { TestCaseService } from '../../../services/testcases';
import { TestSuiteService } from '../../../services/testsuites';
import { ActionService } from '../../../services/actions';
import { TestCaseDataVersion } from '../../../types/actions';

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
}

export const useTestcaseHandlers = ({
  projectId,
  selectedSuiteId,
  selectedSuiteName,
  fetchTestcasesBySuite,
}: UseTestcaseHandlersProps) => {
  // Services
  const testCaseService = useMemo(() => new TestCaseService(), []);
  const suiteService = useMemo(() => new TestSuiteService(), []);
  const actionService = useMemo(() => new ActionService(), []);

  // Edit testcase state
  const [isEditTestcaseModalOpen, setIsEditTestcaseModalOpen] = useState(false);
  const [editingTestcase, setEditingTestcase] = useState<EditingTestcase | null>(null);
  const [isSavingTestcase, setIsSavingTestcase] = useState(false);

  // Duplicate testcase state
  const [isDuplicateTestcaseModalOpen, setIsDuplicateTestcaseModalOpen] = useState(false);
  const [duplicatingTestcase, setDuplicatingTestcase] = useState<EditingTestcase | null>(null);
  const [duplicatingTestcaseLevel, setDuplicatingTestcaseLevel] = useState<number>(1);
  const [isDuplicatingTestcase, setIsDuplicatingTestcase] = useState(false);

  // Delete testcase state
  const [isDeleteTestcaseModalOpen, setIsDeleteTestcaseModalOpen] = useState(false);
  const [deletingTestcase, setDeletingTestcase] = useState<TestCaseInSuite | null>(null);
  const [isDeletingTestcase, setIsDeletingTestcase] = useState(false);

  // Edit testcase handlers
  const handleOpenEditTestcase = useCallback((testcase: TestCaseInSuite) => {
    if (!testcase || !projectId) return;

    /* console.log('[useTestcaseHandlers] Opening EditTestcase modal for testcase:', testcase); */
    
    // Sử dụng trực tiếp dữ liệu từ prop, không cần fetch API
    setEditingTestcase({
      testcase_id: testcase.testcase_id,
      name: testcase.name,
      description: testcase.description,
      browser_type: testcase.browser_type,
      basic_authentication: testcase.basic_authentication ? {
        username: testcase.basic_authentication.username || '',
        password: testcase.basic_authentication.password || '',
      } : undefined,
    });
    setIsEditTestcaseModalOpen(true);
  }, [projectId]);

  const handleSaveEditTestcase = useCallback(async (
    { testcase_id, name, description, basic_authentication, browser_type, actions, testcase_data_versions }:
    { testcase_id: string; name: string; description: string | undefined; basic_authentication?: { username: string; password: string }; browser_type?: string; actions?: any[]; testcase_data_versions?: TestCaseDataVersion[] }
  ) => {
    if (!testcase_id || isSavingTestcase) return;
    
    try {
      setIsSavingTestcase(true);
      
      // 1) Save actions and testcase_data_versions using batchCreateActions if actions are provided
      if (actions && actions.length > 0) {
        const actionResp = await actionService.batchCreateActions(
          actions,
          testcase_data_versions,
          projectId
        );
        
        if (!actionResp.success) {
          toast.error(actionResp.error || 'Failed to save actions. Please try again.');
          return;
        }
      }
      
      // 2) Update testcase info (name, description, basic_auth, browser_type)
      const payload = {
        testcase_id,
        name,
        tag: description || undefined,
        description: description || undefined,
        basic_authentication: basic_authentication || undefined,
        browser_type: browser_type || undefined,
      } as any;
      
      const resp = await testCaseService.updateTestCase(payload, projectId);
      if (resp.success) {
        // toast.success('Testcase updated successfully!');
        setIsEditTestcaseModalOpen(false);
        setEditingTestcase(null);
        // Reload testcases in suite if the suite is currently selected
        if (selectedSuiteId) {
          await fetchTestcasesBySuite(selectedSuiteId, selectedSuiteName || '');
        }
      } else {
        const message = logErrorAndGetFriendlyMessage(
          '[useTestcaseHandlers] updateTestcase',
          resp.error,
          'Failed to update testcase. Please try again.'
        );
        toast.error(message);
      }
    } catch (err) {
      toast.error('Failed to update testcase. Please try again.');
    } finally {
      setIsSavingTestcase(false);
    }
  }, [isSavingTestcase, selectedSuiteId, selectedSuiteName, fetchTestcasesBySuite, projectId, actionService, testCaseService]);

  const handleCloseEditTestcaseModal = useCallback(() => {
    if (!isSavingTestcase) {
      setIsEditTestcaseModalOpen(false);
      setEditingTestcase(null);
    }
  }, [isSavingTestcase]);

  // Duplicate testcase handlers
  const handleOpenDuplicateTestcase = useCallback((testcase: TestCaseInSuite) => {
    if (!testcase || !projectId) return;
    
    // Save the level of the original testcase
    setDuplicatingTestcaseLevel(testcase.level ?? 1);
    // Sử dụng trực tiếp dữ liệu từ prop, không cần fetch API
    setDuplicatingTestcase({
      testcase_id: testcase.testcase_id,
      name: testcase.name,
      description: testcase.description,
      browser_type: testcase.browser_type,
      basic_authentication: testcase.basic_authentication ? {
        username: testcase.basic_authentication.username || '',
        password: testcase.basic_authentication.password || '',
      } : undefined,
    });
    setIsDuplicateTestcaseModalOpen(true);
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
      const message = logErrorAndGetFriendlyMessage(
        '[useTestcaseHandlers] addTestcaseToSuite',
        resp.error,
        'Unable to connect to the server. Please try again.'
      );
      toast.error(message);
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
      } else {
        toast.error(addResp.error || 'Failed to add duplicated testcase to suite. Please try again.');
      }
    } catch (e) {
      toast.error('Failed to duplicate testcase. Please try again.');
    } finally {
      setIsDuplicatingTestcase(false);
    }
  }, [selectedSuiteId, isDuplicatingTestcase, projectId, duplicatingTestcaseLevel, selectedSuiteName, fetchTestcasesBySuite]);

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
        // Đóng các modal đang mở với testcase này
        if (editingTestcase?.testcase_id === testcaseId) {
          /* console.info('[useTestcaseHandlers] Closing EditTestcase modal for deleted testcase'); */
          setIsEditTestcaseModalOpen(false);
          setEditingTestcase(null);
        }
        if (duplicatingTestcase?.testcase_id === testcaseId) {
          /* console.info('[useTestcaseHandlers] Closing DuplicateTestcase modal for deleted testcase'); */
          setIsDuplicateTestcaseModalOpen(false);
          setDuplicatingTestcase(null);
        }
        
        // Đóng recorder window nếu đang mở với testcase này
        try {
          const screenHandleAPI = (window as any)?.screenHandleAPI;
          if (screenHandleAPI?.closeRecorder) {
            const closeResult = await screenHandleAPI.closeRecorder();
            if (closeResult?.success) {
              /* console.info('[useTestcaseHandlers] Closed recorder window for deleted testcase'); */
            }
          }
        } catch (e) {
          /* console.error('[useTestcaseHandlers] Failed to close recorder window:', e); */
        }
        
        toast.success('Testcase removed from suite successfully');
        setIsDeleteTestcaseModalOpen(false);
        setDeletingTestcase(null);
        // Reload testcases in suite
        if (selectedSuiteId) {
          await fetchTestcasesBySuite(selectedSuiteId, selectedSuiteName || '');
        }
      } else {
        const message = logErrorAndGetFriendlyMessage(
          '[useTestcaseHandlers] removeTestcaseFromSuite',
          resp.error,
          'Failed to remove testcase from suite. Please try again.'
        );
        toast.error(message);
      }
    } catch (e) {
      toast.error('Failed to remove testcase from suite. Please try again.');
    } finally {
      setIsDeletingTestcase(false);
    }
  }, [selectedSuiteId, isDeletingTestcase, selectedSuiteName, fetchTestcasesBySuite, editingTestcase, duplicatingTestcase]);

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
    // Edit testcase handlers
    handleOpenEditTestcase,
    handleSaveEditTestcase,
    handleCloseEditTestcaseModal,
    // Duplicate testcase state
    isDuplicateTestcaseModalOpen,
    duplicatingTestcase,
    duplicatingTestcaseLevel,
    isDuplicatingTestcase,
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

