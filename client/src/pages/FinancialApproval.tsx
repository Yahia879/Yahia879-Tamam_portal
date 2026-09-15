import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePermission } from "@/hooks/usePermission";
import { cn } from "@/lib/utils";
import {
  CheckSquare,
  CheckCircle2,
  Loader2,
  FileText,
  Calculator,
  Receipt,
  ClipboardList,
  TrendingDown,
  Building2,
  Store,
  Sparkles,
  Check,
  X,
  Search,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { SaudiRiyal } from "@/components/SaudiRiyal";

export default function FinancialApproval() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  
  // قراءة معرف الطلب من الرابط إن وجد
  const [selectedRequestId, setSelectedRequestId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("requestId") || "";
    }
    return "";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const reqId = params.get("requestId");
      if (reqId && reqId !== selectedRequestId) {
        setSelectedRequestId(reqId);
      }
    }
  }, []);

  const [selectedQuotationId, setSelectedQuotationId] = useState<number | null>(null);
  const [selectedWinningVendors, setSelectedWinningVendors] = useState<Record<number, number>>({});
  const [itemSearch, setItemSearch] = useState("");
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");

  const utils = trpc.useUtils();

  // جلب الطلبات في مرحلة التقييم المالي
  const { data: requests } = trpc.requests.search.useQuery({
    currentStage: "financial_eval_and_approval",
  });

  // جلب جدول الكميات للطلب
  const { data: boqData, isLoading: boqLoading, refetch: refetchBOQ } = trpc.projects.getBOQ.useQuery(
    { requestId: parseInt(selectedRequestId) || 0 },
    { enabled: !!selectedRequestId }
  );

  // جلب عروض الأسعار للطلب
  const { data: quotationsData, isLoading: quotationsLoading, refetch: refetchQuotations } = trpc.projects.getQuotationsByRequest.useQuery(
    { requestId: parseInt(selectedRequestId) || 0 },
    { enabled: !!selectedRequestId }
  );

  // جلب تفاصيل الطلب لمعرفة العرض المختار ونوع البرنامج
  const { data: requestDetails } = trpc.requests.getById.useQuery(
    { id: parseInt(selectedRequestId) || 0 },
    { enabled: !!selectedRequestId }
  );

  // قائمة الطلبات المتاحة للاختيار (مع الطلب المحدد حتى لو تم جلبه مباشرة بالرابط)
  const requestList = useMemo(() => {
    const list = requests?.requests ? [...requests.requests] : [];
    if (selectedRequestId && requestDetails) {
      const exists = list.some((r: any) => String(r.id) === String(selectedRequestId));
      if (!exists) {
        list.unshift(requestDetails as any);
      }
    }
    return list;
  }, [requests?.requests, selectedRequestId, requestDetails]);

  const currentProgramType = (requestDetails as any)?.programType;
  const isSedanaProgram = currentProgramType === "sedana";
  const allQuotations = useMemo(() => quotationsData?.quotations ?? [], [quotationsData?.quotations]);

  // إعادة ضبط الحالة عند تغيير الطلب
  useEffect(() => {
    setSelectedWinningVendors({});
    setSelectedQuotationId(null);
    setItemSearch("");
    setApprovalNotes("");
  }, [selectedRequestId]);

  // دالة مساعدة لتحليل بنود عروض الأسعار بأمان
  const parseQuotationItems = (raw: any): any[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch (_) {
        return [];
      }
    }
    return [];
  };

  // دالة موحدة لاستخراج عرض المورد الفعلي لبند معين
  const getOfferForItem = (item: any, quotation: any, totalBoqItemsCount: number = 1) => {
    if (!item || !quotation) return null;
    const itemsArr = parseQuotationItems(quotation.items);
    const qty = parseFloat(String(item.quantity || 1).replace(/,/g, '')) || 1;
    const totAmount = parseFloat(String(quotation.totalAmount || "0").replace(/,/g, ''));

    if (itemsArr && itemsArr.length > 0) {
      let itemOffer = itemsArr.find((it: any) => {
        if (!it) return false;
        const itBoqId = it.boqItemId ?? it.boq_item_id ?? it.itemId ?? it.id;
        if (itBoqId !== undefined && String(itBoqId) === String(item.id)) {
          return true;
        }
        const itName = String(it.itemName ?? it.item_name ?? it.name ?? it.title ?? "").trim().toLowerCase();
        const targetName = String(item.itemName || "").trim().toLowerCase();
        return itName && targetName && (itName === targetName || targetName.includes(itName) || itName.includes(targetName));
      });

      if (itemOffer) {
        const rawUnitPrice = itemOffer.unitPrice ?? itemOffer.unit_price ?? itemOffer.price ?? itemOffer.rate ?? itemOffer.amount;
        const rawTotPrice = itemOffer.totalPrice ?? itemOffer.total_price;

        // فحص ما إذا كان البند مسعراً فعلياً
        if (rawUnitPrice !== undefined && rawUnitPrice !== null && String(rawUnitPrice).trim() !== "") {
          const uPrice = parseFloat(String(rawUnitPrice).replace(/,/g, ''));
          if (!isNaN(uPrice) && uPrice >= 0) {
            let tPrice = rawTotPrice !== undefined && rawTotPrice !== null && String(rawTotPrice).trim() !== ""
              ? parseFloat(String(rawTotPrice).replace(/,/g, ''))
              : uPrice * qty;
            if (isNaN(tPrice) || tPrice < 0) tPrice = uPrice * qty;
            return {
              unitPrice: uPrice,
              totalPrice: tPrice,
            };
          }
        } else if (rawTotPrice !== undefined && rawTotPrice !== null && String(rawTotPrice).trim() !== "") {
          const tPrice = parseFloat(String(rawTotPrice).replace(/,/g, ''));
          if (!isNaN(tPrice) && tPrice >= 0) {
            return {
              unitPrice: qty > 0 ? tPrice / qty : 0,
              totalPrice: tPrice,
            };
          }
        }
      }

      return null;
    }

    // إذا لم تكن هناك بنود تفصيلية، لغير برنامج سدانة يمكن توزيع المبلغ الإجمالي
    if (!isSedanaProgram && totAmount > 0) {
      const itemsCount = totalBoqItemsCount || 1;
      const itemTotal = totAmount / itemsCount;
      const itemUnitPrice = itemTotal / qty;
      return {
        unitPrice: itemUnitPrice,
        totalPrice: itemTotal,
      };
    }

    return null;
  };

  // استعادة الترسية السابقة فقط في حال كان الطلب معتمداً مسبقاً
  useEffect(() => {
    if (boqData?.items && allQuotations.length > 0) {
      const isAlreadyApproved = (requestDetails as any)?.status === "approved" || (requestDetails as any)?.currentStage === "contracting";
      if (isAlreadyApproved && requestDetails?.selectedQuotationId) {
        const winningQuote = allQuotations.find((q: any) => q.quotationNumber === requestDetails.selectedQuotationId);
        if (winningQuote) {
          const updated: Record<number, number> = {};
          boqData.items.forEach((item: any) => {
            updated[item.id] = winningQuote.id;
          });
          setSelectedWinningVendors(updated);
          setSelectedQuotationId(winningQuote.id);
        }
      }
    }
  }, [boqData?.items, allQuotations, requestDetails]);

  // قائمة الموردين المشاركين بعروض أسعار
  const participatingVendors = useMemo(() => {
    if (!boqData?.items) return [];
    return allQuotations.map((quotation: any) => {
      let offeredCount = 0;
      let awardedCount = 0;
      let awardedTotal = 0;

      boqData.items.forEach((item: any) => {
        const offer = getOfferForItem(item, quotation, boqData.items.length);
        if (offer) {
          offeredCount++;
          if (selectedWinningVendors[item.id] === quotation.id) {
            awardedCount++;
            awardedTotal += offer.totalPrice;
          }
        }
      });

      return {
        quotation,
        quotationId: quotation.id,
        supplierId: quotation.supplierId,
        supplierName: quotation.supplierName || `عرض #${quotation.quotationNumber}`,
        quotationNumber: quotation.quotationNumber,
        offeredCount,
        awardedCount,
        awardedTotal,
        totalAmount: parseFloat(String(quotation.totalAmount || "0").replace(/,/g, '')),
      };
    }).filter(v => v.offeredCount > 0);
  }, [boqData?.items, allQuotations, selectedWinningVendors, isSedanaProgram]);

  // معرفة أقل إجمالي بين الموردين
  const minVendorTotal = useMemo(() => {
    if (participatingVendors.length === 0) return null;
    return Math.min(...participatingVendors.map(v => v.totalAmount));
  }, [participatingVendors]);

  // دالة اختيار المورد وكافة بنوده (على مستوى رأس العمود كما طلب المستخدم)
  const handleSelectVendor = (quotationId: number) => {
    if (selectedQuotationId === quotationId) {
      // إلغاء الاختيار
      setSelectedQuotationId(null);
      setSelectedWinningVendors({});
      toast.info("تم إلغاء اختيار المورد");
    } else {
      const vendor = allQuotations.find((q: any) => q.id === quotationId);
      setSelectedQuotationId(quotationId);
      const newSelections: Record<number, number> = {};
      if (boqData?.items) {
        boqData.items.forEach((item: any) => {
          newSelections[item.id] = quotationId;
        });
      }
      setSelectedWinningVendors(newSelections);
      toast.success(`تم اختيار ${vendor?.supplierName || "المورد"} لكافة البنود بنجاح`);
    }
  };

  // إحصائيات الترسية
  const totalBoqItemsCount = boqData?.items?.length || 0;
  const assignedItemsCount = useMemo(() => {
    if (!selectedQuotationId || !boqData?.items) return 0;
    return boqData.items.filter((item: any) => selectedWinningVendors[item.id] === selectedQuotationId).length;
  }, [selectedQuotationId, boqData?.items, selectedWinningVendors]);
  const unassignedItemsCount = Math.max(0, totalBoqItemsCount - assignedItemsCount);
  const awardProgressPercentage = totalBoqItemsCount > 0 ? Math.round((assignedItemsCount / totalBoqItemsCount) * 100) : 0;
  const winningVendorsCount = selectedQuotationId ? 1 : 0;

  // إجمالي التكلفة المعتمدة: تكون صفر تماماً قبل اختيار/اعتماد عرض السعر كما طلب المستخدم
  const totalSelectedItemsCost = useMemo(() => {
    if (!selectedQuotationId || !boqData?.items || boqData.items.length === 0) return 0;
    const quotation = allQuotations.find((q: any) => q.id === selectedQuotationId);
    if (!quotation) return 0;

    let sum = 0;
    let countedItems = 0;
    boqData.items.forEach((item: any) => {
      if (selectedWinningVendors[item.id] === selectedQuotationId) {
        const offer = getOfferForItem(item, quotation, boqData.items.length);
        if (offer && typeof offer.totalPrice === "number") {
          sum += offer.totalPrice;
          countedItems++;
        }
      }
    });

    if (countedItems > 0 && sum > 0) return sum;
    const finalAmt = parseFloat(String(quotation.finalAmount || quotation.totalAmount || "0").replace(/,/g, ""));
    return isNaN(finalAmt) ? 0 : finalAmt;
  }, [selectedQuotationId, selectedWinningVendors, boqData?.items, allQuotations, isSedanaProgram]);

  // الترسية التلقائية للمورد الأقل سعراً إجمالياً
  const handleAutoSelectLowestPrices = () => {
    if (participatingVendors.length === 0) return;
    const sorted = [...participatingVendors].sort((a, b) => a.totalAmount - b.totalAmount);
    if (sorted.length > 0) {
      handleSelectVendor(sorted[0].quotationId);
      toast.success(`تم اختيار العرض الأقل سعراً تلقائياً: ${sorted[0].supplierName} (${sorted[0].totalAmount.toLocaleString("ar-SA")} ر.س)`);
    }
  };

  // إعادة ضبط الترسية لمسح الاختيار وجعل التكلفة صفر
  const handleResetAllSelections = () => {
    setSelectedWinningVendors({});
    setSelectedQuotationId(null);
    toast.info("تمت إعادة ضبط الاختيار وتصفير التكلفة المعتمدة");
  };

  // فلترة البنود بالبحث
  const filteredBoqItems = useMemo(() => {
    if (!boqData?.items) return [];
    return boqData.items.filter((item: any) => {
      if (itemSearch.trim()) {
        const q = itemSearch.trim().toLowerCase();
        const matchName = String(item.itemName || "").toLowerCase().includes(q);
        const matchDesc = String(item.itemDescription || "").toLowerCase().includes(q);
        const matchCat = String(item.category || "").toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchCat) return false;
      }
      return true;
    });
  }, [boqData?.items, itemSearch]);

  // طفرة اعتماد وترسية عروض الأسعار
  const approveMultiVendorMutation = trpc.projects.approveSedanaMultiVendorQuotations.useMutation({
    onSuccess: (data) => {
      toast.success(
        `✅ تم الاعتماد المالي وترسية العرض بنجاح!\n\n` +
        `💰 التكلفة المعتمدة: ${data.totalApprovedBaseCost.toLocaleString("ar-SA")} ريال\n` +
        `🏭 المورد المعتمد: ${selectedQuotation?.supplierName || "المورد المختار"}\n\n` +
        `➡️ تم الانتقال إلى مرحلة التعاقد`,
        { duration: 5000 }
      );
      setTimeout(() => {
        setShowApprovalDialog(false);
        utils.requests.search.invalidate();
        utils.requests.getById.invalidate({ id: parseInt(selectedRequestId) });
        refetchQuotations();
        refetchBOQ();
      }, 1200);
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء الاعتماد المالي");
    },
  });

  // طفرة الاعتماد المالي البديلة
  const approveMutation = trpc.requests.approveFinancially.useMutation({
    onSuccess: () => {
      const supplierName = selectedQuotation?.supplierName || "غير محدد";
      const finalAmt = totalSelectedItemsCost.toLocaleString("ar-SA");
      const quotationNumber = selectedQuotation?.quotationNumber || "";
      
      toast.success(
        `✅ تم الاعتماد المالي بنجاح!\n\n` +
        `📄 رقم العرض: ${quotationNumber}\n` +
        `🏭 المورد: ${supplierName}\n` +
        `💰 المبلغ النهائي: ${finalAmt} ريال\n\n` +
        `➡️ تم الانتقال إلى مرحلة التعاقد`,
        { duration: 5000 }
      );
      
      setTimeout(() => {
        setShowApprovalDialog(false);
        utils.requests.search.invalidate();
        utils.requests.getById.invalidate({ id: parseInt(selectedRequestId) });
        refetchQuotations();
      }, 1200);
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء الاعتماد المالي");
    },
  });

  // تنفيذ الاعتماد المالي
  const handleConfirmApproval = () => {
    if (!selectedRequestId) return;
    if (!selectedQuotationId) {
      toast.error("يرجى النقر على زر 'اختر' أعلى المورد المطلوب اعتماده قبل المتابعة");
      return;
    }

    const quotation = allQuotations.find((q: any) => q.id === selectedQuotationId);
    const selections: Array<{
      boqItemId: number;
      quotationId: number;
      unitPrice: number;
      totalPrice: number;
      supplierName?: string;
    }> = [];

    if (boqData?.items && boqData.items.length > 0 && quotation) {
      for (const item of boqData.items) {
        const offer = getOfferForItem(item, quotation, boqData.items.length);
        if (offer) {
          selections.push({
            boqItemId: item.id,
            quotationId: selectedQuotationId,
            unitPrice: offer.unitPrice,
            totalPrice: offer.totalPrice,
            supplierName: quotation?.supplierName || undefined,
          });
        }
      }
    }

    if (selections.length > 0) {
      approveMultiVendorMutation.mutate({
        requestId: parseInt(selectedRequestId),
        itemVendorSelections: selections,
        approvalNotes,
      });
    } else {
      approveMutation.mutate({
        requestId: parseInt(selectedRequestId),
        approvalNotes,
      });
    }
  };

  // العرض المختار حالياً
  const selectedQuotation = useMemo(() => {
    return allQuotations.find((q: any) => q.id === selectedQuotationId);
  }, [allQuotations, selectedQuotationId]);

  const displayFinalCost = totalSelectedItemsCost;
  const boqTotal = boqData?.total || 0;
  const isLoading = boqLoading || quotationsLoading;
  const hasBoq = boqData?.items && boqData.items.length > 0;
  const hasQuotations = quotationsData?.quotations && quotationsData.quotations.length > 0;

  // التحقق من الصلاحيات
  const hasApprove = usePermission("financial_approval.approve");
  const isSuperOrSystem = ["super_admin", "system_admin", "financial", "financial_manager"].includes(user?.role || "");
  const canApprove = hasApprove || isSuperOrSystem;

  return (
    <DashboardLayout>
      <div className="space-y-6" dir="rtl">
        {/* العنوان */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">الاعتماد المالي</h1>
            <p className="text-muted-foreground">مقارنة عروض أسعار الموردين وفق جدول الكميات واعتماد التكلفة والانتقال للتعاقد</p>
          </div>
        </div>

        {/* اختيار الطلب */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              اختيار الطلب
            </CardTitle>
            <CardDescription>اختر الطلب لمراجعة بنود جدول الكميات ومقارنة عروض الأسعار واعتماد التكلفة النهائية</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label>الطلب</Label>
                <Select 
                  value={selectedRequestId} 
                  onValueChange={(value) => {
                    setSelectedRequestId(value);
                  }}
                >
                  <SelectTrigger className="text-right">
                    <SelectValue placeholder="اختر الطلب..." />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {requestList.map((request: any) => (
                      <SelectItem key={request.id} value={request.id.toString()}>
                        {request.requestNumber} - {request.mosqueName || request.descriptiveName || request.programName || `طلب #${request.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* محتوى الصفحة */}
        {selectedRequestId && (
          <>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* التحقق من المتطلبات */}
                {!hasBoq && (
                  <Card className="border-red-500">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4 text-red-600">
                        <ClipboardList className="h-8 w-8" />
                        <div>
                          <p className="font-medium">لا يوجد جدول كميات</p>
                          <p className="text-sm">يجب إعداد جدول الكميات أولاً قبل الاعتماد المالي</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => navigate(`/projects/boq?requestId=${selectedRequestId}`)}
                          >
                            إعداد جدول الكميات
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {hasBoq && !hasQuotations && (
                  <Card className="border-yellow-500">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4 text-yellow-600">
                        <Receipt className="h-8 w-8" />
                        <div>
                          <p className="font-medium">لا توجد عروض أسعار</p>
                          <p className="text-sm">يجب إضافة عروض أسعار من الموردين قبل الاعتماد المالي</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => navigate(`/quotations?requestId=${selectedRequestId}`)}
                          >
                            إضافة عروض أسعار
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* ==================== جدول الكميات ومقارنة عروض أسعار الموردين ==================== */}
                {hasQuotations && hasBoq && (
                  <Card className="shadow-xs border-primary/20">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <CardTitle className="flex items-center gap-2 text-xl font-extrabold text-foreground">
                            <ClipboardList className="h-5.5 w-5.5 text-primary" />
                            جدول الكميات ومقارنة عروض أسعار الموردين
                            {requestDetails?.programName ? ` (${requestDetails.programName})` : ""}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            انقر على زر <strong>"اختر"</strong> أعلى عمود المورد المطلوب لاعتماده لكافة البنود
                          </CardDescription>
                        </div>

                        {/* زر سريع لاختيار الأقل سعراً */}
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={handleAutoSelectLowestPrices}
                            variant="outline"
                            size="sm"
                            className="text-emerald-700 dark:text-emerald-300 border-emerald-500/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 gap-1.5 h-8 text-xs font-bold"
                          >
                            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                            ترسية الأقل سعراً تلقائياً
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-5">
                      {/* 1. لوحة المؤشرات التنفيذية للترسية */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {/* بطاقة نسبة اكتمال الترسية */}
                        <div className="p-3.5 rounded-xl border bg-card text-card-foreground shadow-xs">
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                            <span className="font-semibold">اكتمال الترسية</span>
                            <span className="font-bold text-foreground">{assignedItemsCount} من {totalBoqItemsCount} بند</span>
                          </div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                              <div 
                                className={cn(
                                  "h-full transition-all duration-500 rounded-full",
                                  awardProgressPercentage === 100 ? "bg-emerald-600" : "bg-amber-500"
                                )}
                                style={{ width: `${awardProgressPercentage}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold shrink-0">{awardProgressPercentage}%</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {selectedQuotation 
                              ? `مكتمل: تم اختيار ${selectedQuotation.supplierName}` 
                              : `متبقي ${unassignedItemsCount} بند دون تحديد مورد`}
                          </p>
                        </div>

                        {/* بطاقة إجمالي تكلفة الترسية */}
                        <div className="p-3.5 rounded-xl border bg-card text-card-foreground shadow-xs">
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span className="font-semibold">إجمالي التكلفة المعتمدة</span>
                            <Receipt className="h-4 w-4 text-primary" />
                          </div>
                          <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 my-1">
                            <span>{totalSelectedItemsCost.toLocaleString("ar-SA")}</span>
                            <SaudiRiyal className="w-4 h-4 inline" />
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {selectedQuotation ? "مجموع أسعار البنود للمورد المعتمد" : "صفر (بانتظار اعتماد عرض السعر)"}
                          </p>
                        </div>

                        {/* بطاقة الموردين المعتمدين */}
                        <div className="p-3.5 rounded-xl border bg-card text-card-foreground shadow-xs">
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span className="font-semibold">الموردين المعتمدين</span>
                            <Store className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="text-lg font-extrabold text-foreground flex items-center gap-1.5 my-1">
                            <span>{winningVendorsCount}</span>
                            <span className="text-xs font-normal text-muted-foreground">
                              من أصل {participatingVendors.length} موردين مشاركين
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {selectedQuotation ? selectedQuotation.supplierName : "لم يتم تحديد مورد بعد"}
                          </p>
                        </div>
                      </div>

                      {/* 2. شريط البحث وإعادة الضبط */}
                      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 bg-muted/20 dark:bg-slate-900/60 rounded-xl border border-border">
                        <div className="flex items-center gap-2 flex-1 max-w-md">
                          <div className="relative w-full">
                            <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <Input 
                              value={itemSearch}
                              onChange={(e) => setItemSearch(e.target.value)}
                              placeholder="ابحث باسم البند، الوصف، أو التصنيف..."
                              className="pr-9 h-9 text-xs bg-background text-right"
                            />
                            {itemSearch && (
                              <button 
                                onClick={() => setItemSearch("")}
                                className="absolute left-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleResetAllSelections}
                            className="h-8 text-xs px-3 text-muted-foreground hover:text-red-600 hover:border-red-300 gap-1.5"
                            title="إلغاء التحديد وإعادة ضبط الجدول"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            إعادة ضبط
                          </Button>
                        </div>
                      </div>

                      {/* 3. مصفوفة مقارنة عروض الأسعار مع أزرار اختر في رأس الأعمدة */}
                      {filteredBoqItems.length === 0 ? (
                        <div className="text-center py-10 border border-dashed rounded-xl p-8 bg-muted/10">
                          <SlidersHorizontal className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                          <p className="font-bold text-sm text-foreground">لا توجد بنود مطابقة لنص البحث</p>
                          <p className="text-xs text-muted-foreground mt-1">جرّب مسح نص البحث لعرض كافة البنود</p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-3 text-xs"
                            onClick={() => setItemSearch("")}
                          >
                            عرض جميع البنود ({totalBoqItemsCount})
                          </Button>
                        </div>
                      ) : (
                        <div className="border border-border rounded-xl overflow-hidden bg-card shadow-xs">
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/40 border-b-2 border-slate-300 dark:border-slate-700">
                                  <TableHead className="w-12 text-center font-bold">#</TableHead>
                                  <TableHead className="font-bold min-w-[220px]">البند والمواصفات</TableHead>
                                  <TableHead className="text-center font-bold min-w-[90px]">الكمية</TableHead>
                                  
                                  {/* أعمدة الموردين المشاركين مع زر اختر لكل بنود المورد */}
                                  {participatingVendors.map(vendor => {
                                    const isSelected = selectedQuotationId === vendor.quotationId;
                                    const isLowestTotal = minVendorTotal !== null && vendor.totalAmount === minVendorTotal;

                                    return (
                                      <TableHead 
                                        key={vendor.quotationId} 
                                        className={cn(
                                          "min-w-[190px] text-center p-3 border-r border-slate-200 dark:border-slate-800 transition-all",
                                          isSelected 
                                            ? "bg-emerald-50 dark:bg-emerald-950/40 border-b-2 border-b-emerald-600 shadow-xs" 
                                            : "bg-muted/30"
                                        )}
                                      >
                                        <div className="flex flex-col items-center justify-center gap-1.5 py-1">
                                          <div className="font-bold text-xs text-foreground truncate max-w-[180px]" title={vendor.supplierName}>
                                            {vendor.supplierName}
                                          </div>
                                          <div className="text-[11px] text-muted-foreground flex items-center justify-center gap-1 font-medium">
                                            <span>إجمالي:</span>
                                            <span className="font-bold text-foreground inline-flex items-center gap-0.5">
                                              {vendor.totalAmount.toLocaleString("ar-SA")} <SaudiRiyal className="w-3 h-3 inline" />
                                            </span>
                                          </div>

                                          {/* زر اختر المورد لكافة بنوده */}
                                          <Button
                                            size="sm"
                                            type="button"
                                            onClick={() => handleSelectVendor(vendor.quotationId)}
                                            className={cn(
                                              "h-7 text-xs px-4 font-bold shadow-xs transition-all w-full max-w-[130px] mt-1 cursor-pointer",
                                              isSelected
                                                ? "bg-emerald-700 hover:bg-emerald-800 text-white ring-2 ring-emerald-500/60"
                                                : "bg-emerald-600 hover:bg-emerald-700 text-white"
                                            )}
                                          >
                                            {isSelected ? (
                                              <span className="flex items-center gap-1">
                                                <Check className="w-3.5 h-3.5" />
                                                معتمد
                                              </span>
                                            ) : (
                                              <span className="flex items-center gap-1">
                                                {isLowestTotal && <Sparkles className="w-3 h-3 text-amber-300" />}
                                                اختر
                                              </span>
                                            )}
                                          </Button>
                                        </div>
                                      </TableHead>
                                    );
                                  })}

                                  <TableHead className="text-center font-bold min-w-[190px] bg-emerald-500/5 border-r border-emerald-500/20">
                                    المورد المعتمد حالياً
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {filteredBoqItems.map((item: any, index: number) => {
                                  const itemOffers = allQuotations.flatMap((q: any) => {
                                    const offer = getOfferForItem(item, q, boqData.items.length);
                                    if (offer) {
                                      return [{ quotation: q, unitPrice: offer.unitPrice, totalPrice: offer.totalPrice }];
                                    }
                                    return [];
                                  });

                                  const minUnitPrice = itemOffers.length > 0 ? Math.min(...itemOffers.map(o => o.unitPrice)) : null;

                                  return (
                                    <TableRow key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                                      <TableCell className="text-center font-semibold text-muted-foreground">{index + 1}</TableCell>
                                      <TableCell className="align-middle">
                                        <div className="font-bold text-xs text-foreground leading-snug">{item.itemName}</div>
                                        {item.itemDescription && (
                                          <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1" title={item.itemDescription || undefined}>
                                            {item.itemDescription}
                                          </div>
                                        )}
                                        {item.category && (
                                          <Badge variant="outline" className="text-[9px] py-0 px-1.5 mt-1 bg-slate-100 dark:bg-slate-800">
                                            {item.category}
                                          </Badge>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-center align-middle">
                                        <span className="font-extrabold text-xs">
                                          {item.quantity ? parseFloat(item.quantity).toLocaleString("ar-SA") : 1}
                                        </span>
                                        <span className="text-[11px] text-muted-foreground block">{item.unit || "عدد"}</span>
                                      </TableCell>

                                      {/* خلايا الموردين لكل بند (عرض أسعار المقارنة دون اختيار بالبند الفردي) */}
                                      {participatingVendors.map(vendor => {
                                        const vOffer = getOfferForItem(item, vendor.quotation, boqData.items.length);
                                        const hasOffer = Boolean(vOffer);
                                        const isLowest = Boolean(vOffer && minUnitPrice !== null && vOffer.unitPrice === minUnitPrice);
                                        const isVendorSelected = selectedQuotationId === vendor.quotationId;

                                        return (
                                          <TableCell 
                                            key={vendor.quotationId} 
                                            className={cn(
                                              "p-2 align-middle border-r border-slate-200 dark:border-slate-800 transition-colors",
                                              isVendorSelected && "bg-emerald-50/40 dark:bg-emerald-950/20"
                                            )}
                                          >
                                            {vOffer && hasOffer ? (
                                              <div
                                                className={cn(
                                                  "p-2 rounded-lg border text-center transition-all duration-150",
                                                  isVendorSelected
                                                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500/60 shadow-2xs"
                                                    : isLowest
                                                      ? "bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-300/80 dark:border-emerald-800/40"
                                                      : "bg-background border-border/80"
                                                )}
                                              >
                                                <div className="flex items-center justify-between gap-1 mb-1">
                                                  {isLowest ? (
                                                    <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[9px] py-0 px-1.5 h-4 gap-0.5 font-bold">
                                                      <Sparkles className="w-2.5 h-2.5" />
                                                      الأقل
                                                    </Badge>
                                                  ) : <span />}
                                                  {isVendorSelected && (
                                                    <Badge className="bg-emerald-700 hover:bg-emerald-700 text-white text-[9px] py-0 px-1.5 h-4 gap-0.5 font-bold">
                                                      <Check className="w-2.5 h-2.5" />
                                                      معتمد
                                                    </Badge>
                                                  )}
                                                </div>
                                                <div className="font-extrabold text-xs text-foreground flex items-center justify-center gap-0.5">
                                                  <span>{vOffer.unitPrice.toLocaleString("ar-SA")}</span>
                                                  <span className="text-[10px] text-muted-foreground font-normal">ر.س</span>
                                                </div>
                                                <div className="text-[10px] text-muted-foreground mt-0.5">
                                                  الإجمالي: {vOffer.totalPrice.toLocaleString("ar-SA")}
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="p-2 text-center text-muted-foreground/40 text-[11px] italic">
                                                —
                                              </div>
                                            )}
                                          </TableCell>
                                        );
                                      })}

                                      {/* خانة المورد المعتمد حالياً */}
                                      <TableCell className="p-2 align-middle text-center bg-emerald-500/5 border-r border-emerald-500/20">
                                        {selectedQuotation ? (
                                          (() => {
                                            const selectedOffer = getOfferForItem(item, selectedQuotation, boqData.items.length);
                                            return selectedOffer ? (
                                              <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 shadow-2xs text-right">
                                                <div className="flex items-center justify-between gap-1">
                                                  <span className="font-bold text-xs text-emerald-800 dark:text-emerald-200 truncate" title={selectedQuotation.supplierName || undefined}>
                                                    {selectedQuotation.supplierName || "المورد المعتمد"}
                                                  </span>
                                                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[9px] px-1 py-0 border-emerald-300">
                                                    معتمد
                                                  </Badge>
                                                </div>
                                                <div className="text-[11px] text-foreground font-bold mt-1 flex items-center justify-between">
                                                  <span className="text-[10px] text-muted-foreground font-normal">سعر الوحدة:</span>
                                                  <span>{selectedOffer.unitPrice.toLocaleString("ar-SA")} ر.س</span>
                                                </div>
                                                <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-extrabold flex items-center justify-between mt-0.5">
                                                  <span className="text-[10px] text-muted-foreground font-normal">الإجمالي:</span>
                                                  <span>{selectedOffer.totalPrice.toLocaleString("ar-SA")} ر.س</span>
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="p-2 text-center text-muted-foreground text-xs">
                                                غير مسعر في العرض
                                              </div>
                                            );
                                          })()
                                        ) : (
                                          <div className="p-2 rounded-lg border border-dashed border-amber-300 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 text-center">
                                            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 block">بانتظار تحديد مورد</span>
                                            <span className="text-[9px] text-muted-foreground block mt-0.5">انقر على زر "اختر" أعلى عرض المورد</span>
                                          </div>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}

                    </CardContent>
                  </Card>
                )}

                {/* ==================== جدول مقارنة عروض الأسعار المفردة (في حال عدم وجود جدول كميات) ==================== */}
                {hasQuotations && !hasBoq && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Receipt className="h-5 w-5" />
                        مقارنة عروض الأسعار
                      </CardTitle>
                      <CardDescription>
                        {selectedQuotationId 
                          ? "تم اختيار العرض - يمكنك المتابعة للاعتماد المالي"
                          : "اختر أفضل عرض سعر من القائمة أدناه"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">اختيار</TableHead>
                              <TableHead>رقم العرض</TableHead>
                              <TableHead>المورد</TableHead>
                              <TableHead>المبلغ الأصلي</TableHead>
                              <TableHead>الضريبة</TableHead>
                              <TableHead>الخصم</TableHead>
                              <TableHead>المبلغ النهائي</TableHead>
                              <TableHead>تاريخ الانتهاء</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {quotationsData.quotations.map((quotation: any) => {
                              const isSelected = quotation.id === selectedQuotationId;
                              const totalAmount = parseFloat(quotation.totalAmount);
                              const taxAmount = parseFloat(quotation.taxAmount || "0");
                              const discountAmount = parseFloat(quotation.discountAmount || "0");
                              const finalAmt = parseFloat(quotation.finalAmount || quotation.totalAmount);
                              
                              return (
                                <TableRow 
                                  key={quotation.id} 
                                  className={isSelected ? "bg-green-50 border-green-200" : ""}
                                >
                                  <TableCell>
                                    <RadioGroup
                                      value={selectedQuotationId?.toString() || ""}
                                      onValueChange={(value) => setSelectedQuotationId(parseInt(value))}
                                      disabled={!canApprove}
                                    >
                                      <RadioGroupItem value={quotation.id.toString()} />
                                    </RadioGroup>
                                  </TableCell>
                                  <TableCell className="font-medium">{quotation.quotationNumber}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Building2 className="h-4 w-4 text-muted-foreground" />
                                      {quotation.supplierName || "غير محدد"}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                     <span className="inline-flex items-center gap-1">
                                       {totalAmount.toLocaleString("ar-SA")}
                                       <SaudiRiyal className="w-3.5 h-3.5 inline" />
                                     </span>
                                   </TableCell>
                                   <TableCell>
                                     {taxAmount > 0 ? (
                                       <span className="text-green-600 inline-flex items-center gap-1">
                                         +{parseFloat(quotation.taxAmount || "0").toLocaleString("ar-SA")}
                                         <SaudiRiyal className="w-3.5 h-3.5 inline" />
                                       </span>
                                     ) : (
                                       <span className="text-muted-foreground">-</span>
                                     )}
                                   </TableCell>
                                   <TableCell>
                                     {discountAmount > 0 ? (
                                       <span className="text-red-600 inline-flex items-center gap-1">
                                         <TrendingDown className="h-3 w-3" />
                                         -{parseFloat(quotation.discountAmount || "0").toLocaleString("ar-SA")}
                                         <SaudiRiyal className="w-3.5 h-3.5 inline" />
                                       </span>
                                     ) : (
                                       <span className="text-muted-foreground">-</span>
                                     )}
                                   </TableCell>
                                   <TableCell>
                                     <span className={`font-bold inline-flex items-center gap-1 ${isSelected ? "text-green-600" : ""}`}>
                                       {finalAmt.toLocaleString("ar-SA")}
                                       <SaudiRiyal className="w-3.5 h-3.5 inline" />
                                     </span>
                                   </TableCell>
                                  <TableCell>
                                    {quotation.validUntil 
                                      ? new Date(quotation.validUntil).toLocaleDateString("ar-SA")
                                      : "-"}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}


              </>
            )}
          </>
        )}

        {/* Dialog تأكيد الاعتماد المالي */}
        <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
          <DialogContent dir="rtl" className="max-w-lg text-right">
            <DialogHeader className="text-right">
              <DialogTitle>تأكيد الاعتماد المالي</DialogTitle>
              <DialogDescription>
                سيتم اعتماد الطلب مالياً بتكلفة إجمالية {displayFinalCost.toLocaleString("ar-SA")} ريال وتحويله تلقائياً لمرحلة التعاقد.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 my-2">
              <div className="p-4 bg-muted/60 rounded-xl space-y-3">
                <div className="flex items-center justify-between text-sm pb-2 border-b border-border/60">
                  <span className="text-muted-foreground">التكلفة المعتمدة:</span>
                  <span className="font-extrabold text-emerald-700 dark:text-emerald-400 text-base inline-flex items-center gap-1">
                    {displayFinalCost.toLocaleString("ar-SA")} <SaudiRiyal className="w-4 h-4 inline" />
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <span className="text-muted-foreground">رقم العرض:</span>
                  <span className="font-medium">{selectedQuotation?.quotationNumber}</span>
                  <span className="text-muted-foreground">المورد المعتمد:</span>
                  <span className="font-medium text-foreground font-bold">{selectedQuotation?.supplierName || "غير محدد"}</span>
                  <span className="text-muted-foreground">عدد البنود:</span>
                  <span className="font-medium">{totalBoqItemsCount} بند</span>
                </div>
              </div>

              <div>
                <Label className="text-xs">ملاحظات الاعتماد المالي (اختياري)</Label>
                <Textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="أي ملاحظات إضافية على الاعتماد المالي..."
                  className="mt-1.5 text-xs text-right"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
                إلغاء
              </Button>
              <Button 
                onClick={handleConfirmApproval} 
                disabled={approveMultiVendorMutation.isPending || approveMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {(approveMultiVendorMutation.isPending || approveMutation.isPending) && (
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                )}
                تأكيد الاعتماد والانتقال للتعاقد
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
