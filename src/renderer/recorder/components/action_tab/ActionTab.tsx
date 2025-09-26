import React, { useState } from 'react';
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
  selectedInsertPosition?: number | null;
  onSelectInsertPosition?: (position: number | null) => void;
}

const ActionTab: React.FC<ActionTabProps> = ({ actions, isLoading, onDeleteAction, onDeleteAll, onReorderActions, onReload, selectedInsertPosition, onSelectInsertPosition }) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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

  return (
    <div className="rcd-actions-section">
      <div className="rcd-actions-header">
        <h3 className="rcd-actions-title">Actions</h3>
        <div className="rcd-actions-buttons">
          <button className="rcd-action-btn reset" title="Reload actions" onClick={() => onReload && onReload()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 12a9 9 0 1 1-2.64-6.36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="21,3 21,9 15,9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button className="rcd-action-btn save" title="Save">
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
      <div className="rcd-actions-list">
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
            Loading actions...
          </div>
        ) : actions.length > 0 ? (
          <>
            {/* Trigger area cho thanh ngang ở đầu */}
            <div className="rcd-recording-trigger">
              {/* Insert position ở đầu danh sách */}
              <div 
                className={`rcd-recording-bar-container ${selectedInsertPosition === 0 ? 'rcd-recording-selected' : ''}`}
              >
                <div className="rcd-recording-bar">
                  <div className="rcd-recording-line"></div>
                  <div className="rcd-recording-btn-container">
                    <button 
                      className="rcd-recording-start-btn"
                      onClick={() => handleInsertPositionClick(0)}
                      title="Start recording at the beginning"
                    >
                    </button>
                    <div className="rcd-recording-tooltip">
                      <button 
                        className="rcd-recording-start-main-btn"
                        onClick={() => handleInsertPositionClick(0)}
                        title="Start recording at the beginning"
                      >
                        Start Recording
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {actions.map((action, index) => (
              <div key={action.action_id} className="rcd-action-item">
                {/* Thanh ngang trước action đầu tiên */}
                {index === 0 && (
                  <div 
                    className={`rcd-recording-bar-container ${selectedInsertPosition === 0 ? 'rcd-recording-selected' : ''}`}
                  >
                    <div className="rcd-recording-bar">
                      <div className="rcd-recording-line"></div>
                      <div className="rcd-recording-btn-container">
                        <button 
                          className="rcd-recording-start-btn"
                          onClick={() => handleInsertPositionClick(0)}
                          title="Start recording at the beginning"
                        >
                        </button>
                        <div className="rcd-recording-tooltip">
                          <button 
                            className="rcd-recording-start-main-btn"
                            onClick={() => handleInsertPositionClick(0)}
                            title="Start recording at the beginning"
                          >
                            Start Recording
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`rcd-action-draggable ${draggedIndex === index ? 'rcd-dragging' : ''} ${dragOverIndex === index ? 'rcd-drag-over' : ''}`}
                >
                  <RenderedAction action={action} onDelete={onDeleteAction} />
                </div>
                
                {/* Insert position sau mỗi action */}
                <div 
                  className={`rcd-recording-bar-container ${selectedInsertPosition === index + 1 ? 'rcd-recording-selected' : ''}`}
                >
                  <div className="rcd-recording-bar">
                    <div className="rcd-recording-line"></div>
                    <div className="rcd-recording-btn-container">
                      <button 
                        className="rcd-recording-start-btn"
                        onClick={() => handleInsertPositionClick(index + 1)}
                        title="Start recording after this action"
                      >
                      </button>
                      <div className="rcd-recording-tooltip">
                        <button 
                          className="rcd-recording-start-main-btn"
                          onClick={() => handleInsertPositionClick(index + 1)}
                          title="Start recording after this action"
                        >
                          Start Recording
                        </button>
                      </div>
                    </div>
                  </div>
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
