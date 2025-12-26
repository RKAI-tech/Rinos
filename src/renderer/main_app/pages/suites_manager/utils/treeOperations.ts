import { GroupSuiteItem } from '../../../types/group';
import { TreeGroup, normalizeGroup } from './suitesManagerUtils';

/**
 * Find a group by ID in the tree structure
 */
export const findGroupById = (id: string | null | undefined, nodes: TreeGroup[]): TreeGroup | null => {
  if (!id) return null;
  for (const g of nodes) {
    if (g.group_id === id) return g;
    const found = findGroupById(id, g.children || []);
    if (found) return found;
  }
  return null;
};

/**
 * Find a suite by ID in the tree structure or root suites
 */
export const findSuiteById = (
  suiteId: string | null | undefined,
  nodes: TreeGroup[],
  rootSuitesList: GroupSuiteItem[]
): GroupSuiteItem | null => {
  if (!suiteId) return null;
  // Check root suites
  const rootSuite = rootSuitesList.find((s) => s.test_suite_id === suiteId);
  if (rootSuite) return rootSuite;
  // Check in groups
  for (const g of nodes) {
    const suite = (g.suites || []).find((s) => s.test_suite_id === suiteId);
    if (suite) return suite;
    const found = findSuiteById(suiteId, g.children || [], []);
    if (found) return found;
  }
  return null;
};

/**
 * Check if a group is a descendant (child) of another group
 * Returns true if childGroupId is a descendant of parentGroupId
 */
export const isDescendantOf = (childGroupId: string, parentGroupId: string, nodes: TreeGroup[]): boolean => {
  // Find the parent group in the tree
  const findGroup = (searchId: string, searchNodes: TreeGroup[]): TreeGroup | null => {
    for (const group of searchNodes) {
      if (group.group_id === searchId) {
        return group;
      }
      if (group.children && group.children.length > 0) {
        const found = findGroup(searchId, group.children);
        if (found) return found;
      }
    }
    return null;
  };

  const parentGroup = findGroup(parentGroupId, nodes);
  if (!parentGroup) return false;

  // Check if childGroupId is in the children of parentGroup (recursively)
  const findInChildren = (children: TreeGroup[]): boolean => {
    for (const child of children) {
      if (child.group_id === childGroupId) {
        return true;
      }
      if (child.children && child.children.length > 0) {
        if (findInChildren(child.children)) {
          return true;
        }
      }
    }
    return false;
  };

  return findInChildren(parentGroup.children || []);
};

/**
 * Get siblings of a group by parent ID
 * If parentId is null, returns root groups
 */
export const getSiblingsByParent = (parentId: string | null, groups: TreeGroup[]): TreeGroup[] => {
  if (!parentId) return groups;
  const parent = findGroupById(parentId, groups);
  return parent?.children || [];
};

/**
 * Update a group in the tree structure
 * Returns a new array with the updated group
 */
export const updateGroupInTree = (groupId: string, newNode: TreeGroup, groups: TreeGroup[]): TreeGroup[] => {
  const patch = (nodes: TreeGroup[]): TreeGroup[] =>
    nodes.map((g) => {
      if (g.group_id === groupId) {
        return {
          ...g,
          suites: Array.isArray(newNode.suites) ? newNode.suites : [],
          children: Array.isArray(newNode.children) ? newNode.children.map(normalizeGroup) : [],
        };
      }
      return { ...g, children: patch(g.children || []) };
    });
  return patch(groups);
};

/**
 * Filter tree nodes by search text
 * Returns filtered tree structure with matching groups and suites
 */
export const filterNode = (node: TreeGroup, searchText: string): TreeGroup | null => {
  const q = searchText.toLowerCase();
  const matchSuite = (s: GroupSuiteItem) => (s.name || '').toLowerCase().includes(q);

  const matchedSuites = (node.suites || []).filter(matchSuite);
  const matchedChildren = (node.children || []).map((child) => filterNode(child, searchText)).filter(Boolean) as TreeGroup[];
  const nameMatch = (node.name || '').toLowerCase().includes(q);
  
  if (nameMatch || matchedSuites.length || matchedChildren.length) {
    return {
      ...node,
      suites: matchedSuites,
      children: matchedChildren,
    };
  }
  return null;
};

// Re-export TreeGroup for convenience
export type { TreeGroup };

