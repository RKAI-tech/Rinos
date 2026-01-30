import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Action, ActionType, ActionDataGeneration } from '../../../../types/actions';
import { getSelectedValueId, resolveSelectedGenerationValue } from '../../../../../shared/utils/actionDataGeneration';
import { browserVariableService } from '../../../../services/browser_variable';
import { TestCaseDataVersion } from '../../../../types/testcase';
import EditActionValuesModal from '../../../data_versions/EditActionValuesModal';
import GenerateActionValueModal from '../../../data_versions/GenerateActionValueModal';
import '../../ActionDetailModal.css';

interface PageActionDetailProps {
  draft: Action;
  updateDraft: (updater: (prev: Action) => Action) => void;
  updateField: (key: keyof Action, value: any) => void;
  testcaseDataVersions?: TestCaseDataVersion[];
  onTestCaseDataVersionsChange?: (updater: (prev: TestCaseDataVersion[]) => TestCaseDataVersion[]) => void;
  allActions?: Action[];
}

export const normalizePageAction = (source: Action): Action => {
  const cloned: Action = {
    ...source,
  };

  // Preserve all action_datas as is (including page_index, opener_index, url)
  cloned.action_datas = source.action_datas || [];

  return cloned;
};

const PageActionDetail: React.FC<PageActionDetailProps> = ({
  draft,
  updateDraft,
  updateField,
  testcaseDataVersions,
  onTestCaseDataVersionsChange,
  allActions = [],
}) => {
  const [url, setUrl] = useState<string>('');
  const [isEditValuesModalOpen, setIsEditValuesModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const prevUrlRef = useRef<string>('');

  useEffect(() => {
    let isActive = true;
    const fetchBrowserVariableValue = async (browserVariableId: string) => {
      const resp = await browserVariableService.getBrowserVariableById(browserVariableId);
      if (!resp?.success) {
        return null;
      }
      return (resp as any)?.data?.value ?? null;
    };
    const resolveValue = async () => {
      if (draft.action_type === ActionType.page_create) {
        const generationValue = await resolveSelectedGenerationValue(draft, fetchBrowserVariableValue);
        if (generationValue != null) {
          const urlValue = String(generationValue);
          if (isActive) {
            setUrl(urlValue);
            prevUrlRef.current = urlValue;
          }
        } else if (isActive) {
          setUrl('');
          prevUrlRef.current = '';
        }
      } else if (isActive) {
        setUrl('');
        prevUrlRef.current = '';
      }
    };
    resolveValue();
    return () => {
      isActive = false;
    };
  }, [draft.action_data_generation, draft.action_type, draft.action_datas]);


  // Helper function để truncate text
  const truncate = (text: string, maxLength: number): string => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Helper function để lấy max version_number
  const getMaxVersionNumber = (): number => {
    if (!draft.action_data_generation || draft.action_data_generation.length === 0) {
      return 0;
    }
    const versions = draft.action_data_generation
      .map(gen => gen.version_number || 0)
      .filter(v => v > 0);
    return versions.length > 0 ? Math.max(...versions) : 0;
  };

  // Handler để lưu generated value thành version mới
  const handleSaveGeneratedValue = (value: any) => {
    const valueToSave = typeof value === 'string' ? value : JSON.stringify(value);
    if (!valueToSave || !valueToSave.trim()) {
      return;
    }

    const maxVersion = getMaxVersionNumber();
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newVersion: ActionDataGeneration = {
      action_data_generation_id: tempId,
      version_number: maxVersion + 1,
      value: { value: value }
    };

    updateDraft(prev => ({
      ...prev,
      action_data_generation: [...(prev.action_data_generation || []), newVersion]
    }));

    // Auto-select version mới vừa tạo
    setUrl(valueToSave.trim());
    updateDraft(prev => {
      const next = { ...prev } as Action;
      const actionDatas = [...(next.action_datas || [])];
      let foundIndex = actionDatas.findIndex(ad => ad.value !== undefined);
      if (foundIndex === -1) {
        actionDatas.push({ value: {} });
        foundIndex = actionDatas.length - 1;
      }
      actionDatas[foundIndex] = {
        ...actionDatas[foundIndex],
        value: {
          ...(actionDatas[foundIndex].value || {}),
          selected_value_id: tempId
        }
      };
      next.action_datas = actionDatas;
      return next;
    });
    prevUrlRef.current = valueToSave.trim();
  };

  // Handler khi chọn version từ dropdown
  const handleVersionSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValueId = e.target.value;
    
    if (!selectedValueId) {
      return;
    }

    // Tìm generation được chọn
    const selectedGeneration = draft.action_data_generation?.find(
      gen => gen.action_data_generation_id === selectedValueId
    );

    if (!selectedGeneration) {
      return;
    }

    const versionValue = selectedGeneration.value?.value || 
      (typeof selectedGeneration.value === 'string' ? selectedGeneration.value : '');
    
    if (versionValue) {
      const valueStr = String(versionValue);
      setUrl(valueStr);
      updateDraft(prev => {
        const next = { ...prev } as Action;
        const actionDatas = [...(next.action_datas || [])];
        let foundIndex = actionDatas.findIndex(ad => ad.value !== undefined);
        if (foundIndex === -1) {
          actionDatas.push({ value: {} });
          foundIndex = actionDatas.length - 1;
        }
        actionDatas[foundIndex] = {
          ...actionDatas[foundIndex],
          value: {
            ...(actionDatas[foundIndex].value || {}),
            selected_value_id: selectedValueId
          }
        };
        next.action_datas = actionDatas;
        return next;
      });
      prevUrlRef.current = valueStr;
    }
    
    // Sync sẽ được thực hiện khi Save trong ActionDetailModal
  };

  // Handler mở edit values modal
  const handleOpenEditValuesModal = () => {
    setIsEditValuesModalOpen(true);
  };

  // Handler mở generate modal
  const handleOpenGenerateModal = () => {
    setIsGenerateModalOpen(true);
  };

  // Wrapper để convert updateDraft signature thành onActionsChange signature
  const handleActionsChange = (updater: (prev: Action[]) => Action[]) => {
    updateDraft(prev => {
      const actions = updater([prev]);
      return actions[0] || prev;
    });
  };

  // Memoize versions để hiển thị trong dropdown
  const versions = useMemo(() => {
    if (!draft.action_data_generation || draft.action_data_generation.length === 0) {
      return [];
    }
    return [...draft.action_data_generation].sort((a, b) => {
      const aVersion = a.version_number || 0;
      const bVersion = b.version_number || 0;
      return aVersion - bVersion;
    });
  }, [draft.action_data_generation]);

  // Hàm tự động sinh description dựa trên URL (logic riêng cho page action)
  const generatePageDescription = (url: string, oldUrl: string, currentDescription: string): string => {
    if (url.trim()) {
      // Nếu có URL: "create page: {url}"
      // 1. Check xem trong description có giá trị nào giống URL cũ không
      // 2. Nếu có, thay giá trị đó bằng giá trị mới
      if (oldUrl && oldUrl.trim() && currentDescription.includes(oldUrl)) {
        // Thay thế URL cũ bằng URL mới trong description
        return currentDescription.replace(oldUrl, url);
      } else {
        // Nếu không tìm thấy URL cũ, tạo description mới
        return `create page: ${url}`;
      }
    } else {
      // Nếu không có URL: "create page blank"
      return 'create page blank';
    }
  };

  const updateUrl = (newUrl: string) => {
    if (draft.action_type !== ActionType.page_create) return;
    
    const oldUrl = prevUrlRef.current;
    setUrl(newUrl);

    // Tự động cập nhật description khi URL thay đổi (sử dụng logic riêng)
    const currentDescription = draft.description || '';
    const newDescription = generatePageDescription(newUrl, oldUrl, currentDescription);
    updateField('description', newDescription);
    
    // Cập nhật giá trị cũ cho lần sau
    prevUrlRef.current = newUrl;
  };

  return (
    <>
      <div className="rcd-action-detail-section">
        <div className="rcd-action-detail-section-title">General</div>
        <div className="rcd-action-detail-grid">
          <div className="rcd-action-detail-kv">
            <label className="rcd-action-detail-kv-label">Type</label>
            <div className="rcd-action-detail-kv-value">
              <code>{draft.action_type}</code>
            </div>
          </div>
          <div className="rcd-action-detail-kv">
            <label className="rcd-action-detail-kv-label">Description</label>
            <input
              className="rcd-action-detail-input"
              value={draft.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Enter action description"
            />
          </div>
          {draft.action_type === ActionType.page_create && (
            <div className="rcd-action-detail-kv" style={{ gridColumn: '1 / -1' }}>
              <label className="rcd-action-detail-kv-label">URL</label>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <select
                  className="rcd-action-detail-input"
                  value={getSelectedValueId(draft) || ''}
                  onChange={handleVersionSelect}
                  style={{ 
                    cursor: 'pointer', 
                    flex: 1,
                    fontSize: '12px',
                    padding: '6px 10px',
                    height: '32px',
                  }}
                  disabled={versions.length === 0}
                >
                  {versions.length === 0 ? (
                    <option value="">No versions available</option>
                  ) : (
                    versions.map((version) => {
                      if (!version.action_data_generation_id) {
                        return null;
                      }
                      const versionValue = version.value?.value || 
                        (typeof version.value === 'string' ? version.value : '');
                      const displayValue = truncate(String(versionValue || ''), 50);
                      return (
                        <option 
                          key={version.version_number || `version-${version.action_data_generation_id}`} 
                          value={version.action_data_generation_id}
                        >
                          {displayValue}
                        </option>
                      );
                    })
                  )}
                </select>
                <button
                  type="button"
                  onClick={handleOpenEditValuesModal}
                  style={{
                    background: 'none',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    padding: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6b7280',
                    transition: 'all 0.2s ease',
                    minWidth: '32px',
                    height: '32px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f3f4f6';
                    e.currentTarget.style.color = '#374151';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none';
                    e.currentTarget.style.color = '#6b7280';
                  }}
                  title="Edit version values"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M18.5 2.5C18.8978 2.10218 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10218 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10218 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={handleOpenGenerateModal}
                  style={{
                    background: '#8b5cf6',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '6px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    transition: 'all 0.2s ease',
                    fontSize: '12px',
                    fontWeight: 500,
                    height: '32px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#7c3aed';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#8b5cf6';
                  }}
                  title="Generate new action value"
                >
                  Generate
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Action Values Modal */}
      {isEditValuesModalOpen && (
        <EditActionValuesModal
          action={draft}
          onClose={() => setIsEditValuesModalOpen(false)}
          onActionsChange={handleActionsChange}
          testcaseDataVersions={testcaseDataVersions}
          onTestCaseDataVersionsChange={onTestCaseDataVersionsChange}
          onValueUpdated={() => {
            // Refresh url if needed
          }}
        />
      )}

      {/* Generate Action Value Modal */}
      {isGenerateModalOpen && (
        <GenerateActionValueModal
          action={draft}
          onClose={() => setIsGenerateModalOpen(false)}
          onSave={handleSaveGeneratedValue}
        />
      )}
    </>
  );
};

export default PageActionDetail;

