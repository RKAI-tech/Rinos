
import {
  handleClickEvent as handleClickEventBasic,
} from './actions/click_handle.js';

export function handleClickEvent(e) {
  return handleClickEventBasic(e);
}