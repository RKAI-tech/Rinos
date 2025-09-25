import { previewNode, extractElementText } from '../../domUtils.js';

// Kiểm tra element đã được checked hay chưa (checkbox/radio hoặc aria-checked)
export function handleToBeCheckedAssert(element, selectors) {
  const elementType = element?.tagName?.toLowerCase?.() || 'unknown';
  const elementPreview = previewNode(element);
  const elementText = extractElementText(element);

  let isChecked = false;
  try {
    if (typeof element.checked === 'boolean') {
      isChecked = !!element.checked;
    } else {
      const ariaChecked = element.getAttribute && element.getAttribute('aria-checked');
      if (ariaChecked != null) {
        isChecked = ariaChecked === 'true';
      }
    }
  } catch {}

  const data = {
    selector: selectors,
    assertType: 'VALUE',
    value: isChecked ? 'checked' : 'unchecked',
    element: elementType,
    elementPreview: elementPreview,
    elementText: elementText
  };

  if (window.sendActionToMain) {
    window.sendActionToMain({
      type: 'assert',
      data: { ...data, timestamp: Date.now(), url: window.location.href, title: document.title }
    });
  }
}


