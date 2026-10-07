import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Receipt,
  Search,
  X,
  Calendar,
  Building2,
  RefreshCw,
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { useDocumentTitle } from "@/contexts/DocumentTitleContext";
import { trpc } from "@/lib/trpc";

export default function SedanaQuotations() {
  useDocumentTitle("عروض أسعار سدانة");

  const [, navigate] = useLocation();

  // فحص إذا كان هناك requestId في الرابط للتحويل المباشر لصفحة عروض الأسعار
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const reqId = urlParams.get("requestId");
    if (reqId) {
      navigate(`/quotations?requestId=${reqId}&from=sedana-quotations`);
    }
  }, [navigate]);

  const [searchQuery, setSearchQuery] = useState("");
  const [contentFilter, setContentFilter] = useState("all");

  // جلب كافة طلبات النظام
  const { data: requestsData, isLoading: isRequestsLoading } =
    trpc.requests.search.useQuery(
      { limit: 1000 },
      { refetchOnWindowFocus: false }
    );

  // جلب إحصائيات وأعداد عروض الأسعار المجمعة لكل طلب
  const { data: quotationsCountsData } =
    trpc.projects.getQuotationsCountsByRequest.useQuery();

  const quotationsCounts = useMemo(() => {
    return quotationsCountsData || {};
  }, [quotationsCountsData]);

  // دالة مساعدة لتسمية المسجد أو المشروع بدقة
  const getMosqueDisplayName = (request: any) => {
    if (!request) return "غير محدد";

    if (request.isMultiMosque || (request.multiMosques && request.multiMosques.length > 1)) {
      if (request.projectName && typeof request.projectName === "string" && request.projectName.trim()) {
        return `مشروع ${request.projectName.trim()} (عدة مساجد)`;
      }
      if (request.multiMosques && request.multiMosques.length > 0) {
        return `مشروع لعدة مساجد (${request.multiMosques.map((m: any) => m.name).join("، ")})`;
      }
      return "مشروع لعدة مساجد";
    }

    if (typeof request.mosqueName === "string" && request.mosqueName.trim() && request.mosqueName !== "غير محدد") {
      const mName = request.mosqueName.trim();
      return mName.startsWith("مسجد") || mName.startsWith("جامع") ? mName : `مسجد ${mName}`;
    }

    if (request.mosque?.name && typeof request.mosque.name === "string" && request.mosque.name.trim()) {
      const mName = request.mosque.name.trim();
      return mName.startsWith("مسجد") || mName.startsWith("جامع") ? mName : `مسجد ${mName}`;
    }

    if (request.descriptiveName && typeof request.descriptiveName === "string" && request.descriptiveName.trim()) {
      return request.descriptiveName.trim();
    }

    const reqName = request.requesterName || request.requester?.name || request.userName || request.user?.name;
    if (typeof reqName === "string" && reqName.trim()) {
      return `طلب ${reqName.trim()}`;
    }

    return "طلب غير محدد";
  };

  // قائمة طلبات سدانة المجهزة: حصر الظهور حصراً في مرحلة "التقييم المالي واعتماد العرض"
  const processedSedanaRequests = useMemo(() => {
    const rawList = requestsData?.requests || [];
    return rawList
      .filter((r: any) => {
        // حصر الظهور فقط عندما يكون طلب سدانة في مرحلة "التقييم المالي واعتماد العرض"
        if (r.currentStage !== "financial_eval_and_approval") {
          return false;
        }

        let pData: any = r.programData;
        while (typeof pData === "string") {
          try {
            pData = JSON.parse(pData);
          } catch {
            break;
          }
        }
        return (
          r.programType === "sedana" ||
          r.isSedana ||
          pData?.isSedana ||
          pData?.sedanaProcurement ||
          pData?.basketItems
        );
      })
      .map((r: any) => {
        let pData: any = r.programData;
        while (typeof pData === "string") {
          try {
            pData = JSON.parse(pData);
          } catch {
            break;
          }
        }

        const qStat = quotationsCounts[r.id] || { total: 0, hasApproved: false, winningSupplier: undefined };
        const quotationsCount = Number(qStat.total || 0);
        const hasApprovedQuotation = Boolean(qStat.hasApproved);
        const winningSupplier = qStat.winningSupplier;

        return {
          ...r,
          parsedProgramData: pData,
          quotationsCount,
          hasApprovedQuotation,
          winningSupplier,
          mosqueDisplayName: getMosqueDisplayName(r),
        };
      });
  }, [requestsData, quotationsCounts]);

  // إحصائيات سريعة للطلبات (4 بطاقات)
  const sedanaStats = useMemo(() => {
    const total = processedSedanaRequests.length;
    const withQuotations = processedSedanaRequests.filter((r) => r.quotationsCount > 0).length;
    const withApproved = processedSedanaRequests.filter((r) => r.hasApprovedQuotation).length;
    const pendingQuotations = processedSedanaRequests.filter((r) => r.quotationsCount === 0).length;
    return { total, withQuotations, withApproved, pendingQuotations };
  }, [processedSedanaRequests]);

  // تصفية الطلبات حسب البحث ونوع المحتوى
  const filteredRequests = useMemo(() => {
    return processedSedanaRequests.filter((req: any) => {
      // فلترة بالبحث
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const reqNum = (req.requestNumber || "").toLowerCase();
        const idStr = String(req.id);
        const mosque = (req.mosqueDisplayName || "").toLowerCase();
        const city = (req.city || req.mosque?.city || "").toLowerCase();
        const requester = (req.requesterName || "").toLowerCase();
        const winningSup = (req.winningSupplier || "").toLowerCase();

        const match =
          reqNum.includes(query) ||
          idStr.includes(query) ||
          mosque.includes(query) ||
          city.includes(query) ||
          requester.includes(query) ||
          winningSup.includes(query);

        if (!match) {
          return false;
        }
      }

      // فلترة المحتوى
      if (contentFilter === "with_quotations" && req.quotationsCount === 0) return false;
      if (contentFilter === "has_approved" && !req.hasApprovedQuotation) return false;
      if (contentFilter === "pending" && req.quotationsCount > 0) return false;

      return true;
    });
  }, [processedSedanaRequests, searchQuery, contentFilter]);

  const formatDate = (dateValue: any) => {
    if (!dateValue) return "";
    try {
      return new Date(dateValue).toLocaleDateString("ar-SA", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  };

  const handleSelectRequest = (requestId: string) => {
    navigate(`/quotations?requestId=${requestId}&from=sedana-quotations`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" dir="rtl">
        <div className="space-y-5">
          {/* رأس الصفحة الرئيسي */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/70 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                    عروض أسعار سدانة
                  </h1>
                  <Badge
                    variant="outline"
                    className="text-xs font-bold px-2.5 py-0.5 border-primary/30 text-primary bg-primary/5"
                  >
                    التقييم المالي واعتماد العرض
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  طلبات سدانة في مرحلة التقييم المالي واعتماد العرض لإدارة عروض الأسعار والمقارنة والترسية
                </p>
              </div>
            </div>
          </div>

          {/* بطاقات الإحصائيات السريعة */}
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border border-border/80 shadow-2xs hover:shadow-xs transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground">طلبات التقييم المالي</p>
                  <p className="text-xl sm:text-2xl font-extrabold text-foreground mt-1">
                    {sedanaStats.total}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10 text-primary border border-primary/20">
                  <Building2 className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/80 shadow-2xs hover:shadow-xs transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground">تتضمن عروض أسعار</p>
                  <p className="text-xl sm:text-2xl font-extrabold text-sky-700 dark:text-sky-300 mt-1">
                    {sedanaStats.withQuotations}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-sky-50 dark:bg-sky-950/40 text-sky-600 border border-sky-200 dark:border-sky-900/60">
                  <Receipt className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/80 shadow-2xs hover:shadow-xs transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground">عروض أسعار معتمدة</p>
                  <p className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                    {sedanaStats.withApproved}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200 dark:border-emerald-900/60">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/80 shadow-2xs hover:shadow-xs transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground">بانتظار عروض أسعار</p>
                  <p className="text-xl sm:text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
                    {sedanaStats.pendingQuotations}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-50 dark:bg-amber-950/40 text-amber-600 border border-amber-200 dark:border-amber-900/60">
                  <Clock className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* شريط البحث والفلترة */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/80 shadow-2xs">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="بحث برقم الطلب، اسم المسجد، المدينة، المشروع، المورد..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-9 h-9 text-xs sm:text-sm bg-background border-border/80"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Select value={contentFilter} onValueChange={setContentFilter}>
                <SelectTrigger className="h-9 w-[170px] text-xs bg-background">
                  <SelectValue placeholder="حالة العروض" />
                </SelectTrigger>
                <SelectContent align="end" dir="rtl">
                  <SelectItem value="all">كافة الطلبات</SelectItem>
                  <SelectItem value="with_quotations">تحتوي عروض أسعار</SelectItem>
                  <SelectItem value="has_approved">تم اعتماد عرض</SelectItem>
                  <SelectItem value="pending">بانتظار عروض أسعار</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* محتوى قائمة طلبات سدانة كصفوف متباعدة */}
          {isRequestsLoading ? (
            <div className="py-16 text-center space-y-3 bg-card rounded-xl border border-border/80 shadow-2xs">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin text-primary" />
              <p className="text-sm font-medium text-foreground">جاري تحميل طلبات برنامج سدانة...</p>
              <p className="text-xs text-muted-foreground">يرجى الانتظار قليلاً</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="py-16 text-center space-y-3 bg-card rounded-xl border border-border/80 shadow-2xs">
              <Building2 className="w-10 h-10 mx-auto text-muted-foreground/60" />
              <h3 className="text-base font-bold text-foreground">لا توجد طلبات سدانة في مرحلة التقييم المالي واعتماد العرض</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                تظهر هنا حصراً طلبات برنامج سدانة التي بلغت مرحلة التقييم المالي واعتماد العرض لإدارة عروض الأسعار والترسية.
              </p>
              {(searchQuery || contentFilter !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs mt-2"
                  onClick={() => {
                    setSearchQuery("");
                    setContentFilter("all");
                  }}
                >
                  إعادة ضبط الفلاتر
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((req: any) => {
                return (
                  <div
                    key={req.id}
                    onClick={() => handleSelectRequest(String(req.id))}
                    className="group cursor-pointer bg-card hover:bg-muted/20 border border-border/80 hover:border-primary/50 rounded-xl p-4 sm:p-4.5 shadow-2xs hover:shadow-xs transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    {/* اليمين: رقم الطلب + اسم المسجد / المشروع + المدينة وتاريخ الإنشاء ومقدم الطلب */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <Badge
                        variant="secondary"
                        className="font-mono font-bold text-xs px-2.5 py-1 bg-primary/10 text-primary border border-primary/20 shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                      >
                        {req.requestNumber || `REQ-${req.id}`}
                      </Badge>

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-primary shrink-0" />
                          <h3 className="text-sm sm:text-base font-bold text-foreground group-hover:text-primary transition-colors truncate">
                            {req.mosqueDisplayName}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mr-6 flex-wrap">
                          {req.city && <span>{req.city}</span>}
                          {req.city && req.createdAt && <span>•</span>}
                          {req.createdAt && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(req.createdAt)}
                            </span>
                          )}
                          {req.requesterName && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[150px]">مقدم الطلب: {req.requesterName}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* اليسار: عدد عروض الأسعار + حالة الاعتماد + زر اختيار الطلب */}
                    <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 flex-wrap sm:flex-nowrap justify-between sm:justify-end border-t sm:border-t-0 pt-2.5 sm:pt-0 border-border/50">
                      {/* عدد عروض الأسعار */}
                      <div
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                          req.quotationsCount > 0
                            ? "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/60"
                            : "bg-muted/30 text-muted-foreground border-border/50"
                        }`}
                      >
                        <Receipt className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>
                          {req.quotationsCount > 0
                            ? `${req.quotationsCount} ${req.quotationsCount === 1 ? "عرض سعر" : "عروض أسعار"}`
                            : "0 عروض أسعار"}
                        </span>
                      </div>

                      {/* شارة حالة العرض */}
                      {req.hasApprovedQuotation ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>
                            {req.winningSupplier ? `معتمد: ${req.winningSupplier}` : "تم اعتماد العرض"}
                          </span>
                        </div>
                      ) : req.quotationsCount > 0 ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-900/60">
                          <Clock className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                          <span>قيد التقييم المالي</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold bg-muted/30 text-muted-foreground border-border/50">
                          <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>بانتظار تقديم العروض</span>
                        </div>
                      )}

                      {/* زر الاختيار */}
                      <Button
                        size="sm"
                        className="h-8 text-xs px-3.5 gap-1.5 font-bold group-hover:bg-primary group-hover:text-primary-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectRequest(String(req.id));
                        }}
                      >
                        <span>عروض الأسعار</span>
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
