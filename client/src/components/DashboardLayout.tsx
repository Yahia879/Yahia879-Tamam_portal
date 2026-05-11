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

const getMenuGroups = (role: string): MenuGroup[] => {
  const groups: MenuGroup[] = [];

  // الرئيسية
  if (role !== "service_requester") {
    groups.push({
      label: "الرئيسية",
      items: [{ icon: LayoutDashboard, label: "لوحة التحكم", path: "/dashboard" }],
    });
  }

  // إدارة المستخدمين والأدوار تمت نقلها إلى مركز الإعدادات (/settings)
  // تم حذفها من القائمة الجانبية بناءً على طلب المستخدم

  // المساجد والطلبات
  if (["super_admin", "system_admin", "projects_office"].includes(role)) {
    groups.push({
      label: "المساجد والطلبات",
      items: [
        { icon: Building2, label: "المساجد", path: "/mosques" },
        { icon: MapPin, label: "خريطة المساجد", path: "/mosques/map" },
        { icon: FileText, label: "الطلبات", path: "/requests" },
        { icon: Clock, label: "تقويم المواعيد", path: "/field-visits/calendar" },
        { icon: ClipboardList, label: "المشاريع", path: "/projects" },
        { icon: CheckSquare, label: "حسابات طالبي الخدمة", path: "/requester-approvals" },
      ],
    });
    groups.push({
      label: "المالية والعقود",
      items: [
        { icon: Truck, label: "الموردون", path: "/suppliers" },
        { icon: Receipt, label: "عروض الأسعار", path: "/quotations" },
        { icon: CheckSquare, label: "الاعتماد المالي", path: "/financial-approval" },
        { icon: FileText, label: "العقود", path: "/contracts" },
        { icon: Banknote, label: "طلبات الصرف", path: "/disbursements" },
        { icon: FileText, label: "أوامر الصرف", path: "/disbursement-orders" },
        { icon: TrendingUp, label: "تقارير الإنجاز", path: "/progress-reports" },
        { icon: BarChart3, label: "التقرير المالي", path: "/financial-report" },
      ],
    });
  }

  // الفريق الميداني
  if (role === "field_team") {
    groups.push({
      label: "الميدان",
      items: [
        { icon: MapPin, label: "الزيارات الميدانية", path: "/field-visits" },
        { icon: Clock, label: "تقويم المواعيد", path: "/field-visits/calendar" },
        { icon: FileText, label: "طلباتي", path: "/my-requests" },
      ],
    });
  }

  // الاستجابة السريعة
  if (role === "quick_response") {
    groups.push({
      label: "الطلبات",
      items: [{ icon: FileText, label: "الطلبات", path: "/requests" }],
    });
  }

  // الإدارة المالية
  if (role === "financial") {
    groups.push({
      label: "المالية والعقود",
      items: [
        { icon: Truck, label: "الموردون", path: "/suppliers" },
        { icon: Receipt, label: "عروض الأسعار", path: "/quotations" },
        { icon: CheckSquare, label: "الاعتماد المالي", path: "/financial-approval" },
        { icon: Banknote, label: "طلبات الصرف", path: "/disbursements" },
        { icon: FileText, label: "أوامر الصرف", path: "/disbursement-orders" },
        { icon: BarChart3, label: "التقرير المالي", path: "/financial-report" },
      ],
    });
  }

  // مدير المشروع
  if (role === "project_manager") {
    groups.push({
      label: "المشاريع",
      items: [
        { icon: ClipboardList, label: "المشاريع", path: "/projects" },
        { icon: FileText, label: "التقارير", path: "/reports" },
      ],
    });
  }

  // الاتصال المؤسسي
  if (role === "corporate_comm") {
    groups.push({
      label: "الاتصال المؤسسي",
      items: [
        { icon: Handshake, label: "الشركاء", path: "/partners" },
        { icon: Palette, label: "الهوية البصرية", path: "/branding" },
        { icon: BarChart3, label: "التقارير", path: "/reports" },
      ],
    });
  }

  // إدارة المستخدمين (للمدراء)
  if (["super_admin", "system_admin"].includes(role)) {
    groups.push({
      label: "إدارة الكادر",
      items: [
        { icon: Users, label: "إدارة الكادر", path: "/staff" },
      ],
    });
  }
  // الإعدادات (للمدراء) - مركز إعدادات موحد
  if (["super_admin", "system_admin"].includes(role)) {
    groups.push({
      label: "الإعدادات",
      items: [
        { icon: Settings, label: "مركز الإعدادات", path: "/settings" },
        { icon: Layers, label: "البرامج والخدمات", path: "/program-customization" },
      ],
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
      window.location.pathname.startsWith("/mosques/");
      
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
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const menuGroups = getMenuGroups(user?.role || "");
  const menuItems = getMenuItems(user?.role || "");
  const activeMenuItem = menuItems.find(item => item.path === location);
  const isMobile = useIsMobile();
  const { theme, toggleTheme, switchable } = useTheme();
  // جلب الشعار من قاعدة البيانات
  const { data: orgSettings } = trpc.organization.getSettings.useQuery();
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
                {!isCollapsed && menuGroups.length > 1 && (
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
                  <Avatar className="h-9 w-9 border border-sidebar-border shrink-0">
                    <AvatarFallback className="text-xs font-medium bg-sidebar-primary/20 text-sidebar-primary">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none text-sidebar-foreground">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-sidebar-foreground/50 truncate mt-1">
                      {ROLE_LABELS[user?.role || ""] || user?.role}
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
                  <span>الملف الشخصي</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/notifications")} className="cursor-pointer">
                  <Bell className="ml-2 h-4 w-4" />
                  <span>الإشعارات</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
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
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="ml-2 h-4 w-4" />
                  <span>تسجيل الخروج</span>
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
