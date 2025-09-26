import { previewNode, extractElementText } from '../../domUtils.js';

export function handleAiAssert(element, selectors) {
  const elementType = element.tagName.toLowerCase();
  const elementPreview = previewNode(element);
  const elementText = extractElementText(element);
  const data = {
    selector: selectors,
    assertType: 'AI',
    value: '',
    element: elementType,
    elementPreview: elementPreview,
    elementText: elementText
  };
  if (window.sendActionToMain) {
    window.sendActionToMain({ 
      type: 'assert', 
      ...data, 
      timestamp: Date.now(), 
      url: window.location.href, 
      title: document.title 
    });
  }
}


