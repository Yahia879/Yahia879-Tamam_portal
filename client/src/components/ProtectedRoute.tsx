import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { isDashboardViewerUser } from "@/lib/dashboardViewer";
import { useEffect } from "react";
import RequesterNotesResponseScreen from "./RequesterNotesResponseScreen";
import RequesterPendingScreen from "./RequesterPendingScreen";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate("/login");
      } else if (allowedRoles && !allowedRoles.includes(user.role)) {
        // If they are a requester but the route is not for them, send them to /requester
        if (user.role === "service_requester") {
          navigate("/requester");
        } else {
          navigate(isDashboardViewerUser(user) ? "/information-dashboard" : "/dashboard");
        }
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

  if (!user) {
    return null;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return null;
  }

  // إذا كان طالب خدمة ولم يتم تفعيل حسابه بعد
  if (
    user.role === "service_requester" &&
    (user.status === "pending" || user.status === "suspended")
  ) {
    if (user.adminNotes && user.notesRequiredType !== "none") {
      return <RequesterNotesResponseScreen />;
    } else {
      return <RequesterPendingScreen />;
    }
  }

  return <>{children}</>;
}
