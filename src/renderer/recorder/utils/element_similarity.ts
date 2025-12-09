import { Element } from '../types/actions';

const ATTRIBUTE_WEIGHTS: Record<string, number> = {
  tagName: 0.14,
  id: 0.18,
  name: 0.11,
  xpath: 0.14,
  innerText: 0.09,
  textContent: 0.07,
  value: 0.09,
  placeholder: 0.04,
  title: 0.03,
  alt: 0.03,
  
  href: 0.07,
  src: 0.07,
  linkTarget: 0.07,
  
  className: 0.11,
  type: 0.07,
  dataAttributes: 0.09,
  
  parentTag: 0.04,
  parentId: 0.07,
  parentClass: 0.04,
  previousSibling: 0.03,
  childCount: 0.03,
  childIndex: 0.03,
  
  x: 0.02,
  y: 0.02,
  width: 0.04,
  height: 0.04,
  aspectRatio: 0.03,
  viewportTop: 0.01,
  viewportLeft: 0.01,
  
  backgroundColor: 0.02,
  color: 0.02,
  visibility: 0.02,
  disabled: 0.03,
  display: 0.02,
  zIndex: 0.01,
  
  pageUrl: 0.15,
};

export const SIMILARITY_THRESHOLD = 0.7;

// Các thuộc tính cần so sánh với tolerance (cho phép sai số)
const POSITION_ATTRIBUTES = ['x', 'y', 'viewportTop', 'viewportLeft'];
const SIZE_ATTRIBUTES = ['width', 'height'];

// Ngưỡng cho phép (tolerance) cho các thuộc tính số
const POSITION_TOLERANCE = 10; // Cho phép sai số 10px cho tọa độ
const SIZE_TOLERANCE_PERCENT = 0.1; // Cho phép sai số 10% cho kích thước

function compareNumericWithTolerance(
  value1: number,
  value2: number,
  tolerance: number,
  isPercentage: boolean = false
): boolean {
  if (value1 === value2) return true;
  
  if (isPercentage) {
    // So sánh theo phần trăm
    const maxValue = Math.max(Math.abs(value1), Math.abs(value2));
    if (maxValue === 0) return true;
    const diff = Math.abs(value1 - value2);
    const percentDiff = diff / maxValue;
    return percentDiff <= tolerance;
  } else {
    // So sánh theo giá trị tuyệt đối
    const diff = Math.abs(value1 - value2);
    return diff <= tolerance;
  }
}

function comparePrimitive(value1: any, value2: any): boolean {
  if (value1 === value2) return true;
  if (value1 == null || value2 == null) return false;
  
  if (typeof value1 === 'string' && typeof value2 === 'string') {
    return value1.trim().toLowerCase() === value2.trim().toLowerCase();
  }
  
  return false;
}


function compareArray(arr1: any[] | null, arr2: any[] | null): boolean {
  if (!arr1 && !arr2) return true;
  if (!arr1 || !arr2) return false;
  if (arr1.length !== arr2.length) return false;
  
  const sorted1 = [...arr1].sort();
  const sorted2 = [...arr2].sort();
  
  return sorted1.every((val, idx) => comparePrimitive(val, sorted2[idx]));
}


function compareObject(obj1: Record<string, any> | null, obj2: Record<string, any> | null): boolean {
  if (!obj1 && !obj2) return true;
  if (!obj1 || !obj2) return false;
  
  const keys1 = Object.keys(obj1).sort();
  const keys2 = Object.keys(obj2).sort();
  
  if (keys1.length !== keys2.length) return false;
  
  return keys1.every(key => {
    const val1 = obj1[key];
    const val2 = obj2[key];
    
    if (Array.isArray(val1) && Array.isArray(val2)) {
      return compareArray(val1, val2);
    }
    return comparePrimitive(val1, val2);
  });
}

