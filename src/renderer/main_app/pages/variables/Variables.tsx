import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Header from '../../components/header/Header';
import Footer from '../../components/footer/Footer';
import Breadcrumb from '../../components/breadcumb/Breadcrumb';
import SidebarNavigator from '../../components/sidebar_navigator/SidebarNavigator';
import './Variables.css';
import { VariableService } from '../../services/variables';

interface VariableItem {
  id: string;
  name: string;
  value: string;
}

const Variables: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { projectId } = useParams();

  const [variables, setVariables] = useState<VariableItem[]>([]);
  const [searchText, setSearchText] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState('5 rows/page');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const loadVariables = async () => {
      if (!projectId) return;
      try {
        const svc = new VariableService();
        const resp = await svc.getVariablesByProject(projectId);
        if (resp.success && resp.data) {
          const items: VariableItem[] = resp.data.items.map(v => ({
            id: v.variable_id,
            name: v.user_defined_name || v.original_name,
            value: v.value,
          }));
          setVariables(items);
        } else {
          setVariables([]);
        }
      } catch (e) {
        setVariables([]);
      }
    };
    loadVariables();
  }, [projectId]);

  const sidebarItems = [
    { id: 'testcases', label: 'Testcases', path: `/testcases/${projectId}`, isActive: false },
    { id: 'test-suites', label: 'Test Suites', path: `/test-suites/${projectId}`, isActive: false },
    { id: 'databases', label: 'Databases', path: `/databases/${projectId}`, isActive: false },
    { id: 'queries', label: 'Queries', path: `/queries/${projectId}`, isActive: false },
    { id: 'variables', label: 'Variables', path: `/variables/${projectId}`, isActive: true },
  ];

  const breadcrumbItems = [
    { label: 'Projects', path: '/dashboard', isActive: false },
    { label: 'Variables', path: `/variables/${projectId}`, isActive: true },
  ];

  const filtered = variables.filter(v => {
    const q = searchText.toLowerCase();
    return (v.name || '').toLowerCase().includes(q) || (v.value || '').toLowerCase().includes(q);
  });

  const getItemsPerPageNumber = () => parseInt(itemsPerPage.split(' ')[0]);
  const totalPages = Math.ceil(filtered.length / getItemsPerPageNumber());
  const startIndex = (currentPage - 1) * getItemsPerPageNumber();
  const endIndex = startIndex + getItemsPerPageNumber();
  const currentItems = filtered.slice(startIndex, endIndex);

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
                <select
                  value={itemsPerPage}
                  onChange={(e) => { setItemsPerPage(e.target.value); setCurrentPage(1); }}
                  className="vars-pagination-dropdown"
                >
                  <option value="5 rows/page">5 rows/page</option>
                  <option value="10 rows/page">10 rows/page</option>
                  <option value="20 rows/page">20 rows/page</option>
                  <option value="50 rows/page">50 rows/page</option>
                </select>
              </div>
            </div>

            <div className="vars-table-container">
              <table className="vars-table">
                <thead>
                  <tr>
                    <th>Variable Name</th>
                    <th>Value</th>
                    <th>Options</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((v) => (
                    <tr key={v.id}>
                      <td className="vars-name">{v.name}</td>
                      <td className="vars-value">{v.value}</td>
                      <td className="vars-actions">
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
    </div>
  );
};

export default Variables;


