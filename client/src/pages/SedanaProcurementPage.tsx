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
  AlertTriangle,
  AlertCircle,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  UserCheck,
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

  // التحكم في نافذة تأكيد الاعتماد والانتقال للتنفيذ
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // نافذة إضافة مورد مخصص جديد
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [addSupplierTargetItemId, setAddSupplierTargetItemId] = useState<string | null>(null);

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

  // جلب عروض الأسعار للطلب
  const { data: quotationsResult, isLoading: isQuotationsLoading } = trpc.projects.getQuotationsByRequest.useQuery(
    { requestId },
    { enabled: !!requestId && requestId > 0 }
  );

  // جلب الموردين المسجلين في النظام
  const { data: registeredSuppliers = [] } = trpc.suppliers.getActiveSuppliers.useQuery(
    { includeUnapproved: true },
    { staleTime: 5 * 60 * 1000, retry: false }
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

  // موردون مخصصون يضيفهم المستخدم يدويًا
  const [customSuppliers, setCustomSuppliers] = useState<string[]>([]);

  // قائمة جميع الموردين المتاحين للاختيار (عروض الأسعار + الموردون المسجلون + الموردون المخصصون)
  const availableSuppliers = useMemo(() => {
    const list: Array<{
      id?: number;
      name: string;
      source: "quotation" | "registered" | "custom";
      sourceLabel: string;
      quotationId?: number;
      quotationNumber?: string;
    }> = [];

    const seenNames = new Set<string>();

    // 1. الموردون من عروض الأسعار المسجلة للطلب
    (quotationsResult?.quotations || []).forEach((q: any) => {
      const name = q.supplierName || `مورد عرض #${q.quotationNumber || q.id}`;
      if (!seenNames.has(name)) {
        seenNames.add(name);
        list.push({
          id: q.supplierId,
          name,
          source: "quotation",
          sourceLabel: q.status === "accepted" || q.status === "approved" ? "عرض سعر معتمد" : "عرض سعر مقدم",
          quotationId: q.id,
          quotationNumber: q.quotationNumber,
        });
      }
    });

    // 2. الموردون المسجلون في النظام
    (registeredSuppliers as any[] || []).forEach((s: any) => {
      if (s?.name && !seenNames.has(s.name)) {
        seenNames.add(s.name);
        list.push({
          id: s.id,
          name: s.name,
          source: "registered",
          sourceLabel: "مورد مسجل بالمنصة",
        });
      }
    });

    // 3. الموردون المخصصون المضافون يدوياً
    customSuppliers.forEach((name) => {
      if (name && !seenNames.has(name)) {
        seenNames.add(name);
        list.push({
          name,
          source: "custom",
          sourceLabel: "مورد مخصص",
        });
      }
    });

    return list;
  }, [quotationsResult, registeredSuppliers, customSuppliers]);

  // حالة تعيين المورد لكل بند: itemId -> { supplierId, supplierName, quotationId, unitPrice, totalPrice }
  const [itemSupplierMap, setItemSupplierMap] = useState<Record<string, {
    supplierId?: number;
    supplierName: string;
    quotationId?: number;
    unitPrice?: number;
    totalPrice?: number;
  }>>({});

  // حالة طريقة التأمين لكل بند: itemId -> ProcurementMethod
  const [itemsAllocation, setItemsAllocation] = useState<Record<string, ProcurementMethod>>({});

  // خيارات الضبط السريع للطلب ككل
  const [selectedGlobalSupplier, setSelectedGlobalSupplier] = useState<string>("");

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

  // قراءة وتهيئة البيانات المحفوظة أو الافتراضية
  useEffect(() => {
    if (!request || allItems.length === 0) return;

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

      // 1. استرجاع خريطة الموردين أو تهيئتها
      if (savedProc?.itemSupplierMap && Object.keys(savedProc.itemSupplierMap).length > 0) {
        setItemSupplierMap(savedProc.itemSupplierMap);
        const customNames = Object.values(savedProc.itemSupplierMap)
          .map((v: any) => v.supplierName)
          .filter(Boolean);
        if (customNames.length > 0) {
          setCustomSuppliers(prev => Array.from(new Set([...prev, ...customNames])));
        }
      } else {
        const initialMap: Record<string, { supplierId?: number; supplierName: string; quotationId?: number; unitPrice?: number; totalPrice?: number }> = {};

        allItems.forEach((it: any) => {
          // فحص الترسية المحفوظة
          if (awardedItemVendors.length > 0) {
            const award = awardedItemVendors.find((a: any) => String(a.boqItemId) === String(it.id));
            if (award && award.supplierName) {
              initialMap[it.id] = {
                supplierId: award.supplierId,
                supplierName: award.supplierName,
                quotationId: award.quotationId,
                unitPrice: parseFloat(award.unitPrice || 0),
                totalPrice: parseFloat(award.totalPrice || 0),
              };
              return;
            }
          }

          // فحص عروض الأسعار المعتمدة
          if (approvedQuotations.length > 0) {
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
                initialMap[it.id] = {
                  supplierId: q.supplierId,
                  supplierName: q.supplierName || `مورد عرض #${q.quotationNumber || q.id}`,
                  quotationId: q.id,
                  unitPrice: parseFloat(qItem.unitPrice || qItem.price || 0),
                  totalPrice: parseFloat(qItem.totalPrice || 0),
                };
                return;
              }
            }

            if (approvedQuotations.length === 1) {
              const q = approvedQuotations[0];
              initialMap[it.id] = {
                supplierId: q.supplierId,
                supplierName: q.supplierName || `مورد عرض #${q.quotationNumber || q.id}`,
                quotationId: q.id,
              };
              return;
            }
          }

          // إذا لم يوجد مورد معتمد
          initialMap[it.id] = {
            supplierName: "لم يحدد بعد",
          };
        });

        setItemSupplierMap(initialMap);
      }

      // 2. استرجاع طرق التأمين للبند أو تهيئتها
      if (savedProc?.itemsAllocation && Object.keys(savedProc.itemsAllocation).length > 0) {
        setItemsAllocation(savedProc.itemsAllocation);
      } else {
        const initialAlloc: Record<string, ProcurementMethod> = {};
        allItems.forEach((it: any) => {
          initialAlloc[it.id] = "contract";
        });
        setItemsAllocation(initialAlloc);
      }

      // 3. استرجاع بيانات النماذج
      if (savedProc?.activePurchaseOrder) {
        setPoData(prev => ({ ...prev, ...savedProc.activePurchaseOrder }));
      }
      if (savedProc?.activeCsrLetter) {
        setCsrData(prev => ({ ...prev, ...savedProc.activeCsrLetter }));
      }
    } catch (e) {
      console.error("Error loading sedanaProcurement:", e);
    }
  }, [request, allItems, awardedItemVendors, approvedQuotations]);

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

  // البنود المخصصة لكل طريقة
  const contractItems = useMemo(() => {
    return allItems.filter((it: any) => (itemsAllocation[it.id] || "contract") === "contract");
  }, [allItems, itemsAllocation]);

  const poItems = useMemo(() => {
    return allItems.filter((it: any) => itemsAllocation[it.id] === "purchase_order");
  }, [allItems, itemsAllocation]);

  const csrItems = useMemo(() => {
    return allItems.filter((it: any) => itemsAllocation[it.id] === "csr_letter");
  }, [allItems, itemsAllocation]);

  // الموردون المخصصون لكل مسار
  const contractSuppliers = useMemo(() => {
    const map = new Map<string, { supplierId?: number; supplierName: string; items: any[] }>();
    contractItems.forEach((it: any) => {
      const sup = itemSupplierMap[it.id] || { supplierName: "لم يحدد بعد" };
      const key = sup.supplierId ? `id_${sup.supplierId}` : `name_${sup.supplierName}`;
      if (!map.has(key)) {
        map.set(key, { supplierId: sup.supplierId, supplierName: sup.supplierName, items: [] });
      }
      map.get(key)!.items.push(it);
    });
    return Array.from(map.values());
  }, [contractItems, itemSupplierMap]);

  const poSuppliers = useMemo(() => {
    const map = new Map<string, { supplierId?: number; supplierName: string; items: any[] }>();
    poItems.forEach((it: any) => {
      const sup = itemSupplierMap[it.id] || { supplierName: "لم يحدد بعد" };
      const key = sup.supplierId ? `id_${sup.supplierId}` : `name_${sup.supplierName}`;
      if (!map.has(key)) {
        map.set(key, { supplierId: sup.supplierId, supplierName: sup.supplierName, items: [] });
      }
      map.get(key)!.items.push(it);
    });
    return Array.from(map.values());
  }, [poItems, itemSupplierMap]);

  const csrSuppliers = useMemo(() => {
    const map = new Map<string, { supplierId?: number; supplierName: string; items: any[] }>();
    csrItems.forEach((it: any) => {
      const sup = itemSupplierMap[it.id] || { supplierName: "لم يحدد بعد" };
      const key = sup.supplierId ? `id_${sup.supplierId}` : `name_${sup.supplierName}`;
      if (!map.has(key)) {
        map.set(key, { supplierId: sup.supplierId, supplierName: sup.supplierName, items: [] });
      }
      map.get(key)!.items.push(it);
    });
    return Array.from(map.values());
  }, [csrItems, itemSupplierMap]);

  // الموردون النشطون بشكل عام
  const allActiveSuppliersCount = useMemo(() => {
    const names = new Set<string>();
    Object.values(itemSupplierMap).forEach(s => {
      if (s?.supplierName && s.supplierName !== "لم يحدد بعد") {
        names.add(s.supplierName);
      }
    });
    return names.size;
  }, [itemSupplierMap]);

  // تخصيص المورد لبند معين
  const handleSetItemSupplier = (itemId: string, supplierName: string) => {
    if (supplierName === "__ADD_NEW__") {
      setAddSupplierTargetItemId(itemId);
      setShowAddSupplierModal(true);
      return;
    }
    const supObj = availableSuppliers.find(s => s.name === supplierName);
    setItemSupplierMap(prev => ({
      ...prev,
      [itemId]: {
        supplierId: supObj?.id,
        supplierName,
        quotationId: supObj?.quotationId,
      },
    }));
  };

  // تغيير طريقة التأمين لبند معين
  const handleSetItemMethod = (itemId: string, method: ProcurementMethod) => {
    setItemsAllocation(prev => ({
      ...prev,
      [itemId]: method,
    }));
  };

  // تطبيق المورد العام على كافة البنود
  const handleApplyGlobalSupplier = () => {
    if (!selectedGlobalSupplier) {
      toast.error("يرجى اختيار المورد أولاً");
      return;
    }
    const supObj = availableSuppliers.find(s => s.name === selectedGlobalSupplier);
    setItemSupplierMap(prev => {
      const updated = { ...prev };
      allItems.forEach((it: any) => {
        updated[it.id] = {
          supplierId: supObj?.id,
          supplierName: selectedGlobalSupplier,
          quotationId: supObj?.quotationId,
        };
      });
      return updated;
    });
    toast.success(`تم تعيين المورد "${selectedGlobalSupplier}" لكافة البنود (${allItems.length} بند)`);
  };

  // تطبيق طريقة التأمين على كافة البنود
  const handleApplyGlobalMethod = (method: ProcurementMethod) => {
    setItemsAllocation(prev => {
      const updated = { ...prev };
      allItems.forEach((it: any) => {
        updated[it.id] = method;
      });
      return updated;
    });
    const label = method === "contract" ? "عقد توريد وخدمات" : method === "purchase_order" ? "أمر شراء داخلي" : "خطاب مسؤولية مجتمعية";
    toast.success(`تم تطبيق مسار "${label}" على كافة البنود (${allItems.length} بند)`);
  };

  // إضافة مورد مخصص جديد
  const handleAddNewSupplier = () => {
    const trimmed = newSupplierName.trim();
    if (!trimmed) {
      toast.error("يرجى كتابة اسم المورد");
      return;
    }
    if (!customSuppliers.includes(trimmed)) {
      setCustomSuppliers(prev => [...prev, trimmed]);
    }
    if (addSupplierTargetItemId) {
      handleSetItemSupplier(addSupplierTargetItemId, trimmed);
      toast.success(`تم تعيين المورد "${trimmed}" للبند`);
    } else {
      setSelectedGlobalSupplier(trimmed);
      setItemSupplierMap(prev => {
        const updated = { ...prev };
        allItems.forEach((it: any) => {
          updated[it.id] = {
            supplierName: trimmed,
          };
        });
        return updated;
      });
      toast.success(`تمت إضافة وتعيين المورد "${trimmed}" لكافة البنود`);
    }
    setNewSupplierName("");
    setShowAddSupplierModal(false);
    setAddSupplierTargetItemId(null);
  };

  // حفظ التجزئة والبيانات
  const handleSaveProcurement = (advanceStage: boolean = false) => {
    // إعداد suppliersAllocation للتوافق مع السيرفر
    const suppliersAllocation: Record<string, ProcurementMethod> = {};
    Object.entries(itemSupplierMap).forEach(([itemId, sup]) => {
      if (sup?.supplierName) {
        const key = sup.supplierId ? `sup_${sup.supplierId}` : `name_${sup.supplierName}`;
        suppliersAllocation[key] = itemsAllocation[itemId] || "contract";
      }
    });

    saveProcurementMutation.mutate({
      requestId,
      procurementData: {
        itemsAllocation,
        itemSupplierMap,
        suppliersAllocation,
        activePurchaseOrder: poData,
        activeCsrLetter: csrData,
        notes: `تحديد طرق التأمين والموردين (${contractItems.length} عقد، ${poItems.length} أمر شراء، ${csrItems.length} مسؤولية مجتمعية)`,
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
              size="sm"
              onClick={handlePrint}
              className="h-8 sm:h-9 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs sm:text-sm gap-1.5 shadow-md cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>تنزيل PDF / طباعة</span>
            </Button>
          </div>
        </div>

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

              {/* جدول الأصناف */}
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

              {/* جدول التوقيعات والاعتماد */}
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
              size="sm"
              onClick={handlePrint}
              className="h-8 sm:h-9 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs sm:text-sm gap-1.5 shadow-md cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>تنزيل PDF / طباعة</span>
            </Button>
          </div>
        </div>

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

              {/* المخاطبة: السادة / ... المحترمون */}
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

              {/* جدول الأصناف المرفقة */}
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

              {/* عبارة الختام */}
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

            {/* تذييل الخطاب */}
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
  // 3. الشاشة الرئيسية: تحديد المورد وتحديد الطريقة وجدول البنود والبطاقات
  // =========================================================================
  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-background text-right pb-16 font-sans" dir="rtl">
      {/* الشريط العلوي */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border shadow-2xs print:hidden">
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
              حفظ التخصيص
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

        {/* شريط الإحصائيات السريع */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-card p-3 rounded-xl border border-border shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] text-muted-foreground">إجمالي بنود الاحتياج</p>
              <p className="text-lg font-bold text-foreground mt-0.5">
                {allItems.length} <span className="text-xs font-normal text-muted-foreground">بنود ({allActiveSuppliersCount} موردين)</span>
              </p>
            </div>
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <Layers className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white dark:bg-card p-3 rounded-xl border border-sky-100 dark:border-sky-900/40 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] text-sky-700 dark:text-sky-400">عقود التوريد والخدمات</p>
              <p className="text-lg font-bold text-sky-800 dark:text-sky-200 mt-0.5">
                {contractItems.length} <span className="text-xs font-normal">أصناف</span> ({contractSuppliers.length} موردين)
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
                {poItems.length} <span className="text-xs font-normal">أصناف</span> ({poSuppliers.length} موردين)
              </p>
            </div>
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white dark:bg-card p-3 rounded-xl border border-teal-100 dark:border-teal-900/40 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] text-teal-700 dark:text-teal-400">المسؤولية المجتمعية</p>
              <p className="text-lg font-bold text-teal-800 dark:text-teal-200 mt-0.5">
                {csrItems.length} <span className="text-xs font-normal">أصناف</span> ({csrSuppliers.length} شركاء)
              </p>
            </div>
            <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-600">
              <HeartHandshake className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* القسم الرئيسي: تحديد المورد وطريقة التأمين */}
        <Card className="border border-border shadow-xs bg-white dark:bg-card overflow-hidden">
          <CardHeader className="p-4 sm:p-5 pb-3 border-b bg-muted/15 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-sky-600" />
                  <CardTitle className="text-base font-bold text-foreground">
                    تحديد المورد وطريقة التأمين لبنود الطلب
                  </CardTitle>
                </div>
                <CardDescription className="text-xs text-muted-foreground mt-1">
                  حدد المورد المسؤول وطريقة التأمين (عقد توريد وخدمات، أمر شراء داخلي، أو خطاب مسؤولية مجتمعية) لكل بند بسهولة.
                </CardDescription>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setAddSupplierTargetItemId(null);
                  setShowAddSupplierModal(true);
                }}
                className="text-xs font-semibold gap-1.5 border-sky-300 text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:text-sky-300"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة مورد جديد</span>
              </Button>
            </div>

            {/* شريط التحكم السريع: تعيين المورد والطريقة للكل بنقرة واحدة */}
            <div className="bg-sky-50/70 dark:bg-sky-950/30 p-3.5 rounded-xl border border-sky-200/70 dark:border-sky-800/50 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-sky-900 dark:text-sky-200">
                <Sparkles className="w-4 h-4 text-sky-600" />
                <span>تحكم سريع (تطبيق على كافة البنود دفعة واحدة):</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                {/* تعيين المورد للكل */}
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select
                      value={selectedGlobalSupplier}
                      onValueChange={(val) => {
                        if (val === "__ADD_NEW__") {
                          setAddSupplierTargetItemId(null);
                          setShowAddSupplierModal(true);
                        } else {
                          setSelectedGlobalSupplier(val);
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs font-semibold bg-white dark:bg-slate-900 border-border">
                        <SelectValue placeholder="اختر المورد لتعيينه للكل..." />
                      </SelectTrigger>
                      <SelectContent dir="rtl" className="max-h-64">
                        {availableSuppliers.map((sup, sIdx) => (
                          <SelectItem key={`global_${sup.name}_${sIdx}`} value={sup.name} className="text-xs">
                            <div className="flex items-center justify-between gap-2 w-full">
                              <span className="font-semibold">{sup.name}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                sup.source === "quotation"
                                  ? "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                                  : sup.source === "registered"
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                  : "bg-muted text-muted-foreground"
                              }`}>
                                {sup.sourceLabel}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                        <SelectItem value="__ADD_NEW__" className="text-xs text-sky-600 font-bold border-t border-border mt-1 pt-1">
                          <div className="flex items-center gap-1.5">
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ إضافة اسم مورد جديد...</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleApplyGlobalSupplier}
                    disabled={!selectedGlobalSupplier}
                    className="h-8 text-xs font-bold gap-1 bg-sky-600 hover:bg-sky-700 text-white shrink-0 shadow-2xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>تعيين المورد للكل</span>
                  </Button>
                </div>

                {/* تطبيق الطريقة على الكل */}
                <div className="flex items-center gap-1.5 justify-start md:justify-end">
                  <span className="text-[11px] font-semibold text-muted-foreground ml-1">تطبيق الطريقة:</span>
                  <button
                    type="button"
                    onClick={() => handleApplyGlobalMethod("contract")}
                    className="h-8 px-2.5 text-xs font-bold rounded-lg border border-sky-300 dark:border-sky-800 bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-300 hover:bg-sky-50 transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                  >
                    <FileSignature className="w-3.5 h-3.5" />
                    <span>عقد للكل</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyGlobalMethod("purchase_order")}
                    className="h-8 px-2.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-100 transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>أمر شراء للكل</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyGlobalMethod("csr_letter")}
                    className="h-8 px-2.5 text-xs font-bold rounded-lg border border-teal-300 dark:border-teal-800 bg-white dark:bg-slate-900 text-teal-800 dark:text-teal-300 hover:bg-teal-50 transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                  >
                    <HeartHandshake className="w-3.5 h-3.5" />
                    <span>مسؤولية للكل</span>
                  </button>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead className="bg-muted/40 text-muted-foreground border-b border-border font-semibold">
                  <tr>
                    <th className="p-3 w-10 text-center">#</th>
                    <th className="p-3 w-1/3">بند الاحتياج والمواصفات</th>
                    <th className="p-3 text-center w-24">الكمية</th>
                    <th className="p-3 w-56">المورد المحدد</th>
                    <th className="p-3 text-center w-72">طريقة التأمين (اختر الطريقة)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {allItems.map((it: any, idx: number) => {
                    const currentMethod = itemsAllocation[it.id] || "contract";
                    const currentSupplier = itemSupplierMap[it.id];

                    return (
                      <tr
                        key={it.id}
                        className={`transition-colors ${
                          currentMethod === "contract"
                            ? "hover:bg-sky-50/30 dark:hover:bg-sky-950/20"
                            : currentMethod === "purchase_order"
                            ? "hover:bg-slate-50 dark:hover:bg-slate-900/30"
                            : "hover:bg-teal-50/40 dark:hover:bg-teal-950/20"
                        }`}
                      >
                        {/* رقم البند */}
                        <td className="p-3 text-center font-mono text-muted-foreground">
                          {idx + 1}
                        </td>

                        {/* اسم البند والوصف */}
                        <td className="p-3">
                          <p className="font-bold text-foreground text-sm">{it.itemName}</p>
                          {it.description && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{it.description}</p>
                          )}
                        </td>

                        {/* الكمية والوحدة */}
                        <td className="p-3 text-center">
                          <Badge variant="secondary" className="font-mono text-xs font-semibold px-2 py-0.5">
                            {it.quantity} {it.unit}
                          </Badge>
                        </td>

                        {/* اختيار المورد لهذا البند */}
                        <td className="p-3">
                          <Select
                            value={currentSupplier?.supplierName || "لم يحدد بعد"}
                            onValueChange={(val) => handleSetItemSupplier(it.id, val)}
                          >
                            <SelectTrigger className="h-8 text-xs font-semibold bg-background border-border">
                              <SelectValue placeholder="اختر المورد..." />
                            </SelectTrigger>
                            <SelectContent dir="rtl" className="max-h-64">
                              {availableSuppliers.map((sup, sIdx) => (
                                <SelectItem key={`${it.id}_sup_${sup.name}_${sIdx}`} value={sup.name} className="text-xs">
                                  <div className="flex items-center justify-between gap-2 w-full">
                                    <span className="font-semibold">{sup.name}</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                      sup.source === "quotation"
                                        ? "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                                        : sup.source === "registered"
                                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                        : "bg-muted text-muted-foreground"
                                    }`}>
                                      {sup.sourceLabel}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                              <SelectItem value="__ADD_NEW__" className="text-xs text-sky-600 font-bold border-t border-border mt-1 pt-1">
                                <div className="flex items-center gap-1.5">
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>+ إضافة اسم مورد جديد...</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </td>

                        {/* أزرار اختيار الطريقة المباشرة (3 أزرار واضحة وسهلة بنقرة واحدة) */}
                        <td className="p-3 text-center">
                          <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/30 gap-1 shadow-2xs">
                            {/* 1. عقد توريد */}
                            <button
                              type="button"
                              onClick={() => handleSetItemMethod(it.id, "contract")}
                              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                                currentMethod === "contract"
                                  ? "bg-sky-600 text-white shadow-xs"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
                              }`}
                            >
                              <FileSignature className="w-3.5 h-3.5" />
                              <span>عقد توريد</span>
                            </button>

                            {/* 2. أمر شراء */}
                            <button
                              type="button"
                              onClick={() => handleSetItemMethod(it.id, "purchase_order")}
                              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                                currentMethod === "purchase_order"
                                  ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-xs"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
                              }`}
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                              <span>أمر شراء</span>
                            </button>

                            {/* 3. مسؤولية مجتمعية */}
                            <button
                              type="button"
                              onClick={() => handleSetItemMethod(it.id, "csr_letter")}
                              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                                currentMethod === "csr_letter"
                                  ? "bg-teal-600 text-white shadow-xs"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
                              }`}
                            >
                              <HeartHandshake className="w-3.5 h-3.5" />
                              <span>مسؤولية</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* بطاقات المخرجات والإجراءات الثلاثة */}
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
                    {contractItems.length} أصناف ({contractSuppliers.length} موردين)
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
                    {contractSuppliers.map((sup: any, sIdx: number) => (
                      <div key={`c_sup_${sIdx}`} className="p-2 rounded-lg bg-muted/20 border border-border/70 flex items-center justify-between gap-2 shadow-2xs">
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
                  disabled={contractItems.length === 0}
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
                    {poItems.length} أصناف ({poSuppliers.length} موردين)
                  </Badge>
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-foreground">أمر شراء داخلي</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    نموذج رسمي موجه لإدارة المشتريات بالبنود المعتمدة
                  </CardDescription>
                </div>
              </CardHeader>

              <div className="px-4 py-2 flex-1 space-y-2">
                {poSuppliers.length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {poSuppliers.map((sup: any, sIdx: number) => (
                      <div key={`po_sup_${sIdx}`} className="p-2 rounded-lg bg-muted/20 border border-border/70 flex items-center justify-between text-xs">
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
                  <div className="p-2 rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">
                    <HeartHandshake className="w-5 h-5" />
                  </div>
                  <Badge variant="outline" className="text-teal-700 bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800 text-xs font-bold">
                    {csrItems.length} أصناف ({csrSuppliers.length} شركاء)
                  </Badge>
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-foreground">خطاب مسؤولية مجتمعية</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    خطاب رسمي موجه للجهات والشركات الداعمة لتأمين الأصناف
                  </CardDescription>
                </div>
              </CardHeader>

              <div className="px-4 py-2 flex-1 space-y-2">
                {csrSuppliers.length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {csrSuppliers.map((sup: any, sIdx: number) => (
                      <div key={`csr_sup_${sIdx}`} className="p-2 rounded-lg bg-muted/20 border border-border/70 flex items-center justify-between text-xs">
                        <span className="font-bold text-foreground truncate">{sup.supplierName}</span>
                        <Badge variant="secondary" className="text-[10px] font-normal">{sup.items.length} أصناف</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-muted/20 p-4 rounded-lg border border-dashed text-center text-xs text-muted-foreground">
                    لا يوجد موردون مخصصون للمسؤولية المجتمعية حالياً
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
                  <Eye className="w-3.5 h-3.5 text-teal-600" />
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
              سيتم حفظ خطة توزيع البنود والموردين واعتماد مسارات التأمين ونقل الطلب للمرحلة الخامسة (مرحلة التنفيذ).
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
                <div className="bg-teal-50 dark:bg-teal-950/40 p-2 rounded border border-teal-200 dark:border-teal-800">
                  <span className="block text-teal-700 dark:text-teal-300 font-bold">{csrSuppliers.length} شركاء</span>
                  <span className="text-muted-foreground text-[10px]">{csrItems.length} أصناف مجتمعية</span>
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

      {/* نافذة إضافة اسم مورد جديد */}
      <Dialog open={showAddSupplierModal} onOpenChange={setShowAddSupplierModal}>
        <DialogContent className="max-w-md text-right font-sans" dir="rtl">
          <DialogHeader className="text-right sm:text-right pb-2 border-b">
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <Building2 className="w-5 h-5 text-sky-600" />
              إضافة اسم مورد جديد
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground text-right sm:text-right">
              أدخل اسم المورد أو الكيان أو الجهة المانحة لاعتمادها في مسار التأمين.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">اسم المورد / الكيان:</Label>
              <Input
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
                placeholder="مثال: شركة الوفاق للتجارة والمقاولات"
                className="text-xs"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddNewSupplier();
                  }
                }}
              />
            </div>
          </div>

          <DialogFooter className="flex flex-row items-center justify-end gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowAddSupplierModal(false);
                setNewSupplierName("");
              }}
              className="text-xs"
            >
              إلغاء
            </Button>
            <Button
              size="sm"
              onClick={handleAddNewSupplier}
              className="text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white"
            >
              إضافة وتعيين
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
