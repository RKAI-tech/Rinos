import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { Action, ActionType, AssertType, ApiRequestData, Statement } from '../../../types/actions';
import { receiveActionWithInsert } from '../../../utils/receive_action';
import { PageInfo } from './usePageSelection';

interface UseAssertWithValueProps {
  testcaseId: string | null;
  assertType: AssertType;
  selectedInsertPosition: number;
  setSelectedInsertPosition: (pos: number) => void;
  setDisplayInsertPosition: (pos: number) => void;
  setActions: React.Dispatch<React.SetStateAction<Action[]>>;
  setIsDirty: (dirty: boolean) => void;
  setSelectedAssert: (assert: string | null) => void;
  setIsAssertMode: (mode: boolean) => void;
  selectedPageInfo?: PageInfo | null;
}

export const useAssertWithValue = ({
  testcaseId,
  assertType,
  selectedInsertPosition,
  setSelectedInsertPosition,
  setDisplayInsertPosition,
  setActions,
  setIsDirty,
  setSelectedAssert,
  setIsAssertMode,
  selectedPageInfo,
}: UseAssertWithValueProps) => {
  const handleConfirm = useCallback(async (
    value: string,
    element: {
      selectors: string[];
      domHtml: string;
      value: string;
      pageIndex?: number | null;
      pageUrl?: string | null;
      pageTitle?: string | null;
      element_data?: Record<string, any>;
    },
    pageInfo?: PageInfo,
    statement?: Statement,
    apiRequest?: ApiRequestData
  ): Promise<boolean> => {
    if (!value || !value.trim()) {
      toast.error('Value is required');
      return false;
    }
    if (!element || !element.selectors || element.selectors.length === 0) {
      toast.error('Element is required');
      return false;
    }

    const actionDatas: any[] = [];
    
    // Add value
    actionDatas.push({
      value: {
        value: value.trim(),
        htmlDOM: element.domHtml,
        elementText: element.value,
      }
    });

    // Add page info if available
    if (pageInfo) {
      actionDatas.push({
        value: {
          page_index: pageInfo.page_index,
          page_url: pageInfo.page_url,
          page_title: pageInfo.page_title,
        }
      });
    }

    // Add database statement if provided
    if (statement) {
      actionDatas.push({
        statement: {
          statement_id: statement.statement_id || '',
          statement_text: statement.query || '',
          connection_id: (statement.connection as any)?.connection_id || '',
          connection: statement.connection ? {
            ...statement.connection,
            port: statement.connection.port !== undefined ? String(statement.connection.port) : undefined,
          } : undefined,
        }
      });
    }

    // Add API request if provided
    if (apiRequest) {
      const actionData: any = {
        api_request: apiRequest
      };
      if (selectedPageInfo && apiRequest.auth?.storage_enabled === true) {
        actionData.value = {
          page_index: selectedPageInfo.page_index,
        };
      }
      actionDatas.push(actionData);
    }

    // Build element
    const html_element_action = [{
      selectors: element.selectors.map(s => ({ value: s })),
      order_index: 1,
      element_data: element.element_data,
    }];

    const assertAction = {
      action_type: ActionType.assert,
      assert_type: assertType,
      description: `Verify element has ${assertType} value: ${value.trim()}`,
      elements: html_element_action,
      action_datas: actionDatas
    };

    try {
      setActions(prev => {
        const next = receiveActionWithInsert(
          testcaseId || '',
          prev,
          assertAction,
          selectedInsertPosition
        );
        const newPos = Math.min((selectedInsertPosition ?? 0) + 1, next.length);
        setSelectedInsertPosition(newPos);
        setDisplayInsertPosition(newPos);
        setIsDirty(true);
        return next;
      });
      toast.success(`Successfully created ${assertType} assertion`);

      setSelectedAssert(null);
      setIsAssertMode(false);
      (window as any).browserAPI?.browser?.setAssertMode(false, '' as any);
      return true;
    } catch (e: any) {
      console.error('[useAssertWithValue] submit exception:', e);
      const message = e?.message || e?.error || e?.reason || e;
      toast.error(String(message || 'Failed to create assertion'));
      return false;
    }
  }, [assertType, testcaseId, selectedInsertPosition, setSelectedInsertPosition, setDisplayInsertPosition, setActions, setIsDirty, setSelectedAssert, setIsAssertMode, selectedPageInfo]);

  return {
    handleConfirm,
  };
};
