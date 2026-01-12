import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { Action, ActionType, AssertType, ApiRequestData } from '../../../types/actions';
import { Connection } from '../../../types/actions';
import { ActionService } from '../../../services/actions';
import { receiveActionWithInsert } from '../../../utils/receive_action';
import { PageInfo } from './usePageSelection';

export interface AiElement {
  id: string;
  type: 'Browser' | 'Database' | 'API';
  selector?: string[];
  value?: string;
  domHtml?: string;
  pageIndex?: number | null;
  pageUrl?: string | null;
  pageTitle?: string | null;
  element_data?: Record<string, any>; // Element data từ browser action
  connectionId?: string;
  connection?: Connection;
  query?: string;
  queryResultPreview?: string;
  queryResultData?: any[];
  apiRequest?: ApiRequestData;
  apiResponse?: { status: number; data: any; headers: any };
}

interface UseAiAssertProps {
  testcaseId: string | null;
  selectedInsertPosition: number;
  setSelectedInsertPosition: (pos: number) => void;
  setDisplayInsertPosition: (pos: number) => void;
  setActions: React.Dispatch<React.SetStateAction<Action[]>>;
  setIsDirty: (dirty: boolean) => void;
  setSelectedAssert: (assert: string | null) => void;
  setIsAssertMode: (mode: boolean) => void;
  selectedPageInfo?: PageInfo | null;
}

const createDefaultApiRequest = (): ApiRequestData => ({
  method: 'get',
  url: 'https://',
  params: [],
  headers: [],
  auth: { type: 'none', storage_enabled: false },
  body: { type: 'none', content: '', form_datas: [] },
});

