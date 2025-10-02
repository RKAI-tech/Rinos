let projectId: string | null = null;

export function setProjectId(id: string) {
    projectId = id;
}

export function getProjectId() {
    // console.log('[BrowserContext] Getting project ID:', projectId);
    return projectId;
}