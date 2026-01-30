import { useState, useCallback } from 'react';
import { GroupSuiteItem } from '../../../types/group';
import { TreeGroup } from '../utils/suitesManagerUtils';
import { TestCaseInSuite } from '../../../types/testsuites';
import { GroupService } from '../../../services/group';
import { TestSuiteService } from '../../../services/testsuites';
import { isDescendantOf } from '../utils/treeOperations';
import { toast } from 'react-toastify';
import { logErrorAndGetFriendlyMessage } from '../../../../shared/utils/friendlyError';

interface UseDragAndDropProps {
  groups: TreeGroup[];
  expanded: Set<string>;
  setExpanded: React.Dispatch<React.SetStateAction<Set<string>>>;
  suiteService: TestSuiteService;
  groupService: GroupService;
  selectedSuiteId: string | null;
  selectedSuiteName: string;
  fetchTestcasesBySuite: (suiteId: string, suiteName: string) => Promise<void>;
  moveSuiteInTree: (suite: GroupSuiteItem, targetGroupId?: string | null) => void;
  moveGroupInTree: (group: TreeGroup, targetParentId?: string | null) => void;
}

export const useDragAndDrop = ({
  groups,
  expanded,
  setExpanded,
  suiteService,
  groupService,
  selectedSuiteId,
  selectedSuiteName,
  fetchTestcasesBySuite,
  moveSuiteInTree,
  moveGroupInTree,
}: UseDragAndDropProps) => {
  // Suite drag state
  const [draggedSuite, setDraggedSuite] = useState<GroupSuiteItem | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);
  const [isUpdatingSuiteGroup, setIsUpdatingSuiteGroup] = useState(false);

  // Group drag state
  const [draggedGroup, setDraggedGroup] = useState<TreeGroup | null>(null);
  const [isDraggingGroup, setIsDraggingGroup] = useState(false);
  const [isUpdatingGroupParent, setIsUpdatingGroupParent] = useState(false);

  // Testcase level update state (used by context menu, not drag-and-drop)
  const [isUpdatingTestcaseLevel, setIsUpdatingTestcaseLevel] = useState(false);

  // Suite drag handlers
  const handleSuiteDragStart = useCallback((e: React.DragEvent, suite: GroupSuiteItem) => {
    e.stopPropagation();
    setDraggedSuite(suite);
    setIsDragging(true);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', suite.test_suite_id);
    }
  }, []);

  const handleSuiteDragEnd = useCallback(() => {
    setIsDragging(false);
    setDraggedSuite(null);
    setDragOverGroupId(null);
  }, []);

  // Group drag handlers
  const handleGroupDragStart = useCallback((e: React.DragEvent, group: TreeGroup) => {
    e.stopPropagation();
    setDraggedGroup(group);
    setIsDraggingGroup(true);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', group.group_id);
    }
  }, []);

  const handleGroupDragEnd = useCallback(() => {
    setIsDraggingGroup(false);
    setDraggedGroup(null);
    setDragOverGroupId(null);
  }, []);

  const handleGroupDragOver = useCallback((e: React.DragEvent, groupId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    
    // Check if dragging a group and if it's a valid drop target
    if (draggedGroup) {
      // Don't allow dropping group into itself
      if (draggedGroup.group_id === groupId) {
        if (e.dataTransfer) {
          e.dataTransfer.dropEffect = 'none';
        }
        return;
      }
      // Don't allow dropping group into its own descendants (would create circular reference)
      if (isDescendantOf(groupId, draggedGroup.group_id, groups)) {
        if (e.dataTransfer) {
          e.dataTransfer.dropEffect = 'none';
        }
        return;
      }
    }
    
    setDragOverGroupId(groupId);
    // Auto-expand group when dragging over it
    if (!expanded.has(groupId)) {
      setExpanded((prev) => {
        const next = new Set(prev);
        next.add(groupId);
        return next;
      });
    }
  }, [draggedGroup, groups, expanded, setExpanded]);

  const handleGroupDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only clear if we're actually leaving the group area
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget || !relatedTarget.closest('.sm-row.sm-group')) {
      setDragOverGroupId(null);
    }
  }, []);

  const handleGroupDrop = useCallback(async (e: React.DragEvent, targetGroupId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverGroupId(null);

    // Handle suite drop
    if (draggedSuite && !isUpdatingSuiteGroup) {
      // Don't do anything if dropping on the same group
      if (draggedSuite.group_id === targetGroupId) {
        setIsDragging(false);
        setDraggedSuite(null);
        return;
      }

      try {
        setIsUpdatingSuiteGroup(true);
        const resp = await suiteService.updateTestSuiteGroup({
          test_suite_id: draggedSuite.test_suite_id,
          group_id: targetGroupId,
        });

        if (resp.success) {
          moveSuiteInTree(draggedSuite, targetGroupId);
        } else {
          const message = logErrorAndGetFriendlyMessage(
            '[useDragAndDrop] moveSuite',
            resp.error,
            'Failed to move suite. Please try again.'
          );
          toast.error(message);
        }
      } catch (e) {
        toast.error('Failed to move suite. Please try again.');
      } finally {
        setIsUpdatingSuiteGroup(false);
        setIsDragging(false);
        setDraggedSuite(null);
      }
      return;
    }

    // Handle group drop
    if (draggedGroup && !isUpdatingGroupParent) {
      // Don't do anything if dropping on the same group or its parent
      if (draggedGroup.group_id === targetGroupId || draggedGroup.parent_group_id === targetGroupId) {
        setIsDraggingGroup(false);
        setDraggedGroup(null);
        return;
      }

      // Don't allow dropping group into itself
      if (draggedGroup.group_id === targetGroupId) {
        setIsDraggingGroup(false);
        setDraggedGroup(null);
        return;
      }
      // Don't allow dropping group into its own descendants (would create circular reference)
      if (isDescendantOf(targetGroupId, draggedGroup.group_id, groups)) {
        setIsDraggingGroup(false);
        setDraggedGroup(null);
        toast.error('Cannot move group into its own descendant.');
        return;
      }

      try {
        setIsUpdatingGroupParent(true);
        const resp = await groupService.updateGroup({
          group_id: draggedGroup.group_id,
          parent_group_id: targetGroupId,
        });

        if (resp.success) {
          moveGroupInTree(draggedGroup, targetGroupId);
        } else {
          const message = logErrorAndGetFriendlyMessage(
            '[useDragAndDrop] moveGroup',
            resp.error,
            'Failed to move group. Please try again.'
          );
          toast.error(message);
        }
      } catch (e) {
        toast.error('Failed to move group. Please try again.');
      } finally {
        setIsUpdatingGroupParent(false);
        setIsDraggingGroup(false);
        setDraggedGroup(null);
      }
      return;
    }
  }, [
    draggedSuite,
    draggedGroup,
    isUpdatingSuiteGroup,
    isUpdatingGroupParent,
    suiteService,
    groupService,
    groups,
    moveSuiteInTree,
    moveGroupInTree,
  ]);

  // Root drag handlers
  const handleRootDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    // Only set drag over root if dragging suite or group
    if (draggedSuite || draggedGroup) {
      setDragOverGroupId('root');
    }
  }, [draggedSuite, draggedGroup]);

  const handleRootDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget || !relatedTarget.closest('.suites-tree')) {
      setDragOverGroupId(null);
    }
  }, []);

  const handleRootDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverGroupId(null);

    // Handle suite drop to root
    if (draggedSuite && !isUpdatingSuiteGroup) {
      // Don't do anything if suite is already at root
      if (!draggedSuite.group_id || draggedSuite.group_id === 'root') {
        setIsDragging(false);
        setDraggedSuite(null);
        return;
      }

      try {
        setIsUpdatingSuiteGroup(true);
        const resp = await suiteService.updateTestSuiteGroup({
          test_suite_id: draggedSuite.test_suite_id,
          group_id: 'root',
        });

        if (resp.success) {
          moveSuiteInTree(draggedSuite, null);
        } else {
          const message = logErrorAndGetFriendlyMessage(
            '[useDragAndDrop] moveSuite',
            resp.error,
            'Failed to move suite. Please try again.'
          );
          toast.error(message);
        }
      } catch (e) {
        toast.error('Failed to move suite. Please try again.');
      } finally {
        setIsUpdatingSuiteGroup(false);
        setIsDragging(false);
        setDraggedSuite(null);
      }
      return;
    }

    // Handle group drop to root
    if (draggedGroup && !isUpdatingGroupParent) {
      // Don't do anything if group is already at root
      if (!draggedGroup.parent_group_id) {
        setIsDraggingGroup(false);
        setDraggedGroup(null);
        return;
      }

      try {
        setIsUpdatingGroupParent(true);
        const resp = await groupService.updateGroup({
          group_id: draggedGroup.group_id,
          parent_group_id: null,
        });

        if (resp.success) {
          moveGroupInTree(draggedGroup, null);
        } else {
          const message = logErrorAndGetFriendlyMessage(
            '[useDragAndDrop] moveGroup',
            resp.error,
            'Failed to move group. Please try again.'
          );
          toast.error(message);
        }
      } catch (e) {
        toast.error('Failed to move group. Please try again.');
      } finally {
        setIsUpdatingGroupParent(false);
        setIsDraggingGroup(false);
        setDraggedGroup(null);
      }
      return;
    }
  }, [
    draggedSuite,
    draggedGroup,
    isUpdatingSuiteGroup,
    isUpdatingGroupParent,
    suiteService,
    groupService,
    moveSuiteInTree,
    moveGroupInTree,
  ]);

  // Helper function to update testcase level (used by context menu)
  const updateTestcaseLevel = useCallback(async (testcaseId: string, level: number) => {
    if (!selectedSuiteId || isUpdatingTestcaseLevel) return false;

    try {
      setIsUpdatingTestcaseLevel(true);
      const resp = await suiteService.updateTestCaseLevel({
        test_suite_id: selectedSuiteId,
        testcase_ids: [{
          testcase_id: testcaseId,
          level: level
        }]
      });

      if (resp.success) {
        // Reload testcases in suite
        if (selectedSuiteId) {
          await fetchTestcasesBySuite(selectedSuiteId, selectedSuiteName);
        }
        return true;
      } else {
        const message = logErrorAndGetFriendlyMessage(
          '[useDragAndDrop] updateTestcaseLevel',
          resp.error,
          'Failed to update testcase level. Please try again.'
        );
        toast.error(message);
        return false;
      }
    } catch (e) {
      toast.error('Failed to update testcase level. Please try again.');
      return false;
    } finally {
      setIsUpdatingTestcaseLevel(false);
    }
  }, [selectedSuiteId, selectedSuiteName, isUpdatingTestcaseLevel, suiteService, fetchTestcasesBySuite]);

  return {
    // Suite drag state
    draggedSuite,
    isDragging,
    dragOverGroupId,
    isUpdatingSuiteGroup,
    // Group drag state
    draggedGroup,
    isDraggingGroup,
    isUpdatingGroupParent,
    // Testcase level update state
    isUpdatingTestcaseLevel,
    // Suite drag handlers
    handleSuiteDragStart,
    handleSuiteDragEnd,
    // Group drag handlers
    handleGroupDragStart,
    handleGroupDragEnd,
    handleGroupDragOver,
    handleGroupDragLeave,
    handleGroupDrop,
    // Root drag handlers
    handleRootDragOver,
    handleRootDragLeave,
    handleRootDrop,
    // Helper function (used by context menu)
    updateTestcaseLevel,
  };
};

