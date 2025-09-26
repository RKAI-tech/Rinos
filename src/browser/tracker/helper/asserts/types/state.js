import { previewNode, extractElementText } from '../../domUtils.js';

function computeEnableValue(element) {
  const disabled = element.disabled || element.hasAttribute('disabled') || element.classList.contains('disabled') || element.style.pointerEvents === 'none';
  return disabled ? 'disabled' : 'enabled';
}

export function handleEnableAssert(element, selectors) {
  const elementType = element.tagName.toLowerCase();
  const elementPreview = previewNode(element);
  const elementText = extractElementText(element);
  const data = {
    selector: selectors,
    assertType: 'ENABLE',
    value: computeEnableValue(element),
    element: elementType,
    elementPreview: elementPreview,
    elementText: elementText
  };
  if (window.sendActionToMain) {
    window.sendActionToMain({ type: 'assert', data: { ...data, timestamp: Date.now(), url: window.location.href, title: document.title } });
  }
}

export function handleDisableAssert(element, selectors) {
  const elementType = element.tagName.toLowerCase();
  const elementPreview = previewNode(element);
  const elementText = extractElementText(element);
  const data = {
    selector: selectors,
    assertType: 'DISABLE',
    value: 'disabled',
    element: elementType,
    elementPreview: elementPreview,
    elementText: elementText
  };
  if (window.sendActionToMain) {
    window.sendActionToMain({ type: 'assert', data: { ...data, timestamp: Date.now(), url: window.location.href, title: document.title } });
  }
}

export function handleVisibilityAssert(element, selectors) {
  const elementType = element.tagName.toLowerCase();
  const elementPreview = previewNode(element);
  const elementText = extractElementText(element);
  const data = {
    selector: selectors,
    assertType: 'VISIBILITY',
    value: '',
    element: elementType,
    elementPreview: elementPreview,
    elementText: elementText
  };
  if (window.sendActionToMain) {
    window.sendActionToMain({ type: 'assert', data: { ...data, timestamp: Date.now(), url: window.location.href, title: document.title } });
  }
}


