import { 
  getPauseMode,
  shouldIgnoreTarget,
  buildSelectors,
  buildCommonActionData,
  sendAction
} from './baseAction.js';

// Xử lý sự kiện change cho <select>
export function handleSelectChangeEvent(e) {
  const el = e?.target;
  const tag = el?.tagName?.toLowerCase?.();
  if (tag !== 'select') return;

  // console.log('Select change detected:', previewNode(el));
  if (shouldIgnoreTarget(el, 'Select Change')) return;
  if (getPauseMode && getPauseMode()) {
    // console.log('Skipping select change recording - recording is paused');
    return;
  }
  if (e && e.isTrusted === false) {
    try { console.log('Skipping select change recording - event is not trusted'); } catch {}
    return;
  }
  const selectors = buildSelectors(el, { maxSelectors: 5, minScore: 100, validate: true });
  const selectedValue = e?.target?.value || '';
  const selectedText = el.selectedOptions && el.selectedOptions[0] ? (el.selectedOptions[0].text || '') : '';
  const elementText = extractElementText(el);

  sendAction({
    action_type: 'select',
    elements: [{
      selectors: selectors.map((selector) => ({ value: selector })),
    }],
    action_datas: [{
      value: {
        value: selectedValue,
        selected_value: selectedValue,
        selected_text: selectedText,
        elementText: elementText,
      },
    }],
  });
}


