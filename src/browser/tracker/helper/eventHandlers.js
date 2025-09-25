
import { previewNode } from './domUtils.js';
import {
  handleClickEventAssertMode,
} from './asserts/index.js';
import {
  handleClickEvent as handleClickEventBasic,
} from './actions/click_handle.js';

let isAssertMode = false;




export function handleClickEvent(e) {
  console.log('Click event detected:', previewNode(e.target));
  console.log('Element tag name:', e.target.tagName.toLowerCase());
  console.log('Element type:', e.target.type);

  if (isAssertMode) {
    return handleClickEventAssertMode(e);
  }

  return handleClickEventBasic(e);
}