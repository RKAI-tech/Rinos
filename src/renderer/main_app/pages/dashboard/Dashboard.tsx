import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/header/Header';
import Footer from '../../components/footer/Footer';
import CreateProject from '../../components/project/create_project/CreateProject';
import EditProject from '../../components/project/edit_project/EditProject';
import DeleteProject from '../../components/project/delete_project/DeleteProject';
import { ProjectService } from '../../services/projects';
import { Project } from '../../types/projects';
import { toast } from 'react-toastify';
import './Dashboard.css';

// Using Project interface from types/projects.ts

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  
  // State for projects data from API
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterText, setFilterText] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'number_testcase' | 'number_testsuite' | 'number_database_connection' | 'number_variable' | 'number_member'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [itemsPerPage, setItemsPerPage] = useState('5 per page');
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Initialize ProjectService
  const projectService = new ProjectService();

  // Helper function to reload projects
  const reloadProjects = async () => {
    try {
      const response = await projectService.getProjects();
      if (response.success && response.data) {
        console.log('Reloaded projects:', response.data.projects);
        setProjects(response.data.projects);
      }
    } catch (err) {
      console.error('Error reloading projects:', err);
    }
  };

  // Load projects from API on component mount
  useEffect(() => {
    const loadProjects = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await projectService.getProjects();
        
        if (response.success && response.data) {
          console.log('Loaded projects from API:', response.data.projects);
          setProjects(response.data.projects);
        } else {
          setError(response.error || 'Failed to load projects');
          toast.error('Failed to load projects');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
        toast.error('Failed to load projects');
        console.error('Error loading projects:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadProjects();
  }, []);

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

  // Statistics calculated from API data using useMemo for performance
  const statistics = useMemo(() => {
    console.log('Calculating statistics for projects:', projects);
    return {
      totalProjects: projects.length,
      totalTestCases: projects.reduce((sum, project) => sum + (project.number_testcase || 0), 0),
      totalTestSuites: projects.reduce((sum, project) => sum + (project.number_testsuite || 0), 0),
      totalVariables: projects.reduce((sum, project) => sum + (project.number_variable || 0), 0)
    };
  }, [projects]);

  const handleCreateProject = () => {
    setIsCreateModalOpen(true);
  };

  const handleProjectClick = (project: Project) => {
    // Navigate to testcases page with project context
    navigate(`/testcases/${project.project_id}`, { 
      state: { 
        projectName: project.name 
      } 
    });
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  const handleSaveProject = async (projectData: { name: string; description: string }) => {
    try {
      const response = await projectService.createProject({
        name: projectData.name,
        description: projectData.description
      });

      if (response.success && response.data) {
        toast.success('Project created successfully!');
        setIsCreateModalOpen(false);
        
        // Debug log to check the response data
        console.log('Created project response:', response.data);
        
        // Reload projects to ensure data consistency
        await reloadProjects();
      } else {
        toast.error(response.error || 'Failed to create project');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      toast.error('Failed to create project');
      console.error('Error creating project:', err);
    }
  };

  const handleProjectActions = (projectId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent row click when clicking actions button
    setOpenDropdownId(openDropdownId === projectId ? null : projectId);
  };

  const handleEditProject = (projectId: string) => {
    const project = projects.find(p => p.project_id === projectId);
    if (project) {
      setSelectedProject(project);
      setIsEditModalOpen(true);
      setOpenDropdownId(null);
    }
  };

  const handleDeleteProjectClick = (projectId: string) => {
    const project = projects.find(p => p.project_id === projectId);
    if (project) {
      setSelectedProject(project);
      setIsDeleteModalOpen(true);
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
        toast.error(response.error || 'Failed to update project');
      }
    } catch (err) {
      toast.error('Failed to update project');
      console.error('Error updating project:', err);
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
        toast.error(response.error || 'Failed to delete project');
      }
    } catch (err) {
      toast.error('Failed to delete project');
      console.error('Error deleting project:', err);
    }
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedProject(null);
  };

  const handleOpenDeleteModal = (projectId: string) => {
    const project = projects.find(p => p.project_id === projectId);
    if (project) {
      setSelectedProject(project);
      setIsDeleteModalOpen(true);
    }
  };

  // Sort projects before pagination
  const sortedProjects = useMemo(() => {
    const projectsCopy = [...projects];

    const getComparableValue = (project: Project): string | number => {
      switch (sortBy) {
        case 'name':
          return project.name || '';
        case 'created_at': {
          const time = project.created_at ? new Date(project.created_at).getTime() : 0;
          return isNaN(time) ? 0 : time;
        }
        case 'number_testcase':
          return project.number_testcase ?? 0;
        case 'number_testsuite':
          return project.number_testsuite ?? 0;
        case 'number_database_connection':
          return project.number_database_connection ?? 0;
        case 'number_variable':
          return project.number_variable ?? 0;
        case 'number_member':
          return project.number_member ?? 0;
        default:
          return 0;
      }
    };

    projectsCopy.sort((a, b) => {
      const aVal = getComparableValue(a);
      const bVal = getComparableValue(b);

      let comparison = 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal, undefined, { sensitivity: 'base' });
      } else {
        const aNum = typeof aVal === 'number' ? aVal : 0;
        const bNum = typeof bVal === 'number' ? bVal : 0;
        comparison = aNum === bNum ? 0 : aNum < bNum ? -1 : 1;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return projectsCopy;
  }, [projects, sortBy, sortOrder]);

  const handleSort = (
    column: 'name' | 'created_at' | 'number_testcase' | 'number_testsuite' | 'number_database_connection' | 'number_variable' | 'number_member'
  ) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  // Pagination logic
  const getItemsPerPageNumber = () => {
    return parseInt(itemsPerPage.split(' ')[0]);
  };

  const totalPages = Math.ceil(sortedProjects.length / getItemsPerPageNumber());
  const startIndex = (currentPage - 1) * getItemsPerPageNumber();
  const endIndex = startIndex + getItemsPerPageNumber();
  const currentProjects = sortedProjects.slice(startIndex, endIndex);

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

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

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
        <Footer />
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
        <Footer />
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
                  placeholder="Filter by project name or description..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="filter-input"
                />
              </div>

              <div className="controls-section">
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(e.target.value)}
                  className="pagination-dropdown"
                >
                  <option value="5 per page">5 per page</option>
                  <option value="10 per page">10 per page</option>
                  <option value="20 per page">20 per page</option>
                  <option value="50 per page">50 per page</option>
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
                          <span className={`arrow up ${sortBy === 'name' && sortOrder === 'asc' ? 'active' : ''}`}></span>
                          <span className={`arrow down ${sortBy === 'name' && sortOrder === 'desc' ? 'active' : ''}`}></span>
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
                          <span className={`arrow up ${sortBy === 'created_at' && sortOrder === 'asc' ? 'active' : ''}`}></span>
                          <span className={`arrow down ${sortBy === 'created_at' && sortOrder === 'desc' ? 'active' : ''}`}></span>
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
                          <span className={`arrow up ${sortBy === 'number_testcase' && sortOrder === 'asc' ? 'active' : ''}`}></span>
                          <span className={`arrow down ${sortBy === 'number_testcase' && sortOrder === 'desc' ? 'active' : ''}`}></span>
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
                          <span className={`arrow up ${sortBy === 'number_testsuite' && sortOrder === 'asc' ? 'active' : ''}`}></span>
                          <span className={`arrow down ${sortBy === 'number_testsuite' && sortOrder === 'desc' ? 'active' : ''}`}></span>
                        </span>
                      </span>
                    </th>
                    <th
                      className={`sortable ${sortBy === 'number_database_connection' ? 'sorted' : ''}`}
                      onClick={() => handleSort('number_database_connection')}
                    >
                      <span className="th-content">
                        <span className="th-text">Databases</span>
                        <span className="sort-arrows">
                          <span className={`arrow up ${sortBy === 'number_database_connection' && sortOrder === 'asc' ? 'active' : ''}`}></span>
                          <span className={`arrow down ${sortBy === 'number_database_connection' && sortOrder === 'desc' ? 'active' : ''}`}></span>
                        </span>
                      </span>
                    </th>
                    <th
                      className={`sortable ${sortBy === 'number_variable' ? 'sorted' : ''}`}
                      onClick={() => handleSort('number_variable')}
                    >
                      <span className="th-content">
                        <span className="th-text">Variables</span>
                        <span className="sort-arrows">
                          <span className={`arrow up ${sortBy === 'number_variable' && sortOrder === 'asc' ? 'active' : ''}`}></span>
                          <span className={`arrow down ${sortBy === 'number_variable' && sortOrder === 'desc' ? 'active' : ''}`}></span>
                        </span>
                      </span>
                    </th>
                    <th
                      className={`sortable ${sortBy === 'number_member' ? 'sorted' : ''}`}
                      onClick={() => handleSort('number_member')}
                    >
                      <span className="th-content">
                        <span className="th-text">Members</span>
                        <span className="sort-arrows">
                          <span className={`arrow up ${sortBy === 'number_member' && sortOrder === 'asc' ? 'active' : ''}`}></span>
                          <span className={`arrow down ${sortBy === 'number_member' && sortOrder === 'desc' ? 'active' : ''}`}></span>
                        </span>
                      </span>
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentProjects.map((project) => (
                    <tr 
                      key={project.project_id}
                      className="clickable-row"
                      onClick={() => handleProjectClick(project)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className="project-name">
                        {project.name}
                      </td>
                      <td className="project-created-at">{project.created_at}</td>
                      <td className="project-test-cases">{project.number_testcase}</td>
                      <td className="project-test-suites">{project.number_testsuite}</td>
                      <td className="project-databases">{project.number_database_connection}</td>
                      <td className="project-variables">{project.number_variable}</td>
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
                            <div className="actions-dropdown">
                              <button 
                                className="dropdown-item"
                                onClick={() => handleEditProject(project.project_id)}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                Edit
                              </button>
                              <button 
                                className="dropdown-item delete"
                                onClick={() => handleDeleteProjectClick(project.project_id)}
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
                  Showing {startIndex + 1} to {Math.min(endIndex, projects.length)} of {projects.length} projects
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

      <Footer />

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
    </div>
  );
};

export default Dashboard;
