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

// New types for optimized tree endpoint
export interface GetGroupTreeRequest {
  project_id: string;
  group_id?: string | null;
  include_suites?: boolean;
}

export interface SuiteItem {
  test_suite_id: string;
  name: string;
  description?: string | null;
  group_id?: string | null;
  project_id: string;
  test_passed?: number | null;
  test_failed?: number | null;
  passed_rate?: string | null;
  number_testcase?: number | null;
  browser_type?: string | null;
  progress?: number | null;
  created_at: string;
  updated_at?: string | null;
}

export interface GroupBasicItem {
  group_id: string;
  project_id: string;
  name: string;
  parent_group_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  children_count: number;
  suites_count: number;
  has_children: boolean;
}

export interface GroupTreeMetadata {
  total_ungrouped_suites: number;
  total_children_groups: number;
  has_more_children: boolean;
}

export interface GetGroupTreeResponse {
  ungrouped_suites: SuiteItem[];
  children_groups: GroupBasicItem[];
  metadata: GroupTreeMetadata;
}
