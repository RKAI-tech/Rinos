import React from 'react';
import './Action.css';
import { Action as ActionType } from '../../types/actions';

interface ActionProps {
  action: ActionType;
  onDelete?: (actionId: string) => void;
}

export default function RenderedAction({ action, onDelete }: ActionProps) {
  // Format action type for display
  const formatActionType = (type: string) => {
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  // Get selector from elements
  const getSelector = () => {
    if (action.elements && action.elements.length > 0) {
      const element = action.elements[0];
      if (element.selector && element.selector.length > 0) {
        return element.selector[0].value; // Lấy selector đầu tiên
      }
      return 'No selector';
    }
    return 'No elements';
  };

  // Format value for display
  const formatValue = () => {
    if (action.value) {
      return action.value.length > 50 ? action.value.substring(0, 50) + '...' : action.value;
    }
    return '';
  };

  return (
    <div className="rcd-action">
      <div className="rcd-action-icon">?</div>
      <div className="rcd-action-body">
        <div className="rcd-action-title">{action.description || formatActionType(action.action_type)}</div>
        {/* <div className="rcd-action-meta">{getSelector()}</div> */}
        {formatValue() && <div className="rcd-action-value">{formatValue()}</div>}
        {/* <div className="rcd-action-time">Order: {action.order_index}</div> */}
      </div>
      <button
        className="rcd-action-remove"
        title="Remove"
        onClick={(e) => { e.stopPropagation(); onDelete && onDelete(action.action_id || ''); }}
      >
        ✕
      </button>
    </div>
  );
}
