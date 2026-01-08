import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Header from '../../components/header/Header';
import Breadcrumb from '../../components/breadcumb/Breadcrumb';
import SidebarNavigator from '../../components/sidebar_navigator/SidebarNavigator';
import './Testcases.css';
import CreateTestcase from '../../components/testcase/create_testcase/CreateTestcase';
import EditTestcase from '../../components/testcase/edit_testcase/EditTestcase';
import DuplicateTestcase from '../../components/testcase/duplicate_testcase/DuplicateTestcase';
import DeleteTestcase from '../../components/testcase/delete_testcase/DeleteTestcase';
import RunAndViewTestcase from '../../components/testcase/run_and_view/RunAndViewTestcase';
import InstallBrowserModal from '../../components/browser/install_browser/InstallBrowserModal';
import { TestCaseService } from '../../services/testcases';
import { ProjectService } from '../../services/projects';
import { toast } from 'react-toastify';
import { ExecuteScriptsService } from '../../services/executeScripts';
import { ActionService } from '../../services/actions';
import { Action, TestCaseDataVersion } from '../../types/actions';
import { canEdit } from '../../hooks/useProjectPermissions';
import { Evidence, BrowserType } from '../../types/testcases';


interface Testcase {
  testcase_id: string;
  name: string;
  description?: string;
  updatedAt: string;
  updated?: string;
  evidence: Evidence;
  status: 'Passed' | 'Failed' | 'Draft' | 'Running';
  actionsCount: number;
  basic_authentication?: { username: string; password: string };
  browser_type?: string;
}

