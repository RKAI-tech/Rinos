import { 
  getPauseMode,
  shouldIgnoreTarget,
  buildSelectors,
  buildCommonActionData,
  sendAction
} from './baseAction.js';
import { previewNode, extractElementText } from '../dom/domUtils.js';

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
  if (!e.isTrusted) {
    // console.debug('Skipping upload — untrusted event');
    return;
  }
  const selectors = buildSelectors(el);
  const fileList = await Promise.all(
    Array.from(el.files || []).map(async f => ({
      file_name: f.name,
      type: f.type,
      file_path: undefined,
      file_content: await readFileContent(f) // data: URL
    }))
  );

  const value= undefined;

  const elementText = extractElementText(el);
  sendAction({
    action_type: 'upload',
    elements: [{
      selectors: selectors.map((selector) => ({ value: selector })),
    }],
    action_datas: [
    {
      value: {
        page_index: window.__PAGE_INDEX__ || 0,
      },
    },
    ...fileList.map(file => ({file_upload: file})),
  ],
  });
}
