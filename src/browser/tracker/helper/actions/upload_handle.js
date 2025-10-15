import { 
  getPauseMode,
  shouldIgnoreTarget,
  buildSelectors,
  buildCommonActionData,
  sendAction
} from './baseAction.js';
import { previewNode } from '../dom/domUtils.js';

function readFileContent(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file); // Hoặc readAsText(file)
  });
}


// Xử lý sự kiện upload file (input[type="file"]) 
export async function handleUploadChangeEvent(e) {
  const el = e?.target;
  if (!el || el.tagName?.toLowerCase?.() !== 'input' || el.type?.toLowerCase?.() !== 'file') return;

  // console.log('File upload change detected:', previewNode(el));
  if (shouldIgnoreTarget(el, 'Upload')) return;
  if (getPauseMode && getPauseMode()) {
    // console.log('Skipping upload recording - recording is paused');
    return;
  }

  const selectors = buildSelectors(el);
  const fileList = await Promise.all(
    Array.from(el.files || []).map(async f => ({
      name: f.name,
      size: f.size,
      type: f.type,
      content: await readFileContent(f) // data: URL
    }))
  );

  const value= undefined;

  const payload = buildCommonActionData(e, selectors, {
    value,
    files: fileList
  });
  sendAction('upload', payload);
}
