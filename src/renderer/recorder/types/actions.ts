export enum ActionType {
  input = "input",
  navigate = "navigate",
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
  // Browser events
  reload = "reload",
  back = "back",
  forward = "forward",
  window_resize = "window_resize",
  api_request = "api_request",
}

export enum AssertType {
  ai = "AI",
  toContainText = "toContainText",
  toHaveText = "toHaveText",
  toHaveValue = "toHaveValue",
  toHaveValues = "toHaveValues",
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
  toHaveAccessibleDescription = "toHaveAccessibleDescription",
  toHaveAccessibleName = "toHaveAccessibleName",
  toHaveCount = "toHaveCount",
  toHaveRole = "toHaveRole",
  pageHasATitle = "pageHasATitle",
  pageHasAURL = "pageHasAURL",
}

export enum ConnectionType {
  postgres = "postgres",
  mysql = "mysql",
  mssql = "mssql",
}

export interface Connection {
  connection_id: string;
  username: string;
  password: string;
  host: string;
  port: string | number;
  db_name: string;
  db_type: ConnectionType;
}

export interface Statement {
  statement_id: string;
  query: string;
}

export interface Selector {
  value: string;
}

export interface Element {
  selectors?: Selector[];
  query?: string;
  value?: string;
  variable_name?: string;
}

export interface FileUpload {
  file_upload_id?: string;
  filename?: string;
  file_path?: string;
  file_content?: string;
}

// API Request interfaces
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

export interface ApiResponse {
  status: number;
  data: any;
  headers: Record<string, string>;
  success: boolean;
  error?: string;
  timestamp?: number;
}

export interface Action {
    action_id?: string;                                                                                                                                                                                                               
    testcase_id: string;
    action_type: ActionType;
    description?: string; // edit
    playwright_code?: string; // edit
    elements?: Element[]; // edit 
    assert_type?: AssertType;
    value?: string; // edit
    // Select-specific fields
    selected_value?: string; // edit
    // Checkbox-specific fields
    checked?: boolean; // edit
    // Database-related fields
    connection_id?: string;
    connection?: Connection;
    statement_id?: string;
    statement?: Statement;
    query?: string;
    variable_name?: string;
    file_upload?: FileUpload[];
    // Browser events
    url?: string;
    timestamp?: number;
    // API Request fields
    api_request?: ApiRequestData;
}

export interface ActionBatch {
  actions: Action[];
  testcase_id: string;
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