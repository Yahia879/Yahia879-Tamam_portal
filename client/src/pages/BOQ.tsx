import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  FileText,
  Loader2,
  Building2,
  Upload,
  Download,
  ArrowRight,
  ChevronLeft,
  Search,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import BoqTab from "@/components/BoqTab";
import { PROGRAM_LABELS, STATUS_LABELS, getStageLabel } from "@shared/constants";
import { ProgramIcon } from "@/components/ProgramIcon";

const statusConfig: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  pending: {
    color: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
    icon: <Clock className="w-3 h-3" />,
  },
  under_review: {
    color: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
    icon: <Clock className="w-3 h-3" />,
  },
  in_progress: {
    color: "text-blue-700 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800",
    icon: <TrendingUp className="w-3 h-3" />,
  },
  completed: {
    color: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800",
    icon: <CheckCircle className="w-3 h-3" />,
  },
  rejected: {
    color: "text-red-700 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
    icon: <AlertCircle className="w-3 h-3" />,
  },
  cancelled: {
    color: "text-gray-600 dark:text-gray-400",
    bg: "bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-700",
    icon: <AlertCircle className="w-3 h-3" />,
  },
};

export default function BOQ() {
  const [, navigate] = useLocation();
  const params = useParams();
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterProgram, setFilterProgram] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedRequestId, setSelectedRequestId] = useState<string>(params.requestId || "");
  
  // تعيين requestId من URL عند تغيير المسار
  useEffect(() => {
    setSelectedRequestId(params.requestId || "");
  }, [params.requestId]);

  // جلب الطلبات في مرحلة إعداد جداول الكميات
  const { data: requests, isLoading: isLoadingRequests } = trpc.requests.search.useQuery({
    currentStage: "boq_preparation",
  });

  // جلب الطلب المحدد بالتفصيل
  const { data: requestDetails } = trpc.requests.getById.useQuery(
    { id: parseInt(selectedRequestId) || 0 },
    { enabled: !!selectedRequestId }
  );

  // جلب بنود جدول الكميات
  const { data: boqResult, isLoading: isLoadingBOQ, refetch } = trpc.projects.getBOQ.useQuery(
    { requestId: parseInt(selectedRequestId) || 0 },
    { enabled: !!selectedRequestId }
  );
  const boqData = boqResult?.items || [];
  const totalAmount = boqResult?.total || 0;

  // إضافة بند (يستخدم في استيراد CSV)
  const addItemMutation = trpc.projects.addBOQItem.useMutation({
    onSuccess: () => {
      refetch();
      if (selectedRequestId) {
        utils.projects.getBOQ.invalidate({ requestId: parseInt(selectedRequestId) });
      }
    },
  });

  // إنهاء إعداد جدول الكميات والانتقال للمرحلة التالية
  const completeBOQMutation = trpc.requests.updateStage.useMutation({
    onSuccess: () => {
      toast.success("تم إنهاء إعداد جدول الكميات بنجاح");
      navigate(`/requests/${selectedRequestId}`);
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء الانتقال للمرحلة التالية");
    },
  });

  const filteredRequests = requests?.requests?.filter((request: any) => {
    // فلتر البحث
    const matchesSearch = !searchQuery || 
      request.requestNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.mosqueName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // فلتر البرنامج
    const matchesProgram = filterProgram === "all" || request.programType === filterProgram;
    
    // فلتر الحالة
    const matchesStatus = filterStatus === "all" || request.status === filterStatus;
    
    return matchesSearch && matchesProgram && matchesStatus;
  }) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* العنوان */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (selectedRequestId) {
                navigate("/boq-preparations");
              } else {
                window.history.back();
              }
            }}
            type="button"
          >
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">إعداد جداول الكميات (BOQ)</h1>
            <p className="text-muted-foreground">إدارة بنود جداول الكميات للطلبات التي تحتاج إلى تسعير وإسناد</p>
          </div>
        </div>

        {/* عرض تفاصيل الطلب وجدول الكميات الخاص به */}
        {selectedRequestId && requestDetails ? (
          <div className="space-y-6">
            {/* عرض المكون BoqTab */}
            <BoqTab requestId={parseInt(selectedRequestId)} />
            
            {/* زر إنهاء إعداد جدول الكميات والاعتماد */}
            {boqData && boqData.length > 0 && (
              <Card className="border-0 shadow-sm bg-white dark:bg-gray-900">
                <CardContent className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      عدد البنود المضافة: {boqData.length}
                    </p>
                    <p className="text-xl font-bold text-primary mt-1">
                      إجمالي التكلفة التقديرية: {totalAmount.toLocaleString("ar-SA")} ريال
                    </p>
                  </div>
                  <Button
                    size="lg"
                    onClick={() => {
                      completeBOQMutation.mutate({
                        requestId: parseInt(selectedRequestId),
                        newStage: "financial_eval_and_approval",
                        notes: "تم إنهاء إعداد جدول الكميات واعتماده للمرحلة المالية",
                      });
                    }}
                    disabled={completeBOQMutation.isPending}
                    className="w-full sm:w-auto gap-2"
                  >
                    {completeBOQMutation.isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <FileText className="h-5 w-5" />
                    )}
                    اعتماد وإنهاء جدول الكميات
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* الفلاتر والبحث */}
            <Card className="border-0 shadow-sm bg-white dark:bg-gray-900">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                  <div className="sm:col-span-2 relative">
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1">
                      <Search className="w-3 h-3" />
                      البحث عن الطلبات
                    </label>
                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="رقم الطلب أو اسم المسجد..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-10 w-full pr-10"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">البرنامج</label>
                    <Select value={filterProgram} onValueChange={setFilterProgram}>
                      <SelectTrigger className="w-full h-10 text-xs md:text-sm">
                        <SelectValue placeholder="اختر البرنامج" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع البرامج</SelectItem>
                        {Object.entries(PROGRAM_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">الحالة</label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-full h-10 text-xs md:text-sm">
                        <SelectValue placeholder="جميع الحالات" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع الحالات</SelectItem>
                        <SelectItem value="pending">قيد الانتظار</SelectItem>
                        <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                        <SelectItem value="completed">مكتمل</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* قائمة الطلبات مطابقة لعرض /requests */}
            <Card className="border-0 shadow-sm overflow-hidden bg-white dark:bg-gray-900">
              {isLoadingRequests ? (
                <div className="p-12 text-center">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-muted-foreground mt-4 text-sm">جاري تحميل قائمة الطلبات...</p>
                </div>
              ) : filteredRequests.length > 0 ? (
                <div>
                  {/* الرأس لسطح المكتب */}
                  <div className="hidden md:grid grid-cols-[auto_1fr_1fr_1fr_1fr_auto] gap-4 px-4 py-3 bg-muted/40 border-b text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    <div className="w-8"></div>
                    <div>رقم الطلب / البرنامج</div>
                    <div>المسجد</div>
                    <div>المرحلة الحالية</div>
                    <div>الحالة</div>
                    <div className="w-20 text-center">إجراء</div>
                  </div>

                  {/* الأسطر والبطاقات */}
                  <div className="divide-y divide-border">
                    {filteredRequests.map((request: any) => {
                      const status = statusConfig[request.status] || statusConfig.pending;
                      return (
                        <div
                          key={request.id}
                          className="grid grid-cols-1 md:grid-cols-[auto_1fr_1fr_1fr_1fr_auto] gap-3 md:gap-4 px-4 py-4 hover:bg-muted/30 transition-colors items-center cursor-pointer"
                          onClick={() => navigate(`/boq/${request.id}`)}
                        >
                          {/* أيقونة البرنامج لسطح المكتب */}
                          <div className="hidden md:flex w-8 justify-center">
                            <ProgramIcon program={request.programType} size="md" />
                          </div>

                          {/* معلومات الطلب */}
                          <div className="flex items-start justify-between md:block gap-3">
                            <div className="flex items-center gap-3 md:block min-w-0">
                              <div className="md:hidden shrink-0">
                                <ProgramIcon program={request.programType} size="md" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-foreground text-sm">{request.requestNumber}</p>
                                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                  {PROGRAM_LABELS[request.programType as keyof typeof PROGRAM_LABELS] || request.programType}
                                </p>
                              </div>
                            </div>
                            <div className="text-left md:text-right shrink-0">
                              <p className="text-[10px] md:text-xs text-muted-foreground">
                                {new Date(request.createdAt).toLocaleDateString("ar-SA")}
                              </p>
                            </div>
                          </div>

                          {/* المسجد */}
                          <div className="hidden md:flex items-center gap-2 min-w-0">
                            <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="text-sm text-foreground truncate">{request.mosqueName || "—"}</span>
                          </div>

                          {/* المرحلة */}
                          <div className="hidden md:block min-w-0">
                            <Badge variant="outline" className="text-[10px] md:text-xs font-medium py-0 h-auto">
                              {getStageLabel(request.currentStage, request.requestTrack)}
                            </Badge>
                          </div>

                          {/* الحالة */}
                          <div className="hidden md:block shrink-0">
                            <span className={`inline-flex items-center gap-1.5 text-[10px] md:text-xs font-medium px-2.5 py-0.5 rounded-full border ${status.bg} ${status.color}`}>
                              {status.icon}
                              {STATUS_LABELS[request.status as keyof typeof STATUS_LABELS] || request.status}
                            </span>
                          </div>

                          {/* للهواتف المحمولة */}
                          <div className="md:hidden flex flex-col gap-3">
                            <div className="flex items-center gap-1.5 text-xs text-foreground bg-muted/50 p-2 rounded-md">
                              <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <span className="truncate">{request.mosqueName || "—"}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <Badge variant="outline" className="text-[10px] py-0.5">
                                {getStageLabel(request.currentStage, request.requestTrack)}
                              </Badge>
                              <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${status.bg} ${status.color}`}>
                                {status.icon}
                                {STATUS_LABELS[request.status as keyof typeof STATUS_LABELS] || request.status}
                              </span>
                            </div>
                          </div>

                          {/* زر الانتقال لسطح المكتب */}
                          <div className="hidden md:flex justify-center w-20">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-primary">
                              <ChevronLeft className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-foreground font-medium mb-1">لا توجد طلبات</p>
                  <p className="text-muted-foreground text-sm">
                    لا توجد حالياً طلبات في مرحلة إعداد جداول الكميات مطابقة لمعايير التصفية.
                  </p>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
