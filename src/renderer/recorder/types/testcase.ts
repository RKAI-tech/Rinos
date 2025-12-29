import { ActionDataGeneration } from "./actions";

export interface TestCaseDataVersion {
    testcase_data_version_id?: string;
    testcase_id?: string;
    version?: string;
    updated_at?: string;
    created_at?: string;
    action_data_generations?: ActionDataGeneration[];
}

export interface TestCaseDataVersionBatch {
    testcase_data_versions: TestCaseDataVersion[];
}