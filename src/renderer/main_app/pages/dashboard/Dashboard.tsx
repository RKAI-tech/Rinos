import React, { useState } from 'react';
import Header from '../../components/header/Header';
import Footer from '../../components/footer/Footer';
import './Dashboard.css';

interface Project {
  id: string;
  name: string;
  description: string;
  members: number;
  testCases: number;
  role: 'OWNER' | 'MEMBER' | 'VIEWER';
  status: 'IN PROGRESS' | 'COMPLETED' | 'DRAFT';
}

const Dashboard: React.FC = () => {
  // Mock data
  const [projects] = useState<Project[]>([
    {
      id: '1',
      name: 'plane_app',
      description: '',
      members: 1,
      testCases: 165,
      role: 'OWNER',
      status: 'IN PROGRESS'
    }
  ]);

  const [filterText, setFilterText] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [itemsPerPage, setItemsPerPage] = useState('5 per page');

  // Mock statistics
  const statistics = {
    totalProjects: 1,
    totalTestCases: 165,
    projectsInProgress: 1,
    roleDistribution: { owner: 1, member: 0, viewer: 0 }
  };

  const handleCreateProject = () => {
    console.log('Create project clicked');
    // TODO: Implement create project functionality
  };

  const handleProjectActions = (projectId: string) => {
    console.log('Project actions clicked for:', projectId);
    // TODO: Implement project actions menu
  };

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
                <div className="stat-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 7V5C3 3.89543 3.89543 3 5 3H19C20.1046 3 21 3.89543 21 5V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3 7V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M8 11H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M8 15H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <div className="stat-number">{statistics.totalProjects}</div>
                  <div className="stat-label">Total Projects</div>
                  <div className="stat-description">All projects currently managed</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <div className="stat-number">{statistics.totalTestCases}</div>
                  <div className="stat-label">Total Test Cases</div>
                  <div className="stat-description">All test cases across projects</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <div className="stat-number">{statistics.projectsInProgress}</div>
                  <div className="stat-label">Projects In Progress</div>
                  <div className="stat-description">Number of active projects</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <div className="stat-number">
                    {statistics.roleDistribution.owner} / {statistics.roleDistribution.member} / {statistics.roleDistribution.viewer}
                  </div>
                  <div className="stat-label">Role Distribution</div>
                  <div className="stat-description">Owner / Member / Viewer</div>
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
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="status-dropdown"
                >
                  <option value="All Status">All Status</option>
                  <option value="IN PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="DRAFT">Draft</option>
                </select>

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
                    <th>Project Name</th>
                    <th>Description</th>
                    <th>Members</th>
                    <th>Test Cases</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <tr key={project.id}>
                      <td className="project-name">{project.name}</td>
                      <td className="project-description">{project.description}</td>
                      <td className="project-members">{project.members}</td>
                      <td className="project-test-cases">{project.testCases}</td>
                      <td className="project-role">{project.role}</td>
                      <td className="project-status">
                        <span className={`status-badge ${project.status.toLowerCase().replace(' ', '-')}`}>
                          {project.status}
                        </span>
                      </td>
                      <td className="project-actions">
                        <button 
                          className="actions-btn"
                          onClick={() => handleProjectActions(project.id)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="1" fill="currentColor"/>
                            <circle cx="19" cy="12" r="1" fill="currentColor"/>
                            <circle cx="5" cy="12" r="1" fill="currentColor"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;
