import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Header from '../../components/header/Header';
import Footer from '../../components/footer/Footer';
import Breadcrumb from '../../components/breadcumb/Breadcrumb';
import SidebarNavigator from '../../components/sidebar_navigator/SidebarNavigator';
import { GroupService } from '../../services/group';
import { TestSuiteService } from '../../services/testsuites';
import { ProjectService } from '../../services/projects';
import { GroupSuiteItem, GroupTreeWithSuitesResponse } from '../../types/group';
import { TestCaseInSuite } from '../../types/testsuites';
import DeleteSuite from '../../components/group/deleteSuite';
import EditSuite from '../../components/group/editSuite';
import AddTestcasesToSuite from '../../components/testsuite/add_testcase_to_suite/AddTestcasesToSuite';
import ViewTestcaseEvidence from '../../components/testcase/view_testcase_evidence/ViewTestcaseEvidence';
import EditTestcase from '../../components/testcase/edit_testcase/EditTestcase';
import DuplicateTestcase from '../../components/testcase/duplicate_testcase/DuplicateTestcase';
import DeleteTestcase from '../../components/testcase/delete_testcase/DeleteTestcase';
import { TestCaseService } from '../../services/testcases';
import CreateTestSuite from '../../components/testsuite/create_test_suite/CreateTestSuite';
import CreateTestcaseInSuite from '../../components/testcase/create_testcase_in_suite/CreateTestcaseInSuite';
import InstallBrowserModal from '../../components/browser/install_browser/InstallBrowserModal';
import './SuitesManager.css';
import { toast } from 'react-toastify';
import { BrowserType } from '../../types/testcases';
import {
  TreeGroup,
  normalizeGroup,
  extractUngroupSuites,
  formatDate,
  formatBrowserType,
  formatPassRate,
  sortTestcases as sortTestcasesUtil,
} from './utils/suitesManagerUtils';
import {
  filterNode,
} from './utils/treeOperations';
import { useBrowserHandlers } from './hooks/useBrowserHandlers';
import { useDragAndDrop } from './hooks/useDragAndDrop';
import { usePanelResize, useColumnResize, useRowResize } from './hooks/useResizeHandlers';
import { useContextMenuHandlers } from './hooks/useContextMenuHandlers';
import { useTestcaseHandlers } from './hooks/useTestcaseHandlers';
import { useSuiteHandlers } from './hooks/useSuiteHandlers';
import { useGroupHandlers } from './hooks/useGroupHandlers';
import { useCreateHandlers } from './hooks/useCreateHandlers';
import { useColumnSort } from './hooks/useColumnSort';
import SuitesTree from './components/SuitesTree';
import LoadingSpinner from './components/LoadingSpinner';
import EmptyState from './components/EmptyState';
import TestcasesTableHeader from './components/TestcasesTableHeader';
import TestcaseRow from './components/TestcaseRow';
import TestcasesFilter from './components/TestcasesFilter';
import TestcasesPagination from './components/TestcasesPagination';
import RightPanelHeader from './components/RightPanelHeader';
import TestcaseContextMenu from './components/TestcaseContextMenu';
import SuiteContextMenu from './components/SuiteContextMenu';
import GroupContextMenu from './components/GroupContextMenu';
import DeleteGroupModal from './components/DeleteGroupModal';
import LoadingOverlay from './components/LoadingOverlay';

