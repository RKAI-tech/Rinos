export interface CookiesCreateRequest {
	project_id: string;
	name: string;
	description?: string;
	value: any;
}

export interface CookiesUpdateRequest {
	name?: string;
	description?: string;
	value?: any;
}

export interface CookiesResponse {
	cookies_id: string;
	project_id: string;
	name: string;
	description?: string;
	value: any;
}

export interface CookiesListItem {
	cookies_id: string;
	project_id: string;
	name: string;
	description?: string;
	updated_at?: string;
	value: any;
}

export interface CookiesListResponse {
	items: CookiesListItem[];
	total: number;
}


