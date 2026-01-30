import { useState, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import { logErrorAndGetFriendlyMessage } from '../../../../shared/utils/friendlyError';
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
  fetchTestcasesBySuite: (suiteId: string, suiteName: string) => Promise<void>;
  setAddingSuite: React.Dispatch<React.SetStateAction<any>>;
  setIsAddCasesModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectedSuite: any;
  addSuiteToTree: (suite: any, groupId?: string | null) => void;
  refreshRootGroups: () => Promise<void>;
  refreshGroupChildren: (groupId: string) => Promise<void>;
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
  fetchTestcasesBySuite,
  setAddingSuite,
  setIsAddCasesModalOpen,
  selectedSuite,
  addSuiteToTree,
  refreshRootGroups,
  refreshGroupChildren,
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
        const rawData = (resp.data as any)?.data || (resp.data as any);
        const createdSuiteId = rawData?.test_suite_id || rawData?.id;
        if (createdSuiteId) {
          addSuiteToTree({
            test_suite_id: createdSuiteId,
            name: data.name,
            description: data.description,
            browser_type: data.browser_type,
            group_id: creatingSuiteGroupId || null,
            project_id: projectId || '',
            test_passed: 0,
            test_failed: 0,
            passed_rate: '0',
            number_testcase: 0,
            histories: null,
            progress: null,
            created_at: new Date().toISOString(),
          }, creatingSuiteGroupId || null);
        } else if (creatingSuiteGroupId) {
          await refreshGroupChildren(creatingSuiteGroupId);
        } else {
          await refreshRootGroups();
        }
        // Clear saved group_id after successful creation
        setCreatingSuiteGroupId(null);
      } else {
        const message = logErrorAndGetFriendlyMessage(
          '[useCreateHandlers] createSuite',
          resp.error,
          'Failed to create test suite. Please try again.'
        );
        toast.error(message);
      }
    } catch (e) {
      const message = logErrorAndGetFriendlyMessage(
        '[useCreateHandlers] createSuite',
        e,
        'Failed to create test suite. Please try again.'
      );
      toast.error(message);
    } finally {
      setIsCreatingSuite(false);
    }
  }, [
    projectId,
    isCreatingSuite,
    creatingSuiteGroupId,
    suiteService,
    setExpanded,
    addSuiteToTree,
    refreshRootGroups,
    refreshGroupChildren,
  ]);

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

      const payload = {
        project_id: projectId,
        test_suite_id: selectedSuiteId,
        name: data.name,
        tag: data.tag || undefined,
        browser_type: data.browser_type || undefined,
        level: data.level,
      };

      const resp = await testCaseService.createTestCaseAndAddToSuite(payload);

      if (resp.success) {
        setIsCreateTestcaseInSuiteModalOpen(false);
        setCreatingTestcaseDefaultLevel(1);
        await fetchTestcasesBySuite(selectedSuiteId, selectedSuiteName);
      } else {
        const message = logErrorAndGetFriendlyMessage(
          '[useCreateHandlers] createTestcaseInSuite',
          resp.error,
          'Failed to create testcase. Please try again.'
        );
        toast.error(message);
      }
    } catch (e) {
      const message = logErrorAndGetFriendlyMessage(
        '[useCreateHandlers] createTestcaseInSuite',
        e,
        'Failed to create testcase. Please try again.'
      );
      toast.error(message);
    } finally {
      setIsCreatingTestcaseInSuite(false);
    }
  }, [projectId, selectedSuiteId, selectedSuiteName, isCreatingTestcaseInSuite, testCaseService, fetchTestcasesBySuite]);

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

