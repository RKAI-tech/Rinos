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
    z-index: 10002;
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
  input.placeholder = assertType === 'VALUE' ? 'Enter expected value…' : 'Enter expected text…';
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
  
  const plusBtn = document.createElement('button');
  plusBtn.innerHTML = '<i class="fas fa-plus"></i>';
  plusBtn.title = 'Insert variable';
  plusBtn.style.cssText = `
    width: 28px; height: 28px; border: none; border-radius: 6px; background: #eef2ff; color: #1d4ed8; cursor: pointer;
  `;
  
  // Mini table container (hidden by default)
  const variablePanel = document.createElement('div');
  variablePanel.style.cssText = `
    position: absolute; top: 44px; right: 10px; z-index: 10003; background: #fff; border: 1px solid rgba(0,0,0,0.1);
    box-shadow: 0 8px 24px rgba(0,0,0,0.15); border-radius: 8px; padding: 8px; min-width: 260px; display: none;
    max-height: 240px; overflow: auto;
  `;
  
  const panelHeader = document.createElement('div');
  panelHeader.textContent = 'Variables';
  panelHeader.style.cssText = 'font-weight: 600; font-size: 12px; margin-bottom: 6px;';
  
  // Search box for variables
  const searchWrap = document.createElement('div');
  searchWrap.style.cssText = 'display:flex;align-items:center;gap:8px;margin:6px 0 8px;';
  const searchIcon = document.createElement('i');
  searchIcon.className = 'fas fa-search';
  searchIcon.style.cssText = 'color:#667085;';
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search variables by name...';
  searchInput.style.cssText = 'flex:1;border:1px solid #e6ebee;border-radius:8px;padding:6px 10px;font-size:12px;';
  searchWrap.appendChild(searchIcon);
  searchWrap.appendChild(searchInput);

  const table = document.createElement('div');
  table.style.cssText = 'display: grid; grid-template-columns: 1fr auto; gap: 6px;';
  
  variablePanel.appendChild(panelHeader);
  variablePanel.appendChild(searchWrap);
  variablePanel.appendChild(table);
  
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
    if (onConfirm) onConfirm(val);
    closeAssertInputModal();
  });
  
  async function openVariablePanel() {
    // console.log('Opening variable panel...');
    variablePanel.style.display = 'grid';
    table.innerHTML = '<div style="grid-column: 1 / -1; font-size:12px; color:#6b7280;">Loading variables...</div>';
    
    try {
      // console.log('Calling getVariablesForTracker...');
      // Use Playwright's exposed function to request variables from the main process
      const resp = await window.getVariablesForTracker();
      console.log('getVariablesForTracker response:', resp);
      
      table.innerHTML = '';
      if (resp && resp.success && resp.data && Array.isArray(resp.data.items) && resp.data.items.length) {
        console.log('Found', resp.data.items.length, 'variables');
        const allItems = resp.data.items;

        const renderRows = (term) => {
          table.innerHTML = '';
          const q = (term || '').toLowerCase().trim();
          const source = q ? allItems.filter(v => ((v.user_defined_name || v.original_name || '').toLowerCase().includes(q))) : allItems;
          if (!source.length) {
            const noDataMsg = document.createElement('div');
            noDataMsg.textContent = 'No variables match your search';
            noDataMsg.style.cssText = 'grid-column: 1 / -1; font-size:12px; color:#667085; padding: 6px 0;';
            table.appendChild(noDataMsg);
            return;
          }
          source.forEach(v => {
            // console.log('Variable object:', v);
            const nameCell = document.createElement('div');
            nameCell.textContent = v.user_defined_name;
            nameCell.style.cssText = 'font-size:12px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;';
            
            const addBtn = document.createElement('button');
            addBtn.innerHTML = '<i class="fas fa-plus"></i>';
            addBtn.title = 'Insert variable';
            addBtn.style.cssText = 'width:24px;height:24px;border:none;border-radius:6px;background:#e5e7eb;color:#111827;cursor:pointer;';
            addBtn.addEventListener('click', (e) => {
              e.stopPropagation();                
              const variablePayload = { 
                __useVariable: true, 
                variable_name: v.original_name, 
                statement_id: v.statement_id
              };
              // console.log('Variable selected, payload:', variablePayload);
              // console.log('Variable object v:', v);
              // console.log('v.statement_id:', v.statement_id);
              if (typeof onConfirm === 'function') {
                onConfirm(variablePayload);
              }
              closeAssertInputModal();
              variablePanel.style.display = 'none';
            });
            table.appendChild(nameCell);
            table.appendChild(addBtn);
          });
        };

        // Initial render and search binding
        renderRows('');
        searchInput.addEventListener('input', () => renderRows(searchInput.value));
      } else {
        // console.log('No variables found or invalid response:', resp);
        table.innerHTML = '<div style="grid-column: 1 / -1; font-size:12px; color:#6b7280;">No variables found</div>';
      }
    } catch (err) {
      console.error('Load variables error:', err);
      table.innerHTML = '<div style="grid-column: 1 / -1; font-size:12px; color:#ef4444;">Failed to load</div>';
    }
  }

  plusBtn.addEventListener('click', (ev) => {
    ev.stopPropagation();
    if (variablePanel.style.display === 'none') {
      openVariablePanel();
    } else {
      variablePanel.style.display = 'none';
    }
  });
  
  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      const val = (input.value || '').trim();
      if (onConfirm) onConfirm(val);
      closeAssertInputModal();
    } else if (ev.key === 'Escape') {
      ev.preventDefault();
      closeAssertInputModal();
      if (onCancel) onCancel();
    }
  });
  
  container.appendChild(input);
  container.appendChild(cancelBtn);
  container.appendChild(plusBtn);
  container.appendChild(confirmBtn);
  container.appendChild(variablePanel);
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
