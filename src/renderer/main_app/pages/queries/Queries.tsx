import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Header from '../../components/header/Header';
import Footer from '../../components/footer/Footer';
import Breadcrumb from '../../components/breadcumb/Breadcrumb';
import SidebarNavigator from '../../components/sidebar_navigator/SidebarNavigator';
import './Queries.css';
import { ProjectService } from '../../services/projects';
import { DatabaseService } from '../../services/database';

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

  const fetchQueries = async () => {
    if (!projectId) return;
    try {
      setIsLoading(true);
      setError(null);
      const state = (location.state as { connectionId?: string } | null);
      const connectionId = state?.connectionId;
      if (!connectionId) {
        setQueries([]);
        return;
      }
      const svc = new DatabaseService();
      const resp = await svc.getStatementsByConnection(connectionId);
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
                <button className="qry-create-query-btn" onClick={() => {}}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Add Query
                </button>
              </div>
            </div>

            <div className="qry-table-container">
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
                        <td className="qry-status">{q.status || '-'}</td>
                        <td className="qry-actions">
                          <div className="actions-container">
                            <button className="actions-btn">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="1" fill="currentColor"/>
                                <circle cx="19" cy="12" r="1" fill="currentColor"/>
                                <circle cx="5" cy="12" r="1" fill="currentColor"/>
                              </svg>
                            </button>
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
    </div>
  );
};

export default Queries;


