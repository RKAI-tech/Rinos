import React, { useEffect, useMemo, useState } from 'react';
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
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'type' | 'host' | 'port'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [itemsPerPage, setItemsPerPage] = useState('10 rows/page');
  const [currentPage, setCurrentPage] = useState(1);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<{ id: string; name?: string } | null>(null);

  useEffect(() => {
    const loadConnections = async () => {
      if (!projectId) return;
      try {
        const svc = new DatabaseService();
        const resp = await svc.getDatabaseConnections({ project_id: projectId });
        if (resp.success && resp.data) {
          const items: DatabaseItem[] = resp.data.connections.map((c) => ({
            id: c.connection_id,
            name: c.db_name,
            type: c.db_type,
            host: c.host,
            port: c.port,
          }));
          setDatabases(items);
        } else {
          setDatabases([]);
        }
      } catch (e) {
        setDatabases([]);
      }
    };
    loadConnections();
  }, [projectId]);

  useEffect(() => {
    const loadProjectName = async () => {
      if (!projectId) return;
      if (projectData.projectName) {
        setResolvedProjectName(projectData.projectName);
        return;
      }
      const svc = new ProjectService();
      const resp = await svc.getProjectById(projectId);
      if (resp.success && resp.data) {
        setResolvedProjectName((resp.data as any).name || 'Project');
      }
    };
    loadProjectName();
  }, [projectId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdownId) {
        const target = event.target as Element;
        const actionsContainer = target.closest('.actions-container');
        if (!actionsContainer) {
          setOpenDropdownId(null);
        }
      }
    };

    if (openDropdownId) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdownId]);

  const sidebarItems = [
    { id: 'testcases', label: 'Testcases', path: `/testcases/${projectId}`, isActive: false },
    { id: 'test-suites', label: 'Test Suites', path: `/test-suites/${projectId}`, isActive: false },
    { id: 'browser-storage', label: 'Browser Storage', path: `/browser-storage/${projectId}`, isActive: false },
    { id: 'databases', label: 'Databases', path: `/databases/${projectId}`, isActive: true },
    { id: 'queries', label: 'Queries', path: `/queries/${projectId}`, isActive: false },
    { id: 'variables', label: 'Variables', path: `/variables/${projectId}`, isActive: false },
    { id: 'change-log', label: 'Change Log', path: `/change-log/${projectId}`, isActive: false },
  ];

  const breadcrumbItems = [
    { label: 'Projects', path: '/dashboard', isActive: false },
    { label: resolvedProjectName, path: `/databases/${projectId}`, isActive: true },
  ];

  const filtered = databases.filter(db => {
    const q = searchText.toLowerCase();
    return (db.name || '').toLowerCase().includes(q) || (db.host || '').toLowerCase().includes(q) || (db.type || '').toLowerCase().includes(q);
  });

  const sorted = useMemo(() => {
    const copy = [...filtered];
    const getVal = (it: DatabaseItem): string | number => {
      switch (sortBy) {
        case 'name': return it.name || '';
        case 'type': return it.type || '';
        case 'host': return it.host || '';
        case 'port': return it.port ?? 0;
        default: return '';
      }
    };
    copy.sort((a, b) => {
      const av = getVal(a);
      const bv = getVal(b);
      let cmp = 0;
      if (typeof av === 'string' && typeof bv === 'string') {
        cmp = av.localeCompare(bv, undefined, { sensitivity: 'base' });
      } else {
        const an = typeof av === 'number' ? av : 0;
        const bn = typeof bv === 'number' ? bv : 0;
        cmp = an === bn ? 0 : an < bn ? -1 : 1;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortBy, sortOrder]);

  const handleSort = (col: 'name' | 'type' | 'host' | 'port') => {
    if (sortBy === col) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortOrder('asc'); }
    setCurrentPage(1);
  };

  const getItemsPerPageNumber = () => parseInt(itemsPerPage.split(' ')[0]);
  const totalPages = Math.ceil(sorted.length / getItemsPerPageNumber());
  const startIndex = (currentPage - 1) * getItemsPerPageNumber();
  const endIndex = startIndex + getItemsPerPageNumber();
  const currentItems = sorted.slice(startIndex, endIndex);

  const generatePaginationNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 3) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
    else if (currentPage <= 2) { pages.push(1, 2, 3); if (totalPages > 4) pages.push('...'); if (totalPages > 3) pages.push(totalPages); }
    else if (currentPage >= totalPages - 1) { pages.push(1); if (totalPages > 4) pages.push('...'); pages.push(totalPages - 2, totalPages - 1, totalPages); }
    else { pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages); }
    return pages;
  };
  const paginationNumbers = generatePaginationNumbers();

  const handlePageChange = (page: number) => setCurrentPage(page);
  const handlePreviousPage = () => { if (currentPage > 1) setCurrentPage(currentPage - 1); };
  const handleNextPage = () => { if (currentPage < totalPages) setCurrentPage(currentPage + 1); };
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
                  placeholder="Search by name or description..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="search-input"
                />
              </div>

              <div className="controls-section">
                <select
                  value={itemsPerPage}
                  onChange={(e) => { setItemsPerPage(e.target.value); setCurrentPage(1); }}
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
                    <th className={`sortable ${sortBy === 'name' ? 'sorted' : ''}`} onClick={() => handleSort('name')}>
                      <span className="th-content">
                        <span className="th-text">Database Name</span>
                        <span className="sort-arrows">
                          <span className={`arrow up ${sortBy === 'name' && sortOrder === 'asc' ? 'active' : ''}`}></span>
                          <span className={`arrow down ${sortBy === 'name' && sortOrder === 'desc' ? 'active' : ''}`}></span>
                        </span>
                      </span>
                    </th>
                    <th className={`sortable ${sortBy === 'type' ? 'sorted' : ''}`} onClick={() => handleSort('type')}>
                      <span className="th-content">
                        <span className="th-text">Database Type</span>
                        <span className="sort-arrows">
                          <span className={`arrow up ${sortBy === 'type' && sortOrder === 'asc' ? 'active' : ''}`}></span>
                          <span className={`arrow down ${sortBy === 'type' && sortOrder === 'desc' ? 'active' : ''}`}></span>
                        </span>
                      </span>
                    </th>
                    <th className={`sortable ${sortBy === 'host' ? 'sorted' : ''}`} onClick={() => handleSort('host')}>
                      <span className="th-content">
                        <span className="th-text">Host</span>
                        <span className="sort-arrows">
                          <span className={`arrow up ${sortBy === 'host' && sortOrder === 'asc' ? 'active' : ''}`}></span>
                          <span className={`arrow down ${sortBy === 'host' && sortOrder === 'desc' ? 'active' : ''}`}></span>
                        </span>
                      </span>
                    </th>
                    <th className={`sortable ${sortBy === 'port' ? 'sorted' : ''}`} onClick={() => handleSort('port')}>
                      <span className="th-content">
                        <span className="th-text">Port</span>
                        <span className="sort-arrows">
                          <span className={`arrow up ${sortBy === 'port' && sortOrder === 'asc' ? 'active' : ''}`}></span>
                          <span className={`arrow down ${sortBy === 'port' && sortOrder === 'desc' ? 'active' : ''}`}></span>
                        </span>
                      </span>
                    </th>
                    <th>Options</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((db) => (
                    <tr key={db.id}>
                      <td className="database-name">{db.name}</td>
                      <td className="database-type">{db.type}</td>
                      <td className="database-host">{db.host}</td>
                      <td className="database-port">{db.port}</td>
                      <td className="database-actions">
                        <div className="actions-container">
                          <button 
                            className="actions-btn"
                            onClick={() => handleDbActions(db.id)}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <circle cx="12" cy="12" r="1" fill="currentColor"/>
                              <circle cx="19" cy="12" r="1" fill="currentColor"/>
                              <circle cx="5" cy="12" r="1" fill="currentColor"/>
                            </svg>
                          </button>

                          {openDropdownId === db.id && (
                            <div className="actions-dropdown">
                              <button className="dropdown-item" disabled={!canEditPermission}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                Edit
                              </button>
                              <button className="dropdown-item delete" onClick={() => handleOpenDelete(db)} disabled={!canEditPermission}>
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
                  Showing {filtered.length === 0 ? 0 : startIndex + 1} to {Math.min(endIndex, filtered.length)} of {filtered.length} databases
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
                  <button className="pagination-btn" onClick={handleNextPage} disabled={currentPage === totalPages}>Next</button>
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
          const svc = new DatabaseService();
          try {
            const resp = await svc.createDatabaseConnection(payload as any);
            if (resp.success) {
              if (projectId) {
                const listResp = await svc.getDatabaseConnections({ project_id: projectId });
                if (listResp.success && listResp.data) {
                  const items: DatabaseItem[] = listResp.data.connections.map((c) => ({
                    id: c.connection_id,
                    name: c.db_name,
                    type: c.db_type,
                    host: c.host,
                    port: c.port,
                  }));
                  setDatabases(items);
                }
              }
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
            const svc = new DatabaseService();
            const resp = await svc.deleteDatabaseConnection(id);
            if (resp.success) {
              toast.success('Connection deleted');
              setIsDeleteOpen(false);
              if (projectId) {
                const listResp = await svc.getDatabaseConnections({ project_id: projectId });
                if (listResp.success && listResp.data) {
                  const items: DatabaseItem[] = listResp.data.connections.map((c) => ({
                    id: c.connection_id,
                    name: c.db_name,
                    type: c.db_type,
                    host: c.host,
                    port: c.port,
                  }));
                  setDatabases(items);
                }
              }
            } else {
              toast.error(resp.error || 'Failed to delete connection');
            }
          } catch (e) {
            toast.error('Failed to delete connection');
          }
        }}
      />
    </div>
  );
};

export default Databases;


