import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Action, ActionType, ActionDataGeneration } from '../../../../types/actions';
import { truncateText } from '../../../../utils/textUtils';
import { TestCaseDataVersion } from '../../../../types/testcases';
import EditActionValuesModal from '../../../../pages/suites_manager/components/EditActionValuesModal';
import GenerateActionValueModal from '../../../../pages/suites_manager/components/GenerateActionValueModal';
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
    // Load current values from draft
    if (draft.action_type === ActionType.page_create) {
      // For page_create: 
      // - URL is in action_data where value.value is a string (not page_index)
      let urlFound = false;
      for (const ad of draft.action_datas || []) {
        // Find URL: value.value is string and not page_index
        if (ad.value?.value !== undefined && typeof ad.value.value === 'string' && ad.value.page_index === undefined) {
          const urlValue = ad.value.value;
          setUrl(urlValue);
          prevUrlRef.current = urlValue; // Lưu giá trị ban đầu
          urlFound = true;
        }
      }
      if (!urlFound) {
        setUrl('');
        prevUrlRef.current = '';
      }
    } else {
      // For page_close and page_focus, reset URL
      setUrl('');
      prevUrlRef.current = '';
    }
  }, [draft.action_datas, draft.action_type]);

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
    updateDraft(prev => {
      const next = { ...prev } as Action;
      const actionDatas = [...(next.action_datas || [])];
      
      // Tìm action_data có value.value là string (URL), không phải action_data có page_index
      let foundIndex = actionDatas.findIndex(ad => 
        ad.value !== undefined && 
        ad.value?.["value"] !== undefined && 
        typeof ad.value["value"] === 'string' &&
        ad.value.page_index === undefined
      );
      if (foundIndex === -1) {
        // Tạo action_data mới nếu chưa có
        actionDatas.push({ value: {} });
        foundIndex = actionDatas.length - 1;
      }
      
      // Cập nhật URL, giữ nguyên các action_data khác (như page_index, opener_index)
      actionDatas[foundIndex] = {
        ...actionDatas[foundIndex],
        value: {
          ...(actionDatas[foundIndex].value || {}),
          value: newUrl
        }
      };
      
      next.action_datas = actionDatas;
      return next;
    });

    // Tự động cập nhật description khi URL thay đổi (sử dụng logic riêng)
    const currentDescription = draft.description || '';
    const newDescription = generatePageDescription(newUrl, oldUrl, currentDescription);
    updateField('description', newDescription);
    
    // Cập nhật giá trị cũ cho lần sau
    prevUrlRef.current = newUrl;
  };

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
    const newVersion: ActionDataGeneration = {
      version_number: maxVersion + 1,
      value: { value: value }
    };

    updateDraft(prev => ({
      ...prev,
      action_data_generation: [...(prev.action_data_generation || []), newVersion]
    }));

    // Auto-select version mới vừa tạo
    setUrl(valueToSave.trim());
    updateUrl(valueToSave.trim());
  };

  // Handler khi chọn version từ dropdown
  const handleVersionSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    
    if (!selectedValue) {
      return;
    }

    // Tìm generation được chọn
    const selectedGeneration = draft.action_data_generation?.find(
      gen => gen.version_number?.toString() === selectedValue
    );

    if (!selectedGeneration) {
      return;
    }

    const versionValue = selectedGeneration.value?.value || 
      (typeof selectedGeneration.value === 'string' ? selectedGeneration.value : '');
    
    if (versionValue) {
      const valueStr = String(versionValue);
      updateUrl(valueStr);
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
                  value={(() => {
                    if (versions.length === 0) return '';
                    // Tìm version có giá trị khớp với url hiện tại
                    const matchingVersion = versions.find(v => {
                      const val = v.value?.value || (typeof v.value === 'string' ? v.value : '');
                      return String(val) === url;
                    });
                    // Nếu có match thì dùng version đó, nếu không thì dùng version đầu tiên
                    return matchingVersion?.version_number?.toString() || versions[0]?.version_number?.toString() || '';
                  })()}
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
                      const versionValue = version.value?.value || 
                        (typeof version.value === 'string' ? version.value : '');
                      const displayValue = truncate(String(versionValue || ''), 50);
                      return (
                        <option 
                          key={version.version_number || `version-${version.action_data_generation_id}`} 
                          value={version.version_number?.toString() || ''}
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
