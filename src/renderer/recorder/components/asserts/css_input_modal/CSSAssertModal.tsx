import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import './CSSAssertModal.css';

export interface SelectedPageInfo {
  page_index: number;
  page_url: string;
  page_title: string;
}

type CssPropertyType = 'background-color' | 'color' | 'font-size' | 'font-family' | 'font-weight';

interface CSSAssertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (cssProperty: CssPropertyType, cssValue: string, element: {
    selectors: string[];
    domHtml: string;
    value: string;
    pageIndex?: number | null;
    pageUrl?: string | null;
    pageTitle?: string | null;
    element_data?: Record<string, any>;
  }, pageInfo?: SelectedPageInfo) => void;
  selectedPageInfo?: SelectedPageInfo | null;
  onClearPage?: () => void;
  onPageInfoChange?: (pageInfo: SelectedPageInfo) => void;
  selectedElement?: {
    selectors: string[];
    domHtml: string;
    value: string;
    pageIndex?: number | null;
    pageUrl?: string | null;
    pageTitle?: string | null;
    element_data?: Record<string, any>;
  } | null;
  onClearElement?: () => void;
}

const CSS_PROPERTIES: { value: CssPropertyType; label: string; isColor: boolean; isNumber: boolean }[] = [
  { value: 'background-color', label: 'Background Color', isColor: true, isNumber: false },
  { value: 'color', label: 'Color', isColor: true, isNumber: false },
  { value: 'font-size', label: 'Font Size', isColor: false, isNumber: true },
  { value: 'font-family', label: 'Font Family', isColor: false, isNumber: false },
  { value: 'font-weight', label: 'Font Weight', isColor: false, isNumber: true },
];

