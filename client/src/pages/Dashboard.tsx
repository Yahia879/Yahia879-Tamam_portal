import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ProgramIcon } from "@/components/ProgramIcon";
import { 
  Building2, 
  FileText, 
  Users, 
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Calendar,
  ArrowUpRight,
  Plus,
  Activity,
  Target,
  Layers,
  BarChart3,
  Settings,
  FolderKanban,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { ROLE_LABELS, PROGRAM_LABELS, STAGE_LABELS, STATUS_LABELS, PROGRAM_COLORS } from "@shared/constants";

export default function Dashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  
  // حماية الصفحة: متاحة فقط للمدير العام ومدير النظام
  const isAdmin = ["super_admin", "system_admin"].includes(user?.role || "");

  useEffect(() => {
    if (!user) return;

    // توجيه طالب الخدمة إلى لوحة تحكمه الخاصة
    if (user.role === "service_requester") {
      navigate("/requester/dashboard");
      return;
    }

    // توجيه أي مستخدم غير إداري إلى صفحته الوظيفية
    if (!isAdmin) {
      // تحديد وجهة مناسبة حسب الدور
      const redirectMap: Record<string, string> = {
        projects_office: "/mosques",
        field_team: "/field-visits",
        quick_response: "/requests",
        financial: "/suppliers",
        financial_manager: "/suppliers",
        project_manager: "/projects",
        corporate_comm: "/profile",
      };
      navigate(redirectMap[user.role] || "/profile");
    }
  }, [user, navigate, isAdmin]);
  
  // جلب الإحصائيات
  const { data: requestStats } = trpc.requests.getStats.useQuery();
  const { data: mosqueStats } = trpc.mosques.getStats.useQuery();
  const { data: pendingUsers } = trpc.auth.getPendingUsers.useQuery(undefined, {
    enabled: ["super_admin", "system_admin", "projects_office"].includes(user?.role || ""),
  });
  const { data: growthStats } = trpc.analytics.getMonthlyGrowth.useQuery(undefined, {
    enabled: ["super_admin", "system_admin", "projects_office"].includes(user?.role || ""),
  });

  // اسم الدور المعروض في الواجهة: يعطي الأولوية للدور المخصص إن وُجد
  const roleLabel = (user as any)?.customRole?.nameAr
    || ROLE_LABELS[user?.role || ""]
    || user?.role;

  // بطاقات الإحصائيات الرئيسية
  const mainStats = [
    {
      title: "إجمالي الطلبات",
      value: requestStats?.total || 0,
      icon: FileText,
      gradient: "from-blue-500 to-blue-600",
      bgLight: "bg-blue-50",
      textColor: "text-blue-600",
      change: growthStats?.totalRequests.percentage,
      trend: growthStats?.totalRequests.percentage >= 0 ? "up" : "down",
    },
    {
      title: "المساجد المسجلة",
      value: mosqueStats?.total || 0,
      icon: Building2,
      gradient: "from-emerald-500 to-emerald-600",
      bgLight: "bg-emerald-50",
      textColor: "text-emerald-600",
      change: growthStats?.registeredMosques.percentage,
      trend: growthStats?.registeredMosques.percentage >= 0 ? "up" : "down",
    },
    {
      title: "قيد التنفيذ",
      value: requestStats?.byStatus?.in_progress || 0,
      icon: Clock,
      gradient: "from-amber-500 to-amber-600",
      bgLight: "bg-amber-50",
      textColor: "text-amber-600",
      change: growthStats?.inProgressRequests.percentage,
      trend: growthStats?.inProgressRequests.percentage >= 0 ? "up" : "down",
    },
    {
      title: "مكتملة",
      value: requestStats?.byStatus?.completed || 0,
      icon: CheckCircle2,
      gradient: "from-green-500 to-green-600",
      bgLight: "bg-green-50",
      textColor: "text-green-600",
      change: growthStats?.completedRequests.percentage,
      trend: growthStats?.completedRequests.percentage >= 0 ? "up" : "down",
    },
  ];

  // روابط سريعة حسب الدور
  const getQuickLinks = () => {
    const links = [];
    
    if (["super_admin", "system_admin"].includes(user?.role || "")) {
      links.push(
        { title: "إدارة المستخدمين", href: "/users", icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
        { title: "إعدادات النظام", href: "/settings", icon: Settings, color: "text-gray-600", bg: "bg-gray-50" },
      );
    }
    
    if (["super_admin", "system_admin", "projects_office"].includes(user?.role || "")) {
      links.push(
        { title: "جميع الطلبات", href: "/requests", icon: FileText, color: "text-blue-600", bg: "bg-blue-50" },
        { title: "المساجد", href: "/mosques", icon: Building2, color: "text-emerald-600", bg: "bg-emerald-50" },
        { title: "المشاريع", href: "/projects", icon: FolderKanban, color: "text-indigo-600", bg: "bg-indigo-50" },
      );
    }
    
    if (user?.role === "field_team") {
      links.push(
        { title: "الزيارات الميدانية", href: "/field-visits", icon: Calendar, color: "text-orange-600", bg: "bg-orange-50" },
        { title: "طلباتي", href: "/my-requests", icon: FileText, color: "text-blue-600", bg: "bg-blue-50" },
      );
    }
    
    if (user?.role === "quick_response") {
      links.push(
        { title: "الطلبات العاجلة", href: "/urgent-requests", icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
        { title: "تقاريري", href: "/my-reports", icon: FileText, color: "text-blue-600", bg: "bg-blue-50" },
      );
    }
    
    if (user?.role === "financial") {
      links.push(
        { title: "التقارير المالية", href: "/financial-reports", icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
        { title: "الدفعات", href: "/payments", icon: FileText, color: "text-blue-600", bg: "bg-blue-50" },
      );
    }

    return links;
  };

  // حساب نسبة الإنجاز الإجمالية
  const completionRate = requestStats?.total 
    ? Math.round(((requestStats?.byStatus?.completed || 0) / requestStats.total) * 100) 
    : 0;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Hero Section - رسالة الترحيب */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 px-6 py-4 text-white">
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.5))]" />
          <div className="relative flex flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-white/60 text-xs">
                <Activity className="w-3.5 h-3.5" />
                <span>لوحة التحكم</span>
              </div>
              <div className="w-px h-4 bg-white/30" />
              <h1 className="text-xl font-bold">
                مرحباً، {user?.name || "المستخدم"}
              </h1>
              <div className="w-px h-4 bg-white/40" />
              <span className="text-white/80 text-sm font-medium bg-white/15 rounded-full px-3 py-0.5 hidden sm:inline">
                {roleLabel}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-white/20 rounded-full px-3 py-1">
              <Target className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">نسبة الإنجاز: {completionRate}%</span>
            </div>
          </div>
        </div>

        {/* بطاقات الإحصائيات */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {mainStats.map((stat, index) => (
            <Card key={index} className="relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                    {typeof stat.change === 'number' && (
                      <div className="flex items-center gap-1">
                        {stat.change >= 0 ? (
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        ) : (
                          <TrendingUp className="w-4 h-4 text-red-500 transform scale-y-[-1]" />
                        )}
                        <span className={`text-sm font-medium ${stat.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {stat.change >= 0 ? '+' : ''}{stat.change}%
                        </span>
                        <span className="text-xs text-muted-foreground">هذا الشهر</span>
                      </div>
                    )}
                  </div>
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg`}>
                    <stat.icon className="w-7 h-7 text-white" />
                  </div>
                </div>
                {/* Decorative element */}
                <div className={`absolute -bottom-4 -left-4 w-24 h-24 rounded-full ${stat.bgLight} opacity-50`} />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* الطلبات حسب البرنامج */}
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-primary" />
                    الطلبات حسب البرنامج
                  </CardTitle>
                  <CardDescription>توزيع الطلبات على البرامج التسعة</CardDescription>
                </div>
                <Link href="/requests">
                  <Button variant="outline" size="sm">
                    عرض الكل
                    <ArrowUpRight className="w-4 h-4 mr-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(requestStats?.byProgram || {}).map(([program, count]) => {
                  const color = PROGRAM_COLORS[program] || '#6B7280';
                  return (
                    <Link key={program} href={`/requests?program=${program}`}>
                      <div 
                        className="group flex items-center gap-4 p-4 rounded-xl border border-border/50 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer"
                        style={{ backgroundColor: `${color}08` }}
                      >
                        <ProgramIcon program={program} size="lg" showBackground />
                        <div className="flex-1">
                          <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {PROGRAM_LABELS[program] || program}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {count as number} طلب
                          </p>
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>

        </div>

        {/* الطلبات حسب المرحلة والحالة */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* حسب المرحلة */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" />
                الطلبات حسب المرحلة
              </CardTitle>
              <CardDescription>توزيع الطلبات على المراحل الـ 11</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(requestStats?.byStage || {}).slice(0, 6).map(([stage, count]) => {
                  const percentage = Math.min(((count as number) / (requestStats?.total || 1)) * 100, 100);
                  return (
                    <div key={stage} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{STAGE_LABELS[stage] || stage}</span>
                        <Badge variant="secondary" className="font-bold">
                          {count as number}
                        </Badge>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })}
                {Object.keys(requestStats?.byStage || {}).length > 6 && (
                  <Link href="/requests">
                    <Button variant="ghost" className="w-full text-primary">
                      عرض جميع المراحل
                      <ArrowUpRight className="w-4 h-4 mr-1" />
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>

          {/* حسب الحالة */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                الطلبات حسب الحالة
              </CardTitle>
              <CardDescription>توزيع الطلبات حسب حالتها الحالية</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(requestStats?.byStatus || {}).map(([status, count]) => {
                  const percentage = Math.min(((count as number) / (requestStats?.total || 1)) * 100, 100);
                  const statusColors: Record<string, string> = {
                    pending: 'bg-yellow-500',
                    approved: 'bg-green-500',
                    in_progress: 'bg-blue-500',
                    completed: 'bg-emerald-500',
                    rejected: 'bg-red-500',
                  };
                  return (
                    <div key={status} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${statusColors[status] || 'bg-gray-400'}`} />
                          <span className="text-sm font-medium text-foreground">{STATUS_LABELS[status] || status}</span>
                        </div>
                        <Badge variant="outline" className="font-bold">
                          {count as number}
                        </Badge>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${statusColors[status] || 'bg-gray-400'}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* المستخدمون قيد الانتظار (للمدراء فقط) */}
        {pendingUsers && pendingUsers.length > 0 && (
          <Card className="border-0 shadow-md border-r-4 border-r-amber-500">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle>مستخدمون بانتظار الاعتماد</CardTitle>
                    <CardDescription>{pendingUsers.length} مستخدم بانتظار المراجعة</CardDescription>
                  </div>
                </div>
                <Link href="/users?status=pending">
                  <Button variant="outline">
                    عرض الكل
                    <ArrowUpRight className="w-4 h-4 mr-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingUsers.slice(0, 6).map((pendingUser) => (
                  <div key={pendingUser.id} className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white font-bold text-lg">
                      {pendingUser.name?.charAt(0) || 'م'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{pendingUser.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{pendingUser.email}</p>
                    </div>
                    <Link href={`/users/${pendingUser.id}`}>
                      <Button size="sm" variant="outline">مراجعة</Button>
                    </Link>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
