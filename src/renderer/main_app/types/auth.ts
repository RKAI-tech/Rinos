export enum UserRole {
    OWNER = 'OWNER',
    ADMIN = 'ADMIN',
    MEMBER = 'MEMBER'
}

export interface User {
    id: number;
    email: string;
    role: string;
}

export interface AuthMeResponse {
    "success": boolean;
    "data": {
        "id": string;
        "email": string;
        "role": string;
    };
}

export interface LoginWithMicrosoftRequest {
    // access_token: string;
    id_token: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    access_token: string;
    token_type: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
}

export interface RegisterResponse {
    message: string;
}

export interface ValidateTokenRequest {
    token: string;
}
