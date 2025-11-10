import { createVariablesPanel } from '../panels/variablesPanel.js';
import { createQueryPanel } from '../panels/queryPanel.js';
import { createApiRequestPanel } from '../panels/apiRequestPanel.js';

/**
 * Assert modal functionality for value/text input
 * Chức năng modal assert để nhập giá trị/text
 */

let assertInputModal = null;

/**
 * Close assert input modal
 * Đóng modal nhập assert
 */
export function closeAssertInputModal() {
  if (assertInputModal && assertInputModal.parentNode) {
    // console.log('closeAssertInputModal', assertInputModal);
    assertInputModal.parentNode.removeChild(assertInputModal);
  }
  assertInputModal = null;
  
  // Note: Screen will remain frozen until assert mode is disabled
  // Màn hình sẽ vẫn đóng băng cho đến khi tắt chế độ assert
}

/**
 * Show assert input modal
 * Hiển thị modal nhập assert
 */
export function showAssertInputModal(assertType, defaultValue, anchorRect, onConfirm, onCancel) {
  closeAssertInputModal();
  const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
  const scrollY = window.pageYOffset || document.documentElement.scrollTop;
  const container = document.createElement('div');
  
  container.id = 'rikkei-assert-input-modal';
  container.style.cssText = `
    position: absolute;
    top: ${Math.max(8, (anchorRect?.bottom || 0) + scrollY + 8)}px;
    left: ${Math.max(8, (anchorRect?.left || 0) + scrollX)}px;
    z-index: 10000002;
    background: #ffffff;
    border: 1px solid rgba(0,0,0,0.1);
    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
    border-radius: 8px;
    padding: 8px 10px;
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 260px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;
  
  const input = document.createElement('input');
  input.type = 'text';
  input.value = defaultValue || '';
  input.placeholder = assertType === 'toHaveValue' ? 'Enter expected value…' : 'Enter expected text…';
  input.style.cssText = `
    flex: 1;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 6px 8px;
    font-size: 12px;
    outline: none;
  `;
  
  const cancelBtn = document.createElement('button');
  cancelBtn.innerHTML = '<i class="fas fa-times"></i>';
  cancelBtn.title = 'Cancel';
  cancelBtn.style.cssText = `
    width: 28px; height: 28px; border: none; border-radius: 6px; background: #f3f4f6; color: #374151; cursor: pointer;
  `;
  
  // Insert dropdown trigger (Variables/Queries)
  const insertDropdownWrap = document.createElement('div');
  insertDropdownWrap.style.cssText = 'position:relative;';

  const insertDropdownBtn = document.createElement('button');
  insertDropdownBtn.title = 'Insert…';
  insertDropdownBtn.style.cssText = `
    display:flex;align-items:center;gap:6px; padding: 0 10px; height: 28px; border: none; border-radius: 6px; background: #eef2ff; color: #1d4ed8; cursor: pointer; font-size:12px; font-weight:600;
  `;
  insertDropdownBtn.innerHTML = '<span>Insert</span><i class="fas fa-caret-down"></i>';

  const insertMenu = document.createElement('div');
  insertMenu.style.cssText = `
    position:absolute; top:34px; right:0; z-index:10004; background:#fff; border:1px solid rgba(0,0,0,0.1); box-shadow:0 8px 24px rgba(0,0,0,0.15); border-radius:8px; min-width:160px; display:none; overflow:hidden;
  `;
  const menuItemStyle = 'display:flex;align-items:center;gap:8px;padding:8px 10px;font-size:12px;cursor:pointer;color:#111827;background:#fff;';
  const menuItemHover = 'this.style.background="#f3f4f6"';

  const itemVariables = document.createElement('div');
  itemVariables.style.cssText = menuItemStyle;
  itemVariables.setAttribute('onmouseover', menuItemHover);
  itemVariables.setAttribute('onmouseout', 'this.style.background="#fff"');
  itemVariables.innerHTML = '<i class="fas fa-list"></i><span>Variables</span>';

  const itemQueries = document.createElement('div');
  itemQueries.style.cssText = menuItemStyle;
  itemQueries.setAttribute('onmouseover', menuItemHover);
  itemQueries.setAttribute('onmouseout', 'this.style.background="#fff"');
  itemQueries.innerHTML = '<i class="fas fa-database"></i><span>Queries</span>';

  // API Request menu item
  const itemApiRequest = document.createElement('div');
  itemApiRequest.style.cssText = menuItemStyle;
  itemApiRequest.setAttribute('onmouseover', menuItemHover);
  itemApiRequest.setAttribute('onmouseout', 'this.style.background="#fff"');
  itemApiRequest.innerHTML = '<i class="fas fa-plug"></i><span>API Request</span>';

  insertMenu.appendChild(itemVariables);
  insertMenu.appendChild(itemQueries);
  insertMenu.appendChild(itemApiRequest);
  insertDropdownWrap.appendChild(insertDropdownBtn);
  insertDropdownWrap.appendChild(insertMenu);
  
  const variablesPanel = createVariablesPanel((variablePayload) => {
    console.log('[assertInputModal] variablesPanel onConfirm called:', variablePayload);
    if (typeof onConfirm === 'function') {
      onConfirm(variablePayload, undefined, undefined, undefined, undefined);
    }
    closeAssertInputModal();
    variablesPanel.close();
  });

  const queryPanel = createQueryPanel(assertType, onConfirm);
  // Lazy init API Request Panel để tránh ảnh hưởng mở modal
  let apiRequestPanel = null;

  // Helper to render table from array of objects
  function renderResultAsTable(data) {
    try {
      resultBox.innerHTML = '';
      if (!Array.isArray(data) || !data.length || typeof data[0] !== 'object') {
        const pre = document.createElement('pre');
        pre.style.cssText = 'margin:0;white-space:pre-wrap;word-break:break-word;';
        pre.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
        resultBox.appendChild(pre);
        return;
      }

      // Compute dynamic columns from union of keys
      const allKeysSet = new Set();
      data.forEach((row) => {
        if (row && typeof row === 'object') {
          Object.keys(row).forEach((k) => allKeysSet.add(k));
        }
      });
      const columns = Array.from(allKeysSet);

      const table = document.createElement('table');
      table.style.cssText = 'width:100%;border-collapse:collapse;font-size:12px;background:#fff;';
      const thead = document.createElement('thead');
      const trHead = document.createElement('tr');
      columns.forEach((col) => {
        const th = document.createElement('th');
        th.textContent = col;
        th.style.cssText = 'text-align:left;border-bottom:1px solid #e5e7eb;padding:6px 8px;color:#374151;background:#f9fafb;position:sticky;top:0;';
        trHead.appendChild(th);
      });
      thead.appendChild(trHead);
      const tbody = document.createElement('tbody');
      data.forEach((row) => {
        const tr = document.createElement('tr');
        columns.forEach((col) => {
          const td = document.createElement('td');
          const cell = row && typeof row === 'object' ? row[col] : undefined;
          td.textContent = cell === null || cell === undefined ? '' : String(cell);
          td.style.cssText = 'border-bottom:1px solid #f3f4f6;padding:6px 8px;color:#111827;';
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(thead);
      table.appendChild(tbody);
      resultBox.appendChild(table);
    } catch (e) {
      resultBox.textContent = 'Failed to render result';
    }
  }

  queryPanel.useBtn.addEventListener('click', (ev) => {
    ev.stopPropagation();
    const txt = queryPanel.getTextResult();
    if (txt) input.value = txt;
    queryPanel.close();
  });
  
  const confirmBtn = document.createElement('button');
  confirmBtn.innerHTML = '<i class="fas fa-check"></i>';
  confirmBtn.title = 'Confirm';
  confirmBtn.style.cssText = `
    width: 28px; height: 28px; border: none; border-radius: 6px; background: #10b981; color: white; cursor: pointer;
  `;
  
  cancelBtn.addEventListener('click', (ev) => {
    ev.stopPropagation();
    closeAssertInputModal();
    if (onCancel) onCancel();
  });
  
  confirmBtn.addEventListener('click', (ev) => {
    ev.stopPropagation();
    const val = (input.value || '').trim();
    console.log('[assertInputModal] confirmBtn clicked, value:', val);
    if (onConfirm) {
      onConfirm(val, undefined, undefined, undefined, undefined);
    }
    closeAssertInputModal();
  });
  
  function openVariablePanel() { variablesPanel.open(); }

  function toggleInsertMenu() {
    insertMenu.style.display = insertMenu.style.display === 'none' ? 'block' : 'none';
  }

  insertDropdownBtn.addEventListener('click', (ev) => {
    ev.stopPropagation();
    toggleInsertMenu();
  });

  itemVariables.addEventListener('click', (ev) => {
    ev.stopPropagation();
    insertMenu.style.display = 'none';
    queryPanel.close();
    if (apiRequestPanel && apiRequestPanel.close) apiRequestPanel.close();
    if (!variablesPanel.isOpen()) { openVariablePanel(); } else { variablesPanel.close(); }
  });

  function openQueryPanel() {
    variablesPanel.close();
    if (apiRequestPanel && apiRequestPanel.close) apiRequestPanel.close();
    queryPanel.open();
  }

  itemQueries.addEventListener('click', (ev) => {
    ev.stopPropagation();
    insertMenu.style.display = 'none';
    openQueryPanel();
  });

  // Mở API Request panel (song song như Query Panel), lazy create và gắn element vào container nếu chưa có
  function openApiRequestPanel() {
    // try { console.log('[AssertInputModal][API] openApiRequestPanel: start'); } catch {}
    variablesPanel.close();
    queryPanel.close();
    if (!apiRequestPanel) {
      try {
        apiRequestPanel = createApiRequestPanel(assertType, onConfirm);
        container.appendChild(apiRequestPanel.element);
      } catch (e) {
      }
    }
    if (apiRequestPanel && apiRequestPanel.open) {
      apiRequestPanel.open();
    } else {
    }
  }

  itemApiRequest.addEventListener('click', (ev) => {
    ev.stopPropagation();
    insertMenu.style.display = 'none';
    openApiRequestPanel();
  });

  // run/use handled inside queryPanel component
  
  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      const val = (input.value || '').trim();
      console.log('[assertInputModal] Enter key pressed, value:', val);
      if (onConfirm) {
        onConfirm(val, undefined, undefined, undefined, undefined);
      }
      closeAssertInputModal();
    } else if (ev.key === 'Escape') {
      ev.preventDefault();
      closeAssertInputModal();
      if (onCancel) onCancel();
    }
  });
  
  container.appendChild(input);
  container.appendChild(cancelBtn);
  container.appendChild(insertDropdownWrap);
  container.appendChild(confirmBtn);
  container.appendChild(variablesPanel.element);
  container.appendChild(queryPanel.element);
  document.body.appendChild(container);

  
  // After rendering, adjust to keep the modal within viewport bounds
  try {
    const viewportW = window.innerWidth || document.documentElement.clientWidth;
    const viewportH = window.innerHeight || document.documentElement.clientHeight;
    const margin = 8;
    const rect = container.getBoundingClientRect();
    let top = rect.top + scrollY;
    let left = rect.left + scrollX;

    // If overflowing right, shift left
    if (rect.right > viewportW - margin) {
      left = Math.max(margin + scrollX, viewportW - rect.width - margin + scrollX);
    }
    // If overflowing left, clamp
    if (rect.left < margin) {
      left = margin + scrollX;
    }

    // If overflowing bottom, try place above the anchor
    if (rect.bottom > viewportH - margin) {
      const desiredTopAbove = (anchorRect?.top || 0) + scrollY - rect.height - margin;
      top = Math.max(margin + scrollY, desiredTopAbove);
    }
    // If still overflowing top, clamp
    if (top - scrollY < margin) {
      top = margin + scrollY;
    }

    container.style.top = `${top}px`;
    container.style.left = `${left}px`;
  } catch {}
  setTimeout(() => input.focus(), 0);
  assertInputModal = container;
  
  // Note: no per-element freezing here to allow toast/modal timers to proceed
  
  // Note: Screen is frozen, so no need for click outside handler
  // Màn hình đã đóng băng nên không cần click outside handler
}

/**
 * Check if assert modal is open
 * Kiểm tra xem assert modal có đang mở không
 */
export function isAssertModalOpen() {
  return assertInputModal !== null;
}

/**
 * Get current assert modal
 * Lấy assert modal hiện tại
 */
export function getAssertModal() {
  return assertInputModal;
}