const Testcases: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { projectId } = useParams();

  const canEditPermission = canEdit(projectId);
  
  const projectData = { projectId, projectName: (location.state as { projectName?: string } | null)?.projectName };
  const [resolvedProjectName, setResolvedProjectName] = useState<string>(projectData.projectName || 'Project');
  // console.log('projectData', projectData);
  // Data from API
  const [testcases, setTestcases] = useState<Testcase[]>([]);
  const [testcasesData, setTestcasesData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Search, pagination, and sort state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [sortBy, setSortBy] = useState<string | null>('updated_at');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  
  // Pagination info from API
  const [totalTestcases, setTotalTestcases] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [isRunAndViewModalOpen, setIsRunAndViewModalOpen] = useState(false);
  const [isInstallBrowserModalOpen, setIsInstallBrowserModalOpen] = useState(false);
  const [selectedTestcase, setSelectedTestcase] = useState<Testcase | null>(null);
  const [pendingRecorderTestcaseId, setPendingRecorderTestcaseId] = useState<string | null>(null);
  const [isInstallingBrowsers, setIsInstallingBrowsers] = useState(false);
  const [installProgress, setInstallProgress] = useState<{ browser: string; progress: number; status: string } | null>(null);
  const [selectedTestcaseData, setSelectedTestcaseData] = useState<any>(null);
  const [runningTestcases, setRunningTestcases] = useState<string[]>([]);
  const [autoReloadInterval, setAutoReloadInterval] = useState<NodeJS.Timeout | null>(null);

  // Service - use useMemo to avoid recreating on every render
  const testCaseService = useMemo(() => new TestCaseService(), []);
  const projectService = useMemo(() => new ProjectService(), []);

  // Helper: map API response to Testcase format
  const mapApiResponseToTestcase = useCallback((resp: any[]): Testcase[] => {
    return resp.map((tc: any) => {
      // Determine status from evidence
      let status: 'Passed' | 'Failed' | 'Draft' | 'Running' = 'Draft';
      if (tc.evidence) {
        if (tc.evidence.status === 'SUCCESS' || tc.evidence.status === 'Passed') {
          status = 'Passed';
        } else if (tc.evidence.status === 'FAILED' || tc.evidence.status === 'Failed') {
          status = 'Failed';
        } else if (tc.evidence.status === 'RUNNING' || tc.evidence.status === 'Running') {
          status = 'Running';
        }
      }

          return {
            testcase_id: tc.testcase_id,
            name: tc.name,
            description: tc.description,
        actionsCount: tc.actions ? tc.actions.length : 0,
        status: status,
            evidence: {
          evidence_id: tc.evidence_id || '',
              video: tc.evidence?.video ? {
                video_id: tc.evidence.video.video_id || '',
                url: tc.evidence.video.url || '',
              } : null,
              screenshots: tc.evidence?.screenshots ? tc.evidence.screenshots : [],
              log: tc.evidence?.log ? {
                log_id: tc.evidence.log.log_id || '',
                content: tc.evidence.log.content || '',
               } : null,
            },
        updatedAt: tc.updated_at || tc.created_at || '',
            basic_authentication: {
              username: tc.basic_authentication?.username ? tc.basic_authentication.username : '',
              password: tc.basic_authentication?.password ? tc.basic_authentication.password : '',
            },
            browser_type: tc.browser_type || undefined,
          };
        });
  }, []);

  // Load testcases with search/pagination/sort
  useEffect(() => {
    if (!projectData?.projectId) return;

    const loadTestcases = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Map status filter to API format
        let statusFilterValue: string | null = null;
        if (statusFilter !== 'All Status') {
          const statusMap: Record<string, string> = {
            'success': 'Passed',
            'failed': 'Failed',
            'draft': 'Draft',
            'running': 'Running'
          };
          statusFilterValue = statusMap[statusFilter.toLowerCase()] || statusFilter;
        }

        const request = {
          project_id: projectData.projectId!,
          page: page,
          page_size: pageSize,
          q: search || null,
          status: statusFilterValue,
          sort_by: sortBy || null,
          order: order || 'asc'
        };

        const response = await testCaseService.searchTestCases(request);
        
        if (response.success && response.data) {
          const mapped = mapApiResponseToTestcase(response.data.testcases);
        
        setTestcasesData(mapped);
        
        const runningIds = mapped
          .filter(tc => tc.status === 'Running')
          .map(tc => tc.testcase_id);
        setRunningTestcases(runningIds);
        setTestcases(mapped);
          
          setTotalTestcases(response.data.number_testcase);
          setCurrentPage(response.data.current_page);
          setTotalPages(response.data.total_pages);
          // Only sync page if it's different to avoid infinite loop
          if (response.data.current_page !== page) {
            setPage(response.data.current_page);
          }
      } else {
        setError(response.error || 'Failed to load testcases');
        toast.error(response.error || 'Failed to load testcases');
          setTestcases([]);
          setTestcasesData([]);
          setTotalTestcases(0);
          setCurrentPage(1);
          setTotalPages(1);
          setPage(1);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      toast.error('Failed to load testcases');
        setTestcases([]);
        setTestcasesData([]);
        setTotalTestcases(0);
        setCurrentPage(1);
        setTotalPages(1);
        setPage(1);
    } finally {
      setIsLoading(false);
    }
  };

    loadTestcases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search, statusFilter, sortBy, order, projectData?.projectId, testCaseService, mapApiResponseToTestcase]);

  // Helper: reload testcases (for manual refresh and after operations)
  const reloadTestcases = useCallback(async () => {
    if (!projectData?.projectId) return;
    try {
      setIsLoading(true);
      setError(null);
      
      // Map status filter to API format
      let statusFilterValue: string | null = null;
      if (statusFilter !== 'All Status') {
        const statusMap: Record<string, string> = {
          'success': 'Passed',
          'failed': 'Failed',
          'draft': 'Draft',
          'running': 'Running'
        };
        statusFilterValue = statusMap[statusFilter.toLowerCase()] || statusFilter;
      }

      const request = {
        project_id: projectData.projectId,
        page: page,
        page_size: pageSize,
        q: search || null,
        status: statusFilterValue,
        sort_by: sortBy || null,
        order: order || 'asc'
      };

      const response = await testCaseService.searchTestCases(request);
      
      if (response.success && response.data) {
        const mapped = mapApiResponseToTestcase(response.data.testcases);
        
        setTestcasesData(mapped);
        
        const runningIds = mapped
          .filter(tc => tc.status === 'Running')
          .map(tc => tc.testcase_id);
        setRunningTestcases(runningIds);
        setTestcases(mapped);
        
        setTotalTestcases(response.data.number_testcase);
        setCurrentPage(response.data.current_page);
        setTotalPages(response.data.total_pages);
        // Only sync page if it's different to avoid infinite loop
        if (response.data.current_page !== page) {
          setPage(response.data.current_page);
        }
      } else {
        setError(response.error || 'Failed to load testcases');
        toast.error(response.error || 'Failed to load testcases');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      toast.error('Failed to load testcases');
    } finally {
      setIsLoading(false);
    }
  }, [projectData?.projectId, page, pageSize, search, statusFilter, sortBy, order, testCaseService, mapApiResponseToTestcase]);

  // Auto reload every 60 seconds (only when no modals are open and there are running testcases)
  useEffect(() => {
    const interval = setInterval(() => {
      // Don't auto-reload if any modal is open to prevent data conflicts
      if (!isCreateModalOpen && !isEditModalOpen && !isDeleteModalOpen && !isDuplicateModalOpen && !isRunAndViewModalOpen) {
        const runningTestcases = testcases.filter(tc => tc.status === 'Running');
        if (runningTestcases.length > 0) {
          reloadTestcases();
        }
      }
    }, 60000);
    
    setAutoReloadInterval(interval);
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [testcases, isCreateModalOpen, isEditModalOpen, isDeleteModalOpen, isDuplicateModalOpen, isRunAndViewModalOpen, reloadTestcases]);

  // Reload testcases when recorder window is closed
  useEffect(() => {
    const unsubscribe = (window as any)?.screenHandleAPI?.onRecorderClosed?.(async () => {
      await reloadTestcases();
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectData?.projectId]);

  // Load project name from API
  useEffect(() => {
    const loadProjectData = async () => {
      if (!projectId) return;
      if (projectData.projectName) {
        setResolvedProjectName(projectData.projectName);
        return;
      }
      const resp = await projectService.getProjectById(projectId);
      if (resp.success && resp.data) {
        const project = resp.data as any;
        setResolvedProjectName(project.name || 'Project');
      }
    };
    loadProjectData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Sidebar navigation items
  const sidebarItems = [
    {
      id: 'suites-manager',
      label: 'Suites Manager',
      path: `/suites-manager/${projectId || ''}`,
      isActive: false
    },
    {
      id: 'testcases',
      label: 'Testcases',
      path: `/testcases/${projectId || ''}`,
      isActive: true
    },
    // Temporarily disabled Test Suites navigation
    // {
    //   id: 'test-suites',
    //   label: 'Test Suites',
    //   path: `/test-suites/${projectId || ''}`,
    //   isActive: false
    // },
    {
      id: 'browser-storage',
      label: 'Browser Storage',
      path: `/browser-storage/${projectId || ''}`,
      isActive: false
    },
    {
      id: 'databases',
      label: 'Databases',
      path: `/databases/${projectId || ''}`,
      isActive: false
    },
    {
      id: 'queries',
      label: 'Queries',
      path: `/queries/${projectId || ''}`,
      isActive: false
    },
    {
      id: 'variables',
      label: 'Variables',
      path: `/variables/${projectId || ''}`,
      isActive: false
    }
    ,
    {
      id: 'change-log',
      label: 'Activities',
      path: `/change-log/${projectId || ''}`,
      isActive: false
    }
  ];

  // Breadcrumb items
  const breadcrumbItems = [
    {
      label: 'Projects',
      path: '/dashboard',
      isActive: false
    },
    {
      label: resolvedProjectName,
      path: `/testcases/${projectId || ''}`,
      isActive: true
    }
  ];

  // No need for client-side filtering - API handles search and status filtering
  const filteredTestcases = testcases;

  // Handle sort - reset page to 1 when sort changes
  const handleSort = (col: 'name' | 'description' | 'updated_at' | 'created_at' | 'browser_type') => {
    if (sortBy === col) {
      // Toggle order if same column
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to asc
      setSortBy(col);
      setOrder('asc');
    }
    // Reset page to 1 when sort changes
    setPage(1);
  };

  // Handle search - reset page to 1 when search changes
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1); // Reset page when search changes
  };

  // Handle clear search - reset page to 1
  const handleClearSearch = () => {
    setSearch('');
    setPage(1);
  };

  // Handle page size change - reset page to 1
  const handlePageSizeChange = (value: string) => {
    const newPageSize = parseInt(value.split(' ')[0]);
    setPageSize(newPageSize);
    setPage(1); // Reset page when page size changes
  };

  // Handle pagination - only update page, don't reset
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setPage(currentPage + 1);
    }
  };

  // Calculate display range
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalTestcases);
  const currentTestcases = filteredTestcases;

  // Generate pagination numbers with ellipsis
  const generatePaginationNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 3) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 2) {
      pages.push(1, 2, 3);
      if (totalPages > 4) pages.push('...');
      if (totalPages > 3) pages.push(totalPages);
    } else if (currentPage >= totalPages - 1) {
      pages.push(1);
      if (totalPages > 4) pages.push('...');
      pages.push(totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
    return pages;
  };

  const paginationNumbers = generatePaginationNumbers();

  const handleTestcaseActions = (testcaseId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Ngăn chặn event bubbling
    setOpenDropdownId(openDropdownId === testcaseId ? null : testcaseId);
  };

  const handleCreateTestcase = () => {
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    // Reload data when closing create modal to get latest information
    reloadTestcases();
  };

  const handleSaveTestcase = async ({ projectId, name, tag, browser_type }: { projectId: string; name: string; tag: string; browser_type?: string }) => {
    try {
      const effectiveProjectId = projectId || projectData?.projectId;
      if (!effectiveProjectId) {
        toast.error('Missing project ID');
        return;
      }
      const payload = {
        project_id: effectiveProjectId,
        name,
        tag: tag || undefined,
        browser_type: browser_type || undefined,
      };
      const resp = await testCaseService.createTestCase(payload);
      if (resp.success) {
        toast.success('Testcase created successfully!');
        setIsCreateModalOpen(false);
        await reloadTestcases();
      } else {
        toast.error(resp.error || 'Failed to create testcase. Please try again.');
      }
    } catch (err) {
      toast.error('Failed to create testcase. Please try again.');
      // console.error(err);
    }
  };

  const handleBreadcrumbNavigate = (path: string) => {
    navigate(path);
  };

  const handleSidebarNavigate = (path: string) => {
    navigate(path);
  };

  const handleOpenEdit = (id: string, event?: React.MouseEvent) => {
    if (event) event.stopPropagation(); // Ngăn chặn event bubbling
    const tc = testcases.find(t => t.testcase_id === id) || null;
    setSelectedTestcase(tc);
    setIsEditModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleOpenDuplicate = (id: string, event?: React.MouseEvent) => {
    if (event) event.stopPropagation();
    const tc = testcases.find(t => t.testcase_id === id) || null;
    setSelectedTestcase(tc);
    setIsDuplicateModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleOpenDelete = (id: string, event?: React.MouseEvent) => {
    if (event) event.stopPropagation(); // Ngăn chặn event bubbling
    const tc = testcases.find(t => t.testcase_id === id) || null;
    setSelectedTestcase(tc);
    setIsDeleteModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleRunTestcase = async (id: string, event?: React.MouseEvent) => {
    if (event) event.stopPropagation();
    // Execute testcase and reload list only (no auto popup)
    try {
      setRunningTestcases(prev => [...prev, id]);
      
      // Update testcase status to 'running' immediately
      setTestcases(prevTestcases => 
        prevTestcases.map(tc => 
          tc.testcase_id === id ? { ...tc, status: 'Running' as const } : tc
        )
      );
      
      const resp = await testCaseService.executeTestCase({ testcase_id: id });
      // if (resp.success) {
      //   if (resp.data?.data?.success) {
      //     toast.success('Passed!');
      //   } else {
      //     toast.error('Failed!');
      //   }
      // } else {
      //   toast.error('Failed to execute testcase');
      // }

    } catch (err) {
      toast.error('Failed to execute testcase. Please try again.');
    }
    finally {
      setRunningTestcases(prev => prev.filter(testcaseId => testcaseId !== id));
      await reloadTestcases();
      // Không tự động mở popup kết quả
    }
    setOpenDropdownId(null);
  };

  const handleViewResult = (id: string, event?: React.MouseEvent) => {
    if (event) event.stopPropagation();
    const tc = testcases.find(t => t.testcase_id === id) || null;
    const tcData = testcasesData.find(t => t.testcase_id === id) || null;
    setSelectedTestcase(tc);
    setSelectedTestcaseData(tcData);
    setIsRunAndViewModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedTestcase(null);
    // Reload data when closing edit modal to get latest information
    reloadTestcases();
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedTestcase(null);
    // Reload data when closing delete modal to get latest information
    reloadTestcases();
  };

  const handleCloseDuplicateModal = () => {
    setIsDuplicateModalOpen(false);
    setSelectedTestcase(null);
    // Reload data when closing duplicate modal to get latest information
    reloadTestcases();
  };

  const handleCloseRunAndViewModal = () => {
    setIsRunAndViewModalOpen(false);
    setSelectedTestcase(null);
    setSelectedTestcaseData(null);
    // Reload data when closing run and view modal to get latest information
    reloadTestcases();
  };

  // Create a testcase and try to return newly created testcase_id (if API provides it)
  const createTestcaseAndReturnId = async (name: string, tag?: string) => {
    const effectiveProjectId = projectData?.projectId;
    if (!effectiveProjectId) {
      toast.error('Missing project ID');
      return undefined;
    }
    const payload = { project_id: effectiveProjectId, name, tag: tag || undefined } as any;
    const resp = await testCaseService.createTestCase(payload);
    if (!resp.success) {
      toast.error(resp.error || 'Failed to create testcase. Please try again.');
      return undefined;
    }
    // Some backends may not return the id; attempt to extract if available
    const newId = (resp.data as any)?.testcase_id;
    return newId as string | undefined;
  };

  // Create testcase with actions in one call
  const createTestcaseWithActions = async (name: string, tag?: string, actions?: any[], basic_authentication?: { username: string; password: string }, browser_type?: string) => {
    const effectiveProjectId = projectData?.projectId;
    if (!effectiveProjectId) {
      toast.error('Missing project ID');
      return false;
    }
    const payload = { 
      project_id: effectiveProjectId, 
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
  };

  // Map browser type to playwright browser name
  const mapBrowserTypeToPlaywright = (browserType: string): string => {
    const normalized = browserType.toLowerCase();
    switch (normalized) {
      case 'chrome':
        return 'chromium';
      case 'edge':
        return 'msedge'; // Edge uses custom installation
      case 'firefox':
        return 'firefox';
      case 'safari':
        return 'webkit';
      default:
        return 'chromium';
    }
  };

  // Check if browser type is supported on current platform
  const isBrowserSupported = (browserType: string): boolean => {
    type SupportedPlatform = 'win32' | 'darwin' | 'linux';
    
    const browserSupportMap: Record<string, SupportedPlatform[]> = {
      chrome: ['win32', 'darwin', 'linux'],
      edge: ['win32', 'darwin', 'linux'],
      firefox: ['win32', 'darwin', 'linux'],
      safari: ['darwin'], // Safari only on macOS
    };
    
    const systemPlatformRaw = (window as any).electronAPI?.system?.platform || process?.platform || 'linux';
    const normalizedPlatform: SupportedPlatform = ['win32', 'darwin', 'linux'].includes(systemPlatformRaw)
      ? (systemPlatformRaw as SupportedPlatform)
      : 'linux';
    
    const normalizedBrowserType = browserType.toLowerCase();
    const supportedPlatforms = browserSupportMap[normalizedBrowserType];
    
    if (!supportedPlatforms) {
      // Unknown browser type, assume not supported
      return false;
    }
    
    return supportedPlatforms.includes(normalizedPlatform);
  };

  // Check if browser is installed
  const checkBrowserInstalled = async (browserType: string): Promise<boolean> => {
    try {
      const playwrightAPI = (window as any).playwrightAPI || (window as any).electronAPI?.playwright;
      if (!playwrightAPI) {
        console.warn('[Testcases] Playwright API not available');
        return true; // Assume installed if API not available
      }
      
      const playwrightBrowser = mapBrowserTypeToPlaywright(browserType);
      const result = await playwrightAPI.checkBrowsers([browserType]);
      
      if (result?.success && result?.data) {
        return result.data[browserType] === true;
      }
      return false;
    } catch (err) {
      console.error('[Testcases] Error checking browser:', err);
      return false;
    }
  };

  // Open recorder after browser check
  const openRecorderAfterCheck = async (id: string) => {
    try {
      const token = await (window as any).tokenStore?.get?.();
      (window as any).browserAPI?.browser?.setAuthToken?.(token);
      
      const testcase = testcases.find(tc => tc.testcase_id === id);
      const testcaseName = testcase?.name || id;
      const browserType = testcase?.browser_type || BrowserType.chrome;
      
      const result = await (window as any).screenHandleAPI?.openRecorder?.(id, projectData?.projectId, testcaseName, browserType);
      if (result?.alreadyOpen) {
        toast.warning('Recorder for this testcase is already open.');
      } else if (result?.created) {
      }
    } catch (err) {
      console.error('[Testcases] openRecorder error:', err);
      toast.error('Failed to open recorder');
    }
  };

  const handleOpenRecorder = async (id: string) => {
    try {
      const testcase = testcases.find(tc => tc.testcase_id === id);
      const browserType = testcase?.browser_type || BrowserType.chrome;
      
      // First check if browser type is supported on current platform
      if (!isBrowserSupported(browserType)) {
        const browserName = browserType.charAt(0).toUpperCase() + browserType.slice(1);
        const systemPlatformRaw = (window as any).electronAPI?.system?.platform || process?.platform || 'linux';
        const platformName = systemPlatformRaw === 'win32' ? 'Windows' : systemPlatformRaw === 'darwin' ? 'macOS' : 'Linux';
        toast.error(`${browserName} is not supported on ${platformName}. Please use a different browser type.`);
        return;
      }
      
      // Check if browser is installed
      const isInstalled = await checkBrowserInstalled(browserType);
      
      if (!isInstalled) {
        // Show install modal
        setPendingRecorderTestcaseId(id);
        setIsInstallBrowserModalOpen(true);
      } else {
        // Browser is installed, open recorder directly
        await openRecorderAfterCheck(id);
      }
    } catch (err) {
      console.error('[Testcases] Error in handleOpenRecorder:', err);
      toast.error('Failed to check browser installation');
    }
  };

  // Handle browser installation
  const handleInstallBrowsers = async (browsers: string[]) => {
    try {
      setIsInstallingBrowsers(true);
      setInstallProgress(null);
      
      const playwrightAPI = (window as any).playwrightAPI || (window as any).electronAPI?.playwright;
      if (!playwrightAPI) {
        throw new Error('Playwright API not available');
      }
      
      // Set up progress listener
      const unsubscribe = playwrightAPI.onInstallProgress?.((progress: { browser: string; progress: number; status: string }) => {
        setInstallProgress(progress);
      });
      
      // Install browsers
      const result = await playwrightAPI.installBrowsers(browsers);
      
      // Clean up listener
      if (unsubscribe) unsubscribe();
      
      if (result?.success) {
        toast.success('Browsers installed successfully!');
        setIsInstallBrowserModalOpen(false);
        setIsInstallingBrowsers(false);
        setInstallProgress(null);
        
        // Open recorder after installation
        if (pendingRecorderTestcaseId) {
          await openRecorderAfterCheck(pendingRecorderTestcaseId);
          setPendingRecorderTestcaseId(null);
        }
      } else {
        throw new Error(result?.error || 'Installation failed');
      }
    } catch (err) {
      console.error('[Testcases] Error installing browsers:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to install browsers');
      setIsInstallingBrowsers(false);
      setInstallProgress(null);
      throw err;
    }
  };

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

  const handleSaveEditTestcase = async (
    { testcase_id, name, description, basic_authentication, browser_type, actions, testcase_data_versions }:
    { testcase_id: string; name: string; description: string | undefined; basic_authentication?: { username: string; password: string }; browser_type?: string; actions?: any[]; testcase_data_versions?: TestCaseDataVersion[] }) => {
    try {
      // 1) Save actions and testcase_data_versions using batchCreateActions if actions are provided
      if (actions && actions.length > 0) {
        const actionResp = await actionService.batchCreateActions(
          actions,
          testcase_data_versions,
          projectId || undefined
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
        description: description || undefined,
        basic_authentication: basic_authentication || undefined,
        browser_type: browser_type || undefined,
      } as any;
      // console.log('[MAIN_APP] payload', payload);
      const resp = await testCaseService.updateTestCase(payload, projectId || undefined);
      if (resp.success) {
        toast.success('Testcase updated successfully!');
        handleCloseEditModal();
        await reloadTestcases();
      } else {
        toast.error(resp.error || 'Disconnect from the server. Please try again.');
      }
    } catch (err) {
      toast.error('Disconnect from the server. Please try again.');
    }
  };

  const handleSaveDuplicateTestcase = async (_payload: { name: string; tag: string; actions: any[] }) => {
    // DuplicateTestcase tự thực hiện tạo và add actions, ở đây chỉ cần đóng và reload
    toast.success('Testcase duplicated successfully!');
    handleCloseDuplicateModal();
    await reloadTestcases();
  };

  const handleDeleteTestcase = async (id: string) => {
    try {
      const resp = await testCaseService.deleteTestCase({ testcase_id: id });
      if (resp.success) {
        // Đóng các modal đang mở với testcase này
        if (selectedTestcase?.testcase_id === id) {
          console.info('[Testcases] Closing modals for deleted testcase');
          if (isEditModalOpen) {
            handleCloseEditModal();
          }
          if (isDuplicateModalOpen) {
            handleCloseDuplicateModal();
          }
          setSelectedTestcase(null);
        }
        
        // Đóng recorder window nếu đang mở với testcase này
        try {
          const screenHandleAPI = (window as any)?.screenHandleAPI;
          if (screenHandleAPI?.closeRecorder) {
            const closeResult = await screenHandleAPI.closeRecorder();
            if (closeResult?.success) {
              console.info('[Testcases] Closed recorder window for deleted testcase');
            }
          }
        } catch (e) {
          console.error('[Testcases] Failed to close recorder window:', e);
        }
        
        toast.success('Testcase deleted successfully!');
        handleCloseDeleteModal();
        await reloadTestcases();
      } else {
        toast.error(resp.error || 'Failed to delete testcase. Please try again.');
      }
    } catch (err) {
      toast.error('Failed to delete testcase. Please try again.');
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      // Close dropdown if clicking outside actions container and dropdown
      // Also check if the click is on a dropdown item (button inside dropdown)
      const isInActionsContainer = target.closest('.actions-container');
      const isInDropdown = target.closest('.actions-dropdown');
      const isDropdownItem = target.closest('.dropdown-item');
      
      if (!isInActionsContainer && !isInDropdown && !isDropdownItem) {
        setOpenDropdownId(null);
      }
    };

    // Only use mousedown to avoid conflicts with click handlers
    document.addEventListener('mousedown', handleClickOutside, true); // Use capture phase
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, []);

  const formatValue = (value: string) => {
    if (value.length > 10) {
      return value.substring(0, 20) + '...';
    }
    return value;
  };
  
  return (
    <div className="testcases-page">
      <Header />
      <Breadcrumb items={breadcrumbItems} onNavigate={handleBreadcrumbNavigate} />
      
      <div className="testcases-layout">
        <SidebarNavigator 
          items={sidebarItems} 
          onNavigate={handleSidebarNavigate}
          projectId={projectData?.projectId}
        />
        
        <main className="testcases-main">
          <div className="testcases-container">
            {/* Page Title */}
            <div className="page-title">
              {/* <h1>Testcase List</h1> */}
            </div>

          {/* Controls Section */}
          <div className="testcases-controls">
            <div className="search-section">
              <input
                type="text"
                placeholder="Search by testcase name or description..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="search-input"
              />
              {search && (
                <button
                  onClick={handleClearSearch}
                  className="clear-search-btn"
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1); // Reset page when status filter changes
                }}
                className="status-dropdown"
              >
                <option value="All Status">All Status</option>
                <option value="success">SUCCESS</option>
                <option value="failed">FAILED</option>
                <option value="draft">DRAFT</option>
                <option value="running">RUNNING</option>
              </select>
            </div>

            <div className="controls-section">
              <button
                className={`reload-btn ${isLoading ? 'is-loading' : ''}`}
                onClick={reloadTestcases}
                disabled={isLoading}
                title="Reload testcases"
                aria-label="Reload testcases"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 11a8.1 8.1 0 0 0-15.5-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M4 5v4h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M4 13a8.1 8.1 0 0 0 15.5 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M20 19v-4h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              <select
                value={`${pageSize} rows/page`}
                onChange={(e) => handlePageSizeChange(e.target.value)}
                className="pagination-dropdown"
              >
                <option value="10 rows/page">10 rows/page</option>
                <option value="20 rows/page">20 rows/page</option>
                <option value="30 rows/page">30 rows/page</option>
              </select>

              <button 
                className="create-testcase-btn" 
                onClick={handleCreateTestcase}
                disabled={!canEditPermission}
                title="Create a new testcase with actions and steps"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Create Testcase
              </button>
            </div>
          </div>

          {/* Testcases Table */}
          <div className="testcases-table-container">
            <table className="testcases-table">
                <thead>
                <tr>
                  <th className={`sortable ${sortBy === 'name' ? 'sorted' : ''}`} onClick={() => handleSort('name')}>
                    <span className="th-content"><span className="th-text">Name</span><span className="sort-arrows"><span className={`arrow up ${sortBy === 'name' && order === 'asc' ? 'active' : ''}`}></span><span className={`arrow down ${sortBy === 'name' && order === 'desc' ? 'active' : ''}`}></span></span></span>
                  </th>
                  <th className={`sortable ${sortBy === 'description' ? 'sorted' : ''}`} onClick={() => handleSort('description')}>
                    <span className="th-content"><span className="th-text">Description</span><span className="sort-arrows"><span className={`arrow up ${sortBy === 'description' && order === 'asc' ? 'active' : ''}`}></span><span className={`arrow down ${sortBy === 'description' && order === 'desc' ? 'active' : ''}`}></span></span></span>
                  </th>
                  <th>
                    <span className="th-content"><span className="th-text">Actions</span></span>
                  </th>
                  <th>
                    <span className="th-content"><span className="th-text">Status</span></span>
                  </th>
                  <th className={`sortable ${sortBy === 'updated_at' ? 'sorted' : ''}`} onClick={() => handleSort('updated_at')}>
                    <span className="th-content"><span className="th-text">Updated</span><span className="sort-arrows"><span className={`arrow up ${sortBy === 'updated_at' && order === 'asc' ? 'active' : ''}`}></span><span className={`arrow down ${sortBy === 'updated_at' && order === 'desc' ? 'active' : ''}`}></span></span></span>
                  </th>
                  <th className={`sortable ${sortBy === 'browser_type' ? 'sorted' : ''}`} onClick={() => handleSort('browser_type')}>
                    <span className="th-content"><span className="th-text">Browser Type</span><span className="sort-arrows"><span className={`arrow up ${sortBy === 'browser_type' && order === 'asc' ? 'active' : ''}`}></span><span className={`arrow down ${sortBy === 'browser_type' && order === 'desc' ? 'active' : ''}`}></span></span></span>
                  </th>
                  <th>Options</th>
                </tr>
              </thead>
              <tbody>
                {currentTestcases.map((testcase) => (
                  <tr
                    key={testcase.testcase_id}
                    onClick={(e) => {
                      // Don't open recorder if clicking on actions container or dropdown
                      const target = e.target as Element;
                      const isClickingOnActions = target.closest('.actions-container') || target.closest('.actions-dropdown');
                      
                      // Don't open if any dropdown is open (to prevent accidental clicks)
                      if (!isClickingOnActions && !openDropdownId && canEditPermission) {
                        handleOpenRecorder(testcase.testcase_id);
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                    className={`${runningTestcases.includes(testcase.testcase_id) ? 'is-running' : ''} ${openDropdownId === testcase.testcase_id ? 'dropdown-open' : ''} ${openDropdownId ? 'has-open-dropdown' : ''}`}
                    aria-busy={runningTestcases.includes(testcase.testcase_id)}
                  >
                    <td className="testcase-name" title={testcase.name}>
                      {testcase.name}
                    </td>
                    <td
                      className="testcase-tag"
                      title={testcase.description || ''}
                    >
                      {formatValue(testcase.description || '')}
                    </td>
                    <td className="testcase-actions-count">{testcase.actionsCount}</td>
                    <td className="testcase-status">
                      <span className={`status-badge ${testcase.status || 'Draft'}`}>
                        {testcase.status === 'Running' ? (
                          <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="spinner">
                              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25"/>
                              <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
                            </svg>
                            RUNNING
                          </>
                        ) : (
                          testcase.status
                        )}
                      </span>
                    </td>
                    <td className="testcase-created">{testcase.updatedAt}</td>
                    <td className="testcase-browser-type">{testcase.browser_type || '-'}</td>
                    <td className="testcase-actions">
                      <div className="actions-container">
                        <button 
                          className="actions-btn"
                          onClick={(e) => handleTestcaseActions(testcase.testcase_id, e)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="1" fill="currentColor"/>
                            <circle cx="19" cy="12" r="1" fill="currentColor"/>
                            <circle cx="5" cy="12" r="1" fill="currentColor"/>
                          </svg>
                        </button>
                        
                        {openDropdownId === testcase.testcase_id && (
                          <div 
                            className="actions-dropdown" 
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                            }}
                          >
                            <button
                              className="dropdown-item"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleRunTestcase(testcase.testcase_id, e);
                              }}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                              }}
                              disabled={runningTestcases.includes(testcase.testcase_id) || !canEditPermission || testcase.actionsCount === 0}
                              title={testcase.actionsCount === 0 ? "Cannot run testcase without actions" : "Execute this testcase and view results"}
                            >
                              {runningTestcases.includes(testcase.testcase_id) ? (
                                <>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="spinner">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25"/>
                                    <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
                                  </svg>
                                  Running...
                                </>
                              ) : (
                                <>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <polygon points="8,5 19,12 8,19" fill="currentColor" />
                                  </svg>
                                  Run
                                </>
                              )}
                            </button>
                            <button 
                              className="dropdown-item" 
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleViewResult(testcase.testcase_id, e);
                              }}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                              }}
                              title="View testcase execution results and details"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 5c5 0 9 4 9 7s-4 7-9 7-9-4-9-7 4-7 9-7zm0 3a4 4 0 100 8 4 4 0 000-8z" fill="currentColor"/>
                              </svg>
                              View
                            </button>
                            <button 
                              className="dropdown-item" 
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleOpenEdit(testcase.testcase_id, e);
                              }}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                              }}
                              title="Edit testcase name and tag"
                              disabled={!canEditPermission}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              Edit
                            </button>
                            <button 
                              className="dropdown-item" 
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleOpenDuplicate(testcase.testcase_id, e);
                              }}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                              }}
                              title="Create a copy of this testcase with all its actions"
                              disabled={!canEditPermission}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M16 1H4a2 2 0 0 0-2 2v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <rect x="8" y="5" width="14" height="14" rx="2" ry="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              Duplicate
                            </button>
                            <button 
                              className="dropdown-item delete" 
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleOpenDelete(testcase.testcase_id, e);
                              }}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                              }}
                              title="Permanently delete this testcase and all its actions"
                              disabled={!canEditPermission}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <polyline points="3,6 5,6 21,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
          <div className="pagination">
            <div className="pagination-info">
                Showing {startIndex + 1} to {endIndex} of {totalTestcases} testcases
            </div>
            <div className="pagination-controls">
              <button 
                className="pagination-btn"
                onClick={handlePreviousPage}
                disabled={currentPage === 1 || totalPages === 0}
              >
                Previous
              </button>
              
              <div className="pagination-pages">
                {paginationNumbers.map((page, index) => (
                  <div key={index}>
                    {page === '...' ? (
                      <span className="pagination-ellipsis">...</span>
                    ) : (
                      <button
                        className={`pagination-page ${currentPage === page ? 'active' : ''}`}
                        onClick={() => handlePageChange(page as number)}
                      >
                        {page}
                      </button>
                    )}
                  </div>
                ))}
              </div>
              
              <button 
                className="pagination-btn"
                onClick={handleNextPage}
                disabled={currentPage >= totalPages}
              >
                Next
              </button>
            </div>
          </div>
          )}
          </div>
        </main>
      </div>
      
      {/* Create Testcase Modal */}
      <CreateTestcase
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        onSave={handleSaveTestcase}
        projectId={projectData?.projectId}
      />

      {/* Edit Testcase Modal */}
      <EditTestcase
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        onSave={handleSaveEditTestcase}
        testcase={selectedTestcase ? { 
          testcase_id: selectedTestcase.testcase_id, 
          name: selectedTestcase.name, 
          description: selectedTestcase.description, 
          basic_authentication: selectedTestcase.basic_authentication,
          browser_type: selectedTestcase.browser_type 
        } : null}
        projectId={projectData?.projectId}
      />

      {/* Delete Testcase Modal */}
      <DeleteTestcase
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onDelete={handleDeleteTestcase}
        testcase={selectedTestcase ? { testcase_id: selectedTestcase.testcase_id, name: selectedTestcase.name } : null}
      />

      {/* Duplicate Testcase Modal */}
      <DuplicateTestcase
        isOpen={isDuplicateModalOpen}
        onClose={handleCloseDuplicateModal}
        onSave={handleSaveDuplicateTestcase}
        createTestcaseWithActions={createTestcaseWithActions}
        testcase={selectedTestcase ? { testcase_id: selectedTestcase.testcase_id, name: selectedTestcase.name, description: selectedTestcase.description, basic_authentication: selectedTestcase.basic_authentication } : null}
        projectId={projectData?.projectId}
      />

      {/* Run And View Testcase Modal */}
      <RunAndViewTestcase
        isOpen={isRunAndViewModalOpen}
        onClose={handleCloseRunAndViewModal}
        testcaseId={selectedTestcase?.testcase_id}
        testcaseName={selectedTestcase?.name}
        projectId={projectData?.projectId}
        testcaseData={selectedTestcaseData}
        onReloadTestcases={reloadTestcases}
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

export default Testcases;
