/**
 * Variables Panel component
 * Builds a panel UI to browse and pick variables exposed by the recorder
 */

export function createVariablesPanel(onPickVariable) {
  const panel = document.createElement('div');
  panel.style.cssText = `
    position: absolute; top: 44px; right: 10px; z-index: 10003; background: #fff; border: 1px solid rgba(0,0,0,0.1);
    box-shadow: 0 8px 24px rgba(0,0,0,0.15); border-radius: 8px; padding: 8px; min-width: 260px; display: none;
    max-height: 240px; overflow: auto;
  `;

  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;font-weight:600;font-size:12px;margin-bottom:6px;';
  const headerTitle = document.createElement('span');
  headerTitle.textContent = 'Variables';
  headerTitle.style.cssText = 'display:inline-flex;align-items:center;gap:6px;';
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '<i class="fas fa-times"></i>';
  closeBtn.title = 'Close panel';
  closeBtn.style.cssText = 'width:20px;height:20px;border:none;border-radius:4px;background:transparent;color:#9ca3af;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;';
  closeBtn.addEventListener('click', (ev) => { ev.stopPropagation(); close(); });
  header.appendChild(headerTitle);
  header.appendChild(closeBtn);

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

  const grid = document.createElement('div');
  grid.style.cssText = 'display: grid; grid-template-columns: 1fr auto; gap: 6px;';

  panel.appendChild(header);
  panel.appendChild(searchWrap);
  panel.appendChild(grid);

  let allItems = [];

  function render(term) {
    grid.innerHTML = '';
    const q = (term || '').toLowerCase().trim();
    const source = q ? allItems.filter(v => ((v.user_defined_name || v.original_name || '').toLowerCase().includes(q))) : allItems;
    if (!source.length) {
      const noDataMsg = document.createElement('div');
      noDataMsg.textContent = 'No variables match your search';
      noDataMsg.style.cssText = 'grid-column: 1 / -1; font-size:12px; color:#667085; padding: 6px 0;';
      grid.appendChild(noDataMsg);
      return;
    }
    source.forEach(v => {
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
        if (typeof onPickVariable === 'function') onPickVariable(variablePayload);
      });
      grid.appendChild(nameCell);
      grid.appendChild(addBtn);
    });
  }

  async function load() {
    grid.innerHTML = '<div style="grid-column: 1 / -1; font-size:12px; color:#6b7280;">Loading variables...</div>';
    try {
      const resp = await window.getVariablesForTracker();
      allItems = (resp && resp.success && resp.data && Array.isArray(resp.data.items)) ? resp.data.items : [];
      if (!allItems.length) {
        grid.innerHTML = '<div style="grid-column: 1 / -1; font-size:12px; color:#6b7280;">No variables found</div>';
        return;
      }
      render('');
    } catch (err) {
      // console.error('Load variables error:', err);
      grid.innerHTML = '<div style="grid-column: 1 / -1; font-size:12px; color:#ef4444;">Failed to load</div>';
    }
  }

  searchInput.addEventListener('input', () => render(searchInput.value));

  function open() {
    panel.style.display = 'grid';
    load();
  }
  function close() {
    panel.style.display = 'none';
  }
  function isOpen() {
    return panel.style.display !== 'none';
  }

  return { element: panel, open, close, isOpen };
}


