import { Action, ActionBatch } from "./actions";
import { BasicAuthentication } from "./basic_auth";

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

export interface UploadFileRequest {
    filename: string;
    file_content: string;
}

export interface UploadFileResponse {
    success: boolean;
    message?: string;
    filename?: string;
    file_path?: string;
    error?: string;
}

export interface FileDeleteRequest {
    filename: string;
}

export interface FileDeleteResponse {
    success: boolean;
    message?: string;
    filename?: string;
    error?: string;
}

export interface ExecuteActionsRequest {
    actions: ActionBatch;
    basic_auth?: BasicAuthentication;
}
export interface ExecuteActionsResponse {
    success?: boolean;
    message?: string;
    error?: string;
}
export interface GenerationCodeResponse{
    code:string;
}
export interface GenerationCodeRequest {
    testcase_id: string;
    actions: Action[];
    basic_auth?: BasicAuthentication;
}