import { 
    getPauseMode,
    shouldIgnoreTarget,
    buildSelectors,
    buildCommonActionData,
    sendAction
  } from './baseAction.js';
  import { extractElementText } from '../dom/domUtils.js';
  // Danh sách phím modifier/special không cần ghi lại riêng lẻ
  const SKIP_KEYS = new Set([
    'Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'NumLock', 'ScrollLock',
    'Fn', 'FnLock', 'Hyper', 'Super', 'OS', 'Compose'
  ]);
  const EXCEPTION_KEYS = new Set(["Tab", "Enter"]);
  // Kiểm tra có phải element nhập liệu không
  function isEditableElement(el) {
    if (!el) return false;
    const tag = el.tagName?.toLowerCase?.();
    if (tag === 'input' || tag === 'textarea') return true;
    if (el.isContentEditable) return true;
    return false;
  }


  // Tạo tên tổ hợp phím
  function buildShortcutName(e) {
    const parts = [];
    if (e.ctrlKey) parts.push("Ctrl");
    if (e.shiftKey) parts.push("Shift");
    if (e.altKey) parts.push("Alt");
    if (e.metaKey) parts.push("Meta");
    parts.push(e.code); 
    return parts.join("+");
  }
  
  // Base cho key events
  function handleKeyLikeBase(e, actionType, eventLabel = 'Key') {
    // Bỏ qua nếu nhập liệu trong input/textarea/contenteditable

  
    // Bỏ qua modifier đơn lẻ
    if (SKIP_KEYS.has(e?.key)) return;
  
    // Nếu đang pause thì skip
    if (getPauseMode && getPauseMode()) {
      // console.log(`Skipping ${eventLabel} recording - recording is paused`);
      return;
    }
  
    // Log thông tin
    const selectors = buildSelectors(e?.target);
    const elementText = extractElementText(e?.target);
    const shortcut = buildShortcutName(e);
    //check type input to isEditableElement
    if (isEditableElement(e?.target)){
      if (!e.ctrlKey && !e.altKey && !e.metaKey && !EXCEPTION_KEYS.has(e.key)) {
        return;
      }
    }

    sendAction({
      action_type: actionType,
      elements: [{
        selectors: selectors.map((selector) => ({ value: selector })),
      }],
      action_datas: [{
        value: { value: shortcut, elementText: elementText },
      }],
    });
  }
  
  // Export handlers
  export function handleKeyDownEvent(e) {
    return handleKeyLikeBase(e, 'keydown', 'Key Down');
  }
