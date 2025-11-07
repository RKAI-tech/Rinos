export enum BrowserStorageType {
	COOKIE = 'cookie',
	LOCAL_STORAGE = 'local_storage',
	SESSION_STORAGE = 'session_storage',
}

export interface BrowserStorageCreateRequest {
	project_id: string;
	name: string;
	description?: string;
	value: any;
	storage_type: BrowserStorageType;
}

export interface BrowserStorageUpdateRequest {
	name?: string;
	description?: string;
	value?: any;
	storage_type?: BrowserStorageType;
}

export interface BrowserStorageResponse {
	browser_storage_id: string;
	project_id: string;
	name: string;
	description?: string;
	value: any;
	storage_type: BrowserStorageType;
}

export interface BrowserStorageListItem {
	browser_storage_id: string;
	project_id: string;
	name: string;
	description?: string;
	updated_at?: string;
	value: any;
	storage_type: BrowserStorageType;
}

export interface BrowserStorageListResponse {
	items: BrowserStorageListItem[];
	total: number;
}


