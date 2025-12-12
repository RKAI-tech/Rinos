import React, { useEffect, useState } from 'react';
import './ActionDetailModal.css';
import { Action as ActionGetResponse, ActionType, Action, AssertType, Element } from '../../types/actions';
import InputActionDetail, { normalizeInputAction } from './action/intput/InputActionDetail';
import NavigateActionDetail, { normalizeNavigateAction } from './action/navigate/NavigateActionDetail';
import ClickActionsDetail, { normalizeClickAction } from './action/click/ClickActionsDetail';
import SelectActionDetail, { normalizeSelectAction } from './action/select/SelectActionDetail';
import ChangeActionDetail, { normalizeChangeAction } from './action/change/ChangeActionDetail';
import DragAndDropActionDetail, { normalizeDragAndDropAction } from './action/drag_and_drop/DragAndDropActionDetail';
import KeyboardActionDetail, { normalizeKeyboardAction } from './action/key_board/KeyboardActionDetail';
import UploadActionDetail, { normalizeUploadAction } from './action/upload/UploadActionDetail';
import ScrollActionDetail, { normalizeScrollAction } from './action/scroll/ScrollActionDetail';
import DatabaseExecutionActionDetail, { normalizeDatabaseExecutionAction } from './action/database_execution/DatabaseExecutionActionDetail';
import WaitActionDetail, { normalizeWaitAction } from './action/wait/WaitActionDetail';
import ReloadBackForwardActionDetail, { normalizeReloadBackForwardAction } from './action/reload_back_forward_action/ReloadBackForwardActionDetail';
import WindowResizeActionDetail, { normalizeWindowResizeAction } from './action/window_resize/WindowResizeActionDetail';
import ApiRequestActionDetail, { normalizeApiRequestAction } from './action/api_request/ApiRequestActionDetail';
import AddBrowserStorageActionDetail, { normalizeAddBrowserStorageAction } from './action/add_browser_storage/AddBrowserStorageActionDetail';
import PageActionDetail, { normalizePageAction } from './action/page_action/PageActionDetail';
import AssertWithValueActionDetail, {
  isAssertWithValueType,
  normalizeAssertWithValueAction,
} from './assert/assert_with_value/AssertWithValueActionDetail';
import AssertWithoutValueActionDetail, {
  isAssertWithoutValueType,
  normalizeAssertWithoutValueAction,
} from './assert/assert_without_value/AssertWithoutValueActionDetail';
import AssertAiActionDetail, {
  isAiAssertType,
  normalizeAssertAiAction,
} from './assert/ai/AssertAiActionDetail';
import AssertToHaveCssActionDetail, {
  isToHaveCssAssertType,
  normalizeAssertToHaveCssAction,
} from './assert/to_have_css/AssertToHaveCssActionDetail';
import DefaultActionDetail from './default/DefaultActionDetail';

interface Props {
  isOpen: boolean;
  action: ActionGetResponse | null;
  onClose: () => void;
  onSave?: (updated: ActionGetResponse) => void;
  projectId?: string;
}

const mapFromResponse = (src: ActionGetResponse): Action => ({
  action_id: src.action_id,
  testcase_id: src.testcase_id,
  action_type: src.action_type as any,
  description: src.description,
  action_datas: src.action_datas,
  elements: (src.elements || []) as any,
  assert_type: src.assert_type as any,
});

const mapToResponse = (src: Action): ActionGetResponse => ({
  action_id: src.action_id || '',
  testcase_id: src.testcase_id,
  action_type: src.action_type,
  description: src.description || '',
  action_datas: src.action_datas,
  elements: (src.elements || []) as any,
  assert_type: (src.assert_type as any) || undefined,
});

