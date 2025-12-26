import { GroupSuiteItem, GroupTreeWithSuitesItem, GroupTreeWithSuitesResponse } from '../../../types/group';
import { TestCaseInSuite } from '../../../types/testsuites';

export type TreeGroup = GroupTreeWithSuitesItem;

/**
 * Normalize a group tree node, ensuring arrays are properly initialized
 */
export const normalizeGroup = (group: TreeGroup): TreeGroup => ({
  ...group,
  suites: Array.isArray(group.suites) ? group.suites : [],
  children: Array.isArray(group.children) ? group.children.map(normalizeGroup) : [],
});

/**
 * Normalize a suite item, ensuring proper types for numeric fields
 */
export const normalizeSuite = (s: any, projectId?: string): GroupSuiteItem => ({
  ...s,
  project_id: s?.project_id || projectId || '',
  test_passed: typeof s?.test_passed === 'number' ? s.test_passed : Number(s?.test_passed ?? 0),
  test_failed: typeof s?.test_failed === 'number' ? s.test_failed : Number(s?.test_failed ?? 0),
});

/**
 * Extract ungrouped suites from API response payload
 */
export const extractUngroupSuites = (payload: any, projectId?: string): GroupSuiteItem[] => {
  if (!payload) return [];
  const a = Array.isArray(payload.ungroupsuite) ? payload.ungroupsuite : [];
  const b = Array.isArray(payload.ungroup_suites) ? payload.ungroup_suites : [];
  const c = Array.isArray((payload as GroupTreeWithSuitesResponse)?.ungrouped_suites)
    ? (payload as GroupTreeWithSuitesResponse).ungrouped_suites
    : [];
  return [...a, ...b, ...c].map((s) => normalizeSuite(s, projectId));
};

/**
 * Format ISO date string to YYYY-MM-DD format
 */
export const formatDate = (iso?: string) => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return iso;
  }
};

/**
 * Format browser type string to capitalized format
 */
export const formatBrowserType = (browserType?: string | null) => {
  if (!browserType) return '—';
  return browserType.charAt(0).toUpperCase() + browserType.slice(1).toLowerCase();
};

/**
 * Calculate and format pass rate for a suite
 */
export const formatPassRate = (suite: GroupSuiteItem) => {
  if (suite.passed_rate !== undefined && suite.passed_rate !== null) {
    return `${suite.passed_rate}%`;
  }
  const passed = Number(suite.test_passed);
  const failed = Number(suite.test_failed);
  const total = (isNaN(passed) ? 0 : passed) + (isNaN(failed) ? 0 : failed);
  if (total === 0) return '—';
  const rate = Math.round((passed / total) * 100);
  return `${rate}%`;
};

/**
 * Map browser type to Playwright browser name
 */
export const mapBrowserTypeToPlaywright = (browserType: string): string => {
  const normalized = browserType.toLowerCase();
  switch (normalized) {
    case 'chrome':
      return 'chromium';
    case 'edge':
      return 'msedge'; // Edge uses custom installation
    case 'firefox':
      return 'firefox';
    case 'safari':
      return 'webkit';
    default:
      return 'chromium';
  }
};

/**
 * Check if browser type is supported on current platform
 */
export const isBrowserSupported = (browserType: string): boolean => {
  type SupportedPlatform = 'win32' | 'darwin' | 'linux';
  
  const browserSupportMap: Record<string, SupportedPlatform[]> = {
    chrome: ['win32', 'darwin', 'linux'],
    edge: ['win32', 'darwin', 'linux'],
    firefox: ['win32', 'darwin', 'linux'],
    safari: ['darwin'], // Safari only on macOS
  };
  
  const systemPlatformRaw = (window as any).electronAPI?.system?.platform || process?.platform || 'linux';
  const normalizedPlatform: SupportedPlatform = ['win32', 'darwin', 'linux'].includes(systemPlatformRaw)
    ? (systemPlatformRaw as SupportedPlatform)
    : 'linux';
  
  const normalizedBrowserType = browserType.toLowerCase();
  const supportedPlatforms = browserSupportMap[normalizedBrowserType];
  
  if (!supportedPlatforms) {
    // Unknown browser type, assume not supported
    return false;
  }
  
  return supportedPlatforms.includes(normalizedPlatform);
};

/**
 * Sort testcases by column and direction
 */
export const sortTestcases = (
  testcases: TestCaseInSuite[],
  column: string | null,
  direction: 'asc' | 'desc',
  formatBrowserTypeFn: (browserType?: string | null) => string = formatBrowserType
): TestCaseInSuite[] => {
  if (!column) return testcases;
  
  const sorted = [...testcases].sort((a, b) => {
    let comparison = 0;
    
    switch (column) {
      case 'name':
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        comparison = nameA.localeCompare(nameB);
        break;
        
      case 'description':
        const descA = (a.description || '').toLowerCase();
        const descB = (b.description || '').toLowerCase();
        comparison = descA.localeCompare(descB);
        break;
        
      case 'status':
        // Custom order: Running > Passed > Failed > Draft
        const statusOrder: Record<string, number> = {
          'running': 0,
          'passed': 1,
          'success': 1,
          'failed': 2,
          'error': 2,
          'draft': 3,
        };
        const statusA = statusOrder[(a.status || '').toLowerCase()] ?? 4;
        const statusB = statusOrder[(b.status || '').toLowerCase()] ?? 4;
        comparison = statusA - statusB;
        break;
        
      case 'browser':
        const browserA = formatBrowserTypeFn(a.browser_type).toLowerCase();
        const browserB = formatBrowserTypeFn(b.browser_type).toLowerCase();
        comparison = browserA.localeCompare(browserB);
        break;
        
      case 'order':
        const levelA = a.level ?? 0;
        const levelB = b.level ?? 0;
        comparison = levelA - levelB;
        break;
        
      case 'updated':
        const dateA = a.updated_at || a.created_at || '';
        const dateB = b.updated_at || b.created_at || '';
        if (!dateA && !dateB) comparison = 0;
        else if (!dateA) comparison = 1;
        else if (!dateB) comparison = -1;
        else {
          comparison = new Date(dateA).getTime() - new Date(dateB).getTime();
        }
        break;
        
      default:
        return 0;
    }
    
    return direction === 'asc' ? comparison : -comparison;
  });
  
  return sorted;
};

