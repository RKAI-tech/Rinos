import React, { useState, useEffect, useRef } from 'react';

export interface AddActionOption {
  value: string;
  label: string;
  description?: string;
}

interface AddActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (actionType: string) => void;
  onSelectDatabaseExecution?: () => void;
  onSelectAddCookies?: () => void;
}

const AddActionModal: React.FC<AddActionModalProps> = ({ isOpen, onClose, onSelectAction, onSelectDatabaseExecution, onSelectAddCookies }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const actionOptions: AddActionOption[] = [
    {
      value: 'wait',
      label: 'Wait',
      description: 'Add a wait/delay action'
    },
    {
      value: 'database_execution',
      label: 'Database Execution',
      description: 'Execute a database query'
    },
    {
      value: 'navigate',
      label: 'Navigate',
      description: 'Navigate to a specific URL'
    },
    {
      value: 'back',
      label: 'Back',
      description: 'Go back to previous page'
    },
    {
      value: 'forward',
      label: 'Forward',
      description: 'Go forward to next page'
    },
    {
      value: 'reload',
      label: 'Reload',
      description: 'Reload the current page'
    },
    {
      value: 'add_cookies',
      label: 'Add Cookies',
      description: 'Select and add cookies from project list'
    }
  ];

  const filteredOptions = actionOptions.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    option.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectAction = (actionType: string) => {
    if (actionType === 'database_execution' && onSelectDatabaseExecution) {
      onSelectDatabaseExecution();
      setSearchTerm('');
      onClose();
    } else if (actionType === 'add_cookies' && onSelectAddCookies) {
      onSelectAddCookies();
      setSearchTerm('');
      onClose();
    } else {
      onSelectAction(actionType);
      setSearchTerm('');
      onClose();
    }
  };

  const handleClose = () => {
    setSearchTerm('');
    onClose();
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'wait':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            <polyline points="12,6 12,12 16,14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'database_execution':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="12" cy="5" rx="9" ry="3" stroke="currentColor" strokeWidth="2"/>
            <path d="M3 5v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5" stroke="currentColor" strokeWidth="2"/>
            <path d="M3 12a9 3 0 0 0 18 0" stroke="currentColor" strokeWidth="2"/>
          </svg>
        );
      case 'navigate':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'reload':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 12a9 9 0 1 1-2.64-6.36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="21,3 21,9 15,9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'add_cookies':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Cookie outline with a bite taken out */}
            <path d="M21 12.8A9 9 0 1 1 11.2 3c0 2.2 1.8 4 4 4 0 2.2 1.8 4 4 4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            {/* Chocolate chips */}
            <circle cx="12" cy="8" r="1" fill="currentColor"/>
            <circle cx="15" cy="12" r="1" fill="currentColor"/>
            <circle cx="9" cy="12.5" r="1" fill="currentColor"/>
            <circle cx="12" cy="16.5" r="1" fill="currentColor"/>
          </svg>
        );
      case 'back':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polyline points="15,18 9,12 15,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M20 12H10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'forward':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polyline points="9,6 15,12 9,18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 12H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      default:
        return null;
    }
  };

  const getIconColor = (actionType: string) => {
    switch (actionType) {
      case 'wait':
        return '#f59e0b'; // Orange color
      case 'database_execution':
        return '#3b82f6'; // Blue color
      case 'add_cookies':
        return '#10b981'; // Green color
      case 'visit_url':
        return '#10b981'; // Green color
      default:
        return '#6b7280'; // Gray color
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={modalRef}
      style={{
        position: 'absolute',
        top: '100%',
        right: 0,
        marginTop: '4px',
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        width: '260px',
        zIndex: 1000,
        overflow: 'hidden',
      }}
    >
      <div style={{
        padding: '10px',
        background: '#f8fafc',
        borderBottom: '1px solid #e5e7eb',
      }}>
        <input
          type="text"
          placeholder="Search action types..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '6px 10px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '13px',
            color: '#374151',
            background: '#ffffff',
            transition: 'all 0.2s ease-in-out',
            boxSizing: 'border-box',
          }}
        />
      </div>
      
      <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
        {filteredOptions.map((option) => (
          <div
            key={option.value}
            style={{
              padding: '10px 12px',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease-in-out',
              borderBottom: '1px solid #f3f4f6',
            }}
            onClick={() => handleSelectAction(option.value)}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f9fafb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ 
                width: '18px', 
                height: '18px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: getIconColor(option.value)
              }}>
                {getActionIcon(option.value)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#111827' }}>
                  {option.label}
                </div>
                {option.description && (
                  <div style={{ fontSize: '11px', color: '#6b7280' }}>
                    {option.description}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {filteredOptions.length === 0 && (
          <div style={{ padding: '16px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
            No actions found
          </div>
        )}
      </div>
    </div>
  );
};

export default AddActionModal;
