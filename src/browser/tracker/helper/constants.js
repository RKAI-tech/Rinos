/**
 * Constants and configuration for tracking script
 * Chứa các hằng số và cấu hình cho tracking script
 */

// Test ID attributes for selector generation (highest priority)
export const TEST_ID_ATTRIBUTES = [
  'data-testid', 
  'data-test-id', 
  'data-test', 
  'data-cy', 
  'data-e2e', 
  'data-automation', 
  'data-automation-id', 
  'data-qa', 
  'data-qa-id'
];

// Semantic attributes for meaningful selector generation
export const SEMANTIC_ATTRIBUTES = [
  'name', 
  'title', 
  'alt', 
  'placeholder', 
  'aria-label', 
  'aria-labelledby', 
  'data-label', 
  'data-title',
  // Bổ sung cho label/input
  'for'
];

// Form element attributes for selector improvement
export const FORM_ATTRIBUTES = [
  'name', 
  'title', 
  'alt', 
  'placeholder', 
  'type', 
  'value'
];

// Auto-closing HTML tags
export const AUTO_CLOSING_TAGS = new Set([
  'AREA', 'BASE', 'BR', 'COL', 'COMMAND', 'EMBED', 'HR', 'IMG', 
  'INPUT', 'KEYGEN', 'LINK', 'MENUITEM', 'META', 'PARAM', 
  'SOURCE', 'TRACK', 'WBR'
]);

// Ephemeral CSS classes that should be avoided in selectors
export const EPHEMERAL_CLASS_PATTERNS = [
  'ng-', 'react-', 'Mui', 'ant-', 'css-', 'chakra-', 
  'mantine-', 'sc-', '__'
];

// Loading-related CSS classes
export const LOADING_CLASSES = [
  'loading', 'spinner', 'animate', 'transition', 'active', 
  'hover', 'clicked', 'pressed'
];

// Selector scoring weights
export const SELECTOR_SCORES = {
  TEST_ID: 1000,
  ID: 900,
  ROLE_NAME: 850,
  // Ưu tiên selector dựa trên label bao bọc input
  LABEL_WRAP: 820,
  SEMANTIC_ATTR: 800,
  SINGLE_CLASS: 700,
  MULTI_CLASS: 700,
  TAG_ATTR: 600,
  POSITION: 500,
  CSS_PATH: 400,
  FALLBACK: 300
};

// Maximum depth for CSS path generation
export const MAX_CSS_PATH_DEPTH = 4;

// Maximum class combination for multi-class selectors
export const MAX_CLASS_COMBINATION = 3;
