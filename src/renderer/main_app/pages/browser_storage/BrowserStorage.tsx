import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Header from '../../components/header/Header';
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

// Validation types
type ValidValueType = string | number | boolean | null | ValidValueType[] | { [key: string]: ValidValueType };

interface CookieDict {
  name?: string;
  value?: string;
  domain?: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
  partitionKey?: string;
  [key: string]: ValidValueType | undefined;
}

// Normalization functions
const normalizeCookieDict = (cookie: any): any => {
  if (typeof cookie !== 'object' || cookie === null || Array.isArray(cookie)) {
    return cookie;
  }
  
  const normalized = { ...cookie };
  
  // Normalize sameSite: lowercase and convert to proper case
  if (normalized.sameSite !== undefined && typeof normalized.sameSite === 'string') {
    const lowerSameSite = normalized.sameSite.toLowerCase();
    switch (lowerSameSite) {
      case 'lax':
        normalized.sameSite = 'Lax';
        break;
      case 'strict':
        normalized.sameSite = 'Strict';
        break;
      case 'none':
        normalized.sameSite = 'None';
        normalized.secure = true;
        break;
      default:
        normalized.sameSite = 'None';
        normalized.secure = true;
        break;
    }
  }
  
  // Normalize boolean fields: httpOnly and secure
  const booleanFields = ['httpOnly', 'secure'];
  for (const field of booleanFields) {
    if (normalized[field] !== undefined && typeof normalized[field] === 'string') {
      const lowerValue = normalized[field].toLowerCase();
      if (lowerValue === 'true') {
        normalized[field] = true;
      } else if (lowerValue === 'false') {
        normalized[field] = false;
      }
    }
  }
  
  return normalized;
};

// Validation functions
const validateValueType = (value: any): value is ValidValueType => {
  if (value === null) return true;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return true;
  if (Array.isArray(value)) {
    return value.every(item => validateValueType(item));
  }
  if (typeof value === 'object') {
    return Object.values(value).every(v => validateValueType(v));
  }
  return false;
};

const validateCookieDict = (cookie: any, index?: number): { valid: boolean; error?: string } => {
  if (typeof cookie !== 'object' || cookie === null || Array.isArray(cookie)) {
    return { valid: false, error: `Cookie${index !== undefined ? ` at index ${index}` : ''} must be an object` };
  }
  
  // Validate specific cookie fields if present
  if (cookie.name !== undefined && typeof cookie.name !== 'string') {
    return { valid: false, error: `Cookie${index !== undefined ? ` at index ${index}` : ''}: field "name" must be a string` };
  }
  if (cookie.value !== undefined && typeof cookie.value !== 'string') {
    return { valid: false, error: `Cookie${index !== undefined ? ` at index ${index}` : ''}: field "value" must be a string` };
  }
  if (cookie.domain !== undefined && typeof cookie.domain !== 'string') {
    return { valid: false, error: `Cookie${index !== undefined ? ` at index ${index}` : ''}: field "domain" must be a string` };
  }
  if (cookie.path !== undefined && typeof cookie.path !== 'string') {
    return { valid: false, error: `Cookie${index !== undefined ? ` at index ${index}` : ''}: field "path" must be a string` };
  }
  if (cookie.expires !== undefined && typeof cookie.expires !== 'number') {
    return { valid: false, error: `Cookie${index !== undefined ? ` at index ${index}` : ''}: field "expires" must be a number (Unix time in seconds)` };
  }
  if (cookie.httpOnly !== undefined && typeof cookie.httpOnly !== 'boolean') {
    return { valid: false, error: `Cookie${index !== undefined ? ` at index ${index}` : ''}: field "httpOnly" must be a boolean` };
  }
  if (cookie.secure !== undefined && typeof cookie.secure !== 'boolean') {
    return { valid: false, error: `Cookie${index !== undefined ? ` at index ${index}` : ''}: field "secure" must be a boolean` };
  }
  if (cookie.sameSite !== undefined && !["Strict", "Lax", "None"].includes(cookie.sameSite)) {
    return { valid: false, error: `Cookie${index !== undefined ? ` at index ${index}` : ''}: field "sameSite" must be one of "Strict", "Lax", or "None"` };
  }
  if (cookie.partitionKey !== undefined && typeof cookie.partitionKey !== 'string') {
    return { valid: false, error: `Cookie${index !== undefined ? ` at index ${index}` : ''}: field "partitionKey" must be a string` };
  }
  
  // Validate all values (including arbitrary keys)
  for (const key in cookie) {
    if (!validateValueType(cookie[key])) {
      return { valid: false, error: `Cookie${index !== undefined ? ` at index ${index}` : ''}: field "${key}" has invalid type. Values must be string, number, boolean, null, array, or object` };
    }
  }
  
  return { valid: true };
};