const SuitesManager: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const projectData = { projectId, projectName: (location.state as { projectName?: string } | null)?.projectName };

  const [resolvedProjectName, setResolvedProjectName] = useState<string>(projectData.projectName || 'Project');
  const [groups, setGroups] = useState<TreeGroup[]>([]);
  const [rootSuites, setRootSuites] = useState<GroupSuiteItem[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isLoadingTree, setIsLoadingTree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  
  // Group handlers state is now managed by useGroupHandlers hook

  // Testcases panel state
  const [selectedSuiteId, setSelectedSuiteId] = useState<string | null>(null);
  const [selectedSuiteName, setSelectedSuiteName] = useState<string>('');
  const [selectedSuite, setSelectedSuite] = useState<GroupSuiteItem | null>(null);
  const [testcases, setTestcases] = useState<TestCaseInSuite[]>([]);
  const [isLoadingTestcases, setIsLoadingTestcases] = useState(false);
  const [testcasesError, setTestcasesError] = useState<string | null>(null);
  const [testcasesSearchText, setTestcasesSearchText] = useState('');
  const [expandedTestcaseLevels, setExpandedTestcaseLevels] = useState<Set<number>>(new Set());
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  
  // Filter state
  const [selectedOrderFilter, setSelectedOrderFilter] = useState<number | null>(null);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string | null>(null);
  const [selectedBrowserFilter, setSelectedBrowserFilter] = useState<string | null>(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(20);
  
  // Evidence modal state
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
  const [viewingTestcase, setViewingTestcase] = useState<TestCaseInSuite | null>(null);
  
  const [isNewTestcaseMenuOpen, setIsNewTestcaseMenuOpen] = useState(false);
  
  // Browser installation modal state
  const [isInstallBrowserModalOpen, setIsInstallBrowserModalOpen] = useState(false);
  const [pendingRecorderTestcaseId, setPendingRecorderTestcaseId] = useState<string | null>(null);
  const [isInstallingBrowsers, setIsInstallingBrowsers] = useState(false);
  const [installProgress, setInstallProgress] = useState<{ browser: string; progress: number; status: string } | null>(null);
  
  // Change level submenu ref
  const changeLevelInputRef = useRef<HTMLInputElement | null>(null);

  // Refs to store selected suite values without triggering fetchData reload
  const selectedSuiteIdRef = useRef<string | null>(null);
  const selectedSuiteNameRef = useRef<string>('');

  // Resize state
  const [leftPanelWidth, setLeftPanelWidth] = useState<number | null>(null);
  const leftPanelRef = useRef<HTMLDivElement | null>(null);

  // Table resize state
  const [columnWidths, setColumnWidths] = useState<{
    name: number;
    description: number;
    status: number;
    browser: number;
    order: number;
    updated: number;
  }>({
    name: 200,
    description: 200,
    status: 120,
    browser: 120,
    order: 85,
    updated: 150,
  });
  const [rowHeights, setRowHeights] = useState<Map<string, number>>(new Map());

  const sidebarItems = useMemo(() => ([
    { id: 'suites-manager', label: 'Test Manager', path: `/suites-manager/${projectId}`, isActive: true },
    { id: 'testcases', label: 'Testcases', path: `/testcases/${projectId}`, isActive: false },
    { id: 'test-suites', label: 'Test Suites', path: `/test-suites/${projectId}`, isActive: false },
    { id: 'browser-storage', label: 'Browser Storage', path: `/browser-storage/${projectId}`, isActive: false },
    { id: 'databases', label: 'Databases', path: `/databases/${projectId}`, isActive: false },
    { id: 'queries', label: 'Queries', path: `/queries/${projectId}`, isActive: false },
    { id: 'variables', label: 'Variables', path: `/variables/${projectId}`, isActive: false },
    { id: 'change-log', label: 'Activities', path: `/change-log/${projectId}`, isActive: false }
  ]), [projectId]);

  const breadcrumbItems = [
    { label: 'Projects', path: '/dashboard', isActive: false },
    { label: resolvedProjectName, path: `/suites-manager/${projectId}`, isActive: true },
  ];

  const groupService = useMemo(() => new GroupService(), []);
  const suiteService = useMemo(() => new TestSuiteService(), []);
  const testCaseService = useMemo(() => new TestCaseService(), []);
  const projectService = useMemo(() => new ProjectService(), []);

  // Browser handlers hook
  const {
    checkBrowserInstalled,
    openRecorderAfterCheck,
    handleOpenRecorder,
    handleInstallBrowsers,
  } = useBrowserHandlers({
    projectId,
    testcases,
    pendingRecorderTestcaseId,
    setPendingRecorderTestcaseId,
    setIsInstallBrowserModalOpen,
    setIsInstallingBrowsers,
    setInstallProgress,
  });

  useEffect(() => {
    const loadProjectName = async () => {
      if (!projectId) return;
      if (projectData.projectName) {
        setResolvedProjectName(projectData.projectName);
        return;
      }
      const resp = await projectService.getProjectById(projectId);
      if (resp.success && resp.data) {
        setResolvedProjectName((resp.data as any).name || 'Project');
      }
    };
    loadProjectName();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Keep refs in sync with state
  useEffect(() => {
    selectedSuiteIdRef.current = selectedSuiteId;
    selectedSuiteNameRef.current = selectedSuiteName;
  }, [selectedSuiteId, selectedSuiteName]);

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    const previousSuiteId = selectedSuiteIdRef.current;
    const previousSuiteName = selectedSuiteNameRef.current;
    try {
      setIsLoadingTree(true);
      setError(null);
      const treeResp = await groupService.getTreeWithSuitesByProject(projectId);

      if (treeResp.success && treeResp.data) {
        const raw = treeResp.data as any;
        const items = (raw as GroupTreeWithSuitesResponse)?.items || raw;
        const list: TreeGroup[] = Array.isArray(items) ? items : [items];
        const normalized = list.map(normalizeGroup);
        const rootGroups = normalized.filter((g) => !g.parent_group_id);
        const newGroups = rootGroups.length ? rootGroups : normalized;
        setGroups(newGroups);

        const ungroup = extractUngroupSuites(raw, projectId);
        setRootSuites(ungroup);

        // Preserve selected suite if it still exists
        if (previousSuiteId) {
          // Inline find suite logic to avoid circular dependency
          let foundSuite: GroupSuiteItem | null = null;
          const rootSuite = ungroup.find((s) => s.test_suite_id === previousSuiteId);
          if (rootSuite) {
            foundSuite = rootSuite;
          } else {
            // Check in groups
            const findInGroups = (nodes: TreeGroup[]): GroupSuiteItem | null => {
              for (const g of nodes) {
                const suite = (g.suites || []).find((s) => s.test_suite_id === previousSuiteId);
                if (suite) return suite;
                const found = findInGroups(g.children || []);
                if (found) return found;
              }
              return null;
            };
            foundSuite = findInGroups(newGroups);
          }

          if (foundSuite) {
            setSelectedSuiteId(previousSuiteId);
            setSelectedSuiteName(previousSuiteName || foundSuite.name);
            setSelectedSuite(foundSuite);
            // Reload testcases for the preserved suite (using suiteService directly to avoid circular dependency)
            // Set loading state for testcases only, not tree
            setIsLoadingTestcases(true);
            suiteService.getTestCasesBySuite({ test_suite_id: previousSuiteId })
              .then((resp) => {
                console.log('resp', resp);
                if (resp.success && resp.data) {
                  setTestcases(resp.data.testcases || []);
                  // Don't auto-select level - show all testcases by default
                  // Reset selectedLevel to null when reloading data
                  setSelectedLevel(null);
                }
              })
              .catch(() => {
                // Silently fail - user can click again to reload
              })
              .finally(() => {
                setIsLoadingTestcases(false);
              });
          } else {
            // Suite no longer exists, clear selection
            setSelectedSuiteId(null);
            setSelectedSuiteName('');
            setSelectedSuite(null);
            setTestcases([]);
          }
        }
      } else {
        setGroups([]);
        setRootSuites([]);
        if (treeResp.error) {
          setError(treeResp.error);
          toast.error(treeResp.error);
        }
        // Clear selection on error
        if (previousSuiteId) {
          setSelectedSuiteId(null);
          setSelectedSuiteName('');
          setSelectedSuite(null);
          setTestcases([]);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'An error occurred';
      setError(msg);
      toast.error(msg);
      setGroups([]);
      setRootSuites([]);
      // Clear selection on error
      if (previousSuiteId) {
        setSelectedSuiteId(null);
        setSelectedSuiteName('');
        setSelectedSuite(null);
        setTestcases([]);
      }
    } finally {
      setIsLoadingTree(false);
    }
  }, [groupService, projectId, suiteService]);

  // Tree operations are now imported from utils/treeOperations.ts

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Load column widths and row heights from localStorage on mount
  useEffect(() => {
    try {
      const savedColumnWidths = localStorage.getItem('testcases-column-widths');
      if (savedColumnWidths) {
        const parsed = JSON.parse(savedColumnWidths);
        setColumnWidths({
          name: parsed.name || 200,
          description: parsed.description || 200,
          status: parsed.status || 120,
          browser: parsed.browser || 120,
          order: parsed.order || 85,
          updated: parsed.updated || 150,
        });
      }

      const savedRowHeights = localStorage.getItem('testcases-row-heights');
      if (savedRowHeights) {
        const parsed = JSON.parse(savedRowHeights);
        const heightsMap = new Map<string, number>();
        Object.entries(parsed).forEach(([key, value]) => {
          heightsMap.set(key, value as number);
        });
        setRowHeights(heightsMap);
      }
    } catch (e) {
      console.error('Failed to load table resize settings from localStorage:', e);
    }
  }, []);

  // Save column widths to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem('testcases-column-widths', JSON.stringify(columnWidths));
    } catch (e) {
      console.error('Failed to save column widths to localStorage:', e);
    }
  }, [columnWidths]);

  // Save row heights to localStorage when they change
  useEffect(() => {
    try {
      const heightsObj: Record<string, number> = {};
      rowHeights.forEach((value, key) => {
        heightsObj[key] = value;
      });
      localStorage.setItem('testcases-row-heights', JSON.stringify(heightsObj));
    } catch (e) {
      console.error('Failed to save row heights to localStorage:', e);
    }
  }, [rowHeights]);

  // Set initial width to minimum width on mount
  useEffect(() => {
    if (leftPanelWidth === null && leftPanelRef.current) {
      // Use minimum width (300px) instead of percentage ratio
      const initialWidth = 300;
      setLeftPanelWidth(initialWidth);
    }
  }, [leftPanelWidth]);

  // Context menu handlers are now imported from hooks/useContextMenuHandlers.ts
  // Group handlers are now imported from hooks/useGroupHandlers.ts

  const fetchTestcasesBySuite = useCallback(async (suiteId: string, suiteName: string) => {
    if (!suiteId) return;
    try {
      setIsLoadingTestcases(true);
      setTestcasesError(null);
      const resp = await suiteService.getTestCasesBySuite({ test_suite_id: suiteId });
      if (resp.success && resp.data) {
        setTestcases(resp.data.testcases || []);
        // Don't auto-select any level - show all testcases by default
        // If a level is already selected, ensure it is expanded
        if (selectedLevel !== null) {
          setExpandedTestcaseLevels((prev) => {
            const next = new Set(prev);
            next.add(selectedLevel);
            return next;
          });
        }
      } else {
        setTestcases([]);
        setTestcasesError(resp.error || 'Failed to load testcases');
        toast.error(resp.error || 'Failed to load testcases');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'An error occurred while loading testcases';
      setTestcasesError(msg);
      setTestcases([]);
      toast.error(msg);
    } finally {
      setIsLoadingTestcases(false);
    }
  }, [suiteService, selectedLevel]);

  // Reload testcases when recorder window is closed
  useEffect(() => {
    const unsubscribe = (window as any)?.screenHandleAPI?.onRecorderClosed?.(async () => {
      if (selectedSuiteId) {
        await fetchTestcasesBySuite(selectedSuiteId, selectedSuiteName);
      }
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [selectedSuiteId, selectedSuiteName, fetchTestcasesBySuite]);

  // Drag and drop handlers hook (must be after fetchData and fetchTestcasesBySuite are defined)
  const {
    draggedSuite,
    isDragging,
    dragOverGroupId,
    draggedGroup,
    isUpdatingTestcaseLevel,
    handleSuiteDragStart,
    handleSuiteDragEnd,
    handleGroupDragStart,
    handleGroupDragEnd,
    handleGroupDragOver,
    handleGroupDragLeave,
    handleGroupDrop,
    handleRootDragOver,
    handleRootDragLeave,
    handleRootDrop,
    updateTestcaseLevel,
  } = useDragAndDrop({
    groups,
    expanded,
    setExpanded,
    suiteService,
    groupService,
    fetchData,
    selectedSuiteId,
    selectedSuiteName,
    fetchTestcasesBySuite,
  });

  // Resize handlers hooks
  const { isResizing, handleResizeStart } = usePanelResize({
    leftPanelRef,
    leftPanelWidth,
    setLeftPanelWidth,
  });

  const { handleColumnResizeStart } = useColumnResize({
    columnWidths,
    setColumnWidths,
  });

  const { isResizingRow, handleRowResizeStart } = useRowResize({
    rowHeights,
    setRowHeights,
  });

  // Group handlers hook (must be after fetchData is defined)
  const {
    // Create group state
    isCreatingGroup,
    creatingGroupName,
    creatingGroupError,
    isSavingGroup,
    creatingParentId,
    createInputRef,
    // Create group handlers
    handleStartCreateGroup,
    validateGroupName,
    finishCreateGroup,
    cancelCreateGroup,
    handleCreateInputKeyDown,
    // Rename group state
    renamingGroupId,
    renamingGroupName,
    renamingGroupError,
    isRenamingGroup,
    renameInputRef,
    // Rename group handlers
    validateRenameGroupName,
    finishRenameGroup,
    cancelRenameGroup,
    handleRenameInputKeyDown,
    // Delete group state
    deletingGroup,
    isDeletingGroup,
    // Delete group handlers
    handleDeleteGroup,
    // Toggle and click handlers
    handleToggle,
    handleGroupClick,
    // Setters for state management
    setCreatingGroupName,
    setRenamingGroupName,
    setDeletingGroup,
    // Additional setters for context menu handlers
    setCreatingParentId,
    setIsCreatingGroup,
    setCreatingGroupError,
    setRenamingGroupId,
    setRenamingGroupError,
  } = useGroupHandlers({
    projectId,
    groups,
    setGroups,
    rootSuites,
    setRootSuites,
    expanded,
    setExpanded,
    selectedGroupId,
    setSelectedGroupId,
    fetchData,
  });

  const {
    // Edit testcase state
    isEditTestcaseModalOpen,
    editingTestcase,
    isSavingTestcase,
    isLoadingTestcaseData,
    handleOpenEditTestcase,
    handleSaveEditTestcase,
    handleCloseEditTestcaseModal,
    isDuplicateTestcaseModalOpen,
    duplicatingTestcase,
    duplicatingTestcaseLevel,
    isDuplicatingTestcase,
    isLoadingDuplicateTestcaseData,
    handleOpenDuplicateTestcase,
    createTestcaseWithActions,
    handleDuplicateTestcaseSave,
    handleCloseDuplicateTestcaseModal,
    isDeleteTestcaseModalOpen,
    deletingTestcase,
    isDeletingTestcase,
    handleDeleteTestcase,
    handleCloseDeleteTestcaseModal,
    openDeleteModal,
  } = useTestcaseHandlers({
    projectId,
    selectedSuiteId,
    selectedSuiteName,
    fetchTestcasesBySuite,
    fetchData,
  });

  const {
    sortColumn,
    sortDirection,
    handleColumnSort,
    setSortColumn,
    setSortDirection,
  } = useColumnSort('updated', 'desc');

  const {
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
    setDeletingSuite: setDeletingSuiteFromHook,
    setIsDeleteSuiteModalOpen: setIsDeleteSuiteModalOpenFromHook,
    setEditingSuite: setEditingSuiteFromHook,
    setIsEditSuiteModalOpen: setIsEditSuiteModalOpenFromHook,
    setAddingSuite: setAddingSuiteFromHook,
    setIsAddCasesModalOpen: setIsAddCasesModalOpenFromHook,
    setIsRunningSuite,
  } = useSuiteHandlers({
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
  });

  const {
    isCreateSuiteModalOpen,
    isCreatingSuite,
    creatingSuiteGroupId,
    handleClickNewSuite,
    handleCloseCreateSuiteModal,
    handleSaveCreateSuite,
    isCreateTestcaseInSuiteModalOpen,
    isCreatingTestcaseInSuite,
    creatingTestcaseDefaultLevel,
    handleOpenCreateTestcaseInSuite,
    handleCloseCreateTestcaseInSuiteModal,
    handleSaveCreateTestcaseInSuite,
    handleOpenAddExistedCase,
    setCreatingSuiteGroupId,
    setIsCreateSuiteModalOpen,
  } = useCreateHandlers({
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
    setAddingSuite: setAddingSuiteFromHook,
    setIsAddCasesModalOpen: setIsAddCasesModalOpenFromHook,
    selectedSuite,
  });

  // Focus input when creating/renaming group (must be after useGroupHandlers hook)
  useEffect(() => {
    if (isCreatingGroup) {
      const t = setTimeout(() => {
        createInputRef.current?.focus();
        createInputRef.current?.select();
      }, 0);
      return () => clearTimeout(t);
    }
  }, [isCreatingGroup]);

  useEffect(() => {
    if (renamingGroupId) {
      const t = setTimeout(() => {
        renameInputRef.current?.focus();
        renameInputRef.current?.select();
      }, 0);
      return () => clearTimeout(t);
    }
  }, [renamingGroupId]);

  // Set up progress listener on mount
  useEffect(() => {
    const playwrightAPI = (window as any).playwrightAPI || (window as any).electronAPI?.playwright;
    if (playwrightAPI?.onInstallProgress) {
      const unsubscribe = playwrightAPI.onInstallProgress((progress: { browser: string; progress: number; status: string }) => {
        if (isInstallingBrowsers) {
          setInstallProgress(progress);
        }
      });
      return unsubscribe;
    }
  }, [isInstallingBrowsers]);

  const handleSidebarNavigate = (path: string) => navigate(path);
  const handleBreadcrumbNavigate = (path: string) => navigate(path);

  const toggleNewMenu = () => setNewMenuOpen((prev) => !prev);

  const handleStartCreateGroupWrapper = () => {
    setNewMenuOpen(false);
    handleStartCreateGroup();
  };

  const filteredGroups = useMemo(() => {
    if (!searchText.trim()) return groups;
    const filtered = groups.map((node) => filterNode(node, searchText)).filter(Boolean) as TreeGroup[];
    return filtered;
  }, [groups, searchText]);

  const filteredRootSuites = useMemo(() => {
    if (!searchText.trim()) return rootSuites;
    const q = searchText.toLowerCase();
    return rootSuites.filter((s) => (s.name || '').toLowerCase().includes(q));
  }, [rootSuites, searchText]);

  // Group testcases by level
  const groupTestcasesByLevel = useMemo(() => {
    const grouped: Map<number, TestCaseInSuite[]> = new Map();
    testcases.forEach((tc) => {
      const level = tc.level ?? 0;
      if (!grouped.has(level)) {
        grouped.set(level, []);
      }
      grouped.get(level)!.push(tc);
    });
    return grouped;
  }, [testcases]);

  // Filter testcases by search text
  const filteredGroupedTestcases = useMemo(() => {
    if (!testcasesSearchText.trim()) return groupTestcasesByLevel;
    const q = testcasesSearchText.toLowerCase();
    const filtered: Map<number, TestCaseInSuite[]> = new Map();
    groupTestcasesByLevel.forEach((cases, level) => {
      const filteredCases = cases.filter((tc) =>
        (tc.name || '').toLowerCase().includes(q)
      );
      if (filteredCases.length > 0) {
        filtered.set(level, filteredCases);
      }
    });
    return filtered;
  }, [groupTestcasesByLevel, testcasesSearchText]);

  // Get sorted levels
  const sortedLevels = useMemo(() => {
    return Array.from(filteredGroupedTestcases.keys()).sort((a, b) => a - b);
  }, [filteredGroupedTestcases]);

  // Sort testcases function
  const sortTestcases = useCallback((testcases: TestCaseInSuite[], column: string | null, direction: 'asc' | 'desc'): TestCaseInSuite[] => {
    return sortTestcasesUtil(testcases, column, direction, formatBrowserType);
  }, []);

  // Helper function to normalize status for comparison
  const normalizeStatus = (status: string | null | undefined): string => {
    if (!status) return 'draft';
    const normalized = status.toLowerCase();
    if (normalized === 'running') return 'Running';
    if (normalized === 'passed' || normalized === 'success') return 'Passed';
    if (normalized === 'failed' || normalized === 'error') return 'Failed';
    if (normalized === 'draft') return 'Draft';
    return 'Draft';
  };

  // Get displayed testcases: apply all filters using AND logic
  const displayedTestcases = useMemo(() => {
    let filtered: TestCaseInSuite[] = testcases;
    
    // Apply search text filter
    if (testcasesSearchText.trim()) {
      const q = testcasesSearchText.toLowerCase();
      filtered = filtered.filter((tc) =>
        (tc.name || '').toLowerCase().includes(q)
      );
    }
    
    // Apply Order filter
    if (selectedOrderFilter !== null) {
      filtered = filtered.filter((tc) => (tc.level ?? 0) === selectedOrderFilter);
    }
    
    // Apply Status filter
    if (selectedStatusFilter !== null) {
      filtered = filtered.filter((tc) => {
        const normalizedStatus = normalizeStatus(tc.status);
        return normalizedStatus === selectedStatusFilter;
      });
    }
    
    // Apply Browser filter
    if (selectedBrowserFilter !== null) {
      filtered = filtered.filter((tc) => {
        const browserType = (tc.browser_type || '').toLowerCase();
        return browserType === selectedBrowserFilter.toLowerCase();
      });
    }
    
    // Apply sorting
    return sortTestcases(filtered, sortColumn, sortDirection);
  }, [
    testcases,
    testcasesSearchText,
    selectedOrderFilter,
    selectedStatusFilter,
    selectedBrowserFilter,
    sortColumn,
    sortDirection,
    sortTestcases,
  ]);

  // Calculate pagination
  const totalPages = Math.ceil(displayedTestcases.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTestcases = useMemo(() => {
    return displayedTestcases.slice(startIndex, endIndex);
  }, [displayedTestcases, startIndex, endIndex]);

  // Reset to page 1 when filters or itemsPerPage change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedOrderFilter, selectedStatusFilter, selectedBrowserFilter, testcasesSearchText, itemsPerPage]);

  const toggleTestcaseLevel = (level: number) => {
    setExpandedTestcaseLevels((prev) => {
      const next = new Set(prev);
      if (next.has(level)) {
        next.delete(level);
      } else {
        next.add(level);
      }
      return next;
    });
  };

  const handleLevelSelect = (level: number | null) => {
    // If clicking "All" (null), always set to null to show all testcases
    if (level === null) {
      setSelectedLevel(null);
      return;
    }
    // Toggle: if clicking the same level, deselect it; otherwise select the new level
    if (selectedLevel === level) {
      setSelectedLevel(null);
    } else {
      setSelectedLevel(level);
      // Auto-expand the selected level if not already expanded
      setExpandedTestcaseLevels((prev) => {
        const next = new Set(prev);
        next.add(level);
        return next;
      });
    }
  };

  const {
    contextMenu,
    suiteContextMenu,
    groupContextMenu,
    isChangeLevelSubmenuOpen,
    changingLevelTestcase,
    newLevelValue,
    setNewLevelValue,
    handleCloseContextMenu,
    handleCloseSuiteContextMenu,
    handleCloseGroupContextMenu,
    handleTestcaseRightClick,
    handleTestcaseActionsClick,
    handleSuiteRightClick,
    handleGroupRightClick,
    handleContextMenuAction,
    handleSuiteContextMenuAction,
    handleGroupContextMenuAction,
    handleChangeLevelSubmit: handleChangeLevelSubmitFromHook,
    handleChangeLevelCancel,
  } = useContextMenuHandlers({
    onTestcaseEvidence: (testcase) => {
      setViewingTestcase(testcase);
      setIsEvidenceModalOpen(true);
    },
    onTestcaseEdit: handleOpenEditTestcase,
    onTestcaseDuplicate: handleOpenDuplicateTestcase,
    onTestcaseDelete: openDeleteModal,
    onTestcaseChangeLevel: () => {
      // Logic is handled in handleContextMenuAction
    },
    onSuiteRun: async (suite) => {
      if (suite.test_suite_id) {
        // Use handleRunAgain logic but for a specific suite
        if (isRunningSuite) return;
        try {
          setIsRunningSuite(true);
          const resp = await suiteService.executeTestSuite({ test_suite_id: suite.test_suite_id });
          if (resp.success) {
            if (selectedSuiteId === suite.test_suite_id) {
              setTimeout(() => {
                fetchTestcasesBySuite(suite.test_suite_id, suite.name);
              }, 1000);
            }
          } else {
            toast.error(resp.error || 'Failed to execute test suite. Please try again.');
          }
        } catch (e) {
          toast.error('Failed to execute test suite. Please try again.');
        } finally {
          setIsRunningSuite(false);
        }
      }
    },
    onSuiteAddCases: (suite) => {
      setAddingSuiteFromHook(suite);
      setIsAddCasesModalOpenFromHook(true);
    },
    onSuiteEdit: (suite) => {
      setEditingSuiteFromHook(suite);
      setIsEditSuiteModalOpenFromHook(true);
    },
    onSuiteDelete: (suite) => {
      setDeletingSuiteFromHook(suite);
      setIsDeleteSuiteModalOpenFromHook(true);
    },
    onGroupNewGroup: (group) => {
      setSelectedGroupId(group.group_id);
      setExpanded((prev) => {
        const next = new Set(prev);
        next.add(group.group_id);
        return next;
      });
      setCreatingParentId(group.group_id);
      setIsCreatingGroup(true);
      setCreatingGroupName('New group');
      setCreatingGroupError(null);
    },
    onGroupNewSuite: (group) => {
      setSelectedGroupId(group.group_id);
      setCreatingSuiteGroupId(group.group_id);
      setIsCreateSuiteModalOpen(true);
    },
    onGroupRename: (group) => {
      setRenamingGroupId(group.group_id);
      setRenamingGroupName(group.name);
      setRenamingGroupError(null);
    },
    onGroupDelete: (group) => {
      setDeletingGroup(group);
    },
    onChangeLevelSubmit: updateTestcaseLevel,
    isUpdatingTestcaseLevel,
  });

  // Wrapper for handleChangeLevelSubmit to show toast on validation error
  const handleChangeLevelSubmit = async () => {
    if (!changingLevelTestcase || !selectedSuiteId || isUpdatingTestcaseLevel) return;

    const levelValue = parseInt(newLevelValue.trim(), 10);
    if (isNaN(levelValue) || levelValue < 1) {
      toast.error('Please enter a valid level (must be a positive number)');
      return;
    }

    const success = await handleChangeLevelSubmitFromHook();
    if (!success && levelValue >= 1) {
      // Error was already handled in updateTestcaseLevel
    }
  };

  // Context menu useEffect hooks (must be after useContextMenuHandlers hook)
  useEffect(() => {
    if (isChangeLevelSubmenuOpen) {
      const t = setTimeout(() => {
        changeLevelInputRef.current?.focus();
        changeLevelInputRef.current?.select();
      }, 0);
      return () => clearTimeout(t);
    }
  }, [isChangeLevelSubmenuOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
  
      // Close menu if clicking outside menu
      if (!target.closest('.sm-new-wrapper')) {
        setNewMenuOpen(false);
      }

      // Close new testcase menu if clicking outside menu
      if (!target.closest('.sm-new-testcase-wrapper')) {
        setIsNewTestcaseMenuOpen(false);
      }

      // Close filter modal if clicking outside
      if (!target.closest('.sm-testcases-filter-wrapper')) {
        setIsFilterModalOpen(false);
      }
  
      // DO NOT unfocus if clicking in New button/menu
      if (target.closest('.sm-new-wrapper')) {
        return;
      }

      // DO NOT unfocus if clicking in New testcase button/menu
      if (target.closest('.sm-new-testcase-wrapper')) {
        return;
      }

      // DO NOT unfocus if clicking in Filter button/modal
      if (target.closest('.sm-testcases-filter-wrapper')) {
        return;
      }
  
      const inTree = !!target.closest('.suites-tree');
      const onGroupRow = !!target.closest('.sm-row.sm-group');
  
      // Click outside tree or in tree but not on group row => unfocus
      if (!inTree || !onGroupRow) {
        setSelectedGroupId(null);
      }

      // Close context menu if clicking outside
      if (contextMenu.visible && !target.closest('.sm-testcase-context-menu-wrapper')) {
        handleCloseContextMenu();
      }

      // Close suite context menu if clicking outside
      if (suiteContextMenu.visible && !target.closest('.sm-suite-context-menu')) {
        handleCloseSuiteContextMenu();
      }

      // Close group context menu if clicking outside
      if (groupContextMenu.visible && !target.closest('.sm-group-context-menu')) {
        handleCloseGroupContextMenu();
      }
    };
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, [contextMenu.visible, suiteContextMenu.visible, groupContextMenu.visible, handleCloseContextMenu, handleCloseSuiteContextMenu, handleCloseGroupContextMenu]);

  const hasData = (filteredGroups.length > 0) || (filteredRootSuites.length > 0);

  return (
    <div className="suites-page">
      <Header />
      <Breadcrumb items={breadcrumbItems} onNavigate={handleBreadcrumbNavigate} />
      <div className="suites-layout">
        <SidebarNavigator items={sidebarItems} onNavigate={handleSidebarNavigate} projectId={projectId} />
        <main className="suites-main">
          <div className="suites-main-content">
            {/* Left Panel */}
            <div 
              ref={leftPanelRef}
              className="suites-left-panel"
              style={leftPanelWidth !== null ? { width: `${leftPanelWidth}px`, flex: '0 0 auto' } : undefined}
            >
              <div className="suites-controls">
                <div className="suites-search">
                  <input
                    type="text"
                    placeholder="Search by name..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                  />
                </div>
                <div className="suites-actions">
                  <div className="sm-new-wrapper">
                    <button className="sm-new-btn" onClick={toggleNewMenu} aria-haspopup="true" aria-expanded={newMenuOpen}>
                      <span className="sm-new-icon" aria-hidden>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 5v14" />
                          <path d="M5 12h14" />
                        </svg>
                      </span>
                      New
                    </button>
                    {newMenuOpen && (
                      <div className="sm-new-menu" role="menu">
                        <button className="sm-new-item" onClick={handleStartCreateGroupWrapper} role="menuitem">New group</button>
                        <button className="sm-new-item" onClick={handleClickNewSuite} role="menuitem">New suite</button>
                      </div>
                    )}
                  </div>
                  <button className={`sm-reload-btn ${isLoadingTree ? 'is-loading' : ''}`} onClick={fetchData} disabled={isLoadingTree} title="Reload" aria-label="Reload">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 11a8.1 8.1 0 0 0-15.5-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M4 5v4h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M4 13a8.1 8.1 0 0 0 15.5 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M20 19v-4h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </div>

              {error && <div className="suites-alert error">{error}</div>}
              {!error && !hasData && !isLoadingTree && (
                <EmptyState
                  icon={
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9aa1af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v7a3 3 0 0 1-3 3H5a2 2 0 0 1-2-2z" />
                      <path d="M3 7V5a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v2" />
                    </svg>
                  }
                  text="No groups or suites at root level."
                />
              )}

              <div 
                className={`suites-tree ${dragOverGroupId === 'root' ? 'is-drag-over-root' : ''}`}
                onDragOver={handleRootDragOver}
                onDragLeave={handleRootDragLeave}
                onDrop={handleRootDrop}
              >
                {isLoadingTree && <LoadingSpinner text="Loading..." />}
                {!isLoadingTree && (
                  <SuitesTree
                    groups={groups}
                    rootSuites={rootSuites}
                    filteredGroups={filteredGroups}
                    filteredRootSuites={filteredRootSuites}
                    expanded={expanded}
                    selectedGroupId={selectedGroupId}
                    selectedSuiteId={selectedSuiteId}
                    renamingGroupId={renamingGroupId}
                    isCreatingGroup={isCreatingGroup}
                    creatingParentId={creatingParentId}
                    createInputRef={createInputRef}
                    creatingGroupName={creatingGroupName}
                    creatingGroupError={creatingGroupError}
                    isSavingGroup={isSavingGroup}
                    setCreatingGroupName={setCreatingGroupName}
                    finishCreateGroup={finishCreateGroup}
                    handleCreateInputKeyDown={handleCreateInputKeyDown}
                    renameInputRef={renameInputRef}
                    renamingGroupName={renamingGroupName}
                    renamingGroupError={renamingGroupError}
                    isRenamingGroup={isRenamingGroup}
                    setRenamingGroupName={setRenamingGroupName}
                    finishRenameGroup={finishRenameGroup}
                    handleRenameInputKeyDown={handleRenameInputKeyDown}
                    draggedSuite={draggedSuite}
                    dragOverGroupId={dragOverGroupId}
                    draggedGroup={draggedGroup}
                    handleSuiteClick={handleSuiteClick}
                    handleSuiteRightClick={handleSuiteRightClick}
                    handleSuiteDragStart={handleSuiteDragStart}
                    handleSuiteDragEnd={handleSuiteDragEnd}
                    handleGroupClick={handleGroupClick}
                    handleGroupRightClick={handleGroupRightClick}
                    handleGroupDragStart={handleGroupDragStart}
                    handleGroupDragEnd={handleGroupDragEnd}
                    handleGroupDragOver={handleGroupDragOver}
                    handleGroupDragLeave={handleGroupDragLeave}
                    handleGroupDrop={handleGroupDrop}
                  />
                )}
              </div>
            </div>

            {/* Resizer */}
            <div 
              className={`suites-resizer ${isResizing ? 'is-resizing' : ''}`}
              onMouseDown={handleResizeStart}
            />

            {/* Right Panel */}
            <div className="suites-right-panel">
              <RightPanelHeader
                selectedSuiteId={selectedSuiteId}
                selectedSuiteName={selectedSuiteName}
                selectedSuite={selectedSuite}
                testcases={testcases}
                testcasesSearchText={testcasesSearchText}
                isLoadingTestcases={isLoadingTestcases}
                isRunningSuite={isRunningSuite}
                isExportingSuite={isExportingSuite}
                isCreatingTestcaseInSuite={isCreatingTestcaseInSuite}
                isAddingCases={isAddingCases}
                isNewTestcaseMenuOpen={isNewTestcaseMenuOpen}
                onReloadTestcases={handleReloadTestcases}
                onRunAgain={handleRunAgain}
                onExport={handleExport}
                onClearSuite={handleClearSuite}
                onOpenCreateTestcaseInSuite={handleOpenCreateTestcaseInSuite}
                onOpenAddExistedCase={handleOpenAddExistedCase}
                onToggleNewTestcaseMenu={() => setIsNewTestcaseMenuOpen(!isNewTestcaseMenuOpen)}
              />
              <div className="suites-right-panel-content">
                {!selectedSuiteId ? (
                  <EmptyState
                    className="suites-right-panel-empty"
                    iconSize={64}
                    text="Select a suite to view testcases"
                  />
                ) : isLoadingTestcases ? (
                  <LoadingSpinner text="Loading testcases..." className="suites-right-panel-loading" />
                ) : testcasesError ? (
                  <div className="suites-right-panel-error">{testcasesError}</div>
                ) : sortedLevels.length === 0 ? (
                  <EmptyState
                    className="suites-right-panel-empty"
                    iconSize={64}
                    text="No testcases in this suite"
                  />
                ) : (
                  <div className="sm-testcases-layout">
                    <div className="sm-testcases-pagination-wrapper">
                      <div className="sm-testcases-controls-group">
                        <div className="sm-testcases-search-wrapper">
                          <div className="sm-testcases-search-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="11" cy="11" r="8" />
                              <path d="m21 21-4.35-4.35" />
                            </svg>
                          </div>
                          <input
                            type="text"
                            className="sm-testcases-search-input"
                            placeholder="Search testcases..."
                            value={testcasesSearchText}
                            onChange={(e) => setTestcasesSearchText(e.target.value)}
                          />
                        </div>
                        <TestcasesFilter
                          sortedLevels={sortedLevels}
                          selectedOrderFilter={selectedOrderFilter}
                          selectedStatusFilter={selectedStatusFilter}
                          selectedBrowserFilter={selectedBrowserFilter}
                          isFilterModalOpen={isFilterModalOpen}
                          onOrderFilterChange={setSelectedOrderFilter}
                          onStatusFilterChange={setSelectedStatusFilter}
                          onBrowserFilterChange={setSelectedBrowserFilter}
                          onToggleModal={() => setIsFilterModalOpen(!isFilterModalOpen)}
                          onCloseModal={() => setIsFilterModalOpen(false)}
                        />
                      </div>
                      <TestcasesPagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        itemsPerPage={itemsPerPage}
                        totalItems={displayedTestcases.length}
                        onPageChange={setCurrentPage}
                        onItemsPerPageChange={(newItemsPerPage) => {
                          setItemsPerPage(newItemsPerPage);
                          setCurrentPage(1);
                        }}
                      />
                    </div>

                    <div className="sm-testcases-table-section">
                      <TestcasesTableHeader
                        columnWidths={columnWidths}
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onColumnSort={handleColumnSort}
                        onColumnResizeStart={handleColumnResizeStart}
                      />

                      <div className="sm-testcases-list-panel">
                        {displayedTestcases.length === 0 ? (
                          <div className="sm-testcases-empty">
                            <p>No testcases match the current filters</p>
                          </div>
                        ) : (
                          <div className="sm-testcases-table">
                            {paginatedTestcases.map((tc) => {
                              const rowHeight = rowHeights.get(tc.testcase_id);
                              const currentRowHeight = rowHeight || 32;
                              return (
                                <TestcaseRow
                                  key={tc.testcase_id}
                                  testcase={tc}
                                  columnWidths={columnWidths}
                                  rowHeight={currentRowHeight}
                                  isDragging={false}
                                  isResizing={isResizingRow === tc.testcase_id}
                                  onRowClick={handleOpenRecorder}
                                  onContextMenu={handleTestcaseRightClick}
                                  onActionsClick={handleTestcaseActionsClick}
                                  onRowResizeStart={handleRowResizeStart}
                                />
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
      
      <TestcaseContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        testcase={contextMenu.testcase}
        isChangeLevelSubmenuOpen={isChangeLevelSubmenuOpen}
        changingLevelTestcase={changingLevelTestcase}
        newLevelValue={newLevelValue}
        isUpdatingTestcaseLevel={isUpdatingTestcaseLevel}
        changeLevelInputRef={changeLevelInputRef}
        onAction={handleContextMenuAction}
        onLevelValueChange={setNewLevelValue}
        onChangeLevelSubmit={handleChangeLevelSubmit}
        onChangeLevelCancel={handleChangeLevelCancel}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleChangeLevelSubmit();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            handleChangeLevelCancel();
          }
        }}
      />

      <SuiteContextMenu
        visible={suiteContextMenu.visible}
        x={suiteContextMenu.x}
        y={suiteContextMenu.y}
        suite={suiteContextMenu.suite}
        isRunningSuite={isRunningSuite}
        onAction={handleSuiteContextMenuAction}
      />

      <GroupContextMenu
        visible={groupContextMenu.visible}
        x={groupContextMenu.x}
        y={groupContextMenu.y}
        group={groupContextMenu.group}
        onAction={handleGroupContextMenuAction}
      />

      <DeleteGroupModal
        group={deletingGroup}
        isDeleting={isDeletingGroup}
        onClose={() => setDeletingGroup(null)}
        onDelete={handleDeleteGroup}
      />

      <Footer />

      {/* Delete Suite Modal */}
      <DeleteSuite
        isOpen={isDeleteSuiteModalOpen}
        onClose={handleCloseDeleteSuiteModal}
        onDelete={handleDeleteSuite}
        suite={deletingSuite}
        isDeleting={isDeletingSuite}
      />

      {/* Edit Suite Modal */}
      <EditSuite
        isOpen={isEditSuiteModalOpen}
        onClose={handleCloseEditSuiteModal}
        onSave={handleSaveSuite}
        suite={editingSuite}
        isSaving={isSavingSuite}
      />

      {/* Add Cases Modal */}
      <AddTestcasesToSuite
        isOpen={isAddCasesModalOpen}
        onClose={handleCloseAddCasesModal}
        onSave={handleAddCases}
        projectId={projectId}
        testSuiteId={addingSuite?.test_suite_id}
      />

      {/* Evidence Modal */}
      <ViewTestcaseEvidence
        isOpen={isEvidenceModalOpen}
        onClose={() => {
          setIsEvidenceModalOpen(false);
          setViewingTestcase(null);
        }}
        testcase={viewingTestcase}
        testSuiteId={selectedSuiteId}
        projectId={projectId}
      />

      <LoadingOverlay
        visible={isLoadingTestcaseData}
        text="Loading testcase data..."
        zIndex={2147483646}
      />
      <EditTestcase
        isOpen={isEditTestcaseModalOpen}
        onClose={handleCloseEditTestcaseModal}
        onSave={handleSaveEditTestcase}
        testcase={editingTestcase}
        projectId={projectId}
      />

      <LoadingOverlay
        visible={isLoadingDuplicateTestcaseData}
        text="Loading testcase data..."
        zIndex={2147483646}
      />
      <LoadingOverlay
        visible={isDuplicatingTestcase}
        text="Duplicating..."
        zIndex={2147483647}
        padding="24px 32px"
        borderRadius="12px"
        gap="16px"
        fontSize="16px"
        fontWeight={500}
        color="#374151"
      />
      <DuplicateTestcase
        isOpen={isDuplicateTestcaseModalOpen}
        onClose={handleCloseDuplicateTestcaseModal}
        onSave={handleDuplicateTestcaseSave}
        createTestcaseWithActions={createTestcaseWithActions}
        testcase={duplicatingTestcase}
        projectId={projectId}
        isDuplicating={isDuplicatingTestcase}
      />

      {/* Delete Testcase Modal */}
      <DeleteTestcase
        isOpen={isDeleteTestcaseModalOpen}
        onClose={handleCloseDeleteTestcaseModal}
        onDelete={handleDeleteTestcase}
        testcase={deletingTestcase ? {
          testcase_id: deletingTestcase.testcase_id,
          name: deletingTestcase.name
        } : null}
      />
      
      {/* Create Test Suite Modal */}
      <CreateTestSuite
        isOpen={isCreateSuiteModalOpen}
        onClose={handleCloseCreateSuiteModal}
        onSave={handleSaveCreateSuite}
        projectId={projectId}
      />
      
      <LoadingOverlay
        visible={isCreatingTestcaseInSuite}
        text="Creating testcase..."
        zIndex={2147483646}
      />
      <CreateTestcaseInSuite
        isOpen={isCreateTestcaseInSuiteModalOpen}
        onClose={handleCloseCreateTestcaseInSuiteModal}
        onSave={handleSaveCreateTestcaseInSuite}
        projectId={projectId}
        defaultLevel={creatingTestcaseDefaultLevel}
      />
      
      {/* Install Browser Modal */}
      <InstallBrowserModal
        isOpen={isInstallBrowserModalOpen}
        onClose={() => {
          if (!isInstallingBrowsers) {
            setIsInstallBrowserModalOpen(false);
            setPendingRecorderTestcaseId(null);
            setInstallProgress(null);
          }
        }}
        onInstall={handleInstallBrowsers}
        defaultBrowserType={
          pendingRecorderTestcaseId
            ? (testcases.find(tc => tc.testcase_id === pendingRecorderTestcaseId)?.browser_type || BrowserType.chrome)
            : null
        }
        isInstalling={isInstallingBrowsers}
        installProgress={installProgress}
      />
    </div>
  );
};

export default SuitesManager;

