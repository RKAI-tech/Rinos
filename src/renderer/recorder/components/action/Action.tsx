import React from 'react';
import './Action.css';
import { Action as ActionType } from '../../types/actions';

interface ActionProps {
  action: ActionType;
  onDelete?: (actionId: string) => void;
  onClick?: (action: ActionType) => void;
  onStartRecording?: () => void;
  onContinueExecution?: () => void;
  isBrowserOpen?: boolean;
  isRecordingFromThisAction?: boolean;
  failedMessage?: string | null;
  index?: number;
}

export default function RenderedAction({ action, onDelete, onClick, onStartRecording, onContinueExecution, isBrowserOpen, isRecordingFromThisAction, failedMessage, index }: ActionProps) {
  // Format action type for display
  const formatActionType = (type: string) => {
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  // Get selector from elements
  const getSelector = () => {
    if (action.elements && action.elements.length > 0) {
      const element = action.elements[0];
      if (element.selectors && element.selectors.length > 0) {
        return element.selectors[0].value;
      }
      return 'No selector';
    }
    return 'No elements';
  };

  // Render icon based on action type
  const renderIcon = (type: string) => {
    const common = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', xmlns: 'http://www.w3.org/2000/svg' } as any;
    switch (type) {
      case 'navigate':
        return (
          <svg {...common}>
            <path d="M3 12h18" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <path d="M13 6l6 6-6 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case 'click':
      case 'double_click':
      case 'right_click':
      case 'shift_click':
        return (
          <svg {...common}>
            <path d="M12 2v8" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <path d="M5 12h14" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="12" r="5" stroke="white" strokeWidth="2" fill="none" />
          </svg>
        );
      case 'input':
      case 'update_input':
      case 'change':
        return (
          <svg {...common}>
            <rect x="3" y="6" width="18" height="12" rx="2" stroke="white" strokeWidth="2" />
            <path d="M7 12h10" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'select':
        return (
          <svg {...common}>
            <rect x="4" y="5" width="16" height="14" rx="2" stroke="white" strokeWidth="2" />
            <path d="M8 10l4 4 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case 'checkbox':
        return (
          <svg {...common}>
            <rect x="5" y="5" width="14" height="14" rx="3" stroke="white" strokeWidth="2" />
            <path d="M8 12l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case 'drag_and_drop':
      case 'drag_start':
      case 'drag_end':
      case 'drag_over':
      case 'drag_leave':
      case 'drop':
        return (
          <svg {...common}>
            <path d="M7 7l10 10" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <path d="M10 17h7v-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case 'keydown':
      case 'keyup':
      case 'keypress':
        return (
          <svg {...common}>
            <rect x="3" y="6" width="18" height="12" rx="2" stroke="white" strokeWidth="2" />
            <path d="M7 12h2M11 12h2M15 12h2" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'upload':
        return (
          <svg {...common}>
            <path d="M12 16V8" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <path d="M8 12l4-4 4 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 18h16" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'scroll':
        return (
          <svg {...common}>
            <path d="M12 4v16" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <path d="M8 8l4-4 4 4M8 16l4 4 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case 'assert':
        return (
          <svg {...common}>
            <circle cx="12" cy="12" r="8" stroke="white" strokeWidth="2" fill="none" />
            <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case 'connect_db':
        return (
          <svg {...common}>
            <ellipse cx="12" cy="7" rx="7" ry="3" stroke="white" strokeWidth="2" fill="none" />
            <path d="M5 7v6c0 1.66 3.13 3 7 3s7-1.34 7-3V7" stroke="white" strokeWidth="2" />
          </svg>
        );
      default:
        return (
          <svg {...common}>
            <text x="9" y="16" fill="white" fontSize="12">?</text>
          </svg>
        );
    }
  };

  const renderDescription = (value: any) => {
    if (value) {
      return value.length > 50 ? value.substring(0, 50) + '...' : value;
    }
    return '';
  };
  const renderValue = () => {
    let value = '';
    for (const action_data of action.action_datas || []) {
      if (action_data.value?.["value"]) {
        value = action_data.value?.["value"];
        break;
      }
    }
    return value;
  };
  const fullValue = renderValue();
  const displayValue = fullValue ? (fullValue.length > 50 ? fullValue.substring(0, 50) + '...' : fullValue) : '';
  return (
    <div className="rcd-action">
      <div className="rcd-action-icon">{(index ?? 0) + 1}</div>
      <div className="rcd-action-body">
        <div className="rcd-action-title">{renderDescription(action.description) || formatActionType(action.action_type)}</div>
        {/* <div className="rcd-action-meta">{getSelector()}</div> */}
        {displayValue && <div className="rcd-action-value" title={fullValue}>{displayValue}</div>}
        {/* <div className="rcd-action-time">Order: {action.order_index}</div> */}
        {failedMessage && (
          <div className="rcd-action-error">
            {failedMessage}
          </div>
        )}
      </div>
      <div className="rcd-action-actions">
        <button
          className={`rcd-action-record ${isRecordingFromThisAction ? 'active' : ''}`}
          title={isBrowserOpen ? "Browser is open. Close browser to start from this action" : (isRecordingFromThisAction ? "Stop recording from this action" : "Start recording from this action")}
          onClick={(e) => { e.stopPropagation(); onStartRecording && onStartRecording(); }}
          disabled={isBrowserOpen}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polygon points="6,3 20,12 6,21" fill="currentColor" />
          </svg>
        </button>
        {isRecordingFromThisAction && isBrowserOpen && onContinueExecution && (
          <button
            className="rcd-action-continue"
            title="Continue execution from this action"
            onClick={(e) => { e.stopPropagation(); onContinueExecution(); }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <polygon points="6,5 16,12 6,19" fill="currentColor" opacity="0.8" />
              <polygon points="10,5 20,12 10,19" fill="currentColor" />
            </svg>
          </button>
        )}
        <button
          className="rcd-action-edit"
          title="Edit"
          onClick={(e) => { e.stopPropagation(); onClick && onClick(action); }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button
          className="rcd-action-remove"
          title="Remove"
          onClick={(e) => { e.stopPropagation(); onDelete && onDelete(action.action_id || ''); }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
