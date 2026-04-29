import DashboardLayout from "@/components/DashboardLayout";
import { useLocation } from "wouter";
import {
  Settings as SettingsIcon,
  Building2,
  Palette,
  FileText,
  GitBranch,
  Tag,
  Users,
  ShieldCheck,
  ChevronLeft,
  BarChart3,
  Wrench,
  ClipboardList,
  Layers,
} from "lucide-react";

interface SettingCard {
  icon: React.ElementType;
  title: string;
  description: string;
  path: string;
  color: string;
  bgColor: string;
  group: string;
}

const settingCards: SettingCard[] = [
  // مجموعة: إعدادات الجمعية
  {
    icon: Building2,
    title: "إعدادات الجمعية",
    description: "بيانات الجمعية والمعلومات الأساسية والتواصل",
    path: "/organization-settings",
    color: "text-teal-600",
    bgColor: "bg-teal-50 dark:bg-teal-950/30",
    group: "الجمعية",
  },
  {
    icon: Palette,
    title: "الهوية البصرية",
    description: "الشعار والألوان والخطوط وعناصر التصميم",
    path: "/branding",
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
    group: "الجمعية",
  },
  // مجموعة: إعدادات العمليات
  {
    icon: GitBranch,
    title: "إعدادات المراحل",
    description: "تخصيص مراحل سير العمل ورسائل الإشعارات لكل مرحلة",
    path: "/stage-settings",
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    group: "العمليات",
  },
  {
    icon: Wrench,
    title: "إعدادات الإجراءات",
    description: "ضبط الإجراءات والأتمتة في كل مرحلة من مراحل العمل",
    path: "/action-settings",
    color: "text-orange-600",
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
    group: "العمليات",
  },
  {
    icon: FileText,
    title: "قوالب العقود",
    description: "إنشاء وإدارة قوالب العقود القياسية للمشاريع",
    path: "/contract-templates",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    group: "العمليات",
  },
  // مجموعة: إدارة البيانات
  {
    icon: Tag,
    title: "إدارة التصنيفات",
    description: "تصنيفات الطلبات والأعمال ووحدات جدول الكميات وغيرها",
    path: "/categories",
    color: "text-amber-600",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    group: "البيانات",
  },
  {
    icon: Layers,
    title: "البرامج والخدمات",
    description: "إدارة برامج الجمعية وأنواع الخدمات المقدمة",
    path: "/categories?type=program",
    color: "text-cyan-600",
    bgColor: "bg-cyan-50 dark:bg-cyan-950/30",
    group: "البيانات",
  },
  // مجموعة: المستخدمون والصلاحيات
  {
    icon: Users,
    title: "إدارة المستخدمين",
    description: "إضافة وتعديل وإدارة حسابات موظفي الجمعية",
    path: "/users",
    color: "text-indigo-600",
    bgColor: "bg-indigo-50 dark:bg-indigo-950/30",
    group: "المستخدمون",
  },
  {
    icon: ShieldCheck,
    title: "الأدوار والصلاحيات",
    description: "تعريف الأدوار الوظيفية وتخصيص الصلاحيات لكل دور",
    path: "/roles",
    color: "text-rose-600",
    bgColor: "bg-rose-50 dark:bg-rose-950/30",
    group: "المستخدمون",
  },
  // مجموعة: التقارير والأداء
  {
    icon: BarChart3,
    title: "مؤشرات الأداء",
    description: "لوحة مؤشرات الأداء الرئيسية (KPI) ومتابعة الإنجاز",
    path: "/kpi-dashboard",
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950/30",
    group: "التقارير",
  },
  {
    icon: ClipboardList,
    title: "التقارير",
    description: "التقارير الإدارية والمالية وتقارير الإنجاز",
    path: "/reports",
    color: "text-slate-600",
    bgColor: "bg-slate-50 dark:bg-slate-950/30",
    group: "التقارير",
  },
];

const groupOrder = ["الجمعية", "العمليات", "البيانات", "المستخدمون", "التقارير"];

const groupIcons: Record<string, React.ElementType> = {
  "الجمعية": Building2,
  "العمليات": GitBranch,
  "البيانات": Tag,
  "المستخدمون": Users,
  "التقارير": BarChart3,
};

export default function Settings() {
  const [, navigate] = useLocation();

  const grouped = groupOrder.map(group => ({
    group,
    icon: groupIcons[group],
    cards: settingCards.filter(c => c.group === group),
  }));

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-5xl">
        {/* رأس الصفحة */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <SettingsIcon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">مركز الإعدادات</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              إدارة إعدادات النظام والتخصيصات والصلاحيات
            </p>
          </div>
        </div>

        {/* المجموعات */}
        {grouped.map(({ group, icon: GroupIcon, cards }) => (
          <div key={group} className="space-y-3">
            {/* عنوان المجموعة */}
            <div className="flex items-center gap-2 pb-1 border-b border-border/50">
              <GroupIcon className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {group}
              </h2>
            </div>

            {/* بطاقات المجموعة */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {cards.map((card) => {
                const CardIcon = card.icon;
                return (
                  <button
                    key={card.path}
                    onClick={() => navigate(card.path)}
                    className="group flex items-start gap-4 p-4 rounded-xl border border-border/60 bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200 text-right w-full"
                  >
                    {/* أيقونة */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${card.bgColor} group-hover:scale-110 transition-transform duration-200`}>
                      <CardIcon className={`w-5 h-5 ${card.color}`} />
                    </div>

                    {/* النص */}
                    <div className="flex-1 min-w-0 text-right">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
                          {card.title}
                        </h3>
                        <ChevronLeft className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary group-hover:-translate-x-0.5 transition-all shrink-0" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                        {card.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
