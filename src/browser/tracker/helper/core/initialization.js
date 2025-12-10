import { createHoverOverlay, enableHoverEffects, disableHoverEffects, showHoverEffect, hideHoverEffect, getCurrentHoveredElement, getHoverOverlay } from '../dom/hoverOverlay.js';
import { initializeErrorHandlers } from './errorHandler.js';
import { initializeNavigationPrevention, setAssertMode as setNavAssertMode } from './navigationPrevention.js';
import { handleClickEvent } from './eventHandlers.js';
import { setPauseMode, buildElement } from '../actions/baseAction.js';
import { handleDoubleClickEvent, handleRightClickEvent, handleShiftClickEvent } from '../actions/click_handle.js';
import { generateSelector, validateAndImproveSelector, generateAndValidateSelectors } from '../selector_generator/selectorGenerator.js';
import { previewNode, extractElementText } from '../dom/domUtils.js';
import { showAssertInputModal, closeAssertInputModal } from '../components/modals/assertInputModal.js';
import { handleTextInputEvent } from '../actions/text_input_handle.js';
import { initializeElementFreezer, freezeEntireScreen, unfreezeEntireScreen, unfreezeAllElements } from '../dom/elementFreezer.js';
// import { handleCheckboxRadioChangeEvent } from '../actions/change_handle.js';
import { handleKeyDownEvent } from '../actions/keyboard_handle.js';
import { handleSelectChangeEvent } from '../actions/select_handle.js';
import { handleDragStartEvent, handleDragEndEvent, handleDropEvent } from '../actions/drag_and_drop.js';
import { handleUploadChangeEvent } from '../actions/upload_handle.js';
import { handleScrollEvent } from '../actions/scroll_handle.js';
import { handleWindowResizeEvent, setExecutingActionsState } from '../actions/window_resize.js';
// import { generateAndValidateSelectors } from '../selector_generator/selectorGenerator.js';
let globalAssertMode = false;
let browserControls = null;
let browserHandlersDisposer = null;

function handleAssertCaptureBlocking(e) {
  if (!globalAssertMode) {
    return;
  }

  const target = e.target;
  if (!target) {
    return;
  }

  // Check trực tiếp tagName và parent để tránh vấn đề với closest
  const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';
  const isContentEditable = target.isContentEditable || target.getAttribute('contenteditable') === 'true';
  
  // Check activeElement (element đang được focus) để đảm bảo input trong panel được phép
  const activeElement = document.activeElement;
  const activeIsInput = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'SELECT');
  
  // Nếu activeElement là input/textarea trong query panel, cho phép tất cả events
  if (activeIsInput && activeElement.closest && activeElement.closest('#rikkei-query-panel')) {
    return;
  }
  
  // Nếu activeElement là input/textarea trong API request panel, cho phép tất cả events
  if (activeIsInput && activeElement.closest && activeElement.closest('#rikkei-api-request-panel')) {
    return;
  }
  
  // Allow interactions with assert modal
  if (target.closest && target.closest('#rikkei-assert-input-modal')) {
    return;
  }

  // Allow interactions with browser controls
  if (target.closest && target.closest('#rikkei-browser-controls')) {
    return;
  }

  // Allow interactions with query panel (bao gồm tất cả input/textarea trong panel)
  // Check cả bằng ID và bằng parent element
  const queryPanel = target.closest && target.closest('#rikkei-query-panel');
  if (queryPanel) {
    // Cho phép tất cả events trong query panel, đặc biệt là keydown/keyup/input để có thể nhập dấu *
    return;
  }
  
  // Check trực tiếp nếu target là textarea/input trong query panel
  if (isInput && target.closest && target.closest('#rikkei-query-panel')) {
    return;
  }

  // Allow interactions with API request panel (bao gồm tất cả input/textarea trong panel)
  const apiRequestPanel = target.closest && target.closest('#rikkei-api-request-panel');
  if (apiRequestPanel) {
    // Cho phép tất cả events trong API request panel
    return;
  }
  
  // Check trực tiếp nếu target là input/textarea/select trong API request panel
  if (isInput && target.closest && target.closest('#rikkei-api-request-panel')) {
    return;
  }
  
  // Allow interactions with variables panel
  const variablesPanel = target.closest && target.closest('[id*="variables"]');
  if (variablesPanel) {
    return;
  }
  
  // Cho phép tất cả input events trong các panel (fallback check)
  if (isInput || isContentEditable) {
    // Kiểm tra xem có phải trong bất kỳ panel nào không
    let parent = target.parentElement;
    let depth = 0;
    while (parent && depth < 10) {
      if (parent.id) {
        if (parent.id.includes('query-panel') || 
            parent.id.includes('api-request-panel') || 
            parent.id.includes('variables') ||
            parent.id.includes('assert-input-modal')) {
          return;
        }
      }
      parent = parent.parentElement;
      depth++;
    }
  }

  // Only block specific events that could trigger unwanted actions
  const blockableEvents = [
    'click',
    'submit',
    'mousedown',
    'mouseup',
    'keydown',
    'keyup',
    'input',
    'change',
    'dragstart',
    'dragend',
    'dragover',
    'dragleave',
    'drop',
    'contextmenu',
    'dblclick'
  ];

  if (blockableEvents.includes(e.type)) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    e.returnValue = false;

    if (e.type === 'click') {
      const clickTarget = e.target;
      queueMicrotask(() => {
        if (clickTarget) {
          handleAssertClick({ target: clickTarget });
        }
      });
    }
  } else {
  }
}

