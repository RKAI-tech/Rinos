import { 
  getPauseMode,
  shouldIgnoreTarget,
  buildSelectors,
  buildCommonActionData,
  sendAction
} from './baseAction.js';
import { previewNode } from '../domUtils.js';

// Xử lý sự kiện upload file (input[type="file"]) 
export function handleUploadChangeEvent(e) {
  const el = e?.target;
  if (!el || el.tagName?.toLowerCase?.() !== 'input' || el.type?.toLowerCase?.() !== 'file') return;

  // console.log('File upload change detected:', previewNode(el));
  if (shouldIgnoreTarget(el, 'Upload')) return;
  if (getPauseMode && getPauseMode()) {
    // console.log('Skipping upload recording - recording is paused');
    return;
  }

  const selectors = buildSelectors(el);
  const fileList = Array.from(el.files || []).map(f => ({ name: f.name, size: f.size, type: f.type }));
  const value = fileList.map(f => f.name).join(', ');

  const payload = buildCommonActionData(e, selectors, {
    value,
    files: fileList
  });

  // console.log('Upload event - generated selectors:', selectors, 'files:', fileList);
  sendAction('upload', payload);
}
