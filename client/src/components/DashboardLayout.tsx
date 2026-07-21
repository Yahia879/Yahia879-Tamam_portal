import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard, 
  LogOut, 
  PanelLeft, 
  Users, 
  Building2, 
  FileText, 
  Settings, 
  Bell,
  MapPin,
  ClipboardList,
  BarChart3,
  Wallet,
  Handshake,
  Palette,
  UserCog,
  ChevronDown,
  Calculator,
  Truck,
  Receipt,
  CheckSquare,
  Banknote,
  TrendingUp,
  Clock,
  Shield,
  Briefcase,
  Layers,
  ShieldAlert,
  Languages,
  LifeBuoy,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { ROLE_LABELS } from "@shared/constants";
import { useTheme } from "@/contexts/ThemeContext";

// مجموعات القائمة حسب الدور
type MenuItem = { icon: any; label: string; path: string };
type MenuGroup = { label: string; items: MenuItem[] };

const getMenuGroups = (role: string, isEn?: boolean): MenuGroup[] => {
  const groups: MenuGroup[] = [];

  // الرئيسية - متاحة فقط للإدارة العليا
  if (["super_admin", "system_admin"].includes(role)) {
    groups.push({
      label: "الرئيسية",
      items: [{ icon: LayoutDashboard, label: "لوحة التحكم", path: "/dashboard" }],
    });
  }

  // 1. المساجد والطلبات
  if (["super_admin", "system_admin", "projects_office"].includes(role)) {
    const items = [
      { icon: Building2, label: "المساجد", path: "/mosques" },
      { icon: MapPin, label: "خريطة المساجد", path: "/mosques/map" },
      { icon: FileText, label: isEn ? "Requests" : "الطلبات", path: "/requests" },
    ];
    if (["super_admin", "system_admin"].includes(role)) {
      items.push({ icon: ShieldAlert, label: "تقارير الطلبات", path: "/pending-reports" });
    }
    items.push({ icon: Clock, label: "تقويم المواعيد", path: "/field-visits/calendar" });
    groups.push({
      label: isEn ? "Mosques and Requests" : "المساجد والطلبات",
      items,
    });
  }

  // 2. الهندسة والمشاريع
  if (["super_admin", "system_admin", "projects_office", "project_manager", "field_team"].includes(role)) {
    const items: MenuItem[] = [];
    if (["super_admin", "system_admin", "projects_office", "project_manager"].includes(role)) {
      items.push({ icon: ClipboardList, label: "المشاريع", path: "/projects" });
    }
    if (["super_admin", "system_admin", "projects_office"].includes(role)) {
      items.push({ icon: TrendingUp, label: "تقارير الإنجاز", path: "/progress-reports" });
      items.push({ icon: BarChart3, label: "التقارير الفنية", path: "/reports" });
    }
    if (role === "field_team") {
      items.push({ icon: MapPin, label: "الزيارات الميدانية", path: "/field-visits" });
      items.push({ icon: Clock, label: "تقويم المواعيد", path: "/field-visits/calendar" });
    }
    if (items.length > 0) {
      groups.push({
        label: isEn ? "Engineering & Projects" : "الهندسة والمشاريع",
        items,
      });
    }
  }

  // 3. المشتريات والمالية
  if (["super_admin", "system_admin", "projects_office", "financial"].includes(role)) {
    const items = [
      { icon: Truck, label: "الموردون", path: "/suppliers" },
      { icon: Calculator, label: "إعداد جداول الكميات", path: "/boq-preparations" },
      { icon: Receipt, label: "عروض الأسعار", path: "/quotations" },
      { icon: CheckSquare, label: "الاعتماد المالي", path: "/financial-approval" },
      { icon: FileText, label: "العقود", path: "/contracts" },
      { icon: Banknote, label: "طلبات الصرف", path: "/disbursements" },
      { icon: FileText, label: "أوامر الصرف", path: "/disbursement-orders" },
      { icon: BarChart3, label: "التقرير المالي", path: "/financial-report" },
    ];
    groups.push({
      label: isEn ? "Procurement & Finance" : "المشتريات والمالية",
      items,
    });
  }

  // الاستجابة السريعة
  if (role === "quick_response") {
    groups.push({
      label: isEn ? "Requests" : "الطلبات",
      items: [{ icon: FileText, label: isEn ? "Requests" : "الطلبات", path: "/requests" }],
    });
  }

  // الاتصال المؤسسي
  if (["super_admin", "system_admin", "corporate_comm"].includes(role)) {
    const items = [
      { icon: Handshake, label: "الشركاء", path: "/partners" },
    ];
    if (role === "corporate_comm") {
      items.push({ icon: Palette, label: "الهوية البصرية", path: "/branding" });
      items.push({ icon: BarChart3, label: "التقارير", path: "/reports" });
    }
    groups.push({
      label: isEn ? "Corporate Communication" : "الاتصال المؤسسي",
      items,
    });
  }

  // 4. إدارة المستخدمين (للمدراء)
  if (["super_admin", "system_admin"].includes(role)) {
    groups.push({
      label: isEn ? "User Management" : "إدارة المستخدمين",
      items: [
        { icon: Users, label: "إدارة المستخدمين", path: "/staff" },
        { icon: CheckSquare, label: "إدارة المستفيدين", path: "/requester-approvals" },
      ],
    });
  }

  // 5. الدعم الفني (لكل الأدوار المسجلة)
  groups.push({
    label: isEn ? "Support" : "الدعم الفني",
    items: [{ icon: LifeBuoy, label: isEn ? "Technical Support" : "الدعم الفني", path: "/support" }],
  });

  // 6. الإعدادات (للمدراء)
  if (["super_admin", "system_admin"].includes(role)) {
    groups.push({
      label: isEn ? "Settings" : "الإعدادات",
      items: [
        { icon: Settings, label: "مركز الإعدادات", path: "/settings" },
      ],
    });
  }

  return groups;
};

