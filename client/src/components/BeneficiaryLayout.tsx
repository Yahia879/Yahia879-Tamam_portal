import React, { useState } from "react";
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
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
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
  Menu,
  X,
  ChevronLeft,
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    <div className="min-h-screen bg-slate-50/60 dark:bg-background text-foreground flex flex-col font-sans dir-rtl print:bg-white print:p-0" dir="rtl">
      {/* Top Header */}
      <header className="print:hidden sticky top-0 z-50 bg-background/85 backdrop-blur-xl border-b border-border/60 shadow-xs transition-all">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Branding Logo & Info with Mobile Hamburger */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              {/* Mobile Hamburger Toggle Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden rounded-xl h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted/80 shrink-0 cursor-pointer"
                aria-label="فتح القائمة الجانبية"
              >
                <Menu className="w-5 h-5" />
              </Button>

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
            </div>

            {/* Desktop Navigation Bar */}
            <nav className="hidden md:flex items-center gap-1.5 bg-muted/60 dark:bg-muted/30 p-1.5 rounded-2xl border border-border/50 dark:border-border/60">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id || location === item.path;

                if (item.isPrimary) {
                  return (
                    <Link key={item.id} href={item.path}>
                      <Button
                        size="sm"
                        className="rounded-xl shadow-xs gradient-primary text-white font-semibold gap-1.5 px-4 h-9 hover:opacity-95 transition-all cursor-pointer"
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
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                        isActive
                          ? "bg-background dark:bg-card text-primary shadow-xs border border-border/80 font-semibold"
                          : "text-muted-foreground hover:text-foreground hover:bg-background/50 dark:hover:bg-muted/40"
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
                  className="rounded-xl h-9 w-9 sm:h-10 sm:w-10 text-muted-foreground hover:text-foreground hover:bg-muted/80 cursor-pointer"
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
                  className="relative rounded-xl h-9 w-9 sm:h-10 sm:w-10 text-muted-foreground hover:text-foreground hover:bg-muted/80 cursor-pointer"
                  title="الإشعارات"
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
                  <button className="flex items-center gap-2.5 hover:bg-muted/70 rounded-2xl p-1 sm:px-2.5 sm:py-1.5 transition-all border border-transparent hover:border-border/60 cursor-pointer">
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

        {/* Mobile Navigation Drawer / Sidebar */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent
            side="right"
            className="w-[85vw] max-w-xs p-0 flex flex-col justify-between bg-card text-card-foreground border-l border-border/80 shadow-2xl z-[100]"
          >
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Drawer Header */}
              <div className="p-4 pl-10 border-b border-border/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={mainLogoSrc}
                    alt={orgName}
                    className="h-8 w-8 object-contain shrink-0"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                  <div className="flex flex-col min-w-0">
                    <SheetTitle className="font-extrabold text-sm text-foreground truncate text-right">{orgName}</SheetTitle>
                    <span className="text-[10px] text-muted-foreground truncate">{orgNameShort}</span>
                  </div>
                </div>
              </div>

              {/* User Profile Card */}
              <div className="px-4 pt-3 pb-2">
                <div className="bg-muted/50 dark:bg-muted/20 p-3 rounded-2xl border border-border/60 flex items-center gap-3">
                  <Avatar className="h-10 w-10 border-2 border-primary/20 shadow-xs shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary font-extrabold text-sm">
                      {user?.name ? user.name.charAt(0).toUpperCase() : "م"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold text-xs sm:text-sm text-foreground truncate">{user?.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{user?.email || (user as any)?.username || "طالب خدمة"}</p>
                  </div>
                </div>
              </div>

              {/* Primary CTA in Drawer */}
              <div className="px-4 py-2">
                <Link href="/request-form-dynamic" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full rounded-xl shadow-md gradient-primary text-white font-bold gap-2 h-10 hover:opacity-95 transition-all cursor-pointer">
                    <Plus className="w-4 h-4" />
                    <span>تقديم طلب جديد</span>
                  </Button>
                </Link>
              </div>

              {/* Navigation Links */}
              <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
                {navItems
                  .filter((item) => !item.isPrimary)
                  .map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id || location === item.path;

                    return (
                      <Link
                        key={item.id}
                        href={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                          isActive
                            ? "bg-primary/10 dark:bg-primary/20 text-primary border border-primary/20 dark:border-primary/30 font-bold"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60 dark:hover:bg-muted/30"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={`w-4 h-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                          <span>{item.label}</span>
                        </div>
                        <ChevronLeft className={`w-3.5 h-3.5 ${isActive ? "text-primary" : "text-muted-foreground/50"}`} />
                      </Link>
                    );
                  })}

                <div className="pt-2 pb-1 border-t border-border/40 my-2">
                  <p className="px-3 text-[10px] font-bold text-muted-foreground mb-1">الحساب والخدمات</p>

                  <Link
                    href="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 dark:hover:bg-muted/30 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span>الملف الشخصي والحساب</span>
                    </div>
                    <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground/50" />
                  </Link>

                  <Link
                    href="/notifications"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 dark:hover:bg-muted/30 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Bell className="w-4 h-4 text-muted-foreground" />
                      <span>الإشعارات</span>
                    </div>
                    {unreadNotificationsCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white">
                        {unreadNotificationsCount}
                      </span>
                    )}
                  </Link>
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-3 border-t border-border/60 bg-muted/30 dark:bg-card/90 flex flex-col gap-2">
              {switchable && toggleTheme && (
                <Button
                  variant="outline"
                  className="w-full rounded-xl justify-between h-9 border-border/60 text-xs font-semibold cursor-pointer"
                  onClick={toggleTheme}
                >
                  <span className="flex items-center gap-2">
                    {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
                    <span>{theme === "dark" ? "الوضع الفاتح" : "الوضع الداكن"}</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground">{theme === "dark" ? "داكن" : "فاتح"}</span>
                </Button>
              )}

              <Button
                variant="ghost"
                className="w-full rounded-xl justify-start text-destructive hover:text-destructive hover:bg-destructive/10 h-9 text-xs font-bold gap-2 cursor-pointer"
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
              >
                <LogOut className="w-4 h-4" />
                <span>تسجيل الخروج</span>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 container mx-auto px-3.5 sm:px-6 py-4 sm:py-8 max-w-7xl print:p-0 print:m-0 print:max-w-none">
        {(title || subtitle || headerActions || backUrl) && (
          <div className="print:hidden flex items-center justify-between gap-2 sm:gap-4 mb-4 sm:mb-8 pb-3 sm:pb-4 border-b border-border/40">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              {backUrl && (
                <Link href={backUrl}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl hover:bg-muted shrink-0 text-foreground cursor-pointer"
                    title={backLabel || "العودة"}
                  >
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                    {backLabel && <span className="sr-only">{backLabel}</span>}
                  </Button>
                </Link>
              )}
              <div className="min-w-0 flex-1">
                {title && <h1 className="text-sm sm:text-2xl font-black text-foreground tracking-tight truncate">{title}</h1>}
                {subtitle && <p className="text-[11px] sm:text-sm text-muted-foreground mt-0.5 hidden sm:block">{subtitle}</p>}
              </div>
            </div>
            {headerActions && <div className="flex items-center gap-2 shrink-0">{headerActions}</div>}
          </div>
        )}
        {children}
      </main>

      {/* Modern Footer */}
      <footer className="print:hidden mt-auto border-t border-border/60 bg-background/50 dark:bg-card/40 py-6 sm:py-8 text-center">
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
