import React, { useState, useEffect, useMemo } from "react";
import { useParams, useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowRight,
  Printer,
  FileSignature,
  ShoppingCart,
  HeartHandshake,
  CheckCircle2,
  Save,
  Building2,
  Edit,
  Plus,
  Loader2,
  Eye,
  Settings2,
  AlertTriangle,
  AlertCircle,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { useDocumentTitle } from "@/contexts/DocumentTitleContext";

type ProcurementMethod = "contract" | "purchase_order" | "csr_letter";

export default function SedanaProcurementPage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const requestId = parseInt(params.id || "0");
  const { user } = useAuth();

  useDocumentTitle(`تأمين بنود الطلب والتعاقد #${requestId} - سدانة`);

  // وضع العرض كامل الشاشة: إما القائمة الرئيسية "none" أو معاينة أمر الشراء "po" أو معاينة الخطاب "csr"
  const [fullScreenView, setFullScreenView] = useState<"none" | "po" | "csr">("none");

  // التحكم بإظهار لوحة تعديل البيانات في المعاينة كاملة الشاشة
  const [showEditControls, setShowEditControls] = useState(false);

  // التحكم في نافذة تأكيد الاعتماد والانتقال للتنفيذ
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // جلب تفاصيل الطلب
  const {
    data: request,
    isLoading: isRequestLoading,
    refetch: refetchRequest,
  } = trpc.requests.getById.useQuery(
    { id: requestId },
    { enabled: !!requestId && requestId > 0 }
  );

  // جلب إعدادات الجمعية
  const { data: orgSettings } = trpc.organization.getSettings.useQuery();

  // جلب المفوضين بالتوقيع في الجمعية
  const { data: signatoriesData = [] } = trpc.organization.getSignatories.useQuery(undefined, {
    staleTime: 10 * 60 * 1000,
  });

  // جلب بنود جدول الكميات
  const { data: boqResult } = trpc.projects.getBOQ.useQuery(
    { requestId },
    { enabled: !!requestId && requestId > 0 }
  );

  // جلب العقود المسجلة للطلب
  const { data: contractsList = [] } = trpc.contracts.getAllByRequestId.useQuery(
    { requestId },
    { enabled: !!requestId && requestId > 0 }
  );

  // جلب عروض الأسعار للطلب لاستخراج الموردين المعتمدين
  const { data: quotationsResult, isLoading: isQuotationsLoading } = trpc.projects.getQuotationsByRequest.useQuery(
    { requestId },
    { enabled: !!requestId && requestId > 0 }
  );

  // حفظ بيانات التأمين
  const saveProcurementMutation = trpc.requests.saveSedanaProcurement.useMutation({
    onSuccess: (res, vars) => {
      toast.success(res.message || "تم حفظ البيانات بنجاح");
      refetchRequest();
      if (vars.advanceToExecution) {
        setShowConfirmModal(false);
        setLocation(`/requests/${requestId}`);
      }
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء الحفظ");
    },
  });

  // استخراج بنود المسجد / الطلب
  const allItems = useMemo(() => {
    if (boqResult?.items && boqResult.items.length > 0) {
      return boqResult.items.map((it: any, idx: number) => ({
        id: String(it.id || idx + 1),
        itemName: it.itemName || it.name || `بند رقم ${idx + 1}`,
        description: it.description || "",
        quantity: parseFloat(it.quantity || "1"),
        unit: it.unit || "وحدة",
      }));
    }

    // fallback from sedana programData evaluation
    const pData = request?.programData as any;
    if (pData?.evaluation?.items && Array.isArray(pData.evaluation.items)) {
      return pData.evaluation.items.map((it: any, idx: number) => ({
        id: String(it.key || idx + 1),
        itemName: it.name || it.itemName || `بند ${idx + 1}`,
        description: it.description || it.spec || "",
        quantity: parseFloat(it.approvedQty || it.requestedQty || "1"),
        unit: it.unit || "وحدة",
      }));
    }

    if (pData?.basketItems && Array.isArray(pData.basketItems)) {
      return pData.basketItems.map((it: any, idx: number) => ({
        id: String(it.id || idx + 1),
        itemName: it.name || `بند ${idx + 1}`,
        description: it.description || it.category || "",
        quantity: parseFloat(it.quantity || "1"),
        unit: it.unit || "وحدة",
      }));
    }

    return [
      { id: "1", itemName: "صيانة ونظافة شاملة للمسجد وملحقاته", description: "تشغيل وصيانة ونظافة دورية معتمدة", quantity: 1, unit: "خدمة" },
      { id: "2", itemName: "سلة أدوات ومواد النظافة والتعقيم", description: "مواد وسوائل تنظيف ومطهرات ومباخر", quantity: 12, unit: "كرتون" },
      { id: "3", itemName: "صيانة وغسيل أجهزة التكييف", description: "تنظيف فلاتر وفحص غاز التبريد لجميع المكيفات", quantity: 8, unit: "مكيف" },
    ];
  }, [boqResult, request]);

  // دالة تنسيق المبالغ المالية
  const formatCurrency = (val: number | string | null | undefined) => {
    return Number(val || 0).toLocaleString("ar-SA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // استخراج عروض الأسعار المعتمدة للطلب
  const approvedQuotations = useMemo(() => {
    return (quotationsResult?.quotations || []).filter(
      (q: any) => q.status === "accepted" || q.status === "approved"
    );
  }, [quotationsResult]);

  // استخراج الترسية المحفوظة للأصناف في programData إن وجدت
  const awardedItemVendors = useMemo(() => {
    let raw = (request as any)?.programData?.awardedItemVendors;
    if (typeof raw === "string") {
      try { raw = JSON.parse(raw); } catch {}
    }
    return Array.isArray(raw) ? raw : [];
  }, [request]);

  // تجميع الموردين المعتمدين وربط أصنافهم
  const approvedSuppliers = useMemo(() => {
    if (approvedQuotations.length === 0 && awardedItemVendors.length === 0) {
      return [];
    }

    const groupsMap = new Map<string, {
      key: string;
      supplierId?: number;
      supplierName: string;
      quotationId?: number;
      quotationNumber?: string;
      items: Array<{
        id: string;
        itemName: string;
        description: string;
        quantity: number;
        unit: string;
        unitPrice?: number;
        totalPrice?: number;
      }>;
      totalAmount: number;
      isUnassigned?: boolean;
    }>();

    // 1. إضافة المجموعات الأولية من عروض الأسعار المعتمدة
    approvedQuotations.forEach((q: any) => {
      const key = `quo_${q.id}`;
      groupsMap.set(key, {
        key,
        supplierId: q.supplierId,
        supplierName: q.supplierName || `مورد عرض #${q.quotationNumber || q.id}`,
        quotationId: q.id,
        quotationNumber: q.quotationNumber,
        items: [],
        totalAmount: 0,
      });
    });

    const matchedItemIds = new Set<string>();

    // 2. مطابقة كل صنف مع المورد المعتمد له
    allItems.forEach((it: any) => {
      let matchedKey: string | null = null;
      let itemUnitPrice = 0;
      let itemTotalPrice = 0;

      // أ) المطابقة عبر awardedItemVendors
      if (awardedItemVendors.length > 0) {
        const award = awardedItemVendors.find(
          (a: any) => String(a.boqItemId) === String(it.id)
        );
        if (award) {
          if (award.quotationId && groupsMap.has(`quo_${award.quotationId}`)) {
            matchedKey = `quo_${award.quotationId}`;
          } else {
            groupsMap.forEach((grp, k) => {
              if (!matchedKey && grp.supplierName === award.supplierName) {
                matchedKey = k;
              }
            });
            if (!matchedKey && award.supplierName) {
              matchedKey = `award_${award.supplierName}`;
              groupsMap.set(matchedKey, {
                key: matchedKey,
                supplierName: award.supplierName,
                quotationId: award.quotationId,
                items: [],
                totalAmount: 0,
              });
            }
          }
          itemUnitPrice = parseFloat(award.unitPrice || 0);
          itemTotalPrice = parseFloat(award.totalPrice || 0);
        }
      }

      // ب) المطابقة عبر بنود عروض الأسعار المسعرة
      if (!matchedKey && approvedQuotations.length > 0) {
        for (const q of approvedQuotations) {
          let qItems: any[] = [];
          if (Array.isArray(q.items)) qItems = q.items;
          else if (typeof q.items === "string") {
            try { qItems = JSON.parse(q.items); } catch {}
          }
          const qItem = qItems.find((qi: any) => {
            const qiId = qi.boqItemId ?? qi.boq_item_id ?? qi.itemId ?? qi.id;
            if (qiId !== undefined && String(qiId) === String(it.id)) return true;
            const qiName = String(qi.itemName ?? qi.name ?? "").trim().toLowerCase();
            const targetName = String(it.itemName || "").trim().toLowerCase();
            return qiName && targetName && (qiName === targetName || targetName.includes(qiName));
          });

          if (qItem) {
            matchedKey = `quo_${q.id}`;
            itemUnitPrice = parseFloat(qItem.unitPrice || qItem.price || 0);
            itemTotalPrice = parseFloat(qItem.totalPrice || (itemUnitPrice * it.quantity) || 0);
            break;
          }
        }
      }

      // ج) في حال كان هناك عرض معتمد واحد فقط، تُسند الأصناف كاملة له
      if (!matchedKey && approvedQuotations.length === 1) {
        matchedKey = `quo_${approvedQuotations[0].id}`;
      }

      if (matchedKey && groupsMap.has(matchedKey)) {
        const grp = groupsMap.get(matchedKey)!;
        grp.items.push({
          ...it,
          unitPrice: itemUnitPrice,
          totalPrice: itemTotalPrice,
        });
        grp.totalAmount += itemTotalPrice;
        matchedItemIds.add(String(it.id));
      }
    });

    const result = Array.from(groupsMap.values()).filter(g => g.items.length > 0);

    // د) البنود غير المسندة لأي مورد (إن وجدت) تُجمع في مسار للمسؤولية المجتمعية أو التأمين المباشر
    const unassigned = allItems.filter((it: any) => !matchedItemIds.has(String(it.id)));
    if (unassigned.length > 0 && result.length > 0) {
      result.push({
        key: "unassigned",
        supplierName: "أصناف غير مسندة لمورد (مسؤولية مجتمعية / تأمين مباشر)",
        items: unassigned,
        totalAmount: 0,
        isUnassigned: true,
      });
    }

    return result;
  }, [approvedQuotations, awardedItemVendors, allItems]);

  // حالة تحديد مسار التأمين للموردين المعتمدين (supplierKey -> ProcurementMethod)
  const [suppliersAllocation, setSuppliersAllocation] = useState<Record<string, ProcurementMethod>>({});
  
  // حالة fallback لتخصيص البنود يدوياً في حال عدم وجود موردين
  const [manualItemsAllocation, setManualItemsAllocation] = useState<Record<string, ProcurementMethod>>({});

  // مورد محدد لعرض أصنافه في نافذة منبثقة (مودال) بسيطة
  const [selectedSupplierForModal, setSelectedSupplierForModal] = useState<any | null>(null);

  // بيانات أمر الشراء الداخلي
  const [poData, setPoData] = useState({
    orderNumber: `PO-${requestId}-${new Date().getFullYear()}`,
    orderDate: new Date().toISOString().split("T")[0],
    directedTo: "إلى إدارة المشتريات",
    requesterName: "",
    requesterRole: "طالب الشراء / إدارة المشاريع",
    approverName: "",
    approverRole: "المدير التنفيذي",
    approverSignatureUrl: "",
    notes: "",
  });

  // بيانات خطاب المسؤولية المجتمعية
  const [csrData, setCsrData] = useState({
    letterNumber: `CSR-${requestId}-${new Date().getFullYear()}`,
    letterDate: new Date().toISOString().split("T")[0],
    salutation: "السادة",
    recipientName: "",
    honorific: "المحترمون",
    projectName: "",
    signatoryTitle: "المدير التنفيذي",
    signatoryName: "",
    additionalNotes: "",
  });

  // قراءة البيانات المحفوظة سابقاً
  useEffect(() => {
    if (!request) return;

    try {
      let pData = request.programData as any;
      if (typeof pData === "string") {
        try {
          pData = JSON.parse(pData);
        } catch {
          pData = {};
        }
      }

      const savedProc = pData?.sedanaProcurement;
      if (savedProc) {
        if (savedProc.suppliersAllocation) {
          setSuppliersAllocation(savedProc.suppliersAllocation);
        }
        if (savedProc.itemsAllocation) {
          setManualItemsAllocation(savedProc.itemsAllocation);
        }
        if (savedProc.activePurchaseOrder) {
          setPoData(prev => ({ ...prev, ...savedProc.activePurchaseOrder }));
        }
        if (savedProc.activeCsrLetter) {
          setCsrData(prev => ({ ...prev, ...savedProc.activeCsrLetter }));
        }
      }
    } catch (e) {
      console.error("Error loading sedanaProcurement:", e);
    }
  }, [request]);

  // تهيئة وتزامن تخصيص الموردين تلقائياً
  useEffect(() => {
    if (approvedSuppliers.length > 0) {
      const savedProc = (request as any)?.programData?.sedanaProcurement;
      const savedSuppliers = savedProc?.suppliersAllocation;
      const savedItems = savedProc?.itemsAllocation;

      setSuppliersAllocation(prev => {
        const updated = { ...prev };
        let hasChanges = false;

        approvedSuppliers.forEach(sup => {
          if (!updated[sup.key]) {
            if (savedSuppliers && savedSuppliers[sup.key]) {
              updated[sup.key] = savedSuppliers[sup.key];
              hasChanges = true;
            } else if (savedItems && sup.items.length > 0) {
              const firstMethod = sup.items.map((it: any) => savedItems[it.id]).find(Boolean);
              updated[sup.key] = (firstMethod as ProcurementMethod) || (sup.isUnassigned ? "csr_letter" : "contract");
              hasChanges = true;
            } else {
              updated[sup.key] = sup.isUnassigned ? "csr_letter" : "contract";
              hasChanges = true;
            }
          }
        });

        return hasChanges ? updated : prev;
      });
    }
  }, [approvedSuppliers, request]);

  // ربط الأصناف تلقائياً بمسار المورد المعتمد التابعة له
  const itemsAllocation = useMemo<Record<string, ProcurementMethod>>(() => {
    if (approvedSuppliers.length === 0) {
      return manualItemsAllocation;
    }

    const alloc: Record<string, ProcurementMethod> = {};
    approvedSuppliers.forEach((sup: any) => {
      const method = suppliersAllocation[sup.key] || (sup.isUnassigned ? "csr_letter" : "contract");
      sup.items.forEach((it: any) => {
        alloc[it.id] = method;
      });
    });

    allItems.forEach((it: any) => {
      if (!alloc[it.id]) {
        alloc[it.id] = "contract";
      }
    });

    return alloc;
  }, [approvedSuppliers, suppliersAllocation, manualItemsAllocation, allItems]);

  // البنود المخصصة لكل طريقة بدقة
  const contractItems = useMemo(() => {
    return allItems.filter((it: any) => (itemsAllocation[it.id] || "contract") === "contract");
  }, [allItems, itemsAllocation]);

  const poItems = useMemo(() => {
    return allItems.filter((it: any) => itemsAllocation[it.id] === "purchase_order");
  }, [allItems, itemsAllocation]);

  const csrItems = useMemo(() => {
    return allItems.filter((it: any) => itemsAllocation[it.id] === "csr_letter");
  }, [allItems, itemsAllocation]);

  // الموردون المخصصون لكل طريقة
  const contractSuppliers = useMemo(() => {
    return approvedSuppliers.filter(s => !s.isUnassigned && (suppliersAllocation[s.key] || "contract") === "contract");
  }, [approvedSuppliers, suppliersAllocation]);

  const poSuppliers = useMemo(() => {
    return approvedSuppliers.filter(s => !s.isUnassigned && suppliersAllocation[s.key] === "purchase_order");
  }, [approvedSuppliers, suppliersAllocation]);

  const csrSuppliers = useMemo(() => {
    return approvedSuppliers.filter(s => suppliersAllocation[s.key] === "csr_letter");
  }, [approvedSuppliers, suppliersAllocation]);

  // تغيير طريقة التأمين لمورد معين
  const handleSupplierAllocationChange = (supplierKey: string, method: ProcurementMethod) => {
    setSuppliersAllocation(prev => ({
      ...prev,
      [supplierKey]: method,
    }));
  };

  // تهيئة أسماء المسؤولين من النظام
  useEffect(() => {
    const mosqueName = request?.mosque?.name || "المسجد";
    const projName = `مشروع جامع ${mosqueName}`;

    if (!poData.requesterName && user?.name) {
      setPoData(prev => ({ ...prev, requesterName: user.name || "" }));
    }

    if (!poData.approverName && signatoriesData.length > 0) {
      const exec = signatoriesData.find((s: any) => s.roleTitle?.includes("تنفيذي") || s.roleTitle?.includes("مدير")) || signatoriesData[0];
      if (exec) {
        setPoData(prev => ({
          ...prev,
          approverName: exec.name,
          approverRole: exec.roleTitle || "المدير التنفيذي",
          approverSignatureUrl: exec.signatureUrl || "",
        }));
      }
    }

    if (!csrData.projectName) {
      setCsrData(prev => ({ ...prev, projectName: projName }));
    }

    if (!csrData.signatoryName && signatoriesData.length > 0) {
      const exec = signatoriesData.find((s: any) => s.roleTitle?.includes("تنفيذي") || s.roleTitle?.includes("مدير")) || signatoriesData[0];
      if (exec) {
        setCsrData(prev => ({
          ...prev,
          signatoryName: exec.name,
          signatoryTitle: exec.roleTitle || "المدير التنفيذي",
        }));
      }
    }
  }, [request, user, signatoriesData]);

  // حفظ التجزئة والبيانات
  const handleSaveProcurement = (advanceStage: boolean = false) => {
    saveProcurementMutation.mutate({
      requestId,
      procurementData: {
        suppliersAllocation,
        itemsAllocation,
        activePurchaseOrder: poData,
        activeCsrLetter: csrData,
        notes: `تحديد طرق التأمين للموردين (${contractItems.length} عقد، ${poItems.length} أمر شراء، ${csrItems.length} مسؤولية مجتمعية)`,
      },
      advanceToExecution: advanceStage,
    });
  };

  // الانتقال لإنشاء عقد مع حفظ التخصيص الحالي تلقائياً
  const handleCreateContract = (supplierId?: number) => {
    handleSaveProcurement(false);
    const query = supplierId ? `requestId=${requestId}&supplierId=${supplierId}` : `requestId=${requestId}`;
    setLocation(`/contracts/new?${query}`);
  };

  // طباعة المستند
  const handlePrint = () => {
    window.print();
  };

  const mosqueName = request?.mosque?.name || "المسجد";
  const orgName = orgSettings?.officialReportsName || orgSettings?.organizationName || "جمعية عمارة المساجد";

  if (isRequestLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6" dir="rtl">
        <div className="bg-card p-6 rounded-xl border border-border shadow-xs flex flex-col items-center gap-3 text-center max-w-sm">
          <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
          <p className="text-sm font-bold text-foreground">جاري تحميل بيانات الطلب والبنود...</p>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 1. شاشة المعاينة كاملة الشاشة لأمر الشراء الداخلي
  // =========================================================================
  if (fullScreenView === "po") {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-slate-950 py-3 sm:py-8 print:py-0 print:bg-white text-right font-sans" dir="rtl">
        {/* شريط التحكم العلوي المقاوم للطباعة */}
        <div className="print:hidden w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-border p-3 sticky top-0 z-50 shadow-xs sm:fixed sm:top-4 sm:right-4 sm:w-auto sm:bg-transparent sm:backdrop-blur-none sm:border-0 sm:p-0 sm:shadow-none">
          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 max-w-6xl mx-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFullScreenView("none")}
              className="h-8 sm:h-9 bg-white dark:bg-slate-800 border shadow-xs font-bold text-xs sm:text-sm gap-1.5 cursor-pointer"
            >
              <ArrowRight className="h-4 w-4" />
              <span>رجوع إلى جدول التأمين</span>
            </Button>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowEditControls(!showEditControls)}
              className="h-8 sm:h-9 bg-white dark:bg-slate-800 border shadow-xs text-xs font-bold gap-1.5"
            >
              <Settings2 className="h-4 w-4 text-sky-600" />
              <span>{showEditControls ? "إخفاء التعديل" : "تعديل البيانات"}</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSaveProcurement(false)}
              disabled={saveProcurementMutation.isPending}
              className="h-8 sm:h-9 bg-white dark:bg-slate-800 border shadow-xs text-xs font-bold gap-1.5"
            >
              <Save className="h-4 w-4 text-sky-600" />
              <span>حفظ البيانات</span>
            </Button>

            <Button
              size="sm"
              onClick={handlePrint}
              className="h-8 sm:h-9 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs sm:text-sm gap-1.5 shadow-md cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>تنزيل PDF / طباعة</span>
            </Button>
          </div>
        </div>

        {/* لوحة التعديل السريع (تظهر عند الضغط على زر تعديل البيانات) */}
        {showEditControls && (
          <div className="max-w-4xl mx-auto px-4 mb-4 print:hidden animate-in fade-in-50 duration-200">
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-border shadow-md space-y-3">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Edit className="w-3.5 h-3.5 text-sky-600" />
                تعديل بيانات أمر الشراء الداخلي
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <Label className="text-[11px] mb-1 block text-muted-foreground">رقم أمر الشراء</Label>
                  <Input
                    value={poData.orderNumber}
                    onChange={(e) => setPoData(prev => ({ ...prev, orderNumber: e.target.value }))}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div>
                  <Label className="text-[11px] mb-1 block text-muted-foreground">تاريخ الأمر</Label>
                  <Input
                    type="date"
                    value={poData.orderDate}
                    onChange={(e) => setPoData(prev => ({ ...prev, orderDate: e.target.value }))}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px] mb-1 block text-muted-foreground">الموجه إليه</Label>
                  <Input
                    value={poData.directedTo}
                    onChange={(e) => setPoData(prev => ({ ...prev, directedTo: e.target.value }))}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px] mb-1 block text-muted-foreground">اسم طالب الشراء</Label>
                  <Input
                    value={poData.requesterName}
                    onChange={(e) => setPoData(prev => ({ ...prev, requesterName: e.target.value }))}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px] mb-1 block text-muted-foreground">اسم صاحب الصلاحية (الاعتماد)</Label>
                  <Input
                    value={poData.approverName}
                    onChange={(e) => setPoData(prev => ({ ...prev, approverName: e.target.value }))}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    size="sm"
                    onClick={() => {
                      handleSaveProcurement(false);
                      setShowEditControls(false);
                    }}
                    className="h-8 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white w-full"
                  >
                    حفظ التعديلات
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ورقة أمر الشراء A4 المتموضعة في منتصف الشاشة */}
        <div className="print-container w-full max-w-full sm:max-w-[210mm] mx-auto bg-white shadow-xl print:shadow-none p-6 sm:p-10 print:p-0 min-h-auto sm:min-h-[297mm] relative flex flex-col justify-between overflow-hidden">
          {/* الإطار المزدوج الرسمي لبرنامج سدانة */}
          <div className="print-inner border-[2px] sm:border-[2.5px] border-[#0284c7] p-5 sm:p-8 rounded-lg relative bg-white h-full flex-1 flex flex-col justify-between min-h-auto sm:min-h-[285mm] leading-relaxed">
            <div className="absolute inset-1 border border-[#38bdf8]/40 rounded pointer-events-none" />

            <div className="relative z-10 space-y-6 flex-1">
              {/* الترويسة العلوية الرسمية */}
              <div className="flex justify-between items-start border-b border-slate-300 pb-4">
                <div className="flex items-center gap-3">
                  {orgSettings?.logoUrl ? (
                    <img src={orgSettings.logoUrl} alt="شعار الجمعية" className="h-16 sm:h-20 w-auto object-contain" />
                  ) : (
                    <div className="w-16 h-16 bg-sky-50 border border-sky-200 rounded-lg flex items-center justify-center text-sky-700 font-bold text-xl">
                      سدانة
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-base sm:text-lg text-sky-900">{orgName}</h3>
                    <p className="text-xs text-slate-500 font-medium">إدارة المشاريع والمشتريات • برنامج سدانة</p>
                  </div>
                </div>

                <div className="text-xs space-y-1 text-left font-mono">
                  <div><span className="text-slate-500">رقم الأمر: </span><strong>{poData.orderNumber}</strong></div>
                  <div><span className="text-slate-500">التاريخ: </span><strong>{poData.orderDate}</strong></div>
                  <div><span className="text-slate-500">رقم الطلب: </span><strong>#{request?.requestNumber || requestId}</strong></div>
                </div>
              </div>

              {/* شريط العنوان السماوي */}
              <div className="bg-[#0284c7] text-white font-bold text-center py-2 px-4 rounded text-sm sm:text-base shadow-2xs">
                أمر شراء داخلي (نموذج طلب شراء)
              </div>

              {/* سطر الموجه إليه والمسجد */}
              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded text-xs flex items-center justify-between">
                <div>
                  <span className="text-slate-500">موجه إلى: </span>
                  <strong className="text-slate-900">{poData.directedTo}</strong>
                </div>
                <div>
                  <span className="text-slate-500">المشروع / المسجد: </span>
                  <strong className="text-slate-900">{mosqueName} {request?.mosque?.city ? `(${request.mosque.city})` : ""}</strong>
                </div>
              </div>

              {/* جدول الأصناف (خالٍ تماماً من أي أسعار - يظهر فقط البنود المخصصة لأمر الشراء) */}
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-slate-700">
                  نأمل تأمين الأصناف والبنود الموضحة أدناه لصالح المشروع المذكور:
                </p>

                <table className="w-full border-collapse border border-slate-300 text-xs text-right">
                  <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                    <tr>
                      <th className="p-2 border-l border-slate-300 text-center w-12">م</th>
                      <th className="p-2 border-l border-slate-300 w-1/3">الصنف المطلوب</th>
                      <th className="p-2 border-l border-slate-300">الوصف والمواصفات</th>
                      <th className="p-2 border-l border-slate-300 text-center w-20">الكمية</th>
                      <th className="p-2 text-center w-20">الوحدة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                    {poItems.length > 0 ? (
                      poItems.map((it: any, idx: number) => (
                        <tr key={it.id} className="h-9">
                          <td className="p-2 border-l border-slate-300 text-center font-mono text-slate-600">{idx + 1}</td>
                          <td className="p-2 border-l border-slate-300 font-bold text-slate-900">{it.itemName}</td>
                          <td className="p-2 border-l border-slate-300 text-slate-700">{it.description || "-"}</td>
                          <td className="p-2 border-l border-slate-300 text-center font-bold text-slate-900">{it.quantity}</td>
                          <td className="p-2 text-center text-slate-700">{it.unit}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500 font-medium">
                          لم يتم تخصيص أي بنود لأمر الشراء الداخلي حتى الآن. يرجى الرجوع لجدول التأمين وتحديد البنود المطلوبة.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* جدول التوقيعات والاعتماد المطابق تماماً لأمر الصرف */}
              <div className="pt-4 break-inside-avoid">
                <table className="w-full border-collapse border border-slate-300 text-xs text-center">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800">
                      <th className="p-2 border-l border-slate-300 w-1/4">الوظيفة</th>
                      <th className="p-2 border-l border-slate-300 w-1/4">الاسم</th>
                      <th className="p-2 border-l border-slate-300 w-1/4">التوقيع</th>
                      <th className="p-2 w-1/4">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* طالب الشراء */}
                    <tr className="border-b border-slate-300 h-14 sm:h-16">
                      <td className="p-2 border-l border-slate-300 font-bold text-slate-700">{poData.requesterRole}</td>
                      <td className="p-2 border-l border-slate-300 font-bold text-slate-900">{poData.requesterName || "طالب الشراء"}</td>
                      <td className="p-2 border-l border-slate-300">
                        <div className="h-8 border-b border-dashed border-gray-300 mx-auto w-24 sm:w-32"></div>
                      </td>
                      <td className="p-2 text-slate-600 font-medium text-[11px]">{poData.orderDate}</td>
                    </tr>

                    {/* صاحب الصلاحية (المدير التنفيذي) */}
                    <tr className="h-14 sm:h-16">
                      <td className="p-2 border-l border-slate-300 font-bold text-slate-700">{poData.approverRole}</td>
                      <td className="p-2 border-l border-slate-300 font-bold text-slate-900">{poData.approverName || "المدير التنفيذي"}</td>
                      <td className="p-2 border-l border-slate-300">
                        {poData.approverSignatureUrl ? (
                          <img src={poData.approverSignatureUrl} alt="التوقيع" className="max-h-11 mx-auto object-contain" />
                        ) : (
                          <div className="h-8 border-b border-dashed border-gray-300 mx-auto w-24 sm:w-32"></div>
                        )}
                      </td>
                      <td className="p-2 text-slate-600 font-medium text-[11px]">{poData.orderDate}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* تذييل أمر الشراء */}
            <div className="mt-8 pt-4 border-t border-slate-200 text-center text-slate-400 text-[10px] flex justify-between items-center px-1">
              <span>{orgName} - سدانة</span>
              <span>الرمز المرجعي: #{request?.requestNumber || requestId} • صفحة 1 من 1</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. شاشة المعاينة كاملة الشاشة لخطاب المسؤولية المجتمعية
  // =========================================================================
  if (fullScreenView === "csr") {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-slate-950 py-3 sm:py-8 print:py-0 print:bg-white text-right font-sans" dir="rtl">
        {/* شريط التحكم العلوي المقاوم للطباعة */}
        <div className="print:hidden w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-border p-3 sticky top-0 z-50 shadow-xs sm:fixed sm:top-4 sm:right-4 sm:w-auto sm:bg-transparent sm:backdrop-blur-none sm:border-0 sm:p-0 sm:shadow-none">
          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 max-w-6xl mx-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFullScreenView("none")}
              className="h-8 sm:h-9 bg-white dark:bg-slate-800 border shadow-xs font-bold text-xs sm:text-sm gap-1.5 cursor-pointer"
            >
              <ArrowRight className="h-4 w-4" />
              <span>رجوع إلى جدول التأمين</span>
            </Button>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowEditControls(!showEditControls)}
              className="h-8 sm:h-9 bg-white dark:bg-slate-800 border shadow-xs text-xs font-bold gap-1.5"
            >
              <Settings2 className="h-4 w-4 text-sky-600" />
              <span>{showEditControls ? "إخفاء التعديل" : "تعديل البيانات"}</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSaveProcurement(false)}
              disabled={saveProcurementMutation.isPending}
              className="h-8 sm:h-9 bg-white dark:bg-slate-800 border shadow-xs text-xs font-bold gap-1.5"
            >
              <Save className="h-4 w-4 text-sky-600" />
              <span>حفظ البيانات</span>
            </Button>

            <Button
              size="sm"
              onClick={handlePrint}
              className="h-8 sm:h-9 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs sm:text-sm gap-1.5 shadow-md cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>تنزيل PDF / طباعة</span>
            </Button>
          </div>
        </div>

        {/* لوحة التعديل السريع للخطاب الرسمي */}
        {showEditControls && (
          <div className="max-w-4xl mx-auto px-4 mb-4 print:hidden animate-in fade-in-50 duration-200">
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-border shadow-md space-y-3">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Edit className="w-3.5 h-3.5 text-sky-600" />
                تعديل بيانات خطاب المسؤولية المجتمعية
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <Label className="text-[11px] mb-1 block text-muted-foreground">صيغة المخاطبة</Label>
                  <Select
                    value={csrData.salutation}
                    onValueChange={(val) => setCsrData(prev => ({ ...prev, salutation: val }))}
                  >
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="السادة">السادة</SelectItem>
                      <SelectItem value="السيد">السيد</SelectItem>
                      <SelectItem value="السيدة">السيدة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-2">
                  <Label className="text-[11px] mb-1 block text-muted-foreground">اسم الجهة أو الشركة الموجه إليها الخطاب</Label>
                  <Input
                    placeholder="مثال: شركة الراجحي المصرفية للاستثمار"
                    value={csrData.recipientName}
                    onChange={(e) => setCsrData(prev => ({ ...prev, recipientName: e.target.value }))}
                    className="h-8 text-xs font-medium"
                  />
                </div>

                <div>
                  <Label className="text-[11px] mb-1 block text-muted-foreground">اللقب التقديري</Label>
                  <Select
                    value={csrData.honorific}
                    onValueChange={(val) => setCsrData(prev => ({ ...prev, honorific: val }))}
                  >
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="المحترمون">المحترمون</SelectItem>
                      <SelectItem value="المحترم">المحترم</SelectItem>
                      <SelectItem value="الموقر">الموقر</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-[11px] mb-1 block text-muted-foreground">رقم الخطاب</Label>
                  <Input
                    value={csrData.letterNumber}
                    onChange={(e) => setCsrData(prev => ({ ...prev, letterNumber: e.target.value }))}
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div>
                  <Label className="text-[11px] mb-1 block text-muted-foreground">تاريخ الخطاب</Label>
                  <Input
                    type="date"
                    value={csrData.letterDate}
                    onChange={(e) => setCsrData(prev => ({ ...prev, letterDate: e.target.value }))}
                    className="h-8 text-xs"
                  />
                </div>

                <div>
                  <Label className="text-[11px] mb-1 block text-muted-foreground">اسم المفوض بالتوقيع</Label>
                  <Input
                    value={csrData.signatoryName}
                    onChange={(e) => setCsrData(prev => ({ ...prev, signatoryName: e.target.value }))}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="sm:col-span-3 flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => {
                      handleSaveProcurement(false);
                      setShowEditControls(false);
                    }}
                    className="h-8 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white px-6"
                  >
                    حفظ التعديلات
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ورقة الخطاب الرسمي A4 المتموضعة في منتصف الشاشة */}
        <div className="print-container w-full max-w-full sm:max-w-[210mm] mx-auto bg-white shadow-xl print:shadow-none p-6 sm:p-10 print:p-0 min-h-auto sm:min-h-[297mm] relative flex flex-col justify-between overflow-hidden">
          {/* الإطار المزدوج الفاخر */}
          <div className="print-inner border-[2px] sm:border-[2.5px] border-[#0284c7] p-5 sm:p-8 rounded-lg relative bg-white h-full flex-1 flex flex-col justify-between min-h-auto sm:min-h-[285mm] leading-relaxed">
            <div className="absolute inset-1 border border-[#38bdf8]/40 rounded pointer-events-none" />

            <div className="relative z-10 space-y-6 flex-1">
              {/* ترويسة الخطاب الرسمية */}
              <div className="flex justify-between items-start border-b border-slate-300 pb-4">
                <div className="flex items-center gap-3">
                  {orgSettings?.logoUrl ? (
                    <img src={orgSettings.logoUrl} alt="شعار الجمعية" className="h-16 sm:h-20 w-auto object-contain" />
                  ) : (
                    <div className="w-16 h-16 bg-sky-50 border border-sky-200 rounded-lg flex items-center justify-center text-sky-700 font-bold text-xl">
                      سدانة
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-base sm:text-lg text-sky-900">{orgName}</h3>
                    <p className="text-xs text-slate-500 font-medium">إدارة المسؤولية المجتمعية والشراكات • برنامج سدانة</p>
                  </div>
                </div>

                <div className="text-xs space-y-1 text-left font-mono">
                  <div><span className="text-slate-500">الرقم: </span><strong>{csrData.letterNumber}</strong></div>
                  <div><span className="text-slate-500">التاريخ: </span><strong>{csrData.letterDate}</strong></div>
                </div>
              </div>

              {/* المخاطبة: السادة / ... المحترمون (بدون أصحاب السعادة) */}
              <div className="pt-2 text-sm sm:text-base font-bold text-slate-900">
                <span>{csrData.salutation} / </span>
                <span className="border-b-2 border-dotted border-slate-400 px-2 text-sky-900">
                  {csrData.recipientName || "الجهة المانحة / الشريك المجتمعي"}
                </span>
                <span className="mr-3">{csrData.honorific}</span>
              </div>

              {/* الديباجة الحرفية المعتمدة */}
              <div className="text-xs sm:text-sm text-slate-800 leading-loose space-y-2">
                <p className="font-bold text-slate-900">السلام عليكم ورحمة الله وبركاته،،،</p>
                <p>
                  تجدون برفقه البنود المراد تأمينها لمشروع <strong>({csrData.projectName || `مشروع جامع ${mosqueName}`})</strong>، وحيث إنكم من الجهات الحريصة على بذل الخير وخدمة المجتمع، عليه نرفع لكم المتطلبات التي يحتاجها المشروع:
                </p>
              </div>

              {/* جدول الأصناف المرفقة (خالٍ تماماً من أي أسعار - يظهر فقط البنود المخصصة للمسؤولية المجتمعية) */}
              <div>
                <table className="w-full border-collapse border border-slate-300 text-xs text-right">
                  <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                    <tr>
                      <th className="p-2 border-l border-slate-300 text-center w-12">م</th>
                      <th className="p-2 border-l border-slate-300">الصنف والبيان</th>
                      <th className="p-2 border-l border-slate-300">الوصف والمواصفات</th>
                      <th className="p-2 border-l border-slate-300 text-center w-20">الكمية</th>
                      <th className="p-2 text-center w-20">الوحدة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                    {csrItems.length > 0 ? (
                      csrItems.map((it: any, idx: number) => (
                        <tr key={it.id} className="h-9">
                          <td className="p-2 border-l border-slate-300 text-center font-mono text-slate-600">{idx + 1}</td>
                          <td className="p-2 border-l border-slate-300 font-bold text-slate-900">{it.itemName}</td>
                          <td className="p-2 border-l border-slate-300 text-slate-700">{it.description || "-"}</td>
                          <td className="p-2 border-l border-slate-300 text-center font-bold text-slate-900">{it.quantity}</td>
                          <td className="p-2 text-center text-slate-700">{it.unit}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500 font-medium">
                          لم يتم تخصيص أي بنود للمسؤولية المجتمعية حتى الآن. يرجى الرجوع لجدول التأمين وتحديد البنود المطلوبة.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* عبارة الختام الحرفية */}
              <div className="pt-3 text-xs sm:text-sm font-bold text-slate-900">
                <p>وتقبلوا وافر التحية والتقدير،،،</p>
              </div>

              {/* خانة التوقيع والاعتماد الرسمي */}
              <div className="pt-8 flex justify-end">
                <div className="w-60 text-center space-y-2">
                  <p className="font-bold text-xs sm:text-sm text-slate-800">{csrData.signatoryTitle || "المدير التنفيذي"}</p>
                  <div className="h-14 flex items-center justify-center">
                    <div className="border-b border-dashed border-slate-400 w-40 mx-auto" />
                  </div>
                  <p className="font-bold text-xs sm:text-sm text-slate-900">{csrData.signatoryName || "المهندس المفوض بالتوقيع"}</p>
                </div>
              </div>
            </div>

            {/* تذييل الخطاب الفاخر */}
            <div className="mt-8 pt-4 border-t border-slate-200 text-center text-slate-400 text-[10px] flex justify-between items-center px-1">
              <span>{orgName} - سدانة</span>
              <span>الرمز المرجعي: #{request?.requestNumber || requestId} • صفحة 1 من 1</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 3. الشاشة الرئيسية لتخصيص البنود (الجدول والبطاقات الثلاثة)
  // =========================================================================
  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-background text-right pb-16 font-sans" dir="rtl">
      {/* الشريط العلوي البسيط والنظيف - بهوية سدانة السماوية */}
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border shadow-2xs print:hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation(`/requests/${requestId}`)}
              className="gap-1.5 text-xs font-semibold cursor-pointer border-border hover:bg-muted"
            >
              <ArrowRight className="w-4 h-4" />
              <span>العودة للطلب</span>
            </Button>
            <div className="h-5 w-px bg-border hidden sm:block" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-foreground">
                  تأمين الطلب والتعاقد
                </h1>
                <Badge variant="outline" className="text-sky-700 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800 text-xs">
                  طلب #{request?.requestNumber || requestId}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                مسجد {mosqueName} {request?.mosque?.city ? `(${request.mosque.city})` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSaveProcurement(false)}
              disabled={saveProcurementMutation.isPending}
              className="h-8 gap-1.5 text-xs font-semibold border-border hover:bg-muted"
            >
              <Save className="w-3.5 h-3.5" />
              حفظ
            </Button>

            <Button
              size="sm"
              onClick={() => setShowConfirmModal(true)}
              disabled={saveProcurementMutation.isPending}
              className="h-8 gap-1.5 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              اعتماد التأمين والانتقال للتنفيذ
            </Button>
          </div>
        </div>
      </header>

      {/* المحتوى الرئيسي */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 print:hidden">

        {/* شريط الإحصائيات السريع لتوزيع البنود والموردين */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-card p-3 rounded-xl border border-border shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] text-muted-foreground">الموردون المعتمدون</p>
              <p className="text-lg font-bold text-foreground mt-0.5">
                {approvedSuppliers.filter(s => !s.isUnassigned).length} <span className="text-xs font-normal text-muted-foreground">({allItems.length} بند)</span>
              </p>
            </div>
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <Building2 className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white dark:bg-card p-3 rounded-xl border border-sky-100 dark:border-sky-900/40 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] text-sky-700 dark:text-sky-400">عقود التوريد</p>
              <p className="text-lg font-bold text-sky-800 dark:text-sky-200 mt-0.5">
                {contractSuppliers.length} <span className="text-xs font-normal">موردين</span> ({contractItems.length} صنف)
              </p>
            </div>
            <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-600">
              <FileSignature className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white dark:bg-card p-3 rounded-xl border border-border shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] text-slate-700 dark:text-slate-300">أوامر الشراء الداخلية</p>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {poSuppliers.length} <span className="text-xs font-normal">موردين</span> ({poItems.length} صنف)
              </p>
            </div>
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white dark:bg-card p-3 rounded-xl border border-sky-100 dark:border-sky-900/40 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] text-sky-700 dark:text-sky-400">المسؤولية المجتمعية</p>
              <p className="text-lg font-bold text-sky-800 dark:text-sky-200 mt-0.5">{csrItems.length} <span className="text-xs font-normal">أصناف</span></p>
            </div>
            <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-600">
              <HeartHandshake className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* 1. جدول تحديد مسار التأمين للموردين المعتمدين في الطلب */}
        <Card className="border border-border shadow-xs bg-white dark:bg-card">
          <CardHeader className="p-4 sm:p-5 pb-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/10">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-sky-600" />
                <CardTitle className="text-base font-bold text-foreground">
                  تحديد مسار التأمين للموردين المعتمدين
                </CardTitle>
                <Badge variant="outline" className="text-sky-700 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800 text-xs">
                  {approvedSuppliers.filter(s => !s.isUnassigned).length} موردين معتمدين
                </Badge>
              </div>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                اختر مسار التأمين المناسب لكل مورد معتمد في هذا الطلب (عقد توريد وخدمات، أمر شراء داخلي، أو خطاب مسؤولية مجتمعية).
              </CardDescription>
            </div>

            {isQuotationsLoading && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600" />
                <span>جاري تحميل بيانات الموردين...</span>
              </div>
            )}
          </CardHeader>

          <CardContent className="p-0">
            {approvedSuppliers.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                <div>
                  <p className="text-sm font-bold text-foreground">لم يتم اعتماد أي عروض أسعار أو موردين لهذا الطلب حتى الآن</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                    يمكنك اعتماد عروض أسعار الموردين في مرحلة التقييم ومقارنة العروض، أو الانتقال لصفحة عروض الأسعار.
                  </p>
                </div>
                <Link href={`/quotations?requestId=${requestId}`}>
                  <Button size="sm" variant="outline" className="text-xs font-semibold gap-1.5 border-sky-300 text-sky-700 hover:bg-sky-50">
                    <ExternalLink className="w-3.5 h-3.5" />
                    الانتقال لصفحة مقارنة واعتماد عروض الأسعار
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right">
                  <thead className="bg-muted/40 text-muted-foreground border-b border-border font-semibold">
                    <tr>
                      <th className="p-3 w-12 text-center">#</th>
                      <th className="p-3">المورد المعتمد</th>
                      <th className="p-3">الأصناف المعتمدة للمورد</th>
                      <th className="p-3 text-center w-36">إجمالي القيمة التقديرية</th>
                      <th className="p-3 w-64 text-center">طريقة التأمين المحددة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {approvedSuppliers.map((sup: any, idx: number) => {
                      const currentMethod = suppliersAllocation[sup.key] || (sup.isUnassigned ? "csr_letter" : "contract");

                      return (
                        <tr
                          key={sup.key}
                          className={`transition-colors ${
                            currentMethod === "contract"
                              ? "hover:bg-sky-50/40 dark:hover:bg-sky-950/20"
                              : currentMethod === "purchase_order"
                              ? "hover:bg-slate-50 dark:hover:bg-slate-900/30"
                              : "hover:bg-sky-50/60 dark:hover:bg-sky-950/30"
                          }`}
                        >
                          <td className="p-3 text-center font-mono text-muted-foreground">
                            {sup.isUnassigned ? "-" : idx + 1}
                          </td>

                          {/* المورد */}
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                sup.isUnassigned
                                  ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 border border-amber-200 dark:border-amber-800"
                                  : "bg-sky-50 dark:bg-sky-950/40 text-sky-600 border border-sky-200 dark:border-sky-800"
                              }`}>
                                {sup.isUnassigned ? <HeartHandshake className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                              </div>
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm text-foreground">
                                    {sup.supplierName}
                                  </span>
                                  {sup.isUnassigned ? (
                                    <Badge variant="outline" className="text-[10px] bg-amber-50 dark:bg-amber-950/40 text-amber-700 border-amber-300">
                                      تأمين مباشر / تبرع
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 border-emerald-300">
                                      معتمد
                                    </Badge>
                                  )}
                                </div>
                                {sup.quotationNumber && (
                                  <p className="text-[11px] font-mono text-muted-foreground">
                                    عرض سعر: #{sup.quotationNumber}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* الأصناف المسندة */}
                          <td className="p-3">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedSupplierForModal(sup)}
                              className="h-7 text-xs font-semibold gap-1.5 border-border hover:border-sky-300 hover:text-sky-700 hover:bg-sky-50 dark:hover:bg-sky-950/40 px-2.5 cursor-pointer"
                            >
                              <Layers className="w-3.5 h-3.5 text-sky-600" />
                              <span>{sup.items.length} أصناف</span>
                              <Eye className="w-3 h-3 text-muted-foreground mr-0.5" />
                            </Button>
                          </td>

                          {/* القيمة التقديرية */}
                          <td className="p-3 text-center">
                            {sup.totalAmount > 0 ? (
                              <span className="font-bold font-mono text-foreground text-xs">
                                {formatCurrency(sup.totalAmount)} <span className="text-[10px] text-muted-foreground font-sans">ر.س</span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </td>

                          {/* تحديد الطريقة للمورد */}
                          <td className="p-3 text-center">
                            <Select
                              value={currentMethod}
                              onValueChange={(val) => handleSupplierAllocationChange(sup.key, val as ProcurementMethod)}
                            >
                              <SelectTrigger className="h-8 text-xs font-semibold bg-background border-border">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent dir="rtl">
                                <SelectItem value="contract" className="text-xs font-medium text-sky-700">
                                  عقد توريد وخدمات
                                </SelectItem>
                                <SelectItem value="purchase_order" className="text-xs font-medium text-slate-800 dark:text-slate-200">
                                  أمر شراء داخلي
                                </SelectItem>
                                <SelectItem value="csr_letter" className="text-xs font-medium text-sky-800 dark:text-sky-300">
                                  خطاب مسؤولية مجتمعية
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2. بطاقات التنفيذ والإصدار الثلاثة المباشرة */}
        <div>
          <div className="mb-3">
            <h3 className="text-sm font-bold text-foreground">
              إجراءات ونماذج التأمين:
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* البطاقة 1: مسار عقود التوريد والخدمات */}
            <Card className="border border-border shadow-xs flex flex-col justify-between bg-white dark:bg-card">
              <CardHeader className="p-4 pb-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
                    <FileSignature className="w-5 h-5" />
                  </div>
                  <Badge variant="outline" className="text-sky-700 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800 text-xs font-bold">
                    {contractSuppliers.length} موردين ({contractItems.length} صنف)
                  </Badge>
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-foreground">عقد توريد وخدمات</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    توثيق العقود مع الموردين المعتمدين لهذا المسار
                  </CardDescription>
                </div>
              </CardHeader>

              {/* قائمة الموردين المعتمدين للعقود */}
              <div className="px-4 py-2 flex-1 space-y-2">
                {contractSuppliers.length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {contractSuppliers.map((sup: any) => (
                      <div key={sup.key} className="p-2 rounded-lg bg-muted/20 border border-border/70 flex items-center justify-between gap-2 shadow-2xs">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-foreground text-xs truncate">{sup.supplierName}</p>
                          <p className="text-[10px] text-muted-foreground">{sup.items.length} أصناف معتمدة</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCreateContract(sup.supplierId)}
                          className="h-6 text-[11px] px-2 text-sky-700 border-sky-200 hover:bg-sky-50 dark:border-sky-800 dark:text-sky-300 shrink-0 font-semibold cursor-pointer"
                        >
                          إنشاء عقد
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-muted/20 p-4 rounded-lg border border-dashed text-center text-xs text-muted-foreground">
                    لا يوجد موردون مخصصون للعقد حالياً
                  </div>
                )}

                {/* العقود المنشأة مسبقاً إن وجدت */}
                {contractsList.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border/60 space-y-1">
                    <p className="text-[11px] font-bold text-foreground flex items-center justify-between">
                      <span>العقود المسجلة:</span>
                      <Badge variant="outline" className="text-[10px] h-5">{contractsList.length}</Badge>
                    </p>
                    {contractsList.slice(0, 2).map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between p-1.5 rounded bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200/60 dark:border-sky-800/40 text-xs">
                        <span className="font-semibold text-sky-900 dark:text-sky-200 truncate max-w-[120px]">
                          عقد #{c.contractNumber || c.id}
                        </span>
                        <div className="flex items-center gap-1">
                          <Link href={`/contracts/${c.id}/preview`}>
                            <Button size="sm" variant="ghost" className="h-5 text-[10px] px-1.5 text-sky-700">معاينة</Button>
                          </Link>
                          <Link href={`/contracts/${c.id}/edit`}>
                            <Button size="sm" variant="outline" className="h-5 text-[10px] px-1.5">تعديل</Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <CardContent className="p-4 pt-2 border-t mt-2">
                <Button
                  size="sm"
                  onClick={() => handleCreateContract(contractSuppliers[0]?.supplierId)}
                  disabled={contractSuppliers.length === 0}
                  className="w-full h-8 text-xs font-bold gap-1.5 bg-sky-600 hover:bg-sky-700 text-white shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {contractsList.length > 0 ? "إضافة عقد جديد" : "إنشاء عقد"}
                </Button>
              </CardContent>
            </Card>

            {/* البطاقة 2: مسار أمر الشراء الداخلي */}
            <Card className="border border-border shadow-xs flex flex-col justify-between bg-white dark:bg-card">
              <CardHeader className="p-4 pb-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <Badge variant="outline" className="text-slate-700 bg-slate-100 border-slate-300 text-xs font-bold">
                    {poSuppliers.length} موردين ({poItems.length} صنف)
                  </Badge>
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-foreground">أمر شراء داخلي</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    نموذج رسمي موجه لإدارة المشتريات بالبنود المعتمدة
                  </CardDescription>
                </div>
              </CardHeader>

              {/* قائمة الموردين لأمر الشراء بدون حشو أسماء الأصناف */}
              <div className="px-4 py-2 flex-1 space-y-2">
                {poSuppliers.length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {poSuppliers.map((sup: any) => (
                      <div key={sup.key} className="p-2 rounded-lg bg-muted/20 border border-border/70 flex items-center justify-between text-xs">
                        <span className="font-bold text-foreground truncate">{sup.supplierName}</span>
                        <Badge variant="secondary" className="text-[10px] font-normal">{sup.items.length} أصناف</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-muted/20 p-4 rounded-lg border border-dashed text-center text-xs text-muted-foreground">
                    لا يوجد موردون مخصصون لأمر الشراء حالياً
                  </div>
                )}
              </div>

              <CardContent className="p-4 pt-2 border-t mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setFullScreenView("po")}
                  disabled={poItems.length === 0}
                  className="w-full h-8 text-xs font-bold gap-1.5 border-border hover:bg-muted"
                >
                  <Eye className="w-3.5 h-3.5 text-sky-600" />
                  معاينة وطباعة أمر الشراء
                </Button>
              </CardContent>
            </Card>

            {/* البطاقة 3: مسار خطاب المسؤولية المجتمعية */}
            <Card className="border border-border shadow-xs flex flex-col justify-between bg-white dark:bg-card">
              <CardHeader className="p-4 pb-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
                    <HeartHandshake className="w-5 h-5" />
                  </div>
                  <Badge variant="outline" className="text-sky-700 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800 text-xs font-bold">
                    {csrItems.length} أصناف
                  </Badge>
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-foreground">خطاب مسؤولية مجتمعية</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    خطاب رسمي موجه للجهات والشركات الداعمة لتأمين الأصناف
                  </CardDescription>
                </div>
              </CardHeader>

              {/* بطاقة المسؤولية المجتمعية - أصناف فقط بدون ذكر أي موردين */}
              <div className="px-4 py-2 flex-1 flex flex-col justify-center">
                {csrItems.length > 0 ? (
                  <div className="bg-sky-50/50 dark:bg-sky-950/30 p-3 rounded-lg border border-sky-100 dark:border-sky-900/40 text-center space-y-1">
                    <p className="text-xs font-bold text-sky-900 dark:text-sky-200">
                      تم تخصيص {csrItems.length} صنف للمسؤولية المجتمعية
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      جاهزة للتضمين بالخطاب الرسمي بدون أي أسعار أو أسماء موردين
                    </p>
                  </div>
                ) : (
                  <div className="bg-muted/20 p-4 rounded-lg border border-dashed text-center text-xs text-muted-foreground">
                    لا توجد أصناف مخصصة للمسؤولية المجتمعية حالياً
                  </div>
                )}
              </div>

              <CardContent className="p-4 pt-2 border-t mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setFullScreenView("csr")}
                  disabled={csrItems.length === 0}
                  className="w-full h-8 text-xs font-bold gap-1.5 border-border hover:bg-muted"
                >
                  <Eye className="w-3.5 h-3.5 text-sky-600" />
                  معاينة وطباعة الخطاب الرسمي
                </Button>
              </CardContent>
            </Card>

          </div>
        </div>

      </main>

      {/* نافذة تأكيد الاعتماد والانتقال للتنفيذ */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="max-w-md text-right font-sans" dir="rtl">
          <DialogHeader className="text-right sm:text-right pb-2 border-b">
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <CheckCircle2 className="w-5 h-5 text-sky-600" />
              تأكيد اعتماد التأمين والانتقال للتنفيذ
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground text-right sm:text-right">
              سيتم حفظ خطة توزيع البنود واعتماد مسارات التأمين ونقل الطلب للمرحلة الخامسة (مرحلة التنفيذ).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 bg-muted/40 rounded-xl space-y-2 border border-border">
              <p className="font-bold text-foreground">ملخص توزيع مسارات التأمين المعتمدة ({allItems.length} بند):</p>
              <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                <div className="bg-sky-50 dark:bg-sky-950/40 p-2 rounded border border-sky-200 dark:border-sky-800">
                  <span className="block text-sky-700 dark:text-sky-300 font-bold">{contractSuppliers.length} موردين</span>
                  <span className="text-muted-foreground text-[10px]">{contractItems.length} بنود بالعقد</span>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800/60 p-2 rounded border border-slate-200 dark:border-slate-700">
                  <span className="block text-slate-800 dark:text-slate-200 font-bold">{poSuppliers.length} موردين</span>
                  <span className="text-muted-foreground text-[10px]">{poItems.length} بنود بأمر شراء</span>
                </div>
                <div className="bg-sky-50 dark:bg-sky-950/40 p-2 rounded border border-sky-200 dark:border-sky-800">
                  <span className="block text-sky-700 dark:text-sky-300 font-bold">{csrItems.length} أصناف</span>
                  <span className="text-muted-foreground text-[10px]">مسؤولية مجتمعية</span>
                </div>
              </div>
            </div>

            {contractItems.length > 0 && contractsList.length === 0 && (
              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 text-[11px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>ملاحظة: قمت بتخصيص {contractItems.length} بنود للعقود ولكن لم تقم بإنشاء العقد بعد. يمكنك المتابعة الآن وتحرير العقد في مرحلة التنفيذ.</span>
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-row items-center justify-end gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConfirmModal(false)}
              className="text-xs font-semibold"
            >
              مراجعة وتعديل
            </Button>
            <Button
              size="sm"
              onClick={() => handleSaveProcurement(true)}
              disabled={saveProcurementMutation.isPending}
              className="text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white gap-1.5 shadow-xs"
            >
              {saveProcurementMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              تأكيد والبدء بالتنفيذ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* مودال بسيط ونظيف لعرض أصناف المورد المعتمد */}
      <Dialog open={!!selectedSupplierForModal} onOpenChange={(open) => !open && setSelectedSupplierForModal(null)}>
        <DialogContent className="max-w-lg text-right font-sans" dir="rtl">
          <DialogHeader className="pb-3 border-b text-right sm:text-right">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                <Building2 className="w-4 h-4 text-sky-600" />
                أصناف المورد: {selectedSupplierForModal?.supplierName}
              </DialogTitle>
              <Badge variant="outline" className="text-xs font-normal">
                {selectedSupplierForModal?.items?.length || 0} أصناف
              </Badge>
            </div>
            {selectedSupplierForModal?.quotationNumber && (
              <DialogDescription className="text-xs text-muted-foreground text-right sm:text-right">
                عرض سعر رقم #{selectedSupplierForModal.quotationNumber}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="max-h-[55vh] overflow-y-auto border border-border/80 rounded-lg">
            <table className="w-full text-xs text-right">
              <thead className="bg-muted/60 text-muted-foreground font-semibold sticky top-0 border-b border-border">
                <tr>
                  <th className="p-2.5 w-10 text-center">#</th>
                  <th className="p-2.5">الصنف</th>
                  <th className="p-2.5 text-center w-24">الكمية</th>
                  {selectedSupplierForModal?.totalAmount > 0 && (
                    <th className="p-2.5 text-left w-24">الإجمالي</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {selectedSupplierForModal?.items?.map((it: any, idx: number) => (
                  <tr key={it.id} className="hover:bg-muted/20">
                    <td className="p-2.5 text-center text-muted-foreground font-mono">{idx + 1}</td>
                    <td className="p-2.5">
                      <p className="font-semibold text-foreground">{it.itemName}</p>
                      {it.description && (
                        <p className="text-[10px] text-muted-foreground line-clamp-1">{it.description}</p>
                      )}
                    </td>
                    <td className="p-2.5 text-center font-medium">
                      {it.quantity} {it.unit}
                    </td>
                    {selectedSupplierForModal?.totalAmount > 0 && (
                      <td className="p-2.5 text-left font-mono font-semibold">
                        {it.totalPrice ? `${formatCurrency(it.totalPrice)} ر.س` : "-"}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <DialogFooter className="flex flex-row items-center justify-between gap-2 pt-3 border-t">
            {selectedSupplierForModal?.totalAmount > 0 ? (
              <span className="text-xs text-muted-foreground">
                إجمالي القيمة: <strong className="font-mono text-foreground font-bold">{formatCurrency(selectedSupplierForModal.totalAmount)} ر.س</strong>
              </span>
            ) : <span />}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedSupplierForModal(null)}
              className="text-xs font-semibold"
            >
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