// بناء قائمة التنقل للمستخدمين ذوي الأدوار المخصصة بناءً على صلاحياتهم الفعلية
// معرّفات الصلاحيات مطابقة لـ PERMISSIONS_STRUCTURE في RoleEdit.tsx
const getMenuGroupsFromPermissions = (permissions: string[], role: string, isEn?: boolean): MenuGroup[] => {
  const has = (p: string) => permissions.includes(p);
  const groups: MenuGroup[] = [];

  // الرئيسية - متاحة فقط للإدارة العليا
  if (["super_admin", "system_admin"].includes(role)) {
    groups.push({
      label: "الرئيسية",
      items: [{ icon: LayoutDashboard, label: "لوحة التحكم", path: "/dashboard" }],
    });
  }

  // 1. المساجد والطلبات
  const mosqueItems: MenuItem[] = [];
  if (has("mosques"))                      mosqueItems.push({ icon: Building2,     label: "المساجد",               path: "/mosques" });
  if (has("mosques_map"))                  mosqueItems.push({ icon: MapPin,        label: "خريطة المساجد",         path: "/mosques/map" });
  if (has("requests") || has("requests.view") || has("requests.create") || has("requests.view_details"))                     mosqueItems.push({ icon: FileText,      label: isEn ? "Requests" : "الطلبات",               path: "/requests" });
  if (has("pending_reports.view") || has("pending_reports.intervene")) {
    mosqueItems.push({ icon: ShieldAlert, label: "تقارير الطلبات", path: "/pending-reports" });
  }
  if (has("appointments_calendar"))        mosqueItems.push({ icon: Clock,         label: "تقويم المواعيد",        path: "/field-visits/calendar" });
  
  if (mosqueItems.length > 0) {
    groups.push({ 
      label: isEn ? "Mosques and Requests" : "المساجد والطلبات", 
      items: mosqueItems 
    });
  }

  // 2. الهندسة والمشاريع
  const engineeringItems: MenuItem[] = [];
  if (has("projects") || has("projects.view") || has("projects.view_details")) {
    engineeringItems.push({ icon: ClipboardList, label: "المشاريع",              path: "/projects" });
  }
  if (has("progress_reports")) {
    engineeringItems.push({ icon: TrendingUp,  label: "تقارير الإنجاز", path: "/progress-reports" });
  }
  if (has("reports")) {
    engineeringItems.push({ icon: BarChart3,     label: "التقارير الفنية",              path: "/reports" });
  }
  if (engineeringItems.length > 0) {
    groups.push({
      label: isEn ? "Engineering & Projects" : "الهندسة والمشاريع",
      items: engineeringItems,
    });
  }

  // 3. المشتريات والمالية
  const finItems: MenuItem[] = [];
  if (has("suppliers"))           finItems.push({ icon: Truck,       label: "الموردون",        path: "/suppliers" });
  if (has("boq") || has("boq.add") || has("boq.edit") || has("boq.delete")) {
    finItems.push({ icon: Calculator,    label: "إعداد جداول الكميات",   path: "/boq-preparations" });
  }
  if (has("quotations"))          finItems.push({ icon: Receipt,     label: "عروض الأسعار",    path: "/quotations" });
  if (has("financial_approval"))  finItems.push({ icon: CheckSquare, label: "الاعتماد المالي", path: "/financial-approval" });
  if (has("contracts"))           finItems.push({ icon: FileText,    label: "العقود",          path: "/contracts" });
  if (has("disbursement_requests")) finItems.push({ icon: Banknote,  label: "طلبات الصرف",    path: "/disbursements" });
  if (has("disbursement_orders")) finItems.push({ icon: FileText,    label: "أوامر الصرف",    path: "/disbursement-orders" });
  if (has("financial_report"))    finItems.push({ icon: BarChart3,   label: "التقرير المالي", path: "/financial-report" });
  
  if (finItems.length > 0) {
    groups.push({ 
      label: isEn ? "Procurement & Finance" : "المشتريات والمالية", 
      items: finItems 
    });
  }

  // 4. الاتصال المؤسسي والشركاء
  const commItems: MenuItem[] = [];
  if (has("partners") || has("partners.view")) commItems.push({ icon: Handshake, label: "الشركاء", path: "/partners" });
  if (commItems.length > 0) groups.push({ label: "الاتصال المؤسسي", items: commItems });

  // 5. إدارة المستخدمين
  const userManagementItems: MenuItem[] = [];
  if (has("staff_users.view") || has("staff_roles.view") || has("staff_custom_roles.view")) {
    userManagementItems.push({ icon: Users, label: "إدارة المستخدمين", path: "/staff" });
  }
  if (has("service_requester_accounts")) {
    userManagementItems.push({ icon: CheckSquare, label: "إدارة المستفيدين", path: "/requester-approvals" });
  }
  if (userManagementItems.length > 0) {
    groups.push({
      label: isEn ? "User Management" : "إدارة المستخدمين",
      items: userManagementItems,
    });
  }

  // 5. الدعم الفني
  const supportItems: MenuItem[] = [];
  if (permissions.includes("Create_Ticket") || permissions.includes("View_Tickets") || ["super_admin", "system_admin"].includes(role)) {
    supportItems.push({ icon: LifeBuoy, label: isEn ? "Technical Support" : "الدعم الفني", path: "/support" });
  }
  if (supportItems.length > 0) {
    groups.push({
      label: isEn ? "Support" : "الدعم الفني",
      items: supportItems,
    });
  }

  // 6. الإعدادات
  const settingsItems: MenuItem[] = [];
  const canViewSettingsCenter = 
    has("settings_org.view") || 
    has("settings_org.edit_basic") || 
    has("settings_org.edit_signers") || 
    has("settings_org.edit_banks") || 
    has("settings_org.edit_contracts") || 
    has("settings_branding.edit") || 
    has("settings_contracts.view") ||  
    has("settings_contracts.edit") || 
    has("settings_categories.view") || 
    has("settings_categories.add") || 
    has("settings_categories.edit") || 
    has("settings_categories.delete") || 
    has("settings.stages_view") || 
    has("settings.actions_view") ||
    has("services.view") || 
    has("services.add") || 
    has("services.edit") || 
    has("services.delete") ||
    has("staff_notifications.edit");

  if (canViewSettingsCenter) {
    settingsItems.push({ icon: Settings, label: "مركز الإعدادات", path: "/settings" });
  }
  if (settingsItems.length > 0) {
    groups.push({
      label: isEn ? "Settings" : "الإعدادات",
      items: settingsItems,
    });
  }

  return groups;
};

