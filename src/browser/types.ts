import { BrowserStorageResponse } from "../renderer/main_app/types/browser_storage";

export enum ActionType {
  input = "input",
  click = "click",
  select = "select",
  checkbox = "checkbox",
  change = "change",
  drag_and_drop = "drag_and_drop",
  drag_start = "drag_start",
  drag_end = "drag_end",
  drag_over = "drag_over",
  drag_leave = "drag_leave",
  drop = "drop",
  assert = "assert",
  update_input = "update_input",
  connect_db = "connect_db",
  navigate = "navigate",
  double_click = "double_click",
  right_click = "right_click",
  shift_click = "shift_click",
  keydown = "keydown",
  keyup = "keyup",
  keypress = "keypress",
  upload = "upload",
  scroll = "scroll",
  database_execution = "database_execution",
  wait = "wait",
  reload = "reload",
  back = "back",
  forward = "forward",
  window_resize = "window_resize",
  add_browser_storage = "add_browser_storage",
  api_request = "api_request",
}

export enum AssertType {
  toBeChecked = "toBeChecked",
  toBeUnchecked = "toBeUnchecked",
  toBeDisabled = "toBeDisabled",
  toBeEditable = "toBeEditable",
  toBeReadOnly = "toBeReadOnly",
  toBeEmpty = "toBeEmpty",
  toBeEnabled = "toBeEnabled",
  toBeFocused = "toBeFocused",
  toBeHidden = "toBeHidden",
  toBeVisible = "toBeVisible",
  toContainText = "toContainText",
  toHaveAccessibleDescription = "toHaveAccessibleDescription",
  toHaveAccessibleName = "toHaveAccessibleName",
  toHaveCount = "toHaveCount",
  toHaveRole = "toHaveRole",
  toHaveText = "toHaveText",
  toHaveValue = "toHaveValue",
  toHaveValues = "toHaveValues",
  pageHasATitle = "pageHasATitle",
  pageHasAURL = "pageHasAURL",
  ai = "AI"
}

export enum CreateType {
  system = "system",
  user = "user",
}

export enum ConnectionType {
  postgres = "postgres",
  mysql = "mysql",
  mssql = "mssql",
}

export interface Connection {
  connection_id?: string;
  username: string;
  password: string;
  host: string;
  port: string;
  db_name: string;
  db_type: ConnectionType;
}

export interface Statement {
  statement_id?: string;
  query: string;
  create_type: CreateType;
  connection?: Connection;
}

export interface Selector {
  value: string;
  order_index?: number;
}

export interface Element {
  selectors?: Selector[];
  order_index?: number;
}


export interface FileUpload {
  file_upload_id?: string;
  file_name?: string;
  file_path?: string;
  file_content?: string;
}

export interface ActionData {
  action_data_id?: string;
  order_index?: number;
  value?: any;
  statement?: Statement;
  file_upload?: FileUpload;
  browser_storage?: BrowserStorageResponse;
  api_request?: ApiRequestData;
}

// API Request types (aligned with recorder models)
export interface ApiRequestParam {
    key: string;
    value: string;
}

export interface ApiRequestHeader {
    key: string;
    value: string;
}

export interface ApiRequestBody {
    type: 'none' | 'json' | 'form';
    content: string;
    formData?: ApiRequestParam[];
}

export interface ApiRequestAuth {
    type: 'none' | 'basic' | 'bearer';
    username?: string;
    password?: string;
    token?: string;
}

export interface ApiRequestTokenStorage {
    enabled: boolean;
    type?: 'localStorage' | 'sessionStorage' | 'cookie';
    key?: string;
}

export interface ApiRequestBasicAuthStorage {
    enabled: boolean;
    type?: 'localStorage' | 'sessionStorage' | 'cookie';
    usernameKey?: string;
    passwordKey?: string;
}

export interface ApiRequestData {
    method: string;
    url: string;
    params: ApiRequestParam[];
    headers: ApiRequestHeader[];
    auth: ApiRequestAuth;
    body: ApiRequestBody;
    tokenStorage?: ApiRequestTokenStorage;
    basicAuthStorage?: ApiRequestBasicAuthStorage;
}

export interface Action {
  action_id?: string;
  testcase_id: string;
  action_type: ActionType;
  description?: string;  
  elements?: Element[]; 
  assert_type?: AssertType;
  action_datas?: ActionData[];
}