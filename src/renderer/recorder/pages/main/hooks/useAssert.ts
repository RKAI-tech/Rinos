import { useState, useMemo, useCallback } from 'react';
import { AssertType, ActionType } from '../../../types/actions';
import { Action } from '../../../types/actions';
import { receiveAction } from '../../../utils/receive_action';

interface UseAssertProps {
  testcaseId: string | null;
  isBrowserOpen: boolean;
  setActions: React.Dispatch<React.SetStateAction<Action[]>>;
  setIsDirty: (dirty: boolean) => void;
  setIsAiModalOpen: (open: boolean) => void;
  setIsUrlInputOpen: (open: boolean) => void;
  setIsTitleInputOpen: (open: boolean) => void;
  setIsCssInputOpen: (open: boolean) => void;
  setIsAssertWithValueModalOpen: (open: boolean) => void;
}

export const useAssert = ({
  testcaseId,
  isBrowserOpen,
  setActions,
  setIsDirty,
  setIsAiModalOpen,
  setIsUrlInputOpen,
  setIsTitleInputOpen,
  setIsCssInputOpen,
  setIsAssertWithValueModalOpen,
}: UseAssertProps) => {
  const [isAssertDropdownOpen, setIsAssertDropdownOpen] = useState(false);
  const [assertSearch, setAssertSearch] = useState('');
  const [selectedAssert, setSelectedAssert] = useState<string | null>(null);
  const [isAssertMode, setIsAssertMode] = useState(false);

  const assertTypes = Object.values(AssertType);
  const filteredAssertTypes = assertTypes.filter(type =>
    type.toLowerCase().includes(assertSearch.toLowerCase())
  );

  const handleAssertClick = useCallback(async () => {
    if (selectedAssert) {
      setSelectedAssert(null);
      setIsAssertDropdownOpen(false);
      setAssertSearch('');
      setIsAssertMode(false);
      await (window as any).browserAPI?.browser?.setAssertMode(false, '');
    } else if (isAssertDropdownOpen) {
      setIsAssertDropdownOpen(false);
      setAssertSearch('');
      setIsAssertMode(false);
      await (window as any).browserAPI?.browser?.setAssertMode(false, '');
    } else {
      setIsAssertDropdownOpen(true);
    }
  }, [selectedAssert, isAssertDropdownOpen]);

  const removeSelectedAssert = useCallback(async () => {
    setSelectedAssert(null);
    setIsAssertDropdownOpen(false);
    setAssertSearch('');
    setIsAssertMode(false);
    await (window as any).browserAPI?.browser?.setAssertMode(false, '');
  }, []);

  const handleAssertSelect = useCallback(async (assertType: string) => {
    setSelectedAssert(assertType);
    setIsAssertDropdownOpen(false);
    setAssertSearch('');
    setIsAssertMode(true);
    if ((assertType as any) === AssertType.ai || assertType === 'AI') {
      setIsAiModalOpen(true);
    } else if (assertType === AssertType.pageHasAURL) {
      setIsUrlInputOpen(true);
    } else if (assertType === AssertType.pageHasATitle) {
      setIsTitleInputOpen(true);
    } else if (assertType === AssertType.toHaveCSS) {
      setIsCssInputOpen(true);
    } else if (assertType === AssertType.toHaveText || assertType === AssertType.toContainText || assertType === AssertType.toHaveValue) {
      setIsAssertWithValueModalOpen(true);
    }
    await (window as any).browserAPI?.browser?.setAssertMode(true, assertType as AssertType);
  }, [setIsAiModalOpen, setIsUrlInputOpen, setIsTitleInputOpen, setIsCssInputOpen, setIsAssertWithValueModalOpen]);

  const handleUrlConfirm = useCallback((url: string, pageInfo?: { page_index: number; page_url: string; page_title: string }) => {
    setActions(prev => {
      const actionData: any = {
        action_type: ActionType.assert,
        assert_type: AssertType.pageHasAURL,
        value: url,
        description: pageInfo ? `Verify page ${pageInfo.page_title || pageInfo.page_url} has URL ${url}` : `Verify the page has URL ${url}`,
        action_datas: [
          {
            value: {
              value: url,
              ...(pageInfo ? {
                page_index: pageInfo.page_index,
                page_url: pageInfo.page_url,
                page_title: pageInfo.page_title,
              } : {}),
            },
          },
        ],
      };

      const next = receiveAction(testcaseId || '', prev, actionData);
      setIsDirty(true);
      return next;
    });
    
    setSelectedAssert(null);
    setIsAssertMode(false);
    setIsUrlInputOpen(false);
    (window as any).browserAPI?.browser?.setAssertMode(false, '' as any);
  }, [testcaseId, setActions, setIsDirty, setIsUrlInputOpen]);

  const handleTitleConfirm = useCallback((title: string, pageInfo?: { page_index: number; page_url: string; page_title: string }) => {
    setActions(prev => {
      const actionData: any = {
        action_type: ActionType.assert,
        assert_type: AssertType.pageHasATitle,
        value: title,
        description: pageInfo ? `Verify page ${pageInfo.page_title || pageInfo.page_url} has title ${title}` : `Verify the page has title ${title}`,
        action_datas: [
          {
            value: {
              value: title,
              ...(pageInfo ? {
                page_index: pageInfo.page_index,
                page_url: pageInfo.page_url,
                page_title: pageInfo.page_title,
              } : {}),
            },
          },
        ],
      };

      const next = receiveAction(testcaseId || '', prev, actionData);
      setIsDirty(true);
      return next;
    });
    
    setSelectedAssert(null);
    setIsAssertMode(false);
    setIsTitleInputOpen(false);
    (window as any).browserAPI?.browser?.setAssertMode(false, '' as any);
  }, [testcaseId, setActions, setIsDirty, setIsTitleInputOpen]);

  const handleUrlCancel = useCallback(() => {
    setSelectedAssert(null);
    setIsAssertMode(false);
    setIsUrlInputOpen(false);
    (window as any).browserAPI?.browser?.setAssertMode(false, '' as any);
  }, [setIsUrlInputOpen]);

  const handleTitleCancel = useCallback(() => {
    setSelectedAssert(null);
    setIsAssertMode(false);
    setIsTitleInputOpen(false);
    (window as any).browserAPI?.browser?.setAssertMode(false, '' as any);
  }, [setIsTitleInputOpen]);

  const handleCssConfirm = useCallback((cssProperty: string, cssValue: string, element: {
    selectors: string[];
    domHtml: string;
    value: string;
    pageIndex?: number | null;
    pageUrl?: string | null;
    pageTitle?: string | null;
    element_data?: Record<string, any>;
  }, pageInfo?: { page_index: number; page_url: string; page_title: string }) => {
    setActions(prev => {
      const actionData: any = {
        action_type: ActionType.assert,
        assert_type: AssertType.toHaveCSS,
        value: cssValue,
        description: `Verify element has CSS ${cssProperty}: ${cssValue}`,
        elements: [
          {
            selectors: element.selectors.map(s => ({ value: s })),
            order_index: 1,
            element_data: element.element_data,
          },
        ],
        action_datas: [
          {
            value: {
              css_property: cssProperty,
              css_value: cssValue,
              ...(pageInfo ? {
                page_index: pageInfo.page_index,
                page_url: pageInfo.page_url,
                page_title: pageInfo.page_title,
              } : {}),
            },
          },
        ],
      };

      const next = receiveAction(testcaseId || '', prev, actionData);
      setIsDirty(true);
      return next;
    });
    
    setSelectedAssert(null);
    setIsAssertMode(false);
    setIsCssInputOpen(false);
    (window as any).browserAPI?.browser?.setAssertMode(false, '' as any);
  }, [testcaseId, setActions, setIsDirty, setIsCssInputOpen]);

  const handleCssCancel = useCallback(() => {
    setSelectedAssert(null);
    setIsAssertMode(false);
    setIsCssInputOpen(false);
    (window as any).browserAPI?.browser?.setAssertMode(false, '' as any);
  }, [setIsCssInputOpen]);

  return {
    isAssertDropdownOpen,
    setIsAssertDropdownOpen,
    assertSearch,
    setAssertSearch,
    selectedAssert,
    setSelectedAssert,
    isAssertMode,
    setIsAssertMode,
    assertTypes,
    filteredAssertTypes,
    handleAssertClick,
    removeSelectedAssert,
    handleAssertSelect,
    handleUrlConfirm,
    handleTitleConfirm,
    handleUrlCancel,
    handleTitleCancel,
    handleCssConfirm,
    handleCssCancel,
  };
};

