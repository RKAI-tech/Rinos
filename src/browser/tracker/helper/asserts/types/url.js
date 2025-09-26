export function handleUrlAssert(selectors) {
  const elementType = 'document';
  const elementPreview = 'URL check';
  const elementText = window.location.href;
  const data = {
    selector: selectors,
    assertType: 'URL',
    value: window.location.href,
    element: elementType,
    elementPreview: elementPreview,
    elementText: elementText
  };
  if (window.sendActionToMain) {
    window.sendActionToMain({ type: 'assert', data: { ...data, timestamp: Date.now(), url: window.location.href, title: document.title } });
  }
}