function compareAttributeValue(
  key: string,
  value1: any,
  value2: any
): boolean {
  if (value1 === null && value2 === null) return true;
  if (value1 === null || value2 === null) return false;
  
  // Xử lý các thuộc tính số với tolerance
  if (typeof value1 === 'number' && typeof value2 === 'number') {
    if (POSITION_ATTRIBUTES.includes(key)) {
      return compareNumericWithTolerance(value1, value2, POSITION_TOLERANCE, false);
    }
    if (SIZE_ATTRIBUTES.includes(key)) {
      return compareNumericWithTolerance(value1, value2, SIZE_TOLERANCE_PERCENT, true);
    }
  }
  
  // Xử lý mảng
  if (Array.isArray(value1) && Array.isArray(value2)) {
    return compareArray(value1, value2);
  }
  
  if (typeof value1 === 'object' && typeof value2 === 'object' && 
      !Array.isArray(value1) && !Array.isArray(value2)) {
    return compareObject(value1, value2);
  }
  
  return comparePrimitive(value1, value2);
}

export function calculateElementSimilarity(
  elementData1: Record<string, any> | undefined | null,
  elementData2: Record<string, any> | undefined | null
): number {
  if (!elementData1 && !elementData2) {
    return 0.0; 
  }
  
  if (!elementData1 || !elementData2) {
    return 0.0; 
  }
  
  let totalScore = 0;
  let totalWeight = 0;
  
  const allKeys = new Set([
    ...Object.keys(elementData1),
    ...Object.keys(elementData2)
  ]);
  
  for (const key of allKeys) {
    const weight = ATTRIBUTE_WEIGHTS[key] || 0.01; 
    const value1 = elementData1[key];
    const value2 = elementData2[key];
    
    if (value1 !== null && value1 !== undefined && 
        value2 !== null && value2 !== undefined) {
      const isMatch = compareAttributeValue(key, value1, value2);
      totalScore += isMatch ? weight : 0;
    }
    else if ((value1 === null || value1 === undefined) && 
             (value2 === null || value2 === undefined)) {
      totalScore += weight; // Coi như giống nhau
    }
    
    totalWeight += weight;
  }
  
  if (totalWeight === 0) {
    return 0;
  }
  
  return totalScore / totalWeight;
}


export function areElementsSimilar(
  element1: Element,
  element2: Element,
  customThreshold?: number
): boolean {
  const threshold = customThreshold ?? SIMILARITY_THRESHOLD;
  const similarity = calculateElementSimilarity(
    element1.element_data,
    element2.element_data
  );
  
  return similarity >= threshold;
}


export function getElementSimilarityScore(
  element1: Element,
  element2: Element
): number {
  return calculateElementSimilarity(
    element1.element_data,
    element2.element_data
  );
}

export function findMostSimilarElement(
  targetElement: Element,
  elementList: Element[],
  minSimilarity: number = SIMILARITY_THRESHOLD
): { element: Element; score: number } | null {
  if (elementList.length === 0) {
    return null;
  }
  
  let bestMatch: { element: Element; score: number } | null = null;
  
  for (const element of elementList) {
    const score = getElementSimilarityScore(targetElement, element);
    
    if (score >= minSimilarity) {
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { element, score };
      }
    }
  }
  
  return bestMatch;
}

/**
 * Lọc danh sách element để chỉ giữ lại các element giống với element đích
 */
export function filterSimilarElements(
  targetElement: Element,
  elementList: Element[],
  minSimilarity: number = SIMILARITY_THRESHOLD
): Array<{ element: Element; score: number }> {
  const results: Array<{ element: Element; score: number }> = [];
  
  for (const element of elementList) {
    const score = getElementSimilarityScore(targetElement, element);
    
    if (score >= minSimilarity) {
      results.push({ element, score });
    }
  }
  
  // Sắp xếp theo điểm giảm dần
  results.sort((a, b) => b.score - a.score);
  
  return results;
}

