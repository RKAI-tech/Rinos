import { useState, useCallback } from 'react';
import { GroupSuiteItem } from '../../../types/group';
import { TreeGroup } from '../utils/treeOperations';
import { TestCaseInSuite } from '../../../types/testsuites';

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  testcase: TestCaseInSuite | null;
}

interface SuiteContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  suite: GroupSuiteItem | null;
}

interface GroupContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  group: TreeGroup | null;
}

interface UseContextMenuHandlersProps {
  // Testcase context menu action handlers
  onTestcaseEvidence?: (testcase: TestCaseInSuite) => void;
  onTestcaseEdit?: (testcase: TestCaseInSuite) => Promise<void>;
  onTestcaseDuplicate?: (testcase: TestCaseInSuite) => Promise<void>;
  onTestcaseDelete?: (testcase: TestCaseInSuite) => void;
  onTestcaseDatatest?: (testcase: TestCaseInSuite) => void;
  onTestcaseChangeLevel?: (testcase: TestCaseInSuite) => void;
  // Suite context menu action handlers
  onSuiteRun?: (suite: GroupSuiteItem) => Promise<void>;
  onSuiteAddCases?: (suite: GroupSuiteItem) => void;
  onSuiteEdit?: (suite: GroupSuiteItem) => void;
  onSuiteDelete?: (suite: GroupSuiteItem) => void;
  // Group context menu action handlers
  onGroupNewGroup?: (group: TreeGroup) => void;
  onGroupNewSuite?: (group: TreeGroup) => void;
  onGroupRename?: (group: TreeGroup) => void;
  onGroupDelete?: (group: TreeGroup) => void;
  // Change level handlers
  onChangeLevelSubmit?: (testcaseId: string, level: number) => Promise<boolean>;
  isUpdatingTestcaseLevel?: boolean;
}

