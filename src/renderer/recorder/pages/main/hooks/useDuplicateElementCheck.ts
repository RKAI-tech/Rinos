import { useState, useCallback } from 'react';
import { Action } from '../../../types/actions';
import { 
  findDuplicateElementGroups, 
  DuplicateElementGroup 
} from '../../../utils/find_duplicate_elements';

interface UseDuplicateElementCheckProps {
  onDuplicateResolved: (actions: Action[]) => void;
}

export const useDuplicateElementCheck = ({ 
  onDuplicateResolved 
}: UseDuplicateElementCheckProps) => {
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateElementGroup[]>([]);
  const [currentGroupIndex, setCurrentGroupIndex] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingActions, setPendingActions] = useState<Action[]>([]);

  /**
   * Gán cùng element_id cho các element trong một nhóm
   */
  const assignSameElementId = useCallback((actions: Action[], group: DuplicateElementGroup): Action[] => {
    const updatedActions = actions.map(a => ({ ...a }));
    
    // Tạo element_id mới nếu chưa có
    const newElementId = group.elements[0].element.element_id || 
      `element_${Date.now()}_${Math.random().toString(36)}`;
    
    // Gán cùng element_id cho tất cả element trong nhóm
    group.elements.forEach(({ actionIndex, elementIndex }) => {
      const action = updatedActions[actionIndex];
      if (action && action.elements && action.elements[elementIndex]) {
        updatedActions[actionIndex] = {
          ...action,
          elements: action.elements.map((el, idx) => 
            idx === elementIndex 
              ? { ...el, element_id: newElementId }
              : el
          ),
        };
      }
    });
    
    return updatedActions;
  }, []);

  /**
   * Bắt đầu kiểm tra duplicate elements
   */
  const checkDuplicates = useCallback((actions: Action[]): Promise<Action[]> => {
    return new Promise((resolve) => {
      const groups = findDuplicateElementGroups(actions);
      
      if (groups.length === 0) {
        // Không có duplicate, resolve ngay
        resolve(actions);
        return;
      }

      // Tạm thời comment phần hiển thị modal, tự động xử lý tất cả duplicate groups
      // Có duplicate, tự động gán element_id cho tất cả các nhóm
      let updatedActions = actions;
      
      // Xử lý tất cả các nhóm duplicate
      groups.forEach((group) => {
        updatedActions = assignSameElementId(updatedActions, group);
      });
      
      // Resolve ngay với actions đã được cập nhật
      resolve(updatedActions);
      onDuplicateResolved(updatedActions);

      // Code cũ - hiển thị modal để confirm với user
      // // Có duplicate, lưu actions và bắt đầu hiển thị popup
      // setPendingActions(actions);
      // setDuplicateGroups(groups);
      // setCurrentGroupIndex(0);
      // setIsModalOpen(true);
      // 
      // // Lưu resolve function để gọi sau khi xử lý xong
      // (window as any).__duplicateResolve = resolve;
    });
  }, [assignSameElementId, onDuplicateResolved]);

  /**
   * Xử lý khi user confirm duplicate
   */
  const handleConfirm = useCallback(() => {
    if (duplicateGroups.length === 0 || currentGroupIndex >= duplicateGroups.length) {
      return;
    }

    const currentGroup = duplicateGroups[currentGroupIndex];
    const updatedActions = assignSameElementId(pendingActions, currentGroup);
    
    // Cập nhật pending actions
    setPendingActions(updatedActions);

    // Chuyển sang nhóm tiếp theo hoặc kết thúc
    if (currentGroupIndex < duplicateGroups.length - 1) {
      setCurrentGroupIndex(currentGroupIndex + 1);
    } else {
      // Đã xử lý hết, resolve với actions đã cập nhật
      setIsModalOpen(false);
      const resolve = (window as any).__duplicateResolve;
      if (resolve) {
        resolve(updatedActions);
        delete (window as any).__duplicateResolve;
      }
      onDuplicateResolved(updatedActions);
    }
  }, [duplicateGroups, currentGroupIndex, pendingActions, assignSameElementId, onDuplicateResolved]);

  /**
   * Xử lý khi user cancel (bỏ qua nhóm hiện tại)
   */
  const handleCancel = useCallback(() => {
    if (currentGroupIndex < duplicateGroups.length - 1) {
      // Chuyển sang nhóm tiếp theo
      setCurrentGroupIndex(currentGroupIndex + 1);
    } else {
      // Đã xử lý hết, resolve với actions hiện tại (không thay đổi)
      setIsModalOpen(false);
      const resolve = (window as any).__duplicateResolve;
      if (resolve) {
        resolve(pendingActions);
        delete (window as any).__duplicateResolve;
      }
      onDuplicateResolved(pendingActions);
    }
  }, [duplicateGroups, currentGroupIndex, pendingActions, onDuplicateResolved]);

  /**
   * Đóng modal và bỏ qua tất cả
   */
  const handleClose = useCallback(() => {
    setIsModalOpen(false);
    const resolve = (window as any).__duplicateResolve;
    if (resolve) {
      resolve(pendingActions);
      delete (window as any).__duplicateResolve;
    }
    onDuplicateResolved(pendingActions);
  }, [pendingActions, onDuplicateResolved]);

  return {
    isModalOpen,
    currentGroup: duplicateGroups[currentGroupIndex] || null,
    currentGroupIndex: currentGroupIndex + 1, // 1-based for display
    totalGroups: duplicateGroups.length,
    handleConfirm,
    handleCancel,
    handleClose,
    checkDuplicates,
  };
};

