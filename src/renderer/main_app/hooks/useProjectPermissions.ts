import { useEffect, useMemo, useState } from 'react';
import { ProjectService } from '../services/projects';

type Permission = string;

export function useProjectPermissions(projectId?: string) {
  const [loading, setLoading] = useState<boolean>(false);
  const [role, setRole] = useState<string>('');
  const [permissions, setPermissions] = useState<Permission[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!projectId) return;
      try {
        setLoading(true);
        const svc = new ProjectService();
        const resp = await svc.getProjectById(projectId);
        if (mounted && resp.success && resp.data) {
          const r = (resp.data as any).user_role || '';
          const p = (resp.data as any).user_permissions || '';
          const parsed = String(p)
            .split(/[,;\s]+/)
            .map(s => s.trim())
            .filter(Boolean);
          setRole(r);
          setPermissions(parsed);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [projectId]);

  const can = useMemo(() => {
    const set = new Set(permissions.map(p => p.toUpperCase()));
    return (perm: Permission) => set.has(String(perm).toUpperCase());
  }, [permissions]);

  return { loading, role, permissions, can };
}

// Permission priority from lowest to highest
const PERMISSION_PRIORITY = ['CAN_VIEW', 'CAN_EDIT', 'CAN_MANAGE'] as const;

export function hasPermissionOrHigher(target: Permission, permissions: Permission[]): boolean {
  if (!target) return false;
  const targetUpper = String(target).toUpperCase();
  const normalized = new Set(permissions.map(p => String(p).toUpperCase()));
  const startIndex = PERMISSION_PRIORITY.indexOf(targetUpper as any);
  if (startIndex === -1) return false;
  for (let i = startIndex; i < PERMISSION_PRIORITY.length; i++) {
    if (normalized.has(PERMISSION_PRIORITY[i])) return true;
  }
  return false;
}

export function canEdit(projectID?: string) {
    const { permissions } = useProjectPermissions(projectID);
    return hasPermissionOrHigher('CAN_EDIT', permissions);
}

export function canManage(projectID?: string) {
    const { permissions } = useProjectPermissions(projectID);
    return hasPermissionOrHigher('CAN_MANAGE', permissions);
}

export function canView(projectID?: string) {
    const { permissions } = useProjectPermissions(projectID);
    return hasPermissionOrHigher('CAN_VIEW', permissions);
}

