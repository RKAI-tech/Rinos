import React from 'react';
import './CheckDuplicateElementModal.css';
import { DuplicateElementGroup } from '../../utils/find_duplicate_elements';
import { getElementDisplayText, getElementType } from '../../utils/find_duplicate_elements';

interface CheckDuplicateElementModalProps {
  isOpen: boolean;
  duplicateGroup: DuplicateElementGroup | null;
  currentGroupIndex: number;
  totalGroups: number;
  onConfirm: () => void;
  onCancel: () => void;
}

const CheckDuplicateElementModal: React.FC<CheckDuplicateElementModalProps> = ({
  isOpen,
  duplicateGroup,
  currentGroupIndex,
  totalGroups,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen || !duplicateGroup) {
    return null;
  }

  return (
    <div className="cde-modal-overlay" onClick={onCancel}>
      <div className="cde-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="cde-modal-header">
          <h3 className="cde-modal-title">
            Confirm Duplicate Elements ({currentGroupIndex}/{totalGroups})
          </h3>
          <button className="cde-modal-close-btn" onClick={onCancel}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="cde-modal-content">
          <div className="cde-modal-message">
            <p>
              The system has detected <strong>{duplicateGroup.elements.length} element</strong> that may be duplicated 
              (similarity score: <strong>{(duplicateGroup.similarityScore * 100).toFixed(1)}%</strong>).
            </p>
            <p>Do you want to assign the same <strong>selector</strong> to these elements?</p>
          </div>

          <div className="cde-elements-list">
            {duplicateGroup.elements.map((item, index) => (
              <div key={index} className="cde-element-item">
                <div className="cde-element-header">
                  <span className="cde-element-number">#{index + 1}</span>
                  <span className="cde-element-type">{getElementType(item.element)}</span>
                </div>
                <div className="cde-element-info">
                  <div className="cde-element-row">
                    <span className="cde-element-label">Text:</span>
                    <span className="cde-element-value">{getElementDisplayText(item.element)}</span>
                  </div>
                  <div className="cde-element-row">
                    <span className="cde-element-label">Action:</span>
                    <span className="cde-element-value">
                      Action #{item.actionIndex + 1} - {item.actionType}
                    </span>
                  </div>
                  <div className="cde-element-row">
                    <span className="cde-element-label">Description:</span>
                    <span className="cde-element-value">{item.actionDescription}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="cde-modal-actions">
          <button className="cde-btn cde-btn-cancel" onClick={onCancel}>
            Skip
          </button>
          <button className="cde-btn cde-btn-confirm" onClick={onConfirm}>
            Confirm Duplicates
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckDuplicateElementModal;