function handleAssertClick(e) {
  processAssertClick(e);
}

/**
 * Check if element is a multi-select or multi-combobox
 * Kiểm tra xem element có phải là select multiple hoặc combobox multiple không
 */
function processAssertClick(e) {
  const assertType = window.currentAssertType || 'toBeVisible';
  try {
    const selector = generateAndValidateSelectors(e.target, { minScore: 0, validate: true });
    const elementType = e.target.tagName.toLowerCase();
    const elementPreview = previewNode(e.target);
    const elementText = extractElementText(e.target);
    const DOMelement = e.target.outerHTML;

    const types = ['toHaveText', 'toContainText', 'toHaveValue', 'toHaveAccessibleDescription', 'toHaveAccessibleName', 'toHaveCount', 'toHaveRole'];
    
    if (types.includes(assertType)) {
      let defaultValue = '';
      if (assertType === 'toHaveValue' ) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
          defaultValue = e.target.value || '';
        } else {
          defaultValue = e.target.getAttribute('value') || e.target.textContent?.trim() || '';
        }
      } else {
        defaultValue = e.target.textContent?.trim() || e.target.innerText?.trim() || '';
      }
      const rect = e.target.getBoundingClientRect();
      showAssertInputModal(
        assertType,
        defaultValue,
        rect,
        (finalValue, connection, connection_id, query, apiRequest) => {
          sendAssertAction(selector, assertType, finalValue, elementType, elementPreview, elementText, connection, connection_id, query, DOMelement, apiRequest);
        },
        () => {
        }
      );
    } else {
      sendAssertAction(selector, assertType, '', elementType, elementPreview, elementText, undefined, undefined, undefined, DOMelement, undefined);
    }
  } catch (error) {
  }
}

