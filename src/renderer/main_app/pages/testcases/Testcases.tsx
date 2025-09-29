import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Header from '../../components/header/Header';
import Footer from '../../components/footer/Footer';
import Breadcrumb from '../../components/breadcumb/Breadcrumb';
import SidebarNavigator from '../../components/sidebar_navigator/SidebarNavigator';
import './Testcases.css';
import CreateTestcase from '../../components/testcase/create_testcase/CreateTestcase';
import EditTestcase from '../../components/testcase/edit_testcase/EditTestcase';
import DeleteTestcase from '../../components/testcase/delete_testcase/DeleteTestcase';
import { TestCaseService } from '../../services/testcases';
import { toast } from 'react-toastify';

interface Testcase {
  id: string;
  name: string;
  tag: string;
  createdBy: string;
  createdAt: string;
  updated?: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING'|"DRAFT";
  actionsCount: number;
}

const Testcases: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { projectId } = useParams();
  const projectData = { projectId, projectName: (location.state as { projectName?: string } | null)?.projectName };
  console.log('projectData', projectData);
  // Data from API
  const [testcases, setTestcases] = useState<Testcase[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [itemsPerPage, setItemsPerPage] = useState('5 rows/page');
  const [currentPage, setCurrentPage] = useState(1);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedTestcase, setSelectedTestcase] = useState<Testcase | null>(null);

  // Service
  const testCaseService = new TestCaseService();

  // Helper: reload testcases
  const reloadTestcases = async () => {
    if (!projectData?.projectId) return;
    try {
      setIsLoading(true);
      setError(null);
      const response = await testCaseService.getTestCases(projectData.projectId, 1000, 0);
      if (response.success && response.data) {
        const mapped: Testcase[] = response.data.testcases.map(tc => {
          const rawStatus = (tc as unknown as { status?: string })?.status || '';
          const normalized = rawStatus.toUpperCase();
          const allowed = ['SUCCESS', 'FAILED', 'PENDING', 'DRAFT'];
          const safeStatus = allowed.includes(normalized) ? (normalized as Testcase['status']) : 'DRAFT';
          return {
            id: tc.testcase_id,
            name: tc.name,
            tag: tc.tag || '',
            createdBy: projectData.projectName || 'Unknown',
            createdAt: tc.created_at,
            updated: tc.updated_at,
            status: safeStatus,
            actionsCount: Array.isArray(tc.actions) ? tc.actions.length : 0,
          };
        });
        setTestcases(mapped);
      } else {
        setError(response.error || 'Failed to load testcases');
        toast.error('Failed to load testcases');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      toast.error('Failed to load testcases');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    reloadTestcases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectData?.projectId]);

  // Sidebar navigation items
  const sidebarItems = [
    {
      id: 'testcases',
      label: 'Testcases',
      path: `/testcases/${projectId || ''}`,
      isActive: true
    },
    {
      id: 'test-suites',
      label: 'Test Suites',
      path: `/test-suites/${projectId || ''}`,
      isActive: false
    },
    {
      id: 'databases',
      label: 'Databases',
      path: `/databases/${projectId || ''}`,
      isActive: false
    },
    {
      id: 'queries',
      label: 'Queries',
      path: `/queries/${projectId || ''}`,
      isActive: false
    },
    {
      id: 'variables',
      label: 'Variables',
      path: `/variables/${projectId || ''}`,
      isActive: false
    }
  ];

  // Breadcrumb items
  const breadcrumbItems = [
    {
      label: 'Projects',
      path: '/dashboard',
      isActive: false
    },
    {
      label: projectData?.projectName || 'plane_app',
      path: `/testcases/${projectId || ''}`,
      isActive: true
    }
  ];

  // Filter testcases based on search and status
  const filteredTestcases = testcases.filter(testcase => {
    const matchesSearch = testcase.name.toLowerCase().includes(searchText.toLowerCase()) ||
                         (testcase.tag || '').toLowerCase().includes(searchText.toLowerCase());
    const matchesStatus = statusFilter === 'All Status' || testcase.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Pagination helpers (same approach as Dashboard)
  const getItemsPerPageNumber = () => {
    return parseInt(itemsPerPage.split(' ')[0]);
  };

  const totalPages = Math.ceil(filteredTestcases.length / getItemsPerPageNumber());
  const startIndex = (currentPage - 1) * getItemsPerPageNumber();
  const endIndex = startIndex + getItemsPerPageNumber();
  const currentTestcases = filteredTestcases.slice(startIndex, endIndex);

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

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handleTestcaseActions = (testcaseId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Ngăn chặn event bubbling
    setOpenDropdownId(openDropdownId === testcaseId ? null : testcaseId);
  };

  const handleCreateTestcase = () => {
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  const handleSaveTestcase = async ({ projectId, name, tag }: { projectId: string; name: string; tag: string }) => {
    try {
      const effectiveProjectId = projectId || projectData?.projectId;
      if (!effectiveProjectId) {
        toast.error('Missing project ID');
        return;
      }
      const payload = {
        project_id: effectiveProjectId,
        name,
        tag: tag || undefined,
      };
      const resp = await testCaseService.createTestCase(payload);
      if (resp.success) {
        toast.success('Testcase created successfully!');
        setIsCreateModalOpen(false);
        await reloadTestcases();
      } else {
        toast.error(resp.error || 'Failed to create testcase');
      }
    } catch (err) {
      toast.error('Failed to create testcase');
      // console.error(err);
    }
  };

  const handleBreadcrumbNavigate = (path: string) => {
    navigate(path);
  };

  const handleSidebarNavigate = (path: string) => {
    navigate(path);
  };

  const handleOpenEdit = (id: string, event?: React.MouseEvent) => {
    if (event) event.stopPropagation(); // Ngăn chặn event bubbling
    const tc = testcases.find(t => t.id === id) || null;
    setSelectedTestcase(tc);
    setIsEditModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleOpenDelete = (id: string, event?: React.MouseEvent) => {
    if (event) event.stopPropagation(); // Ngăn chặn event bubbling
    const tc = testcases.find(t => t.id === id) || null;
    setSelectedTestcase(tc);
    setIsDeleteModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedTestcase(null);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedTestcase(null);
  };

  const handleOpenRecorder = async (id: string) => {
    try {
      console.log('[Testcases] Opening recorder for testcase:', id);
      const result = await (window as any).screenHandleAPI?.openRecorder?.(id, projectData?.projectId);
      console.log('[Testcases] openRecorder result:', result);
    } catch (err) {
      console.error('[Testcases] openRecorder error:', err);
    }
  };

  const handleSaveEditTestcase = async ({ id, name, tag }: { id: string; name: string; tag: string }) => {
    try {
      const resp = await testCaseService.updateTestCase({ testcase_id: id, name, tag: tag || undefined });
      if (resp.success) {
        toast.success('Testcase updated successfully!');
        handleCloseEditModal();
        await reloadTestcases();
      } else {
        toast.error(resp.error || 'Failed to update testcase');
      }
    } catch (err) {
      toast.error('Failed to update testcase');
    }
  };

  const handleDeleteTestcase = async (id: string) => {
    try {
      const resp = await testCaseService.deleteTestCase({ testcase_id: id });
      if (resp.success) {
        toast.success('Testcase deleted successfully!');
        handleCloseDeleteModal();
        await reloadTestcases();
      } else {
        toast.error(resp.error || 'Failed to delete testcase');
      }
    } catch (err) {
      toast.error('Failed to delete testcase');
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.actions-container')) {
        setOpenDropdownId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="testcases-page">
      <Header />
      <Breadcrumb items={breadcrumbItems} onNavigate={handleBreadcrumbNavigate} />
      
      <div className="testcases-layout">
        <SidebarNavigator 
          items={sidebarItems} 
          onNavigate={handleSidebarNavigate}
          projectId={projectData?.projectId}
        />
        
        <main className="testcases-main">
          <div className="testcases-container">
            {/* Page Title */}
            <div className="page-title">
              {/* <h1>Testcase List</h1> */}
            </div>

          {/* Controls Section */}
          <div className="testcases-controls">
            <div className="search-section">
              <input
                type="text"
                placeholder="Search by testcase name or tag..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="search-input"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="status-dropdown"
              >
                <option value="All Status">All Status</option>
                <option value="SUCCESS">Success</option>
                <option value="FAILED">Failed</option>
                <option value="PENDING">Pending</option>
              </select>
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

              <button className="create-testcase-btn" onClick={handleCreateTestcase}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Create Testcase
              </button>
            </div>
          </div>

          {/* Testcases Table */}
          <div className="testcases-table-container">
            <table className="testcases-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Tag</th>
                  <th>Actions</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th>Options</th>
                </tr>
              </thead>
              <tbody>
                {currentTestcases.map((testcase) => (
                  <tr key={testcase.id} onClick={() => handleOpenRecorder(testcase.id)} style={{ cursor: 'pointer' }}>
                    <td className="testcase-name">{testcase.name}</td>
                    <td className="testcase-tag">{testcase.tag}</td>
                    <td className="testcase-actions-count">{testcase.actionsCount}</td>
                    <td className="testcase-status">
                      <span className={`status-badge ${testcase.status.toLowerCase()}`}>
                        {testcase.status}
                      </span>
                    </td>
                    <td className="testcase-updated">{testcase.updated || testcase.createdAt}</td>
                    <td className="testcase-actions">
                      <div className="actions-container">
                        <button 
                          className="actions-btn"
                          onClick={(e) => handleTestcaseActions(testcase.id, e)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="1" fill="currentColor"/>
                            <circle cx="19" cy="12" r="1" fill="currentColor"/>
                            <circle cx="5" cy="12" r="1" fill="currentColor"/>
                          </svg>
                        </button>
                        
                        {openDropdownId === testcase.id && (
                          <div className="actions-dropdown">
                            <button className="dropdown-item" onClick={(e) => handleOpenEdit(testcase.id, e)}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              Edit
                            </button>
                            <button className="dropdown-item delete" onClick={(e) => handleOpenDelete(testcase.id, e)}>
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
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <div className="pagination-info">
                Showing {filteredTestcases.length === 0 ? 0 : startIndex + 1} to {Math.min(endIndex, filteredTestcases.length)} of {filteredTestcases.length} testcases
              </div>
              <div className="pagination-controls">
                <button 
                  className="pagination-btn"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                
                <div className="pagination-pages">
                  {paginationNumbers.map((page, index) => (
                    <div key={index}>
                      {page === '...' ? (
                        <span className="pagination-ellipsis">...</span>
                      ) : (
                        <button
                          className={`pagination-page ${currentPage === page ? 'active' : ''}`}
                          onClick={() => handlePageChange(page as number)}
                        >
                          {page}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                
                <button 
                  className="pagination-btn"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          )}
          </div>
        </main>
      </div>

      <Footer />
      
      {/* Create Testcase Modal */}
      <CreateTestcase
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        onSave={handleSaveTestcase}
        projectId={projectData?.projectId}
      />

      {/* Edit Testcase Modal */}
      <EditTestcase
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        onSave={handleSaveEditTestcase}
        testcase={selectedTestcase ? { testcase_id: selectedTestcase.id, name: selectedTestcase.name, tag: selectedTestcase.tag } : null}
      />

      {/* Delete Testcase Modal */}
      <DeleteTestcase
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onDelete={handleDeleteTestcase}
        testcase={selectedTestcase ? { testcase_id: selectedTestcase.id, name: selectedTestcase.name } : null}
      />
    </div>
  );
};

export default Testcases;