// دالة مساعدة لاستخراج جميع العناصر بالترتيب
const getMenuItems = (role: string) => getMenuGroups(role).flatMap(g => g.items);

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="w-16 h-16 rounded-xl gradient-primary flex items-center justify-center">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              يرجى تسجيل الدخول للمتابعة
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              الوصول إلى لوحة التحكم يتطلب تسجيل الدخول
            </p>
          </div>
          <Link href="/login">
            <Button
              size="lg"
              className="w-full gradient-primary text-white shadow-lg hover:shadow-xl transition-all"
            >
              تسجيل الدخول
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // إعادة توجيه طالب الخدمة إلى لوحة تحكمه الخاصة إذا حاول الوصول لصفحة إدارية
  // نسمح له بالوصول لصفحات مشتركة مثل الإشعارات والملف الشخصي وتفاصيل المساجد
  if (user.role === "service_requester") {
    const isSharedPage = 
      window.location.pathname === "/notifications" || 
      window.location.pathname === "/profile" ||
      window.location.pathname.startsWith("/mosques/") ||
      window.location.pathname === "/requester/mosques/new";
      
    if (!isSharedPage) {
      window.location.href = "/requester";
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">جاري التحويل...</p>
          </div>
        </div>
      );
    }

    return <RequesterLayout>{children}</RequesterLayout>;
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

