import { BasicAuthentication } from "../types/basic_auth";
import apiRouter, { ApiRouter } from "./baseAPIRequest";
import { ApiResponse } from "../types/api_responses";

export class BasicAuthService {
    // TODO: Create basic authentication
    async upsertBasicAuthentication(basicAuthentication: BasicAuthentication): Promise<ApiResponse<BasicAuthentication>> {
        const response = await apiRouter.request<BasicAuthentication>('/basic-auth/upsert', {
            method: 'POST',
            body: JSON.stringify(basicAuthentication),
        });
        return response;
    }

    // TODO: Get basic authentication list by testcase
    async getBasicAuthenticationByTestcaseId(testcaseId: string): Promise<ApiResponse<BasicAuthentication[]>> {
        const response = await apiRouter.request<BasicAuthentication[]>(`/basic-auth/${testcaseId}`, {
            method: 'GET',
        });
        return response;
    }

    // TODO: Upsert multiple basic authentication
    async upsertMultipleBasicAuthentication(payload: BasicAuthentication[]): Promise<ApiResponse<BasicAuthentication[]>> {
        const response = await apiRouter.request<BasicAuthentication[]>(`/basic-auth/upsert-multiple`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        return response;
    }
    
    // TODO: Delete basic authentication
    async deleteBasicAuthentication(payload: BasicAuthentication): Promise<ApiResponse<BasicAuthentication>> {
        const response = await apiRouter.request<BasicAuthentication>(`/basic-auth/${payload.testcase_id}`, {
            method: 'DELETE',
            body: JSON.stringify(payload),
        });
        return response;
    }
}