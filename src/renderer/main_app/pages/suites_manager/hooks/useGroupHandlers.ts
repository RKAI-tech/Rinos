import { useState, useCallback, useMemo, useRef } from 'react';
import { toast } from 'react-toastify';
import { GroupSuiteItem } from '../../../types/group';
import { TreeGroup, normalizeGroup } from '../utils/suitesManagerUtils';
import { findGroupById, getSiblingsByParent } from '../utils/treeOperations';
import { GroupService } from '../../../services/group';

interface UseGroupHandlersProps {
  projectId: string | undefined;
  groups: TreeGroup[];
  setGroups: React.Dispatch<React.SetStateAction<TreeGroup[]>>;
  rootSuites: GroupSuiteItem[];
  setRootSuites: React.Dispatch<React.SetStateAction<GroupSuiteItem[]>>;
  expanded: Set<string>;
  setExpanded: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedGroupId: string | null;
  setSelectedGroupId: React.Dispatch<React.SetStateAction<string | null>>;
  loadGroupChildren?: (groupId: string) => Promise<void>;
  addGroupToTree: (group: TreeGroup, parentId?: string | null) => void;
  updateGroupNameInTree: (groupId: string, name: string) => void;
  removeGroupFromTree: (groupId: string) => void;
  refreshRootGroups: () => Promise<void>;
  refreshGroupChildren: (groupId: string) => Promise<void>;
}

