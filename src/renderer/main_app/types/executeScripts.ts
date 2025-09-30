export interface RunCodeRequest {
    code: string;
    testcase_id?: string;
}

export interface RunCodeResponse {
    success: boolean;
    result?: string;
    error?: string;
    execution_time?: number;
}