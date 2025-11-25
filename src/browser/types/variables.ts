import { StatementResponse } from './statements';

// Variables
export interface Variable {
    variable_id: string;
    project_id: string;
    user_defined_name: string;
    original_name: string;
    value: string;
    statement_id: string;
    database_name: string;
    database_type: string;
    query_name: string;
}

export interface VariableListResponse {
    items: Variable[];
    total: number;
}

export interface VariableCreateRequest {
    project_id: string;
    statement_id: string;
    user_defined_name: string;
    original_name: string;
    value: string;
}

export interface VariableWithConnection {
    variable_id: string;
    user_defined_name: string;
    original_name: string;
    value: string;
    statement: StatementResponse;
}

export interface VariableWithConnectionListResponse {
    items: VariableWithConnection[];
    total: number;
}