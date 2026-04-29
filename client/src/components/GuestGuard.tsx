import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

interface GuestGuardProps {
  children: React.ReactNode;
}

/**
 * مكون حماية الصفحات العامة (تسجيل الدخول والتسجيل)
 * يمنع المستخدم المسجل من الوصول لهذه الصفحات
 * ويعيد توجيهه إلى لوحة التحكم المناسبة
 */
export default function GuestGuard({ children }: GuestGuardProps) {
  const { isAuthenticated, user, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      const path = user.role === "service_requester" ? "/requester" : "/dashboard";
      navigate(path, { replace: true });
    }
  }, [isAuthenticated, user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  // إذا كان مسجلاً للدخول، لا تعرض المحتوى (سيتم التوجيه في useEffect)
  if (isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
