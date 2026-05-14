import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useMemo } from "react";
import { hasRouteAccess, EXEMPT_ROUTES, REQUESTER_ROUTES } from "@/lib/routePermissions";

interface PermissionRouteGuardProps {
  children: React.ReactNode;
}

/**
 * حارس المسارات القائم على الصلاحيات (Permission-Based Route Guard)
 * 
 * يتحقق من صلاحيات المستخدم قبل السماح بالوصول لأي مسار محمي.
 * يعمل لكل من:
 * - الأدوار الأساسية (Base Roles): يتحقق من الصلاحيات المحددة مسبقاً لكل دور
 * - الأدوار المخصصة (Custom Roles): يتحقق من الصلاحيات المفعّلة عند إنشاء الدور
 * 
 * إذا لم يملك المستخدم الصلاحية، يتم توجيهه لصفحة 403.
 */
export default function PermissionRouteGuard({ children }: PermissionRouteGuardProps) {
  const { user, loading } = useAuth();
  const [location, navigate] = useLocation();

  const accessResult = useMemo(() => {
    if (loading || !user) return { allowed: true, reason: "loading" };

    // المسارات العامة لا تحتاج تحقق
    if (EXEMPT_ROUTES.has(location)) return { allowed: true, reason: "exempt" };

    // مسارات طالب الخدمة
    if (REQUESTER_ROUTES.has(location)) {
      if (user.role === "service_requester") return { allowed: true, reason: "requester" };
      // المستخدمين الإداريين يمكنهم أيضاً الوصول إلى /my-requests
      if (location === "/my-requests") return { allowed: true, reason: "my-requests" };
    }

    // طالب الخدمة يحاول الوصول لصفحة إدارية
    if (user.role === "service_requester" && !REQUESTER_ROUTES.has(location)) {
      // نسمح بالوصول لبعض الصفحات المشتركة
      const sharedPaths = ["/profile", "/notifications"];
      if (sharedPaths.includes(location) || location.startsWith("/requester/")) {
        return { allowed: true, reason: "shared" };
      }
      return { allowed: false, reason: "requester-blocked" };
    }

    // التحقق من الصلاحيات
    const userPerms: string[] = (user as any)?.permissions ?? [];
    const hasCustom = !!(user as any)?.customRole;

    const allowed = hasRouteAccess(location, user.role, userPerms, hasCustom);
    return { allowed, reason: allowed ? "permission-ok" : "permission-denied" };
  }, [user, loading, location]);

  useEffect(() => {
    if (loading) return;

    if (!accessResult.allowed) {
      console.warn(
        `[PermissionRouteGuard] Access denied for route "${location}" — reason: ${accessResult.reason}, role: ${user?.role}`
      );
      navigate("/403", { replace: true });
    }
  }, [accessResult.allowed, accessResult.reason, loading, location, navigate, user?.role]);

  // أثناء التحميل أو عند منع الوصول، لا نعرض المحتوى
  if (loading) return null;
  if (!accessResult.allowed) return null;

  return <>{children}</>;
}
