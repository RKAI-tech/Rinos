import React, { useEffect, useMemo, useState } from 'react';
import { Action, AssertType } from '../../../../types/actions';
import '../../ActionDetailModal.css';

interface AssertAiActionDetailProps {
  draft: Action;
  updateDraft: (updater: (prev: Action) => Action) => void;
  updateField: (key: keyof Action, value: any) => void;
}

export const isAiAssertType = (assertType?: AssertType | null): boolean =>
  assertType === AssertType.ai;

const extractFunctionNameFromCode = (code: string): string | null => {
  if (!code) return null;

  const namedFunctionMatch = code.match(/(?:async\s+)?function\s+([A-Za-z0-9_]+)/);
  if (namedFunctionMatch?.[1]) return namedFunctionMatch[1];

  const assignedFunctionMatch = code.match(/(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?function/);
  if (assignedFunctionMatch?.[1]) return assignedFunctionMatch[1];

  const arrowFunctionMatch = code.match(/(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?\(/);
  if (arrowFunctionMatch?.[1]) return arrowFunctionMatch[1];

  return null;
};

const replaceFunctionNameInCode = (code: string, newName: string): string => {
  if (!code) return code;

  const namedFunctionRegex = /((?:async\s+)?function\s+)([A-Za-z0-9_]+)/;
  if (namedFunctionRegex.test(code)) {
    return code.replace(namedFunctionRegex, `$1${newName}`);
  }

  const assignedFunctionRegex = /(((?:const|let|var)\s+)([A-Za-z0-9_]+)(\s*=\s*(?:async\s*)?function))/;
  if (assignedFunctionRegex.test(code)) {
    return code.replace(/((?:const|let|var)\s+)([A-Za-z0-9_]+)(\s*=\s*(?:async\s*)?function)/, `$1${newName}$3`);
  }

  const arrowFunctionRegex = /((?:const|let|var)\s+)([A-Za-z0-9_]+)(\s*=\s*(?:async\s*)?\()/;
  if (arrowFunctionRegex.test(code)) {
    return code.replace(arrowFunctionRegex, `$1${newName}$3`);
  }

  return code;
};

export const normalizeAssertAiAction = (source: Action): Action => {
  const cloned: Action = {
    ...source,
  };

  cloned.action_datas = (source.action_datas || []).map(ad => {
    if(!ad.value) return ad;
    if (ad.value.function_code !== undefined || ad.value.function_name !== undefined) {
      if(!ad.value.function_code || !ad.value.function_name) return ad;
      return {
      ...ad,
      value: {
        ...(ad.value || {}),
        function_code: String(ad.value.function_code),
        function_name: String(ad.value.function_name),
      }
    };
    }
    return ad;
  });

  return cloned;
};

const AssertAiActionDetail: React.FC<AssertAiActionDetailProps> = ({
  draft,
  updateDraft,
  updateField,
}) => {
  const [functionName, setFunctionName] = useState('');
  const [functionCode, setFunctionCode] = useState('');
  const [nameMismatch, setNameMismatch] = useState(false);

  useEffect(() => {
    for (const ad of draft.action_datas || []) {
      if (ad.value && (ad.value.function_code !== undefined || ad.value.function_name !== undefined)) {
        const nextCode = ad.value.function_code || '';
        const nextName = ad.value.function_name || extractFunctionNameFromCode(nextCode) || '';
        setFunctionName(nextName);
        setFunctionCode(nextCode);
        return;
      }
    }
    setFunctionName('');
    setFunctionCode('');
  }, [draft.action_datas]);

  const updateFunctionData = (data: Partial<{ function_name: string; function_code: string }>) => {
    updateDraft(prev => {
      const next = { ...prev } as Action;
      const actionDatas = [...(next.action_datas || [])];
      let index = (next.action_datas || []).findIndex(ad =>
        ad.value &&
        (typeof ad.value.function_code !== 'undefined' || typeof ad.value.function_name !== 'undefined')
      );

      if (index === -1) {
        actionDatas.push({ value: {} });
        index = actionDatas.length - 1;
      }

      actionDatas[index] = {
        ...actionDatas[index],
        value: {
          ...(actionDatas[index].value || {}),
          ...data,
        },
      };

      next.action_datas = actionDatas;
      return next;
    });
  };

  return (
    <>
      <div className="rcd-action-detail-section">
          {nameMismatch && (
            <div
              style={{
                gridColumn: '1 / -1',
                marginTop: '-4px',
                padding: '8px 10px',
                borderRadius: 6,
                fontSize: 12,
                lineHeight: 1.5,
                color: '#991b1b',
                background: '#fee2e2',
                border: '1px solid #fecaca',
              }}
            >
              Function name must match the declaration inside the code snippet.
            </div>
          )}
        <div className="rcd-action-detail-section-title">AI Assert</div>
        <div className="rcd-action-detail-grid">
          <div className="rcd-action-detail-kv">
            <label className="rcd-action-detail-kv-label">Type</label>
            <div className="rcd-action-detail-kv-value">
              <code>{draft.action_type}</code>
            </div>
          </div>
          <div className="rcd-action-detail-kv">
            <label className="rcd-action-detail-kv-label">Assert Type</label>
            <div className="rcd-action-detail-kv-value">
              <code>{draft.assert_type}</code>
            </div>
          </div>
          <div className="rcd-action-detail-kv" style={{ gridColumn: '1 / -1' }}>
            <label className="rcd-action-detail-kv-label">Description</label>
            <input
              className="rcd-action-detail-input"
              value={draft.description || ''}
              onChange={e => updateField('description', e.target.value)}
              placeholder="Enter action description"
            />
          </div>
          <div className="rcd-action-detail-kv">
            <label className="rcd-action-detail-kv-label">
              Function Name <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              className="rcd-action-detail-input"
              value={functionName}
              onChange={e => {
                const newName = e.target.value;
                setFunctionName(newName);
                const updatedCode = replaceFunctionNameInCode(functionCode, newName);
                const finalCode = updatedCode !== functionCode ? updatedCode : functionCode;
                if (updatedCode !== functionCode) {
                  setFunctionCode(updatedCode);
                  updateFunctionData({ function_name: newName, function_code: updatedCode });
                } else {
                  updateFunctionData({ function_name: newName });
                }
                const derived = extractFunctionNameFromCode(finalCode);
                setNameMismatch(!!derived && derived !== newName);
              }}
              placeholder="Enter function name"
            />
          </div>
          <div className="rcd-action-detail-kv" style={{ gridColumn: '1 / -1' }}>
            <label className="rcd-action-detail-kv-label">
              Function Code <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              className="rcd-action-detail-input"
              style={{ minHeight: '160px', fontFamily: 'monospace' }}
              value={functionCode}
              onChange={e => {
                const newCode = e.target.value;
                setFunctionCode(newCode);
                const derivedName = extractFunctionNameFromCode(newCode);
                if (derivedName && derivedName !== functionName) {
                  setFunctionName(derivedName);
                  updateFunctionData({ function_code: newCode, function_name: derivedName });
                } else {
                  updateFunctionData({ function_code: newCode });
                }
                const derived = extractFunctionNameFromCode(newCode);
                setNameMismatch(!!derived && derived !== (derivedName || functionName));
              }}
              placeholder="Paste function code here"
            />
          </div>
        </div>
      </div>

      {nameMismatch && (
        <div className="rcd-action-detail-disable-overlay">
          <div className="rcd-action-detail-disable-message">
            Please resolve the function name mismatch before saving.
          </div>
        </div>
      )}
    </>
  );
};

export default AssertAiActionDetail;

