import React, { useEffect, useState } from 'react';
import './Action.css';
import { Action as ActionGetResponse } from '../../types/actions';
import { resolveSelectedGenerationValue } from '../../../shared/utils/actionDataGeneration';
import { browserVariableService } from '../../services/browser_variable';

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
const getFullValue = (action: ActionGetResponse, resolvedGenerationValue?: any) => {
  if (action.action_data_generation && action.action_data_generation.length > 0) {
    const dataValue: any = resolvedGenerationValue;
    if (action.action_type === 'scroll') {
      if (dataValue && typeof dataValue === 'object' && (dataValue.scrollX != null || dataValue.scrollY != null)) {
        const x = dataValue.scrollX != null ? String(dataValue.scrollX) : '0';
        const y = dataValue.scrollY != null ? String(dataValue.scrollY) : '0';
        return `X:${x}, Y:${y}`;
      }
    }
    if (action.action_type === 'window_resize') {
      if (dataValue && typeof dataValue === 'object' && (dataValue.width != null || dataValue.height != null)) {
        const width = dataValue.width != null ? String(dataValue.width) : '0';
        const height = dataValue.height != null ? String(dataValue.height) : '0';
        return `Width:${width}, Height:${height}`;
      }
    }
    if (dataValue != null) {
      return String(dataValue);
    }
    return '';
  }

  for (const action_data of action.action_datas || []) {
    const dataValue: any = action_data.value;
    if (action.action_type === 'scroll') {
      if (dataValue && (dataValue.scrollX != null || dataValue.scrollY != null)) {
        const x = dataValue.scrollX != null ? String(dataValue.scrollX) : '0';
        const y = dataValue.scrollY != null ? String(dataValue.scrollY) : '0';
        return `X:${x}, Y:${y}`;
      }
    }
    if (action.action_type === 'window_resize') {
      if (dataValue && (dataValue.width != null || dataValue.height != null)) {
        const width = dataValue.width != null ? String(dataValue.width) : '0';
        const height = dataValue.height != null ? String(dataValue.height) : '0';
        return `Width:${width}, Height:${height}`;
      }
    }
    if (dataValue?.value) {
      return String(dataValue.value);
    }
  }
  return '';
};

const formatValue = (action: ActionGetResponse, resolvedGenerationValue?: any) => {
  const value = getFullValue(action, resolvedGenerationValue);
  if (!value) return '';
  return value.length > 30 ? value.substring(0, 30) + '...' : value;
};

const MAAction: React.FC<MAActionProps> = ({ action, onEdit, onDelete }) => {
  const [resolvedGenerationValue, setResolvedGenerationValue] = useState<any>(null);

  useEffect(() => {
    let isActive = true;
    const fetchBrowserVariableValue = async (browserVariableId: string) => {
      const resp = await browserVariableService.getBrowserVariableById(browserVariableId);
      if (!resp?.success) {
        return null;
      }
      return (resp as any)?.data?.value ?? null;
    };
    const resolveValue = async () => {
      if (action.action_data_generation && action.action_data_generation.length > 0) {
        const value = await resolveSelectedGenerationValue(action, fetchBrowserVariableValue);
        if (isActive) {
          setResolvedGenerationValue(value);
        }
      } else if (isActive) {
        setResolvedGenerationValue(null);
      }
    };
    resolveValue();
    return () => {
      isActive = false;
    };
  }, [action]);

  const fullValue = getFullValue(action, resolvedGenerationValue);
  const displayValue = formatValue(action, resolvedGenerationValue);
  return (
    <div className="ma-action">
      <div className="ma-action-icon">?</div>
      <div className="ma-action-body">
        <div className="ma-action-title">{formatDescription(action.description) || formatActionType(String(action.action_type))}</div>
        {displayValue && <div className="ma-action-value" title={fullValue}>{displayValue}</div>}
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


