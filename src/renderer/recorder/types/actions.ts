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
  port: string;
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
  selector?: Selector[];
  query?: string;
  value?: string;
  variable_name?: string;
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
    variable_name?: string;
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

export interface ElementAICreate {
  domHtml: string;
}

export interface ElementAIDatabase {
  data: string;
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