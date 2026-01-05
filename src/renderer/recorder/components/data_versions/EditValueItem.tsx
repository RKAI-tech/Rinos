import React, { useState, useEffect } from 'react';
import { ActionDataGeneration } from '../../types/actions';
import { toast } from 'react-toastify';
import './EditValueItem.css';

interface EditValueItemProps {
  generation: ActionDataGeneration;
  onSave: (value: any) => void;
  onCancel: () => void;
}

const EditValueItem: React.FC<EditValueItemProps> = ({
  generation,
  onSave,
  onCancel,
}) => {
  const [editValue, setEditValue] = useState<string>('');

  useEffect(() => {
    // Initialize edit value from generation
    const genValue = generation.value && typeof generation.value === 'object'
      ? (generation.value as any).value ?? JSON.stringify(generation.value)
      : generation.value || '';
    
    const valueStr = typeof genValue === 'string'
      ? genValue
      : JSON.stringify(genValue, null, 2);
    
    setEditValue(valueStr);
  }, [generation]);

  const handleSave = () => {
    if (!editValue.trim()) {
      toast.error('Value cannot be empty');
      return;
    }

    // Try to parse as JSON, if fails use as string
    let parsedValue: any = editValue.trim();
    try {
      parsedValue = JSON.parse(editValue.trim());
    } catch {
      // Keep as string if not valid JSON
      parsedValue = editValue.trim();
    }

    onSave(parsedValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSave();
    }
  };

  return (
    <div className="edit-value-item">
      <textarea
        className="edit-value-item-textarea"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={4}
        autoFocus
        placeholder="Enter value (JSON or string)..."
      />
      <div className="edit-value-item-actions">
        <button
          className="edit-value-item-btn-save"
          onClick={handleSave}
        >
          Save
        </button>
        <button
          className="edit-value-item-btn-cancel"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
      <div className="edit-value-item-hint">
        Press Ctrl+Enter to save, Esc to cancel
      </div>
    </div>
  );
};

export default EditValueItem;

