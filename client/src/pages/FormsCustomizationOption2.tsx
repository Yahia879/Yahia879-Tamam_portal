import { Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Layers,
  Sparkles,
  Clock,
  CheckCircle2,
  ChevronLeft,
} from "lucide-react";

export default function FormsCustomizationOption2() {
  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-4xl mx-auto py-2">
        {/* رأس الصفحة */}
        <div className="flex items-center gap-4 pb-6 border-b border-border/50">
          <Link href="/forms-customization">
            <Button
              variant="ghost"
              size="icon"
              type="button"
              className="rounded-xl h-11 w-11 hover:bg-muted shrink-0"
            >
              <ArrowRight className="w-5 h-5 text-foreground" />
            </Button>
          </Link>
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/20 shadow-xs">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black text-foreground">
                الخيار الثاني (تخصيص النماذج)
              </h1>
              <Badge variant="secondary" className="bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30 text-xs font-bold px-2.5 py-0.5 rounded-full">
                قيد الإعداد
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm mt-1">
              مساحة مخصصة للنموذج والاستمارة القادمة، بانتظار تزويدنا بالمسميات والتفاصيل المطلوبة
            </p>
          </div>
        </div>

        {/* كارت المحتوى الفارغ الفاخر */}
        <div className="rounded-3xl p-8 sm:p-12 bg-card border-2 border-border/80 shadow-md text-center space-y-6 max-w-2xl mx-auto">
          <div className="w-20 h-20 rounded-3xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mx-auto ring-8 ring-cyan-500/5 shadow-xs">
            <Sparkles className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-foreground">
              هذا القسم مجهز بالكامل وجاهز للبرمجة
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              تم إعداد الربط والمسارات لهذا الخيار. أخبرنا بالاسم الذي تود اعتماده له، وما هي الحقول والإجراءات التي ترغب بتضمينها هنا ليتم تفعيلها فوراً.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 text-right space-y-2 max-w-lg mx-auto">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>جاهز للاستقبال والتطوير:</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              يمكن إضافة أي نوع من الحقول (نصوص، أرقام، تواريخ، ملفات، جداول، اعتمادات) بمجرد تحديد متطلباتك.
            </p>
          </div>

          <div className="pt-2">
            <Link href="/forms-customization">
              <Button
                type="button"
                className="h-11 rounded-2xl font-bold px-6 bg-muted hover:bg-muted/80 text-foreground border border-border"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                العودة لمركز تخصيص النماذج
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
