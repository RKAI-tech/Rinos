import React from 'react';
import './Action.css';

export default function Action({ action }) {
  return (
    <div className="rcd-action">
      <div className="rcd-action-icon">?</div>
      <div className="rcd-action-body">
        <div className="rcd-action-title">{action.title}</div>
        {action.meta && <div className="rcd-action-meta">{action.meta}</div>}
        {action.value && <div className="rcd-action-value">{action.value}</div>}
        {action.time && <div className="rcd-action-time">{action.time}</div>}
      </div>
      <button className="rcd-action-remove" title="Remove">✕</button>
    </div>
  );
}


