import { showAssertInputModal } from '../../assertModal.js';
import { previewNode, extractElementText } from '../../domUtils.js';

export function handleTextAssert(element, selectors) {
  const elementType = element.tagName.toLowerCase();
  const elementPreview = previewNode(element);
  const elementText = extractElementText(element);

  const defaultValue = element.textContent?.trim() || element.innerText?.trim() || '';
  const rect = element.getBoundingClientRect();
  showAssertInputModal('TEXT', defaultValue, rect, (finalValue) => {
    const data = {
      selector: selectors,
      assertType: 'TEXT',
      value: finalValue || '',
      element: elementType,
      elementPreview: elementPreview,
      elementText: elementText
    };
    if (window.sendActionToMain) {
      window.sendActionToMain({ type: 'assert', data: { ...data, timestamp: Date.now(), url: window.location.href, title: document.title } });
    }
  }, () => {});
}


