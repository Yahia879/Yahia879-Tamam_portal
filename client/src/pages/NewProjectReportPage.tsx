import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { 
  ArrowRight, 
  ArrowLeft,
  Clock, 
  Calendar, 
  BarChart3, 
  MapPin, 
  FileText,
  Sparkles
} from "lucide-react";

export default function NewProjectReportPage() {
  const reportTypes = [
    {
      title: "تقرير نصف شهري",
      key: "semi-monthly",
      badge: "كل أسبوعين (20 حقل)",
      description: "متابعة دورية مستمرة كل أسبوعين لرصد الانحرافات والملاحظات الميدانية السريعة ونسب الإنجاز.",
      href: "/project-reports/semi-monthly",
      icon: Clock,
      colorClass: "bg-amber-500/10 border-amber-500/20 text-amber-600",
      btnClass: "bg-amber-600 hover:bg-amber-700 text-white",
    },
    {
      title: "تقرير شهري",
      key: "monthly",
      badge: "دورية شهرية (23 حقل)",
      description: "تقرير رصد شهري شامل يتضمن المعالم الرئيسية والانحرافات التراكمية وإمكانية تجميع تقارير نصف الشهر.",
      href: "/project-reports/monthly",
      icon: Calendar,
      colorClass: "bg-teal-500/10 border-teal-500/20 text-teal-600",
      btnClass: "bg-teal-600 hover:bg-teal-700 text-white",
    },
    {
      title: "تقرير ربعي",
      key: "quarterly",
      badge: "كل 3 أشهر (25 حقل)",
      description: "تقرير تقييمي ربع سنوي لقياس المواءمة الاستراتيجية والأثر المالي والدروس المستفادة وتوصيات الاستمرار.",
      href: "/project-reports/quarterly",
      icon: BarChart3,
      colorClass: "bg-blue-500/10 border-blue-500/20 text-blue-600",
      btnClass: "bg-blue-600 hover:bg-blue-700 text-white",
    },
    {
      title: "تقرير زيارة ميدانية",
      key: "visit",
      badge: "زيارة ميدانية (8 حقول)",
      description: "رصد ميداني فوري لمعاينة أثر المشروع وتوثيق صور الموقع والملاحظات الفنية والإحالات الإدارية.",
      href: "/project-reports/visit",
      icon: MapPin,
      colorClass: "bg-purple-500/10 border-purple-500/20 text-purple-600",
      btnClass: "bg-purple-600 hover:bg-purple-700 text-white",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-in fade-in duration-300 max-w-5xl mx-auto" dir="rtl">
        {/* Header Block */}
        <div className="flex items-center gap-4 bg-background p-4 rounded-xl border border-border/80 shadow-2xs">
          <Link href="/project-reports">
            <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-lg">
              <ArrowRight className="w-5 h-5 text-foreground" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <FileText className="w-6 h-6 text-teal-600" />
              <span>إنشاء تقرير جديد</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              اختر نوع ونموذج التقرير الذي تريد إعداده للمشروع من القائمة أدناه
            </p>
          </div>
        </div>

        {/* 4 Report Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {reportTypes.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.key} className="border border-border/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${item.colorClass}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold text-foreground">{item.title}</CardTitle>
                        <Badge variant="outline" className="mt-1 text-[11px] font-semibold text-teal-700 bg-teal-50 border-teal-200">
                          {item.badge}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-1 flex-1 flex flex-col justify-between">
                  <p className="text-xs leading-relaxed text-muted-foreground font-medium">
                    {item.description}
                  </p>
                  <Link href={item.href} className="block pt-2">
                    <Button className={`w-full gap-2 font-bold shadow-xs h-10 ${item.btnClass}`}>
                      <span>تعبئة هذا التقرير</span>
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
