import { trpc } from "../lib/trpc";
import { useAuth } from "../_core/hooks/useAuth";

/**
 * Hook للتحقق من صلاحية واحدة
 * @param permission - معرف الصلاحية (مثل: requests.view)
 * @returns true إذا كان المستخدم يملك الصلاحية، false إذا لم يملكها
 */
export function usePermission(permission: string): boolean {
  const { user } = useAuth();
  
  const { data: permissions, isLoading } = trpc.permissions.getUserPermissions.useQuery(
    { userId: user?.id ?? 0 },
    { 
      enabled: !!user,
      staleTime: 10 * 1000,
      refetchOnMount: true,
      refetchOnWindowFocus: true
    }
  );

  // إذا كان المستخدم غير مسجل دخول، لا يملك أي صلاحيات
  if (!user) {
    return false;
  }

  if (permissions !== undefined) {
    return permissions.includes(permission) || permissions.includes("*");
  }

  const userPerms: string[] = (user as any)?.permissions ?? [];
  return userPerms.includes(permission) || userPerms.includes("*");
}

/**
 * Hook للتحقق من عدة صلاحيات (يجب أن يملك جميعها)
 * @param requiredPermissions - قائمة معرفات الصلاحيات
 * @returns true إذا كان المستخدم يملك جميع الصلاحيات، false إذا لم يملك إحداها
 */
export function usePermissions(requiredPermissions: string[]): boolean {
  const { user } = useAuth();
  
  const { data: permissions, isLoading } = trpc.permissions.getUserPermissions.useQuery(
    { userId: user?.id ?? 0 },
    { 
      enabled: !!user,
      staleTime: 10 * 1000,
      refetchOnMount: true,
      refetchOnWindowFocus: true
    }
  );

  if (!user) {
    return false;
  }

  if (permissions !== undefined) {
    return permissions.includes("*") || requiredPermissions.every(p => permissions.includes(p));
  }

  const userPerms: string[] = (user as any)?.permissions ?? [];
  return userPerms.includes("*") || requiredPermissions.every(p => userPerms.includes(p));
}

/**
 * Hook للتحقق من صلاحية واحدة على الأقل من قائمة
 * @param permissionsList - قائمة معرفات الصلاحيات
 * @returns true إذا كان المستخدم يملك صلاحية واحدة على الأقل
 */
export function useAnyPermission(permissionsList: string[]): boolean {
  const { user } = useAuth();
  
  const { data: permissions, isLoading } = trpc.permissions.getUserPermissions.useQuery(
    { userId: user?.id ?? 0 },
    { 
      enabled: !!user,
      staleTime: 10 * 1000,
      refetchOnMount: true,
      refetchOnWindowFocus: true
    }
  );

  if (!user) {
    return false;
  }

  if (permissions !== undefined) {
    return permissions.includes("*") || permissionsList.some(p => permissions.includes(p));
  }

  const userPerms: string[] = (user as any)?.permissions ?? [];
  return userPerms.includes("*") || permissionsList.some(p => userPerms.includes(p));
}

/**
 * Hook لجلب جميع صلاحيات المستخدم
 * @returns قائمة جميع الصلاحيات
 */
export function useUserPermissions(): string[] {
  const { user } = useAuth();
  
  const { data: permissions } = trpc.permissions.getUserPermissions.useQuery(
    { userId: user?.id ?? 0 },
    { 
      enabled: !!user,
      staleTime: 10 * 1000,
      refetchOnMount: true,
      refetchOnWindowFocus: true
    }
  );

  return permissions ?? [];
}
