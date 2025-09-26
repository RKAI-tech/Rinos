import { 
  getPauseMode,
  shouldIgnoreTarget,
  buildSelectors,
  buildCommonActionData,
  sendAction
} from './baseAction.js';
import { previewNode, extractElementText } from '../domUtils.js';

// Xử lý sự kiện change cho <select>
export function handleSelectChangeEvent(e) {
  const el = e?.target;
  const tag = el?.tagName?.toLowerCase?.();
  if (tag !== 'select') return;

  console.log('Select change detected:', previewNode(el));
  if (shouldIgnoreTarget(el, 'Select Change')) return;
  if (getPauseMode && getPauseMode()) {
    console.log('Skipping select change recording - recording is paused');
    return;
  }

  const selectors = buildSelectors(el, { maxSelectors: 5, minScore: 300, validate: true });
  const selectedValue = el.value || '';
  const selectedText = el.selectedOptions && el.selectedOptions[0] ? (el.selectedOptions[0].text || '') : '';
  const elementText = extractElementText(el);

  const payload = buildCommonActionData(e, selectors, {
    value: selectedValue,
    selected_value: selectedValue,
    selected_text: selectedText,
    element: 'select',
    elementPreview: previewNode(el),
    elementText
  });

  console.log('Select event - selectors:', selectors, 'value:', selectedValue, 'text:', selectedText);
  sendAction('select', payload);
}


