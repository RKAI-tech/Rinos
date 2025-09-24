import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Header from '../../components/header/Header';
import Footer from '../../components/footer/Footer';
import Breadcrumb from '../../components/breadcumb/Breadcrumb';
import SidebarNavigator from '../../components/sidebar_navigator/SidebarNavigator';
import './TestSuites.css';
import { ProjectService } from '../../services/projects';
import { TestSuiteService } from '../../services/testsuites';
import { toast } from 'react-toastify';
import CreateTestSuite from '../../components/testsuite/create_test_suite/CreateTestSuite';
import EditTestSuite from '../../components/testsuite/edit_test_suite/EditTestSuite';
import DeleteTestSuite from '../../components/testsuite/delete_test_suite/DeleteTestSuite';
import AddTestcasesToSuite from '../../components/testsuite/add_testcase_to_suite/AddTestcasesToSuite';

interface TestSuite {
  id: string;
  name: string;
  description?: string;
  passRate?: number; // 0..100
  testcases?: number;
  passed?: number;
  failed?: number;
  createdAt: string;
  updated?: string;
}

const TestSuites: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { projectId } = useParams();
  const projectData = { projectId, projectName: (location.state as { projectName?: string } | null)?.projectName };
  const [resolvedProjectName, setResolvedProjectName] = useState<string>(projectData.projectName || 'Project');

  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [itemsPerPage, setItemsPerPage] = useState('5 rows/page');
  const [currentPage, setCurrentPage] = useState(1);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedSuite, setSelectedSuite] = useState<TestSuite | null>(null);

  const handleCreateSuite = () => {
    setIsCreateOpen(true);
  };

  const fetchSuites = async () => {
    if (!projectId) return;
    try {
      setIsLoading(true);
      setError(null);
      const svc = new TestSuiteService();
      const resp = await svc.getTestSuites(projectId);
      if (resp.success && resp.data) {
        const mapped: TestSuite[] = resp.data.test_suites.map(ts => ({
          id: ts.test_suite_id,
          name: ts.name,
          description: ts.description,
          passRate: ts.passed_rate ? parseFloat(String(ts.passed_rate)) : undefined,
          testcases: ts.number_testcase,
          passed: ts.test_passed ? parseFloat(String(ts.test_passed)) : undefined,
          failed: ts.test_failed ? parseFloat(String(ts.test_failed)) : undefined,
          createdAt: ts.created_at,
          updated: undefined,
        }));
        setTestSuites(mapped);
      } else {
        setError(resp.error || 'Failed to load test suites');
        toast.error('Failed to load test suites');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred');
      toast.error('Failed to load test suites');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuites();
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
    { id: 'test-suites', label: 'Test Suites', path: `/test-suites/${projectId}`, isActive: true },
    
    { id: 'databases', label: 'Databases', path: `/databases/${projectId}`, isActive: false },
    { id: 'queries', label: 'Queries', path: `/queries/${projectId}`, isActive: false },
    { id: 'variables', label: 'Variables', path: `/variables/${projectId}`, isActive: false }
  ];

  const breadcrumbItems = [
    { label: 'Projects', path: '/dashboard', isActive: false },
    { label: resolvedProjectName, path: `/test-suites/${projectId}`, isActive: true },
  ];

  const filteredSuites = testSuites.filter(suite => {
    const q = searchText.toLowerCase();
    const matchesSearch = (suite.name || '').toLowerCase().includes(q) || (suite.description || '').toLowerCase().includes(q);
    // Status currently not part of columns; keep filter passthrough as 'All Status'
    const matchesStatus = statusFilter === 'All Status';
    return matchesSearch && matchesStatus;
  });

  const getItemsPerPageNumber = () => parseInt(itemsPerPage.split(' ')[0]);
  const totalPages = Math.ceil(filteredSuites.length / getItemsPerPageNumber());
  const startIndex = (currentPage - 1) * getItemsPerPageNumber();
  const endIndex = startIndex + getItemsPerPageNumber();
  const currentSuites = filteredSuites.slice(startIndex, endIndex);

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
  const handleSuiteActions = (id: string) => setOpenDropdownId(openDropdownId === id ? null : id);
  const handleBreadcrumbNavigate = (path: string) => navigate(path);
  const handleSidebarNavigate = (path: string) => navigate(path);

  const handleOpenEditSuite = (id: string) => {
    const suite = testSuites.find(s => s.id === id) || null;
    setSelectedSuite(suite);
    setIsEditOpen(true);
    setOpenDropdownId(null);
  };

  const handleOpenDeleteSuite = (id: string) => {
    const suite = testSuites.find(s => s.id === id) || null;
    setSelectedSuite(suite);
    setIsDeleteOpen(true);
    setOpenDropdownId(null);
  };

  const handleCloseCreateSuite = () => setIsCreateOpen(false);
  const handleCloseEditSuite = () => { setIsEditOpen(false); setSelectedSuite(null); };
  const handleCloseDeleteSuite = () => { setIsDeleteOpen(false); setSelectedSuite(null); };

  const handleRunSuite = async (id: string) => {
    try {
      const svc = new TestSuiteService();
      const resp = await svc.executeTestSuite({ test_suite_id: id });
      if (resp.success) {
        toast.success('Test suite is running');
      } else {
        toast.error(resp.error || 'Failed to run test suite');
      }
    } catch (e) {
      toast.error('Failed to run test suite');
    } finally {
      setOpenDropdownId(null);
    }
  };

  const handleSaveCreateSuite = async ({ projectId: pid, name, description }: { projectId: string; name: string; description: string }) => {
    try {
      const effectiveProjectId = pid || projectId;
      if (!effectiveProjectId) {
        toast.error('Missing project ID');
        return;
      }
      const svc = new TestSuiteService();
      const resp = await svc.createTestSuite({ project_id: effectiveProjectId, name, description });
      if (resp.success) {
        toast.success('Test suite created');
        setIsCreateOpen(false);
        await fetchSuites();
      } else {
        toast.error(resp.error || 'Failed to create test suite');
      }
    } catch (e) {
      toast.error('Failed to create test suite');
    }
  };

  const handleSaveEditSuite = async ({ id, name, description }: { id: string; name: string; description?: string }) => {
    try {
      const svc = new TestSuiteService();
      const desc = description ?? (selectedSuite?.description || '');
      const resp = await svc.updateTestSuite({ test_suite_id: id, name, description: desc });
      if (resp.success) {
        toast.success('Test suite updated');
        handleCloseEditSuite();
        await fetchSuites();
      } else {
        toast.error(resp.error || 'Failed to update test suite');
      }
    } catch (e) {
      toast.error('Failed to update test suite');
    }
  };

  const handleDeleteSuite = async (id: string) => {
    try {
      const svc = new TestSuiteService();
      const resp = await svc.deleteTestSuite(id);
      if (resp.success) {
        toast.success('Test suite deleted');
        handleCloseDeleteSuite();
        await fetchSuites();
      } else {
        toast.error(resp.error || 'Failed to delete test suite');
      }
    } catch (e) {
      toast.error('Failed to delete test suite');
    }
  };

  const handleAddTestcasesToSuite = (id: string) => {
    const suite = testSuites.find(s => s.id === id) || null;
    setSelectedSuite(suite);
    setIsAddOpen(true);
    setOpenDropdownId(null);
  };

  return (
    <div className="testsuites-page">
      <Header />
      <Breadcrumb items={breadcrumbItems} onNavigate={handleBreadcrumbNavigate} />

      <div className="testsuites-layout">
        <SidebarNavigator
          items={sidebarItems}
          onNavigate={handleSidebarNavigate}
          projectId={projectData?.projectId}
        />

        <main className="testsuites-main">
          <div className="testsuites-container">
            <div className="page-title" />

            <div className="testsuites-controls">
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
                  <option value="5 rows/page">5 rows/page</option>
                  <option value="10 rows/page">10 rows/page</option>
                  <option value="20 rows/page">20 rows/page</option>
                  <option value="50 rows/page">50 rows/page</option>
                </select>

                <button className="create-testsuite-btn" onClick={handleCreateSuite}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Create Test Suite
                </button>
              </div>
            </div>

            <div className="testsuites-table-container">
              <table className="testsuites-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Pass Rate</th>
                    <th>Testcases</th>
                    <th>Passed</th>
                    <th>Failed</th>
                    <th>Created</th>
                    <th>Options</th>
                  </tr>
                </thead>
                <tbody>
                  {currentSuites.map((suite) => (
                    <tr key={suite.id}>
                      <td className="testsuite-name">{suite.name}</td>
                      <td className="testsuite-description">{suite.description || '-'}</td>
                      <td className="testsuite-passrate">{suite.passRate != null ? `${suite.passRate}%` : '-'}</td>
                      <td className="testsuite-testcases">{suite.testcases ?? '-'}</td>
                      <td className="testsuite-passed">{suite.passed ?? '-'}</td>
                      <td className="testsuite-failed">{suite.failed ?? '-'}</td>
                      <td className="testsuite-created">{suite.createdAt}</td>
                      <td className="testsuite-actions">
                        <div className="actions-container">
                          <button 
                            className="actions-btn"
                            onClick={() => handleSuiteActions(suite.id)}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <circle cx="12" cy="12" r="1" fill="currentColor"/>
                              <circle cx="19" cy="12" r="1" fill="currentColor"/>
                              <circle cx="5" cy="12" r="1" fill="currentColor"/>
                            </svg>
                          </button>

                          {openDropdownId === suite.id && (
                            <div className="actions-dropdown">
                              <button className="dropdown-item" onClick={() => handleRunSuite(suite.id)}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <polygon points="8,5 19,12 8,19" fill="currentColor" />
                                </svg>
                                Run
                              </button>
                              <button className="dropdown-item" onClick={() => handleAddTestcasesToSuite(suite.id)}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                Add Cases
                              </button>
                              <button className="dropdown-item" onClick={() => handleOpenEditSuite(suite.id)}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                Edit
                              </button>
                              <button className="dropdown-item delete" onClick={() => handleOpenDeleteSuite(suite.id)}>
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
                  Showing {filteredSuites.length === 0 ? 0 : startIndex + 1} to {Math.min(endIndex, filteredSuites.length)} of {filteredSuites.length} test suites
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
      
      {/* Create Test Suite Modal */}
      <CreateTestSuite
        isOpen={isCreateOpen}
        onClose={handleCloseCreateSuite}
        onSave={handleSaveCreateSuite}
        projectId={projectId}
      />

      {/* Edit Test Suite Modal */}
      <EditTestSuite
        isOpen={isEditOpen}
        onClose={handleCloseEditSuite}
        onSave={handleSaveEditSuite}
        testsuite={selectedSuite ? { testsuite_id: selectedSuite.id, name: selectedSuite.name, description: selectedSuite.description || '' } : null}
      />

      {/* Delete Test Suite Modal */}
      <DeleteTestSuite
        isOpen={isDeleteOpen}
        onClose={handleCloseDeleteSuite}
        onDelete={handleDeleteSuite}
        testsuite={selectedSuite ? { testsuite_id: selectedSuite.id, name: selectedSuite.name } : null}
      />

      {/* Add Testcases To Suite Modal */}
      <AddTestcasesToSuite
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        projectId={projectId}
        onSave={async (testcaseIds: string[]) => {
          try {
            if (!selectedSuite) return;
            const svc = new TestSuiteService();
            const resp = await svc.addTestCasesToSuite({ test_suite_id: selectedSuite.id, testcase_ids: testcaseIds });
            if (resp.success) {
              toast.success('Added testcases to suite');
              setIsAddOpen(false);
              await fetchSuites();
            } else {
              toast.error(resp.error || 'Failed to add testcases');
            }
          } catch (e) {
            toast.error('Failed to add testcases');
          }
        }}
      />
    </div>
  );
};

export default TestSuites;


