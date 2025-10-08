import { 
  getPauseMode,
  shouldIgnoreTarget,
  buildSelectors,
  buildCommonActionData,
  sendAction
} from './baseAction.js';
import { previewNode } from '../domUtils.js';

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
  
  const selectors = buildSelectors(e?.target);
    
  const payload = buildCommonActionData(e, selectors);
  
  // Đánh dấu đang drag
  isDragging = true;
  
  // console.log('Drag start event - generated selectors:', selectors);
  sendAction('drag_start', payload);
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
    
    const payload = buildCommonActionData(e, selectors);
  
  // console.log('Drag end event - generated selectors:', selectors);
  sendAction('drag_end', payload);
  
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
    
  const payload = buildCommonActionData(e, selectors);
  
  // console.log('Drop event - generated selectors:', selectors);
  sendAction('drop', payload);
  
  // Reset trạng thái drag
  isDragging = false;
}