const validateCookieValue = (value: any, normalize: boolean = true): { valid: boolean; error?: string; normalizedValue?: any } => {
  if (!Array.isArray(value)) {
    return { valid: false, error: 'Cookie value must be an array of objects' };
  }
  
  const normalizedArray = normalize ? [...value] : value;
  
  for (let i = 0; i < normalizedArray.length; i++) {
    // Normalize cookie dict first
    if (normalize) {
      normalizedArray[i] = normalizeCookieDict(normalizedArray[i]);
    }
    
    const cookie = normalizedArray[i];
    const validation = validateCookieDict(cookie, i);
    if (!validation.valid) {
      return validation;
    }
  }
  
  return { valid: true, normalizedValue: normalize ? normalizedArray : undefined };
};

const validateStorageValue = (value: any): { valid: boolean; error?: string } => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { valid: false, error: 'Local/Session storage value must be an object (dictionary)' };
  }
  
  // Validate all keys are strings
  for (const key in value) {
    if (typeof key !== 'string') {
      return { valid: false, error: 'All keys must be strings' };
    }
    if (!validateValueType(value[key])) {
      return { valid: false, error: `Value for key "${key}" has invalid type. Values must be string, number, boolean, null, array, or object.` };
    }
  }
  
  return { valid: true };
};

const validateBrowserStorageValue = (value: any, type: BrowserStorageType, normalize: boolean = true): { valid: boolean; error?: string; normalizedValue?: any } => {
  if (type === BrowserStorageType.COOKIE) {
    return validateCookieValue(value, normalize);
  } else if (type === BrowserStorageType.LOCAL_STORAGE || type === BrowserStorageType.SESSION_STORAGE) {
    return validateStorageValue(value);
  }
  return { valid: false, error: 'Unknown storage type' };
};

