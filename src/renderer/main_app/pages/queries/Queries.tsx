import React, { useEffect, useState } from 'react';
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

interface QueryItem {
  id: string;
  name: string;
  description?: string;
  status?: string;
}

const Queries: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { projectId } = useParams();
  const projectData = { projectId, projectName: (location.state as { projectName?: string } | null)?.projectName };
  const [resolvedProjectName, setResolvedProjectName] = useState<string>(projectData.projectName || 'Project');

  const [queries, setQueries] = useState<QueryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState('5 rows/page');
  const [currentPage, setCurrentPage] = useState(1);
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

  const fetchQueries = async () => {
    if (!projectId) return;
    try {
      setIsLoading(true);
      setError(null);
      if (!projectId) {
        setQueries([]);
        return;
      }
      const svc = new StatementService();
      const resp = await svc.getStatementsByProject(projectId);
      if (resp.success && resp.data) {
        const items: QueryItem[] = resp.data.items.map(it => ({
          id: it.statement_id,
          name: it.name,
          description: it.description,
          status: it.status,
        }));
        setQueries(items);
      } else {
        setError(resp.error || 'Failed to load queries');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueries();
    fetchConnections();
  }, [projectId]);

  const fetchConnections = async () => {
    if (!projectId) return;
    try {
      const svc = new DatabaseService();
      const resp = await svc.getDatabaseConnections({ project_id: projectId });
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
      console.error('Failed to fetch connections:', e);
    }
  };

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

  const sidebarItems = [
    { id: 'testcases', label: 'Testcases', path: `/testcases/${projectId}`, isActive: false },
    { id: 'test-suites', label: 'Test Suites', path: `/test-suites/${projectId}`, isActive: false },
    { id: 'databases', label: 'Databases', path: `/databases/${projectId}`, isActive: false },
    { id: 'queries', label: 'Queries', path: `/queries/${projectId}`, isActive: true },
    { id: 'variables', label: 'Variables', path: `/variables/${projectId}`, isActive: false },
    
  ];

  const breadcrumbItems = [
    { label: 'Projects', path: '/dashboard', isActive: false },
    { label: resolvedProjectName, path: `/queries/${projectId}`, isActive: true },
  ];

  const filtered = queries.filter(q => {
    const t = searchText.toLowerCase();
    return (q.name || '').toLowerCase().includes(t) || (q.description || '').toLowerCase().includes(t) || (q.status || '').toLowerCase().includes(t);
  });

  const getItemsPerPageNumber = () => parseInt(itemsPerPage.split(' ')[0]);
  const totalPages = Math.ceil(filtered.length / getItemsPerPageNumber() || 1);
  const startIndex = (currentPage - 1) * getItemsPerPageNumber();
  const endIndex = startIndex + getItemsPerPageNumber();
  const currentItems = filtered.slice(startIndex, endIndex);

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

  const handlePageChange = (page: number) => setCurrentPage(page);
  const handlePreviousPage = () => { if (currentPage > 1) setCurrentPage(currentPage - 1); };
  const handleNextPage = () => { if (currentPage < totalPages) setCurrentPage(currentPage + 1); };
  const handleBreadcrumbNavigate = (path: string) => navigate(path);
  const handleSidebarNavigate = (path: string) => navigate(path);

  const handleRunQuery = async () => {
    if (!sqlQuery.trim() || !selectedConnectionId) {
      toast.error('Please enter SQL query and select connection');
      return;
    }
    
    try {
      setIsRunningQuery(true);
      const svc = new StatementService();
      const resp = await svc.runWithoutCreate({
        connection_id: selectedConnectionId,
        query: sqlQuery.trim()
      });
      
      if (resp.success && resp.data) {
        console.log(resp.data);
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
                    disabled={isRunningQuery || !sqlQuery.trim() || !selectedConnectionId}
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
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="qry-search-input"
                />
              </div>

              <div className="qry-controls-section">
                <select
                  value={itemsPerPage}
                  onChange={(e) => { setItemsPerPage(e.target.value); setCurrentPage(1); }}
                  className="qry-pagination-dropdown"
                >
                  <option value="5 rows/page">5 rows/page</option>
                  <option value="10 rows/page">10 rows/page</option>
                  <option value="20 rows/page">20 rows/page</option>
                  <option value="50 rows/page">50 rows/page</option>
                </select>
                <button className="qry-create-query-btn" onClick={() => setIsAddOpen(true)}>
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
                    <th>Name</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Options</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={4} className="qry-center">Loading...</td></tr>
                  ) : error ? (
                    <tr><td colSpan={4} className="qry-center qry-error">{error}</td></tr>
                  ) : currentItems.length === 0 ? (
                    <tr><td colSpan={4} className="qry-center">No queries</td></tr>
                  ) : (
                    currentItems.map((q) => (
                      <tr key={q.id}>
                        <td className="qry-name">{q.name}</td>
                        <td className="qry-description">{q.description || '-'}</td>
                        <td className="qry-status">
                          {q.status ? (
                            <span className={`status-badge ${(q.status || '').toLowerCase()}`}>
                              {q.status}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="qry-actions">
                          <div className="actions-container">
                            <button className="actions-btn" onClick={() => setOpenDropdownId(openDropdownId === q.id ? null : q.id)}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="1" fill="currentColor"/>
                                <circle cx="19" cy="12" r="1" fill="currentColor"/>
                                <circle cx="5" cy="12" r="1" fill="currentColor"/>
                              </svg>
                            </button>
                            {openDropdownId === q.id && (
                              <div className="actions-dropdown">
                                <button className="dropdown-item" onClick={async () => {
                                  try {
                                    const svc = new StatementService();
                                    setSelectedQuery({ id: q.id, name: q.name });
                                    const resp = await svc.runStatementById(q.id);
                                    if (resp.success) {
                                      toast.success('Query is running');
                                      // StatementRunByIdResponse does not include statement_text; keep last known
                                      setRunSql(q.name);
                                      const items = (resp.data?.data || []).map((d: any) => ({ name: d.name, value: String(d.value) }));
                                      setRunItems(items);
                                      setIsRunOpen(true);
                                    } else {
                                      toast.error(resp.error || 'Failed to run query');
                                    }
                                  } catch (e) {
                                    toast.error('Failed to run query');
                                  } finally {
                                    setOpenDropdownId(null);
                                  }
                                }}>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <polygon points="8,5 19,12 8,19" fill="currentColor" />
                                  </svg>
                                  Run
                                </button>
                                <button className="dropdown-item delete" onClick={() => { setSelectedQuery({ id: q.id, name: q.name }); setIsDeleteOpen(true); setOpenDropdownId(null); }}>
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
                  Showing {filtered.length === 0 ? 0 : startIndex + 1} to {Math.min(endIndex, filtered.length)} of {filtered.length} queries
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
            const svc = new StatementService();
            const resp = await svc.createAndRunStatement({ connection_id, name, description, statement_text });
            if (resp.success) {
              toast.success('Query created');
              setIsAddOpen(false);
              // refresh list by project
              if (projectId) {
                const list = await svc.getStatementsByProject(projectId);
                if (list.success && list.data) {
                  const items: QueryItem[] = list.data.items.map(it => ({ id: it.statement_id, name: it.name, description: it.description, status: it.status }));
                  setQueries(items);
                }
              }
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
            const svc = new StatementService();
            const resp = await svc.deleteStatement(id);
            if (resp.success) {
              toast.success('Query deleted');
              setIsDeleteOpen(false);
              if (projectId) {
                const list = await svc.getStatementsByProject(projectId);
                if (list.success && list.data) {
                  const items: QueryItem[] = list.data.items.map(it => ({ id: it.statement_id, name: it.name, description: it.description, status: it.status }));
                  setQueries(items);
                }
              }
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
        items={runItems}
        projectId={projectId}
        statementId={selectedQuery?.id || undefined}
        onClose={() => setIsRunOpen(false)}
      />
    </div>
  );
};

export default Queries;


