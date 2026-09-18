import React, { useState, useEffect, useMemo } from "react";
import { useParams, useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowRight,
  Printer,
  FileSignature,
  ShoppingCart,
  HeartHandshake,
  CheckCircle2,
  Layers,
  Save,
  Building2,
  Eye,
  Edit,
  Plus,
  FileText,
  Check,
  Loader2,
  Sparkles,
  Info,
  Calendar,
  PenTool,
  CheckCheck
} from "lucide-react";
import { toast } from "sonner";
import { useDocumentTitle } from "@/contexts/DocumentTitleContext";
import { SaudiRiyal } from "@/components/SaudiRiyal";

type ProcurementMethod = "contract" | "purchase_order" | "csr_letter" | "unassigned";

export default function SedanaProcurementPage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const requestId = parseInt(params.id || "0");
  const { user } = useAuth();

  useDocumentTitle(`تأمين الطلب والتعاقد #${requestId} - سدانة`);

  // التبويب النشط
  const [activeTab, setActiveTab] = useState<"allocation" | "contract" | "po" | "csr">("allocation");

  // نمط عرض أمر الشراء (تحرير أو معاينة طباعة)
  const [poViewMode, setPoViewMode] = useState<"edit" | "preview">("preview");

  // نمط عرض خطاب المسؤولية المجتمعية (تحرير أو معاينة طباعة)
  const [csrViewMode, setCsrViewMode] = useState<"edit" | "preview">("preview");

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

  // جلب عروض الأسعار المسجلة
  const { data: allQuotations = [] } = trpc.quotations.getAllByRequestId.useQuery(
    { requestId },
    { enabled: !!requestId && requestId > 0 }
  );

  // جلب العقود المسجلة
  const { data: contractsList = [], refetch: refetchContracts } = trpc.contracts.getAllByRequestId.useQuery(
    { requestId },
    { enabled: !!requestId && requestId > 0 }
  );

  // حفظ بيانات التأمين
  const saveProcurementMutation = trpc.requests.saveSedanaProcurement.useMutation({
    onSuccess: (res) => {
      toast.success(res.message || "تم حفظ البيانات بنجاح");
      refetchRequest();
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

  // حالة تجزئة البنود (قابلية التجزئة للمشروع الواحد)
  const [itemsAllocation, setItemsAllocation] = useState<Record<string, ProcurementMethod>>({});

  // حالة أمر الشراء الداخلي (الخيار الثاني)
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
    selectedItemIds: [] as string[],
    showCreatorSignature: true,
    showExecutiveDirectorSignature: true,
  });

  // حالة خطاب المسؤولية المجتمعية (الخيار الثالث)
  const [csrData, setCsrData] = useState({
    letterNumber: `CSR-${requestId}-${new Date().getFullYear()}`,
    letterDate: new Date().toISOString().split("T")[0],
    salutation: "السادة", // السادة / السيد / السيدة (ممنوع منعاً باتاً أصحاب السعادة)
    recipientName: "",
    honorific: "المحترمون", // المحترمون / المحترم / الموقر
    projectName: "",
    signatoryTitle: "المدير التنفيذي",
    signatoryName: "",
    signatoryId: null as number | null,
    additionalNotes: "",
    selectedItemIds: [] as string[],
  });

  // قراءة البيانات المحفوظة سابقاً من programData.sedanaProcurement
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
        if (savedProc.itemsAllocation) {
          setItemsAllocation(savedProc.itemsAllocation);
        }
        if (savedProc.activePurchaseOrder) {
          setPoData(prev => ({
            ...prev,
            ...savedProc.activePurchaseOrder,
          }));
        }
        if (savedProc.activeCsrLetter) {
          setCsrData(prev => ({
            ...prev,
            ...savedProc.activeCsrLetter,
          }));
        }
      }
    } catch (e) {
      console.error("Error loading sedanaProcurement:", e);
    }
  }, [request]);

  // تهيئة أسماء المسؤولين والمشروع من النظام إذا كانت فارغة
  useEffect(() => {
    const mosqueName = request?.mosque?.name || "المسجد";
    const projName = `مشروع ${mosqueName}`;

    // تعيين المسؤولين الافتراضيين
    if (!poData.requesterName && user?.name) {
      setPoData(prev => ({
        ...prev,
        requesterName: user.name || "",
      }));
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
      setCsrData(prev => ({
        ...prev,
        projectName: projName,
      }));
    }

    if (!csrData.signatoryName && signatoriesData.length > 0) {
      const exec = signatoriesData.find((s: any) => s.roleTitle?.includes("تنفيذي") || s.roleTitle?.includes("مدير")) || signatoriesData[0];
      if (exec) {
        setCsrData(prev => ({
          ...prev,
          signatoryName: exec.name,
          signatoryTitle: exec.roleTitle || "المدير التنفيذي",
          signatoryId: exec.id,
        }));
      }
    }
  }, [request, user, signatoriesData]);

  // تهيئة تخصيص البنود تلقائياً في حال لم تكن محددة
  useEffect(() => {
    if (allItems.length > 0 && Object.keys(itemsAllocation).length === 0) {
      const initialAlloc: Record<string, ProcurementMethod> = {};
      allItems.forEach((it) => {
        initialAlloc[it.id] = "contract"; // الافتراضي هو العقد، وقابل للتجزئة مباشرة
      });
      setItemsAllocation(initialAlloc);
    }
  }, [allItems]);

  // مزامنة بنود أمر الشراء وخطاب المسؤولية المجتمعية مع التجزئة
  useEffect(() => {
    const poItems = allItems.filter(it => itemsAllocation[it.id] === "purchase_order").map(it => it.id);
    if (poItems.length > 0) {
      setPoData(prev => ({ ...prev, selectedItemIds: poItems }));
    } else if (poData.selectedItemIds.length === 0) {
      setPoData(prev => ({ ...prev, selectedItemIds: allItems.map(i => i.id) }));
    }

    const csrItems = allItems.filter(it => itemsAllocation[it.id] === "csr_letter").map(it => it.id);
    if (csrItems.length > 0) {
      setCsrData(prev => ({ ...prev, selectedItemIds: csrItems }));
    } else if (csrData.selectedItemIds.length === 0) {
      setCsrData(prev => ({ ...prev, selectedItemIds: allItems.map(i => i.id) }));
    }
  }, [itemsAllocation, allItems]);

  // استخراج الموردين الفائزين بالبنود المعتمدة (الخيار الأول: العقود)
  const awardedSuppliers = useMemo(() => {
    if (!allQuotations || allQuotations.length === 0) return [];

    const acceptedQuotations = allQuotations.filter((q: any) =>
      q.status === "accepted" || q.status === "approved"
    );

    return acceptedQuotations.map((quotation: any) => {
      let itemsList: any[] = [];
      if (Array.isArray(quotation.items)) {
        itemsList = quotation.items;
      } else if (typeof quotation.items === "string") {
        try {
          itemsList = JSON.parse(quotation.items);
        } catch {
          itemsList = [];
        }
      }

      let totalAmount = 0;
      itemsList.forEach((it: any) => {
        const q = parseFloat(it.quantity || "1");
        const p = parseFloat(it.unitPrice || it.unit_price || it.price || "0");
        totalAmount += (q * p);
      });

      const matchedContract = contractsList.find((c: any) =>
        (quotation.supplierId && c.supplierId === quotation.supplierId) ||
        (quotation.supplierName && c.secondPartyName === quotation.supplierName)
      );

      return {
        quotationId: quotation.id,
        supplierId: quotation.supplierId,
        supplierName: quotation.supplierName || `مورد عرض أسعار #${quotation.id}`,
        totalAmount: quotation.totalAmount ? parseFloat(quotation.totalAmount) : totalAmount,
        itemsCount: itemsList.length,
        contract: matchedContract || null,
      };
    });
  }, [allQuotations, contractsList]);

  // إحصائيات التجزئة
  const stats = useMemo(() => {
    const total = allItems.length;
    let contractCount = 0;
    let poCount = 0;
    let csrCount = 0;
    let unassignedCount = 0;

    allItems.forEach(it => {
      const method = itemsAllocation[it.id] || "unassigned";
      if (method === "contract") contractCount++;
      else if (method === "purchase_order") poCount++;
      else if (method === "csr_letter") csrCount++;
      else unassignedCount++;
    });

    return { total, contractCount, poCount, csrCount, unassignedCount };
  }, [allItems, itemsAllocation]);

  // تغيير طريقة التأمين لبند معين
  const handleItemAllocationChange = (itemId: string, method: ProcurementMethod) => {
    setItemsAllocation(prev => ({
      ...prev,
      [itemId]: method,
    }));
  };

  // تعيين كافة البنود لطريقة معينة
  const handleSetAllTo = (method: ProcurementMethod) => {
    const updated: Record<string, ProcurementMethod> = {};
    allItems.forEach(it => {
      updated[it.id] = method;
    });
    setItemsAllocation(updated);
    toast.success(`تم تعيين كافة البنود لـ: ${
      method === "contract" ? "عقد توريد وخدمات" :
      method === "purchase_order" ? "أمر شراء داخلي" :
      method === "csr_letter" ? "خطاب مسؤولية مجتمعية" : "غير محدد"
    }`);
  };

  // حفظ التجزئة والبيانات
  const handleSaveProcurement = (advanceStage: boolean = false) => {
    saveProcurementMutation.mutate({
      requestId,
      procurementData: {
        itemsAllocation,
        activePurchaseOrder: poData,
        activeCsrLetter: csrData,
        notes: `تحديث مسارات تأمين الاحتياج (${stats.contractCount} عقد، ${stats.poCount} أمر شراء، ${stats.csrCount} مسؤولية مجتمعية)`,
      },
      advanceToExecution: advanceStage,
    });
  };

  // طباعة المستند
  const handlePrintDocument = () => {
    window.print();
  };

  const mosqueName = request?.mosque?.name || "المسجد";
  const orgName = orgSettings?.organizationName || "جمعية عمارة المساجد";

  if (isRequestLoading) {
    return (
      <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 flex flex-col items-center justify-center p-6" dir="rtl">
        <div className="bg-card p-8 rounded-xl border border-blue-200/80 dark:border-blue-900/60 shadow-md flex flex-col items-center gap-4 text-center max-w-sm">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          <h3 className="font-bold text-lg text-foreground">جاري تحميل مسارات تأمين الطلب...</h3>
          <p className="text-xs text-muted-foreground">برنامج سدانة - المرحلة الرابعة (التعاقد والتأمين)</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 text-right pb-16 font-sans" dir="rtl">
      {/* 1. الشريط العلوي الملتصق (مطابق تماماً لثيم سدانة في المنصة) */}
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-md border-b border-border/80 shadow-2xs print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation(`/requests/${requestId}`)}
              className="gap-2 text-xs font-semibold cursor-pointer border-blue-200 dark:border-blue-900 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-800 dark:text-blue-300"
            >
              <ArrowRight className="w-4 h-4" />
              <span>العودة للطلب</span>
            </Button>
            <div className="h-5 w-px bg-border/80 hidden sm:block" />
            <div>
              <div className="flex items-center gap-2">
                <FileSignature className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h1 className="text-base sm:text-lg font-bold text-foreground">
                  تأمين الطلب والتعاقد - برنامج سدانة
                </h1>
                <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 text-xs px-2 py-0.5">
                  المرحلة الرابعة
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                مسجد {mosqueName} {request?.mosque?.city ? `• ${request.mosque.city}` : ""} • طلب #{request?.requestNumber || requestId}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* زر الطباعة المباشر عند استعراض أمر الشراء أو الخطاب */}
            {(activeTab === "po" || activeTab === "csr") && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintDocument}
                className="h-9 gap-1.5 text-xs font-bold border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200"
              >
                <Printer className="w-4 h-4 text-blue-600" />
                طباعة المستند الرسمي
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSaveProcurement(false)}
              disabled={saveProcurementMutation.isPending}
              className="h-9 gap-1.5 text-xs font-bold border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50"
            >
              <Save className="w-4 h-4" />
              حفظ التعديلات
            </Button>

            {request?.currentStage === "contracting" && (
              <Button
                size="sm"
                onClick={() => handleSaveProcurement(true)}
                disabled={saveProcurementMutation.isPending}
                className="h-9 gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                اعتماد مسارات التأمين والانتقال للتنفيذ
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* المحتوى الرئيسي */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* 2. بطاقة معلومات المسجد وقابلية التجزئة للمشروع (بالثيم الأزرق الهادئ المعتمد) */}
        <div className="rounded-xl border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/15 p-5 shadow-xs space-y-4 print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-blue-200/60 dark:border-blue-900/40">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-base sm:text-lg text-blue-950 dark:text-blue-100">
                  مسارات تأمين الاحتياج وقابلية التجزئة للمشروع الواحد
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  يدعم برنامج سدانة تجزئة بنود المشروع الواحد (مسجد {mosqueName})، بحيث يمكن تأمين كل صنف بالطريقة المناسبة: عقد توريد مع مورد، أمر شراء داخلي، أو مسؤولية مجتمعية.
                </p>
              </div>
            </div>

            <Badge variant="outline" className="bg-blue-100/70 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-300 font-mono text-xs px-3 py-1 self-start sm:self-center">
              {stats.total} إجمالي البنود
            </Badge>
          </div>

          {/* إحصائيات التوزيع السريعة */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-card p-3 rounded-xl border border-border/70 shadow-2xs">
              <span className="text-[11px] text-muted-foreground block mb-1">عقود التوريد والخدمات</span>
              <div className="flex items-center justify-between">
                <strong className="text-blue-700 dark:text-blue-400 font-bold text-base">{stats.contractCount}</strong>
                <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">الخيار 1</span>
              </div>
            </div>

            <div className="bg-card p-3 rounded-xl border border-border/70 shadow-2xs">
              <span className="text-[11px] text-muted-foreground block mb-1">أوامر الشراء الداخلية</span>
              <div className="flex items-center justify-between">
                <strong className="text-sky-700 dark:text-sky-400 font-bold text-base">{stats.poCount}</strong>
                <span className="text-[10px] bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full border border-sky-200">الخيار 2</span>
              </div>
            </div>

            <div className="bg-card p-3 rounded-xl border border-border/70 shadow-2xs">
              <span className="text-[11px] text-muted-foreground block mb-1">المسؤولية المجتمعية</span>
              <div className="flex items-center justify-between">
                <strong className="text-indigo-700 dark:text-indigo-400 font-bold text-base">{stats.csrCount}</strong>
                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">الخيار 3</span>
              </div>
            </div>

            <div className="bg-card p-3 rounded-xl border border-border/70 shadow-2xs">
              <span className="text-[11px] text-muted-foreground block mb-1">بنود غير مخصصة</span>
              <div className="flex items-center justify-between">
                <strong className="text-slate-700 dark:text-slate-300 font-bold text-base">{stats.unassignedCount}</strong>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">معلقة</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. شريط التبويبات المتناسق والمنظم (نفس أسلوب المنصة) */}
        <div className="border-b border-border/80 flex items-center gap-2 overflow-x-auto pb-px print:hidden">
          <button
            type="button"
            onClick={() => setActiveTab("allocation")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "allocation"
                ? "border-blue-600 text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20 rounded-t-lg"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>تجزئة وتوزيع البنود</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300">
              {stats.total}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("contract")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "contract"
                ? "border-blue-600 text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20 rounded-t-lg"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            <FileSignature className="w-4 h-4" />
            <span>1. عقد توريد وخدمات (سدانة)</span>
            {stats.contractCount > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300">
                {stats.contractCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("po")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "po"
                ? "border-blue-600 text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20 rounded-t-lg"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>2. أمر الشراء الداخلي</span>
            {stats.poCount > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300">
                {stats.poCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("csr")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "csr"
                ? "border-blue-600 text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20 rounded-t-lg"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            <HeartHandshake className="w-4 h-4" />
            <span>3. خطاب المسؤولية المجتمعية</span>
            {stats.csrCount > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300">
                {stats.csrCount}
              </span>
            )}
          </button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* التبويب 1: لوحة تجزئة وتوزيع البنود (Allocation Hub) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "allocation" && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            <Card className="border border-border/80 shadow-2xs">
              <CardHeader className="p-4 sm:p-5 pb-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-600" />
                    جدول توزيع وتجزئة بنود المسجد
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    حدد لكل بند طريقة التأمين المناسبة، مع إمكانية التخصيص الجماعي السريع
                  </CardDescription>
                </div>

                {/* أزرار التخصيص الجماعي */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-muted-foreground ml-1">تعيين الكل إلى:</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleSetAllTo("contract")}
                    className="h-7 px-2.5 text-[11px] font-semibold border-blue-200 text-blue-800 hover:bg-blue-50"
                  >
                    عقد توريد
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleSetAllTo("purchase_order")}
                    className="h-7 px-2.5 text-[11px] font-semibold border-sky-200 text-sky-800 hover:bg-sky-50"
                  >
                    أمر شراء
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleSetAllTo("csr_letter")}
                    className="h-7 px-2.5 text-[11px] font-semibold border-indigo-200 text-indigo-800 hover:bg-indigo-50"
                  >
                    مسؤولية مجتمعية
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-right">
                    <thead className="bg-muted/50 text-muted-foreground border-b border-border/80 font-semibold">
                      <tr>
                        <th className="p-3 w-12 text-center">#</th>
                        <th className="p-3">الصنف المطلوب</th>
                        <th className="p-3">الوصف والمواصفات</th>
                        <th className="p-3 text-center w-28">الكمية</th>
                        <th className="p-3 w-64 text-center">طريقة التأمين المخصصة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {allItems.map((item, idx) => {
                        const currentMethod = itemsAllocation[item.id] || "unassigned";
                        return (
                          <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                            <td className="p-3 text-center font-mono text-muted-foreground">{idx + 1}</td>
                            <td className="p-3 font-bold text-foreground">{item.itemName}</td>
                            <td className="p-3 text-muted-foreground max-w-xs truncate">{item.description || "-"}</td>
                            <td className="p-3 text-center font-bold text-foreground">
                              {item.quantity} <span className="text-[10px] text-muted-foreground font-normal">{item.unit}</span>
                            </td>
                            <td className="p-3 text-center">
                              <Select
                                value={currentMethod}
                                onValueChange={(val) => handleItemAllocationChange(item.id, val as ProcurementMethod)}
                              >
                                <SelectTrigger className="h-8 text-xs font-semibold bg-background border-border">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent dir="rtl">
                                  <SelectItem value="contract" className="text-xs font-medium text-blue-700">
                                    عقد توريد وخدمات (الخيار 1)
                                  </SelectItem>
                                  <SelectItem value="purchase_order" className="text-xs font-medium text-sky-700">
                                    أمر شراء داخلي (الخيار 2)
                                  </SelectItem>
                                  <SelectItem value="csr_letter" className="text-xs font-medium text-indigo-700">
                                    خطاب مسؤولية مجتمعية (الخيار 3)
                                  </SelectItem>
                                  <SelectItem value="unassigned" className="text-xs font-medium text-muted-foreground">
                                    غير محدد حالياً
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
              </CardContent>
            </Card>

            <div className="flex items-center justify-between p-4 rounded-xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/60">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600" />
                <p className="text-xs text-blue-950 dark:text-blue-200">
                  بعد توزيع البنود، يمكنك الانتقال لكل تبويب لمراجعة العقد، أو إعداد وطباعة أمر الشراء الداخلي، أو توليد خطاب المسؤولية المجتمعية.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => handleSaveProcurement(false)}
                disabled={saveProcurementMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-4 font-bold"
              >
                حفظ التوزيع
              </Button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* التبويب 2: الخيار الأول - عقد توريد وخدمات (سدانة المعتمد القديم) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "contract" && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            <Card className="border border-border/80 shadow-2xs">
              <CardHeader className="p-4 sm:p-5 pb-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <FileSignature className="w-4 h-4 text-blue-600" />
                    عقد توريد وخدمات التشغيل والصيانة (سدانة)
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    مسار التعاقد الرسمي المعتمد لبرنامج سدانة مع الموردين الفائزين بعروض الأسعار
                  </CardDescription>
                </div>

                <Link href={`/contracts/new?requestId=${requestId}`}>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-8 gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    إنشاء / تحرير عقد جديد للطلب
                  </Button>
                </Link>
              </CardHeader>

              <CardContent className="p-4 sm:p-5 space-y-4">
                {/* قائمة الموردين الفائزين */}
                <div>
                  <h4 className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    الموردون الفائزون والجاهزون للتعاقد:
                  </h4>

                  {awardedSuppliers.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {awardedSuppliers.map((supp, sIdx) => (
                        <div
                          key={sIdx}
                          className="p-3.5 rounded-xl border border-border/80 bg-card hover:border-blue-300 transition-all flex items-center justify-between gap-3 shadow-2xs"
                        >
                          <div className="space-y-1">
                            <span className="font-bold text-xs text-foreground block">{supp.supplierName}</span>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <span>قيمة العرض:</span>
                              <span className="font-bold text-blue-700 dark:text-blue-400">
                                <SaudiRiyal amount={supp.totalAmount} />
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500">
                              {supp.contract ? "يوجد عقد مسجل لهذا المورد" : "لم يتم إنشاء العقد بعد"}
                            </span>
                          </div>

                          <div className="shrink-0 flex items-center gap-1.5">
                            {supp.contract ? (
                              <>
                                <Link href={`/contracts/${supp.contract.id}/edit`}>
                                  <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] font-bold border-blue-200 text-blue-700 hover:bg-blue-50">
                                    <Edit className="w-3 h-3 ml-1" />
                                    تعديل
                                  </Button>
                                </Link>
                                <Link href={`/contracts/${supp.contract.id}/print`}>
                                  <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]">
                                    <Printer className="w-3 h-3 text-muted-foreground" />
                                  </Button>
                                </Link>
                              </>
                            ) : (
                              <Link href={`/contracts/new?requestId=${requestId}&supplierId=${supp.supplierId || ''}&supplierName=${encodeURIComponent(supp.supplierName)}&amount=${supp.totalAmount}`}>
                                <Button size="sm" className="h-7 px-2.5 text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white">
                                  تحرير العقد
                                </Button>
                              </Link>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-dashed text-center text-xs text-muted-foreground bg-muted/20">
                      لا توجد عروض أسعار معتمدة مسجلة لهذا الطلب حالياً، يمكنك إنشاء عقد مباشر بالضغط على زر "إنشاء عقد جديد للطلب".
                    </div>
                  )}
                </div>

                {/* قائمة العقود المسجلة للطلب */}
                <div className="pt-3 border-t">
                  <h4 className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    العقود المسجلة لهذا الطلب ({contractsList.length}):
                  </h4>

                  {contractsList.length > 0 ? (
                    <div className="space-y-2">
                      {contractsList.map((c: any) => (
                        <div
                          key={c.id}
                          className="p-3 rounded-lg border border-border/80 bg-background flex items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <span className="font-bold text-foreground">
                              عقد رقم {c.contractNumber || c.id} • الطرف الثاني: {c.secondPartyName || "مورد"}
                            </span>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              القيمة: <SaudiRiyal amount={parseFloat(c.contractAmount || "0")} /> • الحالة: {c.status === "approved" ? "معتمد" : "نشط"}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Link href={`/contracts/${c.id}/print`}>
                              <Button size="sm" variant="outline" className="h-7 px-2.5 text-[11px] font-medium">
                                <Printer className="w-3 h-3 ml-1" />
                                طباعة
                              </Button>
                            </Link>
                            <Link href={`/contracts/${c.id}/edit`}>
                              <Button size="sm" variant="outline" className="h-7 px-2.5 text-[11px] font-medium border-blue-200 text-blue-700 hover:bg-blue-50">
                                <Edit className="w-3 h-3 ml-1" />
                                تعديل
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">لم يتم إصدار عقود لهذا الطلب بعد.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* التبويب 3: الخيار الثاني - أمر الشراء الداخلي (Purchase Order) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "po" && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            {/* شريط التحكم بالنمط (تحرير أو معاينة طباعة) */}
            <div className="flex items-center justify-between p-3 bg-card rounded-xl border border-border/80 shadow-2xs print:hidden">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={poViewMode === "preview" ? "default" : "outline"}
                  onClick={() => setPoViewMode("preview")}
                  className={`h-8 text-xs font-bold gap-1.5 ${poViewMode === "preview" ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  معاينة وطباعة المستند (A4)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={poViewMode === "edit" ? "default" : "outline"}
                  onClick={() => setPoViewMode("edit")}
                  className={`h-8 text-xs font-bold gap-1.5 ${poViewMode === "edit" ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}`}
                >
                  <Edit className="w-3.5 h-3.5" />
                  تعديل بيانات النموذج
                </Button>
              </div>

              {poViewMode === "preview" && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handlePrintDocument}
                  className="h-8 text-xs font-bold gap-1.5 bg-slate-900 hover:bg-slate-800 text-white"
                >
                  <Printer className="w-3.5 h-3.5" />
                  طباعة أمر الشراء الآن
                </Button>
              )}
            </div>

            {/* وضع التحرير */}
            {poViewMode === "edit" && (
              <Card className="border border-border/80 shadow-2xs print:hidden">
                <CardHeader className="p-4 sm:p-5 pb-3 border-b">
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <Edit className="w-4 h-4 text-blue-600" />
                    بيانات إعداد أمر الشراء الداخلي
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    يتم توجيه هذا الأمر لإدارة المشتريات لتأمين الأصناف المحددة (بدون أي أسعار أو مبالغ)
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-4 sm:p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <Label className="text-xs mb-1.5 block">رقم أمر الشراء</Label>
                      <Input
                        value={poData.orderNumber}
                        onChange={(e) => setPoData(prev => ({ ...prev, orderNumber: e.target.value }))}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs mb-1.5 block">تاريخ الأمر</Label>
                      <Input
                        type="date"
                        value={poData.orderDate}
                        onChange={(e) => setPoData(prev => ({ ...prev, orderDate: e.target.value }))}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs mb-1.5 block">الموجه إليه</Label>
                      <Input
                        value={poData.directedTo}
                        onChange={(e) => setPoData(prev => ({ ...prev, directedTo: e.target.value }))}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  {/* بيانات التوقيعات والاعتماد */}
                  <div className="p-4 rounded-xl border border-border/70 bg-muted/20 space-y-3">
                    <h4 className="text-xs font-bold text-foreground">بيانات التوقيعات والاعتمادات (مطابقة لأمر الصرف)</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      {/* طالب الشراء */}
                      <div className="space-y-2 p-3 rounded-lg border border-border/60 bg-background">
                        <span className="font-bold text-blue-700 block">طالب الشراء (معد الطلب):</span>
                        <div>
                          <Label className="text-[11px] mb-1 block text-muted-foreground">الصفة / الوظيفة</Label>
                          <Input
                            value={poData.requesterRole}
                            onChange={(e) => setPoData(prev => ({ ...prev, requesterRole: e.target.value }))}
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
                      </div>

                      {/* صاحب الصلاحية */}
                      <div className="space-y-2 p-3 rounded-lg border border-border/60 bg-background">
                        <span className="font-bold text-blue-700 block">صاحب الصلاحية / الاعتماد:</span>
                        <div>
                          <Label className="text-[11px] mb-1 block text-muted-foreground">الصفة / المنصب</Label>
                          <Input
                            value={poData.approverRole}
                            onChange={(e) => setPoData(prev => ({ ...prev, approverRole: e.target.value }))}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-[11px] mb-1 block text-muted-foreground">اسم المعتمد</Label>
                          <Input
                            value={poData.approverName}
                            onChange={(e) => setPoData(prev => ({ ...prev, approverName: e.target.value }))}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ملاحظات أمر الشراء */}
                  <div>
                    <Label className="text-xs mb-1.5 block">ملاحظات أو توجيهات الشراء</Label>
                    <Textarea
                      rows={2}
                      value={poData.notes}
                      onChange={(e) => setPoData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="أي ملاحظات خاصة بالتوريد أو المواصفات..."
                      className="text-xs"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => {
                        handleSaveProcurement(false);
                        setPoViewMode("preview");
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 font-bold"
                    >
                      حفظ ومعاينة الطباعة
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* وضع المعاينة والطباعة الرسمية A4 */}
            <div className="print-container w-full max-w-full sm:max-w-[210mm] mx-auto bg-white shadow-md print:shadow-none p-2 sm:p-6 print:p-0 min-h-auto sm:min-h-[297mm] text-slate-900">
              {/* إطار المستند الأزرق الفاخر المطابق لأمر الصرف */}
              <div className="border-[2px] sm:border-[2.5px] border-[#1e40af] p-3 sm:p-6 rounded-lg relative bg-white min-h-auto sm:min-h-[285mm] flex flex-col justify-between">
                {/* الخط الذهبي الداخلي الرفيع */}
                <div className="absolute inset-1 border border-[#d4a574] rounded pointer-events-none" />

                <div className="relative z-10 space-y-4">
                  {/* ترويسة الجمعية الرسمية */}
                  <div className="flex justify-between items-start border-b pb-3">
                    <div className="flex items-center gap-3">
                      {orgSettings?.logoUrl ? (
                        <img src={orgSettings.logoUrl} alt="شعار الجمعية" className="h-14 sm:h-16 w-auto object-contain" />
                      ) : (
                        <div className="w-14 h-14 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-center text-blue-700 font-bold text-lg">
                          سدانة
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-sm sm:text-base text-[#1e40af]">
                          {orgSettings?.officialReportsName || orgSettings?.organizationName || "جمعية عمارة المساجد"}
                        </h3>
                        <p className="text-[11px] text-slate-500 font-medium">إدارة المشتريات والمستودعات • برنامج سدانة</p>
                      </div>
                    </div>

                    <div className="text-[11px] space-y-1 text-left">
                      <div><span className="text-slate-500">رقم أمر الشراء: </span><strong className="font-mono">{poData.orderNumber}</strong></div>
                      <div><span className="text-slate-500">التاريخ: </span><strong>{poData.orderDate}</strong></div>
                      <div><span className="text-slate-500">رقم الطلب: </span><strong className="font-mono">#{request?.requestNumber || requestId}</strong></div>
                    </div>
                  </div>

                  {/* شريط العنوان الأزرق */}
                  <div className="bg-[#1e40af] text-white font-bold text-center py-2 px-4 rounded text-sm sm:text-base">
                    أمر شراء داخلي (نموذج طلب شراء)
                  </div>

                  {/* سطر الموجه إليه */}
                  <div className="bg-slate-50 border border-slate-200 p-2.5 rounded text-xs flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-700">موجه إلى: </span>
                      <strong className="text-slate-900 text-sm">{poData.directedTo}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">المشروع / المسجد: </span>
                      <strong className="text-slate-900">{mosqueName} {request?.mosque?.city ? `(${request.mosque.city})` : ""}</strong>
                    </div>
                  </div>

                  {/* جدول الأصناف (خالٍ تماماً وبشكل قاطع من أي أسعار) */}
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
                        {allItems
                          .filter(it => itemsAllocation[it.id] === "purchase_order" || stats.poCount === 0)
                          .map((it, idx) => (
                            <tr key={it.id} className="h-8">
                              <td className="p-2 border-l border-slate-300 text-center font-mono text-slate-600">{idx + 1}</td>
                              <td className="p-2 border-l border-slate-300 font-bold text-slate-900">{it.itemName}</td>
                              <td className="p-2 border-l border-slate-300 text-slate-700">{it.description || "-"}</td>
                              <td className="p-2 border-l border-slate-300 text-center font-bold text-slate-900">{it.quantity}</td>
                              <td className="p-2 text-center text-slate-700">{it.unit}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  {/* ملاحظات إضافية */}
                  {poData.notes && (
                    <div className="p-2.5 rounded bg-slate-50 border border-slate-200 text-xs">
                      <strong className="text-slate-800 block mb-0.5">ملاحظات وتوجيهات الشراء:</strong>
                      <p className="text-slate-700">{poData.notes}</p>
                    </div>
                  )}

                  {/* جدول التوقيعات والاعتماد المطابق تماماً لجدول أمر الصرف */}
                  <div className="pt-2">
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
                        {/* الصف الأول: طالب الشراء / معد الطلب */}
                        <tr className="border-b border-slate-300 h-14">
                          <td className="p-2 border-l border-slate-300 font-bold text-slate-700">{poData.requesterRole}</td>
                          <td className="p-2 border-l border-slate-300 font-bold text-slate-900">{poData.requesterName || "مسؤول المشتريات"}</td>
                          <td className="p-2 border-l border-slate-300">
                            <div className="h-8 border-b border-dashed border-gray-300 mx-auto w-24"></div>
                          </td>
                          <td className="p-2 text-slate-600 font-medium text-[11px]">{poData.orderDate}</td>
                        </tr>

                        {/* الصف الثاني: تعميد أو اعتماد صاحب الصلاحية (المدير التنفيذي) */}
                        <tr className="h-14">
                          <td className="p-2 border-l border-slate-300 font-bold text-slate-700">{poData.approverRole}</td>
                          <td className="p-2 border-l border-slate-300 font-bold text-slate-900">{poData.approverName || "المدير التنفيذي"}</td>
                          <td className="p-2 border-l border-slate-300">
                            {poData.approverSignatureUrl ? (
                              <img src={poData.approverSignatureUrl} alt="توقيع الاعتماد" className="max-h-10 mx-auto object-contain" />
                            ) : (
                              <div className="h-8 border-b border-dashed border-gray-300 mx-auto w-24"></div>
                            )}
                          </td>
                          <td className="p-2 text-slate-600 font-medium text-[11px]">{poData.orderDate}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* تذييل المستند الفاخر */}
                <div className="mt-4 pt-2 border-t border-slate-200 text-center text-slate-400 text-[10px] flex justify-between items-center px-1">
                  <span>تم إنشاء هذا المستند آلياً من نظام إدارة المساجد - سدانة</span>
                  <span>تاريخ الطباعة: {new Date().toLocaleDateString("ar-SA")}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* التبويب 4: الخيار الثالث - خطاب المسؤولية المجتمعية (CSR Letter) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "csr" && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            {/* شريط التحكم بالنمط */}
            <div className="flex items-center justify-between p-3 bg-card rounded-xl border border-border/80 shadow-2xs print:hidden">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={csrViewMode === "preview" ? "default" : "outline"}
                  onClick={() => setCsrViewMode("preview")}
                  className={`h-8 text-xs font-bold gap-1.5 ${csrViewMode === "preview" ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  معاينة وطباعة الخطاب (A4)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={csrViewMode === "edit" ? "default" : "outline"}
                  onClick={() => setCsrViewMode("edit")}
                  className={`h-8 text-xs font-bold gap-1.5 ${csrViewMode === "edit" ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}`}
                >
                  <Edit className="w-3.5 h-3.5" />
                  تحرير بيانات الخطاب
                </Button>
              </div>

              {csrViewMode === "preview" && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handlePrintDocument}
                  className="h-8 text-xs font-bold gap-1.5 bg-slate-900 hover:bg-slate-800 text-white"
                >
                  <Printer className="w-3.5 h-3.5" />
                  طباعة الخطاب الرسمي الآن
                </Button>
              )}
            </div>

            {/* وضع التحرير */}
            {csrViewMode === "edit" && (
              <Card className="border border-border/80 shadow-2xs print:hidden">
                <CardHeader className="p-4 sm:p-5 pb-3 border-b">
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <HeartHandshake className="w-4 h-4 text-blue-600" />
                    بيانات ومخاطبة خطاب المسؤولية المجتمعية
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    خطاب رسمي موجه للشركات والجهات المانحة لتأمين بنود المسجد عبر مسار المسؤولية المجتمعية
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-4 sm:p-5 space-y-4">
                  {/* بيانات المخاطبة (بدون أصحاب السعادة) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <Label className="text-xs mb-1.5 block">صيغة النداء *</Label>
                      <Select
                        value={csrData.salutation}
                        onValueChange={(val) => setCsrData(prev => ({ ...prev, salutation: val }))}
                      >
                        <SelectTrigger className="h-9 text-xs bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent dir="rtl">
                          <SelectItem value="السادة">السادة</SelectItem>
                          <SelectItem value="السيد">السيد</SelectItem>
                          <SelectItem value="السيدة">السيدة</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs mb-1.5 block">اسم الجهة / الشركة أو الشخص *</Label>
                      <Input
                        value={csrData.recipientName}
                        onChange={(e) => setCsrData(prev => ({ ...prev, recipientName: e.target.value }))}
                        placeholder="مثال: شركة المراعي / مؤسسة الراجحي الخيرية..."
                        className="h-9 text-xs"
                      />
                    </div>

                    <div>
                      <Label className="text-xs mb-1.5 block">عبارة التفخيم واللقب *</Label>
                      <Select
                        value={csrData.honorific}
                        onValueChange={(val) => setCsrData(prev => ({ ...prev, honorific: val }))}
                      >
                        <SelectTrigger className="h-9 text-xs bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent dir="rtl">
                          <SelectItem value="المحترمون">المحترمون</SelectItem>
                          <SelectItem value="المحترم">المحترم</SelectItem>
                          <SelectItem value="الموقر">الموقر</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <Label className="text-xs mb-1.5 block">رقم الخطاب الصادر</Label>
                      <Input
                        value={csrData.letterNumber}
                        onChange={(e) => setCsrData(prev => ({ ...prev, letterNumber: e.target.value }))}
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <Label className="text-xs mb-1.5 block">تاريخ الخطاب</Label>
                      <Input
                        type="date"
                        value={csrData.letterDate}
                        onChange={(e) => setCsrData(prev => ({ ...prev, letterDate: e.target.value }))}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  {/* المفوض بالتوقيع */}
                  <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-3">
                    <h4 className="text-xs font-bold text-foreground">المفوض بالتوقيع على الخطاب</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <Label className="text-[11px] mb-1 block text-muted-foreground">المنصب / الصفة</Label>
                        <Input
                          value={csrData.signatoryTitle}
                          onChange={(e) => setCsrData(prev => ({ ...prev, signatoryTitle: e.target.value }))}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] mb-1 block text-muted-foreground">اسم المفوض</Label>
                        <Input
                          value={csrData.signatoryName}
                          onChange={(e) => setCsrData(prev => ({ ...prev, signatoryName: e.target.value }))}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* الشروط والتوجيهات الإضافية */}
                  <div>
                    <Label className="text-xs mb-1.5 block">شروط أو توجيهات إضافية في الخطاب (اختياري)</Label>
                    <Textarea
                      rows={2}
                      value={csrData.additionalNotes}
                      onChange={(e) => setCsrData(prev => ({ ...prev, additionalNotes: e.target.value }))}
                      placeholder="مثال: نأمل التنسيق مع مشرف المسجد مسبقاً قبل موعد التوريد والتسليم..."
                      className="text-xs"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => {
                        handleSaveProcurement(false);
                        setCsrViewMode("preview");
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 font-bold"
                    >
                      حفظ ومعاينة الخطاب
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* وضع معاينة وطباعة الخطاب الرسمي A4 */}
            <div className="print-container w-full max-w-full sm:max-w-[210mm] mx-auto bg-white shadow-md print:shadow-none p-4 sm:p-8 print:p-0 min-h-auto sm:min-h-[297mm] text-slate-900 leading-relaxed">
              <div className="border-[2px] sm:border-[2.5px] border-[#1e40af] p-5 sm:p-8 rounded-lg relative bg-white min-h-auto sm:min-h-[285mm] flex flex-col justify-between">
                {/* الخط الذهبي الداخلي */}
                <div className="absolute inset-1 border border-[#d4a574] rounded pointer-events-none" />

                <div className="relative z-10 space-y-6">
                  {/* ترويسة الخطاب الرسمية */}
                  <div className="flex justify-between items-start border-b pb-4">
                    <div className="flex items-center gap-3">
                      {orgSettings?.logoUrl ? (
                        <img src={orgSettings.logoUrl} alt="شعار الجمعية" className="h-16 sm:h-20 w-auto object-contain" />
                      ) : (
                        <div className="w-16 h-16 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-center text-blue-700 font-bold text-xl">
                          سدانة
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-base sm:text-lg text-[#1e40af]">
                          {orgSettings?.officialReportsName || orgSettings?.organizationName || "جمعية عمارة المساجد"}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">إدارة المسؤولية المجتمعية والشراكات</p>
                      </div>
                    </div>

                    <div className="text-xs space-y-1 text-left font-mono">
                      <div><span className="text-slate-500">الرقم: </span><strong>{csrData.letterNumber}</strong></div>
                      <div><span className="text-slate-500">التاريخ: </span><strong>{csrData.letterDate}</strong></div>
                    </div>
                  </div>

                  {/* بيانات المخاطبة (السادة / السيد / السيدة ... المحترمون) */}
                  <div className="pt-2 text-sm sm:text-base space-y-2">
                    <div className="font-bold text-slate-900">
                      <span>{csrData.salutation} / </span>
                      <span className="border-b-2 border-dotted border-slate-400 px-2 text-blue-900">
                        {csrData.recipientName || "الجهة المانحة / الشريك المجتمعي"}
                      </span>
                      <span className="mr-3">{csrData.honorific}</span>
                    </div>
                  </div>

                  {/* الديباجة الحرفية المعتمدة */}
                  <div className="text-xs sm:text-sm text-slate-800 leading-loose space-y-2">
                    <p className="font-bold text-slate-900">السلام عليكم ورحمة الله وبركاته،،،</p>
                    <p>
                      تجدون برفقه البنود المراد تأمينها لمشروع <strong>({csrData.projectName || `مشروع جامع ${mosqueName}`})</strong>، وحيث إنكم من الجهات الحريصة على بذل الخير وخدمة المجتمع، عليه نرفع لكم المتطلبات التي يحتاجها المشروع:
                    </p>
                  </div>

                  {/* جدول الأصناف بدون أسعار */}
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
                        {allItems
                          .filter(it => itemsAllocation[it.id] === "csr_letter" || stats.csrCount === 0)
                          .map((it, idx) => (
                            <tr key={it.id} className="h-8">
                              <td className="p-2 border-l border-slate-300 text-center font-mono text-slate-600">{idx + 1}</td>
                              <td className="p-2 border-l border-slate-300 font-bold text-slate-900">{it.itemName}</td>
                              <td className="p-2 border-l border-slate-300 text-slate-700">{it.description || "-"}</td>
                              <td className="p-2 border-l border-slate-300 text-center font-bold text-slate-900">{it.quantity}</td>
                              <td className="p-2 text-center text-slate-700">{it.unit}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  {/* الشروط والتوجيهات الإضافية إن وجدت */}
                  {csrData.additionalNotes && (
                    <div className="p-3 rounded bg-slate-50 border border-slate-200 text-xs">
                      <strong className="text-slate-800 block mb-1">ملاحظات وتوجيهات خاصة:</strong>
                      <p className="text-slate-700">{csrData.additionalNotes}</p>
                    </div>
                  )}

                  {/* عبارة الختام الحرفية */}
                  <div className="pt-4 text-xs sm:text-sm font-bold text-slate-900">
                    <p>وتقبلوا وافر التحية والتقدير،،،</p>
                  </div>

                  {/* التوقيع والاعتماد الرسمي */}
                  <div className="pt-8 flex justify-end">
                    <div className="w-56 text-center space-y-2">
                      <p className="font-bold text-xs sm:text-sm text-slate-800">{csrData.signatoryTitle || "المدير التنفيذي"}</p>
                      <div className="h-14 flex items-center justify-center">
                        <div className="border-b border-dashed border-slate-400 w-36 mx-auto" />
                      </div>
                      <p className="font-bold text-xs sm:text-sm text-slate-900">{csrData.signatoryName || "المهندس المفوض بالتوقيع"}</p>
                    </div>
                  </div>
                </div>

                {/* تذييل الخطاب */}
                <div className="mt-8 pt-3 border-t border-slate-200 text-center text-slate-400 text-[10px] flex justify-between items-center px-1">
                  <span>{orgSettings?.officialReportsName || orgSettings?.organizationName || "جمعية عمارة المساجد"} - سدانة</span>
                  <span>الرمز المرجعي: #{request?.requestNumber || requestId}</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