export const useContextMenuHandlers = ({
  onTestcaseEvidence,
  onTestcaseEdit,
  onTestcaseDuplicate,
  onTestcaseDelete,
  onTestcaseDatatest,
  onTestcaseChangeLevel,
  onSuiteRun,
  onSuiteAddCases,
  onSuiteEdit,
  onSuiteDelete,
  onGroupNewGroup,
  onGroupNewSuite,
  onGroupRename,
  onGroupDelete,
  onChangeLevelSubmit,
  isUpdatingTestcaseLevel = false,
}: UseContextMenuHandlersProps) => {
  // Testcase context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    testcase: null,
  });

  // Suite context menu state
  const [suiteContextMenu, setSuiteContextMenu] = useState<SuiteContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    suite: null,
  });

  // Group context menu state
  const [groupContextMenu, setGroupContextMenu] = useState<GroupContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    group: null,
  });

  // Change level submenu state
  const [isChangeLevelSubmenuOpen, setIsChangeLevelSubmenuOpen] = useState(false);
  const [changingLevelTestcase, setChangingLevelTestcase] = useState<TestCaseInSuite | null>(null);
  const [newLevelValue, setNewLevelValue] = useState<string>('');

  // Close handlers
  const handleCloseContextMenu = useCallback(() => {
    setContextMenu({
      visible: false,
      x: 0,
      y: 0,
      testcase: null,
    });
    setIsChangeLevelSubmenuOpen(false);
    setChangingLevelTestcase(null);
    setNewLevelValue('');
  }, []);

  const handleCloseSuiteContextMenu = useCallback(() => {
    setSuiteContextMenu({
      visible: false,
      x: 0,
      y: 0,
      suite: null,
    });
  }, []);

  const handleCloseGroupContextMenu = useCallback(() => {
    setGroupContextMenu({
      visible: false,
      x: 0,
      y: 0,
      group: null,
    });
  }, []);

  // Right click handlers
  const handleTestcaseRightClick = useCallback((e: React.MouseEvent, testcase: TestCaseInSuite) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      testcase,
    });
  }, []);

  const handleTestcaseActionsClick = useCallback((e: React.MouseEvent, testcase: TestCaseInSuite) => {
    e.preventDefault();
    e.stopPropagation();
    const buttonElement = e.currentTarget as HTMLElement;
    const buttonRect = buttonElement.getBoundingClientRect();
    setContextMenu({
      visible: true,
      x: buttonRect.left - 150, // Position menu to the left of button (menu width is ~140px)
      y: buttonRect.top, // Align with top of button
      testcase,
    });
  }, []);

  const handleSuiteRightClick = useCallback((e: React.MouseEvent, suite: GroupSuiteItem) => {
    e.preventDefault();
    e.stopPropagation();
    setSuiteContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      suite,
    });
  }, []);

  const handleGroupRightClick = useCallback((e: React.MouseEvent, group: TreeGroup) => {
    e.preventDefault();
    e.stopPropagation();
    setGroupContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      group,
    });
  }, []);

  // Testcase context menu action handler
  const handleContextMenuAction = useCallback(async (action: 'evidence' | 'edit' | 'duplicate' | 'datatest' | 'delete' | 'change_level') => {
    if (!contextMenu.testcase) {
      handleCloseContextMenu();
      return;
    }

    switch (action) {
      case 'evidence':
        if (onTestcaseEvidence) {
          onTestcaseEvidence(contextMenu.testcase);
        }
        handleCloseContextMenu();
        break;
      case 'edit':
        if (onTestcaseEdit) {
          await onTestcaseEdit(contextMenu.testcase);
        }
        handleCloseContextMenu();
        break;
      case 'duplicate':
        if (onTestcaseDuplicate) {
          await onTestcaseDuplicate(contextMenu.testcase);
        }
        handleCloseContextMenu();
        break;
      case 'datatest':
        if (onTestcaseDatatest) {
          onTestcaseDatatest(contextMenu.testcase);
        }
        handleCloseContextMenu();
        break;
      case 'delete':
        if (onTestcaseDelete) {
          onTestcaseDelete(contextMenu.testcase);
        }
        handleCloseContextMenu();
        break;
      case 'change_level':
        if (onTestcaseChangeLevel) {
          setChangingLevelTestcase(contextMenu.testcase);
          setNewLevelValue(String(contextMenu.testcase.level ?? 1));
          setIsChangeLevelSubmenuOpen(true);
          onTestcaseChangeLevel(contextMenu.testcase);
        }
        // Don't close the context menu, keep it open to show the submenu
        break;
    }
  }, [contextMenu.testcase, handleCloseContextMenu, onTestcaseEvidence, onTestcaseEdit, onTestcaseDuplicate, onTestcaseDelete, onTestcaseDatatest, onTestcaseChangeLevel]);

  // Suite context menu action handler
  const handleSuiteContextMenuAction = useCallback(async (action: 'run' | 'add_cases' | 'edit' | 'delete') => {
    if (!suiteContextMenu.suite) {
      handleCloseSuiteContextMenu();
      return;
    }

    const suite = suiteContextMenu.suite;
    handleCloseSuiteContextMenu();

    switch (action) {
      case 'run':
        if (onSuiteRun) {
          await onSuiteRun(suite);
        }
        break;
      case 'add_cases':
        if (onSuiteAddCases) {
          onSuiteAddCases(suite);
        }
        break;
      case 'edit':
        if (onSuiteEdit) {
          onSuiteEdit(suite);
        }
        break;
      case 'delete':
        if (onSuiteDelete) {
          onSuiteDelete(suite);
        }
        break;
    }
  }, [suiteContextMenu.suite, handleCloseSuiteContextMenu, onSuiteRun, onSuiteAddCases, onSuiteEdit, onSuiteDelete]);

  // Group context menu action handler
  const handleGroupContextMenuAction = useCallback(async (action: 'new_group' | 'new_suite' | 'rename' | 'delete') => {
    if (!groupContextMenu.group) {
      handleCloseGroupContextMenu();
      return;
    }

    const group = groupContextMenu.group;
    handleCloseGroupContextMenu();

    switch (action) {
      case 'new_group':
        if (onGroupNewGroup) {
          onGroupNewGroup(group);
        }
        break;
      case 'new_suite':
        if (onGroupNewSuite) {
          onGroupNewSuite(group);
        }
        break;
      case 'rename':
        if (onGroupRename) {
          onGroupRename(group);
        }
        break;
      case 'delete':
        if (onGroupDelete) {
          onGroupDelete(group);
        }
        break;
    }
  }, [groupContextMenu.group, handleCloseGroupContextMenu, onGroupNewGroup, onGroupNewSuite, onGroupRename, onGroupDelete]);

  // Change level handlers
  const handleChangeLevelSubmit = useCallback(async (): Promise<boolean> => {
    if (!changingLevelTestcase || !onChangeLevelSubmit || isUpdatingTestcaseLevel) {
      return false;
    }

    const levelValue = parseInt(newLevelValue.trim(), 10);
    if (isNaN(levelValue) || levelValue < 1) {
      // Return false to indicate validation error - component should show toast
      return false;
    }

    // Don't do anything if level hasn't changed
    if (changingLevelTestcase.level === levelValue) {
      setIsChangeLevelSubmenuOpen(false);
      setChangingLevelTestcase(null);
      setNewLevelValue('');
      handleCloseContextMenu();
      return true;
    }

    const success = await onChangeLevelSubmit(changingLevelTestcase.testcase_id, levelValue);
    if (success) {
      setIsChangeLevelSubmenuOpen(false);
      setChangingLevelTestcase(null);
      setNewLevelValue('');
      handleCloseContextMenu();
    }
    return success;
  }, [changingLevelTestcase, newLevelValue, onChangeLevelSubmit, handleCloseContextMenu, isUpdatingTestcaseLevel]);

  const handleChangeLevelCancel = useCallback(() => {
    setIsChangeLevelSubmenuOpen(false);
    setChangingLevelTestcase(null);
    setNewLevelValue('');
  }, []);

  return {
    // State
    contextMenu,
    suiteContextMenu,
    groupContextMenu,
    isChangeLevelSubmenuOpen,
    changingLevelTestcase,
    newLevelValue,
    // Setters (for controlled components)
    setNewLevelValue,
    // Close handlers
    handleCloseContextMenu,
    handleCloseSuiteContextMenu,
    handleCloseGroupContextMenu,
    // Right click handlers
    handleTestcaseRightClick,
    handleTestcaseActionsClick,
    handleSuiteRightClick,
    handleGroupRightClick,
    // Action handlers
    handleContextMenuAction,
    handleSuiteContextMenuAction,
    handleGroupContextMenuAction,
    // Change level handlers
    handleChangeLevelSubmit,
    handleChangeLevelCancel,
    isUpdatingTestcaseLevel,
  };
};

