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
  ExternalLink,
  Eye
} from "lucide-react";
import { toast } from "sonner";
import { useDocumentTitle } from "@/contexts/DocumentTitleContext";
import { SaudiRiyal } from "@/components/SaudiRiyal";

type ProcurementMethod = "contract" | "purchase_order" | "csr_letter";

export default function SedanaProcurementPage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const requestId = parseInt(params.id || "0");
  const { user } = useAuth();

  useDocumentTitle(`تأمين بنود الطلب والتعاقد #${requestId} - سدانة`);

  // حالات فتح النوافذ المنبثقة لمعاينة وطباعة المستندات
  const [showPoModal, setShowPoModal] = useState(false);
  const [showCsrModal, setShowCsrModal] = useState(false);

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
  const { data: contractsList = [] } = trpc.contracts.getAllByRequestId.useQuery(
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

  // حالة تجزئة البنود: كل بند له طريقة من الـ 3 (عقد / أمر شراء / مسؤولية مجتمعية)
  const [itemsAllocation, setItemsAllocation] = useState<Record<string, ProcurementMethod>>({});

  // بيانات أمر الشراء الداخلي (الخيار الثاني)
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

  // بيانات خطاب المسؤولية المجتمعية (الخيار الثالث)
  const [csrData, setCsrData] = useState({
    letterNumber: `CSR-${requestId}-${new Date().getFullYear()}`,
    letterDate: new Date().toISOString().split("T")[0],
    salutation: "السادة", // السادة / السيد / السيدة (بدون أصحاب السعادة)
    recipientName: "",
    honorific: "المحترمون", // المحترمون / المحترم / الموقر
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
        if (savedProc.itemsAllocation) {
          setItemsAllocation(savedProc.itemsAllocation);
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

  // تهيئة تخصيص البنود تلقائياً (الافتراضي هو العقد، ويعدل المستخدم مباشرة)
  useEffect(() => {
    if (allItems.length > 0 && Object.keys(itemsAllocation).length === 0) {
      const initialAlloc: Record<string, ProcurementMethod> = {};
      allItems.forEach((it) => {
        initialAlloc[it.id] = "contract";
      });
      setItemsAllocation(initialAlloc);
    }
  }, [allItems]);

  // البنود المخصصة لكل خيار من الخيارات الثلاثة
  const contractItems = useMemo(() => {
    return allItems.filter(it => (itemsAllocation[it.id] || "contract") === "contract");
  }, [allItems, itemsAllocation]);

  const poItems = useMemo(() => {
    return allItems.filter(it => itemsAllocation[it.id] === "purchase_order");
  }, [allItems, itemsAllocation]);

  const csrItems = useMemo(() => {
    return allItems.filter(it => itemsAllocation[it.id] === "csr_letter");
  }, [allItems, itemsAllocation]);

  // تغيير طريقة التأمين لبند معين
  const handleItemAllocationChange = (itemId: string, method: ProcurementMethod) => {
    setItemsAllocation(prev => ({
      ...prev,
      [itemId]: method,
    }));
  };

  // تعيين كافة البنود لطريقة معينة بنقرة واحدة
  const handleSetAllTo = (method: ProcurementMethod) => {
    const updated: Record<string, ProcurementMethod> = {};
    allItems.forEach(it => {
      updated[it.id] = method;
    });
    setItemsAllocation(updated);
    toast.success(`تم تعيين كافة البنود لـ: ${
      method === "contract" ? "عقد توريد وخدمات" :
      method === "purchase_order" ? "أمر شراء داخلي" : "خطاب مسؤولية مجتمعية"
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
        notes: `تحديد طرق التأمين (${contractItems.length} عقد، ${poItems.length} أمر شراء، ${csrItems.length} مسؤولية مجتمعية)`,
      },
      advanceToExecution: advanceStage,
    });
  };

  // طباعة المستند المفتوح
  const handlePrint = () => {
    window.print();
  };

  const mosqueName = request?.mosque?.name || "المسجد";
  const orgName = orgSettings?.officialReportsName || orgSettings?.organizationName || "جمعية عمارة المساجد";

  if (isRequestLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6" dir="rtl">
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex flex-col items-center gap-3 text-center max-w-sm">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-sm font-bold text-foreground">جاري تحميل بنود الطلب...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-background text-right pb-16 font-sans" dir="rtl">
      {/* الشريط العلوي البسيط والنظيف */}
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
                  تأمين بنود الطلب والتعاقد (سدانة)
                </h1>
                <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-200 text-xs">
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
              className="h-8 gap-1.5 text-xs font-semibold"
            >
              <Save className="w-3.5 h-3.5" />
              حفظ
            </Button>

            {request?.currentStage === "contracting" && (
              <Button
                size="sm"
                onClick={() => handleSaveProcurement(true)}
                disabled={saveProcurementMutation.isPending}
                className="h-8 gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                اعتماد التأمين والانتقال للتنفيذ
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* المحتوى الرئيسي المباشر */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 print:hidden">

        {/* 1. جدول تحديد طريقة التأمين لكل بند من البنود */}
        <Card className="border border-border shadow-xs">
          <CardHeader className="p-4 sm:p-5 pb-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20">
            <div>
              <CardTitle className="text-base font-bold text-foreground">
                حدد طريقة التأمين لكل بند من بنود المسجد
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                يمكن تجزئة المشروع: اختر لكل بند إما التعاقد مع مورد، أو أمر شراء داخلي، أو مسؤولية مجتمعية
              </CardDescription>
            </div>

            {/* أزرار التعيين السريع للكل */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-muted-foreground ml-1">تعيين الكل:</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleSetAllTo("contract")}
                className="h-7 px-2.5 text-xs font-medium border-border hover:bg-muted"
              >
                عقد توريد ({allItems.length})
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleSetAllTo("purchase_order")}
                className="h-7 px-2.5 text-xs font-medium border-border hover:bg-muted"
              >
                أمر شراء ({allItems.length})
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleSetAllTo("csr_letter")}
                className="h-7 px-2.5 text-xs font-medium border-border hover:bg-muted"
              >
                مسؤولية مجتمعية ({allItems.length})
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead className="bg-muted/40 text-muted-foreground border-b border-border font-semibold">
                  <tr>
                    <th className="p-3 w-12 text-center">#</th>
                    <th className="p-3">الصنف المطلوب</th>
                    <th className="p-3">الوصف والمواصفات</th>
                    <th className="p-3 text-center w-24">الكمية</th>
                    <th className="p-3 w-72 text-center">طريقة التأمين المحددة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {allItems.map((item, idx) => {
                    const currentMethod = itemsAllocation[item.id] || "contract";
                    return (
                      <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                        <td className="p-3 text-center font-mono text-muted-foreground">{idx + 1}</td>
                        <td className="p-3 font-bold text-foreground">{item.itemName}</td>
                        <td className="p-3 text-muted-foreground max-w-xs truncate">{item.description || "-"}</td>
                        <td className="p-3 text-center font-bold text-foreground">
                          {item.quantity} <span className="text-[11px] text-muted-foreground font-normal">{item.unit}</span>
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
                                1. عقد توريد وخدمات
                              </SelectItem>
                              <SelectItem value="purchase_order" className="text-xs font-medium text-slate-800 dark:text-slate-200">
                                2. أمر شراء داخلي
                              </SelectItem>
                              <SelectItem value="csr_letter" className="text-xs font-medium text-blue-900 dark:text-blue-300">
                                3. خطاب مسؤولية مجتمعية
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

        {/* 2. بطاقات التنفيذ والإصدار الثلاثة المباشرة ("وبساوين") */}
        <div>
          <h3 className="text-sm font-bold text-foreground mb-3">
            إجراءات ومستندات التأمين المعتمدة بناءً على البنود المحددة أعلاه:
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* البطاقة 1: عقد توريد وخدمات */}
            <Card className="border border-border shadow-xs flex flex-col justify-between">
              <CardHeader className="p-4 pb-2 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    <FileSignature className="w-5 h-5" />
                  </div>
                  <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-200 text-xs">
                    {contractItems.length} بنود مخصصة
                  </Badge>
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-foreground">1. عقد توريد وخدمات (سدانة)</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    تحرير العقد القديم المعتمد لبرنامج سدانة مع المورد الفائز بالبنود المخصصة.
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="p-4 pt-2 border-t mt-2 flex flex-col gap-2">
                <Link href={`/contracts/new?requestId=${requestId}`}>
                  <Button size="sm" className="w-full h-8 text-xs font-bold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="w-3.5 h-3.5" />
                    تحرير / إنشاء العقد القديم
                  </Button>
                </Link>

                {contractsList.length > 0 && (
                  <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1">
                    <span>يوجد {contractsList.length} عقود مسجلة</span>
                    <Link href={`/contracts/${contractsList[0].id}/edit`} className="text-blue-600 font-medium hover:underline">
                      عرض العقد
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* البطاقة 2: أمر الشراء الداخلي */}
            <Card className="border border-border shadow-xs flex flex-col justify-between">
              <CardHeader className="p-4 pb-2 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <Badge variant="outline" className="text-slate-700 bg-slate-100 border-slate-300 text-xs">
                    {poItems.length} بنود مخصصة
                  </Badge>
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-foreground">2. أمر الشراء الداخلي</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    نموذج رسمي موجه لإدارة المشتريات (بدون أي أسعار، مع جدول توقيعات مطابق لأمر الصرف).
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="p-4 pt-2 border-t mt-2 flex flex-col gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowPoModal(true)}
                  className="w-full h-8 text-xs font-bold gap-1.5 border-border hover:bg-muted"
                >
                  <Eye className="w-3.5 h-3.5 text-blue-600" />
                  معاينة وطباعة أمر الشراء
                </Button>
                <span className="text-[11px] text-muted-foreground text-center">
                  جاهز للطباعة الفورية A4
                </span>
              </CardContent>
            </Card>

            {/* البطاقة 3: خطاب المسؤولية المجتمعية */}
            <Card className="border border-border shadow-xs flex flex-col justify-between">
              <CardHeader className="p-4 pb-2 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                    <HeartHandshake className="w-5 h-5" />
                  </div>
                  <Badge variant="outline" className="text-blue-800 bg-blue-50 border-blue-200 text-xs">
                    {csrItems.length} بنود مخصصة
                  </Badge>
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-foreground">3. خطاب المسؤولية المجتمعية</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    خطاب رسمي موجه للجهات والشركات الداعمة بالديباجة الحرفية (بدون أصحاب السعادة وبدون أسعار).
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="p-4 pt-2 border-t mt-2 flex flex-col gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowCsrModal(true)}
                  className="w-full h-8 text-xs font-bold gap-1.5 border-border hover:bg-muted"
                >
                  <Eye className="w-3.5 h-3.5 text-blue-600" />
                  معاينة وطباعة الخطاب الرسمي
                </Button>
                <span className="text-[11px] text-muted-foreground text-center">
                  ديباجة رسمية معتمدة A4
                </span>
              </CardContent>
            </Card>

          </div>
        </div>

      </main>

      {/* ------------------------------------------------------------- */}
      {/* نافذة معاينة وطباعة أمر الشراء الداخلي (Dialog Modal) */}
      {/* ------------------------------------------------------------- */}
      <Dialog open={showPoModal} onOpenChange={setShowPoModal}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto" dir="rtl">
          <DialogHeader className="text-right sm:text-right pb-3 border-b print:hidden">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-blue-600" />
                  أمر شراء داخلي - نموذج رسمي
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  نموذج أمر الشراء الموجه لإدارة المشتريات (خالٍ تماماً من أي أسعار)
                </DialogDescription>
              </div>

              <Button
                size="sm"
                onClick={handlePrint}
                className="h-8 gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Printer className="w-3.5 h-3.5" />
                طباعة أمر الشراء (A4)
              </Button>
            </div>
          </DialogHeader>

          {/* حقول التعديل السريع في رأس النافذة */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-muted/20 border border-border text-xs print:hidden">
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
          </div>

          {/* صفحة الطباعة الرسمية A4 */}
          <div className="bg-white text-slate-900 p-6 rounded-lg border border-slate-300 shadow-xs space-y-4 print:p-0 print:border-none print:shadow-none">
            {/* الترويسة الرسمية */}
            <div className="flex justify-between items-start border-b border-slate-300 pb-3">
              <div className="flex items-center gap-3">
                {orgSettings?.logoUrl ? (
                  <img src={orgSettings.logoUrl} alt="شعار الجمعية" className="h-14 w-auto object-contain" />
                ) : (
                  <div className="w-12 h-12 bg-blue-50 border border-blue-200 rounded flex items-center justify-center text-blue-700 font-bold">
                    سدانة
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-blue-900">{orgName}</h3>
                  <p className="text-[11px] text-slate-500 font-medium">إدارة المشتريات والمستودعات • برنامج سدانة</p>
                </div>
              </div>

              <div className="text-[11px] space-y-1 text-left">
                <div><span className="text-slate-500">رقم الأمر: </span><strong className="font-mono">{poData.orderNumber}</strong></div>
                <div><span className="text-slate-500">التاريخ: </span><strong>{poData.orderDate}</strong></div>
                <div><span className="text-slate-500">رقم الطلب: </span><strong className="font-mono">#{request?.requestNumber || requestId}</strong></div>
              </div>
            </div>

            {/* شريط العنوان */}
            <div className="bg-blue-900 text-white font-bold text-center py-1.5 px-4 rounded text-sm">
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
                  {(poItems.length > 0 ? poItems : allItems).map((it, idx) => (
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

            {/* جدول التوقيعات والاعتماد المطابق تماماً لأمر الصرف */}
            <div className="pt-3">
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
                  <tr className="border-b border-slate-300 h-14">
                    <td className="p-2 border-l border-slate-300 font-bold text-slate-700">{poData.requesterRole}</td>
                    <td className="p-2 border-l border-slate-300 font-bold text-slate-900">{poData.requesterName || "طالب الشراء"}</td>
                    <td className="p-2 border-l border-slate-300">
                      <div className="h-8 border-b border-dashed border-gray-300 mx-auto w-24"></div>
                    </td>
                    <td className="p-2 text-slate-600 font-medium text-[11px]">{poData.orderDate}</td>
                  </tr>

                  {/* صاحب الصلاحية */}
                  <tr className="h-14">
                    <td className="p-2 border-l border-slate-300 font-bold text-slate-700">{poData.approverRole}</td>
                    <td className="p-2 border-l border-slate-300 font-bold text-slate-900">{poData.approverName || "المدير التنفيذي"}</td>
                    <td className="p-2 border-l border-slate-300">
                      {poData.approverSignatureUrl ? (
                        <img src={poData.approverSignatureUrl} alt="التوقيع" className="max-h-10 mx-auto object-contain" />
                      ) : (
                        <div className="h-8 border-b border-dashed border-gray-300 mx-auto w-24"></div>
                      )}
                    </td>
                    <td className="p-2 text-slate-600 font-medium text-[11px]">{poData.orderDate}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* تذييل أمر الشراء */}
            <div className="pt-2 border-t border-slate-200 text-center text-slate-400 text-[10px] flex justify-between items-center px-1">
              <span>تم إنشاء هذا المستند آلياً من نظام إدارة المساجد - سدانة</span>
              <span>تاريخ الطباعة: {new Date().toLocaleDateString("ar-SA")}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------- */}
      {/* نافذة معاينة وطباعة خطاب المسؤولية المجتمعية (Dialog Modal) */}
      {/* ------------------------------------------------------------- */}
      <Dialog open={showCsrModal} onOpenChange={setShowCsrModal}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto" dir="rtl">
          <DialogHeader className="text-right sm:text-right pb-3 border-b print:hidden">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <HeartHandshake className="w-4 h-4 text-blue-600" />
                  خطاب المسؤولية المجتمعية
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  خطاب رسمي موجه للجهات والشركات الداعمة لتأمين البنود
                </DialogDescription>
              </div>

              <Button
                size="sm"
                onClick={handlePrint}
                className="h-8 gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Printer className="w-3.5 h-3.5" />
                طباعة الخطاب (A4)
              </Button>
            </div>
          </DialogHeader>

          {/* حقول التعديل السريع في رأس النافذة */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-muted/20 border border-border text-xs print:hidden">
            <div>
              <Label className="text-[11px] mb-1 block text-muted-foreground">صيغة النداء *</Label>
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

            <div>
              <Label className="text-[11px] mb-1 block text-muted-foreground">اسم الجهة / الشركة *</Label>
              <Input
                value={csrData.recipientName}
                onChange={(e) => setCsrData(prev => ({ ...prev, recipientName: e.target.value }))}
                placeholder="مثال: شركة المراعي / مؤسسة الراجحي..."
                className="h-8 text-xs"
              />
            </div>

            <div>
              <Label className="text-[11px] mb-1 block text-muted-foreground">عبارة التفخيم واللقب *</Label>
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
          </div>

          {/* صفحة الخطاب الرسمي A4 */}
          <div className="bg-white text-slate-900 p-8 rounded-lg border border-slate-300 shadow-xs space-y-6 print:p-0 print:border-none print:shadow-none leading-relaxed">
            {/* ترويسة الخطاب */}
            <div className="flex justify-between items-start border-b border-slate-300 pb-4">
              <div className="flex items-center gap-3">
                {orgSettings?.logoUrl ? (
                  <img src={orgSettings.logoUrl} alt="شعار الجمعية" className="h-16 w-auto object-contain" />
                ) : (
                  <div className="w-14 h-14 bg-blue-50 border border-blue-200 rounded flex items-center justify-center text-blue-700 font-bold text-lg">
                    سدانة
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-base text-blue-900">{orgName}</h3>
                  <p className="text-xs text-slate-500 font-medium">إدارة المسؤولية المجتمعية والشراكات</p>
                </div>
              </div>

              <div className="text-xs space-y-1 text-left font-mono">
                <div><span className="text-slate-500">الرقم: </span><strong>{csrData.letterNumber}</strong></div>
                <div><span className="text-slate-500">التاريخ: </span><strong>{csrData.letterDate}</strong></div>
              </div>
            </div>

            {/* المخاطبة: السادة / ... المحترمون */}
            <div className="pt-2 text-sm sm:text-base font-bold text-slate-900">
              <span>{csrData.salutation} / </span>
              <span className="border-b-2 border-dotted border-slate-400 px-2 text-blue-900">
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

            {/* جدول الأصناف المرفقة (بدون أسعار نهائياً) */}
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
                  {(csrItems.length > 0 ? csrItems : allItems).map((it, idx) => (
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

            {/* عبارة الختام الحرفية */}
            <div className="pt-3 text-xs sm:text-sm font-bold text-slate-900">
              <p>وتقبلوا وافر التحية والتقدير،،،</p>
            </div>

            {/* خانة التوقيع والاعتماد */}
            <div className="pt-6 flex justify-end">
              <div className="w-56 text-center space-y-2">
                <p className="font-bold text-xs sm:text-sm text-slate-800">{csrData.signatoryTitle || "المدير التنفيذي"}</p>
                <div className="h-12 flex items-center justify-center">
                  <div className="border-b border-dashed border-slate-400 w-36 mx-auto" />
                </div>
                <p className="font-bold text-xs sm:text-sm text-slate-900">{csrData.signatoryName || "المهندس المفوض بالتوقيع"}</p>
              </div>
            </div>

            {/* تذييل الخطاب */}
            <div className="pt-4 border-t border-slate-200 text-center text-slate-400 text-[10px] flex justify-between items-center px-1">
              <span>{orgName} - سدانة</span>
              <span>الرمز المرجعي: #{request?.requestNumber || requestId}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