function sendAssertAction(selector, assertType, value, elementType, elementPreview, elementText, connection_id, connection, query, DOMelement, apiRequest) {
  if (window.sendActionToMain) {
    var action_datas = {};
    action_datas.value = {
      value: value ? value : undefined,
      htmlDOM: DOMelement ? DOMelement : undefined,
      elementText: elementText ? elementText : undefined,
      page_index: window.__PAGE_INDEX__ || 0,
      page_url: window.location.href || '',
      page_title: document.title || '',
    };
    if (query) {
      action_datas.statement = {
        statement_id: Math.random().toString(36),
        statement_text: query,
        connection_id: connection_id,
        connection: {
          ...connection,
          port: connection && connection.port !== undefined ? String(connection.port) : undefined,
        }
      };
    }
    if (apiRequest) {
      action_datas.api_request = apiRequest ? {
        api_request_id: apiRequest.api_request_id,
        createType: apiRequest.createType || 'system',
        url: apiRequest.url,
        method: apiRequest.method,
        params: apiRequest.params && apiRequest.params.length > 0 ? apiRequest.params.map(p => ({
          api_request_param_id: p.api_request_param_id,
          key: p.key,
          value: p.value
        })) : undefined,
        headers: apiRequest.headers && apiRequest.headers.length > 0 ? apiRequest.headers.map(h => ({
          api_request_header_id: h.api_request_header_id,
          key: h.key,
          value: h.value
        })) : undefined,
        auth: apiRequest.auth ? {
          apiRequestId: apiRequest.auth.apiRequestId,
          type: apiRequest.auth.type,
          storage_enabled: apiRequest.auth.storage_enabled,
          username: apiRequest.auth.username,
          password: apiRequest.auth.password,
          token: apiRequest.auth.token,
          token_storages: apiRequest.auth.token_storages && apiRequest.auth.token_storages.length > 0 ? apiRequest.auth.token_storages.map(ts => ({
            api_request_token_storage_id: ts.api_request_token_storage_id,
            type: ts.type,
            key: ts.key
          })) : undefined,
          basic_auth_storages: apiRequest.auth.basic_auth_storages && apiRequest.auth.basic_auth_storages.length > 0 ? apiRequest.auth.basic_auth_storages.map(bs => ({
            api_request_basic_auth_storage_id: bs.api_request_basic_auth_storage_id,
            type: bs.type,
            usernameKey: bs.usernameKey,
            passwordKey: bs.passwordKey,
            enabled: bs.enabled
          })) : undefined
        } : undefined,
        body: apiRequest.body ? {
          api_request_id: apiRequest.body.api_request_id,
          type: apiRequest.body.type,
          content: apiRequest.body.content,
          formData: apiRequest.body.formData && apiRequest.body.formData.length > 0 ? apiRequest.body.formData.map(fd => ({
            api_request_body_form_data_id: fd.api_request_body_form_data_id,
            name: fd.name,
            value: fd.value,
            orderIndex: fd.orderIndex
          })) : undefined
        } : undefined
      } : undefined;
    };
    // Build element với đầy đủ thông tin
    const element = DOMelement 
      ? buildElement(DOMelement, selector, 1)
      : {
          selectors: selector.map((s) => ({ value: s })),
          order_index: 1,
        };
    
    const action = {
      action_type: 'assert',
      assert_type: assertType,
      elements: [element],
      action_datas: [action_datas]
    }
    window.sendActionToMain(action);
    closeAssertInputModal();
  } else {
    console.error('window.sendActionToMain is not defined');
  }
}

/**
 * Send assert toHaveValues action với list value objects
 * Mỗi value object chứa: {value, connection, connectionId, query, apiRequest}
 * Mỗi value object sẽ được chuyển thành một action_data giống như sendAssertAction
 */
