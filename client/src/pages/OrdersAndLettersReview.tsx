import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  CheckCircle2,
  X,
  ChevronDown,
  ChevronUp,
  FileText,
  Calendar,
  Building2,
  Filter,
  Check,
  RefreshCw,
} from "lucide-react";
import { useDocumentTitle } from "@/contexts/DocumentTitleContext";
import { trpc } from "@/lib/trpc";
import { PROGRAM_LABELS, STAGE_LABELS } from "@shared/constants";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [isSelectorExpanded, setIsSelectorExpanded] = useState<boolean>(!initialReqId);

  // مزامنة حالة الرابط عند التنقل عبر المتصفح
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
        setIsSelectorExpanded(false);
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
    if (selectedRequestId === id) {
      // إذا نقر على نفس الطلب المحدد نقوم بإلغاء التحديد
      setSelectedRequestId("");
      setIsSelectorExpanded(true);
      updateUrl(activeTab, "");
    } else {
      setSelectedRequestId(id);
      setIsSelectorExpanded(false);
      updateUrl(activeTab, id);
    }
  };

  const handleClearSelection = () => {
    setSelectedRequestId("");
    setIsSelectorExpanded(true);
    updateUrl(activeTab, "");
  };

  // جلب طلبات برنامج سدانة حصراً للاختيار منها
  const { data: requestsData, isLoading: isRequestsLoading, refetch: refetchRequests } =
    trpc.requests.search.useQuery({
      programType: "sedana",
      limit: 200,
    });

  // جلب تفاصيل الطلب المحدد برقم ID إذا وجد
  const { data: singleRequestData } = trpc.requests.getById.useQuery(
    { id: parseInt(selectedRequestId) },
    { enabled: !!selectedRequestId && !isNaN(parseInt(selectedRequestId)) }
  );

  // دالة مساعدة لتسمية المسجد أو المشروع
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
      return mName.startsWith("مسجد") ? mName : `مسجد ${mName}`;
    }

    if (request.mosque?.name && typeof request.mosque.name === "string" && request.mosque.name.trim()) {
      const mName = request.mosque.name.trim();
      return mName.startsWith("مسجد") ? mName : `مسجد ${mName}`;
    }

    const reqName = request.requesterName || request.requester?.name || request.userName || request.user?.name;
    if (typeof reqName === "string" && reqName.trim()) {
      return `طلب ${reqName.trim()}`;
    }

    return "طلب غير محدد";
  };

  // قائمة طلبات برنامج سدانة المفلترة بالبحث
  const filteredRequests = useMemo(() => {
    const rawList = requestsData?.requests || [];
    // حصر القائمة قطعياً فقط بطلبات سدانة
    const sedanaList = rawList.filter((r: any) => {
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
    });

    if (!searchQuery.trim()) return sedanaList;

    const query = searchQuery.trim().toLowerCase();
    return sedanaList.filter((r: any) => {
      const idMatch = String(r.id).includes(query);
      const reqNumMatch = r.requestNumber?.toLowerCase().includes(query);
      const mosqueMatch = r.mosqueName?.toLowerCase().includes(query) || r.mosque?.name?.toLowerCase().includes(query);
      const requesterMatch = r.requesterName?.toLowerCase().includes(query) || r.requester?.name?.toLowerCase().includes(query);
      const projectMatch = r.projectName?.toLowerCase().includes(query);
      return idMatch || reqNumMatch || mosqueMatch || requesterMatch || projectMatch;
    });
  }, [requestsData, searchQuery]);

  // استخراج تفاصيل الطلب المحدد الحالي
  const activeSelectedRequest = useMemo(() => {
    if (!selectedRequestId) return null;
    const foundInList = (requestsData?.requests || []).find(
      (r: any) => String(r.id) === String(selectedRequestId)
    );
    if (foundInList) return foundInList;
    if (singleRequestData) {
      return (singleRequestData as any).request || singleRequestData;
    }
    return null;
  }, [selectedRequestId, requestsData, singleRequestData]);

  return (
    <DashboardLayout>
      <div className="space-y-6 text-right font-sans" dir="rtl">
        {/* رأس الصفحة الرئيسي */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/70 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                  أوامر الشراء والخطاب المجتمعي
                </h1>
                <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5 border-primary/30 text-primary bg-primary/5">
                  إدارة المخزون
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                مراجعة وإدارة أوامر الشراء والخطابات المجتمعية المنبثقة عن الطلبات
              </p>
            </div>
          </div>

          {/* تبويبات التنقل العلوية */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full md:w-auto">
            <TabsList className="bg-muted/70 p-1 rounded-xl border border-border/80 h-auto grid grid-cols-2 gap-1.5 w-full md:w-auto">
              <TabsTrigger
                value="purchase_orders"
                className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs font-bold text-xs sm:text-sm px-4 py-2 gap-2 rounded-lg transition-all"
              >
                <ShoppingCart className="w-4 h-4 text-sky-600" />
                <span>أوامر الشراء</span>
              </TabsTrigger>
              <TabsTrigger
                value="csr_letters"
                className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs font-bold text-xs sm:text-sm px-4 py-2 gap-2 rounded-lg transition-all"
              >
                <HeartHandshake className="w-4 h-4 text-emerald-600" />
                <span>الخطاب المجتمعي</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* قسم محدد الطلب: إما شريط الطلب المحدد المضغوط أو بطاقة اختيار الطلبات */}
        {selectedRequestId && activeSelectedRequest && !isSelectorExpanded ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-muted/40 p-3.5 rounded-xl border border-border/80 transition-all shadow-xs">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="bg-primary/10 text-primary border border-primary/20 text-xs px-2.5 py-1 font-bold">
                الطلب المحدد: #{selectedRequestId}
              </Badge>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-foreground">
                  {getMosqueDisplayName(activeSelectedRequest)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {activeSelectedRequest.requestNumber || `REQ-${selectedRequestId}`} • {PROGRAM_LABELS[activeSelectedRequest.programType as keyof typeof PROGRAM_LABELS] || activeSelectedRequest.programType || "البرنامج العام"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5 bg-background hover:bg-muted font-medium"
                onClick={() => setIsSelectorExpanded(true)}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                تغيير الطلب
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/80 font-medium"
                onClick={handleClearSelection}
              >
                <X className="w-3.5 h-3.5" />
                عرض كافة السجلات
              </Button>
            </div>
          </div>
        ) : (
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  <span>تحديد طلب (برنامج سدانة)</span>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-0.5">
                  حدد طلب سدانة لمراجعة أوامر الشراء والخطابات المجتمعية الخاصة به، أو تابع بدون تحديد لعرض كافة السجلات
                </CardDescription>
              </div>
              {selectedRequestId && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-muted-foreground"
                  onClick={() => setIsSelectorExpanded(false)}
                >
                  <ChevronUp className="w-4 h-4 ml-1" />
                  إغلاق القائمة
                </Button>
              )}
            </CardHeader>

            <CardContent className="space-y-3 pt-0">
              {/* شريط البحث المباشر في الطلبات */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="بحث برقم الطلب، اسم المسجد، مقدم الطلب أو المشروع..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-9 h-9 text-xs sm:text-sm"
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

                {selectedRequestId && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs shrink-0"
                    onClick={handleClearSelection}
                  >
                    إلغاء التحديد
                  </Button>
                )}
              </div>

              {/* جدول اختيار الطلب */}
              <div className="border border-border/70 rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader className="bg-muted/50 sticky top-0 z-10">
                    <TableRow className="hover:bg-muted/50">
                      <TableHead className="text-right text-xs py-2 w-[120px]">رقم الطلب</TableHead>
                      <TableHead className="text-right text-xs py-2">المسجد / المشروع</TableHead>
                      <TableHead className="text-right text-xs py-2">نوع البرنامج</TableHead>
                      <TableHead className="text-right text-xs py-2">المرحلة الحالية</TableHead>
                      <TableHead className="text-center text-xs py-2 w-[110px]">الإجراء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isRequestsLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground">
                          جاري تحميل الطلبات...
                        </TableCell>
                      </TableRow>
                    ) : filteredRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground">
                          لا توجد طلبات مطابقة للبحث
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRequests.map((req: any) => {
                        const isSelected = String(req.id) === String(selectedRequestId);
                        return (
                          <TableRow
                            key={req.id}
                            className={`cursor-pointer transition-colors text-xs ${
                              isSelected ? "bg-primary/5 font-semibold" : "hover:bg-muted/40"
                            }`}
                            onClick={() => handleSelectRequest(String(req.id))}
                          >
                            <TableCell className="font-mono font-bold">
                              <Badge
                                variant={isSelected ? "default" : "secondary"}
                                className="text-[11px] px-2 py-0.5"
                              >
                                #{req.id}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium text-foreground">
                              {getMosqueDisplayName(req)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[11px] font-normal">
                                {PROGRAM_LABELS[req.programType as keyof typeof PROGRAM_LABELS] || req.programType || "سدانة"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {STAGE_LABELS[req.currentStage as keyof typeof STAGE_LABELS] || req.currentStage || "قيد التنفيذ"}
                            </TableCell>
                            <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                              <Button
                                size="sm"
                                variant={isSelected ? "default" : "outline"}
                                className={`h-7 text-xs px-2.5 gap-1 ${
                                  isSelected ? "bg-primary text-primary-foreground font-bold" : "hover:bg-primary/10"
                                }`}
                                onClick={() => handleSelectRequest(String(req.id))}
                              >
                                {isSelected ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    محدد
                                  </>
                                ) : (
                                  "تحديد الطلب"
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* محتوى الشاشة بناءً على التبويب المختار */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsContent value="purchase_orders" className="space-y-6 mt-0 focus-visible:outline-none">
            <PurchaseOrdersView
              requestId={selectedRequestId ? parseInt(selectedRequestId) : undefined}
              isEmbedded={true}
            />
          </TabsContent>

          <TabsContent value="csr_letters" className="space-y-6 mt-0 focus-visible:outline-none">
            <CsrLettersView
              requestId={selectedRequestId ? parseInt(selectedRequestId) : undefined}
              isEmbedded={true}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
