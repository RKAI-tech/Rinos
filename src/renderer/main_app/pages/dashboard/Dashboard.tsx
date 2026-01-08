import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/header/Header';
import CreateProject from '../../components/project/create_project/CreateProject';
import EditProject from '../../components/project/edit_project/EditProject';
import { UserService } from '../../services/user';
import AddUser from '../../components/project/add_user/add_user/AddUser';
import DeleteProject from '../../components/project/delete_project/DeleteProject';
import KeyManagementModal from '../../components/project/key_management/KeyManagementModal';
import { ProjectService } from '../../services/projects';
import { Project } from '../../types/projects';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import './Dashboard.css';

// Using Project interface from types/projects.ts

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  // State for projects data from API
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReloading, setIsReloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search, pagination, and sort state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<string | null>('created_at');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  
  // Pagination info from API
  const [totalProjects, setTotalProjects] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  
  // Initialize ProjectService - use useMemo to avoid recreating on every render
  const projectService = useMemo(() => new ProjectService(), []);
  const userService = useMemo(() => new UserService(), []);

  // Load projects when search/pagination/sort state changes, but only if authenticated
  useEffect(() => {
    if (authLoading || !isAuthenticated) {
      return;
    }

    const loadProjects = async () => {
    try {
        setIsLoading(true);
      setError(null);
        
        const request = {
          page: page,
          page_size: pageSize,
          q: search || null,
          sort_by: sortBy || null,
          order: order || 'asc'
        };

        const response = await projectService.searchProjects(request);
        
      if (response.success && response.data) {
        setProjects(response.data.projects);
          setTotalProjects(response.data.number_project);
          setCurrentPage(response.data.current_page);
          setTotalPages(response.data.total_pages);
          // Only sync page if it's different from current page to avoid infinite loop
          if (response.data.current_page !== page) {
            setPage(response.data.current_page);
          }
      } else {
        setError(response.error || 'Failed to load projects');
        toast.error(response.error || 'Failed to load projects');
          setProjects([]);
          setTotalProjects(0);
          setCurrentPage(1);
          setTotalPages(1);
          setPage(1);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      toast.error('Failed to load projects');
        setProjects([]);
        setTotalProjects(0);
        setCurrentPage(1);
        setTotalPages(1);
        setPage(1);
    } finally {
        setIsLoading(false);
    }
  };

    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search, sortBy, order, authLoading, isAuthenticated]);

  // Helper function to reload projects (for manual refresh)
  const reloadProjects = useCallback(async () => {
      try {
      setIsReloading(true);
        setError(null);
      
      const request = {
        page: page,
        page_size: pageSize,
        q: search || null,
        sort_by: sortBy || null,
        order: order || 'asc'
      };

      const response = await projectService.searchProjects(request);
        
        if (response.success && response.data) {
          setProjects(response.data.projects);
        setTotalProjects(response.data.number_project);
        setCurrentPage(response.data.current_page);
        setTotalPages(response.data.total_pages);
        // Only sync page if it's different to avoid infinite loop
        if (response.data.current_page !== page) {
          setPage(response.data.current_page);
        }
        } else {
          setError(response.error || 'Failed to load projects');
          toast.error(response.error || 'Failed to load projects');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
        toast.error('Failed to load projects');
      } finally {
      setIsReloading(false);
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search, sortBy, order]);

  // Share modal handles its own user loading

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
  }, []);

  // Statistics calculated from API data using useMemo for performance
  // Note: These statistics are calculated from current page data only
  // For accurate totals, backend should provide aggregated statistics
  const statistics = useMemo(() => {
    return {
      totalProjects: totalProjects, // Use total from API
      totalTestCases: projects.reduce((sum, project) => sum + (project.number_testcase || 0), 0),
      totalTestSuites: projects.reduce((sum, project) => sum + (project.number_testsuite || 0), 0),
      totalVariables: projects.reduce((sum, project) => sum + (project.number_variable || 0), 0)
    };
  }, [projects, totalProjects]);

  const handleCreateProject = () => {
    setIsCreateModalOpen(true);
  };

  const handleProjectClick = (project: Project) => {
    // Navigate to testcases page with project context
    navigate(`/suites-manager/${project.project_id}`, { 
      state: { 
        projectName: project.name 
      } 
    });
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  const handleSaveProject = async (projectData: { name: string; description?: string }) => {
    try {
      const response = await projectService.createProject({
        name: projectData.name,
        description: projectData.description ?? ''
      });

      if (response.success && response.data) {
        toast.success('Project created successfully!');
        setIsCreateModalOpen(false);
        
        // Debug log to check the response data
        // console.log('Created project response:', response.data);
        
        // Reload projects to ensure data consistency
        await reloadProjects();
      } else {
        toast.error(response.error || 'Failed to create project');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      toast.error('Failed to create project');
      // console.error('Error creating project:', err);
    }
  };

  const handleProjectActions = (projectId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent row click when clicking actions button
    setOpenDropdownId(openDropdownId === projectId ? null : projectId);
  };

  const handleEditProject = (projectId: string, event?: React.MouseEvent) => {
    if (event) event.stopPropagation(); // Ngăn chặn event bubbling
    const project = projects.find(p => p.project_id === projectId);
    if (project) {
      setSelectedProject(project);
      setIsEditModalOpen(true);
      setOpenDropdownId(null);
    }
  };

  const handleDeleteProjectClick = (projectId: string, event?: React.MouseEvent) => {
    if (event) event.stopPropagation(); // Ngăn chặn event bubbling
    const project = projects.find(p => p.project_id === projectId);
    if (project) {
      setSelectedProject(project);
      setIsDeleteModalOpen(true);
      setOpenDropdownId(null);
    }
  };

  const handleShareProjectClick = (projectId: string, event?: React.MouseEvent) => {
    if (event) event.stopPropagation();
    const project = projects.find(p => p.project_id === projectId);
    if (project) {
      setSelectedProject(project);
      setIsShareModalOpen(true);
      setOpenDropdownId(null);
    }
  };

  const handleKeyProjectClick = (projectId: string, event?: React.MouseEvent) => {
    if (event) event.stopPropagation();
    const project = projects.find(p => p.project_id === projectId);
    if (project) {
      setSelectedProject(project);
      setIsKeyModalOpen(true);
      setOpenDropdownId(null);
    }
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedProject(null);
  };

  const handleUpdateProject = async (projectData: { id: string; name: string; description: string }) => {
    try {
      const response = await projectService.updateProject({
        project_id: projectData.id,
        name: projectData.name,
        description: projectData.description
      });

      if (response.success && response.data) {
        toast.success('Project updated successfully!');
        setIsEditModalOpen(false);
        setSelectedProject(null);
        
        // Reload projects to ensure data consistency
        await reloadProjects();
      } else {
        toast.error(response.error || 'Failed to update project. Please try again.');
      }
    } catch (err) {
      toast.error('Failed to update project. Please try again.');
      // console.error('Error updating project:', err);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      const response = await projectService.deleteProject({
        project_id: projectId
      });

      if (response.success) {
        toast.success('Project deleted successfully!');
        setIsDeleteModalOpen(false);
        setSelectedProject(null);
        
        // Reload projects to ensure data consistency
        await reloadProjects();
      } else {
        toast.error(response.error || 'Failed to delete project. Please try again.');
      }
    } catch (err) {
      toast.error('Failed to delete project. Please try again.');
      // console.error('Error deleting project:', err);
    }
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedProject(null);
  };

  const handleCloseShareModal = () => {
    setIsShareModalOpen(false);
    setSelectedProject(null);
  };

  const handleCloseKeyModal = () => {
    setIsKeyModalOpen(false);
    setSelectedProject(null);
  };

  const handleOpenDeleteModal = (projectId: string) => {
    const project = projects.find(p => p.project_id === projectId);
    if (project) {
      setSelectedProject(project);
      setIsDeleteModalOpen(true);
    }
  };

  // Handle sort - reset page to 1 when sort changes
  const handleSort = (
    column: 'name' | 'created_at' | 'number_testcase' | 'number_testsuite' | 'number_user'
  ) => {
    if (sortBy === column) {
      // Toggle order if same column
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to asc
      setSortBy(column);
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

  // Generate pagination numbers with ellipsis
  const generatePaginationNumbers = () => {
    const pages = [];
    
    if (totalPages <= 3) {
      // Show all pages if 3 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show smart pagination with ellipsis
      if (currentPage <= 2) {
        // Show: 1, 2, 3, ..., last
        pages.push(1, 2, 3);
        if (totalPages > 4) {
          pages.push('...');
        }
        if (totalPages > 3) {
          pages.push(totalPages);
        }
      } else if (currentPage >= totalPages - 1) {
        // Show: 1, ..., last-2, last-1, last
        pages.push(1);
        if (totalPages > 4) {
          pages.push('...');
        }
        pages.push(totalPages - 2, totalPages - 1, totalPages);
      } else {
        // Show: 1, ..., current-1, current, current+1, ..., last
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1, currentPage, currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const paginationNumbers = generatePaginationNumbers();

  // Calculate display range
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalProjects);

  // Show loading state
  if (isLoading) {
      return (
      <div className="dashboard">
        <Header />
        <main className="dashboard-main">
          <div className="dashboard-container">
            <div className="page-title">
              <h1>Project Overview</h1>
            </div>
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p>Loading projects...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="dashboard">
        <Header />
        <main className="dashboard-main">
          <div className="dashboard-container">
            <div className="page-title">
              <h1>Project Overview</h1>
            </div>
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: 'red' }}>Error: {error}</p>
              <button onClick={() => window.location.reload()}>Retry</button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <Header />
      
      <main className="dashboard-main">
        <div className="dashboard-container">
          {/* Page Title */}
          <div className="page-title">
            <h1>Project Overview</h1>
          </div>

          {/* Project Statistics */}
          <section className="project-statistics">
            <h2>Project Statistics</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-content">
                  <div className="stat-header">
                    <h3>Total Projects</h3>
                    <p>All projects currently managed</p>
                  </div>
                  <div className="stat-value">
                    <div className="stat-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 7V5C3 3.89543 3.89543 3 5 3H19C20.1046 3 21 3.89543 21 5V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M3 7V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M8 11H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M8 15H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="stat-number">{statistics.totalProjects}</div>
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-content">
                  <div className="stat-header">
                    <h3>Total Test Cases</h3>
                    <p>All test cases across projects</p>
                  </div>
                  <div className="stat-value">
                    <div className="stat-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="stat-number">{statistics.totalTestCases}</div>
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-content">
                  <div className="stat-header">
                    <h3>Total Test Suites</h3>
                    <p>All test suites across projects</p>
                  </div>
                  <div className="stat-value">
                    <div className="stat-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 7V5C3 3.89543 3.89543 3 5 3H19C20.1046 3 21 3.89543 21 5V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M3 7V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M8 11H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M8 15H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M14 11H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M14 15H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="stat-number">{statistics.totalTestSuites}</div>
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-content">
                  <div className="stat-header">
                    <h3>Total Variables</h3>
                    <p>All variables across projects</p>
                  </div>
                  <div className="stat-value">
                    <div className="stat-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="12" cy="12" r="2" fill="currentColor"/>
                      </svg>
                    </div>
                    <div className="stat-number">{statistics.totalVariables}</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Project List */}
          <section className="project-list">
            <div className="project-list-header">
              <h2>Project List</h2>
            </div>

            <div className="project-controls">
              <div className="filter-section">
                <input
                  type="text"
                  placeholder="Search by project name or description..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="filter-input"
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
              </div>

              <div className="controls-section">
                <button
                  className={`reload-btn ${isReloading ? 'is-loading' : ''}`}
                  onClick={reloadProjects}
                  disabled={isLoading || isReloading}
                  title="Reload project list"
                  aria-label="Reload projects"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 11a8.1 8.1 0 0 0-15.5-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M4 5v4h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M4 13a8.1 8.1 0 0 0 15.5 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M20 19v-4h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                <select
                  value={`${pageSize} per page`}
                  onChange={(e) => handlePageSizeChange(e.target.value)}
                  className="pagination-dropdown"
                >
                  <option value="10 per page">10 per page</option>
                  <option value="20 per page">20 per page</option>
                  <option value="30 per page">30 per page</option>
                </select>

                <button className="create-project-btn" onClick={handleCreateProject}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Create Project
                </button>
              </div>
            </div>

            <div className="projects-table-container">
              <table className="projects-table">
                <thead>
                  <tr>
                    <th
                      className={`sortable ${sortBy === 'name' ? 'sorted' : ''}`}
                      onClick={() => handleSort('name')}
                    >
                      <span className="th-content">
                        <span className="th-text">Name</span>
                        <span className="sort-arrows">
                          <span className={`arrow up ${sortBy === 'name' && order === 'asc' ? 'active' : ''}`}></span>
                          <span className={`arrow down ${sortBy === 'name' && order === 'desc' ? 'active' : ''}`}></span>
                        </span>
                      </span>
                    </th>
                    <th
                      className={`sortable ${sortBy === 'created_at' ? 'sorted' : ''}`}
                      onClick={() => handleSort('created_at')}
                    >
                      <span className="th-content">
                        <span className="th-text">Created At</span>
                        <span className="sort-arrows">
                          <span className={`arrow up ${sortBy === 'created_at' && order === 'asc' ? 'active' : ''}`}></span>
                          <span className={`arrow down ${sortBy === 'created_at' && order === 'desc' ? 'active' : ''}`}></span>
                        </span>
                      </span>
                    </th>
                    <th
                      className={`sortable ${sortBy === 'number_testcase' ? 'sorted' : ''}`}
                      onClick={() => handleSort('number_testcase')}
                    >
                      <span className="th-content">
                        <span className="th-text">Test Cases</span>
                        <span className="sort-arrows">
                          <span className={`arrow up ${sortBy === 'number_testcase' && order === 'asc' ? 'active' : ''}`}></span>
                          <span className={`arrow down ${sortBy === 'number_testcase' && order === 'desc' ? 'active' : ''}`}></span>
                        </span>
                      </span>
                    </th>
                    <th
                      className={`sortable ${sortBy === 'number_testsuite' ? 'sorted' : ''}`}
                      onClick={() => handleSort('number_testsuite')}
                    >
                      <span className="th-content">
                        <span className="th-text">Test Suites</span>
                        <span className="sort-arrows">
                          <span className={`arrow up ${sortBy === 'number_testsuite' && order === 'asc' ? 'active' : ''}`}></span>
                          <span className={`arrow down ${sortBy === 'number_testsuite' && order === 'desc' ? 'active' : ''}`}></span>
                        </span>
                      </span>
                    </th>
                    <th
                      className={`sortable ${sortBy === 'user_role' ? 'sorted' : ''}`}
                      onClick={() => handleSort('user_role' as any)}
                    >
                      <span className="th-content">
                        <span className="th-text">Role</span>
                        <span className="sort-arrows">
                          <span className={`arrow up ${sortBy === 'user_role' && order === 'asc' ? 'active' : ''}`}></span>
                          <span className={`arrow down ${sortBy === 'user_role' && order === 'desc' ? 'active' : ''}`}></span>
                        </span>
                      </span>
                    </th>
                    <th
                      className={`sortable ${sortBy === 'user_permissions' ? 'sorted' : ''}`}
                      onClick={() => handleSort('user_permissions' as any)}
                    >
                      <span className="th-content">
                        <span className="th-text">Permissions</span>
                        <span className="sort-arrows">
                          <span className={`arrow up ${sortBy === 'user_permissions' && order === 'asc' ? 'active' : ''}`}></span>
                          <span className={`arrow down ${sortBy === 'user_permissions' && order === 'desc' ? 'active' : ''}`}></span>
                        </span>
                      </span>
                    </th>
                    <th
                      className={`sortable ${sortBy === 'number_user' ? 'sorted' : ''}`}
                      onClick={() => handleSort('number_user')}
                    >
                      <span className="th-content">
                        <span className="th-text">Members</span>
                        <span className="sort-arrows">
                          <span className={`arrow up ${sortBy === 'number_user' && order === 'asc' ? 'active' : ''}`}></span>
                          <span className={`arrow down ${sortBy === 'number_user' && order === 'desc' ? 'active' : ''}`}></span>
                        </span>
                      </span>
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <tr 
                      key={project.project_id}
                      className={`clickable-row ${openDropdownId === project.project_id ? 'dropdown-open' : ''} ${openDropdownId ? 'has-open-dropdown' : ''}`}
                      onClick={(e) => {
                        // Don't navigate if clicking on actions container or dropdown
                        const target = e.target as Element;
                        const isClickingOnActions = target.closest('.actions-container') || target.closest('.actions-dropdown');
                        
                        // Don't navigate if any dropdown is open (to prevent accidental clicks)
                        if (!isClickingOnActions && !openDropdownId) {
                          handleProjectClick(project);
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className="project-name">
                        {project.name}
                      </td>
                      <td className="project-created-at">{project.created_at}</td>
                      <td className="project-test-cases">{project.number_testcase}</td>
                      <td className="project-test-suites">{project.number_testsuite}</td>
                      <td className="project-databases">{project.user_role}</td>
                      <td className="project-variables">{project.user_permissions}</td>
                      <td className="project-members">{project.number_member}</td>
                      <td className="project-actions">
                        <div className="actions-container">
                          <button 
                            className="actions-btn"
                            onClick={(e) => handleProjectActions(project.project_id, e)}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <circle cx="12" cy="12" r="1" fill="currentColor"/>
                              <circle cx="19" cy="12" r="1" fill="currentColor"/>
                              <circle cx="5" cy="12" r="1" fill="currentColor"/>
                            </svg>
                          </button>
                          
                          {openDropdownId === project.project_id && (
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
                                  handleShareProjectClick(project.project_id, e);
                                }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                }}
                                disabled={!project.user_permissions.includes('CAN_MANAGE')}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M18 8a3 3 0 1 0-2.83-4H15a3 3 0 0 0 0 6h.17A3 3 0 0 0 18 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  <path d="M6 14a3 3 0 1 0-2.83 4H3a3 3 0 0 0 0-6h.17A3 3 0 0 0 6 14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  <path d="M8 13l8-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  <path d="M8 19l8-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                Share
                              </button>
                              <button 
                                className="dropdown-item"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  handleEditProject(project.project_id, e);
                                }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                }}
                                disabled={!project.user_permissions.includes('CAN_EDIT') && !project.user_permissions.includes('CAN_MANAGE')}
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
                                  handleDeleteProjectClick(project.project_id, e);
                                }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                }}
                                disabled={!project.user_permissions.includes('CAN_MANAGE')}
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <div className="pagination-info">
                  Showing {startIndex + 1} to {endIndex} of {totalProjects} projects
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
          </section>
        </div>
      </main>

      {/* Create Project Modal */}
      <CreateProject
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        onSave={handleSaveProject}
      />

      {/* Edit Project Modal */}
      <EditProject
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        onSave={handleUpdateProject}
        project={selectedProject}
      />

      {/* Delete Project Modal */}
      <DeleteProject
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onDelete={handleDeleteProject}
        project={selectedProject}
      />

      <AddUser
        isOpen={isShareModalOpen}
        projectId={selectedProject?.project_id || null}
        onClose={handleCloseShareModal}
        onSuccess={reloadProjects}
      />

      {/* Key Management Modal */}
      <KeyManagementModal
        isOpen={isKeyModalOpen}
        onClose={handleCloseKeyModal}
        project={selectedProject}
      />
    </div>
  );
};

export default Dashboard;