function sendAssertToHaveValuesAction(selector, assertType, valueObjects, elementType, elementPreview, elementText, DOMelement) {
  if (window.sendActionToMain) {
    // Build element với đầy đủ thông tin
    const element = DOMelement 
      ? buildElement(DOMelement, selector, 1)
      : {
          selectors: selector.map((s) => ({ value: s })),
          order_index: 1,
        };
    
    // Tạo action_datas cho mỗi value object, giống như sendAssertAction
    const action_datas_array = valueObjects.map((valueObj) => {
      // Tạo action_data giống như sendAssertAction
      const action_data = {};
      
      // Thêm value
      action_data.value = {
        value: valueObj.value ? valueObj.value : undefined,
        htmlDOM: DOMelement ? DOMelement : undefined,
        elementText: elementText ? elementText : undefined,
        page_index: window.__PAGE_INDEX__ || 0,
        page_url: window.location.href || '',
        page_title: document.title || '',
      };
      
      // Thêm statement nếu có query (giống sendAssertAction)
      if (valueObj.query && valueObj.connection) {
        action_data.statement = {
          statement_id: Math.random().toString(36),
          statement_text: valueObj.query,
          connection_id: valueObj.connectionId,
          connection: {
            ...valueObj.connection,
            port: valueObj.connection && valueObj.connection.port !== undefined ? String(valueObj.connection.port) : undefined,
          }
        };
      }
      
      // Thêm api_request nếu có (giống sendAssertAction)
      if (valueObj.apiRequest) {
        action_data.api_request = {
          api_request_id: valueObj.apiRequest.api_request_id,
          createType: valueObj.apiRequest.createType || 'system',
          url: valueObj.apiRequest.url,
          method: valueObj.apiRequest.method,
          params: valueObj.apiRequest.params && valueObj.apiRequest.params.length > 0 ? valueObj.apiRequest.params.map(p => ({
            api_request_param_id: p.api_request_param_id,
            key: p.key,
            value: p.value
          })) : undefined,
          headers: valueObj.apiRequest.headers && valueObj.apiRequest.headers.length > 0 ? valueObj.apiRequest.headers.map(h => ({
            api_request_header_id: h.api_request_header_id,
            key: h.key,
            value: h.value
          })) : undefined,
          auth: valueObj.apiRequest.auth ? {
            apiRequestId: valueObj.apiRequest.auth.apiRequestId,
            type: valueObj.apiRequest.auth.type,
            storage_enabled: valueObj.apiRequest.auth.storage_enabled,
            username: valueObj.apiRequest.auth.username,
            password: valueObj.apiRequest.auth.password,
            token: valueObj.apiRequest.auth.token,
            token_storages: valueObj.apiRequest.auth.token_storages && valueObj.apiRequest.auth.token_storages.length > 0 ? valueObj.apiRequest.auth.token_storages.map(ts => ({
              api_request_token_storage_id: ts.api_request_token_storage_id,
              type: ts.type,
              key: ts.key
            })) : undefined,
            basic_auth_storages: valueObj.apiRequest.auth.basic_auth_storages && valueObj.apiRequest.auth.basic_auth_storages.length > 0 ? valueObj.apiRequest.auth.basic_auth_storages.map(bs => ({
              api_request_basic_auth_storage_id: bs.api_request_basic_auth_storage_id,
              type: bs.type,
              usernameKey: bs.usernameKey,
              passwordKey: bs.passwordKey,
              enabled: bs.enabled
            })) : undefined
          } : undefined,
          body: valueObj.apiRequest.body ? {
            api_request_id: valueObj.apiRequest.body.api_request_id,
            type: valueObj.apiRequest.body.type,
            content: valueObj.apiRequest.body.content,
            formData: valueObj.apiRequest.body.formData && valueObj.apiRequest.body.formData.length > 0 ? valueObj.apiRequest.body.formData.map(fd => ({
              api_request_body_form_data_id: fd.api_request_body_form_data_id,
              name: fd.name,
              value: fd.value,
              orderIndex: fd.orderIndex
            })) : undefined
          } : undefined
        };
      }
      
      return action_data;
    });
    
    const action = {
      action_type: 'assert',
      assert_type: assertType,
      elements: [element],
      action_datas: action_datas_array
    };
    
    window.sendActionToMain(action);
    closeAssertToHaveValuesModal();
  } else {
    console.error('window.sendActionToMain is not defined');
  }
}