const MAActionDetailModal: React.FC<Props> = ({ isOpen, action, onClose, onSave, projectId }) => {
  const [draft, setDraft] = useState<Action | null>(null);

  useEffect(() => {
    if (isOpen && action) {
      setDraft(mapFromResponse(action));
    } else {
      setDraft(null);
    }
  }, [isOpen, action]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const updateDraft = (updater: (prev: Action) => Action) => {
    setDraft(prev => (prev ? updater(prev) : prev));
  };

  const updateField = (key: keyof Action, value: any) => {
    setDraft(prev => (prev ? { ...prev, [key]: value } as Action : prev));
  };

  const updateElement = (index: number, updater: (el: Element) => Element) => {
    setDraft(prev => {
      if (!prev) return prev;
      const elements = (prev.elements || []).map((el, idx) => (idx === index ? updater({ ...el }) : el));
      return { ...prev, elements } as Action;
    });
  };

  const addNewSelector = (elementIndex: number) => {
    updateElement(elementIndex, cur => ({
      ...cur,
      selectors: [{ value: '' }, ...(cur.selectors || [])],
    }));
  };

  const updateSelector = (elementIndex: number, selectorIndex: number, value: string) => {
    updateElement(elementIndex, cur => {
      const newSelectors = [...(cur.selectors || [])];
      newSelectors[selectorIndex] = { value };
      return { ...cur, selectors: newSelectors };
    });
  };

  const removeSelector = (elementIndex: number, selectorIndex: number) => {
    updateElement(elementIndex, cur => {
      const newSelectors = [...(cur.selectors || [])];
      newSelectors.splice(selectorIndex, 1);
      return { ...cur, selectors: newSelectors };
    });
  };

  const normalizeActionForSave = (source: Action): Action => {
    const cloned: Action = {
      ...source,
      elements: (source.elements || []).map((el, idx) => ({
        ...el,
        selectors: (el.selectors || [])
          .map(s => ({ value: (s.value || '').trim() }))
          .filter(s => s.value.length > 0),
        order_index: idx+1, // Set order_index theo thứ tự nếu chưa có
      })),
    };

    cloned.action_datas = (source.action_datas ?? []).map(ad => {
      if(!ad.value) return ad;
      if (!("value" in ad.value)) return ad;
      return {
      ...ad,
      value: {
          value: String(ad.value.value),
        },
      };
    });

    return cloned;
  };

  const handleSave = () => {
    if (!draft) {
      onClose();
      return;
    }

    let normalized: Action;
    if (draft.action_type === ActionType.input) {
      normalized = normalizeInputAction(draft);
    } else if (draft.action_type === ActionType.navigate) {
      normalized = normalizeNavigateAction(draft);
    } else if (
      draft.action_type === ActionType.click ||
      draft.action_type === ActionType.double_click ||
      draft.action_type === ActionType.right_click ||
      draft.action_type === ActionType.shift_click
    ) {
      normalized = normalizeClickAction(draft);
    } else if (draft.action_type === ActionType.select) {
      normalized = normalizeSelectAction(draft);
    } else if (draft.action_type === ActionType.change) {
      normalized = normalizeChangeAction(draft);
    } else if (
      draft.action_type === ActionType.drag_and_drop ||
      draft.action_type === ActionType.drag_start ||
      draft.action_type === ActionType.drag_end ||
      draft.action_type === ActionType.drop
    ) {
      normalized = normalizeDragAndDropAction(draft);
    } else if (
      draft.action_type === ActionType.keydown ||
      draft.action_type === ActionType.keyup ||
      draft.action_type === ActionType.keypress
    ) {
      normalized = normalizeKeyboardAction(draft);
    } else if (draft.action_type === ActionType.upload) {
      normalized = normalizeUploadAction(draft);
    } else if (draft.action_type === ActionType.scroll) {
      normalized = normalizeScrollAction(draft);
    } else if (draft.action_type === ActionType.database_execution) {
      normalized = normalizeDatabaseExecutionAction(draft);
    } else if (draft.action_type === ActionType.wait) {
      normalized = normalizeWaitAction(draft);
    } else if (
      draft.action_type === ActionType.reload ||
      draft.action_type === ActionType.back ||
      draft.action_type === ActionType.forward
    ) {
      normalized = normalizeReloadBackForwardAction(draft);
    } else if (draft.action_type === ActionType.window_resize) {
      normalized = normalizeWindowResizeAction(draft);
    } else if (draft.action_type === ActionType.api_request) {
      normalized = normalizeApiRequestAction(draft);
    } else if (draft.action_type === ActionType.add_browser_storage) {
      normalized = normalizeAddBrowserStorageAction(draft);
    } else if (draft.action_type === ActionType.assert && isAiAssertType(draft.assert_type)) {
      normalized = normalizeAssertAiAction(draft);
    } else if (draft.action_type === ActionType.assert && isToHaveCssAssertType(draft.assert_type)) {
      normalized = normalizeAssertToHaveCssAction(draft);
    } else if (draft.action_type === ActionType.assert && isAssertWithValueType(draft.assert_type)) {
      normalized = normalizeAssertWithValueAction(draft);
    } else if (draft.action_type === ActionType.assert && isAssertWithoutValueType(draft.assert_type)) {
      normalized = normalizeAssertWithoutValueAction(draft);
    } else if (
      draft.action_type === ActionType.page_create ||
      draft.action_type === ActionType.page_close ||
      draft.action_type === ActionType.page_focus
    ) {
      normalized = normalizePageAction(draft);
    } else {
      normalized = normalizeActionForSave(draft);
    }

    if (onSave) {
      onSave(mapToResponse(normalized));
    }
    onClose();
  };

  if (!isOpen || !draft) return null;

  return (
    <div className="ma-action-detail-overlay">
      <div className="ma-action-detail-container" onClick={e => e.stopPropagation()}>
        <div className="ma-action-detail-header">
          <h3 className="ma-action-detail-title">Action Detail</h3>
          <button className="ma-action-detail-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="ma-action-detail-content">
          {draft.action_type === ActionType.input ? (
            <InputActionDetail
              draft={draft}
              updateDraft={updateDraft}
              updateField={updateField}
              updateElement={updateElement}
              addNewSelector={addNewSelector}
              updateSelector={updateSelector}
              removeSelector={removeSelector}
            />
          ) : draft.action_type === ActionType.navigate ? (
            <NavigateActionDetail draft={draft} updateDraft={updateDraft} updateField={updateField} />
          ) : draft.action_type === ActionType.click ||
            draft.action_type === ActionType.double_click ||
            draft.action_type === ActionType.right_click ||
            draft.action_type === ActionType.shift_click ? (
            <ClickActionsDetail
              draft={draft}
              updateDraft={updateDraft}
              updateField={updateField}
              updateElement={updateElement}
              addNewSelector={addNewSelector}
              updateSelector={updateSelector}
              removeSelector={removeSelector}
            />
          ) : draft.action_type === ActionType.select ? (
            <SelectActionDetail
              draft={draft}
              updateDraft={updateDraft}
              updateField={updateField}
              updateElement={updateElement}
              addNewSelector={addNewSelector}
              updateSelector={updateSelector}
              removeSelector={removeSelector}
            />
          ) : draft.action_type === ActionType.change ? (
            <ChangeActionDetail
              draft={draft}
              updateDraft={updateDraft}
              updateField={updateField}
              updateElement={updateElement}
              addNewSelector={addNewSelector}
              updateSelector={updateSelector}
              removeSelector={removeSelector}
            />
          ) : draft.action_type === ActionType.drag_and_drop ||
            draft.action_type === ActionType.drag_start ||
            draft.action_type === ActionType.drag_end ||
            draft.action_type === ActionType.drop ? (
            <DragAndDropActionDetail
              draft={draft}
              updateDraft={updateDraft}
              updateField={updateField}
              updateElement={updateElement}
              addNewSelector={addNewSelector}
              updateSelector={updateSelector}
              removeSelector={removeSelector}
            />
          ) : draft.action_type === ActionType.keydown ||
            draft.action_type === ActionType.keyup ||
            draft.action_type === ActionType.keypress ? (
            <KeyboardActionDetail
              draft={draft}
              updateDraft={updateDraft}
              updateField={updateField}
              updateElement={updateElement}
              addNewSelector={addNewSelector}
              updateSelector={updateSelector}
              removeSelector={removeSelector}
            />
          ) : draft.action_type === ActionType.upload ? (
            <UploadActionDetail
              draft={draft}
              updateDraft={updateDraft}
              updateField={updateField}
              updateElement={updateElement}
              addNewSelector={addNewSelector}
              updateSelector={updateSelector}
              removeSelector={removeSelector}
            />
          ) : draft.action_type === ActionType.scroll ? (
            <ScrollActionDetail
              draft={draft}
              updateDraft={updateDraft}
              updateField={updateField}
              updateElement={updateElement}
              addNewSelector={addNewSelector}
              updateSelector={updateSelector}
              removeSelector={removeSelector}
            />
          ) : draft.action_type === ActionType.database_execution ? (
            <DatabaseExecutionActionDetail draft={draft} updateDraft={updateDraft} updateField={updateField} />
          ) : draft.action_type === ActionType.wait ? (
            <WaitActionDetail draft={draft} updateDraft={updateDraft} updateField={updateField} />
          ) : draft.action_type === ActionType.reload ||
            draft.action_type === ActionType.back ||
            draft.action_type === ActionType.forward ? (
            <ReloadBackForwardActionDetail draft={draft} updateDraft={updateDraft} updateField={updateField} />
          ) : draft.action_type === ActionType.window_resize ? (
            <WindowResizeActionDetail
              draft={draft}
              updateDraft={updateDraft}
              updateField={updateField}
              updateElement={updateElement}
              addNewSelector={addNewSelector}
              updateSelector={updateSelector}
              removeSelector={removeSelector}
            />
          ) : draft.action_type === ActionType.api_request ? (
            <ApiRequestActionDetail draft={draft} updateDraft={updateDraft} updateField={updateField} />
          ) : draft.action_type === ActionType.add_browser_storage ? (
            <AddBrowserStorageActionDetail
              draft={draft}
              updateDraft={updateDraft}
              updateField={updateField}
              projectId={projectId}
            />
          ) : draft.action_type === ActionType.assert && isAiAssertType(draft.assert_type) ? (
            <AssertAiActionDetail draft={draft} updateDraft={updateDraft} updateField={updateField} />
          ) : draft.action_type === ActionType.assert && isToHaveCssAssertType(draft.assert_type) ? (
            <AssertToHaveCssActionDetail draft={draft} updateDraft={updateDraft} updateField={updateField} />
          ) : draft.action_type === ActionType.page_create ||
            draft.action_type === ActionType.page_close ||
            draft.action_type === ActionType.page_focus ? (
            <PageActionDetail draft={draft} updateDraft={updateDraft} updateField={updateField} />
          ) : draft.action_type === ActionType.assert && isAssertWithoutValueType(draft.assert_type) ? (
            <AssertWithoutValueActionDetail draft={draft} updateDraft={updateDraft} updateField={updateField} />
          ) : draft.action_type === ActionType.assert && isAssertWithValueType(draft.assert_type) ? (
            <AssertWithValueActionDetail draft={draft} updateDraft={updateDraft} updateField={updateField} />
          ) : (
            <DefaultActionDetail draft={draft} updateField={updateField} />
          )}

          <div className="ma-action-detail-footer">
            <button className="ma-adm-btn" onClick={onClose}>
              Cancel
            </button>
            <button className="ma-adm-btn primary" onClick={handleSave}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MAActionDetailModal;

