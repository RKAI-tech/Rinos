import { buildSelectors, sendAction } from './baseAction.js';
import { previewNode, extractElementText } from '../domUtils.js';
import {shouldIgnoreTarget} from './baseAction.js';
// Xử lý sự kiện change chung cho checkbox và radio
export function handleCheckboxRadioChangeEvent(e) {
  const el = e?.target;
  const tag = el?.tagName?.toLowerCase?.();
  const type = el?.type?.toLowerCase?.();
  if (tag !== 'input' || (type !== 'checkbox' && type !== 'radio')) return;
 
  const selectors = buildSelectors(el, { maxSelectors: 5, minScore: 300, validate: true });
  const isChecked = !!el.checked;
  const elementText = extractElementText(el);

  // Gửi cùng một loại action 'checkbox' như hệ thống hiện tại đang dùng
  sendAction("change", {
    selector: selectors,
    checked: isChecked,
    value: el.value || '',
    element: type,
    elementPreview: previewNode(el),
    elementText: elementText
  });
}
