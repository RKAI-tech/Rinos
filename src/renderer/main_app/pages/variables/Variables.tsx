import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Header from '../../components/header/Header';
import Footer from '../../components/footer/Footer';
import Breadcrumb from '../../components/breadcumb/Breadcrumb';
import SidebarNavigator from '../../components/sidebar_navigator/SidebarNavigator';
import './Variables.css';
import { VariableService } from '../../services/variables';
import { ProjectService } from '../../services/projects';
import DeleteVariable from '../../components/variable/delete_variable/DeleteVariable';
import { toast } from 'react-toastify';
import { canEdit } from '../../hooks/useProjectPermissions';

interface VariableItem {
  id: string;
  customName: string;
  originalName: string;
  value: string;
  databaseName: string;
  databaseType: string;
  queryName: string;
}

const Variables: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { projectId } = useParams();
  const projectData = { projectId, projectName: (location.state as { projectName?: string } | null)?.projectName };
  const [resolvedProjectName, setResolvedProjectName] = useState<string>(projectData.projectName || 'Project');
  const canEditPermission = canEdit(projectId);

  const [variables, setVariables] = useState<VariableItem[]>([]);
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState<'customName' | 'originalName' | 'value' | 'databaseName' | 'databaseType' | 'queryName'>('customName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [itemsPerPage, setItemsPerPage] = useState('10 rows/page');
  const [currentPage, setCurrentPage] = useState(1);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedVar, setSelectedVar] = useState<{ id: string; name?: string } | null>(null);
  const [isReloading, setIsReloading] = useState(false);

  // Service - use useMemo to avoid recreating on every render
  const variableService = useMemo(() => new VariableService(), []);
  const projectService = useMemo(() => new ProjectService(), []);

  const reloadVariables = async () => {
    if (!projectId) return;
    try {
      setIsReloading(true);
      const resp = await variableService.getVariablesByProject(projectId);
      if (resp.success && resp.data) {
        const items: VariableItem[] = resp.data.items.map(v => ({
          id: v.variable_id,
          customName: v.user_defined_name || v.original_name,
          originalName: v.original_name,
          value: v.value,
          databaseName: v.database_name,
          databaseType: v.database_type,
          queryName: v.query_name,
        }));
        setVariables(items);
      } else {
        setVariables([]);
      }
    } catch (e) {
      setVariables([]);
    } finally {
      setIsReloading(false);
    }
  };

  useEffect(() => {
    reloadVariables();
  }, [projectId]);

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
    { id: 'databases', label: 'Databases', path: `/databases/${projectId}`, isActive: false },
    { id: 'queries', label: 'Queries', path: `/queries/${projectId}`, isActive: false },
    { id: 'variables', label: 'Variables', path: `/variables/${projectId}`, isActive: true },
    { id: 'change-log', label: 'Activities', path: `/change-log/${projectId}`, isActive: false },
  ];

  const breadcrumbItems = [
    { label: 'Projects', path: '/dashboard', isActive: false },
    { label: resolvedProjectName, path: `/variables/${projectId}`, isActive: true },
  ];

  const filtered = variables.filter(v => {
    const q = searchText.toLowerCase();
    return (
      (v.customName || '').toLowerCase().includes(q) ||
      (v.originalName || '').toLowerCase().includes(q) ||
      (v.value || '').toLowerCase().includes(q) ||
      (v.databaseName || '').toLowerCase().includes(q) ||
      (v.databaseType || '').toLowerCase().includes(q) ||
      (v.queryName || '').toLowerCase().includes(q)
    );
  });

  const sorted = useMemo(() => {
    const copy = [...filtered];
    const getVal = (it: VariableItem): string => {
      switch (sortBy) {
        case 'customName': return it.customName || '';
        case 'originalName': return it.originalName || '';
        case 'value': return it.value || '';
        case 'databaseName': return it.databaseName || '';
        case 'databaseType': return it.databaseType || '';
        case 'queryName': return it.queryName || '';
        default: return '';
      }
    };
    copy.sort((a, b) => {
      const av = getVal(a);
      const bv = getVal(b);
      const cmp = av.localeCompare(bv, undefined, { sensitivity: 'base' });
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortBy, sortOrder]);

  const handleSort = (col: 'customName' | 'originalName' | 'value' | 'databaseName' | 'databaseType' | 'queryName') => {
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
  const handleBreadcrumbNavigate = (path: string) => navigate(path);
  const handleSidebarNavigate = (path: string) => navigate(path);

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

            <div className="vars-controls">
              <div className="vars-search-section">
                <input
                  type="text"
                  placeholder="Search by name or value..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="vars-search-input"
                />
              </div>

              <div className="vars-controls-section">
                <button
                  className={`reload-btn ${isReloading ? 'is-loading' : ''}`}
                  onClick={reloadVariables}
                  disabled={isReloading}
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
                  value={itemsPerPage}
                  onChange={(e) => { setItemsPerPage(e.target.value); setCurrentPage(1); }}
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
                    <th className={`sortable ${sortBy === 'customName' ? 'sorted' : ''}`} onClick={() => handleSort('customName')}><span className="th-content"><span className="th-text">Custom name</span><span className="sort-arrows"><span className={`arrow up ${sortBy === 'customName' && sortOrder === 'asc' ? 'active' : ''}`}></span><span className={`arrow down ${sortBy === 'customName' && sortOrder === 'desc' ? 'active' : ''}`}></span></span></span></th>
                    <th className={`sortable ${sortBy === 'originalName' ? 'sorted' : ''}`} onClick={() => handleSort('originalName')}><span className="th-content"><span className="th-text">Original name</span><span className="sort-arrows"><span className={`arrow up ${sortBy === 'originalName' && sortOrder === 'asc' ? 'active' : ''}`}></span><span className={`arrow down ${sortBy === 'originalName' && sortOrder === 'desc' ? 'active' : ''}`}></span></span></span></th>
                    <th className={`sortable ${sortBy === 'value' ? 'sorted' : ''}`} onClick={() => handleSort('value')}><span className="th-content"><span className="th-text">Value</span><span className="sort-arrows"><span className={`arrow up ${sortBy === 'value' && sortOrder === 'asc' ? 'active' : ''}`}></span><span className={`arrow down ${sortBy === 'value' && sortOrder === 'desc' ? 'active' : ''}`}></span></span></span></th>
                    <th className={`sortable ${sortBy === 'databaseName' ? 'sorted' : ''}`} onClick={() => handleSort('databaseName')}><span className="th-content"><span className="th-text">Database name</span><span className="sort-arrows"><span className={`arrow up ${sortBy === 'databaseName' && sortOrder === 'asc' ? 'active' : ''}`}></span><span className={`arrow down ${sortBy === 'databaseName' && sortOrder === 'desc' ? 'active' : ''}`}></span></span></span></th>
                    <th className={`sortable ${sortBy === 'databaseType' ? 'sorted' : ''}`} onClick={() => handleSort('databaseType')}><span className="th-content"><span className="th-text">Database type</span><span className="sort-arrows"><span className={`arrow up ${sortBy === 'databaseType' && sortOrder === 'asc' ? 'active' : ''}`}></span><span className={`arrow down ${sortBy === 'databaseType' && sortOrder === 'desc' ? 'active' : ''}`}></span></span></span></th>
                    <th className={`sortable ${sortBy === 'queryName' ? 'sorted' : ''}`} onClick={() => handleSort('queryName')}><span className="th-content"><span className="th-text">Query name</span><span className="sort-arrows"><span className={`arrow up ${sortBy === 'queryName' && sortOrder === 'asc' ? 'active' : ''}`}></span><span className={`arrow down ${sortBy === 'queryName' && sortOrder === 'desc' ? 'active' : ''}`}></span></span></span></th>
                    <th>Options</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((v) => (
                    <tr 
                      key={v.id}
                      className={`${openDropdownId === v.id ? 'dropdown-open' : ''} ${openDropdownId ? 'has-open-dropdown' : ''}`}
                    >
                      <td className="vars-name">{v.customName}</td>
                      <td className="vars-original">{v.originalName}</td>
                      <td className="vars-value">{v.value}</td>
                      <td className="vars-db-name">{v.databaseName}</td>
                      <td className="vars-db-type">{v.databaseType}</td>
                      <td className="vars-query-name">{v.queryName}</td>
                      <td className="vars-actions">
                        <div className="actions-container">
                          <button 
                            className="actions-btn" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenDropdownId(openDropdownId === v.id ? null : v.id);
                            }}
                            disabled={!canEditPermission}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <circle cx="12" cy="12" r="1" fill="currentColor"/>
                              <circle cx="19" cy="12" r="1" fill="currentColor"/>
                              <circle cx="5" cy="12" r="1" fill="currentColor"/>
                            </svg>
                          </button>

                          {openDropdownId === v.id && (
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
                                  setSelectedVar({ id: v.id, name: v.customName }); 
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
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="vars-pagination">
                <div className="vars-pagination-info">
                  Showing {filtered.length === 0 ? 0 : startIndex + 1} to {Math.min(endIndex, filtered.length)} of {filtered.length} variables
                </div>
                <div className="vars-pagination-controls">
                  <button className="vars-pagination-btn" onClick={handlePreviousPage} disabled={currentPage === 1}>Previous</button>
                  <div className="vars-pagination-pages">
                    {paginationNumbers.map((page, index) => (
                      <div key={index}>
                        {page === '...' ? (
                          <span className="vars-pagination-ellipsis">...</span>
                        ) : (
                          <button className={`vars-pagination-page ${currentPage === page ? 'active' : ''}`} onClick={() => handlePageChange(page as number)}>
                            {page}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button className="vars-pagination-btn" onClick={handleNextPage} disabled={currentPage === totalPages}>Next</button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <Footer />
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
              // reload
              if (projectId) {
                const list = await variableService.getVariablesByProject(projectId);
                if (list.success && list.data) {
                  const items: VariableItem[] = list.data.items.map(v => ({
                    id: v.variable_id,
                    customName: v.user_defined_name || v.original_name,
                    originalName: v.original_name,
                    value: v.value,
                    databaseName: v.database_name,
                    databaseType: v.database_type,
                    queryName: v.query_name,
                  }));
                  setVariables(items);
                }
              }
            } else {
              toast.error(resp.error || 'Failed to delete variable');
            }
          } catch (e) {
            toast.error('Failed to delete variable');
          }
        }}
      />
    </div>
  );
};

export default Variables;


