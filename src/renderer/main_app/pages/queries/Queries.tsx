import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Header from '../../components/header/Header';
import Footer from '../../components/footer/Footer';
import Breadcrumb from '../../components/breadcumb/Breadcrumb';
import SidebarNavigator from '../../components/sidebar_navigator/SidebarNavigator';
import './Queries.css';
import { ProjectService } from '../../services/projects';
import { StatementService } from '../../services/statements';
import { DatabaseService } from '../../services/database';
import AddQuery from '../../components/query/add_query/AddQuery';
import { toast } from 'react-toastify';
import DeleteQuery from '../../components/query/delete_query/DeleteQuery';
import RunQuery from '../../components/query/run_query/RunQuery';
import { canEdit } from '../../hooks/useProjectPermissions';

interface QueryItem {
  id: string;
  name: string;
  description?: string;
  status?: string;
  db_name?: string;
  db_type?: string;
}

const Queries: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { projectId } = useParams();
  const projectData = { projectId, projectName: (location.state as { projectName?: string } | null)?.projectName };
  const [resolvedProjectName, setResolvedProjectName] = useState<string>(projectData.projectName || 'Project');
  const canEditPermission = canEdit(projectId);

  const [queries, setQueries] = useState<QueryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All Status');
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [totalQueries, setTotalQueries] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedQuery, setSelectedQuery] = useState<{ id: string; name?: string } | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [isRunOpen, setIsRunOpen] = useState(false);
  const [runSql, setRunSql] = useState('');
  const [runItems, setRunItems] = useState<{ name: string; value: string }[]>([]);
  const [sqlQuery, setSqlQuery] = useState('');
  const [queryResults, setQueryResults] = useState<any[]>([]);
  const [queryColumns, setQueryColumns] = useState<string[]>([]);
  const [isRunningQuery, setIsRunningQuery] = useState(false);
  const [selectedConnectionId, setSelectedConnectionId] = useState('');
  const [connections, setConnections] = useState<{ id: string; name: string }[]>([]);

  const statementService = useMemo(() => new StatementService(), []);
  const projectService = useMemo(() => new ProjectService(), []);
  const databaseService = useMemo(() => new DatabaseService(), []);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    const loadQueries = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const apiStatus = statusFilter === 'All Status' ? null :
                         statusFilter === 'Success' ? 'Success' :
                         statusFilter === 'Failed' ? 'Failed' : null;

        const request = {
          project_id: projectId,
          page: page,
          page_size: pageSize,
          q: search || null,
          status: apiStatus,
          sort_by: sortBy || null,
          order: order || 'asc'
        };

        const response = await statementService.searchStatements(request);

        if (response.success && response.data) {
          const items: QueryItem[] = response.data.statements.map(it => ({
            id: it.statement_id,
            name: it.name || '',
            description: it.description || '',
            status: it.status,
            db_name: it.connection?.db_name,
            db_type: it.connection?.db_type,
          }));
          setQueries(items);
          setTotalQueries(response.data.number_statement);
          setCurrentPage(response.data.current_page);
          setTotalPages(response.data.total_pages);
          if (response.data.current_page !== page) {
            setPage(response.data.current_page);
          }
        } else {
          setError(response.error || 'Failed to load queries');
          toast.error(response.error || 'Failed to load queries');
          setQueries([]);
          setTotalQueries(0);
          setCurrentPage(1);
          setTotalPages(1);
          setPage(1);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
        toast.error('Failed to load queries');
        setQueries([]);
        setTotalQueries(0);
        setCurrentPage(1);
        setTotalPages(1);
        setPage(1);
      } finally {
        setIsLoading(false);
      }
    };

    loadQueries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search, statusFilter, sortBy, order, projectId]);

  const reloadQueries = async () => {
    if (!projectId) return;
    try {
      setIsLoading(true);
      setError(null);

      const apiStatus = statusFilter === 'All Status' ? null :
                       statusFilter === 'Success' ? 'Success' :
                       statusFilter === 'Failed' ? 'Failed' : null;

      const request = {
        project_id: projectId,
        page: page,
        page_size: pageSize,
        q: search || null,
        status: apiStatus,
        sort_by: sortBy || null,
        order: order || 'asc'
      };

      const response = await statementService.searchStatements(request);

      if (response.success && response.data) {
        const items: QueryItem[] = response.data.statements.map(it => ({
          id: it.statement_id,
          name: it.name || '',
          description: it.description || '',
          status: it.status,
          db_name: it.connection?.db_name,
          db_type: it.connection?.db_type,
        }));
        setQueries(items);
        setTotalQueries(response.data.number_statement);
        setCurrentPage(response.data.current_page);
        setTotalPages(response.data.total_pages);
        if (response.data.current_page !== page) {
          setPage(response.data.current_page);
        }
      } else {
        setError(response.error || 'Failed to load queries');
        toast.error(response.error || 'Failed to load queries');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      toast.error('Failed to load queries');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, [projectId]);

  const fetchConnections = async () => {
    if (!projectId) return;
    try {
      const resp = await databaseService.getDatabaseConnections({ project_id: projectId });
      if (resp.success && resp.data) {
        const conns = resp.data.connections.map(db => ({ 
          id: db.connection_id, 
          name: `${db.db_type.toUpperCase()} • ${db.db_name}@${db.host}:${db.port}` 
        }));
        setConnections(conns);
        if (conns.length > 0) {
          setSelectedConnectionId(conns[0].id);
        }
      }
    } catch (e) {
      // console.error('Failed to fetch connections:', e);
    }
  };

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
      }
    };

    // Only use mousedown to avoid conflicts with click handlers
    document.addEventListener('mousedown', handleClickOutside, true); // Use capture phase
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [openDropdownId]);

  const sidebarItems = [
    { id: 'suites-manager', label: 'Test Manager', path: `/suites-manager/${projectId}`, isActive: false },
    { id: 'testcases', label: 'Testcases', path: `/testcases/${projectId}`, isActive: false },
    { id: 'test-suites', label: 'Test Suites', path: `/test-suites/${projectId}`, isActive: false },
    { id: 'browser-storage', label: 'Browser Storage', path: `/browser-storage/${projectId}`, isActive: false },
    { id: 'databases', label: 'Databases', path: `/databases/${projectId}`, isActive: false },
    { id: 'queries', label: 'Queries', path: `/queries/${projectId}`, isActive: true },
    { id: 'variables', label: 'Variables', path: `/variables/${projectId}`, isActive: false },
    { id: 'change-log', label: 'Activities', path: `/change-log/${projectId}`, isActive: false },
  ];

  const breadcrumbItems = [
    { label: 'Projects', path: '/dashboard', isActive: false },
    { label: resolvedProjectName, path: `/queries/${projectId}`, isActive: true },
  ];

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setOrder('asc');
    }
    setPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearch('');
    setPage(1);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handlePageSizeChange = (value: number) => {
    setPageSize(value);
    setPage(1);
  };

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
  const handleBreadcrumbNavigate = (path: string) => navigate(path);
  const handleSidebarNavigate = (path: string) => navigate(path);

  const handleRunQuery = async () => {
    if (!canEditPermission) return;
    if (!sqlQuery.trim() || !selectedConnectionId) {
      toast.error('Please enter SQL query and select connection');
      return;
    }
    
    try {
      setIsRunningQuery(true);
      const resp = await statementService.runWithoutCreate({
        connection_id: selectedConnectionId,
        query: sqlQuery.trim()
      });
      
      if (resp.success && resp.data) {
        // console.log(resp.data);
        // Handle array of objects response
        let items: any[] = [];
        let columns: string[] = [];
        
        if (Array.isArray(resp.data.data)) {
          // Store the array of objects as-is
          items = resp.data.data;
          
          // Extract unique column names from all objects
          const allKeys = new Set<string>();
          resp.data.data.forEach((obj: any) => {
            if (obj && typeof obj === 'object') {
              Object.keys(obj).forEach(key => allKeys.add(key));
            }
          });
          columns = Array.from(allKeys);
        }
        
        setQueryResults(items);
        setQueryColumns(columns);
        toast.success('Query executed successfully');
      } else {
        toast.error(resp.error || 'Failed to execute query');
        setQueryResults([]);
      }
    } catch (e) {
      toast.error('Failed to execute query');
      setQueryResults([]);
    } finally {
      setIsRunningQuery(false);
    }
  };

  const handleClearQuery = () => {
    setSqlQuery('');
    setQueryResults([]);
    setQueryColumns([]);
    toast.info('Query and results cleared');
  };

  return (
    <div className="qry-page">
      <Header />
      <Breadcrumb items={breadcrumbItems} onNavigate={handleBreadcrumbNavigate} />

      <div className="qry-layout">
        <SidebarNavigator
          items={sidebarItems}
          onNavigate={handleSidebarNavigate}
          projectId={projectData?.projectId}
        />

        <main className="qry-main">
          <div className="qry-container">
            <div className="page-title" />

            {/* SQL Query & Results Side by Side */}
            <div className="qry-sql-results-section">
              <div className="qry-query-panel">
                <div className="qry-sql-header">
                  <h3>SQL Query</h3>
                  <select
                    value={selectedConnectionId}
                    onChange={(e) => setSelectedConnectionId(e.target.value)}
                    className="qry-connection-select"
                  >
                    {connections.map(conn => (
                      <option key={conn.id} value={conn.id}>{conn.name}</option>
                    ))}
                  </select>
                </div>
                <textarea
                  className="qry-sql-textarea"
                  placeholder="Enter your SQL query here..."
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  rows={8}
                />
                <div className="qry-sql-actions">
                  <button 
                    className="qry-clear-btn" 
                    onClick={handleClearQuery}
                    disabled={isRunningQuery}
                  >
                    Clear
                  </button>
                  <button 
                    className="qry-run-btn" 
                    onClick={handleRunQuery}
                    disabled={isRunningQuery || !sqlQuery.trim() || !selectedConnectionId || !canEditPermission}
                  >
                    {isRunningQuery ? 'Running...' : 'Run Query'}
                  </button>
                </div>
              </div>
              
              <div className="qry-results-panel">
                <div className="qry-results-header">
                  <h3>Query Results</h3>
                  <span className="qry-results-count">
                    {queryResults.length} result{queryResults.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className={`qry-results-container ${queryResults.length > 0 ? 'has-results' : ''}`}>
                  {queryResults.length === 0 ? (
                    <div className="qry-no-results">No results to display</div>
                  ) : (
                    <table className="qry-results-table">
                      <thead>
                        <tr>
                          {queryColumns.map((column, idx) => (
                            <th key={idx}>{column}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className={queryResults.length > 5 ? 'scrollable' : ''}>
                        {queryResults.map((item, idx) => (
                          <tr key={idx}>
                            {queryColumns.map((column, colIdx) => (
                              <td key={colIdx}>{String(item[column] || '')}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            <div className="qry-controls">
              <div className="qry-search-section">
                <input
                  type="text"
                  placeholder="Search by name or description..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="qry-search-input"
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
                      <path d="M15 9L9 15M9 9L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                )}
                <select
                  value={statusFilter}
                  onChange={(e) => handleStatusFilterChange(e.target.value)}
                  className="status-dropdown"
                >
                  <option value="All Status">All Status</option>
                  <option value="Success">Success</option>
                  <option value="Failed">Failed</option>
                </select>
              </div>

              <div className="qry-controls-section">
                <button
                  className={`reload-btn ${isLoading ? 'is-loading' : ''}`}
                  onClick={reloadQueries}
                  disabled={isLoading}
                  title="Reload queries"
                  aria-label="Reload queries"
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
                  onChange={(e) => handlePageSizeChange(parseInt(e.target.value.split(' ')[0]))}
                  className="qry-pagination-dropdown"
                >
                  <option value="10 rows/page">10 rows/page</option>
                  <option value="20 rows/page">20 rows/page</option>
                  <option value="30 rows/page">30 rows/page</option>
                </select>
                <button className="qry-create-query-btn" onClick={() => { if (!canEditPermission) return; setIsAddOpen(true); }} disabled={!canEditPermission}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Add Query
                </button>
              </div>
            </div>

            <div className={`qry-table-container`}>
              <table className="qry-table">
                <thead>
                  <tr>
                    <th className={`sortable ${sortBy === 'name' ? 'sorted' : ''}`} onClick={() => handleSort('name')}>
                      <span className="th-content">
                        <span className="th-text">Name</span>
                        <span className="sort-arrows">
                          <span className={`arrow up ${sortBy === 'name' && order === 'asc' ? 'active' : ''}`}></span>
                          <span className={`arrow down ${sortBy === 'name' && order === 'desc' ? 'active' : ''}`}></span>
                        </span>
                      </span>
                    </th>
                    <th className={`sortable ${sortBy === 'description' ? 'sorted' : ''}`} onClick={() => handleSort('description')}>
                      <span className="th-content">
                        <span className="th-text">Description</span>
                        <span className="sort-arrows">
                          <span className={`arrow up ${sortBy === 'description' && order === 'asc' ? 'active' : ''}`}></span>
                          <span className={`arrow down ${sortBy === 'description' && order === 'desc' ? 'active' : ''}`}></span>
                        </span>
                      </span>
                    </th>
                    <th className={`sortable ${sortBy === 'status' ? 'sorted' : ''}`} onClick={() => handleSort('status')}>
                      <span className="th-content">
                        <span className="th-text">Status</span>
                        <span className="sort-arrows">
                          <span className={`arrow up ${sortBy === 'status' && order === 'asc' ? 'active' : ''}`}></span>
                          <span className={`arrow down ${sortBy === 'status' && order === 'desc' ? 'active' : ''}`}></span>
                        </span>
                      </span>
                    </th>
                    <th className={`sortable ${sortBy === 'created_at' ? 'sorted' : ''}`} onClick={() => handleSort('created_at')}>
                      <span className="th-content">
                        <span className="th-text">Created</span>
                        <span className="sort-arrows">
                          <span className={`arrow up ${sortBy === 'created_at' && order === 'asc' ? 'active' : ''}`}></span>
                          <span className={`arrow down ${sortBy === 'created_at' && order === 'desc' ? 'active' : ''}`}></span>
                        </span>
                      </span>
                    </th>
                    <th className={`sortable ${sortBy === 'updated_at' ? 'sorted' : ''}`} onClick={() => handleSort('updated_at')}>
                      <span className="th-content">
                        <span className="th-text">Updated</span>
                        <span className="sort-arrows">
                          <span className={`arrow up ${sortBy === 'updated_at' && order === 'asc' ? 'active' : ''}`}></span>
                          <span className={`arrow down ${sortBy === 'updated_at' && order === 'desc' ? 'active' : ''}`}></span>
                        </span>
                      </span>
                    </th>
                    <th>Database</th>
                    <th>Type</th>
                    <th>Options</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={8} className="qry-center">Loading...</td></tr>
                  ) : error ? (
                    <tr><td colSpan={8} className="qry-center qry-error">{error}</td></tr>
                  ) : queries.length === 0 ? (
                    <tr><td colSpan={8} className="qry-center">No queries</td></tr>
                  ) : (
                    queries.map((q) => (
                      <tr 
                        key={q.id}
                        className={`${openDropdownId === q.id ? 'dropdown-open' : ''} ${openDropdownId ? 'has-open-dropdown' : ''}`}
                      >
                        <td className="qry-name">{q.name}</td>
                        <td className="qry-description">{q.description || '-'}</td>
                        <td className="qry-status">
                          {q.status ? (
                            <span className={`status-badge ${(q.status || '').toLowerCase()}`}>
                              {q.status}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="qry-db-name">{q.db_name || '-'}</td>
                        <td className="qry-db-type">{q.db_type || '-'}</td>
                        <td className="qry-actions">
                          <div className="actions-container">
                            <button 
                              className="actions-btn" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdownId(openDropdownId === q.id ? null : q.id);
                              }}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="1" fill="currentColor"/>
                                <circle cx="19" cy="12" r="1" fill="currentColor"/>
                                <circle cx="5" cy="12" r="1" fill="currentColor"/>
                              </svg>
                            </button>
                            {openDropdownId === q.id && (
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
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    if (!canEditPermission) { setOpenDropdownId(null); return; }
                                    try {
                                      setSelectedQuery({ id: q.id, name: q.name });
                                      const resp = await statementService.runStatementById(q.id);
                                      console.log('resp', resp);
                                      if (resp.success) {
                                        toast.success('Query is running');
                                        // StatementRunByIdResponse does not include statement_text; keep last known
                                        setRunSql(q.name);
                                        // const items = (resp.data?.data || []).map((d: any) => ({ name: d.name, value: String(d.value) }));
                                        // setRunItems(items);
                                        setRunItems(resp.data?.data || []);
                                        setIsRunOpen(true);
                                      } else {
                                        toast.error(resp.error || 'Failed to run query');
                                      }
                                    } catch (e) {
                                      toast.error('Failed to run query');
                                    } finally {
                                      setOpenDropdownId(null);
                                    }
                                  }}
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                  }}
                                  disabled={!canEditPermission}
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <polygon points="8,5 19,12 8,19" fill="currentColor" />
                                  </svg>
                                  Run
                                </button>
                                <button 
                                  className="dropdown-item delete" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    if (!canEditPermission) { setOpenDropdownId(null); return; } 
                                    setSelectedQuery({ id: q.id, name: q.name }); 
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
              <div className="qry-pagination">
                <div className="qry-pagination-info">
                  Showing {queries.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalQueries)} of {totalQueries} queries
                </div>
                <div className="qry-pagination-controls">
                  <button className="qry-pagination-btn" onClick={handlePreviousPage} disabled={currentPage === 1}>Previous</button>
                  <div className="qry-pagination-pages">
                    {paginationNumbers.map((page, index) => (
                      <div key={index}>
                        {page === '...' ? (
                          <span className="qry-pagination-ellipsis">...</span>
                        ) : (
                          <button className={`qry-pagination-page ${currentPage === page ? 'active' : ''}`} onClick={() => handlePageChange(page as number)}>
                            {page}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button className="qry-pagination-btn" onClick={handleNextPage} disabled={currentPage === totalPages}>Next</button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <Footer />
      <AddQuery
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        projectId={projectId}
        onSave={async ({ connection_id, name, description, statement_text }) => {
          try {
            const resp = await statementService.createAndRunStatement({ connection_id, name, description, statement_text });
            if (resp.success) {
              toast.success('Query created');
              setIsAddOpen(false);
              await reloadQueries();
            } else {
              toast.error(resp.error || 'Failed to create query');
            }
          } catch (e) {
            toast.error('Failed to create query');
          }
        }}
      />
      <DeleteQuery
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        query={selectedQuery}
        onDelete={async (id) => {
          try {
            const resp = await statementService.deleteStatement(id);
            if (resp.success) {
              toast.success('Query deleted');
              setIsDeleteOpen(false);
              await reloadQueries();
            } else {
              toast.error(resp.error || 'Failed to delete query');
            }
          } catch (e) {
            toast.error('Failed to delete query');
          }
        }}
      />
      <RunQuery
        isOpen={isRunOpen}
        sql={runSql}
        queryName={selectedQuery?.name}
        items={runItems}
        projectId={projectId}
        statementId={selectedQuery?.id || undefined}
        onClose={() => setIsRunOpen(false)}
      />
    </div>
  );
};

export default Queries;


