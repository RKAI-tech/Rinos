import { BrowserStorageResponse } from "./browser_storage";

export enum ActionType {
  input = "input",
  click = "click",
  select = "select",
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
  api_request = "api_request",
  add_browser_storage = "add_browser_storage",
  page_create="page_create",
  page_close="page_close",
  page_focus="page_focus",
}

export enum AssertType {
  toHaveText = "toHaveText",
  toContainText = "toContainText",
  toHaveValue = "toHaveValue",
  // toHaveValues = "toHaveValues",
  pageHasATitle = "pageHasATitle",
  pageHasAURL = "pageHasAURL",
  ai = "AI",
  toBeVisible = "toBeVisible",
  toBeEnabled = "toBeEnabled",
  toBeDisabled = "toBeDisabled",
  toBeChecked = "toBeChecked",
  toBeUnchecked = "toBeUnchecked",
  toBeFocused = "toBeFocused",
  toBeHidden = "toBeHidden",
  toBeEditable = "toBeEditable",
  toBeReadOnly = "toBeReadOnly",
  toBeEmpty = "toBeEmpty"
  // toHaveCount = "toHaveCount",
  // toHaveRole = "toHaveRole",
  // toHaveAccessibleName = "toHaveAccessibleName",
  // toHaveAccessibleDescription = "toHaveAccessibleDescription",
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
  filename?: string;
  file_path?: string;
  file_content?: string;
}

// API Request interfaces
export type ApiCreateType = 'system' | 'user';

export type ApiRequestMethod =
  | 'get'
  | 'post'
  | 'put'
  | 'delete'
  | 'patch'
  | 'head'
  | 'options'
  | 'trace';

export type ApiRequestBodyType = 'none' | 'json' | 'form';

export type ApiRequestAuthType = 'none' | 'basic' | 'bearer';

export type ApiRequestStorageType = 'cookie' | 'localStorage' | 'sessionStorage';

export interface ApiRequestParam {
  api_request_param_id?: string;
  key: string;
  value: string;
}

export interface ApiRequestHeader {
  api_request_header_id?: string;
  key: string;
  value: string;
}

export interface ApiRequestBodyFormData {
  api_request_body_form_data_id?: string;
  name: string;
  value: string;
  order_index?: number;
}

export interface ApiRequestBody {
  api_request_id?: string;
  type: ApiRequestBodyType;
  content?: string | null;
  form_data?: ApiRequestBodyFormData[];
}

export interface ApiRequestTokenStorage {
  api_request_token_storage_id?: string;
  type: ApiRequestStorageType;
  key: string;
}

export interface ApiRequestBasicAuthStorage {
  api_request_basic_auth_storage_id?: string;
  type: ApiRequestStorageType;
  username_key: string;
  password_key: string;
  enabled?: boolean;
}

export interface ApiRequestAuth {
  api_request_id?: string;
  type: ApiRequestAuthType;
  storage_enabled?: boolean;
  username?: string;
  password?: string;
  token?: string;
  token_storages?: ApiRequestTokenStorage[];
  basic_auth_storages?: ApiRequestBasicAuthStorage[];
}

export interface ApiRequestData {
  api_request_id?: string;
  create_type?: ApiCreateType;
  url?: string;
  method?: ApiRequestMethod;
  params?: ApiRequestParam[];
  headers?: ApiRequestHeader[];
  auth?: ApiRequestAuth;
  body?: ApiRequestBody;
}

export interface ApiResponse {
  status: number;
  data: any;
  headers: Record<string, string>;
  success: boolean;
  error?: string;
  timestamp?: number;
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
export interface Action {
  action_id?: string;
  testcase_id: string;
  action_type: ActionType;
  description?: string;  
  elements?: Element[]; 
  assert_type?: AssertType;
  action_datas?: ActionData[];
}


export interface ActionBatch {
  actions: Action[];
}


// AI Assert Request types
export interface AiAssertDatabaseConnection {
  connection_id: string;
  username: string;
  password: string;
  host: string;
  port: string;
  db_name: string;
  db_type: string; // e.g., 'postgres'
}

export interface AiAssertElement {
  selector?: string;
  value?: string;
  query?: string;
  variable_name?: string;
  connection?: AiAssertDatabaseConnection;
}

// export interface AiAssertRequest {
//   testcase_id: string;
//   elements: AiAssertElement[];
//   prompt: string;
// }

export interface AssertAction {
  name: string;
  description: string;
}

export interface AssertActionsResponse {
  assert_actions: AssertAction[];
}

export interface ElementAICreateSelector {
  value: string;
}

export interface ElementAICreate {
  domHtml: string;
  selectors?: ElementAICreateSelector[];
}

export interface ElementAIDatabase {
  data: string;
  connection?: Connection;
  query?: string;
}

export interface AiApiRequestSummary {
  endpoint: string;
  method: string;
  status: number;
  headers: Record<string, any>;
  response_time?: number;
  payload: any;
}

export interface AiAssertRequest {
  testcase_id: string;
  elements?: ElementAICreate[];
  database_results?: ElementAIDatabase[];
  api_requests?: AiApiRequestSummary[];
  prompt: string;
}

export interface AiAssertResponse {
  success: boolean;
  playwright_code?: string;
  description?: string;
  error?: string;
}