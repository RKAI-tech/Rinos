import { useEffect, useRef, useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { toast } from 'react-toastify';
import { Action } from '../../../types/actions';
import { receiveActionWithInsert } from '../../../utils/receive_action';
import { PageInfo } from './usePageSelection';
import { AiElement } from './useAiAssert';

interface UseActionListenerProps {
  testcaseId: string | null | undefined;
  isPaused: boolean;
  selectedInsertPosition: number;
  isAssertMode: boolean;
  isAnyModalOpen: boolean;
  actions: Action[];
  setActions: React.Dispatch<React.SetStateAction<Action[]>>;
  setSelectedInsertPosition: Dispatch<SetStateAction<number>>;
  setIsDirty: (dirty: boolean) => void;
  setExecutingActionIndex: (index: number | null) => void;
  setFailedActionIndex: (index: number | null) => void;
  // Page selection modals
  isActionTabWaitOpen: boolean;
  isActionTabNavigateOpen: boolean;
  isActionTabBrowserActionOpen: boolean;
  isActionTabAddBrowserStorageOpen: boolean;
  isActionTabApiRequestOpen: boolean;
  isUrlInputOpen: boolean;
  isTitleInputOpen: boolean;
  isAiAssertOpen: boolean;
  setWaitSelectedPageInfo: (info: PageInfo | null) => void;
  setNavigateSelectedPageInfo: (info: PageInfo | null) => void;
  setBrowserActionSelectedPageInfo: (info: PageInfo | null) => void;
  setAddBrowserStorageSelectedPageInfo: (info: PageInfo | null) => void;
  setApiRequestSelectedPageInfo: (info: PageInfo | null) => void;
  setUrlInputSelectedPageInfo: (info: PageInfo | null) => void;
  setTitleInputSelectedPageInfo: (info: PageInfo | null) => void;
  aiAssertSelectedPageInfo: PageInfo | null;
  setAiAssertSelectedPageInfo: (info: PageInfo | null) => void;
  // AI Assert
  setAiElements: React.Dispatch<React.SetStateAction<AiElement[]>>;
}

export const useActionListener = ({
  testcaseId,
  isPaused,
  selectedInsertPosition,
  isAssertMode,
  isAnyModalOpen,
  actions,
  setActions,
  setSelectedInsertPosition,
  setIsDirty,
  setExecutingActionIndex,
  setFailedActionIndex,
  isActionTabWaitOpen,
  isActionTabNavigateOpen,
  isActionTabBrowserActionOpen,
  isActionTabAddBrowserStorageOpen,
  isActionTabApiRequestOpen,
  isUrlInputOpen,
  isTitleInputOpen,
  isAiAssertOpen,
  setWaitSelectedPageInfo,
  setNavigateSelectedPageInfo,
  setBrowserActionSelectedPageInfo,
  setAddBrowserStorageSelectedPageInfo,
  setApiRequestSelectedPageInfo,
  setUrlInputSelectedPageInfo,
  setTitleInputSelectedPageInfo,
  aiAssertSelectedPageInfo,
  setAiAssertSelectedPageInfo,
  setAiElements,
}: UseActionListenerProps) => {
  // Ref để tránh duplicate toast
  const lastPageInfoUpdateRef = useRef<{ pageIndex: number | null; timestamp: number } | null>(null);
  const latestPropsRef = useRef({
    testcaseId,
    isPaused,
    selectedInsertPosition,
    isAssertMode,
    isAnyModalOpen,
    setActions,
    setSelectedInsertPosition,
    setIsDirty,
    setExecutingActionIndex,
    setFailedActionIndex,
  });
  const actionQueueRef = useRef<any[]>([]);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    latestPropsRef.current = {
      testcaseId,
      isPaused,
      selectedInsertPosition,
      isAssertMode,
      isAnyModalOpen,
      setActions,
      setSelectedInsertPosition,
      setIsDirty,
      setExecutingActionIndex,
      setFailedActionIndex,
    };
  }, [
    testcaseId,
    isPaused,
    selectedInsertPosition,
    isAssertMode,
    isAnyModalOpen,
    setActions,
    setSelectedInsertPosition,
    setIsDirty,
    setExecutingActionIndex,
    setFailedActionIndex,
  ]);

  const processActionQueue = useCallback(() => {
    if (isProcessingRef.current) return;
    const processNext = () => {
      if (actionQueueRef.current.length === 0) {
        isProcessingRef.current = false;
        return;
      }

      const action = actionQueueRef.current.shift();
      if (!action) {
        isProcessingRef.current = false;
        return;
      }

      const {
        testcaseId: currentTestcaseId,
        isPaused: currentIsPaused,
        isAssertMode: currentIsAssertMode,
        isAnyModalOpen: currentIsAnyModalOpen,
        selectedInsertPosition: currentInsertPosition,
        setActions: currentSetActions,
        setSelectedInsertPosition: currentSetSelectedInsertPosition,
        setIsDirty: currentSetIsDirty,
        setExecutingActionIndex: currentSetExecutingActionIndex,
        setFailedActionIndex: currentSetFailedActionIndex,
      } = latestPropsRef.current;

      if (!currentTestcaseId || currentIsPaused) {
        setTimeout(processNext, 0);
        return;
      }

      currentSetExecutingActionIndex(null);
      currentSetFailedActionIndex(null);

      if (currentIsAssertMode && action.action_type !== 'assert') {
        setTimeout(processNext, 0);
        return;
      }

      currentSetActions((prev) => {
        const next = receiveActionWithInsert(
          currentTestcaseId,
          prev,
          action,
          currentInsertPosition,
          currentIsAnyModalOpen
        );

        // currentSetSelectedInsertPosition(() => {
        //   const updatedPos = next.length;
        //   latestPropsRef.current.selectedInsertPosition = updatedPos;
        //   return updatedPos;
        // });
        const insertedCount = next.length - prev.length;
        currentSetSelectedInsertPosition(() => {
          const updatedPos = Math.min(
            currentInsertPosition + insertedCount,
            next.length
          );
          latestPropsRef.current.selectedInsertPosition = updatedPos;
          return updatedPos;
        });

        currentSetIsDirty(true);

        setTimeout(processNext, 0);
        return next;
      });
    };

    isProcessingRef.current = true;
    processNext();
  }, []);
  
  useEffect(() => {
    return (window as any).browserAPI?.browser?.onAction(async (action: any) => {

      if (isPaused) return;
      if (!testcaseId) return;
      
      // Handle page selection for WaitModal
      if (isActionTabWaitOpen && action?.action_type === 'click') {
        console.log('[useActionListener] Click event received while WaitModal is open:', action);
        let pageInfo = null;
        if (action?.action_datas && Array.isArray(action.action_datas)) {
          for (const ad of action.action_datas) {
            if (ad.value?.page_index !== undefined) {
              pageInfo = ad.value;
              break;
            }
          }
        }
        
        if (pageInfo) {
          const pageData: PageInfo = {
            page_index: pageInfo.page_index || 0,
            page_url: pageInfo.page_url || '',
            page_title: pageInfo.page_title || '',
          };
          console.log('[useActionListener] Page selected/updated for WaitModal:', pageData);
          setWaitSelectedPageInfo(pageData);
          return;
        } else {
          console.warn('[useActionListener] No page info found in click action. action_datas:', action?.action_datas);
        }
      }

      // Handle page selection for NavigateModal
      if (isActionTabNavigateOpen && action?.action_type === 'click') {
        console.log('[useActionListener] Click event received while NavigateModal is open:', action);
        let pageInfo = null;
        if (action?.action_datas && Array.isArray(action.action_datas)) {
          for (const ad of action.action_datas) {
            if (ad.value?.page_index !== undefined) {
              pageInfo = ad.value;
              break;
            }
          }
        }
        
        if (pageInfo) {
          const pageData: PageInfo = {
            page_index: pageInfo.page_index || 0,
            page_url: pageInfo.page_url || '',
            page_title: pageInfo.page_title || '',
          };
          console.log('[useActionListener] Page selected/updated for NavigateModal:', pageData);
          setNavigateSelectedPageInfo(pageData);
          return;
        } else {
          console.warn('[useActionListener] No page info found in click action. action_datas:', action?.action_datas);
        }
      }

      // Handle page selection for BrowserActionModal
      if (isActionTabBrowserActionOpen && action?.action_type === 'click') {
        console.log('[useActionListener] Click event received while BrowserActionModal is open:', action);
        let pageInfo = null;
        if (action?.action_datas && Array.isArray(action.action_datas)) {
          for (const ad of action.action_datas) {
            if (ad.value?.page_index !== undefined) {
              pageInfo = ad.value;
              break;
            }
          }
        }
        
        if (pageInfo) {
          const pageData: PageInfo = {
            page_index: pageInfo.page_index || 0,
            page_url: pageInfo.page_url || '',
            page_title: pageInfo.page_title || '',
          };
          console.log('[useActionListener] Page selected/updated for BrowserActionModal:', pageData);
          setBrowserActionSelectedPageInfo(pageData);
          return;
        } else {
          console.warn('[useActionListener] No page info found in click action. action_datas:', action?.action_datas);
        }
      }

      // Handle page selection for AddBrowserStorageModal
      if (isActionTabAddBrowserStorageOpen && action?.action_type === 'click') {
        console.log('[useActionListener] Click event received while AddBrowserStorageModal is open:', action);
        let pageInfo = null;
        if (action?.action_datas && Array.isArray(action.action_datas)) {
          for (const ad of action.action_datas) {
            if (ad.value?.page_index !== undefined) {
              pageInfo = ad.value;
              break;
            }
          }
        }
        
        if (pageInfo) {
          const pageData: PageInfo = {
            page_index: pageInfo.page_index || 0,
            page_url: pageInfo.page_url || '',
            page_title: pageInfo.page_title || '',
          };
          console.log('[useActionListener] Page selected/updated for AddBrowserStorageModal:', pageData);
          setAddBrowserStorageSelectedPageInfo(pageData);
          return;
        } else {
          console.warn('[useActionListener] No page info found in click action. action_datas:', action?.action_datas);
        }
      }

      // Handle page selection for ApiRequestModal
      if (isActionTabApiRequestOpen && action?.action_type === 'click') {
        console.log('[useActionListener] Click event received while ApiRequestModal is open:', action);
        let pageInfo = null;
        if (action?.action_datas && Array.isArray(action.action_datas)) {
          for (const ad of action.action_datas) {
            if (ad.value?.page_index !== undefined) {
              pageInfo = ad.value;
              break;
            }
          }
        }
        
        if (pageInfo) {
          const pageData: PageInfo = {
            page_index: pageInfo.page_index || 0,
            page_url: pageInfo.page_url || '',
            page_title: pageInfo.page_title || '',
          };
          console.log('[useActionListener] Page selected/updated for ApiRequestModal:', pageData);
          setApiRequestSelectedPageInfo(pageData);
          return;
        } else {
          console.warn('[useActionListener] No page info found in click action. action_datas:', action?.action_datas);
        }
      }

      // Handle page selection for URLInputModal (assert URL)
      if (isUrlInputOpen && action?.action_type === 'click') {
        console.log('[useActionListener] Click event received while URLInputModal is open:', action);
        let pageInfo = null;
        if (action?.action_datas && Array.isArray(action.action_datas)) {
          for (const ad of action.action_datas) {
            if (ad.value?.page_index !== undefined) {
              pageInfo = ad.value;
              break;
            }
          }
        }
        
        if (pageInfo) {
          const pageData: PageInfo = {
            page_index: pageInfo.page_index || 0,
            page_url: pageInfo.page_url || '',
            page_title: pageInfo.page_title || '',
          };
          setUrlInputSelectedPageInfo(pageData);
          return;
        } else {
          console.warn('[useActionListener] No page info found in click action. action_datas:', action?.action_datas);
        }
      }

      // Handle page selection for TitleInputModal (assert title)
      if (isTitleInputOpen && action?.action_type === 'click') {
        console.log('[useActionListener] Click event received while TitleInputModal is open:', action);
        let pageInfo = null;
        if (action?.action_datas && Array.isArray(action.action_datas)) {
          for (const ad of action.action_datas) {
            if (ad.value?.page_index !== undefined) {
              pageInfo = ad.value;
              break;
            }
          }
        }
        
        if (pageInfo) {
          const pageData: PageInfo = {
            page_index: pageInfo.page_index || 0,
            page_url: pageInfo.page_url || '',
            page_title: pageInfo.page_title || '',
          };
          setTitleInputSelectedPageInfo(pageData);
          return;
        } else {
          console.warn('[useActionListener] No page info found in click action. action_datas:', action?.action_datas);
        }
      }
      
      // AI assert goes to modal only
      if ((action?.action_type === 'assert') && (action?.assert_type === 'AI')) {
        let pageIndex: number | null = null;
        let pageUrl: string | null = null;
        let pageTitle: string | null = null;
        if (Array.isArray(action?.action_datas)) {
          for (const ad of action.action_datas) {
            if (ad?.value?.page_index !== undefined && ad?.value?.page_index !== null) {
              pageIndex = Number(ad.value.page_index);
              pageUrl = ad.value.page_url || null;
              pageTitle = ad.value.page_title || null;
              break;
            }
          }
        }
        const selectors = action.elements?.[0]?.selectors?.map((s: any) => s.value) || [];
        const domHtml = action.action_datas?.[0]?.value?.htmlDOM || '';
        const elementText = action.action_datas?.[0]?.value?.elementText || '';

        if (!selectors.length && !domHtml) {
          toast.warn('Failed to capture element. Please click again.');
          return;
        }

        // Chỉ xử lý khi AI Assert modal đang mở
        if (!isAiAssertOpen) {
          return;
        }

        setAiElements(prev => {
          const placeholderIdx = prev.findIndex(
            el =>
              el.type === 'Browser' &&
              (!el.selector || el.selector.length === 0) &&
              !(el.domHtml && el.domHtml.trim())
          );
          if (placeholderIdx === -1) {
            // Không có browser element placeholder, kiểm tra xem có API element nào cần page info không
            // Kiểm tra dựa vào storage_enabled flag (khi user click enable storage)
            const hasApiWithStorage = prev.some(
              el => el.type === 'API' && 
              el.apiRequest?.auth && 
              el.apiRequest.auth.type !== 'none' &&
              el.apiRequest.auth.storage_enabled === true
            );
            
            // Chỉ cập nhật nếu chưa có page info
            if (hasApiWithStorage && pageIndex !== null && !aiAssertSelectedPageInfo) {
              // Kiểm tra xem có phải duplicate action không (cùng pageIndex trong vòng 500ms)
              const now = Date.now();
              const lastUpdate = lastPageInfoUpdateRef.current;
              const isDuplicate = lastUpdate && 
                lastUpdate.pageIndex === pageIndex && 
                (now - lastUpdate.timestamp) < 500;
              
              if (!isDuplicate) {
                // Có API element cần page info và chưa có page info, cập nhật page info (sử dụng setTimeout để tránh setState trong render)
                lastPageInfoUpdateRef.current = { pageIndex, timestamp: now };
                setTimeout(() => {
                  const pageData: PageInfo = {
                    page_index: pageIndex,
                    page_url: pageUrl || '',
                    page_title: pageTitle || '',
                  };
                  setAiAssertSelectedPageInfo(pageData);
                  toast.success('Page selected for API elements');
                }, 0);
              }
            } else if (!hasApiWithStorage) {
              // Chỉ hiển thị warning nếu không có API element nào cần page info
              setTimeout(() => {
                toast.warn('Please add a browser element first.');
              }, 0);
            }else{
              toast.warn('Please add a browser element first.');
            }
            return prev;
          }
          const next = [...prev];
          const target = next[placeholderIdx];
          next[placeholderIdx] = {
            ...target,
            selector: selectors,
            domHtml,
            value: elementText,
            pageIndex,
            pageUrl: pageUrl || null,
            pageTitle: pageTitle || null,
          };
          return next;
        });
        return;
      }

      // Skip action if any modal is open
      if (isAnyModalOpen) {
        console.log('[useActionListener] Skipping action - modal is open');
        return;
      }
      
      // Thêm action vào hàng đợi và xử lý tuần tự
      actionQueueRef.current.push(action);
      processActionQueue();
    });
  }, [
    testcaseId,
    isPaused,
    selectedInsertPosition,
    isAssertMode,
    isAnyModalOpen,
    isActionTabWaitOpen,
    isActionTabNavigateOpen,
    isActionTabBrowserActionOpen,
    isActionTabAddBrowserStorageOpen,
    isActionTabApiRequestOpen,
    isUrlInputOpen,
    isTitleInputOpen,
    isAiAssertOpen,
    setWaitSelectedPageInfo,
    setNavigateSelectedPageInfo,
    setBrowserActionSelectedPageInfo,
    setAddBrowserStorageSelectedPageInfo,
    setApiRequestSelectedPageInfo,
    setUrlInputSelectedPageInfo,
    setTitleInputSelectedPageInfo,
    aiAssertSelectedPageInfo,
    setAiAssertSelectedPageInfo,
    setAiElements,
    processActionQueue,
  ]);
};

