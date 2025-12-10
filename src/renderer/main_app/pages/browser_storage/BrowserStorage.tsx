import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Header from '../../components/header/Header';
import Footer from '../../components/footer/Footer';
import Breadcrumb from '../../components/breadcumb/Breadcrumb';
import SidebarNavigator from '../../components/sidebar_navigator/SidebarNavigator';
import './BrowserStorage.css';
import { ProjectService } from '../../services/projects';
import { BrowserStorageService } from '../../services/browser_storage';
import { toast } from 'react-toastify';
import CreateBrowserStorageModal from '../../components/browser_storage/modals/CreateStorageModal';
import EditBrowserStorageModal from '../../components/browser_storage/modals/EditStorageModal';
import DeleteBrowserStorageModal from '../../components/browser_storage/modals/DeleteStorageModal';
import { BrowserStorageType } from '../../types/browser_storage';

interface CookieItem {
  id: string;
  name: string;
  description?: string;
  updated?: string;
  value?: any;
  type?: BrowserStorageType;
}

const BrowserStorage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { projectId } = useParams();
  const projectData = { projectId, projectName: (location.state as { projectName?: string } | null)?.projectName };
  const [resolvedProjectName, setResolvedProjectName] = useState<string>(projectData.projectName || 'Project');

  const [cookies, setCookies] = useState<CookieItem[]>([]);
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'description'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [itemsPerPage, setItemsPerPage] = useState('10 rows/page');
  const [currentPage, setCurrentPage] = useState(1);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingCookie, setDeletingCookie] = useState<{ id: string; name?: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newType, setNewType] = useState<BrowserStorageType>(BrowserStorageType.COOKIE);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingCookie, setEditingCookie] = useState<CookieItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editType, setEditType] = useState<BrowserStorageType>(BrowserStorageType.COOKIE);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedCookie, setSelectedCookie] = useState<CookieItem | null>(null);
  const [isReloading, setIsReloading] = useState(false);

  const reloadCookies = async () => {
    if (!projectId) return;
    try {
      setIsReloading(true);
      const svc = new BrowserStorageService();
      const resp = await svc.getBrowserStoragesByProject(projectId);
      if (resp.success && resp.data) {
        const items: CookieItem[] = resp.data.items.map((it) => ({
          id: it.browser_storage_id,
          name: it.name,
          description: it.description,
          updated: (it as any).updated_at || (it as any).created_at,
          value: it.value,
          type: (it as any).storage_type,
        }));
        setCookies(items);
      } else {
        setCookies([]);
      }
    } catch (e) {
      setCookies([]);
    } finally {
      setIsReloading(false);
    }
  };

  useEffect(() => {
    reloadCookies();
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

  useEffect(() => {
    if (!isCreateOpen) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCloseCreate();
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [isCreateOpen]);

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
    { id: 'testcases', label: 'Testcases', path: `/testcases/${projectId}`, isActive: false },
    { id: 'test-suites', label: 'Test Suites', path: `/test-suites/${projectId}`, isActive: false },
    { id: 'browser-storage', label: 'Browser Storage', path: `/browser-storage/${projectId}`, isActive: true },
    { id: 'databases', label: 'Databases', path: `/databases/${projectId}`, isActive: false },
    { id: 'queries', label: 'Queries', path: `/queries/${projectId}`, isActive: false },
    { id: 'variables', label: 'Variables', path: `/variables/${projectId}`, isActive: false },
    { id: 'change-log', label: 'Activities', path: `/change-log/${projectId}`, isActive: false },
  ];

  const breadcrumbItems = [
    { label: 'Projects', path: '/dashboard', isActive: false },
    { label: resolvedProjectName, path: `/browser-storage/${projectId}`, isActive: true },
  ];

  const filtered = cookies.filter((c) => {
    const q = searchText.toLowerCase();
    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q)
    );
  });

  const sorted = useMemo(() => {
    const copy = [...filtered];
    const getVal = (it: CookieItem): string => {
      switch (sortBy) {
        case 'name':
          return it.name || '';
        case 'description':
          return it.description || '';
        default:
          return '';
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

  const handleSort = (col: 'name' | 'description') => {
    if (sortBy === col) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else {
      setSortBy(col);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const getItemsPerPageNumber = () => parseInt(itemsPerPage.split(' ')[0]);
  const totalPages = Math.ceil(sorted.length / getItemsPerPageNumber() || 1);
  const startIndex = (currentPage - 1) * getItemsPerPageNumber();
  const endIndex = startIndex + getItemsPerPageNumber();
  const currentItems = sorted.slice(startIndex, endIndex);

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
  const handlePreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };
  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handleBreadcrumbNavigate = (path: string) => navigate(path);
  const handleSidebarNavigate = (path: string) => navigate(path);

  const handleBrowserStorageActions = (id: string) => {
    setOpenDropdownId(openDropdownId === id ? null : id);
  };

  const handleDeleteBrowserStorage = async (id: string) => {
    try {
      const svc = new BrowserStorageService();
      const resp = await svc.deleteBrowserStorage(id);
      if (resp.success) {
        toast.success('Browser storage deleted');
        if (projectId) {
          const list = await svc.getBrowserStoragesByProject(projectId);
          if (list.success && list.data) {
            const items: CookieItem[] = list.data.items.map((it) => ({
              id: it.browser_storage_id,
              name: it.name,
              description: it.description,
              updated: (it as any).updated_at || (it as any).created_at,
              type: (it as any).storage_type,
            }));
            setCookies(items);
          }
        }
      } else {
        toast.error(resp.error || 'Failed to delete browser storage. Please try again.');
      }
    } catch (e) {
      toast.error('Failed to delete browser storage. Please try again.');
    } finally {
      setOpenDropdownId(null);
    }
  };

  const openDeleteModal = (id: string, name?: string) => {
    setDeletingCookie({ id, name });
    setIsDeleteOpen(true);
    setOpenDropdownId(null);
  };

  const closeDeleteModal = () => {
    setIsDeleteOpen(false);
    setDeletingCookie(null);
  };

  const confirmDelete = async () => {
    if (!deletingCookie?.id) return;
    try {
      setIsDeleting(true);
      await handleDeleteBrowserStorage(deletingCookie.id);
      closeDeleteModal();
    } finally {
      setIsDeleting(false);
    }
  };

  const reloadList = async () => {
    if (!projectId) return;
    const svc = new BrowserStorageService();
    const list = await svc.getBrowserStoragesByProject(projectId);
    if (list.success && list.data) {
      const items: CookieItem[] = list.data.items.map((it) => ({
        id: it.browser_storage_id,
        name: it.name,
        description: it.description,
        updated: (it as any).updated_at || (it as any).created_at,
        value: it.value,
        type: (it as any).storage_type,
      }));
      setCookies(items);
    }
  };

  const resetCreateForm = () => {
    setNewName('');
    setNewDescription('');
    setNewValue('');
  };

  const handleOpenCreate = () => {
    setIsCreateOpen(true);
  };

  const handleCloseCreate = () => {
    setIsCreateOpen(false);
    resetCreateForm();
  };

  const openEditModal = (id: string) => {
    const cookie = cookies.find((c) => c.id === id) || null;
    setEditingCookie(cookie);
    setEditName(cookie?.name || '');
    setEditDescription(cookie?.description || '');
    setEditType(cookie?.type ?? BrowserStorageType.COOKIE);
    const raw = cookie?.value;
    let str = '';
    try {
      str = typeof raw === 'string' ? raw : raw != null ? JSON.stringify(raw, null, 2) : '';
    } catch { str = ''; }
    setEditValue(str);
    setIsEditOpen(true);
    setOpenDropdownId(null);
  };

  const handleCloseEdit = () => {
    setIsEditOpen(false);
    setEditingCookie(null);
    setEditName('');
    setEditDescription('');
    setEditValue('');
    setEditType(BrowserStorageType.COOKIE);
  };

  const handleSaveEdit = async () => {
    if (!editingCookie?.id) return;
    try {
      setIsUpdating(true);
      let parsed: any = editValue;
      const t = editValue.trim();
      if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) {
        try { parsed = JSON.parse(t); } catch { parsed = editValue; }
      }
      const svc = new BrowserStorageService();
      const resp = await svc.updateBrowserStorage(editingCookie.id, {
        name: editName.trim() || undefined,
        description: editDescription.trim() || undefined,
        value: parsed,
        storage_type: editType,
      });
      if (resp.success) {
        toast.success('Browser storage updated');
        handleCloseEdit();
        await reloadList();
      } else {
        toast.error(resp.error || 'Failed to update browser storage. Please try again.');
      }
    } catch (e) {
      toast.error('Failed to update browser storage. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveCreate = async () => {
    if (!projectId) {
      toast.error('Missing project ID');
      return;
    }
    if (!newName.trim()) {
      toast.error('Name is required');
      return;
    }
    try {
      setIsSaving(true);
      let parsedValue: any = newValue;
      const trimmed = newValue.trim();
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try { parsedValue = JSON.parse(trimmed); } catch { parsedValue = newValue; }
      }
      const svc = new BrowserStorageService();
      const resp = await svc.createBrowserStorage({ project_id: projectId, name: newName.trim(), description: newDescription.trim() || undefined, value: parsedValue, storage_type: newType });
      if (resp.success) {
        toast.success('Browser storage created');
        handleCloseCreate();
        await reloadList();
      } else {
        toast.error(resp.error || 'Failed to create browser storage. Please try again.');
      }
    } catch (e) {
      toast.error('Failed to create browser storage');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="cookies-page">
      <Header />
      <Breadcrumb items={breadcrumbItems} onNavigate={handleBreadcrumbNavigate} />

      <div className="cookies-layout">
        <SidebarNavigator
          items={sidebarItems}
          onNavigate={handleSidebarNavigate}
          projectId={projectId}
        />

        <main className="cookies-main">
          <div className="cookies-container">
            <div className="page-title" />

            <div className="cookies-controls">
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
                <button
                  className={`reload-btn ${isReloading ? 'is-loading' : ''}`}
                  onClick={reloadCookies}
                  disabled={isReloading}
                  title="Reload browser storage"
                  aria-label="Reload browser storage"
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
                  onChange={(e) => {
                    setItemsPerPage(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pagination-dropdown"
                >
                  <option value="10 rows/page">10 rows/page</option>
                  <option value="20 rows/page">20 rows/page</option>
                  <option value="30 rows/page">30 rows/page</option>
                </select>
                <button className="create-cookie-btn" onClick={handleOpenCreate}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Create Browser Storage
                </button>
              </div>
            </div>

            <div className="cookies-split">
              <div className="cookies-table-container cookies-list">
                <table className="cookies-table">
                  <thead>
                    <tr>
                      <th className={`sortable ${sortBy === 'name' ? 'sorted' : ''}`} onClick={() => handleSort('name')}>
                        <span className="th-content">
                          <span className="th-text">Name</span>
                          <span className="sort-arrows">
                            <span className={`arrow up ${sortBy === 'name' && sortOrder === 'asc' ? 'active' : ''}`}></span>
                            <span className={`arrow down ${sortBy === 'name' && sortOrder === 'desc' ? 'active' : ''}`}></span>
                          </span>
                        </span>
                      </th>
                      <th className={`sortable ${sortBy === 'description' ? 'sorted' : ''}`} onClick={() => handleSort('description')}>
                        <span className="th-content">
                          <span className="th-text">Description</span>
                          <span className="sort-arrows">
                            <span className={`arrow up ${sortBy === 'description' && sortOrder === 'asc' ? 'active' : ''}`}></span>
                            <span className={`arrow down ${sortBy === 'description' && sortOrder === 'desc' ? 'active' : ''}`}></span>
                          </span>
                        </span>
                      </th>
                      <th>
                        <span className="th-content">
                          <span className="th-text">Type</span>
                        </span>
                      </th>
                      <th>
                        <span className="th-content">
                          <span className="th-text">Updated</span>
                        </span>
                      </th>
                      <th>Options</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentItems.map((c) => (
                      <tr
                        key={c.id}
                        className={`${selectedCookie?.id === c.id ? 'row-selected' : ''} ${openDropdownId === c.id ? 'dropdown-open' : ''} ${openDropdownId ? 'has-open-dropdown' : ''}`}
                        onClick={(e) => {
                          // Don't select cookie if clicking on actions container or dropdown
                          const target = e.target as Element;
                          const isClickingOnActions = target.closest('.actions-container') || target.closest('.actions-dropdown');
                          
                          // Don't select if any dropdown is open (to prevent accidental clicks)
                          if (!isClickingOnActions && !openDropdownId) {
                            setSelectedCookie(selectedCookie?.id === c.id ? null : c);
                          }
                        }}
                      >
                        <td className="cookie-name">{c.name}</td>
                        <td className="cookie-description">{c.description || '-'}</td>
                        <td className="cookie-type">{(() => {
                          switch (c.type) {
                            case BrowserStorageType.COOKIE:
                              return 'Cookie';
                            case BrowserStorageType.LOCAL_STORAGE:
                              return 'Local Storage';
                            case BrowserStorageType.SESSION_STORAGE:
                              return 'Session Storage';
                            default:
                              return '-';
                          }
                        })()}</td>
                        <td className="cookie-updated">{c.updated || '-'}</td>
                        <td className="cookie-actions">
                          <div className="actions-container">
                            <button
                              className="actions-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleBrowserStorageActions(c.id);
                              }}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="1" fill="currentColor" />
                                <circle cx="19" cy="12" r="1" fill="currentColor" />
                                <circle cx="5" cy="12" r="1" fill="currentColor" />
                              </svg>
                            </button>

                            {openDropdownId === c.id && (
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
                                    openEditModal(c.id);
                                  }}
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                  }}
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                  Edit
                                </button>
                                <button 
                                  className="dropdown-item delete" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    openDeleteModal(c.id, c.name);
                                  }}
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                  }}
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <polyline points="3,6 5,6 21,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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

              <aside className="cookies-detail">
                {!selectedCookie ? (
                  <div className="cookies-detail-empty">
                    <div className="empty-title">No browser storage selected</div>
                    <div className="empty-subtitle">Select a browser storage to preview its value</div>
                  </div>
                ) : (
                  <div className="cookies-detail-card">
                    <div className="detail-header">
                      <div className="detail-title">{selectedCookie.name}</div>
                      <div className="detail-meta">{selectedCookie.updated || ''}</div>
                    </div>
                    <div className="detail-section-title">Value</div>
                    <pre className="detail-value value-fixed-scrollable" aria-readonly>
                      {(() => {
                        const raw = selectedCookie.value;
                        try {
                          if (raw == null) return '';
                          if (typeof raw === 'string') {
                            const t = raw.trim();
                            if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) {
                              try { return JSON.stringify(JSON.parse(t), null, 2); } catch { return raw; }
                            }
                            return raw;
                          }
                          return JSON.stringify(raw, null, 2);
                        } catch { return String(raw); }
                      })()}
                    </pre>
                  </div>
                )}
              </aside>
            </div>

            {Math.ceil(filtered.length / getItemsPerPageNumber()) > 1 && (
              <div className="pagination">
                <div className="pagination-info">
                  Showing {filtered.length === 0 ? 0 : startIndex + 1} to {Math.min(endIndex, filtered.length)} of {filtered.length} browser storages
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

      {/* Modals */}
      <CreateBrowserStorageModal
        isOpen={isCreateOpen}
        onClose={handleCloseCreate}
        onSave={handleSaveCreate}
        isSaving={isSaving}
        name={newName}
        description={newDescription}
        value={newValue}
        type={newType}
        setName={setNewName}
        setDescription={setNewDescription}
        setValue={setNewValue}
        setType={setNewType}
      />
      <EditBrowserStorageModal
        isOpen={isEditOpen}
        onClose={handleCloseEdit}
        onSave={handleSaveEdit}
        isSaving={isUpdating}
        name={editName}
        description={editDescription}
        value={editValue}
        type={editType}
        setName={setEditName}
        setDescription={setEditDescription}
        setValue={setEditValue}
        setType={setEditType}
      />
      <DeleteBrowserStorageModal
        isOpen={isDeleteOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
        isDeleting={isDeleting}
        cookieName={deletingCookie?.name}
      />
    </div>
  );
};

export default BrowserStorage;


