export interface User {
    user_id: string;
    username: string;
    email: string;
    role: string;
}

export interface UserRequest {
    limit?: number;
    offset?: number;
}

export interface UserResponse {
    users: User[];
}