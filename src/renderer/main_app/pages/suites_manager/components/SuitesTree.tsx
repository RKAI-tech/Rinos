import React from 'react';
import { GroupSuiteItem } from '../../../types/group';
import { TreeGroup } from '../utils/treeOperations';
import { formatBrowserType, formatPassRate, formatDate } from '../utils/suitesManagerUtils';

interface SuitesTreeProps {
  // Data
  groups: TreeGroup[];
  rootSuites: GroupSuiteItem[];
  filteredGroups: TreeGroup[];
  filteredRootSuites: GroupSuiteItem[];
  
  // State
  expanded: Set<string>;
  selectedGroupId: string | null;
  selectedSuiteId: string | null;
  renamingGroupId: string | null;
  isCreatingGroup: boolean;
  creatingParentId: string | null;
  
  // Creating group state
  createInputRef: React.RefObject<HTMLInputElement | null>;
  creatingGroupName: string;
  creatingGroupError: string | null;
  isSavingGroup: boolean;
  setCreatingGroupName: React.Dispatch<React.SetStateAction<string>>;
  finishCreateGroup: (source: 'submit' | 'blur') => Promise<void>;
  handleCreateInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  
  // Renaming group state
  renameInputRef: React.RefObject<HTMLInputElement | null>;
  renamingGroupName: string;
  renamingGroupError: string | null;
  isRenamingGroup: boolean;
  setRenamingGroupName: React.Dispatch<React.SetStateAction<string>>;
  finishRenameGroup: (source: 'submit' | 'blur') => Promise<void>;
  handleRenameInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  
  // Drag and drop state
  draggedSuite: GroupSuiteItem | null;
  dragOverGroupId: string | null;
  draggedGroup: TreeGroup | null;
  
  // Handlers
  handleSuiteClick: (suite: GroupSuiteItem, e?: React.MouseEvent) => void;
  handleSuiteRightClick: (e: React.MouseEvent, suite: GroupSuiteItem) => void;
  handleSuiteDragStart: (e: React.DragEvent, suite: GroupSuiteItem) => void;
  handleSuiteDragEnd: (e?: React.DragEvent) => void;
  handleGroupClick: (groupId: string) => void;
  handleGroupRightClick: (e: React.MouseEvent, group: TreeGroup) => void;
  handleGroupDragStart: (e: React.DragEvent, group: TreeGroup) => void;
  handleGroupDragEnd: (e?: React.DragEvent) => void;
  handleGroupDragOver: (e: React.DragEvent, groupId: string) => void;
  handleGroupDragLeave: (e: React.DragEvent) => void;
  handleGroupDrop: (e: React.DragEvent, groupId: string) => void;
}

