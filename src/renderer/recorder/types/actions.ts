import { BrowserStorageResponse } from "./browser_storage";
import { BasicAuthentication } from "./basic_auth";

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
  set_browser_variable = "set_browser_variable",
  page_create="page_create",
  page_close="page_close",
  page_focus="page_focus",
}

export enum AssertType {
  toHaveText = "toHaveText",
  toContainText = "toContainText",
  toHaveValue = "toHaveValue",
  // toHaveValues = "toHaveValues",
  toHaveCSS = "toHaveCSS",
  pageHasATitle = "pageHasATitle",
  pageHasAURL = "pageHasAURL",
  ai = "AI",
  toBeVisible = "toBeVisible",
  toBeEnabled = "toBeEnabled",
  toBeDisabled = "toBeDisabled",
  toBeChecked = "toBeChecked",
  toBeUnchecked = "toBeUnchecked",
  toBeFocused = "toBeFocused",
  // toBeHidden = "toBeHidden",
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

// Security options for database connections
// Note: These fields use snake_case to match backend API convention
export interface ConnectionSecurityOptions {
  // SSL/TLS options
  security_type?: 'none' | 'ssl' | 'ssh';
  ssl_mode?: 'disable' | 'allow' | 'prefer' | 'require' | 'verify-ca' | 'verify-full';
  ca_certificate?: string; // Base64 encoded CA certificate content
  client_certificate?: string; // Base64 encoded client certificate content
  client_private_key?: string; // Base64 encoded client private key content
  ssl_key_passphrase?: string;
  
  // SSH Tunnel options
  ssh_host?: string;
  ssh_port?: number;
  ssh_username?: string;
  ssh_auth_method?: 'private_key' | 'password';
  ssh_private_key?: string; // Base64 encoded SSH private key content
  ssh_key_passphrase?: string;
  ssh_password?: string;
  local_port?: number | 'Auto';
}

export interface Connection extends ConnectionSecurityOptions {
  connection_id?: string;
  connection_name: string;
  username: string;
  password: string;
  host: string;
  port: number; // Changed from string to number for consistency
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
export interface ActionDataGeneration {
  action_data_generation_id?: string;
  action_id?: string;
  version_number?: number;
  browser_variable_id?: string;
  value?: Record<string, any> | null;
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
  basic_authentication?: BasicAuthentication;
}

// ====== AI / random data generation types (match backend schemas) ======

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


// AI Assert Request types
export interface AiAssertDatabaseConnection extends ConnectionSecurityOptions {
  connection_id: string;
  connection_name: string;
  username: string;
  password: string;
  host: string;
  port: number; // Changed from string to number for consistency
  db_name?: string;
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
  headers?: Record<string, any>;
  response_time?: number;
  payload?: any;
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