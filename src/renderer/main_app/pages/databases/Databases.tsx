import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Header from '../../components/header/Header';
import Footer from '../../components/footer/Footer';
import Breadcrumb from '../../components/breadcumb/Breadcrumb';
import SidebarNavigator from '../../components/sidebar_navigator/SidebarNavigator';
import './Databases.css';
import CreateConnection from '../../components/database/create_connection/CreateConnection';
import DeleteConnection from '../../components/database/delete_connection/DeleteConnection';
import { DatabaseService } from '../../services/database';
import { ProjectService } from '../../services/projects';
import { toast } from 'react-toastify';
import { canEdit } from '../../hooks/useProjectPermissions';

interface DatabaseItem {
  id: string;
  name: string;
  type: string;
  host: string;
  port: number;
}

const Databases: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { projectId } = useParams();
  const projectData = { projectId, projectName: (location.state as { projectName?: string } | null)?.projectName };
  const [resolvedProjectName, setResolvedProjectName] = useState<string>(projectData.projectName || 'Project');
  const canEditPermission = canEdit(projectId);

  const [databases, setDatabases] = useState<DatabaseItem[]>([]);
  
  // Search, pagination, and sort state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [dbTypeFilter, setDbTypeFilter] = useState<string>('All Types');
  const [sortBy, setSortBy] = useState<string | null>('db_name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  
  // Pagination info from API
  const [totalDatabases, setTotalDatabases] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<{ id: string; name?: string } | null>(null);
  const [isReloading, setIsReloading] = useState(false);

  // Service - use useMemo to avoid recreating on every render
  const databaseService = useMemo(() => new DatabaseService(), []);
  const projectService = useMemo(() => new ProjectService(), []);

  // Load database connections with search/pagination/sort
  useEffect(() => {
    if (!projectId) return;

    const loadDatabaseConnections = async () => {
      try {
        setIsReloading(true);
        
        // Map db type filter to API format
        let dbTypeValue: string | null = null;
        if (dbTypeFilter !== 'All Types') {
          dbTypeValue = dbTypeFilter.toLowerCase();
        }

        const request = {
          project_id: projectId,
          page: page,
          page_size: pageSize,
          q: search || null,
          db_type: dbTypeValue,
          sort_by: sortBy || null,
          order: order || 'asc'
        };

        const response = await databaseService.searchDatabaseConnections(request);
        
        if (response.success && response.data) {
          const items: DatabaseItem[] = response.data.database_connections.map((c) => ({
            id: c.connection_id,
            name: c.db_name,
            type: c.db_type,
            host: c.host,
            port: c.port,
          }));
          setDatabases(items);
          setTotalDatabases(response.data.number_database_connection);
          setCurrentPage(response.data.current_page);
          setTotalPages(response.data.total_pages);
          // Only sync page if it's different to avoid infinite loop
          if (response.data.current_page !== page) {
            setPage(response.data.current_page);
          }
        } else {
          setDatabases([]);
          setTotalDatabases(0);
          setCurrentPage(1);
          setTotalPages(1);
          setPage(1);
        }
      } catch (e) {
        setDatabases([]);
        setTotalDatabases(0);
        setCurrentPage(1);
        setTotalPages(1);
        setPage(1);
      } finally {
        setIsReloading(false);
      }
    };

    loadDatabaseConnections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search, dbTypeFilter, sortBy, order, projectId, databaseService]);

  // Helper: reload database connections (for manual refresh and after operations)
  const reloadConnections = useCallback(async () => {
    if (!projectId) return;
    try {
      setIsReloading(true);
      
      // Map db type filter to API format
      let dbTypeValue: string | null = null;
      if (dbTypeFilter !== 'All Types') {
        dbTypeValue = dbTypeFilter.toLowerCase();
      }

      const request = {
        project_id: projectId,
        page: page,
        page_size: pageSize,
        q: search || null,
        db_type: dbTypeValue,
        sort_by: sortBy || null,
        order: order || 'asc'
      };

      const response = await databaseService.searchDatabaseConnections(request);
      
      if (response.success && response.data) {
        const items: DatabaseItem[] = response.data.database_connections.map((c) => ({
          id: c.connection_id,
          name: c.db_name,
          type: c.db_type,
          host: c.host,
          port: c.port,
        }));
        setDatabases(items);
        setTotalDatabases(response.data.number_database_connection);
        setCurrentPage(response.data.current_page);
        setTotalPages(response.data.total_pages);
        // Only sync page if it's different to avoid infinite loop
        if (response.data.current_page !== page) {
          setPage(response.data.current_page);
        }
      } else {
        setDatabases([]);
      }
    } catch (e) {
      setDatabases([]);
    } finally {
      setIsReloading(false);
    }
  }, [projectId, page, pageSize, search, dbTypeFilter, sortBy, order, databaseService]);

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
    { id: 'databases', label: 'Databases', path: `/databases/${projectId}`, isActive: true },
    { id: 'queries', label: 'Queries', path: `/queries/${projectId}`, isActive: false },
    { id: 'variables', label: 'Variables', path: `/variables/${projectId}`, isActive: false },
    { id: 'change-log', label: 'Activities', path: `/change-log/${projectId}`, isActive: false },
  ];

  const breadcrumbItems = [
    { label: 'Projects', path: '/dashboard', isActive: false },
    { label: resolvedProjectName, path: `/databases/${projectId}`, isActive: true },
  ];

  // No need for client-side filtering/sorting - API handles it
  const currentItems = databases;

  // Handle sort - reset page to 1 when sort changes
  const handleSort = (col: 'db_name' | 'db_type' | 'host' | 'created_at' | 'updated_at') => {
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

  // Handle db type filter - reset page to 1
  const handleDbTypeFilterChange = (value: string) => {
    setDbTypeFilter(value);
    setPage(1); // Reset page when filter changes
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
  const endIndex = Math.min(startIndex + pageSize, totalDatabases);

  const generatePaginationNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 3) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
    else if (currentPage <= 2) { pages.push(1, 2, 3); if (totalPages > 4) pages.push('...'); if (totalPages > 3) pages.push(totalPages); }
    else if (currentPage >= totalPages - 1) { pages.push(1); if (totalPages > 4) pages.push('...'); pages.push(totalPages - 2, totalPages - 1, totalPages); }
    else { pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages); }
    return pages;
  };
  const paginationNumbers = generatePaginationNumbers();

  const handleDbActions = (id: string) => setOpenDropdownId(openDropdownId === id ? null : id);
  const handleBreadcrumbNavigate = (path: string) => navigate(path);
  const handleSidebarNavigate = (path: string) => navigate(path);

  const handleCreateDatabase = () => { if (!canEditPermission) return; setIsCreateOpen(true); };
  const handleOpenDelete = (item: DatabaseItem) => {
    if (!canEditPermission) return;
    setSelectedConnection({ id: item.id, name: item.name });
    setIsDeleteOpen(true);
    setOpenDropdownId(null);
  };

  return (
    <div className="databases-page">
      <Header />
      <Breadcrumb items={breadcrumbItems} onNavigate={handleBreadcrumbNavigate} />

      <div className="databases-layout">
        <SidebarNavigator
          items={sidebarItems}
          onNavigate={handleSidebarNavigate}
          projectId={projectId}
        />

        <main className="databases-main">
          <div className="databases-container">
            <div className="page-title" />

            <div className="databases-controls">
              <div className="search-section">
                <input
                  type="text"
                  placeholder="Search by name, host, or type..."
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
                  value={dbTypeFilter}
                  onChange={(e) => handleDbTypeFilterChange(e.target.value)}
                  className="status-dropdown"
                >
                  <option value="All Types">All Types</option>
                  <option value="postgres">PostgreSQL</option>
                  <option value="mysql">MySQL</option>
                  <option value="mssql">MSSQL</option>
                  <option value="sqlite">SQLite</option>
                </select>
              </div>

              <div className="controls-section">
                <button
                  className={`reload-btn ${isReloading ? 'is-loading' : ''}`}
                  onClick={reloadConnections}
                  disabled={isReloading}
                  title="Reload database connections"
                  aria-label="Reload database connections"
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
              <button className="create-database-btn" onClick={handleCreateDatabase} disabled={!canEditPermission}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Create Connection
              </button>
              </div>
            </div>

            <div className="databases-table-container">
              <table className="databases-table">
                <thead>
                  <tr>
                    <th className={`sortable ${sortBy === 'db_name' ? 'sorted' : ''}`} onClick={() => handleSort('db_name')}>
                      <span className="th-content">
                        <span className="th-text">Database Name</span>
                        <span className="sort-arrows">
                          <span className={`arrow up ${sortBy === 'db_name' && order === 'asc' ? 'active' : ''}`}></span>
                          <span className={`arrow down ${sortBy === 'db_name' && order === 'desc' ? 'active' : ''}`}></span>
                        </span>
                      </span>
                    </th>
                    <th className={`sortable ${sortBy === 'db_type' ? 'sorted' : ''}`} onClick={() => handleSort('db_type')}>
                      <span className="th-content">
                        <span className="th-text">Database Type</span>
                        <span className="sort-arrows">
                          <span className={`arrow up ${sortBy === 'db_type' && order === 'asc' ? 'active' : ''}`}></span>
                          <span className={`arrow down ${sortBy === 'db_type' && order === 'desc' ? 'active' : ''}`}></span>
                        </span>
                      </span>
                    </th>
                    <th className={`sortable ${sortBy === 'host' ? 'sorted' : ''}`} onClick={() => handleSort('host')}>
                      <span className="th-content">
                        <span className="th-text">Host</span>
                        <span className="sort-arrows">
                          <span className={`arrow up ${sortBy === 'host' && order === 'asc' ? 'active' : ''}`}></span>
                          <span className={`arrow down ${sortBy === 'host' && order === 'desc' ? 'active' : ''}`}></span>
                        </span>
                      </span>
                    </th>
                    <th>
                      <span className="th-content">
                        <span className="th-text">Port</span>
                      </span>
                    </th>
                    <th>Options</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((db) => (
                    <tr 
                      key={db.id}
                      className={`${openDropdownId === db.id ? 'dropdown-open' : ''} ${openDropdownId ? 'has-open-dropdown' : ''}`}
                    >
                      <td className="database-name">{db.name}</td>
                      <td className="database-type">{db.type}</td>
                      <td className="database-host">{db.host}</td>
                      <td className="database-port">{db.port}</td>
                      <td className="database-actions">
                        <div className="actions-container">
                          <button 
                            className="actions-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDbActions(db.id);
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <circle cx="12" cy="12" r="1" fill="currentColor"/>
                              <circle cx="19" cy="12" r="1" fill="currentColor"/>
                              <circle cx="5" cy="12" r="1" fill="currentColor"/>
                            </svg>
                          </button>

                          {openDropdownId === db.id && (
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
                                }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                }}
                                disabled={!canEditPermission}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                Edit
                              </button>
                              <button 
                                className="dropdown-item delete" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  handleOpenDelete(db);
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
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <div className="pagination-info">
                  Showing {startIndex + 1} to {endIndex} of {totalDatabases} databases
                </div>
                <div className="pagination-controls">
                  <button className="pagination-btn" onClick={handlePreviousPage} disabled={currentPage === 1}>Previous</button>
                  <div className="pagination-pages">
                    {paginationNumbers.map((page, index) => (
                      <div key={index}>
                        {page === '...' ? (
                          <span className="pagination-ellipsis">...</span>
                        ) : (
                          <button className={`pagination-page ${currentPage === page ? 'active' : ''}`} onClick={() => handlePageChange(page as number)}>
                            {page}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button className="pagination-btn" onClick={handleNextPage} disabled={currentPage >= totalPages}>Next</button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <Footer />
      <CreateConnection
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        projectId={projectId}
        onSave={async (payload) => {
          try {
            const resp = await databaseService.createDatabaseConnection(payload as any);
            if (resp.success) {
              await reloadConnections();
            }
            return resp;
          } catch (e) {
            const message = e instanceof Error ? e.message : 'Failed to create connection';
            return { success: false, error: message };
          }
        }}
      />
      <DeleteConnection
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        connection={selectedConnection ? { connection_id: selectedConnection.id, name: selectedConnection.name } : null}
        onDelete={async (id) => {
          try {
            const resp = await databaseService.deleteDatabaseConnection(id);
            if (resp.success) {
              toast.success('Connection deleted');
              setIsDeleteOpen(false);
              await reloadConnections();
            } else {
              toast.error(resp.error || 'Failed to delete connection. Please try again.');
            }
          } catch (e) {
            toast.error('Failed to delete connection. Please try again.');
          }
        }}
      />
    </div>
  );
};

export default Databases;


