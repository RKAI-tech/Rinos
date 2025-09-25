import { showAssertInputModal } from '../../assertModal.js';
import { previewNode, extractElementText } from '../../domUtils.js';

export async function handleValueAssert(element, selectors) {
  const elementType = element.tagName.toLowerCase();
  const elementPreview = previewNode(element);
  const elementText = extractElementText(element);

  let defaultValue = '';
  if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') {
    defaultValue = element.value || '';
  } else {
    defaultValue = element.getAttribute('value') || element.textContent?.trim() || '';
  }

  const rect = element.getBoundingClientRect();
  showAssertInputModal('VALUE', defaultValue, rect, async (finalValue) => {
    if (finalValue && typeof finalValue === 'object' && finalValue.__useVariable && finalValue.variable_name) {
      let query = '';
      let connectionId = null;
      let connectionInfo = null;

      if (finalValue.statement_id && window.trackerGetStatementById) {
        try {
          const statementResp = await window.trackerGetStatementById(finalValue.statement_id);
          if (statementResp?.success && statementResp?.data?.statement_text) {
            query = statementResp.data.statement_text;
            connectionId = statementResp.data.connection_id;
            connectionInfo = statementResp.data.connection || null;
          }
        } catch {}
      }

      if (connectionInfo && window.sendActionToMain) {
        const connectDbAction = {
          selector: 'database',
          element: 'database',
          elementPreview: 'Database connection',
          elementText: `Database: ${connectionInfo.db_name || 'unknown'}`,
          connection_id: connectionId,
          connection_info: connectionInfo,
          statement_id: finalValue.statement_id,
          variable_name: String(finalValue.variable_name),
          query: query
        };
        window.sendActionToMain({ type: 'connect_db', data: { ...connectDbAction, timestamp: Date.now(), url: window.location.href, title: document.title } });
      }

      const assertAction = {
        selector: selectors,
        assertType: 'VALUE',
        variable_name: String(finalValue.variable_name),
        query: query,
        element: elementType,
        elementPreview: elementPreview,
        elementText: elementText,
        connection_id: connectionId,
        statement_id: finalValue.statement_id
      };
      if (window.sendActionToMain) {
        window.sendActionToMain({ type: 'assert', data: { ...assertAction, timestamp: Date.now(), url: window.location.href, title: document.title } });
      }
    } else {
      const data = {
        selector: selectors,
        assertType: 'VALUE',
        value: finalValue || '',
        element: elementType,
        elementPreview: elementPreview,
        elementText: elementText
      };
      if (window.sendActionToMain) {
        window.sendActionToMain({ type: 'assert', data: { ...data, timestamp: Date.now(), url: window.location.href, title: document.title } });
      }
    }
  }, () => {});
}