const BrowserStorage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { projectId } = useParams();
  const projectData = { projectId, projectName: (location.state as { projectName?: string } | null)?.projectName };
  const [resolvedProjectName, setResolvedProjectName] = useState<string>(projectData.projectName || 'Project');

  const [cookies, setCookies] = useState<CookieItem[]>([]);
  
  // Search, pagination, and sort state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [storageTypeFilter, setStorageTypeFilter] = useState<string>('All Types');
  const [sortBy, setSortBy] = useState<string | null>('name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  
  // Pagination info from API
  const [totalBrowserStorages, setTotalBrowserStorages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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
  const [valueError, setValueError] = useState<string>('');
  const [editValueError, setEditValueError] = useState<string>('');

  // Service - use useMemo to avoid recreating on every render
  const browserStorageService = useMemo(() => new BrowserStorageService(), []);
  const projectService = useMemo(() => new ProjectService(), []);

  // Load browser storages with search/pagination/sort
  useEffect(() => {
    if (!projectId) return;

    const loadBrowserStorages = async () => {
    try {
      setIsReloading(true);
        
        // Map storage type filter to API format
        let storageTypeValue: string | null = null;
        if (storageTypeFilter !== 'All Types') {
          const typeMap: Record<string, string> = {
            'cookie': 'cookie',
            'localstorage': 'localStorage',
            'sessionstorage': 'sessionStorage'
          };
          storageTypeValue = typeMap[storageTypeFilter.toLowerCase()] || storageTypeFilter;
        }

        const request = {
          project_id: projectId,
          page: page,
          page_size: pageSize,
          q: search || null,
          storage_type: storageTypeValue,
          sort_by: sortBy || null,
          order: order || 'asc'
        };

        const response = await browserStorageService.searchBrowserStorages(request);
        
        if (response.success && response.data) {
          const items: CookieItem[] = response.data.browser_storages.map((it) => ({
          id: it.browser_storage_id,
          name: it.name,
          description: it.description,
            updated: it.updated_at || (it as any).created_at,
          value: it.value,
            type: it.storage_type,
        }));
        setCookies(items);
          setTotalBrowserStorages(response.data.number_browser_storage);
          setCurrentPage(response.data.current_page);
          setTotalPages(response.data.total_pages);
          // Only sync page if it's different to avoid infinite loop
          if (response.data.current_page !== page) {
            setPage(response.data.current_page);
          }
      } else {
        setCookies([]);
          setTotalBrowserStorages(0);
          setCurrentPage(1);
          setTotalPages(1);
          setPage(1);
      }
    } catch (e) {
      setCookies([]);
        setTotalBrowserStorages(0);
        setCurrentPage(1);
        setTotalPages(1);
        setPage(1);
    } finally {
      setIsReloading(false);
    }
  };

    loadBrowserStorages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search, storageTypeFilter, sortBy, order, projectId, browserStorageService]);

  // Helper: reload browser storages (for manual refresh and after operations)
  const reloadCookies = useCallback(async () => {
    if (!projectId) return;
    try {
      setIsReloading(true);
      
      // Map storage type filter to API format
      let storageTypeValue: string | null = null;
      if (storageTypeFilter !== 'All Types') {
        const typeMap: Record<string, string> = {
          'cookie': 'cookie',
          'localstorage': 'localStorage',
          'sessionstorage': 'sessionStorage'
        };
        storageTypeValue = typeMap[storageTypeFilter.toLowerCase()] || storageTypeFilter;
      }

      const request = {
        project_id: projectId,
        page: page,
        page_size: pageSize,
        q: search || null,
        storage_type: storageTypeValue,
        sort_by: sortBy || null,
        order: order || 'asc'
      };

      const response = await browserStorageService.searchBrowserStorages(request);
      
      if (response.success && response.data) {
        const items: CookieItem[] = response.data.browser_storages.map((it) => ({
          id: it.browser_storage_id,
          name: it.name,
          description: it.description,
          updated: it.updated_at || (it as any).created_at,
          value: it.value,
          type: it.storage_type,
        }));
        setCookies(items);
        setTotalBrowserStorages(response.data.number_browser_storage);
        setCurrentPage(response.data.current_page);
        setTotalPages(response.data.total_pages);
        // Only sync page if it's different to avoid infinite loop
        if (response.data.current_page !== page) {
          setPage(response.data.current_page);
        }
      } else {
        setCookies([]);
      }
    } catch (e) {
      setCookies([]);
    } finally {
      setIsReloading(false);
    }
  }, [projectId, page, pageSize, search, storageTypeFilter, sortBy, order, browserStorageService]);

  useEffect(() => {
    const loadProjectName = async () => {
      if (!projectId) return;
      if (projectData.projectName) {
        setResolvedProjectName(projectData.projectName);
        return;
      }
      const resp = await projectService.getProjectById(projectId);
      if (resp.success && resp.data) {
        setResolvedProjectName((resp.data as any).name || 'Project');
      }
    };
    loadProjectName();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    { id: 'suites-manager', label: 'Test Manager', path: `/suites-manager/${projectId}`, isActive: false },
    { id: 'testcases', label: 'Testcases', path: `/testcases/${projectId}`, isActive: false },
    // Temporarily disabled Test Suites navigation
    // { id: 'test-suites', label: 'Test Suites', path: `/test-suites/${projectId}`, isActive: false },
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

  // No need for client-side filtering/sorting - API handles it
  const currentItems = cookies;

  // Handle sort - reset page to 1 when sort changes
  const handleSort = (col: 'name' | 'description' | 'updated_at' | 'storage_type') => {
    if (sortBy === col) {
      // Toggle order if same column
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to asc
      setSortBy(col);
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

  // Handle storage type filter - reset page to 1
  const handleStorageTypeFilterChange = (value: string) => {
    setStorageTypeFilter(value);
    setPage(1); // Reset page when filter changes
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

  // Calculate display range
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalBrowserStorages);

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


  const handleBreadcrumbNavigate = (path: string) => navigate(path);
  const handleSidebarNavigate = (path: string) => navigate(path);

  const handleBrowserStorageActions = (id: string) => {
    setOpenDropdownId(openDropdownId === id ? null : id);
  };

  const handleDeleteBrowserStorage = async (id: string) => {
    try {
      const resp = await browserStorageService.deleteBrowserStorage(id);
      if (resp.success) {
        toast.success('Browser storage deleted');
        await reloadCookies();
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
    await reloadCookies();
  };

  const resetCreateForm = () => {
    setNewName('');
    setNewDescription('');
    setNewValue('');
    setValueError('');
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
    setEditValueError('');
  };

  const handleSaveEdit = async () => {
    if (!editingCookie?.id) return;
    try {
      setIsUpdating(true);
      setEditValueError('');
      
      let parsed: any = editValue;
      const t = editValue.trim();
      if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) {
        try { 
          parsed = JSON.parse(t); 
        } catch (e) {
          setEditValueError('Invalid JSON format. Please check your value syntax.');
          return;
        }
      } else {
        setEditValueError('Value must be a valid JSON object or array');
        return;
      }
      
      // Validate and normalize the parsed value based on storage type
      const validation = validateBrowserStorageValue(parsed, editType, true);
      if (!validation.valid) {
        setEditValueError(validation.error || 'Invalid value format');
        return;
      }
      
      // Use normalized value if available
      const finalValue = validation.normalizedValue !== undefined ? validation.normalizedValue : parsed;
      
      const resp = await browserStorageService.updateBrowserStorage(editingCookie.id, {
        name: editName.trim() || undefined,
        description: editDescription.trim() || undefined,
        value: finalValue,
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
      setValueError('');
      
      let parsedValue: any = newValue;
      const trimmed = newValue.trim();
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try { 
          parsedValue = JSON.parse(trimmed); 
        } catch (e) {
          setValueError('Invalid JSON format. Please check your value syntax.');
          return;
        }
      } else {
        setValueError('Value must be a valid JSON object or array');
        return;
      }
      
      // Validate and normalize the parsed value based on storage type
      const validation = validateBrowserStorageValue(parsedValue, newType, true);
      if (!validation.valid) {
        setValueError(validation.error || 'Invalid value format');
        return;
      }
      
      // Use normalized value if available
      const finalValue = validation.normalizedValue !== undefined ? validation.normalizedValue : parsedValue;
      
      const resp = await browserStorageService.createBrowserStorage({ project_id: projectId, name: newName.trim(), description: newDescription.trim() || undefined, value: finalValue, storage_type: newType });
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
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="search-input"
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
                <select
                  value={storageTypeFilter}
                  onChange={(e) => handleStorageTypeFilterChange(e.target.value)}
                  className="status-dropdown"
                >
                  <option value="All Types">All Types</option>
                  <option value="cookie">Cookie</option>
                  <option value="localStorage">Local Storage</option>
                  <option value="sessionStorage">Session Storage</option>
                </select>
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
                  value={`${pageSize} rows/page`}
                  onChange={(e) => handlePageSizeChange(e.target.value)}
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
                            <span className={`arrow up ${sortBy === 'name' && order === 'asc' ? 'active' : ''}`}></span>
                            <span className={`arrow down ${sortBy === 'name' && order === 'desc' ? 'active' : ''}`}></span>
                          </span>
                        </span>
                      </th>
                      <th className={`sortable ${sortBy === 'description' ? 'sorted' : ''}`} onClick={() => handleSort('description')}>
                        <span className="th-content">
                          <span className="th-text">Description</span>
                          <span className="sort-arrows">
                            <span className={`arrow up ${sortBy === 'description' && order === 'asc' ? 'active' : ''}`}></span>
                            <span className={`arrow down ${sortBy === 'description' && order === 'desc' ? 'active' : ''}`}></span>
                          </span>
                        </span>
                      </th>
                      <th
                        className={`sortable ${sortBy === 'storage_type' ? 'sorted' : ''}`}
                        onClick={() => handleSort('storage_type')}
                      >
                        <span className="th-content">
                          <span className="th-text">Type</span>
                          <span className="sort-arrows">
                            <span className={`arrow up ${sortBy === 'storage_type' && order === 'asc' ? 'active' : ''}`}></span>
                            <span className={`arrow down ${sortBy === 'storage_type' && order === 'desc' ? 'active' : ''}`}></span>
                          </span>
                        </span>
                      </th>
                      <th
                        className={`sortable ${sortBy === 'updated_at' ? 'sorted' : ''}`}
                        onClick={() => handleSort('updated_at')}
                      >
                        <span className="th-content">
                          <span className="th-text">Updated</span>
                          <span className="sort-arrows">
                            <span className={`arrow up ${sortBy === 'updated_at' && order === 'asc' ? 'active' : ''}`}></span>
                            <span className={`arrow down ${sortBy === 'updated_at' && order === 'desc' ? 'active' : ''}`}></span>
                          </span>
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

            {totalPages > 1 && (
              <div className="pagination">
                <div className="pagination-info">
                  Showing {startIndex + 1} to {endIndex} of {totalBrowserStorages} browser storages
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
                  <button className="pagination-btn" onClick={handleNextPage} disabled={currentPage >= totalPages}>Next</button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

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
        setValue={(val) => {
          setNewValue(val);
          setValueError(''); // Clear error when user types
        }}
        setType={setNewType}
        valueError={valueError}
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
        setValue={(val) => {
          setEditValue(val);
          setEditValueError(''); // Clear error when user types
        }}
        setType={setEditType}
        valueError={editValueError}
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



