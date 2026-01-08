export enum BrowserStorageType {
	COOKIE = 'cookie',
	LOCAL_STORAGE = 'localStorage',
	SESSION_STORAGE = 'sessionStorage',
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

export interface BrowserStorageSearchRequest {
	project_id: string;
	page: number;
	page_size: number;
	q?: string | null;  // search keyword
	storage_type?: string | null;  // filter by storage type: cookie, localStorage, sessionStorage
	sort_by?: string | null;  // field to sort by: name, description, created_at, updated_at, storage_type
	order?: string | null;  // asc or desc
}

export interface BrowserStorageSearchResponse {
	browser_storages: BrowserStorageListItem[];
	number_browser_storage: number;
	current_page: number;
	total_pages: number;
}