const CSSAssertModal: React.FC<CSSAssertModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  selectedPageInfo,
  onClearPage,
  onPageInfoChange,
  selectedElement,
  onClearElement,
}) => {
  const [cssProperty, setCssProperty] = useState<CssPropertyType>('background-color');
  const [cssValue, setCssValue] = useState('');
  const cssValueInputRef = useRef<HTMLInputElement>(null);

  // Tự động cập nhật page info từ element khi element được chọn
  useEffect(() => {
    if (selectedElement && selectedElement.pageIndex !== null && selectedElement.pageIndex !== undefined) {
      // Tự động set page info từ element nếu chưa có hoặc khác với element
      if (!selectedPageInfo || selectedPageInfo.page_index !== selectedElement.pageIndex) {
        const pageData: SelectedPageInfo = {
          page_index: selectedElement.pageIndex,
          page_url: selectedElement.pageUrl || '',
          page_title: selectedElement.pageTitle || '',
        };
        // Gọi callback để cập nhật page info
        if (onPageInfoChange) {
          onPageInfoChange(pageData);
        }
      }
    }
  }, [selectedElement, selectedPageInfo, onPageInfoChange]);

  // Lấy giá trị CSS từ element_data nếu có
  useEffect(() => {
    if (selectedElement && selectedElement.element_data) {
      try {
        // Lấy giá trị từ element_data nếu có
        const elementData = selectedElement.element_data;
        let valueFromData = '';
        
        // Lấy trực tiếp từ element_data (theo cấu trúc từ elementDataExtractor)
        switch (cssProperty) {
          case 'background-color':
            valueFromData = elementData.backgroundColor || elementData['background-color'] || '';
            break;
          case 'color':
            valueFromData = elementData.color || '';
            break;
          case 'font-size':
            valueFromData = elementData.fontSize || elementData['font-size'] || '';
            break;
          case 'font-family':
            valueFromData = elementData.fontFamily || elementData['font-family'] || '';
            break;
          case 'font-weight':
            valueFromData = elementData.fontWeight || elementData['font-weight'] || '';
            break;
        }
        
        // Nếu không tìm thấy trực tiếp, thử tìm trong computedStyles
        if (!valueFromData && elementData.computedStyles) {
          const styles = elementData.computedStyles;
          switch (cssProperty) {
            case 'background-color':
              valueFromData = styles.backgroundColor || styles['background-color'] || '';
              break;
            case 'color':
              valueFromData = styles.color || '';
              break;
            case 'font-size':
              valueFromData = styles.fontSize || styles['font-size'] || '';
              break;
            case 'font-family':
              valueFromData = styles.fontFamily || styles['font-family'] || '';
              break;
            case 'font-weight':
              valueFromData = styles.fontWeight || styles['font-weight'] || '';
              break;
          }
        }
        
        // Nếu vẫn không tìm thấy, thử tìm trong inlineStyles
        if (!valueFromData && elementData.inlineStyles) {
          const inlineStyles = elementData.inlineStyles;
          switch (cssProperty) {
            case 'background-color':
              valueFromData = inlineStyles.backgroundColor || inlineStyles['background-color'] || '';
              break;
            case 'color':
              valueFromData = inlineStyles.color || '';
              break;
            case 'font-size':
              valueFromData = inlineStyles.fontSize || inlineStyles['font-size'] || '';
              break;
            case 'font-family':
              valueFromData = inlineStyles.fontFamily || inlineStyles['font-family'] || '';
              break;
            case 'font-weight':
              valueFromData = inlineStyles.fontWeight || inlineStyles['font-weight'] || '';
              break;
          }
        }
        
        // Nếu tìm thấy giá trị, tự động điền vào input
        if (valueFromData) {
          setCssValue(valueFromData);
        } else {
          // Nếu không tìm thấy, reset về rỗng
          setCssValue('');
        }
      } catch (error) {
        /* console.error('Error extracting CSS value from element_data:', error); */
        setCssValue('');
      }
    } else {
      // Nếu không có element_data, reset về rỗng
      setCssValue('');
    }
  }, [selectedElement, cssProperty]);

  // Không cần reset riêng nữa vì đã xử lý trong useEffect trên

  const handleConfirm = () => {
    if (!cssProperty) {
      toast.warning('Please select a CSS property');
      return;
    }
    if (!cssValue.trim()) {
      toast.warning('Please enter a CSS value');
      return;
    }
    if (!selectedElement || !selectedElement.selectors || selectedElement.selectors.length === 0) {
      toast.warning('Please select an element first');
      return;
    }
    if (!selectedPageInfo) {
      toast.warning('Please select a page first');
      return;
    }

    onConfirm(cssProperty, cssValue.trim(), selectedElement, selectedPageInfo);
    setCssValue('');
    setCssProperty('background-color');
    onClose();
  };

  const handleCancel = () => {
    setCssValue('');
    setCssProperty('background-color');
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const handleValueChange = (value: string) => {
    const selectedProp = CSS_PROPERTIES.find(p => p.value === cssProperty);
    if (cssProperty === 'font-size') {
      // Font-size: chỉ chấp nhận số + px (ví dụ: 16px, 14.5px)
      const fontSizePattern = /^[\d.]*px?$/i;
      if (value === '' || fontSizePattern.test(value)) {
        setCssValue(value);
      }
    } else if (cssProperty === 'font-weight') {
      // Font-weight: chỉ chấp nhận số (ví dụ: 400, 700)
      const fontWeightPattern = /^[\d]*$/;
      if (value === '' || fontWeightPattern.test(value)) {
        setCssValue(value);
      }
    } else if (selectedProp?.isNumber) {
      // Các number property khác (nếu có)
      const numberPattern = /^[\d.]*[a-z%]*$/i;
      if (value === '' || numberPattern.test(value)) {
        setCssValue(value);
      }
    } else {
      setCssValue(value);
    }
  };

  const hasSelectedElement = !!selectedElement && selectedElement.selectors && selectedElement.selectors.length > 0;
  const hasSelectedPage = !!selectedPageInfo;
  const disabled = !cssProperty || !cssValue.trim() || !hasSelectedElement || !hasSelectedPage;

  const selectedProp = CSS_PROPERTIES.find(p => p.value === cssProperty);
  const isColorInput = selectedProp?.isColor || false;
  const isNumberInput = selectedProp?.isNumber || false;
  const isFontSize = cssProperty === 'font-size';
  const isFontWeight = cssProperty === 'font-weight';

  // Auto-focus on input when modal opens
  useEffect(() => {
    if (isOpen && cssValueInputRef.current) {
      setTimeout(() => {
        cssValueInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getElementTypeFromDom = (html?: string): string | undefined => {
    try {
      const m = (html || '').match(/^\s*<\s*([a-zA-Z0-9-]+)/);
      return m ? m[1].toLowerCase() : undefined;
    } catch {
      return undefined;
    }
  };

  const getElementText = (): string => {
    if (!selectedElement) return '';
    const raw = (selectedElement.value || '').trim();
    if (raw) return raw;
    const tag = getElementTypeFromDom(selectedElement.domHtml);
    if (tag) return `<${tag}>`;
    return '(No text available)';
  };

  return (
    <div className="css-assert-modal-overlay" onClick={handleCancel}>
      <div className="css-assert-modal" onClick={(e) => e.stopPropagation()}>
        <div className="css-assert-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Assert Element Has CSS</h3>
          <button
            onClick={handleCancel}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#6b7280',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div className="css-assert-modal-body">
          {/* Element Selection */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
              Element <span style={{ color: '#ef4444' }}>*</span>
            </label>
            {hasSelectedElement ? (
              <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: '#111827', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {getElementText()}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {selectedElement.selectors?.[0] || 'No selector'}
                    </div>
                  </div>
                  <button
                    onClick={onClearElement}
                    style={{
                      marginLeft: '8px',
                      padding: '4px 8px',
                      fontSize: '12px',
                      color: '#6b7280',
                      backgroundColor: 'transparent',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = '#f3f4f6';
                      e.currentTarget.style.color = '#374151';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#6b7280';
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '6px', border: '1px solid #fbbf24', fontSize: '13px', color: '#92400e' }}>
                Please click on an element in the browser to select it
              </div>
            )}
          </div>

          {/* Page Selection */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
              Page <span style={{ color: '#ef4444' }}>*</span>
            </label>
            {hasSelectedPage ? (
              <div style={{ padding: '8px 12px', backgroundColor: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#111827', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedPageInfo.page_title || `Page ${selectedPageInfo.page_index + 1}`}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedPageInfo.page_url}
                </div>
              </div>
            ) : (
              <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '6px', border: '1px solid #fbbf24', fontSize: '13px', color: '#92400e' }}>
                Please click on an element in the browser to select it (page will be selected automatically)
              </div>
            )}
          </div>

          {/* CSS Property Selection */}
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="css-property" style={{ display: 'block', marginBottom: 8 }}>
              CSS Property <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              id="css-property"
              value={cssProperty}
              onChange={(e) => setCssProperty(e.target.value as CssPropertyType)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                color: '#111827',
                backgroundColor: '#ffffff',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                boxSizing: 'border-box',
                cursor: 'pointer'
              }}
              onFocus={(e) => {
                e.target.style.outline = 'none';
                e.target.style.borderColor = '#3b82f6';
                e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#d1d5db';
                e.target.style.boxShadow = 'none';
              }}
            >
              {CSS_PROPERTIES.map(prop => (
                <option key={prop.value} value={prop.value}>
                  {prop.label}
                </option>
              ))}
            </select>
          </div>

          {/* CSS Value Input */}
          <div>
            <label htmlFor="css-value" style={{ display: 'block', marginBottom: 8 }}>
              CSS Value <span style={{ color: '#ef4444' }}>*</span>
              {isColorInput && (
                <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '8px', fontWeight: 'normal' }}>
                  (only support rgba/rgb format)
                </span>
              )}
              {isFontSize && (
                <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '8px', fontWeight: 'normal' }}>
                  (Only support px value, e.g., 16px)
                </span>
              )}
              {isFontWeight && (
                <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '8px', fontWeight: 'normal' }}>
                  (Only support number value, e.g., 400)
                </span>
              )}
            </label>
            <input
              ref={cssValueInputRef}
              id="css-value"
              type={isColorInput ? 'text' : 'text'}
              value={cssValue}
              onChange={(e) => handleValueChange(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={
                isColorInput 
                  ? 'e.g., #ff0000, rgb(255,0,0), red' 
                  : isFontSize 
                    ? 'e.g., 16px'
                    : isFontWeight
                      ? 'e.g., 400'
                    : 'Enter CSS value'
              }
            />
          </div>
        </div>
        <div className="css-assert-modal-footer">
          <button 
            className="css-assert-modal-cancel" 
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button 
            className="css-assert-modal-confirm" 
            onClick={handleConfirm}
            disabled={disabled}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default CSSAssertModal;