const SuitesTree: React.FC<SuitesTreeProps> = ({
  filteredGroups,
  filteredRootSuites,
  expanded,
  selectedGroupId,
  selectedSuiteId,
  renamingGroupId,
  isCreatingGroup,
  creatingParentId,
  createInputRef,
  creatingGroupName,
  creatingGroupError,
  isSavingGroup,
  setCreatingGroupName,
  finishCreateGroup,
  handleCreateInputKeyDown,
  renameInputRef,
  renamingGroupName,
  renamingGroupError,
  isRenamingGroup,
  setRenamingGroupName,
  finishRenameGroup,
  handleRenameInputKeyDown,
  draggedSuite,
  dragOverGroupId,
  draggedGroup,
  handleSuiteClick,
  handleSuiteRightClick,
  handleSuiteDragStart,
  handleSuiteDragEnd,
  handleGroupClick,
  handleGroupRightClick,
  handleGroupDragStart,
  handleGroupDragEnd,
  handleGroupDragOver,
  handleGroupDragLeave,
  handleGroupDrop,
}) => {
  const renderSuiteCard = (suite: GroupSuiteItem, depth: number) => (
    <div
      key={suite.test_suite_id}
      className={`sm-row sm-suite ${selectedSuiteId === suite.test_suite_id ? 'is-selected' : ''} ${draggedSuite?.test_suite_id === suite.test_suite_id ? 'is-dragging' : ''}`}
      style={{ marginLeft: depth * 20 }}
      onClick={(e) => handleSuiteClick(suite, e)}
      onContextMenu={(e) => handleSuiteRightClick(e, suite)}
      draggable={true}
      onDragStart={(e) => handleSuiteDragStart(e, suite)}
      onDragEnd={handleSuiteDragEnd}
    >
      <span className="sm-caret sm-caret-placeholder" aria-hidden />
      <div className="sm-suite-icon" aria-hidden>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
          <path d="M14 3v6h6" />
        </svg>
      </div>
      <div className="sm-line">
        <span className="sm-name">{suite.name}</span>
        <span className="sm-dot">•</span>
        <span className="sm-meta">{formatBrowserType(suite.browser_type)}</span>
        <span className="sm-dot">•</span>
        <span className="sm-meta success">{formatPassRate(suite)}</span>
        <span className="sm-dot">•</span>
        <span className="sm-meta muted">{formatDate((suite as any).updated_at || suite.created_at)}</span>
      </div>
      <span className="sm-count-placeholder" />
    </div>
  );

  const renderCreatingRow = (depth: number) => (
    <div className="sm-row sm-group sm-creating-row" style={{ marginLeft: depth * 20 }}>
      <span className="sm-caret sm-caret-placeholder" aria-hidden />
      <span className="sm-folder-icon" aria-hidden>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v7a3 3 0 0 1-3 3H5a2 2 0 0 1-2-2z" />
        </svg>
      </span>
      <div className="sm-line sm-creating-line">
        <input
          ref={createInputRef}
          className={`sm-create-input ${creatingGroupError ? 'has-error' : ''}`}
          value={creatingGroupName}
          placeholder="New group name"
          onChange={(e) => setCreatingGroupName(e.target.value)}
          onBlur={() => finishCreateGroup('blur')}
          onKeyDown={handleCreateInputKeyDown}
          disabled={isSavingGroup}
        />
        {creatingGroupError && <span className="sm-error">{creatingGroupError}</span>}
      </div>
      <span className="sm-count-placeholder" />
    </div>
  );

  const renderRenamingRow = (group: TreeGroup, depth: number) => (
    <div className="sm-row sm-group sm-renaming-row" style={{ marginLeft: depth * 20 }}>
      <span className="sm-caret sm-caret-placeholder" aria-hidden />
      <span className="sm-folder-icon" aria-hidden>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v7a3 3 0 0 1-3 3H5a2 2 0 0 1-2-2z" />
        </svg>
      </span>
      <div className="sm-line sm-creating-line">
        <input
          ref={renameInputRef}
          className={`sm-create-input ${renamingGroupError ? 'has-error' : ''}`}
          value={renamingGroupName}
          placeholder="Group name"
          onChange={(e) => setRenamingGroupName(e.target.value)}
          onBlur={() => finishRenameGroup('blur')}
          onKeyDown={handleRenameInputKeyDown}
          disabled={isRenamingGroup}
        />
        {renamingGroupError && <span className="sm-error">{renamingGroupError}</span>}
      </div>
      <span className="sm-count-placeholder" />
    </div>
  );

  const renderGroupNode = (group: TreeGroup, depth: number = 0): React.ReactElement => {
    const isExpanded = expanded.has(group.group_id);
    const isDragOver = dragOverGroupId === group.group_id;
    const isRenaming = renamingGroupId === group.group_id;
    
    if (isRenaming) {
      return (
        <div key={group.group_id} className="sm-group-node">
          {renderRenamingRow(group, depth)}
          {isExpanded && (
            <div className="sm-group-children">
              {group.children?.map((child) => renderGroupNode(child, depth + 1))}
              {group.suites?.map((suite) => renderSuiteCard(suite, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div key={group.group_id} className="sm-group-node">
        <div
          className={`sm-row sm-group ${selectedGroupId === group.group_id ? 'is-selected' : ''} ${isDragOver ? 'is-drag-over' : ''} ${draggedGroup?.group_id === group.group_id ? 'is-dragging' : ''}`}
          style={{ marginLeft: depth * 20 }}
          onClick={() => handleGroupClick(group.group_id)}
          onContextMenu={(e) => handleGroupRightClick(e, group)}
          draggable={true}
          onDragStart={(e) => handleGroupDragStart(e, group)}
          onDragEnd={handleGroupDragEnd}
          onDragOver={(e) => handleGroupDragOver(e, group.group_id)}
          onDragLeave={handleGroupDragLeave}
          onDrop={(e) => handleGroupDrop(e, group.group_id)}
        >
          <span className={`sm-caret ${isExpanded ? 'open' : ''}`} aria-hidden>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {isExpanded ? <path d="M18 15l-6-6-6 6" /> : <path d="M9 18l6-6-6-6" />}
            </svg>
          </span>
          <span className="sm-folder-icon" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v7a3 3 0 0 1-3 3H5a2 2 0 0 1-2-2z" />
            </svg>
          </span>
          <div className="sm-line">
            <span className="sm-name">{group.name}</span>
          </div>
        </div>
        {isExpanded && (
          <div className="sm-group-children">
            {isCreatingGroup && creatingParentId === group.group_id && renderCreatingRow(depth + 1)}
            {group.children?.map((child) => renderGroupNode(child, depth + 1))}
            {group.suites?.map((suite) => renderSuiteCard(suite, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {isCreatingGroup && !creatingParentId && renderCreatingRow(0)}
      {filteredGroups.map((g) => renderGroupNode(g, 0))}
      {filteredRootSuites.map((suite) => renderSuiteCard(suite, 0))}
    </>
  );
};

export default SuitesTree;