export const useGroupHandlers = ({
  projectId,
  groups,
  setGroups,
  rootSuites,
  setRootSuites,
  expanded,
  setExpanded,
  selectedGroupId,
  setSelectedGroupId,
  loadGroupChildren,
  addGroupToTree,
  updateGroupNameInTree,
  removeGroupFromTree,
  refreshRootGroups,
  refreshGroupChildren,
}: UseGroupHandlersProps) => {
  // Services
  const groupService = useMemo(() => new GroupService(), []);

  // Create group state
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [creatingGroupName, setCreatingGroupName] = useState('');
  const [creatingGroupError, setCreatingGroupError] = useState<string | null>(null);
  const [isSavingGroup, setIsSavingGroup] = useState(false);
  const [creatingParentId, setCreatingParentId] = useState<string | null>(null);
  const createInputRef = useRef<HTMLInputElement | null>(null);

  // Rename group state
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null);
  const [renamingGroupName, setRenamingGroupName] = useState('');
  const [renamingGroupError, setRenamingGroupError] = useState<string | null>(null);
  const [isRenamingGroup, setIsRenamingGroup] = useState(false);
  const renameInputRef = useRef<HTMLInputElement | null>(null);

  // Delete group state
  const [deletingGroup, setDeletingGroup] = useState<TreeGroup | null>(null);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);

  // Toggle group handler
  const handleToggle = useCallback(async (groupId: string) => {
    const wasExpanded = expanded.has(groupId);
    
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });

    // When expanding for the first time, lazy load children
    if (!wasExpanded && loadGroupChildren) {
      await loadGroupChildren(groupId);
    }
  }, [expanded, loadGroupChildren, setExpanded]);

  // Group click handler
  const handleGroupClick = useCallback((groupId: string) => {
    setSelectedGroupId(groupId);
    // Don't clear selected suite when clicking group - keep suite content visible
    handleToggle(groupId);
  }, [setSelectedGroupId, handleToggle]);

  // Start create group handler
  const handleStartCreateGroup = useCallback(() => {
    const parentId = selectedGroupId || null;
    if (parentId) {
      setExpanded((prev) => {
        const next = new Set(prev);
        next.add(parentId);
        return next;
      });
    }
    setCreatingParentId(parentId);
    setIsCreatingGroup(true);
    setCreatingGroupName('New group');
    setCreatingGroupError(null);
  }, [selectedGroupId, setExpanded]);

  // Validate group name
  const validateGroupName = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setCreatingGroupError('Group name cannot be empty.');
      return null;
    }
    const siblings = getSiblingsByParent(creatingParentId, groups);
    const duplicated = siblings.some((g) => (g.name || '').trim().toLowerCase() === trimmed.toLowerCase());
    if (duplicated) {
      setCreatingGroupError('Group name already exists, please choose another name.');
      return null;
    }
    setCreatingGroupError(null);
    return trimmed;
  }, [creatingParentId, groups]);

  // Finish create group handler
  const finishCreateGroup = useCallback(async (source: 'submit' | 'blur' = 'submit') => {
    if (!projectId || isSavingGroup) return;
    const trimmed = creatingGroupName.trim();
    if (source === 'blur' && !trimmed) {
      cancelCreateGroup();
      return;
    }
    const validName = validateGroupName(creatingGroupName);
    if (!validName) {
      setTimeout(() => createInputRef.current?.focus(), 0);
      return;
    }
    try {
      setIsSavingGroup(true);
      const resp = await groupService.createGroup({
        project_id: projectId,
        name: validName,
        parent_group_id: creatingParentId,
      });
      if (!resp.success) {
        setCreatingGroupError(resp.error || 'Failed to create group.');
        setTimeout(() => createInputRef.current?.focus(), 0);
        return;
      }
      setIsCreatingGroup(false);
      setCreatingGroupName('');
      setCreatingGroupError(null);
      setCreatingParentId(null);
      const rawData = (resp.data as any)?.data || (resp.data as any);
      const createdGroupId = rawData?.group_id || rawData?.id;
      if (createdGroupId) {
        addGroupToTree(normalizeGroup({
          group_id: createdGroupId,
          project_id: projectId || '',
          name: validName,
          parent_group_id: creatingParentId || null,
          suites: [],
          children: [],
        }), creatingParentId || null);
      } else if (creatingParentId) {
        await refreshGroupChildren(creatingParentId);
      } else {
        await refreshRootGroups();
      }
    } catch (e) {
      setCreatingGroupError(e instanceof Error ? e.message : 'Failed to create group.');
      setTimeout(() => createInputRef.current?.focus(), 0);
    } finally {
      setIsSavingGroup(false);
    }
  }, [
    projectId,
    isSavingGroup,
    creatingGroupName,
    creatingParentId,
    validateGroupName,
    groupService,
    addGroupToTree,
    refreshGroupChildren,
    refreshRootGroups,
  ]);

  // Cancel create group handler
  const cancelCreateGroup = useCallback(() => {
    if (isSavingGroup) return;
    setIsCreatingGroup(false);
    setCreatingGroupName('');
    setCreatingGroupError(null);
    setCreatingParentId(null);
  }, [isSavingGroup]);

  // Create input key down handler
  const handleCreateInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      finishCreateGroup();
    } else if (e.key === 'Escape') {
      cancelCreateGroup();
    }
  }, [finishCreateGroup, cancelCreateGroup]);

  // Validate rename group name
  const validateRenameGroupName = useCallback((value: string, groupId: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setRenamingGroupError('Group name cannot be empty.');
      return null;
    }
    const group = findGroupById(groupId, groups);
    if (!group) return null;
    const parentId = group.parent_group_id || null;
    const siblings = getSiblingsByParent(parentId, groups);
    const duplicated = siblings.some((g) => g.group_id !== groupId && (g.name || '').trim().toLowerCase() === trimmed.toLowerCase());
    if (duplicated) {
      setRenamingGroupError('Group name already exists, please choose another name.');
      return null;
    }
    setRenamingGroupError(null);
    return trimmed;
  }, [groups]);

  // Finish rename group handler
  const finishRenameGroup = useCallback(async (source: 'submit' | 'blur' = 'submit') => {
    if (!renamingGroupId || !projectId || isRenamingGroup) return;
    const trimmed = renamingGroupName.trim();
    if (source === 'blur' && !trimmed) {
      cancelRenameGroup();
      return;
    }
    const validName = validateRenameGroupName(renamingGroupName, renamingGroupId);
    if (!validName) {
      setTimeout(() => renameInputRef.current?.focus(), 0);
      return;
    }
    try {
      setIsRenamingGroup(true);
      const resp = await groupService.updateGroup({
        group_id: renamingGroupId,
        name: validName,
      });
      if (!resp.success) {
        setRenamingGroupError(resp.error || 'Failed to rename group.');
        setTimeout(() => renameInputRef.current?.focus(), 0);
        return;
      }
      setRenamingGroupId(null);
      setRenamingGroupName('');
      setRenamingGroupError(null);
      updateGroupNameInTree(renamingGroupId, validName);
    } catch (e) {
      setRenamingGroupError(e instanceof Error ? e.message : 'Failed to rename group.');
      setTimeout(() => renameInputRef.current?.focus(), 0);
    } finally {
      setIsRenamingGroup(false);
    }
  }, [
    renamingGroupId,
    projectId,
    isRenamingGroup,
    renamingGroupName,
    validateRenameGroupName,
    groupService,
    updateGroupNameInTree,
  ]);

  // Cancel rename group handler
  const cancelRenameGroup = useCallback(() => {
    if (isRenamingGroup) return;
    setRenamingGroupId(null);
    setRenamingGroupName('');
    setRenamingGroupError(null);
  }, [isRenamingGroup]);

  // Rename input key down handler
  const handleRenameInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      finishRenameGroup();
    } else if (e.key === 'Escape') {
      cancelRenameGroup();
    }
  }, [finishRenameGroup, cancelRenameGroup]);

  // Delete group handler
  const handleDeleteGroup = useCallback(async (groupId: string) => {
    if (!groupId) return;
    try {
      setIsDeletingGroup(true);
      const resp = await groupService.deleteGroup(groupId);
      if (resp.success) {
        toast.success('Group deleted successfully');
        // If deleted group was selected, clear selection
        if (selectedGroupId === groupId) {
          setSelectedGroupId(null);
        }
        removeGroupFromTree(groupId);
        setDeletingGroup(null);
      } else {
        toast.error(resp.error || 'Failed to delete group. Please try again.');
      }
    } catch (e) {
      toast.error('Failed to delete group. Please try again.');
    } finally {
      setIsDeletingGroup(false);
    }
  }, [selectedGroupId, groupService, setSelectedGroupId, removeGroupFromTree]);

  return {
    // Create group state
    isCreatingGroup,
    creatingGroupName,
    creatingGroupError,
    isSavingGroup,
    creatingParentId,
    createInputRef,
    // Create group handlers
    handleStartCreateGroup,
    validateGroupName,
    finishCreateGroup,
    cancelCreateGroup,
    handleCreateInputKeyDown,
    // Rename group state
    renamingGroupId,
    renamingGroupName,
    renamingGroupError,
    isRenamingGroup,
    renameInputRef,
    // Rename group handlers
    validateRenameGroupName,
    finishRenameGroup,
    cancelRenameGroup,
    handleRenameInputKeyDown,
    // Delete group state
    deletingGroup,
    isDeletingGroup,
    // Delete group handlers
    handleDeleteGroup,
    // Toggle and click handlers
    handleToggle,
    handleGroupClick,
    // Setters for state management
    setCreatingGroupName,
    setRenamingGroupName,
    setDeletingGroup,
    // Additional setters for context menu handlers
    setCreatingParentId,
    setIsCreatingGroup,
    setCreatingGroupError,
    setRenamingGroupId,
    setRenamingGroupError,
  };
};

