import { ElementAIDatabase } from "../../recorder/types/actions";
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
  add_browser_storage = "add_browser_storage",
  api_request = "api_request",
  page_create="page_create",
  page_close="page_close",
  page_focus="page_focus",
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
  toHaveCSS = "toHaveCSS",
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
  connection_name: string;
  username: string;
  password: string;
  host: string;
  port: string;
  db_name?: string;
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
  element_id?: string;
  selectors?: Selector[];
  order_index?: number;
  element_data?: Record<string, any>; // JSON data dạng key-value, optional
  created_at?: string;
  updated_at?: string;
}


export interface FileUpload {
  file_upload_id?: string;
  filename?: string;
  file_path?: string;
  file_content?: string;
}

// ===================== API Request types (match recorder/types/actions.ts) =====================
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
  key: string;
  value: string;
}

export interface ApiRequestHeader {
  key: string;
  value: string;
}

export interface ApiRequestBodyFormData {
  body_form_data_id?: string;
  name: string;
  value: string;
  order_index: number;
}

export interface ApiRequestBody {
  api_request_body_id?: string;
  type: ApiRequestBodyType;
  content?: string | null;
  form_datas?: ApiRequestBodyFormData[];
}

export interface ApiRequestBasicAuthStorage {
  api_request_basic_auth_storage_id?: string;
  type: ApiRequestStorageType;
  username_key: string;
  password_key: string;
}

export interface ApiRequestTokenStorage {
  api_request_token_storage_id?: string;
  type: ApiRequestStorageType;
  key: string;
}

export interface ApiRequestAuth {
  type: ApiRequestAuthType;
  storage_enabled: boolean;
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
  method: ApiRequestMethod;
  params?: ApiRequestParam[];
  headers?: ApiRequestHeader[];
  auth?: ApiRequestAuth;
  body?: ApiRequestBody;
}

export interface ActionDataGeneration {
  action_data_generation_id?: string;
  action_id?: string;
  version_number?: number;
  value?: Record<string, any>;
}

export interface ActionData {
  action_data_id?: string;
  action_id?: string;
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
  action_data_generation?: ActionDataGeneration[];
}

export interface TestCaseDataVersion {
  testcase_data_version_id?: string;
  version?: string;
  action_data_generation_ids?: string[];
}

export interface ActionBatch {
  actions: Action[];
  testcase_data_versions?: TestCaseDataVersion[];
}

// export interface ActionBatch {
//   actions: Action[];
// }

export interface AiAssertRequest {
  testcase_id: string;
  elements?: Element[];
  database_results?: ElementAIDatabase[];
  prompt: string;
}

export interface AiAssertResponse {
  success: boolean;
  playwright_code?: string;
  description?: string;
  error?: string;
  data?: {
    playwright_code?: string;
    description?: string;
  };
}

export interface GenerateRandomDataFunctionRequest {
  prompt: string;
}

export interface GenerateRandomDataFunctionResponse {
  success: boolean;
  goodness_description: string;
  generator_data_function_name?: string;
  generator_data_function_code?: string;
  issue?: string;
}