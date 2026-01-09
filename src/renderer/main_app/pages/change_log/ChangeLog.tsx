import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Header from '../../components/header/Header';
import Breadcrumb from '../../components/breadcumb/Breadcrumb';
import SidebarNavigator from '../../components/sidebar_navigator/SidebarNavigator';
import './ChangeLog.css';
import { ProjectService } from '../../services/projects';
import { HistoryItemService } from '../../services/historyItem';
import { HistoryItem } from '../../types/historyItem';
import { canManage } from '../../hooks/useProjectPermissions';

const ChangeLog: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { projectId } = useParams();

  const projectData = { projectId, projectName: (location.state as { projectName?: string } | null)?.projectName };
  const [resolvedProjectName, setResolvedProjectName] = useState<string>(projectData.projectName || 'Project');
  const canManagePermission = canManage(projectId);

  // Backend-driven search, pagination, and sorting state
  const [histories, setHistories] = useState<HistoryItem[]>([]);
  // UI state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [entityFilter, setEntityFilter] = useState<string | null>(null); // 'Project', 'Testcase', 'Suite', or null for all
  const [actionTypeFilter, setActionTypeFilter] = useState<string | null>(null); // 'updated', 'deleted', 'executed', 'recorded', or null for all
  const [sortBy, setSortBy] = useState<string | null>('created_at');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [totalHistories, setTotalHistories] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Service - use useMemo to avoid recreating on every render
  const historyItemService = useMemo(() => new HistoryItemService(), []);
  const projectService = useMemo(() => new ProjectService(), []);

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

  // Load histories with search, pagination, and sorting
  useEffect(() => {
  const loadHistories = async () => {
    if (!projectId) return;
      
    try {
      setIsLoading(true);
      setError(null);
        
        // Format dates for API (convert datetime-local to YYYY-MM-DD HH:MM:SS or YYYY-MM-DD)
        const formatDateForAPI = (dateStr: string): string | null => {
          if (!dateStr) return null;
          // If it's already in the right format, return as is
          // Otherwise, convert from datetime-local format (YYYY-MM-DDTHH:mm) to YYYY-MM-DD HH:MM:SS
          if (dateStr.includes('T')) {
            return dateStr.replace('T', ' ') + ':00';
          }
          return dateStr;
        };

        const response = await historyItemService.searchHistories({
          project_id: projectId,
          page: page,
          page_size: pageSize,
          q: search || null,
          from_date: formatDateForAPI(fromDate),
          to_date: formatDateForAPI(toDate),
          entity_type: entityFilter || null,
          action_type: actionTypeFilter || null,
          sort_by: sortBy || 'created_at',
          order: order || 'desc',
        });

        if (response.success && response.data) {
          setHistories(response.data.histories);
          setTotalHistories(response.data.number_history);
          // Only update page if different to prevent infinite loops
          if (response.data.current_page !== currentPage) {
            setCurrentPage(response.data.current_page);
            setPage(response.data.current_page);
          }
          setTotalPages(response.data.total_pages);
      } else {
        setHistories([]);
          setTotalHistories(0);
          setCurrentPage(1);
          setTotalPages(1);
          setError(response.error || 'Failed to load histories');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred');
      setHistories([]);
        setTotalHistories(0);
        setCurrentPage(1);
        setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  };

    loadHistories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, page, pageSize, search, fromDate, toDate, entityFilter, actionTypeFilter, sortBy, order]);

  const sidebarItems = [
    { id: 'suites-manager', label: 'Suites Manager', path: `/suites-manager/${projectId}`, isActive: false },
    { id: 'testcases', label: 'Testcases', path: `/testcases/${projectId}`, isActive: false },
    // Temporarily disabled Test Suites navigation
    // { id: 'test-suites', label: 'Test Suites', path: `/test-suites/${projectId}`, isActive: false },
    { id: 'browser-storage', label: 'Browser Storage', path: `/browser-storage/${projectId}`, isActive: false },
    { id: 'databases', label: 'Databases', path: `/databases/${projectId}`, isActive: false },
    { id: 'queries', label: 'Queries', path: `/queries/${projectId}`, isActive: false },
    { id: 'variables', label: 'Variables', path: `/variables/${projectId}`, isActive: false },
    { id: 'change-log', label: 'Activities', path: `/change-log/${projectId}`, isActive: true },
  ];

  const breadcrumbItems = [
    { label: 'Projects', path: '/dashboard', isActive: false },
    { label: resolvedProjectName, path: `/change-log/${projectId}`, isActive: true },
  ];

  const handleSidebarNavigate = (path: string) => navigate(path);
  const handleBreadcrumbNavigate = (path: string) => navigate(path);

  const toggleExpanded = (historyId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(historyId)) {
      newExpanded.delete(historyId);
    } else {
      newExpanded.add(historyId);
    }
    setExpandedItems(newExpanded);
  };

  const toggleDateCollapsed = (date: string) => {
    const next = new Set(collapsedDates);
    if (next.has(date)) {
      next.delete(date);
    } else {
      next.add(date);
    }
    setCollapsedDates(next);
  };

  const formatDataObject = (data: any): string[] => {
    if (!data || typeof data !== 'object') return [];
    return Object.entries(data).map(([key, value]) => `${key}: ${value}`);
  };


  // Handle clear search
  const handleClearSearch = () => {
    setSearch('');
    setPage(1);
  };

  // Handle from date change
  const handleFromDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFromDate(e.target.value);
    setPage(1); // Reset page when filtering
  };

  // Handle to date change
  const handleToDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setToDate(e.target.value);
    setPage(1); // Reset page when filtering
  };

  // Handle entity filter change
  const handleEntityFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setEntityFilter(value === 'all' ? null : value);
    setPage(1); // Reset page when filtering
  };

  // Handle action type filter change
  const handleActionTypeFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setActionTypeFilter(value === 'all' ? null : value);
    setPage(1); // Reset page when filtering
  };

  // Handle page size change
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPageSize = parseInt(e.target.value);
    setPageSize(newPageSize);
    setPage(1); // Reset page when changing page size
  };

  // Reload histories (for reload button)
  const reloadHistories = () => {
    setPage(1);
    // The useEffect will automatically trigger when page changes
  };
  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1); // Reset page when searching
  };


  const formatDateTime = (iso: string) => {
    try {
      const d = new Date(iso);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const mi = String(d.getMinutes()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd} · ${hh}:${mi}`;
    } catch {
      return iso;
    }
  };

  const formatDateOnly = (iso: string) => {
    try {
      const d = new Date(iso);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    } catch { return iso; }
  };

  const formatTimeOnly = (iso: string) => {
    try {
      const d = new Date(iso);
      const hh = String(d.getHours()).padStart(2, '0');
      const mi = String(d.getMinutes()).padStart(2, '0');
      return `${hh}:${mi}`;
    } catch { return iso; }
  };

  const handleClearAllTimeline = async () => {
    if (!projectId || !canManagePermission) return;
    try {
      setIsLoading(true);
      const resp = await historyItemService.deleteAllHistory(projectId);
      if (resp.success) {
        setHistories([]);
        setTotalHistories(0);
        setShowClearConfirm(false);
        // Reload to refresh the list
        reloadHistories();
      } else {
        setError(resp.error || 'Failed to clear timeline');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred while clearing timeline');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteHistoryItem = async (historyId: string) => {
    if (!projectId || !canManagePermission) return;
    try {
      setIsLoading(true);
      const payload = {
        history_id: historyId,
        project_id: projectId
      };
      const resp = await historyItemService.deleteHistory(payload);
      if (resp.success) {
        setShowDeleteConfirm(null);
        // Reload to refresh the list
        reloadHistories();
      } else {
        setError(resp.error || 'Failed to delete history item');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred while deleting history item');
    } finally {
      setIsLoading(false);
    }
  };

  // Group histories by date for display (client-side grouping only, data already sorted by backend)
  const groupedByDate = useMemo(() => {
    const groups: { date: string; items: HistoryItem[] }[] = [];
    const map = new Map<string, HistoryItem[]>();
    histories.forEach((h) => {
      const key = formatDateOnly(h.created_at);
      const arr = map.get(key) || [];
      arr.push(h);
      map.set(key, arr);
    });
    // sort dates desc
    const dates = Array.from(map.keys()).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    dates.forEach((dKey) => {
      const items = map.get(dKey) || [];
      groups.push({ date: dKey, items });
    });
    return groups;
  }, [histories]);

  return (
    <div className="changelog-page">
      <Header />
      <Breadcrumb items={breadcrumbItems} onNavigate={handleBreadcrumbNavigate} />

      <div className="changelog-layout">
        <SidebarNavigator
          items={sidebarItems}
          onNavigate={handleSidebarNavigate}
          projectId={projectData?.projectId}
        />

        <main className="changelog-main">
          <div className="changelog-container">
            <div className="page-title" />

            <div className="changelog-controls">
              <div className="changelog-toolbar">
                <div className="toolbar-row toolbar-top">
                  <div className="date-range">
                    <div className="filter-label" style={{ fontSize: '14px', fontWeight: 'bold' }}>From</div>
                    <input
                      className="input control from"
                      type="datetime-local"
                      value={fromDate}
                      onChange={handleFromDateChange}
                      aria-label="From date"
                    />
                    <span className="range-sep">–</span>
                    <div className="filter-label" style={{ fontSize: '14px', fontWeight: 'bold' }}>To</div>
                    <input
                      className="input control to"
                      type="datetime-local"
                      value={toDate}
                      onChange={handleToDateChange}
                      aria-label="To date"
                    />
                  </div>
                  <div className="type-filter">
                    <div className="filter-label" style={{ fontSize: '14px', fontWeight: 'bold' }}>Entity Type</div>
                    <select
                      className="input"
                      value={entityFilter || 'all'}
                      onChange={handleEntityFilterChange}
                      aria-label="Filter by entity type"
                      title="Filter by entity type"
                    >
                      <option value="all">All</option>
                      <option value="Project">Project</option>
                      <option value="Testcase">Testcase</option>
                      <option value="Suite">Suite</option>
                    </select>
                  </div>
                  <div className="type-filter">
                    <div className="filter-label" style={{ fontSize: '14px', fontWeight: 'bold' }}>Action Type</div>
                    <select
                      className="input"
                      value={actionTypeFilter || 'all'}
                      onChange={handleActionTypeFilterChange}
                      aria-label="Filter by action type"
                      title="Filter by action type"
                    >
                      <option value="all">All</option>
                      <option value="updated">Updated</option>
                      <option value="deleted">Deleted</option>
                      <option value="executed">Executed</option>
                      <option value="recorded">Recorded</option>
                    </select>
                  </div>
                </div>

                <div className="toolbar-row toolbar-bottom">
                  <div className="date-search">
                  <div className="filter-label" style={{ fontSize: '14px', fontWeight: 'bold' }}>Search</div>
                  <div className="searchbox" style={{ position: 'relative' }}>
                    <span className="search-icon" aria-hidden>🔎</span>
                    <input
                      className="input search"
                      type="text"
                      placeholder="Search member, action, description"
                      value={search}
    
                      onChange={handleSearchChange}
                      aria-label="Search change logs"
                    />
                    {search && (
                      <button
                        className="clear-search-btn"
                        onClick={handleClearSearch}
                        title="Clear search"
                        aria-label="Clear search"
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          padding: '4px',
                          cursor: 'pointer',
                          color: '#6b7280',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                          <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </button>
                    )}
                    
                  </div>
                  </div>
                  <div className="actions-group">
                    <select
                      className="input"
                      value={pageSize}
                      onChange={handlePageSizeChange}
                      style={{ minWidth: '100px' }}
                      aria-label="Items per page"
                    >
                      <option value={10}>10 per page</option>
                      <option value={20}>20 per page</option>
                      <option value={30}>30 per page</option>
                      <option value={50}>50 per page</option>
                    </select>
          
                    <button
                      className="btn ghost"
                      onClick={() => setShowClearConfirm(true)}
                      title="Clear all timeline"
                      disabled={isLoading || histories.length === 0 || !canManagePermission}
                    >
                      Clear All
                    </button>
                    <button
                      className={`reload-btn ${isLoading ? 'is-loading' : ''}`}
                      onClick={() => reloadHistories()}
                      disabled={isLoading}
                      title="Reload activities"
                      aria-label="Reload activities"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 11a8.1 8.1 0 0 0-15.5-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M4 5v4h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M4 13a8.1 8.1 0 0 0 15.5 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M20 19v-4h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline Content */}
            <div className="timeline-container">
              {isLoading ? (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <span>Loading change logs...</span>
                </div>
              ) : error ? (
                <div className="error-state">
                  <span className="error-icon">⚠️</span>
                  <span>{error}</span>
                </div>
              ) : groupedByDate.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">📝</span>
                  <span>No change logs found</span>
                </div>
              ) : (
                <>
                <div className="timeline">
                  {groupedByDate.map((group) => (
                    <div key={group.date} className="timeline-day-group">
                      <div className="timeline-day-header">
                        <button
                          className="timeline-day-toggle"
                          onClick={() => toggleDateCollapsed(group.date)}
                          aria-label={`Toggle ${group.date}`}
                        >
                          <span className={`chevron ${collapsedDates.has(group.date) ? 'collapsed' : ''}`}>▾</span>
                        </button>
                        <div className="timeline-day-date">{group.date}</div>
                        <div className="timeline-day-line"></div>
                      </div>
                      
                      {!collapsedDates.has(group.date) && (
                        <div className="timeline-items">
                          {group.items.map((item) => (
                            <div key={item.history_id} className="timeline-item">
                              <div className="timeline-item-time">
                                {formatTimeOnly(item.created_at)}
                              </div>
                              <div className="timeline-item-content">
                                <div 
                                  className={`timeline-item-header ${(item.old_data || item.new_data) ? 'clickable' : ''}`}
                                  onClick={(item.old_data || item.new_data) ? () => toggleExpanded(item.history_id) : undefined}
                                  style={{ cursor: (item.old_data || item.new_data) ? 'pointer' : 'default' }}
                                >
                                  <div className="timeline-item-main">
                                    <div className="timeline-item-content-text">
                                      {item.entity_name && (
                                        <span className="timeline-item-description">
                                          {item.entity_name}
                                        </span>
                                      )}
                                      <span className="timeline-item-was"> was </span>
                                      <span className="timeline-item-action">
                                        {item.action_type}
                                      </span>
                                      <span className="timeline-item-by"> by </span>
                                      <span className="timeline-item-user">
                                        {item.user_name || item.user_id}
                                      </span>
                                    </div>
                                  </div>
                                  <button
                                    className="timeline-item-delete"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!canManagePermission) return;
                                      setShowDeleteConfirm(item.history_id);
                                    }}
                                    title="Delete this history item"
                                    disabled={isLoading || !canManagePermission}
                                  >
                                    ✕
                                  </button>
                                </div>
                                
                                {expandedItems.has(item.history_id) && (item.old_data || item.new_data) && (
                                  <div className="timeline-item-details">
                                    <div className="data-comparison">
                                      {item.old_data && (
                                        <div className="data-section old-data">
                                          <div className="data-section-header">Old Data</div>
                                          <div className="data-section-content">
                                            {Object.entries(item.old_data).map(([key, value]) => (
                                              <div key={key} className="data-entry">
                                                <span className="data-key">{key}:</span>
                                                <span className="data-value">{String(value).replace(/\\n/g, '\n')}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      {item.new_data && (
                                        <div className="data-section new-data">
                                          <div className="data-section-header">New Data</div>
                                          <div className="data-section-content">
                                            {Object.entries(item.new_data).map(([key, value]) => (
                                              <div key={key} className="data-entry">
                                                <span className="data-key">{key}:</span>
                                                <span className="data-value">{String(value)}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                  
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="changelog-pagination">
                      <div className="changelog-pagination-info">
                        Showing {histories.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalHistories)} of {totalHistories} histories
                      </div>
                      <div className="changelog-pagination-controls">
                        <button 
                          className="changelog-pagination-btn" 
                          onClick={() => setPage(page - 1)} 
                          disabled={page === 1}
                        >
                          Previous
                        </button>
                        <div className="changelog-pagination-pages">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum: number;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (page <= 3) {
                              pageNum = i + 1;
                            } else if (page >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = page - 2 + i;
                            }
                            return (
                              <button
                                key={pageNum}
                                className={`changelog-pagination-page ${page === pageNum ? 'active' : ''}`}
                                onClick={() => setPage(pageNum)}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>
                        <button 
                          className="changelog-pagination-btn" 
                          onClick={() => setPage(page + 1)} 
                          disabled={page === totalPages}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Clear All Confirmation Dialog */}
      {showClearConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Clear All Timeline</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete all timeline entries? This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button
                className="btn ghost"
                onClick={() => setShowClearConfirm(false)}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                className="btn danger"
                onClick={handleClearAllTimeline}
                disabled={isLoading || !canManagePermission}
              >
                {isLoading ? 'Deleting...' : 'Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Single Item Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Delete History Item</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this history item? This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button
                className="btn ghost"
                onClick={() => setShowDeleteConfirm(null)}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                className="btn danger"
                onClick={() => handleDeleteHistoryItem(showDeleteConfirm)}
                disabled={isLoading || !canManagePermission}
              >
                {isLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChangeLog;


