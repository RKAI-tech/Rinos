import React, { useEffect, useRef, useState } from 'react';
import './ActionTab.css';
import RenderedAction from '../action/Action';
import AddActionModal from '../add_action_modal/AddActionModal';
import DatabaseExecutionModal from '../database_execution_modal/DatabaseExecutionModal';
import WaitModal from '../wait_modal/WaitModal';
import NavigateModal from '../navigate_modal/NavigateModal';
import { Action, ActionType, AssertType, Connection } from '../../types/actions';
import { receiveActionWithInsert } from '../../utils/receive_action';
import { toast } from 'react-toastify';

interface ActionTabProps {
  actions: Action[];
  isLoading: boolean;
  isReloading?: boolean;
  isSaving?: boolean;
  onDeleteAction?: (actionId: string) => void;
  onDeleteAll?: () => void;
  onReorderActions?: (reorderedActions: Action[]) => void;
  onReload?: () => void;
  onSaveActions?: () => void;
  selectedInsertPosition?: number;
  displayInsertPosition?: number;
  onSelectInsertPosition?: (position: number | null) => void;
  onSelectAction?: (action: Action) => void;
  onStartRecording?: (actionIndex: number) => void;
  isBrowserOpen?: boolean;
  recordingFromActionIndex?: number | null;
  onAddAction?: () => void;
  isAddActionOpen?: boolean;
  onCloseAddAction?: () => void;
  testcaseId?: string | null;
  onActionsChange?: (updater: (prev: Action[]) => Action[]) => void;
  onInsertPositionChange?: (position: number) => void;
  onDisplayPositionChange?: (position: number) => void;
  executingActionIndex?: number | null;
  failedActionIndex?: number | null;
  onOpenBasicAuth?: () => void;
}

