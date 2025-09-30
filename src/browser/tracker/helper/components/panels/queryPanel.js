/**
 * Query Panel component
 * Builds a SQL query runner panel, renders results, exposes selection to consumer
 */

import { getCurrentHoveredElement } from "../../hoverOverlay";
import { generateAndValidateSelectors } from "../../selectorGenerator";

export function createQueryPanel(assertType, onConfirm) {
  const panel = document.createElement('div');
  panel.style.cssText = `
    position: absolute; top: 44px; right: 10px; z-index: 100003; background: #fff; border: 1px solid rgba(0,0,0,0.1);
    box-shadow: 0 8px 24px rgba(0,0,0,0.15); border-radius: 8px; padding: 10px; min-width: 360px; display: none;
    max-height: 320px; overflow: auto;
  `;

  panel.id = 'rikkei-query-panel';

  const header = document.createElement('div');
  header.textContent = 'Queries';
  header.style.cssText = 'font-weight:600;font-size:12px;margin-bottom:6px;';

  const queryInput = document.createElement('textarea');
  queryInput.placeholder = 'Enter a SQL query…';
  queryInput.style.cssText = 'width:100%;min-height:90px;border:1px solid #e6ebee;border-radius:8px;padding:8px;font-size:12px;resize:vertical;';

  const actions = document.createElement('div');
  actions.style.cssText = 'display:flex;align-items:center;gap:8px;margin:8px 0;';

  const connWrap = document.createElement('div');
  connWrap.style.cssText = 'display:flex;align-items:center;gap:6px;';
  const connLabel = document.createElement('span');
  connLabel.textContent = 'Connection:';
  connLabel.style.cssText = 'font-size:12px;color:#374151;';
  const connSelect = document.createElement('select');
  connSelect.style.cssText = 'flex:0 0 auto;max-width:360px;border:1px solid #e6ebee;border-radius:6px;padding:6px 8px;font-size:12px;background:#fff;color:#111827;';
  connWrap.appendChild(connLabel);
  connWrap.appendChild(connSelect);

  const runBtn = document.createElement('button');
  runBtn.innerHTML = '<i class="fas fa-play"></i>';
  runBtn.title = 'Run query';
  runBtn.style.cssText = 'width:28px;height:28px;border:none;border-radius:6px;background:#10b981;color:#fff;cursor:pointer;';

  const useBtn = document.createElement('button');
  useBtn.innerHTML = '<i class="fas fa-level-down-alt"></i>';
  useBtn.title = 'Use result';
  useBtn.style.cssText = 'width:28px;height:28px;border:none;border-radius:6px;background:#e5e7eb;color:#111827;cursor:pointer;';

  const resultBox = document.createElement('div');
  resultBox.style.cssText = 'border:1px solid #e6ebee;border-radius:8px;padding:8px;min-height:48px;font-size:12px;color:#111827;background:#fafafa;';
  resultBox.setAttribute('data-empty', 'true');
  resultBox.textContent = 'Result will appear here…';

  // Keep last run context for assert dispatching from cells
  let lastRun = {
    sql: '',
    connectionId: '',
    connection: null,
  };

  // Store fetched connections for quick lookup by id
  let connectionsCache = [];

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
          const cellText = cell === null || cell === undefined ? '' : String(cell);
          td.setAttribute('data-col', col);
          td.style.cssText = 'border-bottom:1px solid #f3f4f6;padding:6px 8px;color:#111827;cursor:default;vertical-align:top;';

          // content wrapper
          const wrap = document.createElement('div');
          wrap.style.cssText = 'display:flex;align-items:center;gap:6px;justify-content:space-between;';

          const textSpan = document.createElement('span');
          textSpan.className = 'rk-cell-text';
          textSpan.textContent = cellText;
          textSpan.style.cssText = 'display:inline-block;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';

          const plusBtn = document.createElement('button');
          plusBtn.className = 'rk-assert-btn';
          plusBtn.innerHTML = '<i class="fas fa-plus"></i>';
          plusBtn.title = 'Assert this cell value';
          plusBtn.style.cssText = 'flex:0 0 auto;width:20px;height:20px;border:none;border-radius:4px;background:#e5e7eb;color:#111827;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;';

          wrap.appendChild(textSpan);
          wrap.appendChild(plusBtn);
          td.appendChild(wrap);
          tr.appendChild(td);

          plusBtn.addEventListener('click', (e) => { e.stopPropagation(); addSelectedCell(row, col); })
        });
        tbody.appendChild(tr);
      });
      table.appendChild(thead);
      table.appendChild(tbody);
      // If multiple rows returned, show warning message
      if (data.length > 1) {
        const warn = document.createElement('div');
        warn.textContent = 'More than one rows can not be verified';
        warn.style.cssText = 'margin-bottom:8px;padding:6px 8px;border-radius:6px;background:#FEF3C7;color:#92400E;border:1px solid #FDE68A;';
        resultBox.appendChild(warn);
      }
      resultBox.appendChild(table);
    } catch (e) {
      resultBox.textContent = 'Failed to render result';
    }
  }

  function open() {
    panel.style.display = 'block';
    if (!connSelect.getAttribute('data-loaded')) {
      (async () => {
        try {
          if (typeof window.getConnection === 'function') {
            const resp = await window.getConnection();
            connSelect.innerHTML = '';
            const conns = resp?.data?.connections || [];
            connectionsCache = conns;
            if (conns.length) {
              conns.forEach((c) => {
                const opt = document.createElement('option');
                opt.value = c.connection_id;
                opt.textContent = `${String(c.db_type || '').toUpperCase()} • ${c.db_name}@${c.host}:${c.port}`;
                connSelect.appendChild(opt);
              });
            } else {
              const opt = document.createElement('option');
              opt.value = '';
              opt.textContent = 'No connections available';
              connSelect.appendChild(opt);
            }
            connSelect.setAttribute('data-loaded', 'true');
          }
        } catch (e) {
          connSelect.innerHTML = '';
          const opt = document.createElement('option');
          opt.value = '';
          opt.textContent = 'Failed to load connections';
          connSelect.appendChild(opt);
        }
      })();
    }
  }
  function close() { panel.style.display = 'none'; }
  function isOpen() { return panel.style.display !== 'none'; }

  async function runQuery() {
    const sql = (queryInput.value || '').trim();
    if (!sql) {
      resultBox.textContent = 'Please enter a SQL query first.';
      resultBox.setAttribute('data-empty', 'false');
      return;
    }
    resultBox.textContent = 'Running…';
    resultBox.setAttribute('data-empty', 'false');
    if (typeof window.runQueryForTracker === 'function') {
      const selectedConnId = (connSelect.value || '').trim() || undefined;
      const resp = await window.runQueryForTracker(sql, selectedConnId);
      if (resp && resp.success) {
        const data = resp.data?.data;
        if (Array.isArray(data)) {
          lastRun.sql = sql;
          lastRun.connectionId = selectedConnId || '';
          lastRun.connection = connectionsCache.find((c) => String(c.connection_id) === String(selectedConnId)) || null;
          renderResultAsTable(data);
        } else {
          resultBox.innerHTML = '';
          const pre = document.createElement('pre');
          pre.style.cssText = 'margin:0;white-space:pre-wrap;word-break:break-word;';
          pre.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
          resultBox.appendChild(pre);
        }
      } else {
        resultBox.textContent = resp?.error || 'Failed to run query';
      }
    } else {
      resultBox.textContent = 'Query execution is not available in this context.';
    }
  }

  function addSelectedCell(row, col) {
    console.log('addSelectedCell', row, col);
    if (typeof window.sendActionToMain === 'function') {
      // const payload = {
      //   type: 'assert',
      //   assertType: assertType,
      //   value: col,
      //   query: lastRun.sql,
      //   selector: selectors,
      //   connection_id: lastRun.connectionId || undefined,
      //   connection: lastRun.connection || undefined, timestamp: Date.now(),
      //   url: window.location.href,
      //   title: document.title
      // }
      // console.log('payload', payload);
      // window.sendActionToMain(payload);
      console.log('onConfirm', onConfirm);
      if (onConfirm) onConfirm(col, lastRun.connectionId || undefined, lastRun.connection || undefined, lastRun.sql);
    }
  }

  function getTextResult() {
    return (resultBox.getAttribute('data-empty') === 'true') ? '' : (resultBox.textContent || '');
  }

  runBtn.addEventListener('click', (ev) => { ev.stopPropagation(); runQuery(); });

  panel.appendChild(header);
  panel.appendChild(queryInput);
  actions.appendChild(connWrap);
  actions.appendChild(runBtn);
  actions.appendChild(useBtn);
  panel.appendChild(actions);
  panel.appendChild(resultBox);

  return { element: panel, open, close, isOpen, getTextResult, useBtn };
}