export const useAiAssert = ({
  testcaseId,
  selectedInsertPosition,
  setSelectedInsertPosition,
  setDisplayInsertPosition,
  setActions,
  setIsDirty,
  setSelectedAssert,
  setIsAssertMode,
  selectedPageInfo,
}: UseAiAssertProps) => {
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiElements, setAiElements] = useState<AiElement[]>([]);
  const actionService = new ActionService();

  const handleAiAddBrowserElement = useCallback(() => {
    setAiElements(prev => [
      ...prev,
      {
        id: Math.random().toString(36),
        type: 'Browser' as const,
        selector: [],
        value: '',
        domHtml: '',
        pageIndex: null,
      },
    ]);
  }, []);

  const handleAiAddDatabaseElement = useCallback(() => {
    setAiElements(prev => [
      ...prev,
      { id: Math.random().toString(36), type: 'Database' as const, selector: [] },
    ]);
  }, []);

  const handleAiAddApiElement = useCallback(() => {
    setAiElements(prev => [
      ...prev,
      {
        id: Math.random().toString(36),
        type: 'API' as const,
        apiRequest: createDefaultApiRequest(),
      },
    ]);
  }, []);

  const handleAiClearBrowserElement = useCallback((elementId: string) => {
    setAiElements(prev =>
      prev.map(el =>
        el.id === elementId && el.type === 'Browser'
          ? { ...el, selector: [], value: '', domHtml: '', pageIndex: null, element_data: undefined }
          : el
      )
    );
  }, []);

  const handleAiSubmit = useCallback(async (): Promise<boolean> => {
    if (!aiPrompt || !aiPrompt.trim()) {
      toast.error('Prompt is required');
      return false;
    }
    if (!aiElements || aiElements.length === 0) {
      toast.error('Please add at least one element');
      return false;
    }
    const invalidDb = aiElements.some(el => el.type === 'Database' && (
      !el.query || !el.query.trim() || !el.queryResultData || el.queryResultData.length === 0
    ));
    if (invalidDb) {
      toast.error('Database elements must have a query and previewed result data');
      return false;
    }
    
    const browserElements = aiElements
      .map((el, originalIndex) => ({ el, originalIndex }))
      .filter(item => item.el.type === 'Browser');

    const HTMLElements = browserElements.map(item => ({
      domHtml: item.el.domHtml || '',
      selectors: item.el.selector?.map(s => ({ value: s })) || [],
    }));

    // element_index: số thứ tự chỉ trong browser elements (0, 1, 2...)
    // page_index: page mà element được chọn (từ el.pageIndex)
    const browserElementData = browserElements.map((item, browserIndex) => ({
      element_index: browserIndex, // Index chỉ trong browser elements
      page_index: typeof item.el.pageIndex === 'number' ? item.el.pageIndex : null,
      page_url: item.el.pageUrl || null,
      page_title: item.el.pageTitle || null,
    }));

    const databaseElements = aiElements
      .filter(el => el.type === 'Database')
      .map(el => ({
        data: el.queryResultPreview || '',
        connection: el.connection,
        query: el.query || '',
      }));

    const apiRequests = aiElements
      .filter(el => el.type === 'API')
      .map(el => {
        const url = el.apiRequest?.url || '';
        let endpoint = url;
        try {
          const u = new URL(url);
          endpoint = u.pathname || url;
        } catch {
          // keep raw url/path if not absolute URL
        }
        const method = String(el.apiRequest?.method || 'get').toUpperCase();
        const status = el.apiResponse?.status ?? 0;
        const headers = el.apiResponse?.headers || {};
        
        let payload: any = undefined;
        if (el.apiResponse?.data !== undefined && el.apiResponse?.data !== null) {
          payload = el.apiResponse.data;
        } else if (el.apiRequest?.body) {
          const body = el.apiRequest.body;
          if (body.type === 'json' && body.content) {
            try {
              payload = JSON.parse(body.content);
            } catch {
              payload = body.content;
            }
          } else if (body.type === 'form' && body.form_datas) {
            payload = body.form_datas.reduce((acc: any, item) => {
              acc[item.name] = item.value;
              return acc;
            }, {});
          }
        }
        
        const responseTimeHeader = headers?.['x-response-time'] ?? headers?.['X-Response-Time'];
        const responseTime = responseTimeHeader !== undefined ? Number(responseTimeHeader) : undefined;
        const name = (() => {
          const parts = (endpoint || '/').split('/').filter(Boolean);
          if (parts.length >= 2) return `${parts[parts.length - 2]}_${parts[parts.length - 1]}`;
          if (parts.length === 1) return `${parts[0]}_api`;
          return 'api_request';
        })();

        return { name, endpoint, method, status, headers, response_time: responseTime, payload };
      });

    const request: any = {
      testcase_id: testcaseId || '',
      elements: HTMLElements,
      database_results: databaseElements,
      prompt: aiPrompt,
      api_requests: apiRequests,
    };
    
    setIsGeneratingAi(true);
    try {
      const response = await actionService.generateAiAssert(request);

      if (!response.success) {
        const errorMessage =
          (response as any)?.error ||
          (response as any)?.message ||
          'Failed to generate AI assertion';
        toast.error(String(errorMessage));
        return false;
      }

      const functionCode = (response as any).data?.function_code;
      const functionName = (response as any).data?.function_name;
      
      if (!functionCode || !functionCode.trim()) {
        const errorMessage = 'function_code is required but not provided';
        /* console.error('[useAiAssert] generateAiAssert validation failed:', errorMessage, response); */
        toast.error(errorMessage);
        return false;
      }
      
      if (!functionName || !functionName.trim()) {
        const errorMessage = 'function_name is required but not provided';
        toast.error(errorMessage);
        return false;
      }

      const apiRequestElements = aiElements.filter(el => el.type === 'API' && el.apiRequest);
      const apiRequestDataList = apiRequestElements.map(el => el.apiRequest!);

      const actionDatas: any[] = [];
      
      actionDatas.push({
        value: { 
          function_code: functionCode,
          function_name: functionName,
        }
      });
      for (const browserData of browserElementData) {
        actionDatas.push({
          value: {
            element_index: browserData.element_index,
            page_index: browserData.page_index,
            ...(browserData.page_url && { page_url: browserData.page_url }),
            ...(browserData.page_title && { page_title: browserData.page_title }),
          }
        });
      }
      for (const databaseElement of databaseElements) {
        if (databaseElement.connection?.connection_id && databaseElement.query) {
          actionDatas.push({
            statement: {
              statement_text: databaseElement.query,
              connection_id: databaseElement.connection?.connection_id,
              connection: databaseElement?.connection,
            }
          });
        }
      }
      for (const apiRequest of apiRequestDataList) {
        const actionData: any = {
          api_request: apiRequest
        };
        // Thêm page_index vào action data nếu có selectedPageInfo và API có storage enabled
        if (selectedPageInfo && apiRequest.auth?.storage_enabled === true) {
          actionData.value = {
            page_index: selectedPageInfo.page_index,
          };
        }
        actionDatas.push(actionData);
      }
      // Tạo elements với đầy đủ thông tin (selectors, order_index, element_data)
      const html_element_action = browserElements.map((item, idx) => {
        const aiElement = item.el;
        return {
          selectors: aiElement.selector?.map(s => ({ value: s })) || [],
          order_index: idx + 1, // Set order_index theo thứ tự (1, 2, 3, ...)
          element_data: aiElement.element_data, // Giữ lại element_data từ browser action
        };
      });
      const aiAction = {
        action_type: ActionType.assert,
        assert_type: AssertType.ai,
        description: (response as any).data.description || '',
        elements: html_element_action,
        action_datas: actionDatas
      };

      setActions(prev => {
        const next = receiveActionWithInsert(
          testcaseId || '',
          prev,
          aiAction,
          selectedInsertPosition
        );
        const newPos = Math.min((selectedInsertPosition ?? 0) + 1, next.length);
        setSelectedInsertPosition(newPos);
        setDisplayInsertPosition(newPos);
        setIsDirty(true);
        return next;
      });
      toast.success('Successfully generated AI assertion');

      setSelectedAssert(null);
      setIsAssertMode(false);
      (window as any).browserAPI?.browser?.setAssertMode(false, '' as any);
      return true;
    } catch (e: any) {
      // console.error('[useAiAssert] generateAiAssert exception:', e);
      const message = e?.message || e?.error || e?.reason || e;
      toast.error(String(message || 'Failed to generate AI assertion'));
      return false;
    } finally {
      setIsGeneratingAi(false);
    }
  }, [aiPrompt, aiElements, testcaseId, selectedInsertPosition, setSelectedInsertPosition, setDisplayInsertPosition, setActions, setIsDirty, setSelectedAssert, setIsAssertMode, selectedPageInfo]);

  const resetAiAssert = useCallback(() => {
    setAiPrompt('');
    setAiElements([]);
  }, []);

  return {
    isGeneratingAi,
    aiPrompt,
    setAiPrompt,
    aiElements,
    setAiElements,
    handleAiAddBrowserElement,
    handleAiAddDatabaseElement,
    handleAiAddApiElement,
    handleAiClearBrowserElement,
    handleAiSubmit,
    resetAiAssert,
  };
};

