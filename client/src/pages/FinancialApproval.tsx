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
  Eye,
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
  LayoutGrid,
  ListFilter,
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
  const [viewMode, setViewMode] = useState<"matrix" | "table">("matrix");
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

  // دالة موحدة لاستخراج عرض المورد الفعلي لبند معين (تقبل السعر 0 كعرض صحيح)
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

      // المورد أدخل قائمة بنود تفصيلية ولكن هذا البند لم يتم تسعيره
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

  // استعادة الترسية السابقة أو التحديد الافتراضي
  useEffect(() => {
    if (boqData?.items && allQuotations.length > 0) {
      // 1. استعادة الترسية السابقة المحفوظة في بيانات الطلب إن وجدت
      let awarded = (requestDetails as any)?.programData?.awardedItemVendors;
      if (typeof awarded === "string") {
        try { awarded = JSON.parse(awarded); } catch {}
      }
      if (Array.isArray(awarded) && awarded.length > 0) {
        setSelectedWinningVendors(prev => {
          const updated = { ...prev };
          let changed = false;
          awarded.forEach((sel: any) => {
            if (sel.boqItemId && sel.quotationId && !updated[sel.boqItemId]) {
              updated[sel.boqItemId] = sel.quotationId;
              changed = true;
            }
          });
          return changed ? updated : prev;
        });
      } else if (requestDetails?.selectedQuotationId) {
        // إذا كان هناك عرض سعر فائز معتمد مسبقاً
        const winningQuote = allQuotations.find((q: any) => q.quotationNumber === requestDetails.selectedQuotationId);
        if (winningQuote) {
          setSelectedWinningVendors(prev => {
            const updated = { ...prev };
            boqData.items.forEach((item: any) => {
              if (!updated[item.id]) {
                updated[item.id] = winningQuote.id;
              }
            });
            return updated;
          });
          setSelectedQuotationId(winningQuote.id);
        }
      } else {
        // 2. مزامنة عروض الأسعار الوحيدة أو المعتمدة مسبقاً
        setSelectedWinningVendors(prev => {
          const updated = { ...prev };
          let changed = false;
          boqData.items.forEach((item: any) => {
            if (!updated[item.id]) {
              const acceptedQuote = allQuotations.find((q: any) => {
                if (q.status !== 'accepted' && q.status !== 'approved') return false;
                const offer = getOfferForItem(item, q, boqData.items.length);
                return offer !== null;
              });
              if (acceptedQuote) {
                updated[item.id] = acceptedQuote.id;
                changed = true;
              } else {
                const offers = allQuotations.filter((q: any) => {
                  const offer = getOfferForItem(item, q, boqData.items.length);
                  return offer !== null;
                });
                if (offers.length === 1) {
                  updated[item.id] = offers[0].id;
                  changed = true;
                }
              }
            }
          });
          return changed ? updated : prev;
        });
      }
    }
  }, [boqData?.items, allQuotations, requestDetails, isSedanaProgram]);

  // قائمة الموردين المشاركين بعروض أسعار وتفاصيل ترسيتهم
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

  // إحصائيات الترسية والمبالغ
  const totalBoqItemsCount = boqData?.items?.length || 0;
  const assignedItemsCount = useMemo(() => {
    if (!boqData?.items) return 0;
    return boqData.items.filter((item: any) => Boolean(selectedWinningVendors[item.id])).length;
  }, [boqData?.items, selectedWinningVendors]);
  const unassignedItemsCount = Math.max(0, totalBoqItemsCount - assignedItemsCount);
  const awardProgressPercentage = totalBoqItemsCount > 0 ? Math.round((assignedItemsCount / totalBoqItemsCount) * 100) : 0;
  const winningVendorsCount = useMemo(() => {
    const ids = new Set<number>();
    if (!boqData?.items) return 0;
    boqData.items.forEach((item: any) => {
      const qId = selectedWinningVendors[item.id];
      if (qId) ids.add(qId);
    });
    return ids.size;
  }, [boqData?.items, selectedWinningVendors]);

  // حساب إجمالي التكلفة المعتمدة بناءً على البنود أو العرض المختار
  const totalSelectedItemsCost = useMemo(() => {
    if (!boqData?.items) return 0;
    return boqData.items.reduce((sum: number, item: any) => {
      const qId = selectedWinningVendors[item.id];
      if (qId) {
        const quotation = allQuotations.find((q: any) => q.id === qId);
        if (quotation) {
          const offer = getOfferForItem(item, quotation, boqData.items.length);
          if (offer && typeof offer.totalPrice === 'number') return sum + offer.totalPrice;
        }
      }
      const savedTot = item.totalPrice ? parseFloat(String(item.totalPrice).replace(/,/g, '')) : 0;
      if (savedTot > 0) return sum + savedTot;
      const savedUnit = item.unitPrice ? parseFloat(String(item.unitPrice).replace(/,/g, '')) : 0;
      const qty = parseFloat(String(item.quantity || 1).replace(/,/g, '')) || 1;
      return sum + (savedUnit * qty);
    }, 0);
  }, [boqData?.items, selectedWinningVendors, allQuotations, isSedanaProgram]);

  // الترسية التلقائية للأقل سعراً لكافة البنود
  const handleAutoSelectLowestPrices = () => {
    if (!boqData?.items || boqData.items.length === 0) return;
    const newSelections: Record<number, number> = { ...selectedWinningVendors };
    let count = 0;

    boqData.items.forEach((item: any) => {
      const offers = allQuotations.flatMap((quotation: any) => {
        const offer = getOfferForItem(item, quotation, boqData.items.length);
        if (offer) {
          return [{ quotationId: quotation.id, unitPrice: offer.unitPrice }];
        }
        return [];
      });

      if (offers.length > 0) {
        offers.sort((a, b) => a.unitPrice - b.unitPrice);
        newSelections[item.id] = offers[0].quotationId;
        count++;
      }
    });

    setSelectedWinningVendors(newSelections);
    toast.success(`تم اختيار العرض الأقل سعراً تلقائياً لـ ${count} بند بنجاح`);
  };

  // ترسية كافة بنود مورد معين
  const handleAwardAllForVendor = (quotationId: number) => {
    if (!boqData?.items) return;
    const vendor = participatingVendors.find(v => v.quotationId === quotationId);
    const newSelections: Record<number, number> = { ...selectedWinningVendors };
    let count = 0;

    boqData.items.forEach((item: any) => {
      const offer = getOfferForItem(item, vendor?.quotation, boqData.items.length);
      if (offer) {
        newSelections[item.id] = quotationId;
        count++;
      }
    });

    setSelectedWinningVendors(newSelections);
    setSelectedQuotationId(quotationId);
    toast.success(`تمت ترسية ${count} بند على ${vendor?.supplierName || "المورد"} بنجاح`);
  };

  // إلغاء ترسية بنود مورد معين
  const handleClearVendorAward = (quotationId: number) => {
    const newSelections = { ...selectedWinningVendors };
    let count = 0;
    Object.entries(newSelections).forEach(([itemId, qId]) => {
      if (qId === quotationId) {
        delete newSelections[Number(itemId)];
        count++;
      }
    });
    setSelectedWinningVendors(newSelections);
    toast.info(`تم إلغاء ترسية ${count} بند من هذا المورد`);
  };

  // إعادة ضبط الترسية
  const handleResetAllSelections = () => {
    setSelectedWinningVendors({});
    setSelectedQuotationId(null);
    toast.info("تمت إعادة ضبط جميع اختيارات الموردين");
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

  // طفرة اعتماد وترسية عروض الأسعار بحسب البنود
  const approveMultiVendorMutation = trpc.projects.approveSedanaMultiVendorQuotations.useMutation({
    onSuccess: (data) => {
      toast.success(
        `✅ تم الاعتماد المالي بنجاح!\n\n` +
        `💰 التكلفة المعتمدة: ${data.totalApprovedBaseCost.toLocaleString("ar-SA")} ريال\n` +
        `🏭 عدد الموردين المعتمدين: ${data.approvedQuotationsCount}\n\n` +
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

  // اختيار عرض السعر الفائز المفرد
  const selectWinningMutation = trpc.requests.selectWinningQuotation.useMutation({
    onSuccess: () => {
      toast.success("تم اختيار العرض الفائز بنجاح");
      refetchQuotations();
      utils.requests.getById.invalidate({ id: parseInt(selectedRequestId) });
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء اختيار العرض");
    },
  });

  // الاعتماد المالي النهائي لعرض مفرد
  const approveMutation = trpc.requests.approveFinancially.useMutation({
    onSuccess: () => {
      const approvedQuotation = selectedQuotation;
      const supplierName = approvedQuotation?.supplierName || "غير محدد";
      const finalAmt = parseFloat(approvedQuotation?.finalAmount || approvedQuotation?.totalAmount || "0").toLocaleString("ar-SA");
      const quotationNumber = approvedQuotation?.quotationNumber || "";
      
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

    // تجهيز الاختيارات بحسب البنود
    const selections: Array<{
      boqItemId: number;
      quotationId: number;
      unitPrice: number;
      totalPrice: number;
      supplierName?: string;
    }> = [];

    if (boqData?.items && boqData.items.length > 0) {
      for (const item of boqData.items) {
        const qId = selectedWinningVendors[item.id];
        if (qId) {
          const quotation = allQuotations.find((q: any) => q.id === qId);
          if (!quotation) continue;
          const offer = getOfferForItem(item, quotation, boqData.items.length);
          if (offer) {
            selections.push({
              boqItemId: item.id,
              quotationId: qId,
              unitPrice: offer.unitPrice,
              totalPrice: offer.totalPrice,
              supplierName: quotation?.supplierName || undefined,
            });
          }
        }
      }
    }

    if (selections.length > 0) {
      approveMultiVendorMutation.mutate({
        requestId: parseInt(selectedRequestId),
        itemVendorSelections: selections,
        approvalNotes,
      });
    } else if (selectedQuotationId) {
      approveMutation.mutate({
        requestId: parseInt(selectedRequestId),
        approvalNotes,
      });
    } else {
      toast.error("يرجى تحديد مورد على الأقل للبنود أو اختيار عرض سعر قبل الاعتماد");
    }
  };

  // حساب التكاليف
  const boqTotal = boqData?.total || 0;
  const selectedQuotation = quotationsData?.quotations?.find((q: any) => 
    requestDetails?.selectedQuotationId ? q.quotationNumber === requestDetails.selectedQuotationId : q.id === selectedQuotationId
  );
  
  const displayFinalCost = assignedItemsCount > 0 
    ? totalSelectedItemsCost 
    : (selectedQuotation ? parseFloat(selectedQuotation.finalAmount || selectedQuotation.totalAmount) : 0);

  const isLoading = boqLoading || quotationsLoading;
  const hasBoq = boqData?.items && boqData.items.length > 0;
  const hasQuotations = quotationsData?.quotations && quotationsData.quotations.length > 0;
  const hasSelectedQuotation = !!requestDetails?.selectedQuotationId || !!selectedQuotationId || assignedItemsCount > 0;

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
                            اختر المورد والعرض المناسب لكل بند من القائمة المنسدلة أو عبر النقر المباشر في مصفوفة المقارنة
                          </CardDescription>
                        </div>

                        {/* زر سريع لاختيار الأقل سعراً لكافة البنود */}
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
                            {unassignedItemsCount > 0 
                              ? `متبقي ${unassignedItemsCount} بند دون تحديد مورد` 
                              : "مكتمل: تم تحديد موردين لكافة البنود"}
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
                            مجموع أسعار البنود المعتمدة حالياً
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
                            تجزئة الشراء بين الموردين وفق البنود
                          </p>
                        </div>
                      </div>

                      {/* 2. توزيع الترسية على الموردين المشاركين */}
                      {participatingVendors.length > 0 && (
                        <div className="p-4 bg-slate-50/80 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
                          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                            <div className="flex items-center gap-2">
                              <Store className="h-4 w-4 text-primary" />
                              <h4 className="text-xs font-bold text-foreground">توزيع الترسية على الموردين المشاركين ({participatingVendors.length})</h4>
                            </div>
                            <span className="text-[11px] text-muted-foreground">يمكنك ترسية كافة بنود مورد محدد بنقرة واحدة أو إلغاء ترسيته</span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {participatingVendors.map((vendor) => {
                              const isFullyAwarded = vendor.awardedCount === vendor.offeredCount && vendor.offeredCount > 0;
                              const isPartiallyAwarded = vendor.awardedCount > 0 && vendor.awardedCount < vendor.offeredCount;
                              return (
                                <div 
                                  key={vendor.quotationId}
                                  className={cn(
                                    "p-3 rounded-lg border transition-all duration-200 flex flex-col justify-between gap-2.5",
                                    isFullyAwarded 
                                      ? "bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/80 shadow-2xs" 
                                      : isPartiallyAwarded
                                        ? "bg-blue-50/60 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/40"
                                        : "bg-background border-border"
                                  )}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="font-bold text-xs text-foreground truncate" title={vendor.supplierName}>
                                        {vendor.supplierName}
                                      </p>
                                      <span className="text-[10px] text-muted-foreground block mt-0.5">
                                        رقم العرض: {vendor.quotationNumber}
                                      </span>
                                    </div>
                                    <Badge 
                                      variant="outline" 
                                      className={cn(
                                        "text-[10px] py-0 px-2 font-bold shrink-0",
                                        vendor.awardedCount > 0 
                                          ? "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border-emerald-300" 
                                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                      )}
                                    >
                                      {vendor.awardedCount} من {vendor.offeredCount} بند معتمد
                                    </Badge>
                                  </div>

                                  <div className="flex items-center justify-between text-xs pt-1 border-t border-border/60">
                                    <div>
                                      <span className="text-[10px] text-muted-foreground block">مبلغ الترسية:</span>
                                      <span className="font-extrabold text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-0.5">
                                        {vendor.awardedTotal.toLocaleString("ar-SA")} <SaudiRiyal className="w-3 h-3 inline" />
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      {vendor.awardedCount < vendor.offeredCount && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleAwardAllForVendor(vendor.quotationId)}
                                          className="h-7 text-[11px] px-2.5 bg-background border-emerald-600/40 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 hover:border-emerald-500"
                                          title="ترسية جميع البنود التي قدم فيها هذا المورد عرضاً"
                                        >
                                          ترسية كل بنوده ({vendor.offeredCount})
                                        </Button>
                                      )}
                                      {vendor.awardedCount > 0 && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleClearVendorAward(vendor.quotationId)}
                                          className="h-7 text-[11px] px-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                          title="إلغاء ترسية بنود هذا المورد"
                                        >
                                          إلغاء الترسية
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 3. شريط التحكم الذكي والفلترة للبنود */}
                      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 bg-muted/20 dark:bg-slate-900/60 rounded-xl border border-border">
                        {/* حقل البحث */}
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

                        {/* أزرار الإجراءات وتبديل نمط العرض */}
                        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleResetAllSelections}
                            className="h-8 text-xs px-2.5 text-muted-foreground hover:text-red-600 hover:border-red-300 gap-1.5"
                            title="إلغاء كافة الاختيارات وإعادة ضبط الجدول"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            إعادة ضبط
                          </Button>

                          <div className="flex items-center border border-border rounded-lg p-0.5 bg-background">
                            <Button
                              size="sm"
                              variant={viewMode === "matrix" ? "default" : "ghost"}
                              onClick={() => setViewMode("matrix")}
                              className="h-7 px-2.5 text-xs gap-1 rounded-md"
                              title="عرض مصفوفة المقارنة الشاملة للموردين"
                            >
                              <LayoutGrid className="h-3.5 w-3.5" />
                              مصفوفة المقارنة
                            </Button>
                            <Button
                              size="sm"
                              variant={viewMode === "table" ? "default" : "ghost"}
                              onClick={() => setViewMode("table")}
                              className="h-7 px-2.5 text-xs gap-1 rounded-md"
                              title="عرض الجدول التفصيلي للبنود"
                            >
                              <ListFilter className="h-3.5 w-3.5" />
                              جدول تفصيلي
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* 4. محتوى البنود وفق نمط العرض المحدد */}
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
                      ) : viewMode === "matrix" ? (
                        /* ==================== نمط مصفوفة المقارنة ==================== */
                        <div className="border border-border rounded-xl overflow-hidden bg-card shadow-xs">
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/40 border-b-2 border-slate-300 dark:border-slate-700">
                                  <TableHead className="w-12 text-center font-bold">#</TableHead>
                                  <TableHead className="font-bold min-w-[220px]">البند والمواصفات</TableHead>
                                  <TableHead className="text-center font-bold min-w-[100px]">الكمية</TableHead>
                                  
                                  {/* أعمدة الموردين المشاركين */}
                                  {participatingVendors.map(vendor => (
                                    <TableHead key={vendor.quotationId} className="min-w-[190px] text-center p-2.5 border-r border-slate-200 dark:border-slate-800">
                                      <div className="font-bold text-xs text-foreground truncate" title={vendor.supplierName}>
                                        {vendor.supplierName}
                                      </div>
                                      <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center justify-center gap-1.5">
                                        <span>إجمالي: {vendor.totalAmount.toLocaleString("ar-SA")} ر.س</span>
                                        <span className="text-emerald-700 dark:text-emerald-400 font-bold">({vendor.awardedCount} معتمد)</span>
                                      </div>
                                    </TableHead>
                                  ))}

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
                                  const currentWinningQId = selectedWinningVendors[item.id];
                                  const currentWinningOffer = itemOffers.find(o => o.quotation.id === currentWinningQId);

                                  return (
                                    <TableRow key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                                      <TableCell className="text-center font-semibold text-muted-foreground">{index + 1}</TableCell>
                                      <TableCell className="align-middle">
                                        <div className="font-bold text-xs text-foreground leading-snug">{item.itemName}</div>
                                        {item.itemDescription && (
                                          <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1" title={item.itemDescription}>
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

                                      {/* خلايا الموردين لكل بند */}
                                      {participatingVendors.map(vendor => {
                                        const vOffer = getOfferForItem(item, vendor.quotation, boqData.items.length);
                                        const hasOffer = Boolean(vOffer);
                                        const isLowest = Boolean(vOffer && minUnitPrice !== null && vOffer.unitPrice === minUnitPrice);
                                        const isSelected = currentWinningQId === vendor.quotationId;

                                        return (
                                          <TableCell key={vendor.quotationId} className="p-2 align-middle border-r border-slate-200 dark:border-slate-800">
                                            {vOffer && hasOffer ? (
                                              <div
                                                onClick={() => {
                                                  setSelectedWinningVendors(prev => {
                                                    const updated = { ...prev };
                                                    if (isSelected) {
                                                      delete updated[item.id];
                                                    } else {
                                                      updated[item.id] = vendor.quotationId;
                                                    }
                                                    return updated;
                                                  });
                                                }}
                                                className={cn(
                                                  "p-2 rounded-lg border text-center transition-all duration-150 cursor-pointer select-none group",
                                                  isSelected
                                                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/80 shadow-2xs"
                                                    : isLowest
                                                      ? "bg-emerald-50/40 dark:bg-emerald-950/15 border-emerald-300 dark:border-emerald-800/60 hover:border-emerald-400 hover:shadow-2xs"
                                                      : "bg-background border-border hover:border-slate-400 dark:hover:border-slate-600"
                                                )}
                                                title={isSelected ? "انقر لإلغاء الترسية" : "انقر لاختيار هذا المورد لهذا البند"}
                                              >
                                                <div className="flex items-center justify-between gap-1 mb-1">
                                                  {isLowest ? (
                                                    <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[9px] py-0 px-1.5 h-4 gap-0.5 font-bold">
                                                      <Sparkles className="w-2.5 h-2.5" />
                                                      الأقل
                                                    </Badge>
                                                  ) : <span />}
                                                  {isSelected ? (
                                                    <Badge className="bg-emerald-700 hover:bg-emerald-700 text-white text-[9px] py-0 px-1.5 h-4 gap-0.5 font-bold">
                                                      <Check className="w-2.5 h-2.5" />
                                                      معتمد
                                                    </Badge>
                                                  ) : (
                                                    <span className="text-[10px] text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity">
                                                      اختر
                                                    </span>
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
                                        {currentWinningOffer ? (
                                          <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 shadow-2xs text-right relative group">
                                            <div className="flex items-center justify-between gap-1">
                                              <span className="font-bold text-xs text-emerald-800 dark:text-emerald-200 truncate" title={currentWinningOffer.quotation.supplierName}>
                                                {currentWinningOffer.quotation.supplierName || "المورد المعتمد"}
                                              </span>
                                              <button
                                                onClick={() => {
                                                  setSelectedWinningVendors(prev => {
                                                    const updated = { ...prev };
                                                    delete updated[item.id];
                                                    return updated;
                                                  });
                                                }}
                                                className="text-muted-foreground hover:text-red-600 p-0.5 rounded transition-colors"
                                                title="إلغاء الترسية لهذا البند"
                                              >
                                                <X className="h-3.5 w-3.5" />
                                              </button>
                                            </div>
                                            <div className="text-[11px] text-foreground font-bold mt-1 flex items-center justify-between">
                                              <span className="text-[10px] text-muted-foreground font-normal">سعر الوحدة:</span>
                                              <span>{currentWinningOffer.unitPrice.toLocaleString("ar-SA")} ر.س</span>
                                            </div>
                                            <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-extrabold flex items-center justify-between mt-0.5">
                                              <span className="text-[10px] text-muted-foreground font-normal">الإجمالي:</span>
                                              <span>{currentWinningOffer.totalPrice.toLocaleString("ar-SA")} ر.س</span>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="p-2 rounded-lg border border-dashed border-amber-300 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 text-center">
                                            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 block">بانتظار تحديد مورد</span>
                                            <span className="text-[9px] text-muted-foreground block mt-0.5">انقر على عرض المورد في الجدول</span>
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
                      ) : (
                        /* ==================== نمط الجدول التفصيلي ==================== */
                        <div className="border border-border rounded-xl overflow-hidden bg-card shadow-xs">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/40 border-b-2 border-slate-300 dark:border-slate-700">
                                <TableHead className="w-12 text-center font-bold">#</TableHead>
                                <TableHead className="font-bold">البند</TableHead>
                                <TableHead className="font-bold">الوصف والتصنيف</TableHead>
                                <TableHead className="font-bold">الوحدة</TableHead>
                                <TableHead className="text-center font-bold">الكمية</TableHead>
                                <TableHead className="font-bold min-w-[280px]">المورد وعرض السعر المعتمد</TableHead>
                                <TableHead className="text-center font-bold">سعر الوحدة</TableHead>
                                <TableHead className="text-center font-bold">الإجمالي</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-slate-200 dark:divide-slate-800">
                              {filteredBoqItems.map((item: any, index: number) => {
                                const offersForItem = allQuotations.flatMap((quotation: any) => {
                                  const offer = getOfferForItem(item, quotation, boqData.items.length);
                                  if (offer) {
                                    return [{
                                      quotation,
                                      unitPrice: offer.unitPrice,
                                      totalPrice: offer.totalPrice,
                                    }];
                                  }
                                  return [];
                                });

                                const minPrice = offersForItem.length > 0 ? Math.min(...offersForItem.map(o => o.unitPrice)) : null;
                                const currentQId = selectedWinningVendors[item.id];
                                const selectedOffer = offersForItem.find(o => o.quotation.id === currentQId);
                                const lowestOffer = offersForItem.find(o => o.unitPrice === minPrice);

                                const itemUnitNum = item.unitPrice !== undefined && item.unitPrice !== null && String(item.unitPrice).trim() !== "" ? parseFloat(String(item.unitPrice).replace(/,/g, '')) : null;
                                const itemTotalNum = item.totalPrice !== undefined && item.totalPrice !== null && String(item.totalPrice).trim() !== "" ? parseFloat(String(item.totalPrice).replace(/,/g, '')) : null;

                                const displayUnitPrice = selectedOffer 
                                  ? selectedOffer.unitPrice 
                                  : (itemUnitNum !== null && !isNaN(itemUnitNum) && itemUnitNum >= 0 ? itemUnitNum : null);

                                const displayTotalPrice = selectedOffer 
                                  ? selectedOffer.totalPrice 
                                  : (itemTotalNum !== null && !isNaN(itemTotalNum) && itemTotalNum >= 0 ? itemTotalNum : null);

                                return (
                                  <TableRow key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                                    <TableCell className="text-center font-semibold text-muted-foreground">{index + 1}</TableCell>
                                    <TableCell className="font-bold text-xs align-middle max-w-[240px]">
                                      <div className="whitespace-normal break-words leading-relaxed" title={item.itemName}>
                                        {item.itemName}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-xs">
                                      {item.itemDescription || "-"}
                                      {item.category && (
                                        <Badge variant="outline" className="text-[9px] py-0 px-1.5 block w-fit mt-1">
                                          {item.category}
                                        </Badge>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-xs">{item.unit || "عدد"}</TableCell>
                                    <TableCell className="text-center font-extrabold text-xs">
                                      {item.quantity ? parseFloat(item.quantity).toLocaleString("ar-SA") : ""}
                                    </TableCell>

                                    {/* قائمة الموردين المنسدلة لاختيار العرض المناسب */}
                                    <TableCell className="align-middle min-w-[280px]">
                                      {offersForItem.length > 0 ? (
                                        <div className="space-y-1.5">
                                          <Select
                                            value={currentQId ? String(currentQId) : ""}
                                            onValueChange={(val) => {
                                              setSelectedWinningVendors(prev => ({
                                                ...prev,
                                                [item.id]: parseInt(val)
                                              }));
                                            }}
                                          >
                                            <SelectTrigger className="h-9 text-xs bg-background text-right font-medium" dir="rtl">
                                              <SelectValue placeholder="اختر المورد والعرض المناسب..." />
                                            </SelectTrigger>
                                            <SelectContent dir="rtl" className="text-right">
                                              {offersForItem.map(({ quotation, unitPrice }: any) => {
                                                const isMin = minPrice !== null && unitPrice === minPrice;
                                                return (
                                                  <SelectItem key={quotation.id} value={String(quotation.id)} className="text-xs text-right cursor-pointer">
                                                    <div className="flex items-center justify-between gap-3 w-full font-medium">
                                                      <div className="flex items-center gap-1.5 truncate">
                                                        <span>{quotation.supplierName || "مورد"}</span>
                                                        {isMin && (
                                                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/80 px-1 rounded">
                                                            الأقل سعراً
                                                          </span>
                                                        )}
                                                      </div>
                                                      <span className="font-bold text-emerald-700 dark:text-emerald-400 mr-2 shrink-0">
                                                        {unitPrice.toLocaleString("ar-SA")} ر.س/وحدة
                                                      </span>
                                                    </div>
                                                  </SelectItem>
                                                );
                                              })}
                                            </SelectContent>
                                          </Select>

                                          {/* زر سريع لاختيار الأقل سعراً إذا لم يكن محدداً */}
                                          {lowestOffer && currentQId !== lowestOffer.quotation.id && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setSelectedWinningVendors(prev => ({
                                                  ...prev,
                                                  [item.id]: lowestOffer.quotation.id
                                                }));
                                              }}
                                              className="text-[10px] text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                                            >
                                              <Sparkles className="w-3 h-3" />
                                              اختيار الأقل سعراً: {lowestOffer.quotation.supplierName} ({lowestOffer.unitPrice.toLocaleString("ar-SA")} ر.س)
                                            </button>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-xs text-muted-foreground italic">لا توجد عروض أسعار بعد</span>
                                      )}
                                    </TableCell>

                                    <TableCell className="text-center font-bold text-xs">
                                      {displayUnitPrice !== null ? (
                                        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                                          {displayUnitPrice.toLocaleString("ar-SA")} <SaudiRiyal className="w-3 h-3" />
                                        </span>
                                      ) : "-"}
                                    </TableCell>
                                    <TableCell className="text-center font-bold text-xs">
                                      {displayTotalPrice !== null ? (
                                        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                                          {displayTotalPrice.toLocaleString("ar-SA")} <SaudiRiyal className="w-3 h-3" />
                                        </span>
                                      ) : "-"}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      )}

                      {/* 5. شريط الاعتماد المالي والترسية النهائي */}
                      <div className="p-4 bg-muted/40 dark:bg-slate-900/90 rounded-xl border border-border mt-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm" dir="rtl">
                        <div>
                          <h4 className="font-bold text-sm flex items-center gap-2 text-foreground">
                            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
                            اعتماد وترسية عروض الأسعار
                          </h4>
                          <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-muted-foreground">
                            <span>تم تحديد موردين لـ <strong className="text-foreground font-extrabold">{assignedItemsCount}</strong> من أصل <strong className="text-foreground">{totalBoqItemsCount}</strong> بند.</span>
                            {winningVendorsCount > 0 && (
                              <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded text-[11px]">
                                موزعة على {winningVendorsCount} موردين معتمدين
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-5 w-full md:w-auto justify-between md:justify-end">
                          <div className="text-right">
                            <span className="text-[11px] text-muted-foreground block">إجمالي مبالغ الترسية:</span>
                            <span className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1">
                              {totalSelectedItemsCost.toLocaleString("ar-SA")} <SaudiRiyal className="w-4 h-4 inline" />
                            </span>
                          </div>

                          {canApprove && (
                            <Button
                              onClick={() => setShowApprovalDialog(true)}
                              disabled={approveMultiVendorMutation.isPending || assignedItemsCount === 0}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 px-5 shadow-sm"
                            >
                              {approveMultiVendorMutation.isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
                              <CheckCircle2 className="h-4 w-4 ml-2" />
                              اعتماد وترسية عروض الأسعار ({assignedItemsCount} بند)
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* ==================== جدول مقارنة عروض الأسعار المفردة (بديل في حال عدم وجود بنود كميات) ==================== */}
                {hasQuotations && !hasBoq && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Receipt className="h-5 w-5" />
                        مقارنة عروض الأسعار
                      </CardTitle>
                      <CardDescription>
                        {requestDetails?.selectedQuotationId 
                          ? "تم اختيار العرض الفائز - يمكنك المتابعة للاعتماد المالي"
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
                              const isSelected = requestDetails?.selectedQuotationId 
                                ? quotation.id === requestDetails.selectedQuotationId 
                                : quotation.id === selectedQuotationId;
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
                                      value={requestDetails?.selectedQuotationId?.toString() || selectedQuotationId?.toString() || ""}
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

                        {/* زر اختيار العرض الفائز */}
                        {!requestDetails?.selectedQuotationId && canApprove && (
                          <div className="flex justify-end">
                            <Button 
                              onClick={() => {
                                if (!selectedQuotationId) {
                                  toast.error("يرجى اختيار عرض سعر");
                                  return;
                                }
                                selectWinningMutation.mutate({
                                  requestId: parseInt(selectedRequestId),
                                  quotationId: selectedQuotationId,
                                });
                              }}
                              disabled={!selectedQuotationId || selectWinningMutation.isPending}
                            >
                              {selectWinningMutation.isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
                              <CheckCircle2 className="h-4 w-4 ml-2" />
                              تأكيد اختيار العرض الفائز
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* ==================== ملخص الاعتماد المالي ==================== */}
                {hasSelectedQuotation && (
                  <Card className="border-primary/40 shadow-xs">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckSquare className="h-5 w-5 text-primary" />
                        ملخص الاعتماد المالي
                      </CardTitle>
                      <CardDescription>مراجعة التكلفة المعتمدة قبل الاعتماد النهائي والانتقال لمرحلة التعاقد</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {/* تفاصيل التكلفة */}
                        <div className="grid gap-4 md:grid-cols-2">
                          {/* جدول الكميات */}
                          <div className="p-4 bg-muted rounded-lg">
                            <div className="flex items-center gap-2 text-muted-foreground mb-2">
                              <Calculator className="h-4 w-4" />
                              <span>إجمالي جدول الكميات التقديري</span>
                            </div>
                            <p className="text-2xl font-bold inline-flex items-center gap-1.5">
                              {boqTotal.toLocaleString("ar-SA")} <SaudiRiyal className="w-5 h-5 inline" />
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">للمرجعية والتقدير</p>
                          </div>

                          {/* التكلفة المعتمدة */}
                          <div className="p-4 bg-primary/10 rounded-lg border border-primary">
                            <div className="flex items-center gap-2 text-primary mb-2">
                              <SaudiRiyal className="h-4 w-4" />
                              <span>التكلفة المعتمدة النهائية</span>
                            </div>
                            <p className="text-2xl font-bold text-primary inline-flex items-center gap-1.5">
                              {displayFinalCost.toLocaleString("ar-SA")} <SaudiRiyal className="w-5 h-5 inline" />
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {assignedItemsCount > 0 
                                ? `موزعة على ${winningVendorsCount} موردين معتمدين لـ ${assignedItemsCount} بند`
                                : `المورد: ${selectedQuotation?.supplierName || "غير محدد"}`}
                            </p>
                          </div>
                        </div>

                        {/* أزرار الإجراءات */}
                        <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
                          <Button 
                            variant="outline" 
                            onClick={() => navigate("/requests/" + selectedRequestId)}
                            className="w-full sm:w-auto order-2 sm:order-1"
                          >
                            <Eye className="h-4 w-4 ml-2" />
                            عرض تفاصيل الطلب
                          </Button>
                          {canApprove && (
                            <Button 
                              onClick={() => setShowApprovalDialog(true)}
                              className="w-full sm:w-auto order-1 sm:order-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              <CheckCircle2 className="h-4 w-4 ml-2" />
                              اعتماد مالياً وانتقال للتعاقد
                            </Button>
                          )}
                        </div>
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

                {assignedItemsCount > 0 ? (
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1.5">الموردين والبنود المعتمدة:</span>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {participatingVendors.filter(v => v.awardedCount > 0).map(v => (
                        <div key={v.quotationId} className="flex items-center justify-between text-xs bg-background p-2 rounded-lg border">
                          <span className="font-medium text-foreground">{v.supplierName} ({v.awardedCount} بند)</span>
                          <span className="font-bold text-emerald-700 dark:text-emerald-400">
                            {v.awardedTotal.toLocaleString("ar-SA")} ر.س
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <span className="text-muted-foreground">رقم العرض:</span>
                    <span className="font-medium">{selectedQuotation?.quotationNumber}</span>
                    <span className="text-muted-foreground">المورد:</span>
                    <span className="font-medium">{selectedQuotation?.supplierName || "غير محدد"}</span>
                  </div>
                )}
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
