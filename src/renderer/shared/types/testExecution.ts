// Types for test execution service

import { BasicAuthentication } from "./actions";

export type EvidenceStatus = 'Running' | 'Passed' | 'Failed' | 'Draft';

export interface ExecuteTestcaseOptions {
  testcase_id: string;
  evidence_id?: string;
  browser_type?: string;
  onSave?: boolean;
  test_suite_id?: string;
  test_suite_browser_type?: string;
  project_id?: string;
}

export interface ExecuteCodeOptions {
  code: string;
  browser_type?: string;
  onSave?: boolean;
  evidence_id?: string;
  tempFiles?: string[]; // Temp files to cleanup after execution
}

export interface TestExecutionResult {
  success: boolean;
  status: EvidenceStatus;
  logs: string;
  video_url?: string;
  images_urls?: string[];
  database_files_urls?: string[];
  execution_time: number;
}

export interface PlaywrightRunOptions {
  scriptPath: string;
  browserType: string;
  outputDir: string;
  timeout?: number;
}

export interface PlaywrightRunResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  outputDir: string;
}

export interface EvidenceUpdateFiles {
  video_file?: File;
  log_file?: File;
  image_files?: File[];
  database_files?: File[];
}
