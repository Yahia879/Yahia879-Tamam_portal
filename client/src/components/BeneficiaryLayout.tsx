import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Building2,
  FileText,
  Plus,
  Bell,
  User,
  LogOut,
  LayoutDashboard,
  LifeBuoy,
  Sun,
  Moon,
  ArrowRight,
} from "lucide-react";

interface BeneficiaryLayoutProps {
  children: React.ReactNode;
  activeTab?: "dashboard" | "requests" | "mosques" | "new-request" | "support";
  title?: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
  backUrl?: string;
  backLabel?: string;
}

export default function BeneficiaryLayout({
  children,
  activeTab = "dashboard",
  title,
  subtitle,
  headerActions,
  backUrl,
  backLabel,
}: BeneficiaryLayoutProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { theme, toggleTheme, switchable } = useTheme();

  // جلب إعدادات الجمعية (الشعار والاسم)
  const { data: orgSettings } = trpc.organization.getSettings.useQuery();
  // جلب الإشعارات غير المقروءة
  const { data: notificationsData } = trpc.notifications.getMyNotifications.useQuery(
    { limit: 10 },
    { enabled: !!user }
  );

  const mainLogoSrc = orgSettings?.logoUrl || "/logo.svg";
  const orgName = orgSettings?.organizationName || "بوابة منارة";
  const orgNameShort = orgSettings?.organizationNameShort || "للعناية بالمساجد";

  const unreadNotificationsCount =
    notificationsData?.notifications?.filter((n: any) => !n.isRead).length || 0;

  const navItems = [
    {
      id: "dashboard",
      label: "الرئيسية",
      icon: LayoutDashboard,
      path: "/requester",
    },
    {
      id: "requests",
      label: "طلباتي",
      icon: FileText,
      path: "/my-requests",
    },
    {
      id: "mosques",
      label: "مساجدي",
      icon: Building2,
      path: "/my-mosques",
    },
    {
      id: "new-request",
      label: "تقديم طلب جديد",
      icon: Plus,
      path: "/request-form-dynamic",
      isPrimary: true,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-zinc-950 text-foreground flex flex-col font-sans dir-rtl" dir="rtl">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-background/85 backdrop-blur-xl border-b border-border/60 shadow-xs transition-all">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Branding Logo & Info */}
            <Link href="/requester" className="flex items-center gap-2 sm:gap-3 min-w-0">
              <img
                src={mainLogoSrc}
                alt={orgName}
                className="h-8 w-8 sm:h-10 sm:w-auto shrink-0 object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
              <div className="min-w-0 flex flex-col">
                <span className="font-bold text-sm sm:text-lg text-foreground truncate">{orgName}</span>
                <span className="hidden sm:block text-[10px] text-muted-foreground truncate">{orgNameShort}</span>
              </div>
            </Link>

            {/* Desktop Navigation Bar */}
            <nav className="hidden md:flex items-center gap-1.5 bg-muted/60 p-1.5 rounded-2xl border border-border/50">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id || location === item.path;

                if (item.isPrimary) {
                  return (
                    <Link key={item.id} href={item.path}>
                      <Button
                        size="sm"
                        className="rounded-xl shadow-xs gradient-primary text-white font-semibold gap-1.5 px-4 h-9 hover:opacity-95 transition-all"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{item.label}</span>
                      </Button>
                    </Link>
                  );
                }

                return (
                  <Link key={item.id} href={item.path}>
                    <button
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                        isActive
                          ? "bg-background text-primary shadow-xs border border-border/80 font-semibold"
                          : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                      <span>{item.label}</span>
                    </button>
                  </Link>
                );
              })}
            </nav>

            {/* Header Right Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Theme Toggle */}
              {switchable && toggleTheme && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  className="rounded-xl h-9 w-9 sm:h-10 sm:w-10 text-muted-foreground hover:text-foreground hover:bg-muted/80"
                  title={theme === "dark" ? "الوضع الفاتح" : "الوضع الداكن"}
                >
                  {theme === "dark" ? (
                    <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                  ) : (
                    <Moon className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                </Button>
              )}

              {/* Notifications */}
              <Link href="/notifications">
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative rounded-xl h-9 w-9 sm:h-10 sm:w-10 text-muted-foreground hover:text-foreground hover:bg-muted/80"
                >
                  <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-background animate-pulse" />
                  )}
                </Button>
              </Link>

              {/* User Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2.5 hover:bg-muted/70 rounded-2xl p-1 sm:px-2.5 sm:py-1.5 transition-all border border-transparent hover:border-border/60">
                    <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border-2 border-primary/20 shadow-xs">
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs sm:text-sm">
                        {user?.name ? user.name.charAt(0).toUpperCase() : "م"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden lg:flex flex-col text-right min-w-0 max-w-[130px]">
                      <span className="text-xs font-bold text-foreground truncate">{user?.name}</span>
                      <span className="text-[10px] text-muted-foreground truncate">طالب خدمة</span>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 shadow-xl border-border/80">
                  <div className="px-3 py-2 border-b border-border/60 mb-1">
                    <p className="text-sm font-bold text-foreground truncate">{user?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email || (user as any)?.username || ""}</p>
                  </div>
                  <DropdownMenuItem
                    className="rounded-xl cursor-pointer py-2 text-xs font-medium"
                    onClick={() => setLocation("/profile")}
                  >
                    <User className="ml-2.5 h-4 w-4 text-muted-foreground" />
                    <span>الملف الشخصي والحساب</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="rounded-xl cursor-pointer py-2 text-xs font-medium"
                    onClick={() => setLocation("/my-mosques")}
                  >
                    <Building2 className="ml-2.5 h-4 w-4 text-muted-foreground" />
                    <span>مساجدي المسجلة</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="rounded-xl cursor-pointer py-2 text-xs font-medium"
                    onClick={() => setLocation("/my-requests")}
                  >
                    <FileText className="ml-2.5 h-4 w-4 text-muted-foreground" />
                    <span>سجل الطلبات</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem
                    onClick={logout}
                    className="rounded-xl cursor-pointer py-2 text-xs font-medium text-destructive focus:text-destructive focus:bg-destructive/10"
                  >
                    <LogOut className="ml-2.5 h-4 w-4" />
                    <span>تسجيل الخروج</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Toolbar */}
        <div className="md:hidden border-t border-border/60 bg-background/95 backdrop-blur-md px-4 py-2 flex items-center justify-around gap-1 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id || location === item.path;

            if (item.isPrimary) {
              return (
                <Link key={item.id} href={item.path}>
                  <button className="flex flex-col items-center justify-center p-1.5 text-primary font-bold">
                    <div className="w-8 h-8 rounded-full gradient-primary text-white flex items-center justify-center shadow-xs">
                      <Plus className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] mt-1">{item.label}</span>
                  </button>
                </Link>
              );
            }

            return (
              <Link key={item.id} href={item.path}>
                <button
                  className={`flex flex-col items-center justify-center p-1.5 text-[11px] font-medium transition-colors ${
                    isActive ? "text-primary font-bold" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4 mb-0.5" />
                  <span>{item.label}</span>
                </button>
              </Link>
            );
          })}
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-7xl">
        {(title || subtitle || headerActions || backUrl) && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8 pb-4 border-b border-border/40">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {backUrl && (
                <Link href={backUrl}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl hover:bg-muted shrink-0 text-foreground"
                    title={backLabel || "العودة"}
                  >
                    <ArrowRight className="w-5 h-5" />
                    {backLabel && <span className="sr-only">{backLabel}</span>}
                  </Button>
                </Link>
              )}
              <div className="min-w-0 flex-1">
                {title && <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">{title}</h1>}
                {subtitle && <p className="text-xs sm:text-sm text-muted-foreground mt-1">{subtitle}</p>}
              </div>
            </div>
            {headerActions && <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">{headerActions}</div>}
          </div>
        )}
        {children}
      </main>

      {/* Modern Footer */}
      <footer className="mt-auto border-t border-border/60 bg-background/50 py-6 sm:py-8 text-center">
        <div className="container mx-auto px-4">
          <p className="text-xs sm:text-sm text-muted-foreground font-medium">
            {orgName || "بوابة منارة"} - {orgNameShort || "للعناية بالمساجد"}
          </p>
          <p className="text-[11px] text-muted-foreground/70 mt-1">
            جميع الحقوق محفوظة © {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
