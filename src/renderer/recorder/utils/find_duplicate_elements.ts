import { Action, Element } from '../types/actions';
import { areElementsSimilar, getElementSimilarityScore, SIMILARITY_THRESHOLD } from './element_similarity';

export interface DuplicateElementGroup {
  elements: Array<{
    element: Element;
    actionIndex: number;
    elementIndex: number;
    actionType: string;
    actionDescription: string;
  }>;
  similarityScore: number;
}

export interface ElementWithContext {
  element: Element;
  actionIndex: number;
  actionType: string;
  actionDescription: string;
  elementIndex: number;
}

/**
 * Tìm tất cả các element trong actions và nhóm các element trùng nhau
 * @param actions - Danh sách actions cần kiểm tra
 * @param threshold - Ngưỡng điểm để coi là trùng nhau (mặc định = SIMILARITY_THRESHOLD)
 * @returns Danh sách các nhóm element trùng nhau (mỗi nhóm có ít nhất 2 element)
 */
export function findDuplicateElementGroups(
  actions: Action[],
  threshold: number = SIMILARITY_THRESHOLD
): DuplicateElementGroup[] {
  // Thu thập tất cả element với context
  const allElements: ElementWithContext[] = [];
  
  actions.forEach((action, actionIndex) => {
    if (action.elements && action.elements.length > 0) {
      action.elements.forEach((element, elementIndex) => {
        // Chỉ xét các element có element_data
        if (element.element_data) {
          allElements.push({
            element,
            actionIndex,
            elementIndex,
            actionType: action.action_type,
            actionDescription: action.description || `${action.action_type} action`,
          });
        }
      });
    }
  });

  if (allElements.length < 2) {
    return [];
  }

  // Tìm các nhóm element trùng nhau
  const groups: DuplicateElementGroup[] = [];
  const processed = new Set<number>();

  for (let i = 0; i < allElements.length; i++) {
    if (processed.has(i)) continue;

    const currentElement = allElements[i];
    const similarElements: ElementWithContext[] = [currentElement];
    let minSimilarity = 1.0;

    for (let j = i + 1; j < allElements.length; j++) {
      if (processed.has(j)) continue;

      const otherElement = allElements[j];
      const isSimilar = areElementsSimilar(
        currentElement.element,
        otherElement.element,
        threshold
      );

      if (isSimilar) {
        // Tính điểm similarity chính xác
        const actualScore = getElementSimilarityScore(
          currentElement.element,
          otherElement.element
        );
        
        similarElements.push(otherElement);
        processed.add(j);
        minSimilarity = Math.min(minSimilarity, actualScore);
      }
    }

    // Chỉ thêm nhóm nếu có ít nhất 2 element
    if (similarElements.length >= 2) {
      groups.push({
        elements: similarElements.map(el => ({
          element: el.element,
          actionIndex: el.actionIndex,
          elementIndex: el.elementIndex,
          actionType: el.actionType,
          actionDescription: el.actionDescription,
        })),
        similarityScore: minSimilarity,
      });
      processed.add(i);
    }
  }

  // Sắp xếp theo similarity score giảm dần (element giống nhau nhất trước)
  groups.sort((a, b) => b.similarityScore - a.similarityScore);

  return groups;
}

/**
 * Lấy text hiển thị của element
 */
export function getElementDisplayText(element: Element): string {
  if (!element.element_data) {
    return 'Unknown element';
  }

  const data = element.element_data;
  
  // Ưu tiên innerText, textContent, value, placeholder
  if (data.innerText) {
    return data.innerText.substring(0, 100);
  }
  if (data.textContent) {
    return data.textContent.substring(0, 100);
  }
  if (data.value) {
    return String(data.value).substring(0, 100);
  }
  if (data.placeholder) {
    return String(data.placeholder).substring(0, 100);
  }
  if (data.title) {
    return String(data.title).substring(0, 100);
  }
  if (data.alt) {
    return String(data.alt).substring(0, 100);
  }
  
  // Fallback: tag name + id hoặc name
  const tagName = data.tagName || 'element';
  const id = data.id ? `#${data.id}` : '';
  const name = data.name ? `[name="${data.name}"]` : '';
  
  return `${tagName}${id}${name}` || 'Unknown element';
}

/**
 * Lấy type của element
 */
export function getElementType(element: Element): string {
  if (!element.element_data) {
    return 'Unknown';
  }

  const data = element.element_data;
  const tagName = data.tagName || 'element';
  const type = data.type || '';
  
  if (tagName === 'input' && type) {
    return `${tagName}[type="${type}"]`;
  }
  
  return tagName;
}

