import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";

interface AdminGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

/**
 * مكون حماية الصفحات الإدارية
 * يمنع طالب الخدمة من الوصول للصفحات الإدارية
 * ويعيد توجيهه إلى لوحة تحكمه الخاصة
 */
export default function AdminGuard({ children, allowedRoles }: AdminGuardProps) {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && user) {
      // إذا كان طالب خدمة، أعد توجيهه
      if (user.role === "service_requester") {
        navigate("/requester");
      }
      // إذا تم تحديد أدوار معينة وليس المستخدم منها
      else if (allowedRoles && !allowedRoles.includes(user.role)) {
        navigate("/dashboard");
      }
    }
  }, [user, loading, navigate, allowedRoles]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // إذا كان طالب خدمة، لا تعرض المحتوى
  if (user?.role === "service_requester") {
    return null;
  }

  // إذا تم تحديد أدوار معينة وليس المستخدم منها
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
