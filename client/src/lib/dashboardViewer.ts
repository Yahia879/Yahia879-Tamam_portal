type DashboardViewerUser = {
  role?: string | null;
  customRole?: { id?: string; nameAr?: string | null; nameEn?: string | null } | null;
} | null | undefined;

export function isDashboardViewerUser(user: DashboardViewerUser): boolean {
  return user?.role === "dashboard_viewer" ||
    user?.customRole?.id === "dashboard_viewer" ||
    user?.customRole?.nameAr?.trim() === "مستخدم لوحة المعلومات" ||
    user?.customRole?.nameEn?.trim().toLowerCase() === "dashboard viewer";
}
