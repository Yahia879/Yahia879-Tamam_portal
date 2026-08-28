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
    // أثناء التحميل، لا نحكم بعد
    if (loading) return { allowed: false, reason: "loading", pending: true };

    // إذا لم يوجد مستخدم: المسارات العامة مسموحة، الباقي يتركه للمكونات الأخرى (مثل GuestGuard)
    if (!user) {
      if (EXEMPT_ROUTES.has(location)) return { allowed: true, reason: "exempt-no-user", pending: false };
      // مسارات تسجيل الدخول وأمثالها
      return { allowed: true, reason: "no-user-public", pending: false };
    }

    // المسارات العامة لا تحتاج تحقق
    if (EXEMPT_ROUTES.has(location)) return { allowed: true, reason: "exempt", pending: false };

    // مسارات طالب الخدمة
    if (REQUESTER_ROUTES.has(location)) {
      if (user.role === "service_requester") return { allowed: true, reason: "requester", pending: false };
      // المستخدمين الإداريين يمكنهم أيضاً الوصول إلى /my-requests
      if (location === "/my-requests") return { allowed: true, reason: "my-requests", pending: false };
    }

    // طالب الخدمة يحاول الوصول لصفحة إدارية
    // استثناء: إذا كان لديه دور مخصص (customRole)، نسمح له بالمرور للفحص الذي يليه
    if (user.role === "service_requester" && !REQUESTER_ROUTES.has(location) && !((user as any)?.customRole)) {
      // نسمح بالوصول لبعض الصفحات المشتركة (الملف الشخصي، الإشعارات، وتفاصيل الطلبات/المساجد)
      const sharedPaths = ["/profile", "/notifications", "/evaluation"];
      const isDynamicSharedPath = 
        /^\/requests\/\d+$/.test(location) || 
        /^\/requests\/\d+\/evaluation$/.test(location) ||
        /^\/requester\/requests\/\d+\/evaluation$/.test(location) ||
        /^\/evaluation(\?.*)?$/.test(location) ||
        /^\/mosques\/\d+$/.test(location) || 
        /^\/final-report\/\d+$/.test(location);
      
      if (sharedPaths.includes(location) || location.startsWith("/requester/") || isDynamicSharedPath) {
        return { allowed: true, reason: "shared", pending: false };
      }
      return { allowed: false, reason: "requester-blocked", pending: false };
    }

    // التحقق من الصلاحيات — يشمل الأدوار الأساسية والمخصصة
    const userPerms: string[] = (user as any)?.permissions ?? [];
    // يعتبر المستخدم لديه دور مخصص إذا كان لديه كائن customRole أو إذا كان دوره غير موجود في الأدوار الأساسية المعروفة
    const isBaseRole = ["super_admin", "system_admin", "board_chairman", "board_member", "general_manager", "executive_director", "projects_office", "field_team", "quick_response", "financial", "financial_manager", "project_manager", "corporate_comm", "service_requester"].includes(user.role);
    const hasCustom = !!(user as any)?.customRole || !isBaseRole;

    const allowed = hasRouteAccess(location, user.role, userPerms, hasCustom);
    return { allowed, reason: allowed ? "permission-ok" : "permission-denied", pending: false };
  }, [user, loading, location]);

  useEffect(() => {
    if (accessResult.pending) return;

    if (!accessResult.allowed) {
      console.warn(
        `[PermissionRouteGuard] Access denied for route "${location}" — reason: ${accessResult.reason}, role: ${user?.role}`
      );
      navigate("/403", { replace: true });
    }
  }, [accessResult.allowed, accessResult.reason, accessResult.pending, location, navigate, user?.role]);

  // أثناء التحميل، لا نعرض المحتوى (تجنب الوميض)
  if (loading) return null;

  // عند منع الوصول (غير المعلّق)، لا نعرض المحتوى
  if (!accessResult.pending && !accessResult.allowed) return null;

  return <>{children}</>;
}
