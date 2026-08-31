import React, { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  DollarSign, 
  Briefcase, 
  HeartHandshake, 
  FileSpreadsheet, 
  Layers, 
  Activity,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";

// استيراد كافة صفحات الإحصائيات والتحليلات بالكامل
import KPIDashboard from "@/pages/KPIDashboard";
import Reports from "@/pages/Reports";
import FinancialReport from "@/pages/FinancialReport";
import FinancialDashboard from "@/pages/FinancialDashboard";
import BoardDashboard from "@/pages/BoardDashboard";
import BeneficiarySatisfaction from "@/pages/BeneficiarySatisfaction";
import PendingReports from "@/pages/PendingReports";
import ProjectReportsHubPage from "@/pages/ProjectReportsHubPage";
import ProgressReports from "@/pages/ProgressReports";

export interface AnalyticsTabItem {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  component: React.ReactNode;
}

export default function AnalyticsHub() {
  const [, setLocation] = useLocation();

  // إدارة حالة التاب النشط بـ React State محلي مع القراءة الأولية من الرابط
  const [activeTabId, setActiveTabId] = useState<string>(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      return searchParams.get("tab") || "kpi";
    } catch {
      return "kpi";
    }
  });

  // مزامنة حالة التاب عند استخدام أزرار التقدم والرجوع في المتصفح
  useEffect(() => {
    const handlePopState = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const tab = searchParams.get("tab") || "kpi";
      setActiveTabId(tab);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // تعريف كافة صفحات الإحصائيات الـ 9 في النظام
  const tabs: AnalyticsTabItem[] = useMemo(() => [
    {
      id: "kpi",
      label: "مؤشرات الأداء العامة (KPI)",
      shortLabel: "مؤشرات الأداء",
      icon: TrendingUp,
      description: "نظرة عامة على مؤشرات الأداء الإجمالية ومعدلات الإنجاز",
      component: <KPIDashboard embedded={true} />
    },
    {
      id: "technical",
      label: "التقارير الإحصائية والفنية",
      shortLabel: "التقارير الفنية",
      icon: BarChart3,
      description: "إحصائيات تفصيلية للطلبات مع خيارات التصفية وتصدير البيانات",
      component: <Reports embedded={true} />
    },
    {
      id: "financial-report",
      label: "التقرير المالي الشامل",
      shortLabel: "التقرير المالي",
      icon: DollarSign,
      description: "المصروفات، أوامر وسندات الصرف والقبض، والتحليلات المالية التراكمية",
      component: <FinancialReport embedded={true} />
    },
    {
      id: "financial-dash",
      label: "لوحة التحكم المالية",
      shortLabel: "اللوحة المالية",
      icon: PieChart,
      description: "متابعة الميزانيات والحركات المالية حسب المشاريع",
      component: <FinancialDashboard embedded={true} />
    },
    {
      id: "board",
      label: "تحليلات الإدارة العليا",
      shortLabel: "تحليلات الإدارة",
      icon: Briefcase,
      description: "التحليلات الاستراتيجية الشاملة للمساجد والعقود والأموال",
      component: <BoardDashboard embedded={true} forceAnalytics={true} />
    },
    {
      id: "beneficiary",
      label: "رضا المستفيدين",
      shortLabel: "رضا المستفيدين",
      icon: HeartHandshake,
      description: "تقييمات المساجد ومعدلات رضا المستفيدين والتغذية الراجعة",
      component: <BeneficiarySatisfaction embedded={true} />
    },
    {
      id: "operations",
      label: "تقارير العمليات والمعاينات",
      shortLabel: "المعاينات والعمليات",
      icon: FileSpreadsheet,
      description: "إحصائيات الزيارات الميدانية، الاستجابة السريعة والتقارير المعلقة",
      component: <PendingReports embedded={true} />
    },
    {
      id: "project-reports",
      label: "مركز تقارير المشاريع",
      shortLabel: "تقارير المشاريع",
      icon: Layers,
      description: "التقارير النصف شهرية والشهرية والربعية للمشاريع",
      component: <ProjectReportsHubPage embedded={true} />
    },
    {
      id: "progress",
      label: "تقارير ونسب الإنجاز",
      shortLabel: "نسب الإنجاز",
      icon: Activity,
      description: "متابعة تقدم المشاريع ونسب الإنجاز الفعلية والمخططة",
      component: <ProgressReports embedded={true} />
    },
  ], []);

  const activeTab = useMemo(() => {
    return tabs.find((t) => t.id === activeTabId) || tabs[0];
  }, [tabs, activeTabId]);

  // التبديل الفوري للتاب وتحديث الرابط
  const handleTabChange = (tabId: string) => {
    setActiveTabId(tabId);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tabId);
      window.history.pushState({}, "", url.toString());
    } catch (e) {
      console.error("Failed to update URL param", e);
    }
  };

  return (
    <DashboardLayout defaultCollapsed={true}>
      <div className="space-y-4 pb-12" dir="rtl">
        {/* ==================== 👑 الهيدر العلوي المحسن RTL بالكامل ==================== */}
        <div className="relative overflow-hidden rounded-2xl bg-card border border-border/80 p-4 sm:p-5 shadow-xs transition-all">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* جهة اليمين: زر الرجوع للرئيسية + العنوان والأيقونة */}
            <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
              {/* زر الرجوع للرئيسية في البداية على اليمين */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation("/dashboard")}
                className="h-9 px-3 text-xs font-bold gap-1.5 rounded-xl border-border/80 hover:bg-muted/80 bg-background shadow-xs text-foreground hover:text-primary transition-colors cursor-pointer shrink-0"
                title="العودة إلى لوحة التحكم الرئيسية"
              >
                <ArrowRight className="w-4 h-4 ml-0.5 text-primary" />
                <span>الرئيسية</span>
              </Button>

              {/* خط فاصل رأسي */}
              <div className="hidden sm:block w-px h-7 bg-border/60 mx-1 shrink-0" />

              {/* أيقونة وعنوان مركز التحليلات */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0 border border-primary/25 shadow-xs">
                  <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-base sm:text-lg font-black text-foreground tracking-tight truncate">
                      مركز الإحصائيات والتحليلات الشامل
                    </h1>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    لوحة موحدة لجميع التحليلات ومؤشرات الأداء والتقارير المالية والفنية
                  </p>
                </div>
              </div>
            </div>

            {/* جهة اليسار: التاب الحالي المحدد */}
            <div className="flex items-center gap-2 self-start md:self-center shrink-0 text-xs font-bold text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-xl border border-border/50">
              <span className="text-[11px] text-muted-foreground font-normal">القسم الحالي:</span>
              <span className="text-primary font-bold">{activeTab.shortLabel}</span>
            </div>
          </div>

          {/* ==================== 📑 شريط التابات العلوي المدمج بكامل عرض الهيدر ==================== */}
          <div className="mt-4 pt-3 border-t border-border/50">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-9 gap-1.5 w-full">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = tab.id === activeTab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabChange(tab.id)}
                    className={`group flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-xs font-bold transition-all duration-200 w-full select-none cursor-pointer text-center ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-xs shadow-primary/25 scale-[1.02]"
                        : "bg-background/90 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/70"
                    }`}
                    title={tab.description}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"}`} />
                    <span className="truncate">{tab.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ==================== 📊 عرض محتوى التاب النشط ==================== */}
        <div key={activeTab.id} className="animate-in fade-in-50 duration-200">
          {activeTab.component}
        </div>
      </div>
    </DashboardLayout>
  );
}
