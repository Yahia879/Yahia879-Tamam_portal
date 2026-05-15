import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  FileText, 
  CheckCircle2, 
  Clock,
  Building2,
  ArrowLeft,
} from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { PROGRAM_LABELS, STAGE_LABELS, STATUS_LABELS } from "@shared/constants";
import { ProgramIcon } from "@/components/ProgramIcon";

// تم استبدال programIcons بمكون ProgramIcon

const stageSteps = [
  { key: "submitted", label: "تقديم الطلب" },
  { key: "initial_review", label: "الفرز الأولي" },
  { key: "field_visit", label: "الزيارة الميدانية" },
  { key: "technical_eval", label: "الدراسة الفنية" },
  { key: "financial_eval", label: "الاعتماد المالي" },
  { key: "execution", label: "التنفيذ" },
  { key: "closed", label: "الإغلاق" },
];

export default function TrackRequest() {
  const [requestNumber, setRequestNumber] = useState("");
  const [searchedNumber, setSearchedNumber] = useState("");

  const { data: request, isLoading, error } = trpc.requests.getByNumber.useQuery(
    { requestNumber: searchedNumber },
    { enabled: !!searchedNumber }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (requestNumber.trim()) {
      setSearchedNumber(requestNumber.trim());
    }
  };

  const currentStageIndex = request ? stageSteps.findIndex(s => s.key === request.currentStage) : -1;

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background" dir="rtl">
      {/* الهيدر */}
      <header className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="container px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <div className="flex items-center gap-2 sm:gap-3 cursor-pointer">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary flex items-center justify-center">
                  <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-base sm:text-lg text-foreground">بوابة تمام</h1>
                  <p className="hidden sm:block text-xs text-muted-foreground">للعناية بالمساجد</p>
                </div>
              </div>
            </Link>
            <Link href="/">
              <Button variant="ghost" size="sm" className="sm:size-default">
                <ArrowLeft className="w-4 h-4 ml-1 sm:ml-2" />
                <span className="text-xs sm:text-sm">العودة للرئيسية</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container px-4 py-8 sm:py-12">
        <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8">
          {/* العنوان */}
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">تتبع طلبك</h1>
            <p className="text-sm sm:text-base text-muted-foreground">أدخل رقم الطلب لمتابعة حالته</p>
          </div>

          {/* نموذج البحث */}
          <Card className="border-0 shadow-lg">
            <CardContent className="p-4 sm:p-6">
              <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    value={requestNumber}
                    onChange={(e) => setRequestNumber(e.target.value)}
                    placeholder="أدخل رقم الطلب (BUN-ABC123)"
                    className="pr-10 sm:pr-12 h-11 sm:h-12 text-base sm:text-lg"
                  />
                </div>
                <Button type="submit" className="gradient-primary text-white h-11 sm:h-12 px-8 font-bold">
                  بحث
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* نتيجة البحث */}
          {isLoading && (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-8 text-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-muted-foreground mt-4">جاري البحث...</p>
              </CardContent>
            </Card>
          )}

          {error && searchedNumber && (
            <Card className="border-0 shadow-lg border-red-200">
              <CardContent className="p-6 sm:p-8 text-center">
                <FileText className="w-10 h-10 sm:w-12 sm:h-12 text-red-400 mx-auto mb-4" />
                <p className="text-red-600 font-medium">الطلب غير موجود</p>
                <p className="text-sm sm:text-base text-muted-foreground mt-2">تأكد من رقم الطلب وحاول مرة أخرى</p>
              </CardContent>
            </Card>
          )}

          {request && (
            <div className="space-y-4 sm:space-y-6">
              {/* معلومات الطلب */}
              <Card className="border-0 shadow-lg overflow-hidden">
                <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <ProgramIcon program={request.programType} size="lg" showBackground />
                      <div>
                        <CardTitle className="text-lg sm:text-xl">{request.requestNumber}</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">{PROGRAM_LABELS[request.programType]}</CardDescription>
                      </div>
                    </div>
                    <span className={`badge self-start sm:self-center text-[10px] sm:text-xs px-2 py-0.5 sm:px-3 sm:py-1 rounded-full font-medium ${
                      request.status === "completed" ? "bg-green-100 text-green-800" :
                      request.status === "rejected" ? "bg-red-100 text-red-800" :
                      request.status === "in_progress" ? "bg-blue-100 text-blue-800" :
                      "bg-yellow-100 text-yellow-800"
                    }`}>
                      {STATUS_LABELS[request.status]}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">المرحلة الحالية</p>
                      <p className="text-sm sm:text-base font-medium">{STAGE_LABELS[request.currentStage]}</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">تاريخ التقديم</p>
                      <p className="text-sm sm:text-base font-medium">{new Date(request.createdAt).toLocaleDateString("ar-SA")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* شريط المراحل */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
                  <CardTitle className="text-lg sm:text-xl">مراحل الطلب</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">تتبع تقدم طلبك عبر المراحل المختلفة</CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <div className="space-y-4 sm:space-y-5">
                    {stageSteps.map((stage, index) => {
                      const isCompleted = index < currentStageIndex;
                      const isCurrent = index === currentStageIndex;
                      return (
                        <div key={stage.key} className="flex items-center gap-3 sm:gap-4">
                          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 text-sm sm:text-base ${
                            isCompleted ? "bg-green-500 text-white" :
                            isCurrent ? "bg-primary text-white shadow-md shadow-primary/20" :
                            "bg-muted text-muted-foreground"
                          }`}>
                            {isCompleted ? (
                              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                            ) : isCurrent ? (
                              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                            ) : (
                              <span className="text-[10px] sm:text-xs">{index + 1}</span>
                            )}
                          </div>
                          <div className={`flex-1 text-sm sm:text-base ${isCurrent ? "font-bold text-primary" : "text-foreground/80"}`}>
                            {stage.label}
                          </div>
                          {isCompleted && (
                            <span className="text-[10px] sm:text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">مكتمل</span>
                          )}
                          {isCurrent && (
                            <span className="text-[10px] sm:text-xs font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-full">جاري</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* معلومات إضافية */}
          {!searchedNumber && (
            <Card className="border-0 shadow-sm bg-primary/5">
              <CardContent className="p-4 sm:p-6">
                <h3 className="font-bold text-sm sm:text-base mb-1 sm:mb-2">كيف أجد رقم الطلب؟</h3>
                <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                  رقم الطلب يتم إرساله إليك عبر البريد الإلكتروني أو الرسائل النصية عند تقديم الطلب.
                  يمكنك أيضاً العثور عليه في لوحة التحكم الخاصة بك إذا كان لديك حساب.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
