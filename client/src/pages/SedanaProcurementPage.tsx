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
  ArrowRightLeft,
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
  const utils = trpc.useUtils();
  const approveOrderMutation = trpc.procurement.approvePurchaseOrder.useMutation({
    onSuccess: (res) => {
      toast.success(res.message || "تم اعتماد أمر الشراء بنجاح");
      refetchRequest();
      utils.procurement.listPurchaseOrders.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء اعتماد أمر الشراء");
    },
  });

  const saveProcurementMutation = trpc.requests.saveSedanaProcurement.useMutation({
    onSuccess: (res, vars) => {
      toast.success(res.message || "تم حفظ البيانات بنجاح");
      refetchRequest();
      utils.procurement.listPurchaseOrders.invalidate();
      if (vars.advanceToExecution) {
        setShowConfirmModal(false);
        setLocation(`/requests/${requestId}`);
      }
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء الحفظ");
    },
  });

  // استخراج بنود المسجد / الطلب مع عكس الوصف والمواصفات المحددة في الطلب
  const allItems = useMemo(() => {
    const pData = request?.programData as any;
    const bItems: any[] = Array.isArray(pData?.basketItems) ? pData.basketItems : [];
    const evalItems: any[] = Array.isArray(pData?.evaluation?.items) ? pData.evaluation.items : [];

    if (boqResult?.items && boqResult.items.length > 0) {
      return boqResult.items.map((it: any, idx: number) => {
        let desc = it.itemDescription || it.description || it.spec || "";

        // إذا لم يكن هناك وصف مباشر في جدول الكميات، نبحث عنه في سلة الطلب أو التقييم
        if (!desc || desc.trim() === "") {
          const matchBasket = bItems.find((b: any) => 
            String(b.id) === String(it.id) || 
            (b.name && it.itemName && b.name.trim().toLowerCase() === it.itemName.trim().toLowerCase())
          );
          if (matchBasket) {
            desc = matchBasket.description || matchBasket.spec || matchBasket.notes || "";
          }
        }

        if (!desc || desc.trim() === "") {
          const matchEval = evalItems.find((e: any) => 
            String(e.key) === String(it.id) || 
            (e.name && it.itemName && e.name.trim().toLowerCase() === it.itemName.trim().toLowerCase())
          );
          if (matchEval) {
            desc = matchEval.description || matchEval.spec || matchEval.notes || "";
          }
        }

        return {
          id: String(it.id || idx + 1),
          itemName: it.itemName || it.name || `بند رقم ${idx + 1}`,
          description: desc,
          quantity: parseFloat(it.quantity || "1"),
          unit: it.unit || "وحدة",
        };
      });
    }

    // fallback from sedana programData evaluation
    if (evalItems.length > 0) {
      return evalItems.map((it: any, idx: number) => ({
        id: String(it.key || idx + 1),
        itemName: it.name || it.itemName || `بند ${idx + 1}`,
        description: it.description || it.itemDescription || it.spec || it.notes || "",
        quantity: parseFloat(it.approvedQty || it.requestedQty || "1"),
        unit: it.unit || "وحدة",
      }));
    }

    if (bItems.length > 0) {
      return bItems.map((it: any, idx: number) => ({
        id: String(it.id || idx + 1),
        itemName: it.name || `بند ${idx + 1}`,
        description: it.description || it.itemDescription || it.spec || it.notes || "",
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

  // استخراج أوامر الشراء المسجلة مسبقاً للطلب إن وجدت
  const savedPurchaseOrders: any[] = useMemo(() => {
    let raw = (request as any)?.programData;
    if (typeof raw === "string") {
      try { raw = JSON.parse(raw); } catch {}
    }
    const proc = raw?.sedanaProcurement;
    const list = Array.isArray(proc?.purchaseOrders) ? [...proc.purchaseOrders] : [];
    if (proc?.activePurchaseOrder && !list.some((p: any) => p.orderNumber === proc.activePurchaseOrder.orderNumber)) {
      list.push(proc.activePurchaseOrder);
    }
    return list;
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

  // حالة طريقة التأمين لكل مورد: supplierKey -> ProcurementMethod
  const [suppliersAllocation, setSuppliersAllocation] = useState<Record<string, ProcurementMethod>>({});

  // خيارات الضبط السريع للطلب ككل
  const [selectedGlobalSupplier, setSelectedGlobalSupplier] = useState<string>("");

  // بيانات أمر الشراء الداخلي
  const [poData, setPoData] = useState({
    orderNumber: `PO-1-${new Date().getFullYear()}`,
    orderDate: new Date().toISOString().split("T")[0],
    directedTo: "",
    requesterName: "",
    requesterRole: "طالب الشراء / إدارة المشاريع",
    approverName: "",
    approverRole: "المدير التنفيذي",
    approverSignatureUrl: "",
    notes: "",
  });

  // بيانات خطاب المسؤولية المجتمعية
  const [csrData, setCsrData] = useState({
    letterNumber: `CSR-1-${new Date().getFullYear()}`,
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

      // 3. استرجاع تخصيص الموردين
      if (savedProc?.suppliersAllocation && Object.keys(savedProc.suppliersAllocation).length > 0) {
        setSuppliersAllocation(savedProc.suppliersAllocation);
      }

      // 4. استرجاع بيانات النماذج
      if (savedProc?.activePurchaseOrder) {
        const loadedOrderNumber = savedProc.activePurchaseOrder.orderNumber || `PO-${requestId}-${new Date().getFullYear()}`;
        setPoData(prev => ({
          ...prev,
          ...savedProc.activePurchaseOrder,
          orderNumber: loadedOrderNumber,
        }));
      } else {
        setPoData(prev => ({
          ...prev,
          orderNumber: `PO-${requestId}-${new Date().getFullYear()}`,
        }));
      }

      if (savedProc?.activeCsrLetter) {
        const loadedLetterNumber = savedProc.activeCsrLetter.letterNumber || `CSR-${requestId}-${new Date().getFullYear()}`;
        setCsrData(prev => ({
          ...prev,
          ...savedProc.activeCsrLetter,
          letterNumber: loadedLetterNumber,
        }));
      } else {
        setCsrData(prev => ({
          ...prev,
          letterNumber: `CSR-${requestId}-${new Date().getFullYear()}`,
        }));
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

  // تجميع البنود تحت كل مورد لعرض "الموردين مع البنود لكل مورد ونحدد النوع"
  const supplierGroups = useMemo(() => {
    const groupsMap = new Map<string, {
      key: string;
      supplierId?: number;
      supplierName: string;
      quotationId?: number;
      quotationNumber?: string;
      method: ProcurementMethod;
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

    allItems.forEach((it: any) => {
      const sup = itemSupplierMap[it.id];
      const itemMethod = itemsAllocation[it.id] || "contract";

      let key = "unassigned";
      let supName = "أصناف بانتظار تحديد المورد";
      let supId: number | undefined;
      let quoId: number | undefined;
      let isUnassigned = true;

      if (sup?.supplierName && sup.supplierName !== "لم يحدد بعد" && sup.supplierName !== "غير محدد") {
        key = sup.supplierId ? `sup_${sup.supplierId}` : `name_${sup.supplierName}`;
        supName = sup.supplierName;
        supId = sup.supplierId;
        quoId = sup.quotationId;
        isUnassigned = false;
      }

      if (!groupsMap.has(key)) {
        const quo = (quotationsResult?.quotations || []).find((q: any) => q.id === quoId || (supId && q.supplierId === supId));
        groupsMap.set(key, {
          key,
          supplierId: supId,
          supplierName: supName,
          quotationId: quoId,
          quotationNumber: quo?.quotationNumber,
          method: suppliersAllocation[key] || itemMethod || (isUnassigned ? "csr_letter" : "contract"),
          items: [],
          totalAmount: 0,
          isUnassigned,
        });
      }

      const grp = groupsMap.get(key)!;
      const unitPrice = sup?.unitPrice || 0;
      const totalPrice = sup?.totalPrice || (unitPrice > 0 ? unitPrice * it.quantity : 0);
      grp.items.push({
        ...it,
        unitPrice,
        totalPrice,
      });
      grp.totalAmount += totalPrice;
    });

    return Array.from(groupsMap.values());
  }, [allItems, itemSupplierMap, itemsAllocation, suppliersAllocation, quotationsResult]);

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
    return supplierGroups.filter(g => !g.isUnassigned && (suppliersAllocation[g.key] || g.method || "contract") === "contract");
  }, [supplierGroups, suppliersAllocation]);

  const poSuppliers = useMemo(() => {
    return supplierGroups.filter(g => !g.isUnassigned && (suppliersAllocation[g.key] || g.method) === "purchase_order");
  }, [supplierGroups, suppliersAllocation]);

  // اسم المورد الموجه إليه أمر الشراء
  const poSupplierName = useMemo(() => {
    if (poSuppliers.length > 0) {
      return poSuppliers.map(s => s.supplierName).filter(Boolean).join("، ");
    }
    return poData.directedTo || "المورد المعتمد";
  }, [poSuppliers, poData.directedTo]);

  const csrSuppliers = useMemo(() => {
    return supplierGroups.filter(g => (suppliersAllocation[g.key] || g.method) === "csr_letter");
  }, [supplierGroups, suppliersAllocation]);

  // الموردون النشطون
  const activeSuppliersList = useMemo(() => {
    return supplierGroups.filter(g => !g.isUnassigned);
  }, [supplierGroups]);

  // تغيير نوع/طريقة التأمين لمورد بالكامل (يطبق على المورد وكافة بنوده) مع الحفظ التلقائي
  const handleSupplierMethodChange = (supplierKey: string, method: ProcurementMethod) => {
    const nextSuppliersAlloc = {
      ...suppliersAllocation,
      [supplierKey]: method,
    };
    setSuppliersAllocation(nextSuppliersAlloc);

    const nextItemsAlloc = { ...itemsAllocation };
    const grp = supplierGroups.find(g => g.key === supplierKey);
    if (grp) {
      grp.items.forEach((it: any) => {
        nextItemsAlloc[it.id] = method;
      });
      setItemsAllocation(nextItemsAlloc);
    }

    // الحفظ التلقائي الفوري لتخصيص المورد وبنوده
    saveProcurementMutation.mutate({
      requestId,
      procurementData: {
        itemsAllocation: nextItemsAlloc,
        itemSupplierMap,
        suppliersAllocation: nextSuppliersAlloc,
        activePurchaseOrder: poData,
        activeCsrLetter: csrData,
        notes: `تحديد طرق التأمين والموردين`,
      },
      advanceToExecution: false,
    });

    const label = method === "contract" ? "عقد توريد وخدمات" : method === "purchase_order" ? "أمر شراء داخلي" : "خطاب مسؤولية مجتمعية";
    toast.success(`تم تحديد نوع "${label}" للمورد وحفظ التخصيص`);
  };

  // نقل بند معين إلى مورد آخر
  const handleReassignItemSupplier = (itemId: string, newSupplierName: string) => {
    if (newSupplierName === "__ADD_NEW__") {
      setAddSupplierTargetItemId(itemId);
      setShowAddSupplierModal(true);
      return;
    }
    const supObj = availableSuppliers.find(s => s.name === newSupplierName);
    setItemSupplierMap(prev => ({
      ...prev,
      [itemId]: {
        supplierId: supObj?.id,
        supplierName: newSupplierName,
        quotationId: supObj?.quotationId,
      },
    }));
    toast.success(`تم نقل البند للمورد "${newSupplierName}"`);
  };

  // تطبيق مورد على كافة البنود دفعة واحدة
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
    toast.success(`تم إسناد كافة البنود للمورد "${selectedGlobalSupplier}"`);
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
      handleReassignItemSupplier(addSupplierTargetItemId, trimmed);
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


  // فتح تقرير خطاب المسؤولية المجتمعية في صفحة منفصلة
  const handleOpenCsrLetter = () => {
    handleSaveProcurement(false);
    setLocation(`/requests/${requestId}/csr-letter`);
  };

  // فتح تقرير أمر الشراء الداخلي في صفحة منفصلة
  const handleOpenPurchaseOrder = () => {
    handleSaveProcurement(false);
    setLocation(`/requests/${requestId}/purchase-order`);
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
  // 1. الانتقال لأمر الشراء الداخلي في صفحة منفصلة
  // =========================================================================
  if (fullScreenView === "po") {
    setLocation(`/requests/${requestId}/purchase-order`);
    return null;
  }

  // =========================================================================
  // 2. الانتقال لخطاب المسؤولية المجتمعية في صفحة منفصلة
  // =========================================================================
  if (fullScreenView === "csr") {
    setLocation(`/requests/${requestId}/csr-letter`);
    return null;
  }

  // =========================================================================
  // 3. الشاشة الرئيسية: الموردين مع البنود لكل مورد وتحديد النوع
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
                  تأمين بنود الطلب والتعاقد
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
              size="sm"
              onClick={() => setShowConfirmModal(true)}
              disabled={saveProcurementMutation.isPending}
              className="h-8 gap-1.5 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-xs cursor-pointer"
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
              <p className="text-[11px] text-muted-foreground">الموردون المعتمدون</p>
              <p className="text-lg font-bold text-foreground mt-0.5">
                {activeSuppliersList.length} <span className="text-xs font-normal text-muted-foreground">موردين</span>
              </p>
            </div>
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <Building2 className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white dark:bg-card p-3 rounded-xl border border-sky-100 dark:border-sky-900/40 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] text-sky-700 dark:text-sky-400">عقود التوريد والخدمات</p>
              <p className="text-lg font-bold text-sky-800 dark:text-sky-200 mt-0.5">
                {contractSuppliers.length} <span className="text-xs font-normal">موردين</span>
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
                {poSuppliers.length} <span className="text-xs font-normal">موردين</span>
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
                {csrSuppliers.length} <span className="text-xs font-normal">موردين/جهات</span>
              </p>
            </div>
            <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-600">
              <HeartHandshake className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* القسم الرئيسي: عرض الموردين مع البنود لكل مورد وتحديد النوع */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4 text-sky-600" />
              <span>الموردون وبنود كل مورد وتحديد النوع:</span>
            </h2>
          </div>

          {/* بطاقات الموردين مع بنود كل مورد */}
          {supplierGroups.map((grp) => {
            const currentMethod = suppliersAllocation[grp.key] || grp.method || "contract";

            return (
              <Card
                key={grp.key}
                className={`border shadow-xs overflow-hidden transition-all ${
                  grp.isUnassigned
                    ? "border-amber-200 dark:border-amber-800/60 bg-amber-50/10 dark:bg-amber-950/10"
                    : currentMethod === "contract"
                    ? "border-sky-200 dark:border-sky-800/60 bg-white dark:bg-card"
                    : currentMethod === "purchase_order"
                    ? "border-slate-300 dark:border-slate-700 bg-white dark:bg-card"
                    : "border-teal-200 dark:border-teal-800/60 bg-white dark:bg-card"
                }`}
              >
                {/* ترويسة بطاقة المورد وتحديد النوع */}
                <CardHeader className="p-4 sm:p-5 pb-3 border-b bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* معلومات المورد */}
                  <div className="flex items-start sm:items-center gap-3">
                    <div className={`p-2.5 rounded-xl shrink-0 ${
                      grp.isUnassigned
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        : currentMethod === "contract"
                        ? "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300"
                        : currentMethod === "purchase_order"
                        ? "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                        : "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300"
                    }`}>
                      {grp.isUnassigned ? <AlertCircle className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-base text-foreground">
                          {grp.supplierName}
                        </span>
                        <Badge variant="outline" className="text-xs font-semibold px-2 py-0.5">
                          {grp.items.length} أصناف
                        </Badge>
                        {grp.quotationNumber && (
                          <Badge variant="secondary" className="text-[11px] font-mono">
                            عرض سعر #{grp.quotationNumber}
                          </Badge>
                        )}
                        {grp.totalAmount > 0 && (
                          <Badge variant="outline" className="text-xs font-mono font-bold text-sky-700 bg-sky-50 dark:bg-sky-950/40 border-sky-200">
                            {formatCurrency(grp.totalAmount)} ر.س
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {grp.isUnassigned
                          ? "هذه البنود لم تُسند لمورد بعد، يرجى اختيار مورد لها أدناه أو نقلها لمورد محدد"
                          : "الأصناف الموكلة لهذا المورد ونوع التأمين المعتمد له"}
                      </p>
                    </div>
                  </div>

                  {/* تحديد النوع (طريقة التأمين للمورد بنقرة واحدة) */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 shrink-0">
                    <span className="text-xs font-bold text-foreground">تحديد النوع:</span>
                    <div className="inline-flex rounded-xl border border-border p-1 bg-background/90 shadow-2xs gap-1">
                      {/* 1. عقد توريد وخدمات */}
                      <button
                        type="button"
                        onClick={() => handleSupplierMethodChange(grp.key, "contract")}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                          currentMethod === "contract"
                            ? "bg-sky-600 text-white shadow-xs"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                      >
                        <FileSignature className="w-4 h-4" />
                        <span>عقد توريد وخدمات</span>
                      </button>

                      {/* 2. أمر شراء داخلي */}
                      <button
                        type="button"
                        onClick={() => handleSupplierMethodChange(grp.key, "purchase_order")}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                          currentMethod === "purchase_order"
                            ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-xs"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                      >
                        <ShoppingCart className="w-4 h-4" />
                        <span>أمر شراء داخلي</span>
                      </button>

                      {/* 3. خطاب مسؤولية مجتمعية */}
                      <button
                        type="button"
                        onClick={() => handleSupplierMethodChange(grp.key, "csr_letter")}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                          currentMethod === "csr_letter"
                            ? "bg-teal-600 text-white shadow-xs"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                      >
                        <HeartHandshake className="w-4 h-4" />
                        <span>مسؤولية مجتمعية</span>
                      </button>
                    </div>
                  </div>
                </CardHeader>

                {/* جدول البنود التابعة لهذا المورد */}
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-right border-collapse">
                      <thead className="bg-slate-50/80 dark:bg-slate-900/60 text-muted-foreground border-b border-border font-semibold">
                        <tr>
                          <th className="py-2.5 px-3 w-12 text-center">#</th>
                          <th className="py-2.5 px-4">اسم الصنف والمواصفات</th>
                          <th className="py-2.5 px-4 text-center w-36">الكمية والوحدة</th>
                          <th className="py-2.5 px-4 text-center w-36">السعر التقديري</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {grp.items.map((it: any, iIdx: number) => {
                          const itemPrice = Number(it.totalPrice || 0);
                          return (
                            <tr key={it.id} className="hover:bg-muted/20 transition-colors">
                              <td className="py-2.5 px-3 text-center font-mono text-muted-foreground font-semibold">
                                {iIdx + 1}
                              </td>
                              <td className="py-2.5 px-4">
                                <span className="font-bold text-foreground text-xs sm:text-sm block">
                                  {it.itemName}
                                </span>
                                {it.description ? (
                                  <span className="text-[11px] text-muted-foreground mt-0.5 block leading-relaxed">
                                    {it.description}
                                  </span>
                                ) : null}
                              </td>
                              <td className="py-2.5 px-4 text-center">
                                <span className="inline-flex items-center justify-center gap-1.5 font-bold text-foreground bg-muted/60 dark:bg-muted/30 border border-border/60 px-2.5 py-1 rounded-md text-xs font-mono">
                                  <span>{it.quantity}</span>
                                  <span className="text-muted-foreground font-normal text-[11px] font-sans">{it.unit}</span>
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-center">
                                {itemPrice > 0 ? (
                                  <span className="inline-flex items-baseline gap-1 font-mono font-bold text-foreground text-xs bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200/60 dark:border-sky-800/40 px-2 py-0.5 rounded">
                                    <span>{formatCurrency(itemPrice)}</span>
                                    <span className="text-[10px] font-sans text-muted-foreground font-normal">ر.س</span>
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground font-mono">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            );
          })}
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
                  <span className="block text-teal-700 dark:text-teal-300 font-bold">{csrSuppliers.length} موردين/جهات</span>
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

      {/* تقرير الطباعة الرسمي A4 للصفحة الرئيسية عند الطباعة */}
      <div className="hidden print:block printable-procurement-report w-full max-w-[210mm] mx-auto p-0 bg-white font-sans text-slate-900" dir="rtl">
        {/* ترويسة التقرير */}
        <div className="flex justify-between items-center pb-3 mb-4 border-b border-slate-300">
          <div className="flex items-center gap-3">
            {orgSettings?.logoUrl ? (
              <img src={orgSettings.logoUrl} alt="شعار الجمعية" className="h-14 sm:h-16 w-auto object-contain" />
            ) : (
              <div className="w-14 h-14 bg-sky-50 rounded-lg flex items-center justify-center border border-sky-200">
                <span className="text-sky-700 font-bold text-xl">سدانة</span>
              </div>
            )}
            <div>
              <h2 className="text-base font-bold text-sky-900">
                {orgName}
              </h2>
              <p className="text-xs text-slate-500 font-medium">إدارة المشاريع والمشتريات • برنامج سدانة</p>
            </div>
          </div>

          <div className="text-xs space-y-1 text-left font-mono">
            <div><span className="text-slate-500">رقم الطلب: </span><strong>#{request?.requestNumber || requestId}</strong></div>
            <div><span className="text-slate-500">التاريخ: </span><strong>{new Date().toISOString().split("T")[0]}</strong></div>
            <div><span className="text-slate-500">المسجد: </span><strong>{mosqueName} {request?.mosque?.city ? `(${request.mosque.city})` : ""}</strong></div>
          </div>
        </div>

        {/* عنوان التقرير */}
        <div className="bg-[#0284c7] text-white font-bold text-center py-2 px-4 rounded text-sm sm:text-base mb-4 shadow-2xs">
          محضر توزيع بنود الطلب ومسارات التأمين والموردين
        </div>

        {/* ملخص المسارات */}
        <div className="grid grid-cols-3 gap-3 mb-4 text-xs">
          <div className="border border-slate-200 bg-slate-50 p-2.5 rounded text-center">
            <span className="text-slate-500 block">عقود التوريد والخدمات</span>
            <strong className="text-sky-900 text-sm">{contractItems.length} بنود ({contractSuppliers.length} موردين)</strong>
          </div>
          <div className="border border-slate-200 bg-slate-50 p-2.5 rounded text-center">
            <span className="text-slate-500 block">أوامر الشراء الداخلية</span>
            <strong className="text-slate-900 text-sm">{poItems.length} بنود ({poSuppliers.length} موردين)</strong>
          </div>
          <div className="border border-slate-200 bg-slate-50 p-2.5 rounded text-center">
            <span className="text-slate-500 block">المسؤولية المجتمعية</span>
            <strong className="text-teal-900 text-sm">{csrItems.length} بنود ({csrSuppliers.length} موردين)</strong>
          </div>
        </div>

        {/* جدول البنود والتوزيع */}
        <div className="mb-4">
          <table className="w-full border-collapse border border-slate-300 text-xs text-right">
            <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
              <tr>
                <th className="p-2 border-l border-slate-300 text-center w-10">م</th>
                <th className="p-2 border-l border-slate-300">اسم الصنف</th>
                <th className="p-2 border-l border-slate-300">الوصف والمواصفات</th>
                <th className="p-2 border-l border-slate-300 text-center w-20">الكمية</th>
                <th className="p-2 border-l border-slate-300 text-center w-16">الوحدة</th>
                <th className="p-2 border-l border-slate-300">المورد المعتمد</th>
                <th className="p-2 border-l border-slate-300 text-center w-28">طريقة التأمين</th>
                <th className="p-2 text-center w-24">السعر التقديري</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {allItems.map((it: any, idx: number) => {
                const supInfo = itemSupplierMap[it.id];
                const method = itemsAllocation[it.id] || "contract";
                const methodLabel = method === "contract" ? "عقد توريد" : method === "purchase_order" ? "أمر شراء" : "مسؤولية مجتمعية";
                return (
                  <tr key={it.id} className="h-9">
                    <td className="p-2 border-l border-slate-300 text-center font-mono text-slate-600">{idx + 1}</td>
                    <td className="p-2 border-l border-slate-300 font-bold text-slate-900">{it.itemName}</td>
                    <td className="p-2 border-l border-slate-300 text-slate-700">{it.description || "-"}</td>
                    <td className="p-2 border-l border-slate-300 text-center font-bold text-slate-900">{it.quantity}</td>
                    <td className="p-2 border-l border-slate-300 text-center text-slate-700">{it.unit}</td>
                    <td className="p-2 border-l border-slate-300 text-slate-800 font-medium">{supInfo?.supplierName || "غير محدد"}</td>
                    <td className="p-2 border-l border-slate-300 text-center font-medium">{methodLabel}</td>
                    <td className="p-2 text-center font-mono">{supInfo?.totalPrice ? `${formatCurrency(supInfo.totalPrice)} ر.س` : "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* التوقيعات */}
        <div className="pt-4 mt-6 border-t border-slate-300 break-inside-avoid">
          <table className="w-full border-collapse border border-slate-300 text-xs text-center">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800">
                <th className="p-2 border-l border-slate-300 w-1/2">طالب الشراء / إدارة المشاريع</th>
                <th className="p-2 w-1/2">المدير التنفيذي (صاحب الصلاحية)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="h-16">
                <td className="p-2 border-l border-slate-300 align-bottom">
                  <p className="font-bold text-slate-900">{poData.requesterName || "مسؤول المشتريات"}</p>
                  <p className="text-[10px] text-slate-500">(التوقيع والاعتماد)</p>
                </td>
                <td className="p-2 align-bottom">
                  <p className="font-bold text-slate-900">{poData.approverName || "المدير التنفيذي"}</p>
                  {poData.approverSignatureUrl ? (
                    <img src={poData.approverSignatureUrl} alt="التوقيع" className="max-h-10 mx-auto object-contain" />
                  ) : (
                    <p className="text-[10px] text-slate-500">(التوقيع والاعتماد)</p>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* تذييل الصفحة */}
        <div className="mt-8 pt-3 border-t border-slate-200 text-center text-slate-400 text-[10px] flex justify-between items-center">
          <span>{orgName} • برنامج سدانة لعمارة المساجد</span>
          <span>صفحة 1 من 1</span>
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box !important;
          }
          html, body {
            background-color: white !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: 100% !important;
            overflow: visible !important;
          }
          .print\\:hidden, header, nav, aside {
            display: none !important;
          }
          .min-h-screen {
            background-color: white !important;
            padding: 0 !important;
            min-height: 0 !important;
            height: auto !important;
          }
          .printable-procurement-report {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          tr, table, .break-inside-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}
