import React, { useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { useUserPermissions } from "@/hooks/usePermission";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Settings as SettingsIcon,
  Building2,
  Palette,
  GitBranch,
  Tag,
  Users,
  ChevronLeft,
  BarChart3,
  Wrench,
  Layers,
  ArrowRight,
  Bell,
  SlidersHorizontal,
  ShieldAlert,
  Clock,
  Send,
} from "lucide-react";

interface SettingCard {
  icon: React.ElementType;
  title: string;
  description: string;
  path: string;
  color: string;
  bgColor: string;
  group: string;
  permission?: string;
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
    permission: "settings_org.view",
  },
  {
    icon: Palette,
    title: "الهوية البصرية",
    description: "الشعار والألوان والخطوط وعناصر التصميم",
    path: "/branding",
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
    group: "الجمعية",
    permission: "settings_branding.view",
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
    permission: "settings_categories.view",
  },
  {
    icon: Layers,
    title: "البرامج والخدمات",
    description: "إدارة برامج الجمعية وأنواع الخدمات المقدمة",
    path: "/program-customization",
    color: "text-cyan-600",
    bgColor: "bg-cyan-50 dark:bg-cyan-950/30",
    group: "البيانات",
    permission: "services.view",
  },
  {
    icon: SlidersHorizontal,
    title: "تخصيص النماذج",
    description: "إدارة وتخصيص نماذج الإدخال والحقول والاستمارات",
    path: "/forms-customization",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    group: "البيانات",
    permission: "forms_customization",
  },
  {
    icon: Clock,
    title: "تعيين وقت التأخير ومدد المراحل",
    description: "تحديد وضبط المدد الزمنية لمراحل الطلبات ومهلة قبول المستفيدين لحساب وقت التأخير",
    path: "/forms-customization/escalation?from=/escalation",
    color: "text-rose-600",
    bgColor: "bg-rose-50 dark:bg-rose-950/30",
    group: "العمليات",
    permission: "settings_escalation.view",
  },
  // مجموعة: المستخدمون
  {
    icon: Bell,
    title: "تخصيص الإشعارات",
    description: "تعديل إعدادات الإشعارات وقوالب الرسائل التلقائية للنظام",
    path: "/notifications/customization",
    color: "text-indigo-600",
    bgColor: "bg-indigo-50 dark:bg-indigo-950/30",
    group: "المستخدمون",
    permission: "staff_notifications.view",
  },
  {
    icon: Send,
    title: "مركز الإشعارات",
    description: "إرسال إشعارات مباشرة للمستفيدين والموظفين ومتابعة سجلات وحالات الإرسال",
    path: "/notifications/center",
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    group: "المستخدمون",
    permission: "notification_center",
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
  const { user } = useAuth();
  const userPermissions = useUserPermissions();
  const { data: directPerms } = trpc.permissions.getUserPermissions.useQuery(
    { userId: user?.id ?? 0 },
    { enabled: !!user, staleTime: 0 }
  );

  const effectivePermissions = useMemo(() => {
    const set = new Set<string>();
    if (Array.isArray(directPerms)) {
      directPerms.forEach((p: string) => set.add(p));
    } else if (userPermissions && userPermissions.length > 0) {
      userPermissions.forEach((p: string) => set.add(p));
    } else if (Array.isArray((user as any)?.permissions)) {
      (user as any).permissions.forEach((p: string) => set.add(p));
    }
    return Array.from(set);
  }, [user, directPerms, userPermissions]);

  const hasPermission = (perm?: string) => {
    if (!perm) return true;
    if (effectivePermissions.includes("*")) return true;

    if (perm === "settings_org.view") {
      const orgPerms = [
        "settings_org.edit_basic",
        "settings_org.edit_supervision",
        "settings_org.edit_officials",
        "settings_org.signers_view",
        "settings_org.signers_add",
        "settings_org.signers_edit",
        "settings_org.signers_set_default",
        "settings_org.signers_delete",
        "settings_org.edit_banks",
        "settings_org.edit_contracts",
        "settings_org.view"
      ];
      return orgPerms.some(p => effectivePermissions.includes(p));
    }
    if (perm === "settings_branding.view" || perm === "settings_branding.edit") {
      return (
        effectivePermissions.some(p => p.startsWith("settings_branding.")) ||
        effectivePermissions.includes("settings_branding.edit") ||
        effectivePermissions.includes("settings.edit") ||
        effectivePermissions.includes("settings.view")
      );
    }
    if (perm === "settings_categories.view") {
      return (
        effectivePermissions.some(p => p.startsWith("settings_categories.")) ||
        effectivePermissions.includes("settings.view") ||
        effectivePermissions.includes("settings.edit")
      );
    }
    if (perm === "services.view") {
      return effectivePermissions.some(p => p.startsWith("services."));
    }
    if (perm === "forms_customization") {
      return effectivePermissions.some(p => p.startsWith("forms_customization."));
    }
    if (perm === "settings_escalation.view") {
      return (
        effectivePermissions.some(p => p.startsWith("settings_escalation.")) ||
        effectivePermissions.includes("escalation") ||
        effectivePermissions.includes("escalation.view")
      );
    }
    if (perm === "staff_notifications.view" || perm === "staff_notifications.edit") {
      return effectivePermissions.some(p => p.startsWith("staff_notifications."));
    }
    if (perm === "notification_center") {
      return effectivePermissions.some(p => p.startsWith("notification_center."));
    }

    return effectivePermissions.includes(perm);
  };

  const filteredCards = settingCards.filter(card => hasPermission(card.permission));

  const grouped = groupOrder
    .map(group => ({
      group,
      icon: groupIcons[group],
      cards: filteredCards.filter(c => c.group === group),
    }))
    .filter(g => g.cards.length > 0);

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-5xl">
        {/* رأس الصفحة */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" type="button">
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
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
