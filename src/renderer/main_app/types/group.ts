
export interface Group {
  group_id?: string;
  project_id?: string;
  name?: string;
  parent_group_id?: string;
  created_at?: string;
}

export interface GroupCreateRequest {
  project_id: string;
  name: string;
  parent_group_id?: string | null;
}

export interface GroupUpdateRequest {
  group_id: string;
  name?: string | null;
  parent_group_id?: string | null;
}

export interface GroupResponse {
  group_id: string;
  project_id: string;
  name: string;
  parent_group_id?: string | null;
}

export interface GroupTreeItem {
  group_id: string;
  project_id: string;
  name: string;
  parent_group_id?: string | null;
  children: GroupTreeItem[];
}

export interface GroupSuiteItem {
  test_suite_id: string;
  name: string;
  description?: string | null;
  test_passed?: number | null;
  test_failed?: number | null;
  passed_rate?: string | null;
  number_testcase?: number | null;
  browser_type?: string | null;
  group_id?: string | null;
  created_at?: string | null;
  histories?: any[] | null;
  progress?: number | null;
  project_id: string;
}

export interface GroupTreeWithSuitesItem {
  group_id: string;
  project_id: string;
  name: string;
  parent_group_id?: string | null;
  suites: GroupSuiteItem[];
  children: GroupTreeWithSuitesItem[];
}

export interface GroupListResponse {
  items: GroupResponse[];
  total: number;
}

export interface GroupTreeResponse {
  items: GroupTreeItem[];
}

export interface GroupTreeWithSuitesResponse {
  items: GroupTreeWithSuitesItem[];
  ungrouped_suites: GroupSuiteItem[];
}