export function initBrowserControls() {
  if (!document.querySelector('link[href*="font-awesome"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css';
    document.head.appendChild(link);
  }

  setTimeout(() => {
    createHoverOverlay();
  }, 100);
}

export function initializeEventListeners() {
  document.addEventListener('input', handleTextInputEvent, true);
  // document.addEventListener('change', handleCheckboxRadioChangeEvent);
  document.addEventListener('change', handleSelectChangeEvent, true);
  document.addEventListener('click', handleClickEvent, true);
  document.addEventListener('dblclick', handleDoubleClickEvent, true);
  document.addEventListener('keydown', handleKeyDownEvent, true);
  document.addEventListener('change', handleUploadChangeEvent, true);
  document.addEventListener('dragstart', handleDragStartEvent, true);
  document.addEventListener('drop', handleDropEvent, true);
  document.addEventListener('contextmenu', handleRightClickEvent, true);
  window.addEventListener('scroll', handleScrollEvent, { passive: true });
  document.addEventListener('scroll', handleScrollEvent, { passive: true, capture: true });
  window.addEventListener('resize', handleWindowResizeEvent, { passive: true });

  // Add capture phase event blocker for assert mode - blocks specific events only
  document.addEventListener('click', handleAssertCaptureBlocking, true);
  document.addEventListener('submit', handleAssertCaptureBlocking, true);
  document.addEventListener('mousedown', handleAssertCaptureBlocking, true);
  document.addEventListener('mouseup', handleAssertCaptureBlocking, true);
  document.addEventListener('input', handleAssertCaptureBlocking, true);
  document.addEventListener('change', handleAssertCaptureBlocking, true);
  document.addEventListener('keydown', handleAssertCaptureBlocking, true);
  document.addEventListener('keyup', handleAssertCaptureBlocking, true);
  document.addEventListener('dragstart', handleAssertCaptureBlocking, true);
  document.addEventListener('dragend', handleAssertCaptureBlocking, true);
  document.addEventListener('dragover', handleAssertCaptureBlocking, true);
  document.addEventListener('dragleave', handleAssertCaptureBlocking, true);
  document.addEventListener('drop', handleAssertCaptureBlocking, true);
  document.addEventListener('contextmenu', handleAssertCaptureBlocking, true);
  document.addEventListener('dblclick', handleAssertCaptureBlocking, true);
}

export function initializeHoverEffects() {
  document.addEventListener('mouseover', function (e) {
    if (e.target.closest('#rikkei-browser-controls') || e.target.closest('#rikkei-hover-overlay')) {
      return;
    }
    showHoverEffect(e.target);
  });

  // Mouse out tracking
  document.addEventListener('mouseout', function (e) {
    if (e.relatedTarget && (e.relatedTarget.closest('#rikkei-browser-controls') || e.relatedTarget.closest('#rikkei-hover-overlay'))) {
      return;
    }
    hideHoverEffect();
  });

  // Handle scroll events to update hover overlay position
  document.addEventListener('scroll', function () {
    const currentHoveredElement = getCurrentHoveredElement();
    const hoverOverlay = getHoverOverlay();
    if (currentHoveredElement && hoverOverlay) {
      showHoverEffect(currentHoveredElement);
    }
  });

  // Handle window resize to update hover overlay
  window.addEventListener('resize', function () {
    const currentHoveredElement = getCurrentHoveredElement();
    const hoverOverlay = getHoverOverlay();
    if (currentHoveredElement && hoverOverlay) {
      showHoverEffect(currentHoveredElement);
    }
  });
}

export function initializeTracking() {
  initializeErrorHandlers();
  initializeNavigationPrevention();
  initializeElementFreezer();
  initBrowserControls();
  initializeEventListeners();
  initializeHoverEffects();
  // initializeNavigateHandle();

  // initializeTabActivateListener();

  // Expose functions to main process
  window.setAssertMode = function (enabled, assertType) {
    globalAssertMode = enabled;
    if (enabled) {
      window.currentAssertType = assertType;
    }
    // setAssertMode(enabled, assertType);
    setNavAssertMode(enabled, assertType);

    if (enabled) {
      freezeEntireScreen();
    } else {
      unfreezeEntireScreen();
      closeAssertInputModal();
      closeAssertToHaveValuesModal();
    }
  };

  window.setPauseMode = function (enabled) {
    setPauseMode(enabled);
  };

  // Control hover effects
  window.enableHoverEffects = enableHoverEffects;
  window.disableHoverEffects = disableHoverEffects;

  // Expose reset function globally so it can be called from main process
  window.resetLastInputAction = function () {
    resetLastInputAction();
  };

  // Expose element freezer functions globally
  window.unfreezeEntireScreen = unfreezeEntireScreen;
  window.unfreezeAllElements = unfreezeAllElements;
  // Note: per new full-screen freeze design, no per-element unfreeze API exposed

  // Expose cleanup function for browser handlers
  // window.cleanupBrowserHandlers = function() {
  //   if (browserHandlersDisposer) {
  //     browserHandlersDisposer();
  //     browserHandlersDisposer = null;
  //   }
  // };

  // Expose function to control execution state for resize events
  window.setExecutingActionsState = setExecutingActionsState;
}

// Check if DOM is ready
export function initializeWhenReady() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTracking);
  } else {
    initializeTracking();
  }
}
