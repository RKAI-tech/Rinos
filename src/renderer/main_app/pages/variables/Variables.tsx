import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Header from '../../components/header/Header';
import Breadcrumb from '../../components/breadcumb/Breadcrumb';
import SidebarNavigator from '../../components/sidebar_navigator/SidebarNavigator';
import './Variables.css';
import { VariableService } from '../../services/variables';
import { ProjectService } from '../../services/projects';
import { BrowserVariableService } from '../../services/browser_variable';
import DeleteVariable from '../../components/variable/delete_variable/DeleteVariable';
import CreateBrowserVariableModal from '../../components/browser_variable/modals/CreateBrowserVariableModal.js';
import EditBrowserVariableModal from '../../components/browser_variable/modals/EditBrowserVariableModal.js';
import DeleteBrowserVariableModal from '../../components/browser_variable/modals/DeleteBrowserVariableModal.js';
import { toast } from 'react-toastify';
import { canEdit } from '../../hooks/useProjectPermissions';
import { VariableListItem } from '../../types/variables';
import { BrowserVariableListItem } from '../../types/browser_variable';

const Variables: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { projectId } = useParams();
  const projectData = { projectId, projectName: (location.state as { projectName?: string } | null)?.projectName };
  const [resolvedProjectName, setResolvedProjectName] = useState<string>(projectData.projectName || 'Project');
  const canEditPermission = canEdit(projectId);
  const [activeTab, setActiveTab] = useState<'database' | 'browser'>('database');

  // Backend-driven search, pagination, and sorting state
  const [variables, setVariables] = useState<VariableListItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<string | null>('user_defined_name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [totalVariables, setTotalVariables] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  
  // UI state
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // UI state
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedVar, setSelectedVar] = useState<{ id: string; name?: string } | null>(null);

  // Browser variables state
  const [browserVariables, setBrowserVariables] = useState<BrowserVariableListItem[]>([]);
  const [browserPage, setBrowserPage] = useState(1);
  const [browserPageSize, setBrowserPageSize] = useState(10);
  const [browserSearch, setBrowserSearch] = useState('');
  const [browserSortBy, setBrowserSortBy] = useState<string | null>('name');
  const [browserOrder, setBrowserOrder] = useState<'asc' | 'desc'>('asc');
  const [browserTotalVariables, setBrowserTotalVariables] = useState(0);
  const [browserCurrentPage, setBrowserCurrentPage] = useState(1);
  const [browserTotalPages, setBrowserTotalPages] = useState(1);
  const [isBrowserLoading, setIsBrowserLoading] = useState(false);
  const [browserReloadKey, setBrowserReloadKey] = useState(0);
  const [browserOpenDropdownId, setBrowserOpenDropdownId] = useState<string | null>(null);
  const [isBrowserCreateOpen, setIsBrowserCreateOpen] = useState(false);
  const [isBrowserEditOpen, setIsBrowserEditOpen] = useState(false);
  const [isBrowserDeleteOpen, setIsBrowserDeleteOpen] = useState(false);
  const [browserSelectedVar, setBrowserSelectedVar] = useState<BrowserVariableListItem | null>(null);
  const [browserName, setBrowserName] = useState('');
  const [browserValue, setBrowserValue] = useState('');
  const [browserEditName, setBrowserEditName] = useState('');
  const [browserEditValue, setBrowserEditValue] = useState('');
  const [isBrowserSaving, setIsBrowserSaving] = useState(false);
  const [isBrowserDeleting, setIsBrowserDeleting] = useState(false);


  // Service - use useMemo to avoid recreating on every render
  const variableService = useMemo(() => new VariableService(), []);
  const browserVariableService = useMemo(() => new BrowserVariableService(), []);
  const projectService = useMemo(() => new ProjectService(), []);

  // Load variables with search, pagination, and sorting
  useEffect(() => {
    const loadVariables = async () => {
    if (!projectId || activeTab !== 'database') return;
      
    try {
        setIsLoading(true);
        const response = await variableService.searchVariables({
          project_id: projectId,
          page: page,
          page_size: pageSize,
          q: search || null,
          sort_by: sortBy || null,
          order: order || 'asc',
        });

        if (response.success && response.data) {
          setVariables(response.data.variables);
          setTotalVariables(response.data.number_variable);
          // Only update page if different to prevent infinite loops
          if (response.data.current_page !== currentPage) {
            setCurrentPage(response.data.current_page);
            setPage(response.data.current_page);
          }
          setTotalPages(response.data.total_pages);
      } else {
          setVariables([]);
          setTotalVariables(0);
          setCurrentPage(1);
          setTotalPages(1);
          if (response.error) {
            toast.error(response.error);
          }
        }
      } catch (error) {
        /* console.error('Error loading variables:', error); */
        setVariables([]);
        setTotalVariables(0);
        setCurrentPage(1);
        setTotalPages(1);
        toast.error('Failed to load variables');
    } finally {
        setIsLoading(false);
    }
  };

    loadVariables();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, page, pageSize, search, sortBy, order, activeTab]);

  useEffect(() => {
    const loadBrowserVariables = async () => {
      if (!projectId || activeTab !== 'browser') return;

      try {
        setIsBrowserLoading(true);
        const response = await browserVariableService.searchBrowserVariables({
          project_id: projectId,
          page: browserPage,
          page_size: browserPageSize,
          q: browserSearch || null,
          sort_by: browserSortBy || null,
          order: browserOrder || 'asc',
        });

        if (response.success && response.data) {
          setBrowserVariables(response.data.browser_variables);
          setBrowserTotalVariables(response.data.number_browser_variable);
          if (response.data.current_page !== browserCurrentPage) {
            setBrowserCurrentPage(response.data.current_page);
            setBrowserPage(response.data.current_page);
          }
          setBrowserTotalPages(response.data.total_pages);
        } else {
          setBrowserVariables([]);
          setBrowserTotalVariables(0);
          setBrowserCurrentPage(1);
          setBrowserTotalPages(1);
          if (response.error) {
            toast.error(response.error);
          }
        }
      } catch (error) {
        setBrowserVariables([]);
        setBrowserTotalVariables(0);
        setBrowserCurrentPage(1);
        setBrowserTotalPages(1);
        toast.error('Failed to load browser variables');
      } finally {
        setIsBrowserLoading(false);
      }
    };

    loadBrowserVariables();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, browserPage, browserPageSize, browserSearch, browserSortBy, browserOrder, activeTab, browserReloadKey]);

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
        setBrowserOpenDropdownId(null);
      }
    };

    // Only use mousedown to avoid conflicts with click handlers
    document.addEventListener('mousedown', handleClickOutside, true); // Use capture phase
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [openDropdownId, browserOpenDropdownId]);

  const sidebarItems = [
    { id: 'suites-manager', label: 'Test Manager', path: `/suites-manager/${projectId}`, isActive: false },
    { id: 'testcases', label: 'Testcases', path: `/testcases/${projectId}`, isActive: false },
    // Temporarily disabled Test Suites navigation
    // { id: 'test-suites', label: 'Test Suites', path: `/test-suites/${projectId}`, isActive: false },
    { id: 'browser-storage', label: 'Browser Storage', path: `/browser-storage/${projectId}`, isActive: false },
    { id: 'databases', label: 'Databases', path: `/databases/${projectId}`, isActive: false },
    { id: 'queries', label: 'Queries', path: `/queries/${projectId}`, isActive: false },
    { id: 'variables', label: 'Variables', path: `/variables/${projectId}`, isActive: true },
    { id: 'change-log', label: 'Activities', path: `/change-log/${projectId}`, isActive: false },
  ];

  const breadcrumbItems = [
    { label: 'Projects', path: '/dashboard', isActive: false },
    { label: resolvedProjectName, path: `/variables/${projectId}`, isActive: true },
  ];
  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1); // Reset page when searching
  };

  // Handle clear search
  const handleClearSearch = () => {
    setSearch('');
    setPage(1);
  };

  // Handle sort
  const handleSort = (col: string) => {
    if (sortBy === col) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setOrder('asc');
    }
    setPage(1); // Reset page when sorting
  };

  // Handle page size change
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPageSize = parseInt(e.target.value.split(' ')[0]);
    setPageSize(newPageSize);
    setPage(1); // Reset page when changing page size
  };

  // Reload variables (for reload button)
  const reloadVariables = () => {
    setPage(1);
    // The useEffect will automatically trigger when page changes
  };

  // Browser variables handlers
  const handleBrowserSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBrowserSearch(e.target.value);
    setBrowserPage(1);
  };

  const handleBrowserClearSearch = () => {
    setBrowserSearch('');
    setBrowserPage(1);
  };

  const handleBrowserSort = (col: string) => {
    if (browserSortBy === col) {
      setBrowserOrder(browserOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setBrowserSortBy(col);
      setBrowserOrder('asc');
    }
    setBrowserPage(1);
  };

  const handleBrowserPageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPageSize = parseInt(e.target.value.split(' ')[0]);
    setBrowserPageSize(newPageSize);
    setBrowserPage(1);
  };

  const reloadBrowserVariables = () => {
    setBrowserPage(1);
    setBrowserReloadKey((prev) => prev + 1);
  };

  const generatePaginationNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 3) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
    else if (currentPage <= 2) { pages.push(1, 2, 3); if (totalPages > 4) pages.push('...'); if (totalPages > 3) pages.push(totalPages); }
    else if (currentPage >= totalPages - 1) { pages.push(1); if (totalPages > 4) pages.push('...'); pages.push(totalPages - 2, totalPages - 1, totalPages); }
    else { pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages); }
    return pages;
  };
  const paginationNumbers = generatePaginationNumbers();


  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    // Don't reset page here - this is pagination, not a data-altering action
  };
  const handlePreviousPage = () => { if (page > 1) setPage(page - 1); };
  const handleNextPage = () => { if (page < totalPages) setPage(page + 1); };

  const generateBrowserPaginationNumbers = () => {
    const pages: (number | string)[] = [];
    if (browserTotalPages <= 3) { for (let i = 1; i <= browserTotalPages; i++) pages.push(i); }
    else if (browserCurrentPage <= 2) { pages.push(1, 2, 3); if (browserTotalPages > 4) pages.push('...'); if (browserTotalPages > 3) pages.push(browserTotalPages); }
    else if (browserCurrentPage >= browserTotalPages - 1) { pages.push(1); if (browserTotalPages > 4) pages.push('...'); pages.push(browserTotalPages - 2, browserTotalPages - 1, browserTotalPages); }
    else { pages.push(1, '...', browserCurrentPage - 1, browserCurrentPage, browserCurrentPage + 1, '...', browserTotalPages); }
    return pages;
  };
  const browserPaginationNumbers = generateBrowserPaginationNumbers();

  const handleBrowserPageChange = (newPage: number) => {
    setBrowserPage(newPage);
  };
  const handleBrowserPreviousPage = () => { if (browserPage > 1) setBrowserPage(browserPage - 1); };
  const handleBrowserNextPage = () => { if (browserPage < browserTotalPages) setBrowserPage(browserPage + 1); };
  const handleBreadcrumbNavigate = (path: string) => navigate(path);
  const handleSidebarNavigate = (path: string) => navigate(path);

  const openBrowserCreateModal = () => {
    setBrowserName('');
    setBrowserValue('');
    setIsBrowserCreateOpen(true);
  };

  const closeBrowserCreateModal = () => {
    setIsBrowserCreateOpen(false);
    setBrowserName('');
    setBrowserValue('');
  };

  const openBrowserEditModal = (variable: BrowserVariableListItem) => {
    setBrowserSelectedVar(variable);
    setBrowserEditName(variable.name || '');
    setBrowserEditValue(variable.value || '');
    setIsBrowserEditOpen(true);
    setBrowserOpenDropdownId(null);
  };

  const closeBrowserEditModal = () => {
    setIsBrowserEditOpen(false);
    setBrowserSelectedVar(null);
    setBrowserEditName('');
    setBrowserEditValue('');
  };

  const openBrowserDeleteModal = (variable: BrowserVariableListItem) => {
    setBrowserSelectedVar(variable);
    setIsBrowserDeleteOpen(true);
    setBrowserOpenDropdownId(null);
  };

  const closeBrowserDeleteModal = () => {
    setIsBrowserDeleteOpen(false);
    setBrowserSelectedVar(null);
  };

  const handleCreateBrowserVariable = async () => {
    if (!projectId) {
      toast.error('Missing project ID');
      return;
    }
    if (!browserName.trim() || !browserValue.trim()) {
      toast.error('Name and value are required');
      return;
    }

    try {
      setIsBrowserSaving(true);
      const resp = await browserVariableService.createBrowserVariable({
        project_id: projectId,
        name: browserName.trim(),
        value: browserValue.trim(),
      });
      if (resp.success) {
        toast.success('Browser variable created');
        closeBrowserCreateModal();
        reloadBrowserVariables();
      } else {
        toast.error(resp.error || 'Failed to create browser variable');
      }
    } catch (e) {
      toast.error('Failed to create browser variable');
    } finally {
      setIsBrowserSaving(false);
    }
  };

  const handleUpdateBrowserVariable = async () => {
    if (!browserSelectedVar?.browser_variable_id) return;
    if (!browserEditName.trim() || !browserEditValue.trim()) {
      toast.error('Name and value are required');
      return;
    }
    try {
      setIsBrowserSaving(true);
      const resp = await browserVariableService.updateBrowserVariable(browserSelectedVar.browser_variable_id, {
        name: browserEditName.trim(),
        value: browserEditValue.trim(),
      });
      if (resp.success) {
        toast.success('Browser variable updated');
        closeBrowserEditModal();
        reloadBrowserVariables();
      } else {
        toast.error(resp.error || 'Failed to update browser variable');
      }
    } catch (e) {
      toast.error('Failed to update browser variable');
    } finally {
      setIsBrowserSaving(false);
    }
  };

  const handleDeleteBrowserVariable = async () => {
    if (!browserSelectedVar?.browser_variable_id) return;
    try {
      setIsBrowserDeleting(true);
      const resp = await browserVariableService.deleteBrowserVariable(browserSelectedVar.browser_variable_id);
      if (resp.success) {
        toast.success('Browser variable deleted');
        closeBrowserDeleteModal();
        reloadBrowserVariables();
      } else {
        toast.error(resp.error || 'Failed to delete browser variable');
      }
    } catch (e) {
      toast.error('Failed to delete browser variable');
    } finally {
      setIsBrowserDeleting(false);
    }
  };

  return (
    <div className="vars-page">
      <Header />
      <Breadcrumb items={breadcrumbItems} onNavigate={handleBreadcrumbNavigate} />

      <div className="vars-layout">
        <SidebarNavigator
          items={sidebarItems}
          onNavigate={handleSidebarNavigate}
          projectId={projectId}
        />

        <main className="vars-main">
          <div className="vars-container">
            <div className="page-title" />

            <div className="vars-tabs">
              <button
                className={`vars-tab ${activeTab === 'database' ? 'active' : ''}`}
                onClick={() => setActiveTab('database')}
                type="button"
              >
                Database Variables
              </button>
              <button
                className={`vars-tab ${activeTab === 'browser' ? 'active' : ''}`}
                onClick={() => setActiveTab('browser')}
                type="button"
              >
                Browser Variables
              </button>
            </div>

            {activeTab === 'database' ? (
              <>
                <div className="vars-controls">
                  <div className="vars-search-section">
                    <input
                      type="text"
                      placeholder="Search by name or value..."
                      value={search}
                      onChange={handleSearchChange}
                      className="vars-search-input"
                    />
                    {search && (
                      <button
                        className="clear-search-btn"
                        onClick={handleClearSearch}
                        title="Clear search"
                        aria-label="Clear search"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                          <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </button>
                    )}
                  </div>

                  <div className="vars-controls-section">
                    <button
                      className={`reload-btn ${isLoading ? 'is-loading' : ''}`}
                      onClick={reloadVariables}
                      disabled={isLoading}
                      title="Reload variables"
                      aria-label="Reload variables"
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
                      onChange={handlePageSizeChange}
                      className="vars-pagination-dropdown"
                    >
                      <option value="10 rows/page">10 rows/page</option>
                      <option value="20 rows/page">20 rows/page</option>
                      <option value="30 rows/page">30 rows/page</option>
                    </select>
                  </div>
                </div>

                <div className="vars-table-container">
                  <table className="vars-table">
                    <thead>
                      <tr>
                        <th className={`sortable ${sortBy === 'user_defined_name' ? 'sorted' : ''}`} onClick={() => handleSort('user_defined_name')}><span className="th-content"><span className="th-text">Custom name</span><span className="sort-arrows"><span className={`arrow up ${sortBy === 'user_defined_name' && order === 'asc' ? 'active' : ''}`}></span><span className={`arrow down ${sortBy === 'user_defined_name' && order === 'desc' ? 'active' : ''}`}></span></span></span></th>
                        <th className={`sortable ${sortBy === 'original_name' ? 'sorted' : ''}`} onClick={() => handleSort('original_name')}><span className="th-content"><span className="th-text">Original name</span><span className="sort-arrows"><span className={`arrow up ${sortBy === 'original_name' && order === 'asc' ? 'active' : ''}`}></span><span className={`arrow down ${sortBy === 'original_name' && order === 'desc' ? 'active' : ''}`}></span></span></span></th>
                        <th className="th-content"><span className="th-text">Value</span></th>
                        <th className="th-content"><span className="th-text">Database name</span></th>
                        <th className="th-content"><span className="th-text">Database type</span></th>
                        <th className="th-content"><span className="th-text">Query name</span></th>
                        <th>Options</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>
                            Loading...
                          </td>
                        </tr>
                      ) : variables.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>
                            No variables found
                          </td>
                        </tr>
                      ) : (
                        variables.map((v) => (
                          <tr 
                            key={v.variable_id}
                            className={`${openDropdownId === v.variable_id ? 'dropdown-open' : ''} ${openDropdownId ? 'has-open-dropdown' : ''}`}
                          >
                            <td className="vars-name">{v.user_defined_name}</td>
                            <td className="vars-original">{v.original_name || '-'}</td>
                            <td className="vars-value">{v.value || '-'}</td>
                            <td className="vars-db-name">{v.database_name || '-'}</td>
                            <td className="vars-db-type">{v.database_type || '-'}</td>
                            <td className="vars-query-name">{v.query_name || '-'}</td>
                            <td className="vars-actions">
                              <div className="actions-container">
                                <button 
                                  className="actions-btn" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenDropdownId(openDropdownId === v.variable_id ? null : v.variable_id);
                                  }}
                                  disabled={!canEditPermission}
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="1" fill="currentColor"/>
                                    <circle cx="19" cy="12" r="1" fill="currentColor"/>
                                    <circle cx="5" cy="12" r="1" fill="currentColor"/>
                                  </svg>
                                </button>

                                {openDropdownId === v.variable_id && (
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
                                      className="dropdown-item delete" 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        if (!canEditPermission) { 
                                          setOpenDropdownId(null); 
                                          return; 
                                        } 
                                        setSelectedVar({ id: v.variable_id, name: v.user_defined_name }); 
                                        setIsDeleteOpen(true); 
                                        setOpenDropdownId(null);
                                      }}
                                      onMouseDown={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                      }}
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
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="vars-pagination">
                    <div className="vars-pagination-info">
                      Showing {variables.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalVariables)} of {totalVariables} variables
                    </div>
                    <div className="vars-pagination-controls">
                      <button className="vars-pagination-btn" onClick={handlePreviousPage} disabled={page === 1}>Previous</button>
                      <div className="vars-pagination-pages">
                        {paginationNumbers.map((pageNum, index) => (
                          <div key={index}>
                            {pageNum === '...' ? (
                              <span className="vars-pagination-ellipsis">...</span>
                            ) : (
                              <button className={`vars-pagination-page ${page === pageNum ? 'active' : ''}`} onClick={() => handlePageChange(pageNum as number)}>
                                {pageNum}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <button className="vars-pagination-btn" onClick={handleNextPage} disabled={page === totalPages}>Next</button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="vars-controls">
                  <div className="vars-search-section">
                    <input
                      type="text"
                      placeholder="Search by name or value..."
                      value={browserSearch}
                      onChange={handleBrowserSearchChange}
                      className="vars-search-input"
                    />
                    {browserSearch && (
                      <button
                        className="clear-search-btn"
                        onClick={handleBrowserClearSearch}
                        title="Clear search"
                        aria-label="Clear search"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                          <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </button>
                    )}
                  </div>

                  <div className="vars-controls-section">
                    <button
                      className={`reload-btn ${isBrowserLoading ? 'is-loading' : ''}`}
                      onClick={reloadBrowserVariables}
                      disabled={isBrowserLoading}
                      title="Reload browser variables"
                      aria-label="Reload browser variables"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 11a8.1 8.1 0 0 0-15.5-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M4 5v4h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M4 13a8.1 8.1 0 0 0 15.5 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M20 19v-4h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>

                    <select
                      value={`${browserPageSize} rows/page`}
                      onChange={handleBrowserPageSizeChange}
                      className="vars-pagination-dropdown"
                    >
                      <option value="10 rows/page">10 rows/page</option>
                      <option value="20 rows/page">20 rows/page</option>
                      <option value="30 rows/page">30 rows/page</option>
                    </select>

                    <button
                      className="vars-create-btn"
                      onClick={openBrowserCreateModal}
                      disabled={!canEditPermission}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Create Browser Variable
                    </button>
                  </div>
                </div>

                <div className="vars-table-container">
                  <table className="vars-table">
                    <thead>
                      <tr>
                        <th className={`sortable ${browserSortBy === 'name' ? 'sorted' : ''}`} onClick={() => handleBrowserSort('name')}>
                          <span className="th-content">
                            <span className="th-text">Name</span>
                            <span className="sort-arrows">
                              <span className={`arrow up ${browserSortBy === 'name' && browserOrder === 'asc' ? 'active' : ''}`}></span>
                              <span className={`arrow down ${browserSortBy === 'name' && browserOrder === 'desc' ? 'active' : ''}`}></span>
                            </span>
                          </span>
                        </th>
                        <th className="th-content"><span className="th-text">Value</span></th>
                        <th className={`sortable ${browserSortBy === 'updated_at' ? 'sorted' : ''}`} onClick={() => handleBrowserSort('updated_at')}>
                          <span className="th-content">
                            <span className="th-text">Updated</span>
                            <span className="sort-arrows">
                              <span className={`arrow up ${browserSortBy === 'updated_at' && browserOrder === 'asc' ? 'active' : ''}`}></span>
                              <span className={`arrow down ${browserSortBy === 'updated_at' && browserOrder === 'desc' ? 'active' : ''}`}></span>
                            </span>
                          </span>
                        </th>
                        <th>Options</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isBrowserLoading ? (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', padding: '40px' }}>
                            Loading...
                          </td>
                        </tr>
                      ) : browserVariables.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', padding: '40px' }}>
                            No browser variables found
                          </td>
                        </tr>
                      ) : (
                        browserVariables.map((v) => (
                          <tr
                            key={v.browser_variable_id}
                            className={`${browserOpenDropdownId === v.browser_variable_id ? 'dropdown-open' : ''} ${browserOpenDropdownId ? 'has-open-dropdown' : ''}`}
                          >
                            <td className="vars-name">{v.name}</td>
                            <td className="vars-value">{v.value || '-'}</td>
                            <td className="vars-updated">{v.updated_at || '-'}</td>
                            <td className="vars-actions">
                              <div className="actions-container">
                                <button
                                  className="actions-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setBrowserOpenDropdownId(browserOpenDropdownId === v.browser_variable_id ? null : v.browser_variable_id);
                                  }}
                                  disabled={!canEditPermission}
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="1" fill="currentColor"/>
                                    <circle cx="19" cy="12" r="1" fill="currentColor"/>
                                    <circle cx="5" cy="12" r="1" fill="currentColor"/>
                                  </svg>
                                </button>

                                {browserOpenDropdownId === v.browser_variable_id && (
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
                                        if (!canEditPermission) {
                                          setBrowserOpenDropdownId(null);
                                          return;
                                        }
                                        openBrowserEditModal(v);
                                      }}
                                      onMouseDown={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                      }}
                                      disabled={!canEditPermission}
                                    >
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>
                                      Edit
                                    </button>
                                    <button
                                      className="dropdown-item delete"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        if (!canEditPermission) {
                                          setBrowserOpenDropdownId(null);
                                          return;
                                        }
                                        openBrowserDeleteModal(v);
                                      }}
                                      onMouseDown={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                      }}
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
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {browserTotalPages > 1 && (
                  <div className="vars-pagination">
                    <div className="vars-pagination-info">
                      Showing {browserVariables.length === 0 ? 0 : (browserCurrentPage - 1) * browserPageSize + 1} to {Math.min(browserCurrentPage * browserPageSize, browserTotalVariables)} of {browserTotalVariables} variables
                    </div>
                    <div className="vars-pagination-controls">
                      <button className="vars-pagination-btn" onClick={handleBrowserPreviousPage} disabled={browserPage === 1}>Previous</button>
                      <div className="vars-pagination-pages">
                        {browserPaginationNumbers.map((pageNum, index) => (
                          <div key={index}>
                            {pageNum === '...' ? (
                              <span className="vars-pagination-ellipsis">...</span>
                            ) : (
                              <button className={`vars-pagination-page ${browserPage === pageNum ? 'active' : ''}`} onClick={() => handleBrowserPageChange(pageNum as number)}>
                                {pageNum}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <button className="vars-pagination-btn" onClick={handleBrowserNextPage} disabled={browserPage === browserTotalPages}>Next</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      <DeleteVariable
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        variable={selectedVar}
        onDelete={async (id) => {
          try {
            const resp = await variableService.deleteVariable(id);
            if (resp.success) {
              toast.success('Variable deleted');
              setIsDeleteOpen(false);
              // Reload variables - the useEffect will automatically trigger
              reloadVariables();
            } else {
              toast.error(resp.error || 'Failed to delete variable');
            }
          } catch (e) {
            toast.error('Failed to delete variable');
          }
        }}
      />
      <CreateBrowserVariableModal
        isOpen={isBrowserCreateOpen}
        onClose={closeBrowserCreateModal}
        onSave={handleCreateBrowserVariable}
        isSaving={isBrowserSaving}
        name={browserName}
        value={browserValue}
        setName={setBrowserName}
        setValue={setBrowserValue}
      />
      <EditBrowserVariableModal
        isOpen={isBrowserEditOpen}
        onClose={closeBrowserEditModal}
        onSave={handleUpdateBrowserVariable}
        isSaving={isBrowserSaving}
        name={browserEditName}
        value={browserEditValue}
        setName={setBrowserEditName}
        setValue={setBrowserEditValue}
      />
      <DeleteBrowserVariableModal
        isOpen={isBrowserDeleteOpen}
        onClose={closeBrowserDeleteModal}
        onConfirm={handleDeleteBrowserVariable}
        isDeleting={isBrowserDeleting}
        variableName={browserSelectedVar?.name}
      />
    </div>
  );
};

export default Variables;


