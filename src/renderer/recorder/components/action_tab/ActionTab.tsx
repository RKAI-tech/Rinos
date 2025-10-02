import React, { useEffect, useRef, useState } from 'react';
import './ActionTab.css';
import RenderedAction from '../action/Action';
import { Action } from '../../types/actions';

interface ActionTabProps {
  actions: Action[];
  isLoading: boolean;
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
}

const ActionTab: React.FC<ActionTabProps> = ({ actions, isLoading, onDeleteAction, onDeleteAll, onReorderActions, onReload, onSaveActions, selectedInsertPosition, displayInsertPosition, onSelectInsertPosition, onSelectAction, onStartRecording, isBrowserOpen, recordingFromActionIndex }) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
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

  return (
    <div className="rcd-actions-section">
      <div className="rcd-actions-header">
        <div className="rcd-actions-header-left">
          <h3 className="rcd-actions-title">Actions</h3>
          <div className="rcd-actions-insert-info">Inserting at position #{selectedInsertPosition}</div>
        </div>
        <div className="rcd-actions-buttons">
          <button className="rcd-action-btn reset" title="Reload actions" onClick={() => onReload && onReload()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 12a9 9 0 1 1-2.64-6.36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="21,3 21,9 15,9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button className="rcd-action-btn save" title="Save actions" onClick={() => onSaveActions && onSaveActions()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="17,21 17,13 7,13 7,21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="7,3 7,8 15,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
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
              <div key={action.action_id} className="rcd-action-item" ref={(el) => (itemRefs.current[index] = el)}>
                
                <div
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`rcd-action-draggable ${draggedIndex === index ? 'rcd-dragging' : ''} ${dragOverIndex === index ? 'rcd-drag-over' : ''}`}
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
