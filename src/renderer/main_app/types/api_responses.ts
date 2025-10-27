export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface DefaultResponse {
    message: string;
    data?: any;
}