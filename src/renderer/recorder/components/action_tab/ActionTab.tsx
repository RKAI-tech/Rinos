import React from 'react';
import './ActionTab.css';
import Action from '../action/Action';
import { ActionGetResponse } from '../../types/actions';

interface ActionTabProps {
  actions: ActionGetResponse[];
  isLoading: boolean;
  onDeleteAction?: (actionId: string) => void;
  onDeleteAll?: () => void;
}

const ActionTab: React.FC<ActionTabProps> = ({ actions, isLoading, onDeleteAction, onDeleteAll }) => {
  return (
    <div className="rcd-actions-section">
      <div className="rcd-actions-header">
        <h3 className="rcd-actions-title">Actions</h3>
        <div className="rcd-actions-buttons">
          <button className="rcd-action-btn reset" title="Reset">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 4v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M23 20v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button className="rcd-action-btn save" title="Save">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="17,21 17,13 7,13 7,21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="7,3 7,8 15,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button className="rcd-action-btn delete" title="Delete all" onClick={() => onDeleteAll && onDeleteAll()}>
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
          actions.map((action) => (
            <Action key={action.action_id} action={action} onDelete={onDeleteAction} />
          ))
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
