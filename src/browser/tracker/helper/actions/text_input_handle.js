import { 
  getPauseMode,
  shouldIgnoreTarget,
  buildSelectors,
  buildCommonActionData,
  sendAction
} from './baseAction.js';
import { previewNode } from '../domUtils.js';

export function handleInputLikeBase(e, actionType = 'input', eventLabel = 'Input') {
  // console.log(`${eventLabel} event detected:`, previewNode(e?.target));
  if (shouldIgnoreTarget(e?.target, eventLabel)) return;
  if (getPauseMode && getPauseMode()) {
    // console.log(`Skipping ${eventLabel} recording - recording is paused`);
    return;
  }
  const selectors = buildSelectors(e?.target);
  const value = e?.target?.value;
  const payload = buildCommonActionData(e, selectors, { value });
  // console.log(`${eventLabel} event - generated selectors:`, selectors, 'value:', value);
  sendAction(actionType, payload);
}

// Xử lý input cho các trường nhập văn bản và số liệu phổ biến
export function handleTextInputEvent(e) {
  const tag = e?.target?.tagName?.toLowerCase?.();
  const type = e?.target?.type?.toLowerCase?.() || '';

  // Bỏ qua các loại đã có handler riêng qua change
  if (tag === 'input' && (type === 'checkbox' || type === 'radio')) {
    return;
  }

  if (tag === 'input') {
    return handleInputLikeBase(e, 'input', 'Input');
  }

  if (tag === 'textarea') {
    return handleInputLikeBase(e, 'input', 'Textarea Input');
  }
}
