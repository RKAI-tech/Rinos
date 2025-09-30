import { buildSelectors, sendAction } from './baseAction.js';
import { previewNode, extractElementText } from '../domUtils.js';
import {shouldIgnoreTarget} from './baseAction.js';
// Xử lý sự kiện change cho checkbox, radio, select
export function handleCheckboxRadioChangeEvent(e) {
  const el = e?.target;
  const tag = el?.tagName?.toLowerCase?.();
  const type = el?.type?.toLowerCase?.();
  // Hỗ trợ input[checkbox|radio] và select
  if (!((tag === 'input' && (type === 'checkbox' || type === 'radio')) || tag === 'select')) return;
 
  const selectors = buildSelectors(el, { maxSelectors: 5, minScore: 300, validate: true });
  const isChecked = !!el.checked;
  const elementText = extractElementText(el);
  // Chuẩn hóa value theo loại phần tử
  if (tag === 'input' && type === 'checkbox') {
    const normalizedValue = isChecked ? 'on' : 'off';
    sendAction("change", {
      selector: selectors,
      checked: isChecked,
      value: normalizedValue,
      element: 'checkbox',
      elementPreview: previewNode(el),
      elementText
    });
    return;
  }

  if (tag === 'input' && type === 'radio') {
    // Radio: giá trị là value của option được chọn; checked = true
    const radioValue = el.value || 'on';
    sendAction("change", {
      selector: selectors,
      checked: true,
      value: radioValue,
      element: 'radio',
      name: el.name || undefined,
      elementPreview: previewNode(el),
      elementText
    });
    return;
  }

  if (tag === 'select') {
    const selectedOptions = Array.from(el.selectedOptions || []);
    const selectedTexts = selectedOptions.map(o => (o.textContent || '').trim()).filter(Boolean);
    const selectedValues = selectedOptions.map(o => o.value);
    const normalizedText = selectedTexts.join(', ');
    const normalizedValues = selectedValues.join(',');
    sendAction("change", {
      selector: selectors,
      value: normalizedText,
      selected_value: normalizedValues,
      multiple: !!el.multiple,
      element: 'select',
      elementPreview: previewNode(el),
      elementText
    });
    return;
  }
}
