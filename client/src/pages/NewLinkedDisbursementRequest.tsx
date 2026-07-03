import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowRight,
  Send,
  Plus,
  Trash2,
  Building2,
  FileText,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  Info,
  Eye,
  Check,
  Coins,
} from "lucide-react";
import { toast } from "sonner";

// دالة تحويل الأرقام إلى نص عربي
function numberToArabicText(num: number): string {
  if (num === 0) return "صفر ريال";
  
  const ones = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة"];
  const tens = ["", "عشر", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
  const teens = ["عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
  const hundreds = ["", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];

  function convertHundreds(n: number): string {
    if (n === 0) return "";
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) {
      const t = Math.floor(n / 10);
      const o = n % 10;
      return o ? `${ones[o]} و${tens[t]}` : tens[t];
    }
    const h = Math.floor(n / 100);
    const rest = n % 100;
    return rest ? `${hundreds[h]} و${convertHundreds(rest)}` : hundreds[h];
  }

  function convertThousands(n: number): string {
    if (n < 1000) return convertHundreds(n);
    const thousands = Math.floor(n / 1000);
    const rest = n % 1000;
    let result = "";
    if (thousands === 1) result = "ألف";
    else if (thousands === 2) result = "ألفان";
    else if (thousands <= 10) result = `${ones[thousands]} آلاف`;
    else result = `${convertHundreds(thousands)} ألف`;
    return rest ? `${result} و${convertHundreds(rest)}` : result;
  }

  const intPart = Math.floor(num);
  return `${convertThousands(intPart)} ريال سعودي فقط لا غير`;
}

const SADAD_BILLERS: Record<string, string> = {
  "001": "شركة الاتصالات السعودية (STC)",
  "002": "الشركة السعودية للكهرباء",
  "003": "شركة المياه الوطنية",
  "050": "وزارة الداخلية - المرور",
  "085": "وزارة الموارد البشرية والتنمية الاجتماعية",
  "101": "وزارة التجارة",
  "144": "الهيئة السعودية للمواصفات والمقاييس والجودة",
  "166": "المؤسسة العامة للتأمينات الاجتماعية",
  "017": "موبايلي",
  "044": "زين",
  "022": "الخطوط السعودية",
  "090": "الشركة الوطنية للغاز والتصنيع (غازكو)"
};

interface SupplierEntry {
  id: string;
  name: string;
  work: string;
  amount: number;
  iban: string;
  bank: string;
  agreedAmount: number;
  isNew?: boolean;
}

export default function NewLinkedDisbursementRequest() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const userPermissions = (user as any)?.permissions || [];
  const canCreateStandard = userPermissions.includes("disbursements.add");
  const canCreateCustom = userPermissions.includes("disbursements.create_custom");

  // استرجاع حالة الصفحة المحفوظة في حال العودة من صفحة معاينة التقرير
  const savedState = (() => {
    const saved = sessionStorage.getItem("new-linked-disbursement-state");
    if (saved) {
      try {
        sessionStorage.removeItem("new-linked-disbursement-state");
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error loading saved state:", e);
      }
    }
    return null;
  })();

  // التحكم بالخطوات
  const [step, setStep] = useState(() => savedState?.step ?? 1);
  const [isDonationLinked, setIsDonationLinked] = useState(false);
  const [requestType, setRequestType] = useState<string>(() => {
    if (savedState?.requestType) {
      const val = savedState.requestType;
      if (val === "project_linked" && !canCreateStandard) {
        return "supplier_one_time";
      }
      if (val !== "project_linked" && !canCreateCustom) {
        return "project_linked";
      }
      return val;
    }
    return canCreateStandard ? "project_linked" : "supplier_one_time";
  });
  const [isCustom, setIsCustom] = useState(() => {
    const val = savedState?.isCustom ?? (!canCreateStandard);
    if (val && !canCreateCustom) {
      return false;
    }
    if (!val && !canCreateStandard) {
      return true;
    }
    return val;
  });
  
  // بيانات النموذج
  const [formData, setFormData] = useState<{
    projectId: number;
    contractId: number;
    title: string;
    description: string;
    completionPercentage: number;
    dateMiladi: string;
    contractPaymentId: number;
    fundingSupport: string;
    mainProjectName: string;
    customProjectName: string;
    beneficiaryName: string;
    bankAccountName: string;
    bankName: string;
    iban: string;
    amount: number;
    billerName: string;
    sadadNumber: string;
    billerCode: string;
  }>(() => savedState?.formData ?? {
    projectId: 0,
    contractId: 0,
    title: "",
    description: "",
    completionPercentage: 0,
    dateMiladi: new Date().toISOString().split('T')[0],
    contractPaymentId: 0,
    fundingSupport: "",
    mainProjectName: "",
    customProjectName: "",
    beneficiaryName: "",
    bankAccountName: "",
    bankName: "",
    iban: "",
    amount: 0,
    billerName: "",
    sadadNumber: "",
    billerCode: "",
  });
  
  const [selectedReportId, setSelectedReportId] = useState<number | null>(() => savedState?.selectedReportId ?? null);
  const [showReportReviewDialog, setShowReportReviewDialog] = useState(false);
  const [billerSearch, setBillerSearch] = useState("");

  // قائمة الموردين
  const [suppliers, setSuppliers] = useState<SupplierEntry[]>(() => savedState?.suppliers ?? [
    { id: crypto.randomUUID(), name: "", work: "", amount: 0, iban: "", bank: "", agreedAmount: 0 }
  ]);

  const handleNavigateToPrint = () => {
    if (selectedReport) {
      const stateToSave = {
        step,
        isCustom,
        formData,
        selectedReportId,
        suppliers,
      };
      sessionStorage.setItem("new-linked-disbursement-state", JSON.stringify(stateToSave));
      navigate(`/progress-reports/${selectedReport.id}/print`);
    }
  };

  // معالجة تغيير اسم المستفيد والبحث عن مورد متطابق للتعبئة التلقائية
  const handleBeneficiaryNameChange = (val: string) => {
    setFormData(prev => {
      const matched = allSuppliers?.find(s => s.name.trim() === val.trim());
      if (matched) {
        return {
          ...prev,
          beneficiaryName: val,
          bankAccountName: matched.bankAccountName || prev.bankAccountName,
          bankName: matched.bankName || prev.bankName,
          iban: matched.iban || prev.iban
        };
      }
      return {
        ...prev,
        beneficiaryName: val
      };
    });
  };

  // معالجة تغيير رمز المفوتر للبحث التلقائي في سداد والتعبئة التلقائية
  const handleBillerCodeChange = (val: string) => {
    const matchedBiller = sadadBillersData?.values?.find((v: any) => v.value === val);
    const matchedName = matchedBiller ? matchedBiller.valueAr : SADAD_BILLERS[val];
    setFormData(prev => ({
      ...prev,
      billerCode: val,
      billerName: matchedName || prev.billerName
    }));
  };

  const handleBillerSelect = (billerValue: string) => {
    const matchedBiller = sadadBillersData?.values?.find((v: any) => v.value === billerValue);
    if (matchedBiller) {
      setFormData(prev => ({
        ...prev,
        billerCode: matchedBiller.value,
        billerName: matchedBiller.valueAr
      }));
    }
  };

  const handleDonationLinkedChange = (checked: boolean) => {
    setIsDonationLinked(checked);
    if (checked) {
      setIsCustom(true);
      setFormData(prev => ({ ...prev, projectId: 0 }));
    } else {
      setIsCustom(!canCreateStandard);
      setRequestType(canCreateStandard ? "project_linked" : "supplier_one_time");
      setFormData(prev => ({ ...prev, projectId: 0 }));
    }
  };

  // معالج تغيير نوع طلب الصرف وإعادة تهيئة الحقول المناسبة
  const handleRequestTypeChange = (type: string) => {
    setRequestType(type);
    const custom = type !== "project_linked";
    setIsCustom(custom);
    setSelectedReportId(null);

    setFormData(prev => ({
      ...prev,
      projectId: isDonationLinked ? prev.projectId : 0,
      contractId: 0,
      contractPaymentId: 0,
      title: "",
      description: "",
      completionPercentage: custom ? 100 : 0,
      customProjectName: isDonationLinked ? prev.customProjectName : "",
      beneficiaryName: "",
      bankAccountName: "",
      bankName: "",
      iban: "",
      amount: 0,
      billerName: "",
      sadadNumber: "",
      billerCode: "",
    }));

    setSuppliers([{ id: crypto.randomUUID(), name: "", work: "", amount: 0, iban: "", bank: "", agreedAmount: 0 }]);
  };

  // مزامنة حقول الأنواع الجديدة مع حقول طلب الصرف الأساسية لضمان عمل الحفظ بسلاسة
  useEffect(() => {
    if (requestType === "supplier_one_time" || requestType === "misc_expenses") {
      const typeLabel = requestType === "supplier_one_time" ? "سداد مورد لمرة واحدة" : "مصروفات منوعة";
      setFormData(prev => {
        const newTitle = `${typeLabel} - ${prev.customProjectName || ""}`;
        const newDesc = `التمويل/الدعم: ${prev.fundingSupport || ""}\nالمشروع الرئيسي: ${prev.mainProjectName || ""}\nالمشروع المخصص: ${prev.customProjectName || ""}\nالمستفيد: ${prev.beneficiaryName || ""}\nالحساب البنكي: ${prev.bankAccountName || ""}\nالبنك: ${prev.bankName || ""}\nالآيبان: ${prev.iban || ""}\nالمبلغ: ${prev.amount || 0}`;
        if (prev.title === newTitle && prev.description === newDesc) return prev;
        return {
          ...prev,
          title: newTitle,
          description: newDesc,
          completionPercentage: 100
        };
      });

      setSuppliers(prev => {
        const first = prev[0];
        const newWork = `${typeLabel} - ${formData.customProjectName || ""}`;
        if (
          first &&
          first.name === formData.beneficiaryName &&
          first.work === newWork &&
          first.amount === formData.amount &&
          first.iban === formData.iban &&
          first.bank === formData.bankName
        ) {
          return prev;
        }
        return [
          {
            id: first?.id || crypto.randomUUID(),
            name: formData.beneficiaryName || "",
            work: newWork,
            amount: formData.amount || 0,
            iban: formData.iban || "",
            bank: formData.bankName || "",
            agreedAmount: formData.amount || 0,
            isNew: true
          }
        ];
      });
    } else if (requestType === "sadad_invoice") {
      setFormData(prev => {
        const newTitle = `فواتير نظام سداد - ${prev.customProjectName || ""}`;
        const newDesc = `التمويل/الدعم: ${prev.fundingSupport || ""}\nالمشروع الرئيسي: ${prev.mainProjectName || ""}\nالمشروع المخصص: ${prev.customProjectName || ""}\nالمفوتر: ${prev.billerName || ""}\nرقم سداد: ${prev.sadadNumber || ""}\nرمز المفوتر: ${prev.billerCode || ""}\nالمبلغ: ${prev.amount || 0}`;
        if (prev.title === newTitle && prev.description === newDesc) return prev;
        return {
          ...prev,
          title: newTitle,
          description: newDesc,
          completionPercentage: 100
        };
      });

      setSuppliers(prev => {
        const first = prev[0];
        const newWork = `سداد فاتورة - ${formData.customProjectName || ""}`;
        if (
          first &&
          first.name === formData.billerName &&
          first.work === newWork &&
          first.amount === formData.amount &&
          first.iban === formData.sadadNumber &&
          first.bank === formData.billerCode
        ) {
          return prev;
        }
        return [
          {
            id: first?.id || crypto.randomUUID(),
            name: formData.billerName || "",
            work: newWork,
            amount: formData.amount || 0,
            iban: formData.sadadNumber || "",
            bank: formData.billerCode || "",
            agreedAmount: formData.amount || 0,
            isNew: true
          }
        ];
      });
    }
  }, [
    requestType,
    formData.fundingSupport,
    formData.mainProjectName,
    formData.customProjectName,
    formData.beneficiaryName,
    formData.bankAccountName,
    formData.bankName,
    formData.iban,
    formData.amount,
    formData.billerName,
    formData.sadadNumber,
    formData.billerCode
  ]);
  
  // جلب المشاريع
  const { data: projects } = trpc.projects.getAll.useQuery({});
  
  // جلب الموردين النشطين
  const { data: allSuppliers } = trpc.suppliers.getActiveSuppliers.useQuery({ includeUnapproved: true });

  // جلب التصنيفات لـ "التمويل / الدعم" و"اسم المشروع الرئيسي" ديناميكياً لتجهيز البيانات
  const { data: fundingSupportData } = trpc.categories.getCategoryByType.useQuery({ type: "funding_support" });
  const { data: mainProjectsData } = trpc.categories.getCategoryByType.useQuery({ type: "main_projects" });
  // جلب معلومات المفوتر ديناميكياً
  const { data: sadadBillersData } = trpc.categories.getCategoryByType.useQuery({ type: "sadad_billers" });
  const filteredBillers = sadadBillersData?.values?.filter((val: any) => {
    const term = billerSearch.trim().toLowerCase();
    if (!term) return true;
    return (val.valueAr || "").toLowerCase().includes(term) || (val.value || "").toLowerCase().includes(term);
  });

  // جلب العقود للمشروع المحدد
  const { data: projectContracts } = trpc.contracts.list.useQuery(
    { projectId: formData.projectId },
    { enabled: formData.projectId > 0 }
  );
  
  // جلب تفاصيل المشروع
  const { data: projectDetails } = trpc.projects.getById.useQuery(
    { id: formData.projectId, lightweight: true },
    { enabled: formData.projectId > 0 }
  );

  // جلب تقارير الإنجاز المعتمدة للمشروع المحدد
  const { data: approvedReports } = trpc.progressReports.list.useQuery(
    { projectId: formData.projectId || undefined, status: "approved" },
    { enabled: formData.projectId > 0 }
  );

  // جلب طلبات الصرف الحالية للمشروع للتحقق من عدم التكرار
  const { data: projectRequests } = trpc.disbursements.getRequestsByProject.useQuery(
    { projectId: formData.projectId },
    { enabled: formData.projectId > 0 }
  );



  // دالة للتحقق مما إذا كان تقرير الإنجاز مرتبطاً بطلب صرف سابق
  const isReportLinked = (report: any) => {
    if (!projectRequests?.requests) return false;
    const match = (report.workSummary || "").match(/\[معرف الدفعة:\s*([^\]]+)\]/);
    if (!match) return false;
    const paymentIdRaw = match[1];
    const isManual = paymentIdRaw.startsWith("manual-");
    const paymentIdNumeric = parseInt(paymentIdRaw.replace(/^(cp-|disb-|manual-)/i, "")) || 0;
    
    return projectRequests.requests.some((req: any) => {
      if (req.status === "rejected") return false;
      return isManual 
        ? req.paymentId === paymentIdNumeric 
        : req.contractPaymentId === paymentIdNumeric;
    });
  };

  const selectedReport = approvedReports?.find((r: any) => r.id === selectedReportId);
  const paymentIdMatch = selectedReport ? (selectedReport.workSummary || "").match(/\[معرف الدفعة:\s*([^\]]+)\]/) : null;
  const paymentIdRaw = paymentIdMatch ? paymentIdMatch[1] : "";
  // استخراج الرقم من معرف الدفعة (مثل cp-5 -> 5)
  const paymentIdNumeric = parseInt(paymentIdRaw.replace(/^(cp-|disb-|manual-)/i, "")) || 0;
  const paymentInfo = projectDetails?.payments?.find((p: any) => p.id === paymentIdRaw || p.id === paymentIdNumeric);

  // الملء التلقائي بناءً على تقرير الإنجاز المختار
  useEffect(() => {
    if (selectedReport) {
      const workSummaryText = selectedReport.workSummary || "";
      const actualMatch = workSummaryText.match(/الأعمال المنفذة فعلياً:\r?\n([\s\S]*?)(?:\r?\n\r?\[معرف الدفعة:|$)/);
      const actual = actualMatch ? actualMatch[1].trim() : workSummaryText.replace(/\[معرف الدفعة:\s*[^\]]+\]/g, "").trim();

      const targetPaymentId = paymentInfo ? paymentIdNumeric : 0;
      const targetContractId = (paymentInfo as any)?.contractId || 0;
      
      const reportDateFormatted = selectedReport.reportDate 
        ? new Date(selectedReport.reportDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      setFormData(prev => {
        if (
          prev.contractPaymentId === targetPaymentId && 
          prev.completionPercentage === selectedReport.actualProgress &&
          prev.dateMiladi === reportDateFormatted &&
          (targetContractId === 0 || prev.contractId === targetContractId)
        ) {
          return prev;
        }
        return {
          ...prev,
          title: `طلب صرف لـ ${selectedReport.title}`,
          description: `تقرير إنجاز ${selectedReport.reportNumber} - الأعمال المنفذة فعلياً:\n${actual}`,
          completionPercentage: selectedReport.actualProgress || 0,
          dateMiladi: reportDateFormatted,
          contractPaymentId: targetPaymentId,
          contractId: targetContractId || prev.contractId,
        };
      });
    }
  }, [selectedReportId, projectDetails, paymentInfo]);
  
  // جلب تفاصيل العقد
  const { data: contractDetails } = trpc.contracts.getById.useQuery(
    { id: formData.contractId, lightweight: true },
    { enabled: formData.contractId > 0 }
  );
  
  const utils = trpc.useUtils();

  // mutation لإنشاء طلب الصرف
  const createMutation = trpc.disbursements.createRequest.useMutation({
    onSuccess: (data) => {
      // إبطال كاش المشروع لتحديث قسم الدفعات فوراً
      if (formData.projectId) {
        utils.projects.getById.invalidate({ id: formData.projectId });
      }
      toast.success("تم إنشاء طلب الصرف بنجاح");
      navigate("/disbursements");
    },
    onError: (error) => {
      toast.error(`خطأ: ${error.message}`);
    },
  });
  
  // تحديث بيانات المورد من العقد وتقرير الإنجاز تلقائياً
  useEffect(() => {
    if (contractDetails && contractDetails.contract) {
      // المبلغ الفعلي للدفعة ينجاب من تقرير الإنجاز
      const actualAmount = selectedReport 
        ? parseFloat(String(selectedReport.budgetSpent || "0")) 
        : parseFloat(String(contractDetails.contract.contractAmount || "0"));

      // المبلغ المتفق عليه للدفعة ينجاب من الدفعة بتفاصيل المشروع
      const agreedAmount = paymentInfo
        ? parseFloat(String(paymentInfo.amount || "0"))
        : parseFloat(String(contractDetails.contract.contractAmount || "0"));
      
      // بيان الأعمال ينجاب من تقرير الإنجاز
      const targetWork = selectedReport
        ? selectedReport.title || ""
        : contractDetails.contract.contractTitle || "";

      if (
        suppliers.length === 1 &&
        suppliers[0].name === contractDetails.contract.secondPartyName &&
        suppliers[0].iban === contractDetails.contract.secondPartyIban &&
        suppliers[0].amount === actualAmount &&
        suppliers[0].agreedAmount === agreedAmount &&
        suppliers[0].work === targetWork
      ) {
        return;
      }

      const supplierFromContract: SupplierEntry = {
        id: suppliers.length === 1 ? suppliers[0].id : crypto.randomUUID(),
        name: contractDetails.contract.secondPartyName || "",
        work: targetWork,
        amount: actualAmount,
        agreedAmount: agreedAmount,
        iban: contractDetails.contract.secondPartyIban || "",
        bank: contractDetails.contract.secondPartyBankName || "",
      };
      setSuppliers([supplierFromContract]);
    }
  }, [contractDetails, selectedReport, paymentInfo]);

  // اختيار العقد تلقائياً إذا كان هناك عقد معتمد أو نشط واحد فقط للمشروع
  useEffect(() => {
    if (projectContracts && projectContracts.contracts) {
      const activeOrApprovedContracts = projectContracts.contracts.filter(
        c => c.status === "approved" || c.status === "active"
      );
      if (activeOrApprovedContracts.length === 1) {
        if (formData.contractId === 0) {
          setFormData(prev => ({ ...prev, contractId: activeOrApprovedContracts[0].id }));
        }
      }
    }
  }, [projectContracts]);
  
  // حساب الإجمالي
  const totalAmount = suppliers.reduce((sum, s) => sum + (s.amount || 0), 0);
  
  // حساب المتبقي للصرف (بدون خصم المبلغ الحالي - نحسب المتاح قبل هذا الطلب)
  const totalPaymentsSum = projectDetails?.payments?.reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0) || 0;
  const contractAmount = parseFloat(contractDetails?.contract?.contractAmount || "0");
  const remainingForDisbursement = contractAmount - totalPaymentsSum;
  const remainingAmount = remainingForDisbursement - totalAmount;

  // إضافة مورد جديد
  const addSupplier = () => {
    setSuppliers([...suppliers, { id: crypto.randomUUID(), name: "", work: "", amount: 0, iban: "", bank: "", agreedAmount: 0 }]);
  };
  
  // حذف مورد
  const removeSupplier = (id: string) => {
    if (suppliers.length > 1) {
      setSuppliers(suppliers.filter(s => s.id !== id));
    }
  };
  
  // تحديث بيانات المورد
  const updateSupplier = (id: string, field: keyof SupplierEntry, value: string | number) => {
    setSuppliers(suppliers.map(s => {
      if (s.id === id) {
        const updated = { ...s, [field]: value };
        if (isCustom && field === "amount") {
          updated.agreedAmount = Number(value);
        }
        return updated;
      }
      return s;
    }));
  };

  // اختيار مورد من القائمة
  const handleSelectSupplier = (id: string, supplierName: string) => {
    const selectedSupplier = allSuppliers?.find(s => s.name === supplierName);
    if (selectedSupplier) {
      setSuppliers(suppliers.map(s => s.id === id ? { 
        ...s, 
        name: selectedSupplier.name,
        iban: selectedSupplier.iban || s.iban,
        bank: selectedSupplier.bankName || s.bank
      } : s));
    } else {
      updateSupplier(id, "name", supplierName);
    }
  };
  
  // دالة التحقق من تعطيل زر الانتقال للخطوة التالية
  const isNextDisabled = () => {
    // الحقول العامة أولاً
    const isFundingRequired = requestType === "supplier_one_time" || requestType === "sadad_invoice" || requestType === "misc_expenses";
    if ((isFundingRequired && !formData.fundingSupport) || !formData.mainProjectName) return true;

    if (requestType === "project_linked") {
      return !selectedReportId || (selectedReport && isReportLinked(selectedReport));
    }
    
    if (requestType === "custom_standard") {
      return !formData.title || !formData.description || !formData.dateMiladi;
    }
    
    if (requestType === "supplier_one_time" || requestType === "misc_expenses") {
      return (
        !formData.customProjectName ||
        !formData.beneficiaryName ||
        !formData.bankAccountName ||
        !formData.bankName ||
        !formData.iban ||
        !formData.dateMiladi ||
        formData.amount <= 0
      );
    }
    
    if (requestType === "sadad_invoice") {
      return (
        !formData.customProjectName ||
        !formData.billerName ||
        !formData.sadadNumber ||
        !formData.billerCode ||
        !formData.dateMiladi ||
        formData.amount <= 0
      );
    }
    
    return true;
  };

  // إرسال للاعتماد
  const handleSubmit = () => {
    const isFundingRequired = requestType === "supplier_one_time" || requestType === "sadad_invoice" || requestType === "misc_expenses";
    if (isFundingRequired && !formData.fundingSupport) {
      toast.error("يرجى اختيار التمويل / الدعم");
      return;
    }
    if (!formData.mainProjectName) {
      toast.error("يرجى اختيار اسم المشروع الرئيسي");
      return;
    }
    if (!isCustom && !formData.projectId) {
      toast.error("يرجى اختيار المشروع");
      return;
    }
    if (!formData.dateMiladi) {
      toast.error("يرجى تحديد التاريخ الميلادي");
      return;
    }
    if (!formData.title) {
      toast.error("يرجى إدخال عنوان طلب الصرف");
      return;
    }
    if (!formData.description) {
      toast.error("يرجى إدخال وصف الأعمال التي سوف تنفذ");
      return;
    }
    if (formData.completionPercentage <= 0) {
      toast.error("يرجى إدخال نسبة الإنجاز");
      return;
    }
    if (totalAmount <= 0) {
      toast.error("يرجى إدخال مبلغ صحيح");
      return;
    }
    if (suppliers.some(s => !s.name)) {
      toast.error("يرجى اختيار المورد المستفيد");
      return;
    }

    if (!isCustom && suppliers.some(s => s.amount > s.agreedAmount)) {
      toast.error("المبلغ الفعلي لا يمكن أن يتجاوز المبلغ المتفق عليه للدفعة");
      return;
    }

    // التحقق من تجاوز قيمة العقد أو المبلغ المتبقي
    if (!isCustom && contractDetails && totalAmount > contractAmount) {
      toast.error(`المبلغ لا يمكن أن يتجاوز قيمة العقد (${contractAmount.toLocaleString()} ريال)`);
      return;
    }

    if (!isCustom && contractDetails && totalAmount > remainingForDisbursement && remainingForDisbursement > 0) {
      toast.error(`المبلغ لا يمكن أن يتجاوز الإجمالي المتبقي للصرف (${remainingForDisbursement.toLocaleString()} ريال)`);
      return;
    }
    
    const isManual = paymentIdRaw.startsWith("manual-");
    
    // إدراج الحقول المخصصة في المرفقات كـ metadata لحفظها بالكامل في قاعدة البيانات
    const customSupplierMetadata = isCustom ? [{
      name: "custom_supplier_info",
      url: JSON.stringify({
        name: suppliers[0].name,
        bank: suppliers[0].bank,
        iban: suppliers[0].iban,
        work: suppliers[0].work,
        agreedAmount: suppliers[0].agreedAmount,
        bankAccountName: formData.bankAccountName || "",
        requestType: requestType,
        fundingSupport: formData.fundingSupport,
        mainProjectName: formData.mainProjectName,
        customProjectName: formData.customProjectName || "",
        billerName: formData.billerName || "",
        sadadNumber: formData.sadadNumber || "",
        billerCode: formData.billerCode || "",
      }),
      type: "metadata"
    }] : [];

    const linkedMetadata = !isCustom ? [{
      name: "linked_request_info",
      url: JSON.stringify({
        requestType: "project_linked",
        fundingSupport: formData.fundingSupport,
        mainProjectName: formData.mainProjectName,
      }),
      type: "metadata"
    }] : [];
    
    createMutation.mutate({
      projectId: formData.projectId && formData.projectId > 0 ? formData.projectId : null,
      contractId: isCustom ? undefined : (formData.contractId || undefined),
      contractPaymentId: isCustom ? undefined : (isManual ? undefined : (formData.contractPaymentId || undefined)),
      paymentId: isCustom ? undefined : (isManual ? formData.contractPaymentId : undefined),
      title: formData.title,
      description: formData.description,
      amount: totalAmount,
      paymentType: "progress",
      dateMiladi: formData.dateMiladi,
      completionPercentage: formData.completionPercentage,
      attachments: isCustom ? customSupplierMetadata : (linkedMetadata.length > 0 ? linkedMetadata : undefined),
    });
  };
  
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 animate-fade-in pb-20 px-3 sm:px-4 md:px-0" dir="rtl">
        {/* Header and Visual Step Timeline */}
        <div className="flex flex-col gap-6 border-b border-border/40 pb-6">
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => {
                  if (window.history.length > 1) {
                    window.history.back();
                  } else {
                    navigate("/disbursements");
                  }
                }} 
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-muted text-muted-foreground shrink-0"
              >
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <div className="text-right">
                <h1 className="text-lg sm:text-2xl font-bold text-foreground font-display">
                  طلب صرف مرتبط بتقرير إنجاز
                </h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground text-right font-medium mt-0.5 hidden sm:block">
                  إنشاء طلب صرف معتمد على تقارير الإنجاز المدققة ومطابقتها مالياً بنظام تمام
                </p>
              </div>
            </div>
          </div>

          {/* Subtle Stepper Timeline */}
          <div className="max-w-md mx-auto w-full px-2 sm:px-4 py-2" dir="rtl">
            <div className="relative flex items-center justify-between">
              {/* Connecting Line background */}
              <div className="absolute right-0 left-0 top-1/2 -translate-y-1/2 h-0.5 bg-border rounded-full z-0" />
              {/* Connecting Active Line progress */}
              <div 
                className="absolute right-0 top-1/2 -translate-y-1/2 h-0.5 bg-primary rounded-full z-0 transition-all duration-500"
                style={{ width: step === 1 ? '0%' : '100%' }}
              />

              {/* Step 1 Node */}
              <div className="flex flex-col items-center gap-1.5 z-10">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 border ${
                    step >= 1 
                      ? 'bg-primary border-primary text-primary-foreground shadow-sm' 
                      : 'bg-background border-border text-muted-foreground'
                  }`}
                >
                  {step > 1 ? <Check className="w-4 h-4" /> : "١"}
                </div>
                <span className={`text-xs font-semibold ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
                  المشروع والتقرير
                </span>
              </div>

              {/* Step 2 Node */}
              <div className="flex flex-col items-center gap-1.5 z-10">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 border ${
                    step === 2 
                      ? 'bg-primary border-primary text-primary-foreground shadow-sm' 
                      : 'bg-background border-border text-muted-foreground'
                  }`}
                >
                  ٢
                </div>
                <span className={`text-xs font-semibold ${step === 2 ? 'text-primary' : 'text-muted-foreground'}`}>
                  المطابقة والبيانات المالية
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {step === 1 ? (
          /* الخطوة الأولى: اختيار المشروع وتقرير الإنجاز */
          <div className="space-y-6">
            <Card className="border-border/60 shadow-sm rounded-xl overflow-hidden bg-white dark:bg-slate-900">
              <CardHeader className="bg-muted/30 border-b border-border/40 py-4 text-right">
                <CardTitle className="flex items-center gap-2 text-foreground text-base font-bold">
                  <FileText className="h-4.5 w-4.5 text-primary" />
                  الخطوة 1: اختيار المشروع والتقرير المرتبط
                </CardTitle>
                <CardDescription className="text-right text-xs text-muted-foreground">اختر المشروع أولاً لعرض تقارير الإنجاز المعتمدة المرتبطة به</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6 text-right">
                {/* خيار ربط فرصة تبرع معتمدة */}
                <div className="flex items-center gap-3 p-3.5 bg-pink-50/50 dark:bg-pink-950/10 rounded-xl border border-pink-100 dark:border-pink-900/30 text-right animate-in fade-in duration-200">
                  <Checkbox
                    id="link-donation-opportunity"
                    checked={isDonationLinked}
                    onCheckedChange={(checked) => handleDonationLinkedChange(!!checked)}
                    className="w-4.5 h-4.5 text-pink-600 border-pink-300 rounded focus:ring-pink-500"
                  />
                  <div className="space-y-0.5 min-w-0">
                    <label 
                      htmlFor="link-donation-opportunity" 
                      className="text-xs sm:text-sm font-bold text-pink-800 dark:text-pink-300 cursor-pointer"
                    >
                      المشروع المرتبط (فرصة التبرع)
                    </label>
                    <p className="text-[10px] sm:text-xs text-pink-600 dark:text-pink-400">
                      تفعيل هذا الخيار لربط طلب الصرف بمشروع فرصة تبرع
                    </p>
                  </div>
                </div>

                {isDonationLinked && (
                  <div className="space-y-2 text-right animate-in slide-in-from-top-2 duration-200">
                    <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">المشروع المرتبط (فرصة التبرع) *</Label>
                    <Select
                      value={formData.projectId.toString()}
                      onValueChange={(value) => {
                        const projId = parseInt(value);
                        const selectedProj = projects?.find((p: any) => p.id === projId);
                        setFormData({ 
                          ...formData, 
                          projectId: projId, 
                          contractId: 0,
                          customProjectName: selectedProj ? selectedProj.name : formData.customProjectName
                        });
                        setSelectedReportId(null);
                      }}
                    >
                      <SelectTrigger className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background w-full text-xs sm:text-sm" dir="rtl">
                        <SelectValue placeholder="اختر المشروع لربطه بفرصة التبرع" />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        {projects?.filter((p: any) => p.technicalEvalDecision === 'convert_to_donation').map((project: { id: number; name: string; projectNumber: string }) => (
                          <SelectItem key={project.id} value={project.id.toString()} className="text-right">
                            {project.name} - {project.projectNumber}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* خيار نوع طلب الصرف كقائمة منسدلة */}
                <div className="space-y-2 text-right">
                  <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">نوع طلب الصرف *</Label>
                  <Select
                    value={requestType}
                    onValueChange={handleRequestTypeChange}
                  >
                    <SelectTrigger className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background w-full" dir="rtl">
                      <SelectValue placeholder="اختر نوع طلب الصرف" />
                    </SelectTrigger>
                    <SelectContent>
                      {canCreateStandard && (
                        <SelectItem value="project_linked" className="text-right">طلب صرف مرتبط بتقرير إنجاز معتمد</SelectItem>
                      )}
                      {canCreateCustom && (
                        <>
                          <SelectItem value="supplier_one_time" className="text-right">سداد مورد لمرة واحدة بفاتورة</SelectItem>
                          <SelectItem value="sadad_invoice" className="text-right">فواتير نظام سداد</SelectItem>
                          <SelectItem value="misc_expenses" className="text-right">مصروفات منوعة</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* الحقول العامة - اسم المشروع الرئيسي */}
                <div className="border-b border-border/40 pb-4 mb-4">
                  <div className="space-y-2 text-right">
                    <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">اسم المشروع الرئيسي *</Label>
                    <Select
                      value={formData.mainProjectName || ""}
                      onValueChange={(value) => setFormData({ ...formData, mainProjectName: value })}
                    >
                      <SelectTrigger className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background w-full" dir="rtl">
                        <SelectValue placeholder="اختر اسم المشروع الرئيسي" />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        {mainProjectsData?.values?.map((val: any) => (
                          <SelectItem key={val.id} value={val.valueAr} className="text-right">
                            {val.valueAr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* حقل التمويل / الدعم يظهر ديناميكياً تحت نوع طلب الصرف */}
                {(requestType === "supplier_one_time" || requestType === "sadad_invoice" || requestType === "misc_expenses") && (
                  <div className="space-y-2 text-right animate-in fade-in duration-200">
                    <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">التمويل / الدعم *</Label>
                    <Select
                      value={formData.fundingSupport || ""}
                      onValueChange={(value) => setFormData({ ...formData, fundingSupport: value })}
                    >
                      <SelectTrigger className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background w-full" dir="rtl">
                        <SelectValue placeholder="اختر التمويل / الدعم" />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        {fundingSupportData?.values?.map((val: any) => (
                          <SelectItem key={val.id} value={val.valueAr} className="text-right">
                            {val.valueAr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {!isCustom && (
                  <div className="space-y-2 text-right">
                    <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">المشروع *</Label>
                    <Select
                      value={formData.projectId.toString()}
                      onValueChange={(value) => {
                        setFormData({ ...formData, projectId: parseInt(value), contractId: 0 });
                        setSelectedReportId(null);
                      }}
                    >
                      <SelectTrigger className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background w-full" dir="rtl">
                        <SelectValue placeholder="اختر المشروع لتحديد تقرير الإنجاز" />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        {projects?.map((project: { id: number; name: string; projectNumber: string }) => (
                          <SelectItem key={project.id} value={project.id.toString()} className="text-right">
                            {project.name} - {project.projectNumber}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {isCustom && (
                  <div className="space-y-4 animate-slide-up text-right">
                    {requestType === "custom_standard" && (
                      <>
                        <div className="space-y-2 text-right">
                          <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">عنوان طلب الصرف *</Label>
                          <Input
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="أدخل عنوان طلب الصرف المالي"
                            required
                            className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background"
                          />
                        </div>

                        <div className="space-y-2 text-right">
                          <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">الوصف وتفاصيل الأعمال *</Label>
                          <Textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="أدخل وصفاً تفصيلياً للأعمال والمنجزات المصاحبة لطلب الصرف..."
                            rows={4}
                            required
                            className="text-right border-border focus:ring-primary rounded-xl text-xs leading-relaxed bg-background"
                          />
                        </div>

                        <div className="space-y-2 text-right">
                          <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">التاريخ الميلادي *</Label>
                          <Input
                            type="date"
                            value={formData.dateMiladi}
                            onChange={(e) => setFormData({ ...formData, dateMiladi: e.target.value })}
                            required
                            className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background"
                          />
                        </div>
                      </>
                    )}

                    {(requestType === "supplier_one_time" || requestType === "misc_expenses") && (
                      <>
                        <div className="space-y-2 text-right">
                          <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">اسم المشروع المخصص *</Label>
                          <Input
                            value={formData.customProjectName}
                            onChange={(e) => setFormData({ ...formData, customProjectName: e.target.value })}
                            placeholder="أدخل اسم المشروع المخصص"
                            required
                            className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background"
                          />
                        </div>

                        <div className="space-y-2 text-right">
                          <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">اسم المستفيد *</Label>
                          <Input
                            list="suppliers-list"
                            value={formData.beneficiaryName}
                            onChange={(e) => handleBeneficiaryNameChange(e.target.value)}
                            placeholder="أدخل اسم المستفيد"
                            required
                            className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background"
                          />
                          <datalist id="suppliers-list">
                            {allSuppliers?.map((s: any) => (
                              <option key={s.id} value={s.name} />
                            ))}
                          </datalist>
                        </div>

                        <div className="space-y-2 text-right">
                          <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">اسم الحساب البنكي *</Label>
                          <Input
                            value={formData.bankAccountName}
                            onChange={(e) => setFormData({ ...formData, bankAccountName: e.target.value })}
                            placeholder="أدخل اسم الحساب البنكي"
                            required
                            className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background"
                          />
                        </div>

                        <div className="space-y-2 text-right">
                          <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">اسم البنك *</Label>
                          <Input
                            value={formData.bankName}
                            onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                            placeholder="أدخل اسم البنك"
                            required
                            className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background"
                          />
                        </div>

                        <div className="space-y-2 text-right">
                          <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">رقم الآيبان IBAN *</Label>
                          <Input
                            value={formData.iban}
                            onChange={(e) => setFormData({ ...formData, iban: e.target.value.toUpperCase() })}
                            placeholder="SA0000000000000000000000"
                            required
                            className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background font-mono"
                            dir="ltr"
                          />
                        </div>

                        <div className="space-y-2 text-right">
                          <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">التاريخ الميلادي *</Label>
                          <Input
                            type="date"
                            value={formData.dateMiladi}
                            onChange={(e) => setFormData({ ...formData, dateMiladi: e.target.value })}
                            required
                            className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background"
                          />
                        </div>

                        <div className="space-y-2 text-right">
                          <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">المبلغ *</Label>
                          <Input
                            type="number"
                            value={formData.amount || ""}
                            onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                            placeholder="0.00"
                            required
                            className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background"
                          />
                        </div>
                      </>
                    )}

                    {requestType === "sadad_invoice" && (
                      <>
                        <div className="space-y-2 text-right">
                          <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">اسم المشروع المخصص *</Label>
                          <Input
                            value={formData.customProjectName}
                            onChange={(e) => setFormData({ ...formData, customProjectName: e.target.value })}
                            placeholder="أدخل اسم المشروع المخصص"
                            required
                            className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background"
                          />
                        </div>

                        <div className="space-y-2 text-right">
                          <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">اختر المفوتر (للتعبئة التلقائية)</Label>
                          <Select
                            value={formData.billerCode || ""}
                            onValueChange={handleBillerSelect}
                          >
                            <SelectTrigger className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background w-full" dir="rtl">
                              <SelectValue placeholder="اختر المفوتر للتعبئة التلقائية" />
                            </SelectTrigger>
                            <SelectContent dir="rtl" className="max-h-64">
                              {sadadBillersData?.values?.map((val: any) => (
                                <SelectItem key={val.id} value={val.value} className="text-right cursor-pointer py-2.5">
                                  <div className="flex items-center justify-between w-full gap-4 text-xs font-bold">
                                    <span className="text-slate-800 dark:text-slate-200">{val.valueAr}</span>
                                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded shrink-0">{val.value}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2 text-right">
                          <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">رمز المفوتر *</Label>
                          <Input
                            value={formData.billerCode}
                            onChange={(e) => handleBillerCodeChange(e.target.value)}
                            placeholder="أدخل رمز المفوتر"
                            required
                            className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background"
                          />
                        </div>

                        <div className="space-y-2 text-right">
                          <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">اسم المفوتر *</Label>
                          <Input
                            value={formData.billerName}
                            onChange={(e) => setFormData({ ...formData, billerName: e.target.value })}
                            placeholder="أدخل اسم المفوتر"
                            required
                            className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background"
                          />
                        </div>

                        <div className="space-y-2 text-right">
                          <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">رقم سداد *</Label>
                          <Input
                            value={formData.sadadNumber}
                            onChange={(e) => setFormData({ ...formData, sadadNumber: e.target.value })}
                            placeholder="أدخل رقم سداد"
                            required
                            className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background"
                          />
                        </div>

                        <div className="space-y-2 text-right">
                          <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">التاريخ الميلادي *</Label>
                          <Input
                            type="date"
                            value={formData.dateMiladi}
                            onChange={(e) => setFormData({ ...formData, dateMiladi: e.target.value })}
                            required
                            className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background"
                          />
                        </div>

                        <div className="space-y-2 text-right">
                          <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">المبلغ *</Label>
                          <Input
                            type="number"
                            value={formData.amount || ""}
                            onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                            placeholder="0.00"
                            required
                            className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background"
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}

                {formData.projectId > 0 && (
                  <div className="space-y-4 text-right animate-slide-up">
                    <div className="space-y-2 text-right">
                      <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">تقرير الإنجاز المرتبط *</Label>
                      <Select
                        value={selectedReportId?.toString() || ""}
                        onValueChange={(value) => setSelectedReportId(parseInt(value))}
                      >
                        <SelectTrigger className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background w-full" dir="rtl">
                          <SelectValue placeholder="اختر تقرير إنجاز الدفعة لمراجعته" />
                        </SelectTrigger>
                        <SelectContent dir="rtl">
                          {approvedReports?.length === 0 ? (
                            <div className="p-2 text-center text-xs text-muted-foreground">لا توجد تقارير إنجاز معتمدة لهذا المشروع</div>
                          ) : (
                            approvedReports?.map((report: any) => {
                              const linked = isReportLinked(report);
                              return (
                                <SelectItem key={report.id} value={report.id.toString()} className="text-right" disabled={linked}>
                                  {report.reportNumber} - {report.title} ({report.actualProgress}%) {linked ? " (تم إنشاء طلب صرف له سابقاً)" : ""}
                                </SelectItem>
                              );
                            })
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedReport && isReportLinked(selectedReport) && (
                      <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-900 dark:bg-red-950/20 dark:border-red-900 dark:text-red-200 text-right space-y-2 mt-4">
                        <div className="flex items-center gap-2 text-red-600 font-bold">
                          <AlertCircle className="w-5 h-5" />
                          <span>تنبيه: تم تقديم طلب صرف لهذا التقرير مسبقاً</span>
                        </div>
                        <p className="text-xs">لقد تم إنشاء طلب صرف مرتبط بتقرير الإنجاز هذا بالفعل. يرجى اختيار تقرير إنجاز آخر لم يصرف له بعد.</p>
                      </div>
                    )}

                    {selectedReport && !isReportLinked(selectedReport) && (
                      <div className="space-y-4 animate-slide-up text-right">
                        {/* Premium Linked Report Stats Card */}
                        <div className="p-5 rounded-xl border border-emerald-100 bg-emerald-50/10 dark:bg-emerald-950/5 text-right space-y-4 shadow-inner">
                          <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center justify-between border-b border-emerald-100/30 dark:border-emerald-900/20 pb-3">
                            <div className="flex items-center gap-2 justify-start">
                              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                                <FileText className="w-4.5 h-4.5" />
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] text-muted-foreground block font-bold">تقرير الإنجاز المرتبط بالطلب</span>
                                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                                  {selectedReport.reportNumber} — {selectedReport.title}
                                </h4>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="text-emerald-700 border-emerald-300 bg-background hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-900 dark:hover:bg-emerald-950/20 font-bold h-8 sm:h-9 text-[10px] sm:text-xs px-2.5 sm:px-3 rounded-lg shrink-0 shadow-sm animate-in zoom-in duration-150 w-full sm:w-auto"
                              onClick={handleNavigateToPrint}
                            >
                              <Eye className="ml-1.5 h-3.5 w-3.5" />
                              مراجعة وتدقيق التقرير المعتمد
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 text-right">
                            <div className="bg-background/80 p-3 rounded-lg border border-emerald-100/60 dark:border-emerald-900/10 shadow-sm">
                              <span className="text-[10px] text-muted-foreground block font-semibold">تاريخ التقرير</span>
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1 block">
                                {new Date(selectedReport.reportDate).toLocaleDateString("ar-SA")}
                              </span>
                            </div>
                            <div className="bg-background/80 p-3 rounded-lg border border-emerald-100/60 dark:border-emerald-900/10 shadow-sm">
                              <span className="text-[10px] text-muted-foreground block font-semibold">الإنجاز الفعلي بالتقرير</span>
                              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
                                {selectedReport.actualProgress}%
                              </span>
                            </div>
                            <div className="bg-background/80 p-3 rounded-lg border border-emerald-100/60 dark:border-emerald-900/10 shadow-sm">
                              <span className="text-[10px] text-muted-foreground block font-semibold">الانحراف المجدول</span>
                              <span className={`text-xs font-black mt-1 block ${
                                ((selectedReport.actualProgress || 0) - (selectedReport.plannedProgress || 0)) >= 0 
                                  ? 'text-emerald-600 dark:text-emerald-400' 
                                  : 'text-rose-600 dark:text-rose-400'
                              }`}>
                                {((selectedReport.actualProgress || 0) - (selectedReport.plannedProgress || 0))}%
                              </span>
                            </div>
                          </div>

                          <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/40 rounded-lg flex items-start gap-2.5 shadow-sm">
                            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                            <div className="space-y-0.5">
                              <p className="text-[10px] font-bold text-amber-800 dark:text-amber-400">ملاحظة تنظيمية هامة</p>
                              <p className="text-[10px] leading-relaxed text-amber-700/80 dark:text-slate-300/80 font-medium">
                                يجب تدقيق ومطابقة المبالغ المطروحة بالخطوة التالية مع المنجزات الفعلية لضمان توافق دفعات العقد مع واقع العمل.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter className="border-t border-border/40 pt-4 flex justify-end gap-2">
                <Button
                  onClick={() => setStep(2)}
                  disabled={isNextDisabled()}
                  className="gradient-primary text-white font-bold px-6 h-11 rounded-xl shadow-sm"
                >
                  التالي
                  <ArrowLeft className="mr-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </div>
        ) : (
          /* الخطوة الثانية: البيانات المالية وتحديد مبالغ الموردين - مصفوفة عمودياً مثل التقارير */
          <div className="space-y-6">
            {/* البيانات المالية الأساسية */}
            <Card className="border-border/60 shadow-sm rounded-xl overflow-hidden bg-white dark:bg-slate-900">
              <CardHeader className="bg-muted/30 border-b border-border/40 py-4 text-right">
                <CardTitle className="flex items-center gap-2 text-foreground text-base font-bold">
                  <FileText className="h-4.5 w-4.5 text-primary" />
                  الخطوة 2: مراجعة الدفعات والمعلومات المالية
                </CardTitle>
                <CardDescription className="text-right text-xs">راجع تفاصيل المبالغ المحددة وحدد الدفعة الفعلية التي سوف تصرف</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-6 text-right">
                {selectedReport && (
                  <div className="flex justify-start text-right pb-3 mb-2 border-b border-border/40">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-emerald-700 border-emerald-300 bg-background hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-900 dark:hover:bg-emerald-950/20 font-bold h-9 text-xs px-3 rounded-lg shadow-sm"
                      onClick={handleNavigateToPrint}
                    >
                      <Eye className="ml-1.5 h-3.5 w-3.5" />
                      مراجعة وتدقيق التقرير المعتمد
                    </Button>
                  </div>
                )}


                {!isCustom ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2 text-right">
                      <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">التاريخ الميلادي *</Label>
                      <Input
                        type="date"
                        value={formData.dateMiladi}
                        readOnly
                        required
                        className="text-right border-border focus:ring-0 rounded-xl h-10 font-bold text-slate-900 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-900/30 cursor-default"
                      />
                    </div>
                    
                    <div className="space-y-2 text-right">
                      <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">نسبة الإنجاز الفعلية (%) *</Label>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        required
                        value={formData.completionPercentage}
                        readOnly
                        className="text-right border-border focus:ring-0 rounded-xl h-10 font-black text-primary bg-slate-50/50 dark:bg-slate-900/30 cursor-default"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-right">
                    <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">التاريخ الميلادي *</Label>
                    <Input
                      type="date"
                      value={formData.dateMiladi}
                      readOnly
                      required
                      className="text-right border-border focus:ring-0 rounded-xl h-10 font-bold text-slate-900 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-900/30 cursor-default"
                    />
                  </div>
                )}

                <div className="space-y-2 text-right">
                  <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">عنوان طلب الصرف *</Label>
                  <Input
                    value={formData.title}
                    readOnly
                    placeholder="عنوان طلب الصرف المالي"
                    required
                    className="text-right border-border focus:ring-0 rounded-xl h-10 font-bold text-slate-900 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-900/30 cursor-default"
                  />
                </div>
                
                <div className="space-y-2 text-right">
                  <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">
                    {(requestType === "supplier_one_time" || requestType === "sadad_invoice" || requestType === "misc_expenses") 
                      ? "ملخص معلومات الدفعة *" 
                      : "وصف الأعمال والمنجزات الفعلية *"}
                  </Label>
                  <Textarea
                    value={formData.description}
                    readOnly
                    placeholder={(requestType === "supplier_one_time" || requestType === "sadad_invoice" || requestType === "misc_expenses")
                      ? "ملخص تفصيلي لمعلومات الدفعة..."
                      : "وصف تفصيلي للأعمال والمنجزات الفعلية المصاحبة لتقرير الإنجاز المالي..."}
                    rows={4}
                    required
                    className="text-right border-border focus:ring-0 rounded-xl text-xs leading-relaxed font-bold text-slate-900 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-900/30 cursor-default"
                  />
                </div>
              </CardContent>
            </Card>

            {/* الموردون المستحقون للصرف الفعلي */}
            <Card className="border-border/60 shadow-sm rounded-xl overflow-hidden bg-white dark:bg-slate-900">
              <CardHeader className="bg-muted/30 border-b border-border/40 py-4 text-right">
                <div className="text-right space-y-1">
                  <CardTitle className="flex items-center gap-2 text-foreground text-base font-bold justify-start">
                    <Building2 className="h-4.5 w-4.5 text-primary" />
                    الدفعة التي سوف تصرف (المستفيدين والمبالغ الفعلية)
                  </CardTitle>
                  <CardDescription className="text-right text-xs">حدد المبالغ الفعلية التي سوف تصرف وبيانات المستفيدين</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  {suppliers.map((supplier, index) => (
                    <div key={supplier.id} className="p-5 rounded-xl border border-border bg-slate-50/20 dark:bg-slate-900/10 relative space-y-4 text-right animate-slide-up hover:border-primary/30 transition-colors">
                      <div className="flex items-center justify-between border-b border-dashed border-border/80 pb-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 justify-start">
                          <Building2 className="w-4 h-4 text-primary" />
                          <span>المستفيد #{index + 1} (توزيع مستحقات الدفعة)</span>
                        </div>
                        {/* مستفيد جديد Checkbox */}
                        {isCustom && requestType === "custom_standard" && (
                          <div 
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-200 select-none shadow-xs hover:shadow-sm ${
                              supplier.isNew 
                                ? "bg-primary/10 border-primary/30 dark:bg-primary/20 dark:border-primary/50 text-primary" 
                                : "bg-slate-100/80 hover:bg-slate-200/80 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/60 text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            <Checkbox
                              id={`new-beneficiary-${supplier.id}`}
                              checked={supplier.isNew || false}
                              onCheckedChange={(checked) => {
                                setSuppliers(suppliers.map(s => s.id === supplier.id ? {
                                  ...s,
                                  isNew: !!checked,
                                  name: "",
                                  iban: "",
                                  bank: "",
                                } : s));
                              }}
                              className="h-4 w-4 border-slate-300 dark:border-slate-600 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />
                            <Label 
                              htmlFor={`new-beneficiary-${supplier.id}`} 
                              className="text-xs font-bold cursor-pointer text-current flex items-center gap-1"
                            >
                              مستفيد جديد
                            </Label>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                        {/* اسم المورد */}
                        <div className="space-y-2 text-right">
                          <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">
                            {requestType === "sadad_invoice" ? "اسم المفوتر *" : (isCustom ? "الاسم *" : "الاسم")}
                          </Label>
                          {isCustom && requestType === "custom_standard" ? (
                            supplier.isNew ? (
                              <Input
                                value={supplier.name}
                                onChange={(e) => updateSupplier(supplier.id, "name", e.target.value)}
                                placeholder="أدخل اسم المستفيد الجديد"
                                required
                                className="text-right border-border focus:ring-primary rounded-xl h-10 bg-background"
                              />
                            ) : (
                              <Select
                                value={supplier.name}
                                onValueChange={(val) => handleSelectSupplier(supplier.id, val)}
                              >
                                <SelectTrigger className="text-right border-border focus:ring-primary rounded-xl h-10 bg-background w-full" dir="rtl">
                                  <SelectValue placeholder="اختر المستفيد" />
                                </SelectTrigger>
                                <SelectContent dir="rtl">
                                  {allSuppliers?.map((s: any) => (
                                    <SelectItem key={s.id} value={s.name} className="text-right">
                                      {s.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )
                          ) : (
                            <Input
                              value={supplier.name}
                              readOnly
                              className="text-right border-border rounded-xl h-10 font-bold text-slate-900 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-900/30 cursor-default"
                            />
                          )}
                        </div>

                        {/* الأعمال */}
                        {!isCustom && (
                          <div className="space-y-2 text-right">
                            <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">بيان الأعمال / الدفعة *</Label>
                            <Input
                              value={supplier.work}
                              readOnly={!isCustom}
                              onChange={(e) => updateSupplier(supplier.id, "work", e.target.value)}
                              placeholder="مثال: توريد مواد بنائية"
                              className={`text-right border-border rounded-xl h-10 font-bold text-slate-900 dark:text-slate-100 ${
                                isCustom ? "bg-background" : "bg-slate-50/50 dark:bg-slate-900/30 cursor-default"
                              }`}
                            />
                          </div>
                        )}

                        {/* البنك */}
                        <div className="space-y-2 text-right">
                          <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">
                            {requestType === "sadad_invoice" ? "رمز المفوتر *" : "اسم البنك *"}
                          </Label>
                          {isCustom && requestType === "custom_standard" && supplier.isNew ? (
                            <Input
                              value={supplier.bank}
                              onChange={(e) => updateSupplier(supplier.id, "bank", e.target.value)}
                              placeholder="مثال: مصرف الراجحي"
                              required
                              className="text-right border-border focus:ring-primary rounded-xl h-10 bg-background"
                            />
                          ) : (
                            <Input
                              value={supplier.bank}
                              readOnly={true}
                              placeholder={requestType === "sadad_invoice" ? "رمز المفوتر" : "مثال: البنك الأهلي"}
                              className="text-right border-border rounded-xl h-10 font-bold text-slate-900 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-900/30 cursor-default"
                            />
                          )}
                        </div>

                        {/* الآيبان */}
                        <div className="space-y-2 text-right sm:col-span-2 md:col-span-1">
                          <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">
                            {requestType === "sadad_invoice" ? "رقم سداد *" : (supplier.isNew ? "الايبان *" : "الايبان")}
                          </Label>
                          {isCustom && requestType === "custom_standard" && supplier.isNew ? (
                            <Input
                              value={supplier.iban}
                              onChange={(e) => updateSupplier(supplier.id, "iban", e.target.value.toUpperCase())}
                              placeholder="SA0000000000000000000000"
                              required
                              className="text-right border-border focus:ring-primary rounded-xl h-10 bg-background font-mono"
                              dir="ltr"
                            />
                          ) : (
                            <Input
                              value={supplier.iban}
                              readOnly={true}
                              placeholder={requestType === "sadad_invoice" ? "رقم سداد" : "SA0000000000000000000000"}
                              className="text-right border-border rounded-xl h-10 font-mono font-bold text-slate-900 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-900/30 cursor-default"
                              dir={requestType === "sadad_invoice" ? "rtl" : "ltr"}
                            />
                          )}
                        </div>

                        {/* المبلغ المتفق عليه للدفعة */}
                        {!isCustom && (
                          <div className="space-y-2 text-right">
                            <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300 block">المبلغ المتفق عليه للدفعة *</Label>
                            <Input
                              type="number"
                              value={supplier.agreedAmount || ""}
                              readOnly={!isCustom}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                updateSupplier(supplier.id, "agreedAmount", val);
                                updateSupplier(supplier.id, "amount", val);
                              }}
                              placeholder="0.00"
                              required
                              className={`text-right font-bold text-slate-900 dark:text-slate-100 border-border focus:ring-primary rounded-xl h-10 ${
                                isCustom ? "bg-background" : "bg-slate-50/50 dark:bg-slate-900/30 cursor-default"
                              }`}
                            />
                          </div>
                        )}

                        {/* النسبة (%) */}
                        {!isCustom && (
                          <div className="space-y-2 text-right">
                            <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300 block">النسبة (%)</Label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={contractAmount ? Number(((supplier.amount / contractAmount) * 100).toFixed(2)) : ""}
                              onChange={(e) => {
                                  const pct = parseFloat(e.target.value) || 0;
                                  const calculatedAmount = contractAmount ? (contractAmount * pct) / 100 : 0;
                                  updateSupplier(supplier.id, "amount", Number(calculatedAmount.toFixed(2)));
                              }}
                              placeholder="0"
                              className="text-right font-bold text-primary border-border focus:ring-primary rounded-xl h-10 bg-background"
                            />
                          </div>
                        )}

                        {/* المبلغ */}
                        <div className="space-y-2 text-right">
                          <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300 block">المبلغ الفعلي (ريال) *</Label>
                          <Input
                            type="number"
                            value={supplier.amount || ""}
                            readOnly={isCustom && requestType !== "custom_standard"}
                            onChange={(e) => updateSupplier(supplier.id, "amount", parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            required
                            className={`text-right font-black text-primary border-border focus:ring-primary rounded-xl h-10 ${
                              isCustom && requestType !== "custom_standard" 
                                ? "bg-slate-50/50 dark:bg-slate-900/30 cursor-default" 
                                : "bg-background"
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* ملخص الدفعة والتقرير - مدمج عمودياً كبطاقة عادية بآخر الصفحة لتماثل تقارير الإنجاز */}
            <Card className="border-border/60 shadow-sm rounded-xl overflow-hidden bg-white dark:bg-slate-900">
              <CardHeader className="bg-muted/30 border-b border-border/40 py-4 text-right">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <Coins className="w-4.5 h-4.5 text-primary" />
                  ملخص الدفعة والتقرير المالي
                </CardTitle>
                <CardDescription>تفاصيل التدقيق والمجاميع المالية لطلب الصرف الحالي</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6 text-right">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-right">
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground block font-bold">اسم المشروع</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">
                      {isCustom ? "طلب صرف مخصص / عام" : (projectDetails?.name || "المشروع المحدد")}
                    </span>
                  </div>
                  {!isCustom && (
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground block font-bold">رقم تقرير الإنجاز</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{selectedReport?.reportNumber || "لا يوجد"}</span>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="p-3 sm:p-4 rounded-xl bg-primary/[0.03] border border-primary/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] text-primary block font-black">إجمالي الدفعة الفعلية التي سوف تصرف</span>
                    <span className="text-xl sm:text-2xl font-black text-primary">
                      {totalAmount.toLocaleString()} <span className="text-xs font-semibold">ريال سعودي</span>
                    </span>
                  </div>
                  
                  {!isCustom && contractDetails && (
                    <div className="text-xs text-left">
                      <span className="text-muted-foreground block text-[9px]">قيمة العقد الإجمالي</span>
                      <span className="font-bold text-foreground">{contractAmount.toLocaleString()} ريال</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Navigation Actions */}
            <div className="flex flex-col sm:flex-row-reverse items-stretch sm:items-center justify-between border-t border-border/60 pt-4 gap-3">
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || (!isCustom && suppliers.some(s => s.amount > s.agreedAmount))}
                className="gradient-primary text-white font-bold px-6 sm:px-8 h-10 sm:h-11 rounded-xl shadow-sm text-xs sm:text-sm w-full sm:w-auto"
              >
                <Send className="ml-2 h-4 w-4" />
                إرسال طلب الصرف للاعتماد
              </Button>
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="text-slate-700 border-border hover:bg-muted font-bold px-4 sm:px-6 h-10 sm:h-11 text-xs rounded-xl w-full sm:w-auto"
              >
                <ArrowRight className="ml-2 h-4 w-4" />
                السابق
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* نافذة مراجعة تقرير الإنجاز */}
      <Dialog open={showReportReviewDialog} onOpenChange={setShowReportReviewDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-right text-emerald-800 font-bold">مراجعة تقرير الإنجاز المعتمد</DialogTitle>
            <DialogDescription className="text-right text-xs">
              {selectedReport?.reportNumber} - {selectedReport?.title}
            </DialogDescription>
          </DialogHeader>
          
          {selectedReport && (
            <div className="space-y-6 py-4 text-right">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">تاريخ التقرير</p>
                  <p className="text-sm font-semibold">{new Date(selectedReport.reportDate).toLocaleDateString("ar-SA")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">معد التقرير</p>
                  <p className="text-sm font-semibold">{selectedReport.createdByName}</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <h3 className="font-bold text-sm text-slate-800">نسب الإنجاز</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="p-3 bg-muted rounded-lg text-center">
                    <p className="text-2xl font-bold">{selectedReport.overallProgress}%</p>
                    <p className="text-xs text-muted-foreground">الإجمالي</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-blue-700">{selectedReport.plannedProgress}%</p>
                    <p className="text-xs text-blue-600">المخطط</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-700">{selectedReport.actualProgress}%</p>
                    <p className="text-xs text-green-600">الفعلي</p>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              {!!selectedReport.workSummary && (
                <div className="space-y-1.5">
                  <h3 className="font-bold text-sm text-slate-800">الأعمال المنجزة</h3>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedReport.workSummary as string}
                  </p>
                </div>
              )}
              
              {!!selectedReport.challenges && (
                <div className="space-y-1.5">
                  <h3 className="font-bold text-sm text-slate-800">التحديات والمعوقات</h3>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedReport.challenges as string}
                  </p>
                </div>
              )}

              {!!selectedReport.photos && (() => {
                try {
                  let photosArr = selectedReport.photos;
                  while (typeof photosArr === 'string') {
                    photosArr = JSON.parse(photosArr);
                  }
                  
                  if (Array.isArray(photosArr) && photosArr.length > 0) {
                    return (
                      <div className="space-y-3">
                        <Separator />
                        <h3 className="font-bold text-sm flex items-center gap-2">
                          <FileText className="w-4 h-4 text-emerald-600" />
                          مرفقات التقرير
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                          {photosArr.map((photo: string, index: number) => {
                            const isImage = photo.startsWith("data:image/") || photo.startsWith("http") && (photo.endsWith(".png") || photo.endsWith(".jpg") || photo.endsWith(".jpeg") || photo.endsWith(".webp"));
                            return (
                              <div key={index} className="border rounded-lg p-2 flex flex-col items-center justify-center bg-muted/20 relative group">
                                {isImage ? (
                                  <img src={photo} alt={`مرفق ${index + 1}`} className="w-full h-20 object-cover rounded-md mb-2" />
                                ) : (
                                  <div className="w-full h-20 flex items-center justify-center rounded-md bg-background border border-dashed mb-2 text-emerald-800 font-bold text-xs">
                                    مستند PDF
                                  </div>
                                )}
                                <a href={photo} download={`مرفق_${index + 1}`} className="text-[10px] text-emerald-700 font-semibold hover:underline">
                                  تحميل المرفق
                                </a>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                } catch (e) {
                  console.error(e);
                }
                return null;
              })()}
            </div>
          )}
          
          <DialogFooter className="text-right border-t pt-4">
            <Button variant="outline" onClick={() => setShowReportReviewDialog(false)} className="text-xs h-9">
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
