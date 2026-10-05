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
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function OrdersAndLettersReview() {
  useDocumentTitle("أوامر الشراء والخطاب المجتمعي");

  const routeParams = useParams<{ requestId?: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const isSuperAdmin =
    user?.role === "super_admin" ||
    user?.role === "system_admin" ||
    user?.role === "admin";

  const isFinancialOfficer =
    isSuperAdmin ||
    user?.role === "financial" ||
    user?.role === "financial_manager" ||
    user?.role === "accountant" ||
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
    if (tab === "csr_letters" || tab === "csr") return "csr_letters";
    if (tab === "disbursement_orders" || tab === "disbursements" || tab === "disbursement") return "disbursement_orders";
    return "purchase_orders";
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

  // اعتماد أمر الصرف
  const approveOrderMutation = trpc.disbursements.approveOrder.useMutation({
    onSuccess: (res) => {
      toast.success(res.message || "تم اعتماد أمر الصرف بنجاح");
      refetchDisbursements();
      utils.disbursements.listOrders.invalidate();
      utils.procurement.listPurchaseOrders.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء اعتماد أمر الصرف");
    },
  });

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

        return {
          ...r,
          parsedProgramData: pData,
          purchaseOrdersCount: purchaseOrders.length,
          csrLettersCount: csrLetters.length,
          hasPurchaseOrderAllocation,
          hasCsrLetterAllocation,
          mosqueDisplayName: getMosqueDisplayName(r),
        };
      });
  }, [requestsData]);

  // إحصائيات سريعة للطلبات (3 بطاقات)
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

  // شارات حالة أمر الصرف
  const getDisbursementStatusInfo = (status: string) => {
    switch (status) {
      case "pending":
      case "draft":
      case "edited":
        return {
          label: "بانتظار الاعتماد المالي",
          className: "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
        };
      case "pending_executive":
        return {
          label: "معتمد مالياً • بانتظار المدير التنفيذي",
          className: "bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
        };
      case "approved":
        return {
          label: "معتمد نهائياً • جاهز للصرف",
          className: "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
        };
      case "executed":
        return {
          label: "منفّذ (تم التحويل البنكي)",
          className: "bg-teal-50 text-teal-800 border-teal-300 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800",
        };
      case "rejected":
        return {
          label: "مرفوض",
          className: "bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
        };
      default:
        return {
          label: status || "غير محدد",
          className: "bg-muted text-muted-foreground border-border",
        };
    }
  };

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
                  <TabsList className="bg-muted/70 p-1 rounded-lg border border-border/80 h-auto grid grid-cols-3 gap-1.5 w-full sm:w-auto sm:inline-grid">
                    {/* تبويب أوامر الشراء */}
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

                    {/* تبويب الخطاب المجتمعي */}
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

                    {/* تبويب أوامر الصرف */}
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
                <div className="bg-card rounded-xl border border-border/80 shadow-2xs p-4 sm:p-5 space-y-5">
                  {/* شريط الإجراءات والترويسة لأوامر الصرف - بدون أي زر لإنشاء أمر صرف مباشر */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 border border-amber-200 dark:border-amber-900/60">
                        <Coins className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-foreground">
                          أوامر الصرف المرتبطة بالطلب #{selectedRequestId}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          متابعة حالة أوامر الصرف الناتجة عن أوامر الشراء المعتمدة لهذا الطلب واعتمادها كمسؤول مالي
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="text-xs font-bold px-3 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                      >
                        {linkedDisbursementOrders.length} {linkedDisbursementOrders.length === 1 ? "أمر صرف مرتبط" : "أوامر صرف مرتبطة"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => refetchDisbursements()}
                        className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground font-medium"
                        title="تحديث أوامر الصرف"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isDisbLoading ? "animate-spin" : ""}`} />
                        <span>تحديث</span>
                      </Button>
                    </div>
                  </div>

                  {/* محتوى أوامر الصرف */}
                  {isDisbLoading ? (
                    <div className="py-12 text-center space-y-2">
                      <RefreshCw className="w-6 h-6 mx-auto animate-spin text-primary" />
                      <p className="text-xs text-muted-foreground">جاري تحميل أوامر الصرف المرتبطة بالطلب...</p>
                    </div>
                  ) : linkedDisbursementOrders.length === 0 ? (
                    <div className="py-12 text-center space-y-3 bg-muted/20 rounded-xl border border-dashed border-border/80 p-6">
                      <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-900/60">
                        <Coins className="w-6 h-6" />
                      </div>
                      <div className="space-y-1.5">
                        <h4 className="text-sm font-bold text-foreground">لا توجد أوامر صرف منشأة لهذا الطلب بعد</h4>
                        <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                          يتم إنشاء أوامر الصرف حصراً بتحويل أمر شراء معتمد بالضغط على زر «تحويل لأمر صرف» من تبويب أوامر الشراء.
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-2 pt-2">
                        {activeSelectedRequest?.hasPurchaseOrderAllocation && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTabChange("purchase_orders")}
                            className="text-xs font-bold gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>الذهاب لتبويب أوامر الشراء</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {linkedDisbursementOrders.map((order: any) => {
                        const statusInfo = getDisbursementStatusInfo(order.status);
                        const canFinancialApprove =
                          isFinancialOfficer &&
                          (order.status === "pending" || order.status === "draft" || order.status === "edited");
                        const canExecutiveApprove =
                          isExecutiveDirector && order.status === "pending_executive";

                        // تحديد مراحل مسار المتابعة
                        const isStep1Done = true; // إنشاء أمر الصرف
                        const isStep2Done =
                          order.status !== "pending" &&
                          order.status !== "draft" &&
                          order.status !== "edited";
                        const isStep2Active = !isStep2Done;

                        const isStep3Done =
                          order.status === "approved" || order.status === "executed";
                        const isStep3Active = order.status === "pending_executive";

                        const isStep4Done = order.status === "executed";
                        const isStep4Active = order.status === "approved";

                        return (
                          <div
                            key={order.id}
                            className="bg-card rounded-xl border border-border/80 shadow-2xs hover:shadow-xs transition-shadow p-4 sm:p-5 space-y-4"
                          >
                            {/* بطاقة أمر الصرف - الرأس والبيانات الأساسية */}
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-border/60 pb-3.5">
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge className="font-mono text-xs px-2.5 py-1 bg-amber-600 hover:bg-amber-600 text-white font-bold">
                                    {order.orderNumber}
                                  </Badge>

                                  {order.purchaseOrderNumber && (
                                    <Badge
                                      variant="outline"
                                      className="font-mono text-xs px-2 py-0.5 bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 font-bold"
                                    >
                                      أمر الشراء: {order.purchaseOrderNumber}
                                    </Badge>
                                  )}

                                  <Badge
                                    variant="outline"
                                    className={`text-xs font-bold px-2.5 py-0.5 ${statusInfo.className}`}
                                  >
                                    {statusInfo.label}
                                  </Badge>
                                </div>

                                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap pt-0.5">
                                  <span>
                                    المستفيد: <strong className="text-foreground">{order.beneficiaryName || "—"}</strong>
                                  </span>
                                  {order.beneficiaryBank && (
                                    <span>
                                      البنك: <strong className="text-foreground">{order.beneficiaryBank}</strong>
                                    </span>
                                  )}
                                  {order.beneficiaryIban && (
                                    <span className="font-mono text-[11px] text-muted-foreground" dir="ltr">
                                      {order.beneficiaryIban}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 shrink-0 bg-muted/40 sm:bg-transparent p-2.5 sm:p-0 rounded-lg">
                                <span className="text-[11px] text-muted-foreground">المبلغ الإجمالي</span>
                                <span className="text-base sm:text-lg font-black text-foreground font-mono">
                                  {Number(order.amount).toLocaleString("ar-SA")} ر.س
                                </span>
                              </div>
                            </div>

                            {/* مسار متابعة حالة أمر الصرف (4 مراحل مفصلة) */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-foreground flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-primary" />
                                  <span>مسار دورة الاعتماد والمتابعة</span>
                                </span>
                                <span className="text-muted-foreground text-[11px]">
                                  تاريخ الإنشاء: {formatDate(order.createdAt)}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1">
                                {/* المرحلة 1: إنشاء أمر الصرف */}
                                <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 rounded-lg p-2.5 text-xs space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-emerald-800 dark:text-emerald-300">1. التحويل والإنشاء</span>
                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                  </div>
                                  <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400">
                                    تم التحويل من أمر الشراء بنجاح
                                  </p>
                                  <span className="text-[10px] text-emerald-600/70 block">
                                    {formatDate(order.createdAt)}
                                  </span>
                                </div>

                                {/* المرحلة 2: الاعتماد المالي */}
                                <div
                                  className={`rounded-lg p-2.5 text-xs space-y-1 border ${
                                    isStep2Done
                                      ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60"
                                      : isStep2Active
                                      ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800"
                                      : "bg-muted/40 border-border/60 text-muted-foreground"
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span
                                      className={`font-bold ${
                                        isStep2Done
                                          ? "text-emerald-800 dark:text-emerald-300"
                                          : isStep2Active
                                          ? "text-amber-800 dark:text-amber-300"
                                          : "text-muted-foreground"
                                      }`}
                                    >
                                      2. الاعتماد المالي
                                    </span>
                                    {isStep2Done ? (
                                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                    ) : (
                                      <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                      </span>
                                    )}
                                  </div>
                                  <p
                                    className={`text-[11px] ${
                                      isStep2Done
                                        ? "text-emerald-700/80 dark:text-emerald-400"
                                        : isStep2Active
                                        ? "text-amber-700 dark:text-amber-400 font-medium"
                                        : "text-muted-foreground"
                                    }`}
                                  >
                                    {isStep2Done
                                      ? "تم التدقيق والاعتماد المالي"
                                      : "بانتظار اعتماد المسؤول المالي"}
                                  </p>
                                  {order.financialApprovedAt && (
                                    <span className="text-[10px] text-emerald-600/70 block">
                                      {formatDate(order.financialApprovedAt)}
                                    </span>
                                  )}
                                </div>

                                {/* المرحلة 3: اعتماد المدير التنفيذي */}
                                <div
                                  className={`rounded-lg p-2.5 text-xs space-y-1 border ${
                                    isStep3Done
                                      ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60"
                                      : isStep3Active
                                      ? "bg-sky-50 dark:bg-sky-950/30 border-sky-300 dark:border-sky-800"
                                      : "bg-muted/40 border-border/60 text-muted-foreground"
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span
                                      className={`font-bold ${
                                        isStep3Done
                                          ? "text-emerald-800 dark:text-emerald-300"
                                          : isStep3Active
                                          ? "text-sky-800 dark:text-sky-300"
                                          : "text-muted-foreground"
                                      }`}
                                    >
                                      3. اعتماد المدير التنفيذي
                                    </span>
                                    {isStep3Done ? (
                                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                    ) : isStep3Active ? (
                                      <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                                      </span>
                                    ) : (
                                      <Clock className="w-3 h-3 text-muted-foreground/60" />
                                    )}
                                  </div>
                                  <p
                                    className={`text-[11px] ${
                                      isStep3Done
                                        ? "text-emerald-700/80 dark:text-emerald-400"
                                        : isStep3Active
                                        ? "text-sky-700 dark:text-sky-400 font-medium"
                                        : "text-muted-foreground"
                                    }`}
                                  >
                                    {isStep3Done
                                      ? "معتمد من الإدارة التنفيذية"
                                      : isStep3Active
                                      ? "بانتظار اعتماد المدير التنفيذي"
                                      : "مجدولة بعد الاعتماد المالي"}
                                  </p>
                                  {order.approvedAt && (
                                    <span className="text-[10px] text-emerald-600/70 block">
                                      {formatDate(order.approvedAt)}
                                    </span>
                                  )}
                                </div>

                                {/* المرحلة 4: الصرف والتحويل البنكي */}
                                <div
                                  className={`rounded-lg p-2.5 text-xs space-y-1 border ${
                                    isStep4Done
                                      ? "bg-teal-50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-900/60"
                                      : isStep4Active
                                      ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60"
                                      : "bg-muted/40 border-border/60 text-muted-foreground"
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span
                                      className={`font-bold ${
                                        isStep4Done
                                          ? "text-teal-800 dark:text-teal-300"
                                          : isStep4Active
                                          ? "text-emerald-800 dark:text-emerald-300"
                                          : "text-muted-foreground"
                                      }`}
                                    >
                                      4. التحويل البنكي
                                    </span>
                                    {isStep4Done ? (
                                      <CheckCircle className="w-3.5 h-3.5 text-teal-600" />
                                    ) : (
                                      <Clock className="w-3 h-3 text-muted-foreground/60" />
                                    )}
                                  </div>
                                  <p
                                    className={`text-[11px] ${
                                      isStep4Done
                                        ? "text-teal-700/80 dark:text-teal-400 font-medium"
                                        : isStep4Active
                                        ? "text-emerald-700/80 dark:text-emerald-400 font-medium"
                                        : "text-muted-foreground"
                                    }`}
                                  >
                                    {isStep4Done
                                      ? "منفّذ (تم التحويل البنكي)"
                                      : isStep4Active
                                      ? "جاهز للتحويل البنكي والصرف"
                                      : "قيد الانتظار"}
                                  </p>
                                  {order.executedAt && (
                                    <span className="text-[10px] text-teal-600/70 block">
                                      {formatDate(order.executedAt)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* شريط الإجراءات والاعتماد */}
                            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-border/60">
                              <div className="flex items-center gap-2 flex-wrap">
                                {/* زر الاعتماد المالي كمسؤول مالي */}
                                {canFinancialApprove && (
                                  <Button
                                    size="sm"
                                    disabled={approveOrderMutation.isPending}
                                    onClick={() => approveOrderMutation.mutate({ id: order.id })}
                                    className="h-8 text-xs px-3 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs transition-transform active:scale-95"
                                    title="اعتماد أمر الصرف كمسؤول مالي"
                                  >
                                    {approveOrderMutation.isPending ? (
                                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <CheckCircle className="w-3.5 h-3.5" />
                                    )}
                                    <span>اعتماد كمسؤول مالي</span>
                                  </Button>
                                )}

                                {/* زر اعتماد المدير التنفيذي */}
                                {canExecutiveApprove && (
                                  <Button
                                    size="sm"
                                    disabled={approveOrderMutation.isPending}
                                    onClick={() => approveOrderMutation.mutate({ id: order.id })}
                                    className="h-8 text-xs px-3 gap-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-xs transition-transform active:scale-95"
                                    title="اعتماد أمر الصرف كمدير تنفيذي"
                                  >
                                    {approveOrderMutation.isPending ? (
                                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <CheckCircle className="w-3.5 h-3.5" />
                                    )}
                                    <span>اعتماد كمدير تنفيذي</span>
                                  </Button>
                                )}

                                {order.status === "approved" && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-800 border-emerald-300 font-bold"
                                  >
                                    تم اعتماد أمر الصرف نهائياً وجاهز للتحويل
                                  </Badge>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <a
                                  href={`/disbursement-orders/${order.id}/print`}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                                    title="طباعة أمر الصرف"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                    <span>طباعة أمر الصرف</span>
                                  </Button>
                                </a>

                                <a
                                  href={`/disbursement-orders/${order.id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                                    title="عرض التفاصيل الكاملة"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span>التفاصيل</span>
                                  </Button>
                                </a>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
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
                      طلبات برنامج سدانة
                    </h1>
                    <Badge
                      variant="outline"
                      className="text-xs font-bold px-2.5 py-0.5 border-primary/30 text-primary bg-primary/5"
                    >
                      أوامر الشراء والصرف والخطاب المجتمعي
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    طلبات سدانة في مرحلة التشغيل والتنفيذ لإدارة أوامر الشراء وأوامر الصرف والخطابات المجتمعية
                  </p>
                </div>
              </div>
            </div>

            {/* بطاقات الإحصائيات الـ 3 */}
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
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
