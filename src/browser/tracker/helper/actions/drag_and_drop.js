import { 
  getPauseMode,
  shouldIgnoreTarget,
  buildSelectors,
  buildCommonActionData,
  sendAction
} from './baseAction.js';
import { previewNode, extractElementText } from '../dom/domUtils.js';
// Trạng thái drag and drop đơn giản
let isDragging = false;

// Xử lý sự kiện drag start
export function handleDragStartEvent(e) {
  // console.log('Drag start event detected:', previewNode(e?.target));
  
  if (shouldIgnoreTarget(e?.target, 'Drag Start')) return;
  if (getPauseMode && getPauseMode()) {
    // console.log('Skipping drag start recording - recording is paused');
    return;
  }
  if (e && e.isTrusted === false) {
    try { 
      // console.log('Skipping drag start recording - event is not trusted'); 
    } catch {}
    return;
  }

  const selectors = buildSelectors(e?.target);
  const elementText = extractElementText(e?.target);
  // Đánh dấu đang drag
  isDragging = true;
  
  // console.log('Drag start event - generated selectors:', selectors);
  sendAction({
    action_type: 'drag_start',
    elements: [{
      selectors: selectors,
    }],
    action_datas: [{
      value: {
        elementText: elementText,
      },
    }],
  });
}

// Xử lý sự kiện drag end
export function handleDragEndEvent(e) {
  // console.log('Drag end event detected:', previewNode(e?.target));
  
  if (shouldIgnoreTarget(e?.target, 'Drag End')) return;
  if (getPauseMode && getPauseMode()) {
    // console.log('Skipping drag end recording - recording is paused');
    return;
  }
  
  if (!isDragging) {
    // console.log('No active drag operation, skipping drag end');
    return;
  }
  
  const selectors = buildSelectors(e?.target);
  const elementText = extractElementText(e?.target);
    
  // console.log('Drag end event - generated selectors:', selectors);
  sendAction({
    action_type: 'drag_end',
    elements: [{
      selectors: selectors,
    }],
    action_datas: [{
      value: {
        elementText: elementText,
      },
    },
    {
      value: {
        page_index: window.__PAGE_INDEX__ || 0,
      },
    }],
  });
  
  // Reset trạng thái drag
  isDragging = false;
}

// Xử lý sự kiện drop
export function handleDropEvent(e) {
  // console.log('Drop event detected:', previewNode(e?.target));
  
  if (shouldIgnoreTarget(e?.target, 'Drop')) return;
  if (getPauseMode && getPauseMode()) {
    // console.log('Skipping drop recording - recording is paused');
    return;
  }
  
  if (!isDragging) {
    // console.log('No active drag operation, skipping drop');
    return;
  }
  
  const selectors = buildSelectors(e?.target);
  const elementText = extractElementText(e?.target);
  // console.log('Drop event - generated selectors:', selectors);
  sendAction({
    action_type: 'drop',
    elements: [{
      selectors: selectors.map((selector) => ({ value: selector })),
    }],
    action_datas: [{
      value: {
        elementText: elementText,
      },
    }],
  });
  
  // Reset trạng thái drag
  isDragging = false;
}