// تخطيط مخصص لطالب الخدمة (المستفيد) بدون قائمة جانبية (Sidebar) مع هيدر علوي متناسق
function RequesterLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { theme, toggleTheme, switchable } = useTheme();
  
  const { data: orgSettings } = trpc.organization.getSettings.useQuery();
  const { data: unreadCount } = trpc.notifications.getUnreadCount.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 10000,
  });

  const mainLogoSrc = orgSettings?.logoUrl || '/logo.svg';
  const orgName = orgSettings?.organizationName || 'بوابة تمام';
  const orgNameShort = orgSettings?.organizationNameShort || 'للعناية بالمساجد';

  return (
    <div className="min-h-screen bg-background">
      {/* شريط التنقل العلوي للمستفيد */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <Link href="/requester" className="flex items-center gap-2 sm:gap-3 min-w-0">
              <img 
                src={mainLogoSrc} 
                alt="شعار بوابة تمام" 
                className="h-8.5 w-8.5 sm:h-10 sm:w-auto shrink-0 object-contain"
              />
              <div className="min-w-0">
                <h1 className="font-bold text-sm sm:text-lg text-foreground truncate">{orgName}</h1>
                <p className="hidden sm:block text-[10px] text-muted-foreground truncate">{orgNameShort}</p>
              </div>
            </Link>

            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              {/* الإشعارات */}
              <Link href="/notifications">
                <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full">
                  <Bell className="w-5 h-5" />
                  {unreadCount && unreadCount > 0 ? (
                    <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-background" />
                  ) : null}
                </Button>
              </Link>

              {/* القائمة المنسدلة للملف الشخصي */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                    <Avatar className="h-9 w-9 border">
                      <AvatarFallback className="text-xs font-medium bg-sidebar-primary/20 text-sidebar-primary">
                        {user?.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex flex-col space-y-1 p-2">
                    <p className="text-sm font-medium leading-none">{user?.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setLocation("/requester")} className="cursor-pointer">
                    <LayoutDashboard className="ml-2 h-4 w-4" />
                    <span>لوحة التحكم</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/profile")} className="cursor-pointer">
                    <UserCog className="ml-2 h-4 w-4" />
                    <span>الملف الشخصي</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/support")} className="cursor-pointer">
                    <LifeBuoy className="ml-2 h-4 w-4" />
                    <span>الدعم الفني</span>
                  </DropdownMenuItem>
                  {switchable && toggleTheme && (
                    <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer">
                      {theme === 'dark' ? (
                        <><svg xmlns="http://www.w3.org/2000/svg" className="ml-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg><span>الوضع الفاتح</span></>
                      ) : (
                        <><svg xmlns="http://www.w3.org/2000/svg" className="ml-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg><span>الوضع الداكن</span></>
                      )}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="ml-2 h-4 w-4" />
                    <span>تسجيل الخروج</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* محتوى الصفحة */}
      <main className="p-4 md:p-6 lg:p-8 bg-muted/30 min-h-[calc(100vh-4rem)]">
        <div className="container mx-auto max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const lang = (localStorage.getItem("quick-response-lang") as "ar" | "en") || "ar";
  const isEn = user?.role === "quick_response" && lang === "en";
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  // إذا كان للمستخدم دور قابل للتخصيص (أي دور غير super_admin و system_admin و service_requester)،
  // نبني القائمة الجانبية من صلاحياته الفعلية المسجلة
  const userPermissions: string[] = (user as any)?.permissions ?? [];
  const hasCustomRole = !!(user as any)?.customRole;
  const isSuperOrSystemAdmin = ["super_admin", "system_admin"].includes(user?.role || "");
  const isServiceRequester = user?.role === "service_requester";
  const hasDynamicPermissions = !isServiceRequester;
 
  const menuGroups = (hasDynamicPermissions
    ? getMenuGroupsFromPermissions(userPermissions, user?.role || "", isEn)
    : getMenuGroups(user?.role || "", isEn)
  ).filter(group => group.items && group.items.length > 0);
  const menuItems = menuGroups.flatMap(g => g.items);
  const activeMenuItem = menuItems.find(item => item.path === location);
  // عنوان الدور المعروض في تذييل القائمة
  const roleDisplayLabel = hasCustomRole
    ? (user as any).customRole.nameAr
    : (isEn && user?.role === "quick_response" ? "quick response" : (ROLE_LABELS[user?.role || ""] || user?.role));
  const isMobile = useIsMobile();
  const { theme, toggleTheme, switchable } = useTheme();
  // جلب الشعار من قاعدة البيانات
  const { data: orgSettings } = trpc.organization.getSettings.useQuery();
  const { data: unreadCount } = trpc.notifications.getUnreadCount.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 10000,
  });
  // الشعار الأبيض (للقائمة الجانبية الداكنة) أو الرئيسي كاحتياط
  const sidebarLogoSrc = orgSettings?.secondaryLogoUrl || orgSettings?.logoUrl || '/logo-white.svg';
  // الشعار الرئيسي (للهيدر في الموبايل)
  const mainLogoSrc = orgSettings?.logoUrl || '/logo.svg';
  // اسم الجمعية
  const orgName = orgSettings?.organizationName || 'بوابة تمام';
  const orgNameShort = orgSettings?.organizationNameShort || 'للعناية بالمساجد';

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarRight = sidebarRef.current?.getBoundingClientRect().right ?? 0;
      const newWidth = sidebarRight - e.clientX;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-l-0 border-r"
          side="right"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center border-b border-sidebar-border">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <img src={sidebarLogoSrc} alt="شعار" className="w-9 h-9 shrink-0 object-contain" />
              {!isCollapsed ? (
                <div>
                  <span className="font-bold text-sidebar-foreground block leading-tight">
                    {orgName}
                  </span>
                  <span className="text-xs text-sidebar-foreground/50">
                    {orgNameShort}
                  </span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 py-2 overflow-y-auto">
            {menuGroups.map((group, groupIdx) => (
              <div key={group.label}>
                {groupIdx > 0 && !isCollapsed && (
                  <div className="mx-3 my-1 border-t border-sidebar-border" />
                )}
                {!isCollapsed && group.label && (
                  <p className="px-4 py-1.5 text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-wider">
                    {group.label}
                  </p>
                )}
                <SidebarMenu className="px-2 py-0.5">
                  {group.items.map(item => {
                    const isActive = location === item.path;
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => setLocation(item.path)}
                          tooltip={item.label}
                          className={`h-9 transition-all font-normal text-sm ${isActive ? 'bg-white/20 !text-white' : ''}`}
                        >
                          <item.icon
                            className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-sidebar-foreground/70"}`}
                          />
                          <span className={isActive ? "text-white font-bold" : "text-sidebar-foreground"}>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </div>
            ))}
          </SidebarContent>

          <SidebarFooter className="p-3 border-t border-sidebar-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-sidebar-accent transition-colors w-full text-right group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring">
                  <div className="relative shrink-0">
                    <Avatar className="h-9 w-9 border border-sidebar-border">
                      <AvatarFallback className="text-xs font-medium bg-sidebar-primary/20 text-sidebar-primary">
                        {user?.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {unreadCount && unreadCount > 0 ? (
                      <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-sidebar" />
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none text-sidebar-foreground">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-sidebar-foreground/50 truncate mt-1">
                      {roleDisplayLabel}
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-sidebar-foreground/50 group-data-[collapsible=icon]:hidden" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLocation("/profile")} className="cursor-pointer">
                  <UserCog className="ml-2 h-4 w-4" />
                  <span>{isEn ? "Profile" : "الملف الشخصي"}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/notifications")} className="cursor-pointer flex items-center justify-between">
                  <div className="flex items-center">
                    <Bell className="ml-2 h-4 w-4" />
                    <span>{isEn ? "Notifications" : "الإشعارات"}</span>
                  </div>
                  {unreadCount && unreadCount > 0 ? (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  ) : null}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {switchable && toggleTheme && (
                  <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer">
                    {theme === 'dark' ? (
                      <><svg xmlns="http://www.w3.org/2000/svg" className="ml-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg><span>{isEn ? "Light Mode" : "الوضع الفاتح"}</span></>
                    ) : (
                      <><svg xmlns="http://www.w3.org/2000/svg" className="ml-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg><span>{isEn ? "Dark Mode" : "الوضع الداكن"}</span></>
                    )}
                  </DropdownMenuItem>
                )}
                {user?.role === "quick_response" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => {
                        const nextLang = lang === "ar" ? "en" : "ar";
                        localStorage.setItem("quick-response-lang", nextLang);
                        window.location.reload();
                      }} 
                      className="cursor-pointer"
                    >
                      <Languages className="ml-2 h-4 w-4" />
                      <span>{lang === "ar" ? "انكليزي" : "Arabic"}</span>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="ml-2 h-4 w-4" />
                  <span>{isEn ? "Logout" : "تسجيل الخروج"}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-3">
                <img src={mainLogoSrc} alt="شعار" className="w-8 h-8 object-contain" />
                <span className="font-semibold text-foreground">
                  {activeMenuItem?.label || "بوابة تمام"}
                </span>
              </div>
            </div>
          </div>
        )}
        <main className="p-4 md:p-6 lg:p-8 bg-muted/30 min-h-screen">
          {children}
        </main>
      </SidebarInset>
    </>
  );
}
