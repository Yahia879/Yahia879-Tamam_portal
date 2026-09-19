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
  Store,
  Users,
  Layers,
  ArrowLeftRight,
} from "lucide-react";
import { toast } from "sonner";
import { useDocumentTitle } from "@/contexts/DocumentTitleContext";

type ProcurementMethod = "contract" | "purchase_order" | "csr_letter";

interface BoqItem {
  id: string;
  itemName: string;
  description: string;
  quantity: number;
  unit: string;
}

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

  // جلب عروض الأسعار للطلب للتعرف على الموردين الفائزين بالبنود
  const { data: quotationsData } = trpc.projects.getQuotationsByRequest.useQuery(
    { requestId },
    { enabled: !!requestId && requestId > 0 }
  );

  // جلب الموردين النشطين والمعتمدين لتسهيل التعيين والتبديل
  const { data: activeSuppliers = [] } = trpc.suppliers.getActiveSuppliers.useQuery({
    includeUnapproved: true,
  });

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
  const allItems: BoqItem[] = useMemo(() => {
    if (boqResult?.items && boqResult.items.length > 0) {
      return boqResult.items.map((it: any, idx: number): BoqItem => ({
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

  // نمط العرض: إما مجمع حسب المورد "grouped" أو جدول كافة البنود "table"
  const [viewMode, setViewMode] = useState<"grouped" | "table">("grouped");

  // حالة تجزئة البنود: كل بند له طريقة من الـ 3 (عقد، أمر شراء، مسؤولية مجتمعية)
  const [itemsAllocation, setItemsAllocation] = useState<Record<string, ProcurementMethod>>({});

  // خريطة الموردين لكل بند: itemId -> { supplierId?: number, supplierName: string }
  const [itemSuppliers, setItemSuppliers] = useState<Record<string, { supplierId?: number; supplierName: string }>>({});

  // موردون أو جهات مضافة يدوياً
  const [customSuppliers, setCustomSuppliers] = useState<Array<{ id?: number; name: string }>>([]);

  // نافذة إضافة مورد أو جهة جديدة
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [selectedExistingSupplierId, setSelectedExistingSupplierId] = useState<string>("");

  // بيانات أمر الشراء الداخلي
  const [poData, setPoData] = useState({
    orderNumber: `PO-${requestId}-${new Date().getFullYear()}`,
    orderDate: new Date().toISOString().split("T")[0],
    directedTo: "إلى إدارة المشتريات (متعهد صيانة المحطة)",
    supplierName: "",
    supplierRole: "المورد / متعهد التوريد",
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
    salutation: "السادة", // السادة / السيد / السيدة (ممنوع منعاً باتاً أصحاب السعادة)
    recipientName: "الجهة المانحة / الشريك المجتمعي",
    honorific: "المحترمون", // المحترمون / المحترم / الموقر
    projectName: "",
    supplierRole: "المورد / الشريك المجتمعي",
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
        if (savedProc.itemsAllocation && Object.keys(savedProc.itemsAllocation).length > 0) {
          setItemsAllocation(savedProc.itemsAllocation);
        }
        if (savedProc.itemSupplierMap && Object.keys(savedProc.itemSupplierMap).length > 0) {
          setItemSuppliers(savedProc.itemSupplierMap);
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

  // تهيئة تخصيص البنود والموردين تلقائياً وفق رغبة المستخدم وعروض الأسعار
  useEffect(() => {
    if (allItems.length > 0 && Object.keys(itemsAllocation).length === 0) {
      const initialAlloc: Record<string, ProcurementMethod> = {};
      const initialSupp: Record<string, { supplierId?: number; supplierName: string }> = {};

      const quotes = quotationsData?.quotations || [];
      const acceptedQuotes = quotes.filter((q: any) => q.status === "accepted" || q.status === "approved");

      allItems.forEach((it: BoqItem) => {
        const name = (it.itemName || "").toLowerCase();

        // 1. التخصيص الدقيق للبنود المطلوبة
        if (name.includes("صابون")) {
          initialAlloc[it.id] = "contract";
          initialSupp[it.id] = { supplierId: 6, supplierName: "مؤسسة التوريد والخدمات (test)" };
        } else if (name.includes("عبوات مياه")) {
          initialAlloc[it.id] = "contract";
          initialSupp[it.id] = { supplierId: 6, supplierName: "مؤسسة التوريد والخدمات (test)" };
        } else if (name.trim() === "لا" || (name.trim().startsWith("لا") && name.trim().length <= 4)) {
          initialAlloc[it.id] = "csr_letter";
          initialSupp[it.id] = { supplierName: "الجهة المانحة / الشريك المجتمعي" };
        } else if (name.includes("صهاريج") || name.includes("صهريج")) {
          initialAlloc[it.id] = "csr_letter";
          initialSupp[it.id] = { supplierName: "الجهة المانحة / الشريك المجتمعي" };
        } else if (name.includes("محطة وفلاتر") || name.includes("فلاتر المياه")) {
          initialAlloc[it.id] = "purchase_order";
          initialSupp[it.id] = { supplierName: "إدارة المشتريات / متعهد صيانة المحطة" };
        } else if (name.includes("منظفات") || name.includes("مطهرات")) {
          initialAlloc[it.id] = "contract";
          initialSupp[it.id] = { supplierId: 6, supplierName: "مؤسسة التوريد والخدمات (test)" };
        } else if (name.includes("معطرات") || name.includes("تعطير")) {
          initialAlloc[it.id] = "contract";
          initialSupp[it.id] = { supplierId: 6, supplierName: "مؤسسة التوريد والخدمات (test)" };
        } else if (name.includes("بخور")) {
          initialAlloc[it.id] = "contract";
          initialSupp[it.id] = { supplierId: 6, supplierName: "مؤسسة التوريد والخدمات (test)" };
        } else if (name.includes("تكييف") || name.includes("المكيفات")) {
          initialAlloc[it.id] = "contract";
          initialSupp[it.id] = { supplierId: 6, supplierName: "مؤسسة التوريد والخدمات (test)" };
        } else if (name.includes("أكياس") || name.includes("نفايات")) {
          initialAlloc[it.id] = "contract";
          initialSupp[it.id] = { supplierId: 6, supplierName: "مؤسسة التوريد والخدمات (test)" };
        } else {
          // محاولة المطابقة التلقائية مع عروض الأسعار المقبولة
          let matchedQuote: any = null;
          for (const q of acceptedQuotes) {
            let qItems: any[] = [];
            try {
              qItems = typeof q.items === "string" ? JSON.parse(q.items) : (q.items || []);
            } catch {
              qItems = [];
            }
            if (qItems.some((qi: any) => String(qi.boqItemId || qi.id) === it.id || qi.itemName === it.itemName)) {
              matchedQuote = q;
              break;
            }
          }

          if (matchedQuote) {
            initialAlloc[it.id] = "contract";
            initialSupp[it.id] = {
              supplierId: matchedQuote.supplierId,
              supplierName: matchedQuote.supplierName || `مورد رقم ${matchedQuote.supplierId}`,
            };
          } else {
            initialAlloc[it.id] = "contract";
            initialSupp[it.id] = { supplierName: "مؤسسة التوريد والخدمات (test)" };
          }
        }
      });

      setItemsAllocation(initialAlloc);
      setItemSuppliers(initialSupp);
    }
  }, [allItems, quotationsData, itemsAllocation]);

  // مجموعات البنود مصنفة ومجمعة حسب المورد
  const supplierGroups = useMemo(() => {
    const map = new Map<string, {
      supplierName: string;
      supplierId?: number;
      items: BoqItem[];
      dominantMethod: ProcurementMethod;
      isHomogeneous: boolean;
    }>();

    allItems.forEach((it: BoqItem) => {
      const sInfo = itemSuppliers[it.id] || { supplierName: "مؤسسة التوريد والخدمات (test)" };
      const sName = sInfo.supplierName || "مؤسسة التوريد والخدمات (test)";
      const sId = sInfo.supplierId;

      if (!map.has(sName)) {
        map.set(sName, {
          supplierName: sName,
          supplierId: sId,
          items: [],
          dominantMethod: itemsAllocation[it.id] || "contract",
          isHomogeneous: true,
        });
      }
      map.get(sName)!.items.push(it);
    });

    return Array.from(map.values()).map((grp) => {
      const methods = grp.items.map((it: BoqItem) => itemsAllocation[it.id] || "contract");
      const counts = {
        contract: methods.filter(m => m === "contract").length,
        purchase_order: methods.filter(m => m === "purchase_order").length,
        csr_letter: methods.filter(m => m === "csr_letter").length,
      };

      let dominant: ProcurementMethod = "contract";
      if (counts.purchase_order > counts.contract && counts.purchase_order >= counts.csr_letter) {
        dominant = "purchase_order";
      } else if (counts.csr_letter > counts.contract && counts.csr_letter > counts.purchase_order) {
        dominant = "csr_letter";
      } else if (counts.contract > 0) {
        dominant = "contract";
      } else {
        dominant = methods[0] || "contract";
      }

      return {
        ...grp,
        dominantMethod: dominant,
        isHomogeneous: grp.items.every((it: BoqItem) => (itemsAllocation[it.id] || "contract") === dominant),
      };
    });
  }, [allItems, itemSuppliers, itemsAllocation]);

  // قائمة كافة الموردين والجهات المتاحة للاختيار السريع
  const allAvailableSuppliers = useMemo(() => {
    const list: Array<{ id?: number; name: string }> = [];
    const seen = new Set<string>();

    const add = (name: string, id?: number) => {
      const trimmed = (name || "").trim();
      if (!trimmed || seen.has(trimmed)) return;
      seen.add(trimmed);
      list.push({ id, name: trimmed });
    };

    // 1. من المجموعات الحالية
    supplierGroups.forEach(g => add(g.supplierName, g.supplierId));

    // 2. من عروض الأسعار
    (quotationsData?.quotations || []).forEach((q: any) => {
      if (q.supplierName) add(q.supplierName, q.supplierId);
    });

    // 3. من الموردين النشطين بالمنصة
    (activeSuppliers as any[]).forEach((s: any) => {
      if (s.name) add(s.name, s.id);
    });

    // 4. موردون مضافون يدوياً
    customSuppliers.forEach((c: { id?: number; name: string }) => add(c.name, c.id));

    // 5. الخيارات الافتراضية
    add("مؤسسة التوريد والخدمات (test)", 6);
    add("إدارة المشتريات / متعهد صيانة المحطة");
    add("الجهة المانحة / الشريك المجتمعي");

    return list;
  }, [supplierGroups, quotationsData, activeSuppliers, customSuppliers]);

  // البنود المخصصة لكل طريقة بدقة
  const contractItems = useMemo(() => {
    return allItems.filter((it: BoqItem) => (itemsAllocation[it.id] || "contract") === "contract");
  }, [allItems, itemsAllocation]);

  const poItems = useMemo(() => {
    return allItems.filter((it: BoqItem) => itemsAllocation[it.id] === "purchase_order");
  }, [allItems, itemsAllocation]);

  const csrItems = useMemo(() => {
    return allItems.filter((it: BoqItem) => itemsAllocation[it.id] === "csr_letter");
  }, [allItems, itemsAllocation]);

  // استخراج اسم المورد المعتمد لأمر الشراء الداخلي
  const poSupplierName = useMemo(() => {
    if (poData.supplierName) return poData.supplierName;
    for (const it of poItems) {
      if (itemSuppliers[it.id]?.supplierName) {
        return itemSuppliers[it.id].supplierName;
      }
    }
    return poData.directedTo ? poData.directedTo.replace(/^إلى\s*/, "") : "إدارة المشتريات / متعهد صيانة المحطة";
  }, [poItems, itemSuppliers, poData.supplierName, poData.directedTo]);

  // استخراج اسم الجهة أو المورد لخطاب المسؤولية المجتمعية
  const csrSupplierName = useMemo(() => {
    for (const it of csrItems) {
      if (itemSuppliers[it.id]?.supplierName) {
        return itemSuppliers[it.id].supplierName;
      }
    }
    return csrData.recipientName || "الجهة المانحة / الشريك المجتمعي";
  }, [csrItems, itemSuppliers, csrData.recipientName]);

  // تغيير طريقة التأمين لجميع بنود مورد معين دفعة واحدة
  const handleSupplierMethodChange = (supplierName: string, newMethod: ProcurementMethod) => {
    const targetItemIds = allItems
      .filter((it: BoqItem) => (itemSuppliers[it.id]?.supplierName || "مؤسسة التوريد والخدمات (test)") === supplierName)
      .map((it: BoqItem) => it.id);

    setItemsAllocation(prev => {
      const next = { ...prev };
      targetItemIds.forEach(id => {
        next[id] = newMethod;
      });
      return next;
    });

    if (newMethod === "purchase_order") {
      setPoData(prev => ({
        ...prev,
        directedTo: `إلى إدارة المشتريات (${supplierName})`,
      }));
    } else if (newMethod === "csr_letter") {
      setCsrData(prev => ({
        ...prev,
        recipientName: supplierName.includes("الجهة") ? supplierName : `السادة / ${supplierName}`,
      }));
    }

    const labels: Record<ProcurementMethod, string> = {
      contract: "عقد توريد وخدمات",
      purchase_order: "أمر شراء داخلي",
      csr_letter: "خطاب مسؤولية مجتمعية",
    };

    toast.success(`تم تحديد مسار التأمين لبنود (${supplierName}) إلى: ${labels[newMethod]}`);
  };

  // تغيير طريقة التأمين لبند معين فردياً
  const handleItemAllocationChange = (itemId: string, method: ProcurementMethod) => {
    setItemsAllocation(prev => ({
      ...prev,
      [itemId]: method,
    }));
  };

  // تغيير المورد التابع له بند معين
  const handleItemSupplierChange = (itemId: string, newSupplierName: string, newSupplierId?: number) => {
    setItemSuppliers(prev => ({
      ...prev,
      [itemId]: { supplierName: newSupplierName, supplierId: newSupplierId },
    }));
    toast.success("تم نقل البند للمورد المحدد");
  };

  // إضافة مورد أو جهة جديدة
  const handleAddSupplierGroup = () => {
    let finalName = newSupplierName.trim();
    let finalId: number | undefined = undefined;

    if (selectedExistingSupplierId) {
      const found = (activeSuppliers as any[]).find((s: any) => String(s.id) === selectedExistingSupplierId);
      if (found) {
        finalName = found.name;
        finalId = found.id;
      }
    }

    if (!finalName) {
      toast.error("يرجى إدخال أو اختيار اسم المورد أو الجهة");
      return;
    }

    setCustomSuppliers(prev => [...prev, { name: finalName, id: finalId }]);
    setShowAddSupplierModal(false);
    setNewSupplierName("");
    setSelectedExistingSupplierId("");
    toast.success(`تمت إضافة: ${finalName}`);
  };

  // حفظ التجزئة والبيانات
  const handleSaveProcurement = (advanceStage: boolean = false) => {
    const suppliersAlloc: Record<string, any> = {};
    supplierGroups.forEach(grp => {
      suppliersAlloc[grp.supplierName] = {
        supplierName: grp.supplierName,
        supplierId: grp.supplierId,
        method: grp.dominantMethod,
        itemIds: grp.items.map((it: BoqItem) => it.id),
      };
    });

    saveProcurementMutation.mutate({
      requestId,
      procurementData: {
        itemsAllocation,
        itemSupplierMap: itemSuppliers,
        suppliersAllocation: suppliersAlloc,
        activePurchaseOrder: poData,
        activeCsrLetter: csrData,
        notes: `تحديد طرق التأمين حسب الموردين (${contractItems.length} عقد، ${poItems.length} أمر شراء، ${csrItems.length} مسؤولية مجتمعية)`,
      },
      advanceToExecution: advanceStage,
    });
  };

  // الانتقال لإنشاء عقد لمورد معين مع حفظ التخصيص الحالي
  const handleCreateContractForSupplier = (supplierName?: string, supplierId?: number) => {
    handleSaveProcurement(false);
    const query = new URLSearchParams();
    query.set("requestId", String(requestId));
    if (supplierId) query.set("supplierId", String(supplierId));
    if (supplierName) query.set("supplierName", supplierName);
    setLocation(`/contracts/new/request/${requestId}?${query.toString()}`);
  };

  // الانتقال لإنشاء عقد عام
  const handleCreateContract = () => {
    handleCreateContractForSupplier();
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
                  <Label className="text-[11px] mb-1 block text-muted-foreground">اسم المورد / متعهد التوريد</Label>
                  <Input
                    value={poData.supplierName || poSupplierName}
                    onChange={(e) => setPoData(prev => ({ ...prev, supplierName: e.target.value }))}
                    className="h-8 text-xs font-semibold"
                  />
                </div>
                <div>
                  <Label className="text-[11px] mb-1 block text-muted-foreground">اسم صاحب الصلاحية (المدير التنفيذي)</Label>
                  <Input
                    value={poData.approverName}
                    onChange={(e) => setPoData(prev => ({ ...prev, approverName: e.target.value }))}
                    className="h-8 text-xs font-semibold"
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
                      poItems.map((it: BoqItem, idx: number) => (
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

              {/* جدول التوقيعات والاعتماد: التوقيع من المورد ومن المدير التنفيذي */}
              <div className="pt-4 break-inside-avoid">
                <table className="w-full border-collapse border border-slate-300 text-xs text-center">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800">
                      <th className="p-2 border-l border-slate-300 w-1/4">الصفة / الطرف</th>
                      <th className="p-2 border-l border-slate-300 w-1/4">الاسم والجهة</th>
                      <th className="p-2 border-l border-slate-300 w-1/4">التوقيع والختم</th>
                      <th className="p-2 w-1/4">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* الطرف الأول: المورد */}
                    <tr className="border-b border-slate-300 h-14 sm:h-16">
                      <td className="p-2 border-l border-slate-300 font-bold text-slate-700">المورد / متعهد التوريد</td>
                      <td className="p-2 border-l border-slate-300 font-bold text-slate-900">{poSupplierName}</td>
                      <td className="p-2 border-l border-slate-300">
                        <div className="h-8 border-b border-dashed border-gray-300 mx-auto w-24 sm:w-32"></div>
                      </td>
                      <td className="p-2 text-slate-600 font-medium text-[11px]">{poData.orderDate}</td>
                    </tr>

                    {/* الطرف الثاني: المدير التنفيذي */}
                    <tr className="h-14 sm:h-16">
                      <td className="p-2 border-l border-slate-300 font-bold text-slate-700">{poData.approverRole || "المدير التنفيذي"}</td>
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
                  <Label className="text-[11px] mb-1 block text-muted-foreground">اسم المورد / الشريك المجتمعي</Label>
                  <Input
                    value={csrData.recipientName}
                    onChange={(e) => setCsrData(prev => ({ ...prev, recipientName: e.target.value }))}
                    className="h-8 text-xs font-semibold"
                  />
                </div>

                <div>
                  <Label className="text-[11px] mb-1 block text-muted-foreground">اسم المدير التنفيذي (الاعتماد)</Label>
                  <Input
                    value={csrData.signatoryName}
                    onChange={(e) => setCsrData(prev => ({ ...prev, signatoryName: e.target.value }))}
                    className="h-8 text-xs font-semibold"
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
                      csrItems.map((it: BoqItem, idx: number) => (
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

              {/* خانة التوقيع والاعتماد الرسمي: توقيع المورد وتوقيع المدير التنفيذي */}
              <div className="pt-8 grid grid-cols-2 gap-6 sm:gap-10 items-start break-inside-avoid">
                {/* الطرف الأول: المورد / الشريك المجتمعي */}
                <div className="text-center space-y-2 p-3 sm:p-4 rounded-lg bg-slate-50/70 border border-slate-200">
                  <p className="font-bold text-xs sm:text-sm text-slate-800">
                    المورد / ممثل الجهة والشريك المجتمعي
                  </p>
                  <div className="h-14 flex items-center justify-center">
                    <div className="border-b border-dashed border-slate-400 w-36 sm:w-44 mx-auto" />
                  </div>
                  <p className="font-bold text-xs sm:text-sm text-slate-900 truncate px-2">
                    {csrSupplierName}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">التوقيع والختم الرسمي</p>
                </div>

                {/* الطرف الثاني: المدير التنفيذي */}
                <div className="text-center space-y-2 p-3 sm:p-4 rounded-lg bg-slate-50/70 border border-slate-200">
                  <p className="font-bold text-xs sm:text-sm text-slate-800">
                    {csrData.signatoryTitle || "المدير التنفيذي"}
                  </p>
                  <div className="h-14 flex items-center justify-center">
                    <div className="border-b border-dashed border-slate-400 w-36 sm:w-44 mx-auto" />
                  </div>
                  <p className="font-bold text-xs sm:text-sm text-slate-900 truncate px-2">
                    {csrData.signatoryName || "المهندس المفوض بالتوقيع"}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">الجمعية / إدارة المشاريع</p>
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

        {/* شريط الإحصائيات السريع لتوزيع البنود */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-card p-3 rounded-xl border border-border shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] text-muted-foreground">إجمالي بنود المسجد</p>
              <p className="text-lg font-bold text-foreground mt-0.5">{allItems.length}</p>
            </div>
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <Building2 className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white dark:bg-card p-3 rounded-xl border border-sky-100 dark:border-sky-900/40 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] text-sky-700 dark:text-sky-400">عقود التوريد</p>
              <p className="text-lg font-bold text-sky-800 dark:text-sky-200 mt-0.5">{contractItems.length} <span className="text-xs font-normal">بنود</span></p>
            </div>
            <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-600">
              <FileSignature className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white dark:bg-card p-3 rounded-xl border border-border shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] text-slate-700 dark:text-slate-300">أوامر الشراء الداخلية</p>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">{poItems.length} <span className="text-xs font-normal">بنود</span></p>
            </div>
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white dark:bg-card p-3 rounded-xl border border-sky-100 dark:border-sky-900/40 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] text-sky-700 dark:text-sky-400">المسؤولية المجتمعية</p>
              <p className="text-lg font-bold text-sky-800 dark:text-sky-200 mt-0.5">{csrItems.length} <span className="text-xs font-normal">بنود</span></p>
            </div>
            <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-600">
              <HeartHandshake className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* 1. جدول وتصنيف تحديد طريقة التأمين لكل بند من البنود حسب المورد */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-card p-4 rounded-xl border border-border shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">
                  تحديد مسار التأمين حسب الموردين وبنود المسجد
                </h2>
                <Badge variant="outline" className="text-xs bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:border-sky-800">
                  {supplierGroups.length} جهات وموردين
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                حدد لكل مورد أو صنف الطريقة المناسبة لتأمينه (عقد توريد وخدمات، أمر شراء داخلي، أو خطاب مسؤولية مجتمعية).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* مبدل نمط العرض: مجمع حسب الموردين أم جدول شامل */}
              <div className="bg-muted/60 p-1 rounded-lg border border-border flex items-center gap-1 text-xs">
                <Button
                  type="button"
                  size="sm"
                  variant={viewMode === "grouped" ? "default" : "ghost"}
                  onClick={() => setViewMode("grouped")}
                  className={`h-7 px-2.5 text-xs font-semibold gap-1.5 cursor-pointer ${
                    viewMode === "grouped" ? "bg-sky-600 hover:bg-sky-700 text-white shadow-2xs" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>حسب الموردين</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={viewMode === "table" ? "default" : "ghost"}
                  onClick={() => setViewMode("table")}
                  className={`h-7 px-2.5 text-xs font-semibold gap-1.5 cursor-pointer ${
                    viewMode === "table" ? "bg-sky-600 hover:bg-sky-700 text-white shadow-2xs" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>جدول كافة البنود</span>
                </Button>
              </div>

              {/* زر إضافة مورد أو جهة إضافية */}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowAddSupplierModal(true)}
                className="h-8 text-xs font-semibold gap-1 border-border hover:bg-muted"
              >
                <Plus className="w-3.5 h-3.5 text-sky-600" />
                <span>إضافة مورد / جهة</span>
              </Button>
            </div>
          </div>

          {/* العرض الأول: بطاقات مجمعة حسب المورد */}
          {viewMode === "grouped" ? (
            <div className="space-y-4">
              {supplierGroups.map((group) => {
                const isContract = group.dominantMethod === "contract";
                const isPO = group.dominantMethod === "purchase_order";
                const isCSR = group.dominantMethod === "csr_letter";

                return (
                  <Card key={group.supplierName} className="border border-border shadow-xs bg-white dark:bg-card overflow-hidden">
                    {/* ترويسة بطاقة المورد مع المنسدلة المباشرة لطريقة التأمين */}
                    <CardHeader className="p-3.5 sm:p-4 bg-muted/20 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg border ${
                          isContract
                            ? "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:border-sky-800"
                            : isPO
                            ? "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200"
                            : "bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:border-sky-800"
                        }`}>
                          <Store className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-foreground">
                              {group.supplierName}
                            </h3>
                            <Badge variant="outline" className="text-[11px] font-semibold">
                              {group.items.length} أصناف
                            </Badge>
                            {!group.isHomogeneous && (
                              <Badge variant="outline" className="text-[10px] text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/30">
                                تخصيص متنوع
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            تحديد مسار تأمين كافة البنود التابعة لهذا المورد بنقرة واحدة
                          </p>
                        </div>
                      </div>

                      {/* وحدة تحديد الطريقة للمورد بالكامل + زر الإجراء السريع */}
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1.5 bg-background p-1 px-2 rounded-lg border border-border">
                          <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">طريقة تأمين المورد:</span>
                          <Select
                            value={group.dominantMethod}
                            onValueChange={(val) => handleSupplierMethodChange(group.supplierName, val as ProcurementMethod)}
                          >
                            <SelectTrigger className="h-7 text-xs font-bold w-44 bg-transparent border-0 focus:ring-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent dir="rtl">
                              <SelectItem value="contract" className="text-xs font-medium text-sky-700">
                                📝 عقد توريد وخدمات
                              </SelectItem>
                              <SelectItem value="purchase_order" className="text-xs font-medium text-slate-800 dark:text-slate-200">
                                🛒 أمر شراء داخلي
                              </SelectItem>
                              <SelectItem value="csr_letter" className="text-xs font-medium text-sky-800 dark:text-sky-300">
                                🤝 خطاب مسؤولية مجتمعية
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* أزرار الإجراء السريع المباشرة حسب نوع التأمين للمورد */}
                        {isContract && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCreateContractForSupplier(group.supplierName, group.supplierId)}
                            className="h-8 text-xs font-bold text-sky-700 border-sky-200 hover:bg-sky-50 dark:border-sky-800 dark:hover:bg-sky-950/40 gap-1"
                          >
                            <FileSignature className="w-3.5 h-3.5" />
                            <span>إنشاء عقد للمورد</span>
                          </Button>
                        )}
                        {isPO && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setFullScreenView("po")}
                            className="h-8 text-xs font-bold text-slate-800 border-slate-300 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 gap-1"
                          >
                            <Eye className="w-3.5 h-3.5 text-sky-600" />
                            <span>معاينة أمر الشراء</span>
                          </Button>
                        )}
                        {isCSR && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setFullScreenView("csr")}
                            className="h-8 text-xs font-bold text-sky-800 border-sky-200 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-950/40 gap-1"
                          >
                            <Eye className="w-3.5 h-3.5 text-sky-600" />
                            <span>معاينة الخطاب</span>
                          </Button>
                        )}
                      </div>
                    </CardHeader>

                    {/* جدول البنود التابعة لهذا المورد */}
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-right">
                          <thead className="bg-muted/30 text-muted-foreground border-b border-border font-semibold">
                            <tr>
                              <th className="p-2.5 w-10 text-center">#</th>
                              <th className="p-2.5">الصنف المطلوب</th>
                              <th className="p-2.5">الوصف والمواصفات</th>
                              <th className="p-2.5 text-center w-24">الكمية</th>
                              <th className="p-2.5 w-52 text-center">طريقة التأمين (تخصيص فردي)</th>
                              <th className="p-2.5 w-52 text-center">نقل لمورد آخر</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {group.items.map((item: BoqItem, idx: number) => {
                              const currentMethod = itemsAllocation[item.id] || "contract";
                              return (
                                <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                                  <td className="p-2.5 text-center font-mono text-muted-foreground">{idx + 1}</td>
                                  <td className="p-2.5 font-bold text-foreground">{item.itemName}</td>
                                  <td className="p-2.5 text-muted-foreground max-w-xs truncate">{item.description || "-"}</td>
                                  <td className="p-2.5 text-center font-bold text-foreground">
                                    {item.quantity} <span className="text-[11px] text-muted-foreground font-normal">{item.unit}</span>
                                  </td>
                                  <td className="p-2.5 text-center">
                                    <Select
                                      value={currentMethod}
                                      onValueChange={(val) => handleItemAllocationChange(item.id, val as ProcurementMethod)}
                                    >
                                      <SelectTrigger className="h-7 text-xs font-semibold bg-background border-border">
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
                                  <td className="p-2.5 text-center">
                                    <Select
                                      value={group.supplierName}
                                      onValueChange={(val) => {
                                        const found = allAvailableSuppliers.find(s => s.name === val);
                                        handleItemSupplierChange(item.id, val, found?.id);
                                      }}
                                    >
                                      <SelectTrigger className="h-7 text-xs font-medium bg-background border-border">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent dir="rtl">
                                        {allAvailableSuppliers.map((s: { id?: number; name: string }) => (
                                          <SelectItem key={s.name} value={s.name} className="text-xs">
                                            {s.name}
                                          </SelectItem>
                                        ))}
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
                );
              })}
            </div>
          ) : (
            /* العرض الثاني: جدول كافة البنود الشامل */
            <Card className="border border-border shadow-xs bg-white dark:bg-card">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-right">
                    <thead className="bg-muted/40 text-muted-foreground border-b border-border font-semibold">
                      <tr>
                        <th className="p-3 w-12 text-center">#</th>
                        <th className="p-3">الصنف المطلوب</th>
                        <th className="p-3">الوصف والمواصفات</th>
                        <th className="p-3 text-center w-24">الكمية</th>
                        <th className="p-3 w-60 text-center">المورد / الجهة المحددة</th>
                        <th className="p-3 w-60 text-center">طريقة التأمين المحددة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {allItems.map((item: BoqItem, idx: number) => {
                        const currentMethod = itemsAllocation[item.id] || "contract";
                        const currentSupplier = itemSuppliers[item.id]?.supplierName || "مؤسسة التوريد والخدمات (test)";
                        return (
                          <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                            <td className="p-3 text-center font-mono text-muted-foreground">{idx + 1}</td>
                            <td className="p-3 font-bold text-foreground">{item.itemName}</td>
                            <td className="p-3 text-muted-foreground max-w-xs truncate">{item.description || "-"}</td>
                            <td className="p-3 text-center font-bold text-foreground">
                              {item.quantity} <span className="text-[11px] text-muted-foreground font-normal">{item.unit}</span>
                            </td>
                            <td className="p-3 text-center">
                              <Select
                                value={currentSupplier}
                                onValueChange={(val) => {
                                  const found = allAvailableSuppliers.find(s => s.name === val);
                                  handleItemSupplierChange(item.id, val, found?.id);
                                }}
                              >
                                <SelectTrigger className="h-8 text-xs font-semibold bg-background border-border">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent dir="rtl">
                                  {allAvailableSuppliers.map((s: { id?: number; name: string }) => (
                                    <SelectItem key={s.name} value={s.name} className="text-xs">
                                      {s.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
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
              </CardContent>
            </Card>
          )}
        </div>

        {/* 2. بطاقات التنفيذ والإصدار الثلاثة المباشرة */}
        <div>
          <div className="mb-3">
            <h3 className="text-sm font-bold text-foreground">
              نماذج وإجراءات التنفيذ المباشرة للبنود المحددة:
            </h3>
            <p className="text-xs text-muted-foreground">
              لكل مسار من المسارات الثلاثة، تظهر البنود المخصصة له مع إمكانية تحرير أو إصدار النموذج الرسمي فوراً
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* البطاقة 1: مسار عقود التوريد والخدمات */}
            <Card className="border border-border shadow-xs flex flex-col justify-between bg-white dark:bg-card">
              <CardHeader className="p-4 pb-2 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
                    <FileSignature className="w-5 h-5" />
                  </div>
                  <Badge variant="outline" className="text-sky-700 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800 text-xs font-bold">
                    {contractItems.length} بنود مخصصة
                  </Badge>
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-foreground">عقد توريد وخدمات</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    إبرام وتوثيق عقود التوريد والتشغيل مع الموردين الفائزين بالبنود المحددة.
                  </CardDescription>
                </div>
              </CardHeader>

              {/* قائمة البنود المخصصة لهذا المسار */}
              <div className="px-4 py-2 flex-1">
                {contractItems.length > 0 ? (
                  <div className="bg-muted/30 p-2.5 rounded-lg border border-border/60 text-xs space-y-1.5 max-h-36 overflow-y-auto">
                    <p className="font-bold text-foreground text-[11px] flex items-center gap-1">
                      <FileSignature className="w-3 h-3 text-sky-600" />
                      البنود المشمولة بالعقد:
                    </p>
                    <ul className="space-y-1 pr-3 list-disc text-muted-foreground text-[11px]">
                      {contractItems.map((it: BoqItem) => (
                        <li key={it.id}>
                          <span className="font-medium text-foreground">{it.itemName}</span> ({it.quantity} {it.unit})
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="bg-muted/20 p-3 rounded-lg border border-dashed text-center text-xs text-muted-foreground">
                    لا توجد بنود مخصصة للعقد حالياً
                  </div>
                )}

                {/* العقود المنشأة مسبقاً إن وجدت */}
                {contractsList.length > 0 && (
                  <div className="mt-2.5 space-y-1.5 pt-2 border-t border-border/60">
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
                            <Button size="sm" variant="ghost" className="h-6 text-[11px] px-1.5 text-sky-700">معاينة</Button>
                          </Link>
                          <Link href={`/contracts/${c.id}/edit`}>
                            <Button size="sm" variant="outline" className="h-6 text-[11px] px-1.5">تعديل</Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <CardContent className="p-4 pt-2 border-t mt-2 flex flex-col gap-2">
                <Button
                  size="sm"
                  onClick={handleCreateContract}
                  disabled={contractItems.length === 0}
                  className="w-full h-8 text-xs font-bold gap-1.5 bg-sky-600 hover:bg-sky-700 text-white shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {contractsList.length > 0 ? "إضافة عقد آخر" : "إنشاء عقد"}
                </Button>
                <span className="text-[11px] text-muted-foreground text-center">
                  {contractItems.length > 0 ? "حفظ التخصيص والانتقال لنموذج تحرير العقد" : "حدد بنوداً للعقد لتتمكن من إنشائه"}
                </span>
              </CardContent>
            </Card>

            {/* البطاقة 2: مسار أمر الشراء الداخلي */}
            <Card className="border border-border shadow-xs flex flex-col justify-between bg-white dark:bg-card">
              <CardHeader className="p-4 pb-2 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <Badge variant="outline" className="text-slate-700 bg-slate-100 border-slate-300 text-xs font-bold">
                    {poItems.length} بنود مخصصة
                  </Badge>
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-foreground">أمر شراء داخلي</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    نموذج رسمي موجه لإدارة المشتريات بالبنود المحددة (بدون أسعار، مع جدول توقيعات معتمد).
                  </CardDescription>
                </div>
              </CardHeader>

              {/* قائمة البنود المخصصة لأمر الشراء */}
              <div className="px-4 py-2 flex-1">
                {poItems.length > 0 ? (
                  <div className="bg-muted/30 p-2.5 rounded-lg border border-border/60 text-xs space-y-1.5 max-h-36 overflow-y-auto">
                    <p className="font-bold text-foreground text-[11px] flex items-center gap-1">
                      <ShoppingCart className="w-3 h-3 text-slate-700 dark:text-slate-300" />
                      البنود المشمولة بأمر الشراء:
                    </p>
                    <ul className="space-y-1 pr-3 list-disc text-muted-foreground text-[11px]">
                      {poItems.map((it: BoqItem) => (
                        <li key={it.id}>
                          <span className="font-medium text-foreground">{it.itemName}</span> ({it.quantity} {it.unit})
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="bg-muted/20 p-3 rounded-lg border border-dashed text-center text-xs text-muted-foreground">
                    لا توجد بنود مخصصة لأمر الشراء حالياً
                  </div>
                )}
              </div>

              <CardContent className="p-4 pt-2 border-t mt-2 flex flex-col gap-2">
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
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                  <span>{poItems.length > 0 ? "جاهز للطباعة" : "حدد بنوداً أولاً"}</span>
                  <Link href="/purchase-orders" className="text-sky-600 hover:underline font-medium">
                    سجل أوامر الشراء
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* البطاقة 3: مسار خطاب المسؤولية المجتمعية */}
            <Card className="border border-border shadow-xs flex flex-col justify-between bg-white dark:bg-card">
              <CardHeader className="p-4 pb-2 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
                    <HeartHandshake className="w-5 h-5" />
                  </div>
                  <Badge variant="outline" className="text-sky-700 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800 text-xs font-bold">
                    {csrItems.length} بنود مخصصة
                  </Badge>
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-foreground">خطاب مسؤولية مجتمعية</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    خطاب رسمي موجه للجهات والشركات الداعمة بالديباجة المعتمدة (بدون أصحاب السعادة وبدون أسعار).
                  </CardDescription>
                </div>
              </CardHeader>

              {/* قائمة البنود المخصصة للمسؤولية المجتمعية */}
              <div className="px-4 py-2 flex-1">
                {csrItems.length > 0 ? (
                  <div className="bg-muted/30 p-2.5 rounded-lg border border-border/60 text-xs space-y-1.5 max-h-36 overflow-y-auto">
                    <p className="font-bold text-foreground text-[11px] flex items-center gap-1">
                      <HeartHandshake className="w-3 h-3 text-sky-600" />
                      البنود المشمولة بالخطاب:
                    </p>
                    <ul className="space-y-1 pr-3 list-disc text-muted-foreground text-[11px]">
                      {csrItems.map((it: BoqItem) => (
                        <li key={it.id}>
                          <span className="font-medium text-foreground">{it.itemName}</span> ({it.quantity} {it.unit})
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="bg-muted/20 p-3 rounded-lg border border-dashed text-center text-xs text-muted-foreground">
                    لا توجد بنود مخصصة للمسؤولية المجتمعية حالياً
                  </div>
                )}
              </div>

              <CardContent className="p-4 pt-2 border-t mt-2 flex flex-col gap-2">
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
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                  <span>{csrItems.length > 0 ? "جاهز للطباعة" : "حدد بنوداً أولاً"}</span>
                  <Link href="/csr-letters" className="text-sky-600 hover:underline font-medium">
                    سجل الخطابات
                  </Link>
                </div>
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
              <p className="font-bold text-foreground">ملخص توزيع بنود المسجد ({allItems.length} بند):</p>
              <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                <div className="bg-sky-50 dark:bg-sky-950/40 p-2 rounded border border-sky-200 dark:border-sky-800">
                  <span className="block text-sky-700 dark:text-sky-300 font-bold">{contractItems.length}</span>
                  <span className="text-muted-foreground text-[10px]">عقود توريد</span>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800/60 p-2 rounded border border-slate-200 dark:border-slate-700">
                  <span className="block text-slate-800 dark:text-slate-200 font-bold">{poItems.length}</span>
                  <span className="text-muted-foreground text-[10px]">أوامر شراء</span>
                </div>
                <div className="bg-sky-50 dark:bg-sky-950/40 p-2 rounded border border-sky-200 dark:border-sky-800">
                  <span className="block text-sky-700 dark:text-sky-300 font-bold">{csrItems.length}</span>
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

      {/* نافذة إضافة مورد أو جهة جديدة */}
      <Dialog open={showAddSupplierModal} onOpenChange={setShowAddSupplierModal}>
        <DialogContent className="max-w-md text-right font-sans" dir="rtl">
          <DialogHeader className="text-right sm:text-right pb-2 border-b">
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <Plus className="w-5 h-5 text-sky-600" />
              إضافة مورد أو شريك لتأمين البنود
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground text-right sm:text-right">
              يمكنك اختيار مورد مسجل بالمنصة أو كتابة اسم جهة / شريك جديد لتصنيف البنود وتحديد مسارها تحته.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs">
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">اختيار من الموردين المسجلين في المنصة (اختياري)</Label>
              <Select
                value={selectedExistingSupplierId}
                onValueChange={(val) => {
                  setSelectedExistingSupplierId(val);
                  const found = (activeSuppliers as any[]).find((s: any) => String(s.id) === val);
                  if (found) {
                    setNewSupplierName(found.name);
                  }
                }}
              >
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue placeholder="اختر مورداً مسجلاً..." />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  {(activeSuppliers as any[]).map((s: any) => (
                    <SelectItem key={s.id} value={String(s.id)} className="text-xs">
                      {s.name} {s.commercialActivity ? `(${s.commercialActivity})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-border"></div>
              <span className="flex-shrink mx-2 text-[10px] text-muted-foreground">أو اكتب اسماً مخصصاً</span>
              <div className="flex-grow border-t border-border"></div>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1.5 block">اسم المورد أو الجهة الشريكة *</Label>
              <Input
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
                placeholder="مثال: شركة التوريدات المتحدة، أو مؤسسة الوقف الخيرية..."
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-row items-center justify-end gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddSupplierModal(false)}
              className="text-xs font-semibold"
            >
              إلغاء
            </Button>
            <Button
              size="sm"
              onClick={handleAddSupplierGroup}
              disabled={!newSupplierName.trim()}
              className="text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              إضافة المورد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