const ActionTab: React.FC<ActionTabProps> = ({ 
  actions, 
  isLoading, 
  isReloading, 
  isSaving, 
  onDeleteAction, 
  onDeleteAll, 
  onReorderActions, 
  onReload, 
  onSaveActions, 
  selectedInsertPosition, 
  displayInsertPosition, 
  onSelectInsertPosition, 
  onSelectAction, 
  onStartRecording, 
  isBrowserOpen, 
  recordingFromActionIndex, 
  onAddAction, 
  isAddActionOpen, 
  onCloseAddAction, 
  testcaseId, 
  onActionsChange, 
  onInsertPositionChange, 
  onDisplayPositionChange, 
  executingActionIndex, 
  failedActionIndex,
  onOpenBasicAuth
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isDatabaseExecutionOpen, setIsDatabaseExecutionOpen] = useState(false);
  const [isWaitOpen, setIsWaitOpen] = useState(false);
  const [isNavigateOpen, setIsNavigateOpen] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', '');
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    // Tạo mảng mới với thứ tự đã thay đổi
    const newActions = [...actions];
    const draggedAction = newActions[draggedIndex];
    
    // Xóa action khỏi vị trí cũ
    newActions.splice(draggedIndex, 1);
    
    // Điều chỉnh dropIndex nếu cần (khi drop vào vị trí cuối)
    const adjustedDropIndex = dropIndex > actions.length - 1 ? actions.length - 1 : dropIndex;
    
    // Chèn action vào vị trí mới
    newActions.splice(adjustedDropIndex, 0, draggedAction);

    // Cập nhật state và gọi callback
    if (onReorderActions) {
      onReorderActions(newActions);
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleInsertPositionClick = (position: number) => {
    if (onSelectInsertPosition) {
      onSelectInsertPosition(position);
    }
  };

  const handleClearPosition = () => {
    if (onSelectInsertPosition) {
      onSelectInsertPosition(null);
    }
  };

  // Add action handlers
  const handleSelectDatabaseExecution = () => {
    setIsDatabaseExecutionOpen(true);
  };

  const handleSelectWait = () => {
    setIsWaitOpen(true);
  };

  const handleSelectNavigate = () => {
    setIsNavigateOpen(true);
  };

  const handleDatabaseExecutionConfirm = (query: string, connectionId: string, connection: Connection) => {
    if (!onActionsChange || !onInsertPositionChange || !onDisplayPositionChange || !testcaseId) return;

    const newAction = {
      testcase_id: testcaseId,
      action_id: Math.random().toString(36),
      action_type: ActionType.database_execution,
      connection_id: connectionId,
      connection: connection,
      // query: query,
      // statement: { query },
      elements: [
        {
          query: query,
        }
      ],
      playwright_code: 'Database execution will be handled by backend',
      description: `Execute database query: ${query.substring(0, 50)}${query.length > 50 ? '...' : ''}`,
    };
     onActionsChange(prev => {
      console.log("Previous actions:", prev);
      const next = receiveActionWithInsert(
        testcaseId,
        prev,
        newAction,
        selectedInsertPosition || 0
      );
      
     console.log("Next actions:", next);
      
      const added = next.length > prev.length;
      if (added) {
        const newPos = Math.min((selectedInsertPosition ?? 0) + 1, next.length);
        onInsertPositionChange(newPos);
        onDisplayPositionChange(newPos);
      }
      return next;
    });
    toast.success('Added database execution action');
  
  };

  const handleSelectAddAction = async (actionType: string) => {
    if (!onActionsChange || !onInsertPositionChange || !onDisplayPositionChange || !testcaseId) return;

    // console.log("handleSelectAddAction called with type:", actionType);
    
    // For database_execution, it's handled by modal, so don't add to list here
    if (actionType === 'database_execution') {
      console.log("Database execution handled by modal, not adding to list");
      return;
    }

    if (actionType === 'wait') {
      handleSelectWait();
      return;
    }

    if (actionType === 'navigate') {
      handleSelectNavigate();
      return;
    }

    const newAction = await createActionByType(actionType);
    // console.log("Created action:", newAction);
    
    if (newAction) {
      onActionsChange(prev => {
        // console.log(`=== BEFORE ADDING ${actionType.toUpperCase()} ACTION ===`);
        // console.log("Previous actions count:", prev.length);
        // console.log("Previous actions:", prev.map(a => ({ id: a.action_id, type: a.action_type, desc: a.description })));
        // console.log("Insert position:", selectedInsertPosition);
        // console.log("New action to add:", { id: newAction.action_id, type: newAction.action_type, desc: newAction.description });
        
        const next = receiveActionWithInsert(
          testcaseId,
          prev,
          newAction,
          selectedInsertPosition || 0
        );
        
        // console.log(`=== AFTER ADDING ${actionType.toUpperCase()} ACTION ===`);
        // console.log("Next actions count:", next.length);
        // console.log("Next actions:", next.map(a => ({ id: a.action_id, type: a.action_type, desc: a.description })));
        // console.log("Action added successfully:", next.length > prev.length);
        
        const added = next.length > prev.length;
        if (added) {
          const newPos = Math.min((selectedInsertPosition ?? 0) + 1, next.length);
          onInsertPositionChange(newPos);
          onDisplayPositionChange(newPos);
          console.log("Updated insert position to:", newPos);
        }
        return next;
      });
      toast.success(`Added ${actionType} action`);
    } else {
      console.error("Failed to create action for type:", actionType);
    }
  };

  const createActionByType = async (actionType: string): Promise<any> => {
    if (!testcaseId) return null;

    const baseAction = {
      testcase_id: testcaseId,
      action_id: Math.random().toString(36),
    };

    // console.log("Creating action for type:", actionType);
    // console.log("Base action:", baseAction);

    switch (actionType) {
      case 'wait':
        const waitAction = {
          ...baseAction,
          action_type: ActionType.wait,
          value: '1000', 
          description: 'Wait for 1 second',
        };
        // console.log("Created wait action:", waitAction);
        return waitAction;
      
      case 'reload':
        const reloadAction = {
          ...baseAction,
          action_type: ActionType.reload,
          description: 'Reload current page',
        } as any;
        // console.log("Created reload action:", reloadAction);
        await (window as any).browserAPI?.browser?.reload();
        return reloadAction;

      case 'back':
        const backAction = {
          ...baseAction,
          action_type: ActionType.back,
          description: 'Go back to previous page',
        } as any;
        // console.log("Created back action:", backAction);
        await (window as any).browserAPI?.browser?.goBack();
        return backAction;

      case 'forward':
        const forwardAction = {
          ...baseAction,
          action_type: ActionType.forward,
          description: 'Go forward to next page',
        } as any;
        // console.log("Created forward action:", forwardAction);
        await (window as any).browserAPI?.browser?.goForward();
        return forwardAction;
      
      case 'database_execution':
        // This will be handled by the modal
        console.log("Database execution will be handled by modal");
        handleSelectDatabaseExecution();
        return null;
      
      case 'visit_url':
        const visitAction = {
          ...baseAction,
          action_type: ActionType.navigate,
          url: 'https://example.com',
          value: 'https://example.com',
          playwright_code: 'await page.goto("https://example.com");',
          description: 'Navigate to URL',
        };
        console.log("Created visit_url action:", visitAction);
        await (window as any).browserAPI?.browser?.navigate(visitAction.value as string);
        return visitAction;
      
      default:
        console.error('Unknown action type:', actionType);
        return null;
    }
  };

  // Auto-scroll to bottom when actions list grows or loads
  useEffect(() => {
    if (!listRef.current) return;
    // Smooth scroll to bottom on any length change
    try {
      const container = listRef.current;
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    } catch {}
  }, [actions.length]);

  // Ensure the currently selected recording start index is visible
  useEffect(() => {
    if (recordingFromActionIndex == null) return;
    const node = itemRefs.current[recordingFromActionIndex];
    if (!node) return;
    try {
      node.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch {}
  }, [recordingFromActionIndex]);

  // Ensure the selected insert position is visible (the action before the insertion point)
  useEffect(() => {
    if (selectedInsertPosition == null) return;
    const targetIndex = Math.max(0, Math.min(selectedInsertPosition - 1, actions.length - 1));
    const node = itemRefs.current[targetIndex];
    if (!node) return;
    try {
      node.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch {}
  }, [selectedInsertPosition, actions.length]);

  // Auto-scroll to the currently executing or failed action
  useEffect(() => {
    const targetIndex = (failedActionIndex != null) ? failedActionIndex : executingActionIndex;
    if (targetIndex == null) return;
    const node = itemRefs.current[targetIndex];
    if (!node) return;
    try {
      node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch {}
  }, [executingActionIndex, failedActionIndex]);

  return (
    <div className="rcd-actions-section">
      <div className="rcd-actions-header">
        <div className="rcd-actions-header-left">
          <h3 className="rcd-actions-title">Actions</h3>
          <div className="rcd-actions-insert-info">Inserting at position #{selectedInsertPosition}</div>
        </div>
        <div className="rcd-actions-buttons">
          <button className="rcd-action-btn auth" title="Add Basic Http Authentication" onClick={() => onOpenBasicAuth && onOpenBasicAuth()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 1C9.79086 1 8 2.79086 8 5V7H7C5.34315 7 4 8.34315 4 10V18C4 19.6569 5.34315 21 7 21H17C18.6569 21 20 19.6569 20 18V10C20 8.34315 18.6569 7 17 7H16V5C16 2.79086 14.2091 1 12 1ZM14 7V5C14 3.89543 13.1046 3 12 3C10.8954 3 10 3.89543 10 5V7H14Z" fill="currentColor"/>
            </svg>
          </button>
          <div className="rcd-add-action-container">
            <button className="rcd-action-btn add" title="Add new action" onClick={() => onAddAction && onAddAction()}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <line x1="12" y1="8" x2="12" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            <AddActionModal
              isOpen={isAddActionOpen || false}
              onClose={() => onCloseAddAction && onCloseAddAction()}
              onSelectAction={handleSelectAddAction}
              onSelectDatabaseExecution={handleSelectDatabaseExecution}
            />
            <DatabaseExecutionModal
              isOpen={isDatabaseExecutionOpen}
              onClose={() => setIsDatabaseExecutionOpen(false)}
              onConfirm={handleDatabaseExecutionConfirm}
            />
            <WaitModal
              isOpen={isWaitOpen}
              onClose={() => setIsWaitOpen(false)}
              onConfirm={(ms) => {
                if (!onActionsChange || !onInsertPositionChange || !onDisplayPositionChange || !testcaseId) return;
                const newAction = {
                  testcase_id: testcaseId,
                  action_id: Math.random().toString(36),
                  action_type: ActionType.wait,
                  value: String(ms),
                  description: `Wait for ${ms} ms`,
                };
                onActionsChange(prev => {
                  const next = receiveActionWithInsert(
                    testcaseId,
                    prev,
                    newAction,
                    selectedInsertPosition || 0
                  );
                  const added = next.length > prev.length;
                  if (added) {
                    const newPos = Math.min((selectedInsertPosition ?? 0) + 1, next.length);
                    onInsertPositionChange(newPos);
                    onDisplayPositionChange(newPos);
                  }
                  return next;
                });
                setIsWaitOpen(false);
                toast.success('Added wait action');
              }}
            />
            <NavigateModal
              isOpen={isNavigateOpen}
              onClose={() => setIsNavigateOpen(false)}
              onConfirm={async (url) => {
                if (!onActionsChange || !onInsertPositionChange || !onDisplayPositionChange || !testcaseId) return;
                const newAction = {
                  testcase_id: testcaseId,
                  action_id: Math.random().toString(36),
                  action_type: ActionType.navigate,
                  value: url,
                  description: `Navigate to ${url}`,
                } as any;
                onActionsChange(prev => {
                  const next = receiveActionWithInsert(
                    testcaseId,
                    prev,
                    newAction,
                    selectedInsertPosition || 0
                  );
                  const added = next.length > prev.length;
                  if (added) {
                    const newPos = Math.min((selectedInsertPosition ?? 0) + 1, next.length);
                    onInsertPositionChange(newPos);
                    onDisplayPositionChange(newPos);
                  }
                  return next;
                });
                setIsNavigateOpen(false);
                await (window as any).browserAPI?.browser.navigate(url);
                toast.success('Added navigate action');
              }}
            />
          </div>
          <button className="rcd-action-btn reset" title="Reload actions" onClick={() => onReload && onReload()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 12a9 9 0 1 1-2.64-6.36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="21,3 21,9 15,9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button className="rcd-action-btn save" title="Save actions" onClick={() => onSaveActions && onSaveActions()} disabled={!!isSaving || !!isReloading}>
            {isSaving ? (
              <span className="rcd-spinner" aria-label="saving" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="17,21 17,13 7,13 7,21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="7,3 7,8 15,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
          <button className="rcd-action-btn delete" title="Delete all actions" onClick={() => onDeleteAll && onDeleteAll()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <polyline points="3,6 5,6 21,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="10" y1="11" x2="10" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="14" y1="11" x2="14" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
      {/* insert-info moved inside header-left directly under the label */}
      <div className="rcd-actions-list" ref={listRef}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
            Loading actions...
          </div>
        ) : actions.length > 0 ? (
          <>

            {actions.map((action, index) => (
              <div key={action.action_id} className="rcd-action-item" ref={(el) => { itemRefs.current[index] = el; }}>
                
                <div
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`rcd-action-draggable ${draggedIndex === index ? 'rcd-dragging' : ''} ${dragOverIndex === index ? 'rcd-drag-over' : ''} ${executingActionIndex === index ? 'rcd-executing' : ''} ${failedActionIndex === index ? 'rcd-failed' : ''}`}
                >
                  <RenderedAction 
                    action={action} 
                    onDelete={onDeleteAction} 
                    onClick={(a) => onSelectAction && onSelectAction(a)}
                    onStartRecording={() => onStartRecording && onStartRecording(index)}
                    isBrowserOpen={isBrowserOpen}
                    isRecordingFromThisAction={recordingFromActionIndex === index}
                    index={index}
                  />
                </div>
                
              </div>
            ))}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
            No actions found
          </div>
        )}
      </div>
    </div>
  );
};

export default ActionTab;
