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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PurchaseOrdersView } from "./PurchaseOrdersList";
import { CsrLettersView } from "./CsrLettersList";
import { DisbursementOrdersView } from "./DisbursementOrders";
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
  Coins,
  CheckCircle,
  Printer,
  ExternalLink,
  Plus,
  Lock,
  Clock,
} from "lucide-react";
import { useDocumentTitle } from "@/contexts/DocumentTitleContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePermission } from "@/hooks/usePermission";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function OrdersAndLettersReview() {
  useDocumentTitle("مالية سدانة");

  const routeParams = useParams<{ requestId?: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const isSuperAdmin =
    user?.role === "super_admin" ||
    user?.role === "system_admin" ||
    (user?.role as string | undefined) === "admin";

  // الصلاحيات الدقيقة الثلاث لقسم مالية سدانة
  const canDisbursementOrders =
    isSuperAdmin ||
    usePermission("orders_and_letters.disbursement_orders") ||
    usePermission("orders_and_letters.view") ||
    usePermission("orders_and_letters");

  const canCsrLetters =
    isSuperAdmin ||
    usePermission("orders_and_letters.csr_letters") ||
    usePermission("orders_and_letters.view") ||
    usePermission("orders_and_letters");

  const canPurchaseOrders =
    isSuperAdmin ||
    usePermission("orders_and_letters.purchase_orders") ||
    usePermission("orders_and_letters.view") ||
    usePermission("orders_and_letters");

  const hasAnyFinancialPermission =
    isSuperAdmin ||
    canDisbursementOrders ||
    canCsrLetters ||
    canPurchaseOrders;

  const isFinancialOfficer =
    isSuperAdmin ||
    user?.role === "financial" ||
    (user?.role as string | undefined) === "financial_manager" ||
    (user?.role as string | undefined) === "accountant" ||
    user?.email?.toLowerCase().trim() === "solayani@manarah.org.sa" ||
    (user as any)?.customRole?.nameAr?.includes("مالي") ||
    (user as any)?.customRole?.name?.toLowerCase().includes("financial");

  const isExecutiveDirector =
    isSuperAdmin ||
    user?.role === "general_manager" ||
    user?.role === "executive_director" ||
    user?.email?.toLowerCase().trim() === "ceo@manarah.org.sa" ||
    (user as any)?.customRole?.nameAr?.includes("تنفيذي") ||
    (user as any)?.customRole?.name?.toLowerCase().includes("executive");

  // قراءة المعاملات من الرابط (Query Parameters)
  const getUrlParams = () => {
    return new URLSearchParams(window.location.search);
  };

  const initialTab = () => {
    const tab = getUrlParams().get("tab");
    if ((tab === "csr_letters" || tab === "csr") && canCsrLetters) return "csr_letters";
    if ((tab === "disbursement_orders" || tab === "disbursements" || tab === "disbursement") && canDisbursementOrders) return "disbursement_orders";
    if (tab === "purchase_orders" && canPurchaseOrders) return "purchase_orders";

    if (canDisbursementOrders) return "disbursement_orders";
    if (canCsrLetters) return "csr_letters";
    if (canPurchaseOrders) return "purchase_orders";
    return "disbursement_orders";
  };

  const initialReqId = routeParams.requestId || getUrlParams().get("requestId") || "";

  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [selectedRequestId, setSelectedRequestId] = useState<string>(initialReqId);
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
      } else if (tab === "disbursement_orders" || tab === "disbursements") {
        setActiveTab("disbursement_orders");
      } else {
        setActiveTab("purchase_orders");
      }
      if (reqId) {
        setSelectedRequestId(reqId);
      } else if (!routeParams.requestId) {
        setSelectedRequestId("");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [routeParams.requestId, canCsrLetters, canDisbursementOrders, canPurchaseOrders]);

  // التحقق التلقائي من توافق التبويب النشط مع صلاحيات المستخدم
  useEffect(() => {
    if (activeTab === "disbursement_orders" && !canDisbursementOrders) {
      if (canCsrLetters) setActiveTab("csr_letters");
      else if (canPurchaseOrders) setActiveTab("purchase_orders");
    } else if (activeTab === "csr_letters" && !canCsrLetters) {
      if (canDisbursementOrders) setActiveTab("disbursement_orders");
      else if (canPurchaseOrders) setActiveTab("purchase_orders");
    } else if (activeTab === "purchase_orders" && !canPurchaseOrders) {
      if (canDisbursementOrders) setActiveTab("disbursement_orders");
      else if (canCsrLetters) setActiveTab("csr_letters");
    }
  }, [activeTab, canDisbursementOrders, canCsrLetters, canPurchaseOrders]);

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
    updateUrl(activeTab, id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleClearSelection = () => {
    setSelectedRequestId("");
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

  // جلب أوامر الصرف المرتبطة بالطلب المحدد
  const {
    data: disbursementOrdersData,
    isLoading: isDisbLoading,
    refetch: refetchDisbursements,
  } = trpc.disbursements.listOrders.useQuery(
    {
      requestId: selectedRequestId ? parseInt(selectedRequestId) : undefined,
      limit: 100,
    },
    { enabled: !!selectedRequestId && !isNaN(parseInt(selectedRequestId)) }
  );

  const linkedDisbursementOrders = useMemo(() => {
    return disbursementOrdersData?.orders || [];
  }, [disbursementOrdersData]);

  // جلب إحصائيات أعداد أوامر الصرف المجمعة لكافة الطلبات
  const { data: disbursementCountsData } =
    trpc.disbursements.getDisbursementCountsByRequest.useQuery();

  const disbursementCounts = useMemo(() => {
    return disbursementCountsData || {};
  }, [disbursementCountsData]);



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

  // قائمة طلبات سدانة المجهزة: حصر الظهور حصراً في مرحلة "التشغيل والتنفيذ"
  const processedSedanaRequests = useMemo(() => {
    const rawList = requestsData?.requests || [];
    return rawList
      .filter((r: any) => {
        // شرط أساسي: لا يظهر الطلب إلا لما يكون في مرحلة "التشغيل والتنفيذ" (أو المراحل اللاحقة لها كالتسليم والإغلاق)
        const allowedExecutionStages = ["execution", "handover", "closed"];
        if (!allowedExecutionStages.includes(r.currentStage)) {
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
        const sedanaProc = pData?.sedanaProcurement;
        const itemsAlloc = sedanaProc?.itemsAllocation || {};
        const suppliersAlloc = sedanaProc?.suppliersAllocation || {};

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

        // فحص تخصيص أمر الشراء
        const hasPurchaseOrderAllocation = Boolean(
          purchaseOrders.length > 0 ||
          Boolean(sedanaProc?.activePurchaseOrder?.items?.length) ||
          Object.values(suppliersAlloc).some((m: any) => m === "purchase_order" || m?.method === "purchase_order") ||
          Object.values(itemsAlloc).some((m: any) => m === "purchase_order")
        );

        // فحص تخصيص المسؤولية المجتمعية
        const hasCsrLetterAllocation = Boolean(
          csrLetters.length > 0 ||
          Boolean(sedanaProc?.activeCsrLetter?.items?.length) ||
          Object.values(suppliersAlloc).some((m: any) => m === "csr_letter" || m?.method === "csr_letter") ||
          Object.values(itemsAlloc).some((m: any) => m === "csr_letter")
        );

        const disbursementOrdersCount = Number(disbursementCounts[r.id] || 0);

        return {
          ...r,
          parsedProgramData: pData,
          purchaseOrdersCount: purchaseOrders.length,
          csrLettersCount: csrLetters.length,
          disbursementOrdersCount,
          hasPurchaseOrderAllocation,
          hasCsrLetterAllocation,
          mosqueDisplayName: getMosqueDisplayName(r),
        };
      });
  }, [requestsData, disbursementCounts]);

  // إحصائيات سريعة للطلبات (4 بطاقات)
  const sedanaStats = useMemo(() => {
    const total = processedSedanaRequests.length;
    const withPOs = processedSedanaRequests.filter((r) => r.purchaseOrdersCount > 0).length;
    const withCSRs = processedSedanaRequests.filter((r) => r.csrLettersCount > 0).length;
    const withDOs = processedSedanaRequests.filter((r) => r.disbursementOrdersCount > 0).length;
    return { total, withPOs, withCSRs, withDOs };
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

      // فلترة بوجود أوامر شراء أو خطابات أو أوامر صرف
      if (contentFilter === "with_po" && req.purchaseOrdersCount === 0) return false;
      if (contentFilter === "with_csr" && req.csrLettersCount === 0) return false;
      if (contentFilter === "with_do" && req.disbursementOrdersCount === 0) return false;
      if (
        contentFilter === "has_either" &&
        req.purchaseOrdersCount === 0 &&
        req.csrLettersCount === 0 &&
        req.disbursementOrdersCount === 0
      ) {
        return false;
      }

      return true;
    });
  }, [processedSedanaRequests, searchQuery, contentFilter]);

  // تفاصيل الطلب المحدد حالياً مع فحص تخصيص نوع التوريد
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
      const itemsAlloc = sedanaProc?.itemsAllocation || {};
      const suppliersAlloc = sedanaProc?.suppliersAllocation || {};

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

      const hasPurchaseOrderAllocation = Boolean(
        purchaseOrders.length > 0 ||
        Boolean(sedanaProc?.activePurchaseOrder?.items?.length) ||
        Object.values(suppliersAlloc).some((m: any) => m === "purchase_order" || m?.method === "purchase_order") ||
        Object.values(itemsAlloc).some((m: any) => m === "purchase_order")
      );

      const hasCsrLetterAllocation = Boolean(
        csrLetters.length > 0 ||
        Boolean(sedanaProc?.activeCsrLetter?.items?.length) ||
        Object.values(suppliersAlloc).some((m: any) => m === "csr_letter" || m?.method === "csr_letter") ||
        Object.values(itemsAlloc).some((m: any) => m === "csr_letter")
      );

      return {
        ...r,
        parsedProgramData: pData,
        purchaseOrdersCount: purchaseOrders.length,
        csrLettersCount: csrLetters.length,
        hasPurchaseOrderAllocation,
        hasCsrLetterAllocation,
        mosqueDisplayName: getMosqueDisplayName(r),
      };
    }
    return null;
  }, [selectedRequestId, processedSedanaRequests, singleRequestData]);

  // توجيه التبويب التلقائي إذا كان التبويب المختار حالياً مغلقاً لعدم وجود تخصيص
  useEffect(() => {
    if (activeSelectedRequest) {
      if (activeTab === "csr_letters" && !activeSelectedRequest.hasCsrLetterAllocation) {
        if (activeSelectedRequest.hasPurchaseOrderAllocation) {
          setActiveTab("purchase_orders");
          updateUrl("purchase_orders", selectedRequestId);
        } else {
          setActiveTab("disbursement_orders");
          updateUrl("disbursement_orders", selectedRequestId);
        }
      } else if (activeTab === "purchase_orders" && !activeSelectedRequest.hasPurchaseOrderAllocation) {
        if (activeSelectedRequest.hasCsrLetterAllocation) {
          setActiveTab("csr_letters");
          updateUrl("csr_letters", selectedRequestId);
        } else {
          setActiveTab("disbursement_orders");
          updateUrl("disbursement_orders", selectedRequestId);
        }
      }
    }
  }, [activeSelectedRequest, activeTab, selectedRequestId]);

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



  if (!hasAnyFinancialPermission) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center" dir="rtl">
          <Card className="max-w-md mx-auto p-8 space-y-3">
            <Lock className="w-10 h-10 text-muted-foreground mx-auto" />
            <h2 className="text-base font-bold text-foreground">لا تملك صلاحية الوصول إلى مالية سدانة</h2>
            <p className="text-xs text-muted-foreground">
              يرجى مراجعة مسؤول النظام لمنحك إحدى صلاحيات مالية سدانة (أوامر الصرف، الخطاب المجتمعي، أوامر الشراء).
            </p>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const visibleTabsCount = (canPurchaseOrders ? 1 : 0) + (canCsrLetters ? 1 : 0) + (canDisbursementOrders ? 1 : 0);

  return (
    <DashboardLayout>
      <div className="space-y-5 text-right font-sans" dir="rtl">
        {/* الحالة 1: تم اختيار طلب معين -> عرض شريط الطلب المبسط والأنيق + تبويبات أوامر الشراء والخطابات وأوامر الصرف */}
        {selectedRequestId ? (
          <div className="space-y-5">
            {/* قسم رأس الطلب المحدد المبسط */}
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
                    <Badge
                      variant="outline"
                      className="text-xs px-2 py-0.5 bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 font-bold"
                    >
                      التشغيل والتنفيذ
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground font-medium"
                    onClick={handleClearSelection}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>تغيير الطلب</span>
                  </Button>
                </div>
              </div>

              {/* تبويبات التنقل العلوية الـ 3 الخاصة بالطلب مع إغلاق التبويب غير المخصص */}
              <div className="pt-2 border-t border-border/60">
                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                  <TabsList className={`bg-muted/70 p-1 rounded-lg border border-border/80 h-auto grid gap-1.5 w-full sm:w-auto sm:inline-grid ${
                    visibleTabsCount === 3 ? "grid-cols-3" : visibleTabsCount === 2 ? "grid-cols-2" : "grid-cols-1"
                  }`}>
                    {/* تبويب أوامر الصرف */}
                    {canDisbursementOrders && (
                      <TabsTrigger
                        value="disbursement_orders"
                        className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs font-bold text-xs sm:text-sm px-4 py-1.5 gap-2 rounded-md transition-all"
                      >
                        <Coins className="w-4 h-4 text-amber-600" />
                        <span>أوامر الصرف</span>
                        {linkedDisbursementOrders.length > 0 && (
                          <Badge
                            variant="secondary"
                            className="text-[11px] px-1.5 py-0 h-4 bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 mr-1"
                          >
                            {linkedDisbursementOrders.length}
                          </Badge>
                        )}
                      </TabsTrigger>
                    )}

                    {/* تبويب الخطاب المجتمعي */}
                    {canCsrLetters && (
                      <TabsTrigger
                        value="csr_letters"
                        disabled={!activeSelectedRequest?.hasCsrLetterAllocation}
                        className={`font-bold text-xs sm:text-sm px-4 py-1.5 gap-2 rounded-md transition-all ${
                          !activeSelectedRequest?.hasCsrLetterAllocation
                            ? "opacity-40 cursor-not-allowed text-muted-foreground hover:text-muted-foreground"
                            : "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
                        }`}
                      >
                        <HeartHandshake className="w-4 h-4 text-emerald-600" />
                        <span>الخطاب المجتمعي</span>
                        {!activeSelectedRequest?.hasCsrLetterAllocation ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 h-4 border-dashed text-muted-foreground gap-1 inline-flex items-center"
                          >
                            <Lock className="w-2.5 h-2.5" />
                            <span>مغلق</span>
                          </Badge>
                        ) : activeSelectedRequest?.csrLettersCount > 0 ? (
                          <Badge
                            variant="secondary"
                            className="text-[11px] px-1.5 py-0 h-4 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 mr-1"
                          >
                            {activeSelectedRequest.csrLettersCount}
                          </Badge>
                        ) : null}
                      </TabsTrigger>
                    )}

                    {/* تبويب أوامر الشراء */}
                    {canPurchaseOrders && (
                      <TabsTrigger
                        value="purchase_orders"
                        disabled={!activeSelectedRequest?.hasPurchaseOrderAllocation}
                        className={`font-bold text-xs sm:text-sm px-4 py-1.5 gap-2 rounded-md transition-all ${
                          !activeSelectedRequest?.hasPurchaseOrderAllocation
                            ? "opacity-40 cursor-not-allowed text-muted-foreground hover:text-muted-foreground"
                            : "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
                        }`}
                      >
                        <ShoppingCart className="w-4 h-4 text-sky-600" />
                        <span>أوامر الشراء</span>
                        {!activeSelectedRequest?.hasPurchaseOrderAllocation ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 h-4 border-dashed text-muted-foreground gap-1 inline-flex items-center"
                          >
                            <Lock className="w-2.5 h-2.5" />
                            <span>مغلق</span>
                          </Badge>
                        ) : activeSelectedRequest?.purchaseOrdersCount > 0 ? (
                          <Badge
                            variant="secondary"
                            className="text-[11px] px-1.5 py-0 h-4 bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-200 mr-1"
                          >
                            {activeSelectedRequest.purchaseOrdersCount}
                          </Badge>
                        ) : null}
                      </TabsTrigger>
                    )}
                  </TabsList>
                </Tabs>
              </div>
            </div>

            {/* محتوى الشاشة بناءً على التبويب المختار */}
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              {/* محتوى أوامر الشراء */}
              <TabsContent value="purchase_orders" className="space-y-5 mt-0 focus-visible:outline-none">
                {activeSelectedRequest && !activeSelectedRequest.hasPurchaseOrderAllocation ? (
                  <div className="bg-card rounded-xl border border-dashed border-border/80 p-8 text-center space-y-3 shadow-2xs">
                    <div className="w-12 h-12 rounded-full bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
                      <Lock className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-foreground">تبويب أوامر الشراء مغلق لهذا الطلب</h3>
                      <p className="text-xs text-muted-foreground max-w-md mx-auto">
                        لا يوجد مورد أو بنود مخصصة للتوريد عبر (أمر شراء) في مرحلة اعتماد التوريد لهذا الطلب.
                      </p>
                    </div>
                    {activeSelectedRequest.hasCsrLetterAllocation && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTabChange("csr_letters")}
                        className="text-xs font-bold gap-1.5 mt-2"
                      >
                        <HeartHandshake className="w-3.5 h-3.5" />
                        <span>الانتقال للخطاب المجتمعي</span>
                      </Button>
                    )}
                  </div>
                ) : (
                  <PurchaseOrdersView
                    requestId={parseInt(selectedRequestId)}
                    isEmbedded={true}
                  />
                )}
              </TabsContent>

              {/* محتوى الخطاب المجتمعي */}
              <TabsContent value="csr_letters" className="space-y-5 mt-0 focus-visible:outline-none">
                {activeSelectedRequest && !activeSelectedRequest.hasCsrLetterAllocation ? (
                  <div className="bg-card rounded-xl border border-dashed border-border/80 p-8 text-center space-y-3 shadow-2xs">
                    <div className="w-12 h-12 rounded-full bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
                      <Lock className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-foreground">تبويب الخطاب المجتمعي مغلق لهذا الطلب</h3>
                      <p className="text-xs text-muted-foreground max-w-md mx-auto">
                        لا يوجد مورد أو بنود مخصصة للتوريد عبر (المسؤولية المجتمعية) في مرحلة اعتماد التوريد لهذا الطلب.
                      </p>
                    </div>
                    {activeSelectedRequest.hasPurchaseOrderAllocation && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTabChange("purchase_orders")}
                        className="text-xs font-bold gap-1.5 mt-2"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>الانتقال لأوامر الشراء</span>
                      </Button>
                    )}
                  </div>
                ) : (
                  <CsrLettersView
                    requestId={parseInt(selectedRequestId)}
                    isEmbedded={true}
                  />
                )}
              </TabsContent>

              {/* تبويب أوامر الصرف المرتبطة بالطلب واعتمادها كمسؤول مالي */}
              <TabsContent value="disbursement_orders" className="space-y-5 mt-0 focus-visible:outline-none">
                <DisbursementOrdersView
                  requestId={parseInt(selectedRequestId)}
                  isEmbedded={true}
                />
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          /* الحالة الأساسية: تظهر طلبات سدانة أولاً كصفوف متباعدة ومرتبة (حصراً بمرحلة التشغيل والتنفيذ) */
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
                      مالية سدانة
                    </h1>
                    <Badge
                      variant="outline"
                      className="text-xs font-bold px-2.5 py-0.5 border-primary/30 text-primary bg-primary/5"
                    >
                      أوامر الصرف والخطاب المجتمعي وأوامر الشراء
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    إدارة ومراجعة المعاملات المالية لبرنامج سدانة (أوامر الصرف، خطابات المسؤولية المجتمعية، وأوامر الشراء)
                  </p>
                </div>
              </div>
            </div>

            {/* بطاقات الإحصائيات الـ 3 */}
            {/* بطاقات الإحصائيات السريعة */}
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="border border-border/80 shadow-2xs hover:shadow-xs transition-shadow">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground">طلبات التشغيل والتنفيذ</p>
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

              <Card className="border border-border/80 shadow-2xs hover:shadow-xs transition-shadow">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground">تتضمن أوامر صرف</p>
                    <p className="text-xl sm:text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
                      {sedanaStats.withDOs}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-50 dark:bg-amber-950/40 text-amber-600 border border-amber-200 dark:border-amber-900/60">
                    <Coins className="w-5 h-5" />
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
                <Select value={contentFilter} onValueChange={setContentFilter}>
                  <SelectTrigger className="h-9 w-[160px] text-xs bg-background">
                    <SelectValue placeholder="المحتوى" />
                  </SelectTrigger>
                  <SelectContent align="end" dir="rtl">
                    <SelectItem value="all">كافة الطلبات</SelectItem>
                    <SelectItem value="with_po">تحتوي أوامر شراء</SelectItem>
                    <SelectItem value="with_csr">تحتوي خطابات مجتمعية</SelectItem>
                    <SelectItem value="with_do">تحتوي أوامر صرف</SelectItem>
                    <SelectItem value="has_either">تحتوي أوامر أو خطابات</SelectItem>
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
                <h3 className="text-base font-bold text-foreground">لا توجد طلبات في مرحلة التشغيل والتنفيذ</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  تظهر هنا حصراً طلبات برنامج سدانة التي بلغت مرحلة التشغيل والتنفيذ لإدارة أوامر الشراء والخطابات والصرف.
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

                      {/* اليسار: أوامر الشراء + الخطابات المجتمعية + زر اختيار الطلب */}
                      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 flex-wrap sm:flex-nowrap justify-between sm:justify-end border-t sm:border-t-0 pt-2.5 sm:pt-0 border-border/50">
                        {/* أوامر الشراء */}
                        <div
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                            !req.hasPurchaseOrderAllocation
                              ? "bg-muted/20 text-muted-foreground border-border/40 opacity-70"
                              : req.purchaseOrdersCount > 0
                              ? "bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-900/60"
                              : "bg-muted/30 text-muted-foreground border-border/50"
                          }`}
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>
                            {!req.hasPurchaseOrderAllocation
                              ? "غير مخصص أمر شراء"
                              : req.purchaseOrdersCount > 0
                              ? `${req.purchaseOrdersCount} أمر شراء`
                              : "0 أوامر"}
                          </span>
                        </div>

                        {/* الخطابات المجتمعية */}
                        <div
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                            !req.hasCsrLetterAllocation
                              ? "bg-muted/20 text-muted-foreground border-border/40 opacity-70"
                              : req.csrLettersCount > 0
                              ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60"
                              : "bg-muted/30 text-muted-foreground border-border/50"
                          }`}
                        >
                          <HeartHandshake className="w-3.5 h-3.5" />
                          <span>
                            {!req.hasCsrLetterAllocation
                              ? "غير مخصص خطاب مجتمعي"
                              : req.csrLettersCount > 0
                              ? `${req.csrLettersCount} خطاب مجتمعي`
                              : "0 خطابات"}
                          </span>
                        </div>

                        {/* أوامر الصرف */}
                        <div
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                            req.disbursementOrdersCount > 0
                              ? "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/60"
                              : "bg-muted/30 text-muted-foreground border-border/50"
                          }`}
                        >
                          <Coins className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span>
                            {req.disbursementOrdersCount > 0
                              ? `${req.disbursementOrdersCount} ${req.disbursementOrdersCount === 1 ? "أمر صرف" : "أوامر صرف"}`
                              : "0 أوامر صرف"}
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
