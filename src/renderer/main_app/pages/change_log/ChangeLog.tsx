import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Header from '../../components/header/Header';
import Footer from '../../components/footer/Footer';
import Breadcrumb from '../../components/breadcumb/Breadcrumb';
import SidebarNavigator from '../../components/sidebar_navigator/SidebarNavigator';
import './ChangeLog.css';
import { ProjectService } from '../../services/projects';
import { HistoryItemService } from '../../services/historyItem';
import { HistoryItem } from '../../types/historyItem';
import { canManage } from '../../hooks/useProjectPermissions';

const ChangeLog: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { projectId } = useParams();

  const projectData = { projectId, projectName: (location.state as { projectName?: string } | null)?.projectName };
  const [resolvedProjectName, setResolvedProjectName] = useState<string>(projectData.projectName || 'Project');
  const canManagePermission = canManage(projectId);

  const [histories, setHistories] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');
  const [entityFilter, setEntityFilter] = useState<'all' | 'testcase' | 'suite'>('all');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const historyItemService = new HistoryItemService();

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

  const loadHistories = async () => {
    if (!projectId) return;
    try {
      setIsLoading(true);
      setError(null);
      // Fetch a reasonable number and filter client-side by date
      const resp = await historyItemService.getProjectHistories({ project_id: projectId, limit: 1000, offset: 0 });
      // console.log('resp', resp);
      if (resp.success && resp.data) {
        setHistories(resp.data.items || []);
      } else {
        setError(resp.error || 'Failed to load histories');
        setHistories([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred');
      setHistories([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistories();
  }, [projectId]);

  const sidebarItems = [
    { id: 'testcases', label: 'Testcases', path: `/testcases/${projectId}`, isActive: false },
    { id: 'test-suites', label: 'Test Suites', path: `/test-suites/${projectId}`, isActive: false },
    { id: 'browser-storage', label: 'Browser Storage', path: `/browser-storage/${projectId}`, isActive: false },
    { id: 'databases', label: 'Databases', path: `/databases/${projectId}`, isActive: false },
    { id: 'queries', label: 'Queries', path: `/queries/${projectId}`, isActive: false },
    { id: 'variables', label: 'Variables', path: `/variables/${projectId}`, isActive: false },
    { id: 'change-log', label: 'Activities', path: `/change-log/${projectId}`, isActive: true },
  ];

  const breadcrumbItems = [
    { label: 'Projects', path: '/dashboard', isActive: false },
    { label: resolvedProjectName, path: `/change-log/${projectId}`, isActive: true },
  ];

  const handleSidebarNavigate = (path: string) => navigate(path);
  const handleBreadcrumbNavigate = (path: string) => navigate(path);

  const toggleExpanded = (historyId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(historyId)) {
      newExpanded.delete(historyId);
    } else {
      newExpanded.add(historyId);
    }
    setExpandedItems(newExpanded);
  };

  const toggleDateCollapsed = (date: string) => {
    const next = new Set(collapsedDates);
    if (next.has(date)) {
      next.delete(date);
    } else {
      next.add(date);
    }
    setCollapsedDates(next);
  };

  const formatDataObject = (data: any): string[] => {
    if (!data || typeof data !== 'object') return [];
    return Object.entries(data).map(([key, value]) => `${key}: ${value}`);
  };

  const filtered = useMemo(() => {
    const fromMs = fromDate ? new Date(fromDate).getTime() : null;
    const toMs = toDate ? new Date(toDate).getTime() : null;
    const q = searchText.trim().toLowerCase();
    const typeMatches = (et: string) => {
      const t = (et || '').toLowerCase();
      if (entityFilter === 'all') return true;
      if (entityFilter === 'testcase') return /test\s*[_-]?\s*case|testcase/.test(t);
      if (entityFilter === 'suite') return /suite/.test(t);
      return true;
    };
    return histories.filter(h => {
      const t = new Date(h.created_at).getTime();
      if (fromMs && t < fromMs) return false;
      if (toMs && t > toMs) return false;
      if (!typeMatches(h.entity_type)) return false;
      if (!q) return true;
      const hay = [
        h.user_id || '',
        h.action_type || '',
        h.entity_type || '',
        h.description || '',
      ].join(' ').toLowerCase();
      return hay.includes(q);
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [histories, fromDate, toDate, searchText, entityFilter]);

  const formatDateTime = (iso: string) => {
    try {
      const d = new Date(iso);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const mi = String(d.getMinutes()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd} · ${hh}:${mi}`;
    } catch {
      return iso;
    }
  };

  const formatDateOnly = (iso: string) => {
    try {
      const d = new Date(iso);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    } catch { return iso; }
  };

  const formatTimeOnly = (iso: string) => {
    try {
      const d = new Date(iso);
      const hh = String(d.getHours()).padStart(2, '0');
      const mi = String(d.getMinutes()).padStart(2, '0');
      return `${hh}:${mi}`;
    } catch { return iso; }
  };

  const handleClearAllTimeline = async () => {
    if (!projectId || !canManagePermission) return;
    try {
      setIsLoading(true);
      const resp = await historyItemService.deleteAllHistory(projectId);
      if (resp.success) {
        setHistories([]);
        setShowClearConfirm(false);
      } else {
        setError(resp.error || 'Failed to clear timeline');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred while clearing timeline');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteHistoryItem = async (historyId: string) => {
    if (!projectId || !canManagePermission) return;
    try {
      setIsLoading(true);
      const payload = {
        history_id: historyId,
        project_id: projectId
      };
      const resp = await historyItemService.deleteHistory(payload);
      // console.log('resp', resp);
      if (resp.success) {
        setHistories(prev => prev.filter(h => h.history_id !== historyId));
        setShowDeleteConfirm(null);
      } else {
        setError(resp.error || 'Failed to delete history item');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred while deleting history item');
    } finally {
      setIsLoading(false);
    }
  };

  const groupedByDate = useMemo(() => {
    const groups: { date: string; items: HistoryItem[] }[] = [];
    const map = new Map<string, HistoryItem[]>();
    filtered.forEach((h) => {
      const key = formatDateOnly(h.created_at);
      const arr = map.get(key) || [];
      arr.push(h);
      map.set(key, arr);
    });
    // sort dates desc
    const dates = Array.from(map.keys()).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    dates.forEach((dKey) => {
      const items = (map.get(dKey) || []).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      groups.push({ date: dKey, items });
    });
    return groups;
  }, [filtered]);

  return (
    <div className="changelog-page">
      <Header />
      <Breadcrumb items={breadcrumbItems} onNavigate={handleBreadcrumbNavigate} />

      <div className="changelog-layout">
        <SidebarNavigator
          items={sidebarItems}
          onNavigate={handleSidebarNavigate}
          projectId={projectData?.projectId}
        />

        <main className="changelog-main">
          <div className="changelog-container">
            <div className="page-title" />

            <div className="changelog-controls">
              <div className="changelog-toolbar">
                <div className="toolbar-row toolbar-top">
                  <div className="date-range">
                    <div className="filter-label" style={{ fontSize: '14px', fontWeight: 'bold' }}>From</div>
                    <input
                      className="input control from"
                      type="datetime-local"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      aria-label="From date"
                    />
                    <span className="range-sep">–</span>
                    <div className="filter-label" style={{ fontSize: '14px', fontWeight: 'bold' }}>To</div>
                    <input
                      className="input control to"
                      type="datetime-local"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      aria-label="To date"
                    />
                  </div>
                  <div className="type-filter">
                    <div className="filter-label" style={{ fontSize: '14px', fontWeight: 'bold' }}>Type</div>
                    <select
                      className="input"
                      value={entityFilter}
                      onChange={(e) => setEntityFilter(e.target.value as 'all' | 'testcase' | 'suite')}
                      aria-label="Filter by entity type"
                      title="Filter by type"
                    >
                      <option value="all">All</option>
                      <option value="testcase">Test case</option>
                      <option value="suite">Suite</option>
                    </select>
                  </div>
                </div>

                <div className="toolbar-row toolbar-bottom">
                  <div className="date-search">
                  <div className="filter-label" style={{ fontSize: '14px', fontWeight: 'bold' }}>Search</div>
                  <div className="searchbox">
                    <span className="search-icon" aria-hidden>🔎</span>
                    <input
                      className="input search"
                      type="text"
                      placeholder="Search member, action, description"
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      aria-label="Search change logs"
                    />
                  </div>
                  </div>
                  <div className="actions-group">
                    <button
                      className="btn ghost"
                      onClick={() => setShowClearConfirm(true)}
                      title="Clear all timeline"
                      disabled={isLoading || histories.length === 0 || !canManagePermission}
                    >
                      Clear All
                    </button>
                    <button
                      className={`reload-btn ${isLoading ? 'is-loading' : ''}`}
                      onClick={() => loadHistories()}
                      disabled={isLoading}
                      title="Reload activities"
                      aria-label="Reload activities"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 11a8.1 8.1 0 0 0-15.5-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M4 5v4h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M4 13a8.1 8.1 0 0 0 15.5 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M20 19v-4h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline Content */}
            <div className="timeline-container">
              {isLoading ? (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <span>Loading change logs...</span>
                </div>
              ) : error ? (
                <div className="error-state">
                  <span className="error-icon">⚠️</span>
                  <span>{error}</span>
                </div>
              ) : groupedByDate.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">📝</span>
                  <span>No change logs found</span>
                </div>
              ) : (
                <div className="timeline">
                  {groupedByDate.map((group) => (
                    <div key={group.date} className="timeline-day-group">
                      <div className="timeline-day-header">
                        <button
                          className="timeline-day-toggle"
                          onClick={() => toggleDateCollapsed(group.date)}
                          aria-label={`Toggle ${group.date}`}
                        >
                          <span className={`chevron ${collapsedDates.has(group.date) ? 'collapsed' : ''}`}>▾</span>
                        </button>
                        <div className="timeline-day-date">{group.date}</div>
                        <div className="timeline-day-line"></div>
                      </div>
                      
                      {!collapsedDates.has(group.date) && (
                        <div className="timeline-items">
                          {group.items.map((item) => (
                            <div key={item.history_id} className="timeline-item">
                              <div className="timeline-item-time">
                                {formatTimeOnly(item.created_at)}
                              </div>
                              <div className="timeline-item-content">
                                <div 
                                  className={`timeline-item-header ${(item.old_data || item.new_data) ? 'clickable' : ''}`}
                                  onClick={(item.old_data || item.new_data) ? () => toggleExpanded(item.history_id) : undefined}
                                  style={{ cursor: (item.old_data || item.new_data) ? 'pointer' : 'default' }}
                                >
                                  <div className="timeline-item-main">
                                    <div className="timeline-item-content-text">
                                      {item.entity_name && (
                                        <span className="timeline-item-description">
                                          {item.entity_name}
                                        </span>
                                      )}
                                      <span className="timeline-item-was"> was </span>
                                      <span className="timeline-item-action">
                                        {item.action_type}
                                      </span>
                                      <span className="timeline-item-by"> by </span>
                                      <span className="timeline-item-user">
                                        {item.user_name || item.user_id}
                                      </span>
                                    </div>
                                  </div>
                                  <button
                                    className="timeline-item-delete"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!canManagePermission) return;
                                      setShowDeleteConfirm(item.history_id);
                                    }}
                                    title="Delete this history item"
                                    disabled={isLoading || !canManagePermission}
                                  >
                                    ✕
                                  </button>
                                </div>
                                
                                {expandedItems.has(item.history_id) && (item.old_data || item.new_data) && (
                                  <div className="timeline-item-details">
                                    <div className="data-comparison">
                                      {item.old_data && (
                                        <div className="data-section old-data">
                                          <div className="data-section-header">Old Data</div>
                                          <div className="data-section-content">
                                            {Object.entries(item.old_data).map(([key, value]) => (
                                              <div key={key} className="data-entry">
                                                <span className="data-key">{key}:</span>
                                                <span className="data-value">{String(value).replace(/\\n/g, '\n')}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      {item.new_data && (
                                        <div className="data-section new-data">
                                          <div className="data-section-header">New Data</div>
                                          <div className="data-section-content">
                                            {Object.entries(item.new_data).map(([key, value]) => (
                                              <div key={key} className="data-entry">
                                                <span className="data-key">{key}:</span>
                                                <span className="data-value">{String(value)}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Clear All Confirmation Dialog */}
      {showClearConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Clear All Timeline</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete all timeline entries? This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button
                className="btn ghost"
                onClick={() => setShowClearConfirm(false)}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                className="btn danger"
                onClick={handleClearAllTimeline}
                disabled={isLoading || !canManagePermission}
              >
                {isLoading ? 'Deleting...' : 'Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Single Item Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Delete History Item</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this history item? This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button
                className="btn ghost"
                onClick={() => setShowDeleteConfirm(null)}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                className="btn danger"
                onClick={() => handleDeleteHistoryItem(showDeleteConfirm)}
                disabled={isLoading || !canManagePermission}
              >
                {isLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default ChangeLog;


