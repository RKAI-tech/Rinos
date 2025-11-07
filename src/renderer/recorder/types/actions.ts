import { BrowserStorageResponse } from "./browser_storage";

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
  api_request = "api_request",
  add_browser_storage = "add_browser_storage",
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
  apiRequestParamId?: string;
  key: string;
  value: string;
  
}

export interface ApiRequestHeader {
  apiRequestHeaderId?: string;
  key: string;
  value: string;
 
}

export interface ApiRequestBodyFormData {
  apiRequestBodyFormDataId?: string;
  name: string;
  value: string;
  orderIndex?: number;
}

export interface ApiRequestBody {
  apiRequestId?: string;
  type: ApiRequestBodyType;
  content?: string | null;
  formData?: ApiRequestBodyFormData[];
}

export interface ApiRequestBasicAuthStorage {
  apiRequestBasicAuthStorageId?: string;
  type: ApiRequestStorageType;
  usernameKey: string;
  passwordKey: string;
  enabled?: boolean;
}

export interface ApiRequestTokenStorage {
  apiRequestTokenStorageId?: string;
  type: ApiRequestStorageType;
  key: string;
}

export interface ApiRequestAuth {
  apiRequestId?: string;
  type: ApiRequestAuthType;
  storageEnabled?: boolean;
  username?: string;
  password?: string;
  token?: string;
  tokenStorages?: ApiRequestTokenStorage[];
  basicAuthStorages?: ApiRequestBasicAuthStorage[]
}

export interface ApiRequestData {
  apiRequestId?: string;
  createType?: ApiCreateType;
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
  database_connection?: AiAssertDatabaseConnection;
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

export interface AiAssertRequest {
  elements?: ElementAICreate[];
  database_results?: ElementAIDatabase[];
  prompt: string;
}

export interface AiAssertResponse {
  success: boolean;
  playwright_code?: string;
  description?: string;
  error?: string;
}