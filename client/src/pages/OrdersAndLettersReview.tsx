import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
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
import { PurchaseOrdersView } from "./PurchaseOrdersList";
import { CsrLettersView } from "./CsrLettersList";
import {
  ShoppingBag,
  ShoppingCart,
  HeartHandshake,
  Search,
  X,
  Calendar,
  Building2,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Layers,
} from "lucide-react";
import { useDocumentTitle } from "@/contexts/DocumentTitleContext";
import { trpc } from "@/lib/trpc";

export default function OrdersAndLettersReview() {
  useDocumentTitle("أوامر الشراء والخطاب المجتمعي");

  const routeParams = useParams<{ requestId?: string }>();
  const [, setLocation] = useLocation();

  // قراءة المعاملات من الرابط (Query Parameters)
  const getUrlParams = () => {
    return new URLSearchParams(window.location.search);
  };

  const initialTab = () => {
    const tab = getUrlParams().get("tab");
    if (tab === "csr_letters" || tab === "csr") return "csr_letters";
    return "purchase_orders";
  };

  const initialReqId = routeParams.requestId || getUrlParams().get("requestId") || "";

  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [selectedRequestId, setSelectedRequestId] = useState<string>(initialReqId);
  const [showUnfilteredAll, setShowUnfilteredAll] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [contentFilter, setContentFilter] = useState("all");

  // مزامنة حالة الرابط عند التنقل عبر أزرار المتصفح
  useEffect(() => {
    const handlePopState = () => {
      const q = getUrlParams();
      const tab = q.get("tab");
      const reqId = q.get("requestId");
      if (tab === "csr_letters" || tab === "csr") {
        setActiveTab("csr_letters");
      } else {
        setActiveTab("purchase_orders");
      }
      if (reqId) {
        setSelectedRequestId(reqId);
        setShowUnfilteredAll(false);
      } else if (!routeParams.requestId) {
        setSelectedRequestId("");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [routeParams.requestId]);

  // تحديث الرابط عند تغيير التبويب أو الطلب
  const updateUrl = (tab: string, reqId: string) => {
    const newUrl = new URL(window.location.href);
    if (tab) newUrl.searchParams.set("tab", tab);
    if (reqId) {
      newUrl.searchParams.set("requestId", reqId);
    } else {
      newUrl.searchParams.delete("requestId");
    }
    window.history.replaceState({}, "", newUrl.toString());
  };

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    updateUrl(val, selectedRequestId);
  };

  const handleSelectRequest = (id: string) => {
    setSelectedRequestId(id);
    setShowUnfilteredAll(false);
    updateUrl(activeTab, id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleClearSelection = () => {
    setSelectedRequestId("");
    setShowUnfilteredAll(false);
    updateUrl(activeTab, "");
  };

  // جلب طلبات برنامج سدانة
  const { data: requestsData, isLoading: isRequestsLoading } =
    trpc.requests.search.useQuery({
      programType: "sedana",
      limit: 200,
    });

  // جلب تفاصيل الطلب المحدد برقم ID إذا وجد
  const { data: singleRequestData } = trpc.requests.getById.useQuery(
    { id: parseInt(selectedRequestId) },
    { enabled: !!selectedRequestId && !isNaN(parseInt(selectedRequestId)) }
  );

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

  // قائمة طلبات سدانة المجهزة بإحصائيات أوامر الشراء والخطابات
  const processedSedanaRequests = useMemo(() => {
    const rawList = requestsData?.requests || [];
    return rawList
      .filter((r: any) => {
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
        const sedanaProc = pData?.sedanaProcurement;
        const purchaseOrders = Array.isArray(sedanaProc?.purchaseOrders)
          ? sedanaProc.purchaseOrders
          : sedanaProc?.activePurchaseOrder
          ? [sedanaProc.activePurchaseOrder]
          : [];
        const csrLetters = Array.isArray(sedanaProc?.csrLetters)
          ? sedanaProc.csrLetters
          : sedanaProc?.activeCsrLetter
          ? [sedanaProc.activeCsrLetter]
          : [];

        return {
          ...r,
          parsedProgramData: pData,
          purchaseOrdersCount: purchaseOrders.length,
          csrLettersCount: csrLetters.length,
          mosqueDisplayName: getMosqueDisplayName(r),
        };
      });
  }, [requestsData]);

  // إحصائيات سريعة للطلبات (3 بطاقات فقط حسب الطلب)
  const sedanaStats = useMemo(() => {
    const total = processedSedanaRequests.length;
    const withPOs = processedSedanaRequests.filter((r) => r.purchaseOrdersCount > 0).length;
    const withCSRs = processedSedanaRequests.filter((r) => r.csrLettersCount > 0).length;
    return { total, withPOs, withCSRs };
  }, [processedSedanaRequests]);

  // تصفية الطلبات حسب البحث ونوع المحتوى
  const filteredRequests = useMemo(() => {
    return processedSedanaRequests.filter((req) => {
      // فلترة بنص البحث
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const idMatch = String(req.id).includes(query);
        const reqNumMatch = req.requestNumber?.toLowerCase().includes(query);
        const mosqueMatch = req.mosqueDisplayName?.toLowerCase().includes(query);
        const requesterMatch =
          req.requesterName?.toLowerCase().includes(query) ||
          req.requester?.name?.toLowerCase().includes(query);
        const projectMatch = req.projectName?.toLowerCase().includes(query);
        const cityMatch = req.city?.toLowerCase().includes(query);

        if (!idMatch && !reqNumMatch && !mosqueMatch && !requesterMatch && !projectMatch && !cityMatch) {
          return false;
        }
      }

      // فلترة بوجود أوامر شراء أو خطابات
      if (contentFilter === "with_po" && req.purchaseOrdersCount === 0) return false;
      if (contentFilter === "with_csr" && req.csrLettersCount === 0) return false;
      if (contentFilter === "has_either" && req.purchaseOrdersCount === 0 && req.csrLettersCount === 0) {
        return false;
      }

      return true;
    });
  }, [processedSedanaRequests, searchQuery, contentFilter]);

  // تفاصيل الطلب المحدد حالياً
  const activeSelectedRequest = useMemo(() => {
    if (!selectedRequestId) return null;
    const foundInList = processedSedanaRequests.find(
      (r: any) => String(r.id) === String(selectedRequestId)
    );
    if (foundInList) return foundInList;
    if (singleRequestData) {
      const r = (singleRequestData as any).request || singleRequestData;
      let pData: any = r.programData;
      while (typeof pData === "string") {
        try {
          pData = JSON.parse(pData);
        } catch {
          break;
        }
      }
      const sedanaProc = pData?.sedanaProcurement;
      const purchaseOrders = Array.isArray(sedanaProc?.purchaseOrders)
        ? sedanaProc.purchaseOrders
        : sedanaProc?.activePurchaseOrder
        ? [sedanaProc.activePurchaseOrder]
        : [];
      const csrLetters = Array.isArray(sedanaProc?.csrLetters)
        ? sedanaProc.csrLetters
        : sedanaProc?.activeCsrLetter
        ? [sedanaProc.activeCsrLetter]
        : [];

      return {
        ...r,
        parsedProgramData: pData,
        purchaseOrdersCount: purchaseOrders.length,
        csrLettersCount: csrLetters.length,
        mosqueDisplayName: getMosqueDisplayName(r),
      };
    }
    return null;
  }, [selectedRequestId, processedSedanaRequests, singleRequestData]);

  // تنسيق التاريخ
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("ar-SA", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return String(dateStr);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-5 text-right font-sans" dir="rtl">
        {/* الحالة 1: تم اختيار طلب معين -> عرض شريط الطلب المبسط والأنيق + تبويبات أوامر الشراء والخطابات */}
        {selectedRequestId ? (
          <div className="space-y-5">
            {/* قسم رأس الطلب المحدد المبسط (تم تبسيطه وإزالة زر فتح التفاصيل والتكرار) */}
            <div className="bg-card rounded-xl border border-border/80 shadow-2xs p-3.5 sm:p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearSelection}
                    className="gap-1.5 h-8 text-xs font-bold bg-background hover:bg-muted text-foreground shadow-2xs shrink-0"
                  >
                    <ArrowRight className="w-3.5 h-3.5 text-primary" />
                    <span>العودة إلى قائمة طلبات سدانة</span>
                  </Button>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Building2 className="w-4 h-4 text-primary shrink-0" />
                    <h2 className="text-base sm:text-lg font-bold text-foreground">
                      {activeSelectedRequest
                        ? activeSelectedRequest.mosqueDisplayName
                        : `طلب رقم #${selectedRequestId}`}
                    </h2>
                    <Badge
                      variant="secondary"
                      className="font-mono text-xs px-2 py-0.5 bg-primary/10 text-primary border border-primary/20"
                    >
                      {activeSelectedRequest?.requestNumber || `REQ-${selectedRequestId}`}
                    </Badge>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground self-start sm:self-center font-medium"
                  onClick={handleClearSelection}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>تغيير الطلب</span>
                </Button>
              </div>

              {/* تبويبات التنقل العلوية المبسطة والمباشرة */}
              <div className="pt-2 border-t border-border/60">
                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                  <TabsList className="bg-muted/70 p-1 rounded-lg border border-border/80 h-auto grid grid-cols-2 gap-1.5 w-full sm:w-auto sm:inline-grid">
                    <TabsTrigger
                      value="purchase_orders"
                      className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs font-bold text-xs sm:text-sm px-4 py-1.5 gap-2 rounded-md transition-all"
                    >
                      <ShoppingCart className="w-4 h-4 text-sky-600" />
                      <span>أوامر الشراء الخاصة بالطلب</span>
                      {activeSelectedRequest?.purchaseOrdersCount > 0 && (
                        <Badge
                          variant="secondary"
                          className="text-[11px] px-1.5 py-0 h-4 bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-200 mr-1"
                        >
                          {activeSelectedRequest.purchaseOrdersCount}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger
                      value="csr_letters"
                      className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs font-bold text-xs sm:text-sm px-4 py-1.5 gap-2 rounded-md transition-all"
                    >
                      <HeartHandshake className="w-4 h-4 text-emerald-600" />
                      <span>الخطاب المجتمعي الخاص بالطلب</span>
                      {activeSelectedRequest?.csrLettersCount > 0 && (
                        <Badge
                          variant="secondary"
                          className="text-[11px] px-1.5 py-0 h-4 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 mr-1"
                        >
                          {activeSelectedRequest.csrLettersCount}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>

            {/* محتوى الشاشة بناءً على التبويب المختار */}
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsContent value="purchase_orders" className="space-y-5 mt-0 focus-visible:outline-none">
                <PurchaseOrdersView
                  requestId={parseInt(selectedRequestId)}
                  isEmbedded={true}
                />
              </TabsContent>

              <TabsContent value="csr_letters" className="space-y-5 mt-0 focus-visible:outline-none">
                <CsrLettersView
                  requestId={parseInt(selectedRequestId)}
                  isEmbedded={true}
                />
              </TabsContent>
            </Tabs>
          </div>
        ) : showUnfilteredAll ? (
          /* في حال رغب المستخدم باستعراض السجلات العامة بدون تحديد طلب */
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-muted/40 p-3.5 rounded-xl border border-border/80 transition-all shadow-xs">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    وضع استعراض كافة السجلات العامة
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    يتم الآن عرض جميع أوامر الشراء والخطابات دون تقييد بطلب سدانة محدد
                  </p>
                </div>
              </div>
              <Button
                variant="default"
                size="sm"
                className="gap-2 text-xs font-bold"
                onClick={() => setShowUnfilteredAll(false)}
              >
                <ArrowRight className="w-4 h-4" />
                <span>العودة لاختيار طلب سدانة</span>
              </Button>
            </div>

            {/* تبويبات التنقل العامة */}
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <div className="flex justify-between items-center mb-4">
                <TabsList className="bg-muted/70 p-1 rounded-xl border border-border/80 h-auto grid grid-cols-2 gap-1.5">
                  <TabsTrigger
                    value="purchase_orders"
                    className="data-[state=active]:bg-background data-[state=active]:text-foreground font-bold text-xs sm:text-sm px-4 py-2 gap-2"
                  >
                    <ShoppingCart className="w-4 h-4 text-sky-600" />
                    <span>أوامر الشراء (الكل)</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="csr_letters"
                    className="data-[state=active]:bg-background data-[state=active]:text-foreground font-bold text-xs sm:text-sm px-4 py-2 gap-2"
                  >
                    <HeartHandshake className="w-4 h-4 text-emerald-600" />
                    <span>الخطاب المجتمعي (الكل)</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="purchase_orders" className="space-y-5 mt-0 focus-visible:outline-none">
                <PurchaseOrdersView isEmbedded={true} />
              </TabsContent>

              <TabsContent value="csr_letters" className="space-y-5 mt-0 focus-visible:outline-none">
                <CsrLettersView isEmbedded={true} />
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          /* الحالة الأساسية: تظهر طلبات سدانة أولاً كصفوف (rows) متباعدة ومرتبة لاختيار أحدها */
          <div className="space-y-5">
            {/* رأس الصفحة الرئيسي */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/70 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                      طلبات برنامج سدانة
                    </h1>
                    <Badge
                      variant="outline"
                      className="text-xs font-bold px-2.5 py-0.5 border-primary/30 text-primary bg-primary/5"
                    >
                      أوامر الشراء والخطاب المجتمعي
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    اختر طلباً من طلبات سدانة أدناه لاستعراض أوامر الشراء والخطابات المجتمعية الخاصة به
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start md:self-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUnfilteredAll(true)}
                  className="h-8 text-xs gap-1.5 font-medium border-border/80 text-muted-foreground hover:text-foreground"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>عرض السجلات العامة (الكل)</span>
                </Button>
              </div>
            </div>

            {/* بطاقات الإحصائيات الـ 3 (تم حذف بطاقة مرحلة التشغيل والتنفيذ حسب الطلب) */}
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
              <Card className="border border-border/80 shadow-2xs hover:shadow-xs transition-shadow">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground">إجمالي طلبات سدانة</p>
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
                    <p className="text-[11px] font-semibold text-muted-foreground">تتضمن أوامر شراء</p>
                    <p className="text-xl sm:text-2xl font-extrabold text-sky-700 dark:text-sky-300 mt-1">
                      {sedanaStats.withPOs}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-sky-50 dark:bg-sky-950/40 text-sky-600 border border-sky-200 dark:border-sky-900/60">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border/80 shadow-2xs hover:shadow-xs transition-shadow">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground">تتضمن خطابات مجتمعية</p>
                    <p className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                      {sedanaStats.withCSRs}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200 dark:border-emerald-900/60">
                    <HeartHandshake className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* شريط البحث والفلترة */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/80 shadow-2xs">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="بحث برقم الطلب، اسم المسجد، المدينة، المشروع..."
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
                {/* فلترة السجلات */}
                <Select value={contentFilter} onValueChange={setContentFilter}>
                  <SelectTrigger className="h-9 w-[160px] text-xs bg-background">
                    <SelectValue placeholder="المحتوى" />
                  </SelectTrigger>
                  <SelectContent align="end" dir="rtl">
                    <SelectItem value="all">كافة الطلبات</SelectItem>
                    <SelectItem value="with_po">تحتوي أوامر شراء</SelectItem>
                    <SelectItem value="with_csr">تحتوي خطابات مجتمعية</SelectItem>
                    <SelectItem value="has_either">تحتوي أوامر أو خطابات</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* محتوى قائمة طلبات سدانة: عرض الطلبات حصراً كصفوف (Rows) متباعدة بـ Padding مريح وبدون خانة المرحلة */}
            {isRequestsLoading ? (
              <div className="py-16 text-center space-y-3 bg-card rounded-xl border border-border/80 shadow-2xs">
                <RefreshCw className="w-8 h-8 mx-auto animate-spin text-primary" />
                <p className="text-sm font-medium text-foreground">جاري تحميل طلبات برنامج سدانة...</p>
                <p className="text-xs text-muted-foreground">يرجى الانتظار قليلاً</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="py-16 text-center space-y-3 bg-card rounded-xl border border-border/80 shadow-2xs">
                <Building2 className="w-10 h-10 mx-auto text-muted-foreground/60" />
                <h3 className="text-base font-bold text-foreground">لا توجد طلبات مطابقة</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  لم يتم العثور على طلبات سدانة تطابق معايير البحث والفلترة المحددة. جرب تغيير خيارات التصفية.
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

                      {/* اليسار: أوامر الشراء + الخطابات المجتمعية + زر اختيار الطلب (تم حذف خانة المرحلة الحالية تماماً) */}
                      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 flex-wrap sm:flex-nowrap justify-between sm:justify-end border-t sm:border-t-0 pt-2.5 sm:pt-0 border-border/50">
                        {/* أوامر الشراء */}
                        <div
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                            req.purchaseOrdersCount > 0
                              ? "bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-900/60"
                              : "bg-muted/30 text-muted-foreground border-border/50"
                          }`}
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>
                            {req.purchaseOrdersCount > 0
                              ? `${req.purchaseOrdersCount} أمر شراء`
                              : "لا توجد أوامر"}
                          </span>
                        </div>

                        {/* الخطابات المجتمعية */}
                        <div
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                            req.csrLettersCount > 0
                              ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60"
                              : "bg-muted/30 text-muted-foreground border-border/50"
                          }`}
                        >
                          <HeartHandshake className="w-3.5 h-3.5" />
                          <span>
                            {req.csrLettersCount > 0
                              ? `${req.csrLettersCount} خطاب مجتمعي`
                              : "لا توجد خطابات"}
                          </span>
                        </div>

                        {/* زر الاختيار */}
                        <Button
                          size="sm"
                          className="h-8 text-xs px-3.5 gap-1.5 font-bold group-hover:bg-primary group-hover:text-primary-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectRequest(String(req.id));
                          }}
                        >
                          <span>اختيار الطلب</span>
                          <ArrowLeft className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
