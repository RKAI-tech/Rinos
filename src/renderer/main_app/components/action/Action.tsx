import React from 'react';
import './Action.css';
import { Action as ActionGetResponse } from '../../types/actions';

interface MAActionProps {
  action: ActionGetResponse;
  onEdit?: (action: ActionGetResponse) => void;
  onDelete?: (actionId: string) => void;
}

const formatActionType = (type?: string) => {
  if (!type) return '';
  return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
};
const formatDescription = (description?: string) => {
  if (!description) return '';
  return description.length > 50 ? description.substring(0, 50) + '...' : description;
};
const formatValue = (action: ActionGetResponse) => {
  let value = '';
  for (const action_data of action.action_datas || []) {
    if (action_data.value?.value) {
      value = action_data.value.value;
      break;
    }
  }
  if (!value) return '';
  return value.length > 50 ? value.substring(0, 50) + '...' : value;
};

const MAAction: React.FC<MAActionProps> = ({ action, onEdit, onDelete }) => {
  const actionValue = formatValue(action);
  
  return (
    <div className="ma-action">
      <div className="ma-action-icon">?</div>
      <div className="ma-action-body">
        <div className="ma-action-title">{formatDescription(action.description) || formatActionType(String(action.action_type))}</div>
        {actionValue && <div className="ma-action-value">{actionValue}</div>}
      </div>
      <div className="ma-action-actions">
        <button type="button" className="ma-action-btn" title="Edit" onClick={(e) => { e.stopPropagation(); onEdit && onEdit(action); }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button type="button" className="ma-action-btn danger" title="Remove" onClick={(e) => { e.stopPropagation(); onDelete && onDelete(action.action_id || ''); }}>✕</button>
      </div>
    </div>
  );
};

export default MAAction;


