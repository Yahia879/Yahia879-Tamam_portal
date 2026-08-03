import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { numberToArabicText as baseNumberToArabicText } from "@shared/tafqeet";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
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
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
  Info,
  Eye,
  Check,
  Coins,
  HeartHandshake,
  FileCheck,
  Receipt,
  Layers,
} from "lucide-react";
import { toast } from "sonner";

function numberToArabicText(num: number): string {
  return baseNumberToArabicText(num, { prefix: "", suffix: " فقط لا غير", currency: "ريال سعودي" });
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
  const canCreateDonationDisbursement = userPermissions.includes("disbursements.create_donation");

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
  const [isTamamLinked, setIsTamamLinked] = useState(() => savedState?.isTamamLinked ?? false);
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
    donationOpportunityId: number;
    mosqueRequestId: number;
    contractId: number;
    title: string;
    description: string;
    completionPercentage: number;
    dateMiladi: string;
    contractPaymentId: number;
    fundingSupport: string;
    mainProjectName: string;
    customProjectName: string;
    requiredWorksDesc: string;
    beneficiaryName: string;
    bankAccountName: string;
    bankName: string;
    iban: string;
    amount: number;
    adminFees: number;
    projectCity: string;
    customCity: string;
    billerName: string;
    sadadNumber: string;
    billerCode: string;
    actualProjectValue?: number;
    amountsSpent?: number;
    fundingSourceName?: string;
  }>(() => savedState?.formData ?? {
    projectId: 0,
    donationOpportunityId: 0,
    mosqueRequestId: 0,
    contractId: 0,
    title: "",
    description: "",
    completionPercentage: 0,
    dateMiladi: new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()),
    contractPaymentId: 0,
    fundingSupport: "",
    mainProjectName: "",
    customProjectName: "",
    requiredWorksDesc: "",
    beneficiaryName: "",
    bankAccountName: "",
    bankName: "",
    iban: "",
    amount: 0,
    adminFees: 0,
    projectCity: "",
    customCity: "",
    billerName: "",
    sadadNumber: "",
    billerCode: "",
    actualProjectValue: 0,
    amountsSpent: 0,
    fundingSourceName: "",
  });
  
  const [selectedReportId, setSelectedReportId] = useState<number | null>(() => savedState?.selectedReportId ?? null);
  const [showReportReviewDialog, setShowReportReviewDialog] = useState(false);
  const [billerSearch, setBillerSearch] = useState("");

  // حالات التنبيه الذكي عند عدم كفاية مدفوعات الداعم المقبوضة فعلياً
  const [showSupporterDeficitDialog, setShowSupporterDeficitDialog] = useState(false);
  const [disburseFromGeneralAccount, setDisburseFromGeneralAccount] = useState(false);


  // إعادة ضبط التغطيّة التلقائية عند دخول الخطوة الثانية أو تغيير المشروع أو تقرير الإنجاز لضمان إظهار النافذة المنبثقة
  useEffect(() => {
    if (step === 2) {
      setDisburseFromGeneralAccount(false);
    }
  }, [step, selectedReportId, formData.projectId]);

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
        isTamamLinked,
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

  const activeCategory = isDonationLinked 
    ? "donation_opportunity" 
    : isTamamLinked 
    ? "tamam_platform" 
    : !isCustom 
    ? "approved_report" 
    : "custom";

  const handleCategoryChange = (cat: "donation_opportunity" | "tamam_platform" | "approved_report" | "custom") => {
    setSelectedReportId(null);
    if (cat === "donation_opportunity") {
      setIsDonationLinked(true);
      setIsTamamLinked(false);
      setIsCustom(true);
      setRequestType("supplier_one_time");
      setFormData(prev => ({
        ...prev,
        projectId: 0,
        donationOpportunityId: 0,
        mosqueRequestId: 0,
        contractId: 0,
        contractPaymentId: 0,
        title: "",
        description: "",
        completionPercentage: 100,
        customProjectName: "",
        beneficiaryName: "",
        bankAccountName: "",
        bankName: "",
        iban: "",
        amount: 0,
        adminFees: 0,
        projectCity: "",
        customCity: "",
        billerName: "",
        sadadNumber: "",
        billerCode: "",
      }));
      setSuppliers([{ id: crypto.randomUUID(), name: "", work: "", amount: 0, iban: "", bank: "", agreedAmount: 0 }]);
    } else if (cat === "tamam_platform") {
      setIsDonationLinked(false);
      setIsTamamLinked(true);
      setIsCustom(true);
      setRequestType("supplier_one_time");
      setFormData(prev => ({
        ...prev,
        projectId: 0,
        donationOpportunityId: 0,
        mosqueRequestId: 0,
        contractId: 0,
        contractPaymentId: 0,
        title: "",
        description: "",
        completionPercentage: 100,
        customProjectName: "",
        beneficiaryName: "",
        bankAccountName: "",
        bankName: "",
        iban: "",
        amount: 0,
        adminFees: 0,
        projectCity: "",
        customCity: "",
        billerName: "",
        sadadNumber: "",
        billerCode: "",
      }));
      setSuppliers([{ id: crypto.randomUUID(), name: "", work: "", amount: 0, iban: "", bank: "", agreedAmount: 0 }]);
    } else if (cat === "approved_report") {
      setIsDonationLinked(false);
      setIsTamamLinked(false);
      setIsCustom(false);
      setRequestType("project_linked");
      setFormData(prev => ({
        ...prev,
        projectId: 0,
        donationOpportunityId: 0,
        mosqueRequestId: 0,
        contractId: 0,
        contractPaymentId: 0,
        title: "",
        description: "",
        completionPercentage: 0,
        customProjectName: "",
        beneficiaryName: "",
        bankAccountName: "",
        bankName: "",
        iban: "",
        amount: 0,
        adminFees: 0,
        projectCity: "",
        customCity: "",
        billerName: "",
        sadadNumber: "",
        billerCode: "",
      }));
      setSuppliers([{ id: crypto.randomUUID(), name: "", work: "", amount: 0, iban: "", bank: "", agreedAmount: 0 }]);
    } else if (cat === "custom") {
      setIsDonationLinked(false);
      setIsTamamLinked(false);
      setIsCustom(true);
      if (requestType === "project_linked") {
        setRequestType("supplier_one_time");
      }
      setFormData(prev => ({
        ...prev,
        projectId: 0,
        donationOpportunityId: 0,
        mosqueRequestId: 0,
        contractId: 0,
        contractPaymentId: 0,
        title: "",
        description: "",
        completionPercentage: 100,
        customProjectName: "",
        beneficiaryName: "",
        bankAccountName: "",
        bankName: "",
        iban: "",
        amount: 0,
        adminFees: 0,
        projectCity: "",
        customCity: "",
        billerName: "",
        sadadNumber: "",
        billerCode: "",
      }));
      setSuppliers([{ id: crypto.randomUUID(), name: "", work: "", amount: 0, iban: "", bank: "", agreedAmount: 0 }]);
    }
  };

  const handleDonationLinkedChange = (checked: boolean) => {
    setIsDonationLinked(checked);
    if (checked) {
      setIsTamamLinked(false);
      setIsCustom(true);
      setRequestType("supplier_one_time");
      setFormData(prev => ({ ...prev, projectId: 0, donationOpportunityId: 0, mosqueRequestId: 0 }));
    } else {
      setIsCustom(!canCreateStandard);
      setRequestType(canCreateStandard ? "project_linked" : "supplier_one_time");
      setFormData(prev => ({ ...prev, projectId: 0, donationOpportunityId: 0, mosqueRequestId: 0 }));
    }
  };

  const handleTamamLinkedChange = (checked: boolean) => {
    setIsTamamLinked(checked);
    if (checked) {
      setIsCustom(true);
      setRequestType("supplier_one_time");
      setIsDonationLinked(false);
      setFormData(prev => ({ ...prev, projectId: 0, donationOpportunityId: 0, mosqueRequestId: 0 }));
    } else {
      setIsCustom(!canCreateStandard);
      setRequestType(canCreateStandard ? "project_linked" : "supplier_one_time");
      setFormData(prev => ({ ...prev, projectId: 0, donationOpportunityId: 0, mosqueRequestId: 0 }));
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
      donationOpportunityId: isDonationLinked ? prev.donationOpportunityId : 0,
      mosqueRequestId: isDonationLinked ? prev.mosqueRequestId : 0,
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
      adminFees: 0,
      projectCity: "",
      customCity: "",
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
        const resolvedCity = prev.projectCity === "other" ? prev.customCity : prev.projectCity;
        const descriptionTamamFields = isTamamLinked
          ? `\nقيمة المشروع الفعلية: ${prev.actualProjectValue || 0}\nالمبالغ التي صرفت: ${prev.amountsSpent || 0}`
          : "";
        const newDesc = `التمويل/الدعم: ${prev.fundingSupport || ""}\nالمشروع الرئيسي: ${prev.mainProjectName || ""}\nالمشروع المخصص: ${prev.customProjectName || ""}\nالأعمال المطلوبة: ${prev.requiredWorksDesc || ""}\nعنوان المشروع: ${resolvedCity || ""}\nالمستفيد: ${prev.beneficiaryName || ""}\nالحساب البنكي: ${prev.bankAccountName || ""}\nالبنك: ${prev.bankName || ""}\nالآيبان: ${prev.iban || ""}\nالمبلغ: ${prev.amount || 0}${descriptionTamamFields}\nالأجور الإدارية: ${prev.adminFees || 0}`;
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
        const newWork = formData.requiredWorksDesc || "";
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
        const resolvedCity = prev.projectCity === "other" ? prev.customCity : prev.projectCity;
        const newDesc = `التمويل/الدعم: ${prev.fundingSupport || ""}\nالمشروع الرئيسي: ${prev.mainProjectName || ""}\nالمشروع المخصص: ${prev.customProjectName || ""}\nالأعمال المطلوبة: ${prev.requiredWorksDesc || ""}\nعنوان المشروع: ${resolvedCity || ""}\nالمفوتر: ${prev.billerName || ""}\nرقم سداد: ${prev.sadadNumber || ""}\nرمز المفوتر: ${prev.billerCode || ""}\nالمبلغ: ${prev.amount || 0}\nالأجور الإدارية: ${prev.adminFees || 0}`;
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
        const newWork = formData.requiredWorksDesc || "";
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
    isTamamLinked,
    formData.fundingSupport,
    formData.mainProjectName,
    formData.customProjectName,
    formData.beneficiaryName,
    formData.bankAccountName,
    formData.bankName,
    formData.iban,
    formData.amount,
    formData.adminFees,
    formData.projectCity,
    formData.customCity,
    formData.billerName,
    formData.sadadNumber,
    formData.billerCode,
    formData.actualProjectValue,
    formData.amountsSpent
  ]);
  
  // جلب المشاريع
  const { data: projects } = trpc.projects.getAll.useQuery({});
  
  // جلب فرص التبرع النشطة
  const { data: donationOpportunities } = trpc.disbursements.getActiveDonations.useQuery(
    undefined,
    { enabled: isDonationLinked }
  );
  
  // جلب الموردين النشطين
  const { data: allSuppliers } = trpc.suppliers.getActiveSuppliers.useQuery({ includeUnapproved: true });

  // جلب التصنيفات لـ "التمويل / الدعم" و"اسم المشروع الرئيسي" ديناميكياً لتجهيز البيانات
  const { data: fundingSupportData } = trpc.categories.getCategoryByType.useQuery({ type: "funding_support" });
  const { data: mainProjectsData } = trpc.categories.getCategoryByType.useQuery({ type: "main_projects" });
  // جلب معلومات المفوتر ديناميكياً
  const { data: sadadBillersData } = trpc.categories.getCategoryByType.useQuery({ type: "sadad_billers" });
  // جلب المدن
  const { data: citiesData } = trpc.categories.getCategoryByType.useQuery({ type: "city" });
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
  
  // جلب تفاصيل المشروع (بدون lightweight لجلب قائمة الدفعات والعقود)
  const { data: projectDetails } = trpc.projects.getById.useQuery(
    { id: formData.projectId, lightweight: false },
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

  // جلب البيانات المالية وسندات القبض للمشروع المحدد للتحقق الذكي من رصيد مدفوعات الداعم
  const { data: projectFinancials } = trpc.projects.getFinancialData.useQuery(
    { projectId: formData.projectId },
    { enabled: formData.projectId > 0 }
  );

  const generalAccountSupportAmount = useMemo(() => {
    const finDetail = projectFinancials?.financialDetail;
    if (!finDetail?.supportSourcesJson) return 0;
    try {
      const parsed = JSON.parse(finDetail.supportSourcesJson);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((s: any) => {
            const name = s.entity === "اخرى" ? s.customEntity : s.entity;
            if (!name) return false;
            const norm = name.trim().toLowerCase();
            return norm.includes("الحساب العام") || norm.includes("حساب عام");
          })
          .reduce((sum: number, s: any) => sum + (parseFloat(s.amount) || 0), 0);
      }
    } catch (e) {}
    return 0;
  }, [projectFinancials]);

  // استخراج جهات الدعم المسجلة للمشروع
  const supportSources = useMemo(() => {
    const list: Array<{ entity: string; amount?: number }> = [];
    const finDetail = projectFinancials?.financialDetail;
    if (finDetail?.supportSourcesJson) {
      try {
        const parsed = JSON.parse(finDetail.supportSourcesJson);
        if (Array.isArray(parsed)) {
          parsed.forEach((s: any) => {
            const name = s.entity === "اخرى" ? s.customEntity : s.entity;
            if (name && name.trim()) {
              list.push({ entity: name.trim(), amount: s.amount || 0 });
            }
          });
        }
      } catch (e) {
        console.error("Failed to parse supportSourcesJson", e);
      }
    }
    const singleSupport = (finDetail as any)?.supportEntity || (finDetail as any)?.supportingEntity;
    if (list.length === 0 && singleSupport && typeof singleSupport === "string" && singleSupport.trim()) {
      list.push({ entity: singleSupport.trim(), amount: 0 });
    }
    if (list.length === 0 && (projectDetails as any)?.supportingEntity) {
      list.push({ entity: (projectDetails as any).supportingEntity.trim(), amount: 0 });
    }
    return list;
  }, [projectFinancials, projectDetails]);

  const normalizeArabicText = (str?: string | null) => {
    if (!str) return "";
    return str
      .trim()
      .replace(/[\u064B-\u0652]/g, "") // tashkeel
      .replace(/[أإآ]/g, "ا") // Alif
      .replace(/ى/g, "ي") // Ya
      .replace(/ة/g, "ه") // Ta Marbouta
      .toLowerCase();
  };

  // إجمالي سندات القبض المقبوضة فعلياً الخاصة بالداعم المحدد فقط
  const totalSupporterPayments = useMemo(() => {
    const vouchers = projectFinancials?.receiptVouchers || [];
    const selectedFunder = (formData.fundingSourceName || (supportSources.length === 1 ? supportSources[0]?.entity : "") || "").trim();

    if (!selectedFunder) {
      return vouchers.reduce((sum: number, v: any) => sum + parseFloat(v.amount || "0"), 0) + generalAccountSupportAmount;
    }

    const normSelected = normalizeArabicText(selectedFunder);

    const matchingVouchers = vouchers.filter((v: any) => {
      const normPayer = normalizeArabicText(v.payerName);
      if (!normPayer) return false;
      return (
        normPayer === normSelected ||
        normPayer.includes(normSelected) ||
        normSelected.includes(normPayer)
      );
    });

    const vouchersTotal = matchingVouchers.reduce((sum: number, v: any) => sum + parseFloat(v.amount || "0"), 0);
    const isGenAccountSelected = normSelected.includes("الحساب العام") || normSelected.includes("حساب عام");

    return isGenAccountSelected ? (vouchersTotal + generalAccountSupportAmount) : vouchersTotal;
  }, [projectFinancials, formData.fundingSourceName, supportSources, generalAccountSupportAmount]);

  // الضبط التلقائي لجهة الدعم عند وجود داعم واحد فقط أو تغيير المشروع
  useEffect(() => {
    if (supportSources.length > 0) {
      if (supportSources.length === 1 || !formData.fundingSourceName) {
        setFormData(prev => ({
          ...prev,
          fundingSourceName: supportSources.length === 1 ? supportSources[0].entity : (prev.fundingSourceName || "")
        }));
      }
    }
  }, [supportSources]);



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
        ? new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(selectedReport.reportDate))
        : new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

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
  
  // تحديث بيانات المورد من العقد وتقرير الإنجاز والبيانات المالية تلقائياً
  useEffect(() => {
    const reportBudget = selectedReport ? parseFloat(String(selectedReport.budgetSpent || "0")) : 0;
    const paymentAmt = paymentInfo ? parseFloat(String(paymentInfo.amount || "0")) : 0;
    const quotationAmt = parseFloat(String(
      projectFinancials?.approvedQuotation?.approvedAmount || 
      projectFinancials?.approvedQuotation?.finalAmount || 
      projectFinancials?.approvedQuotation?.totalAmount || 
      projectFinancials?.allQuotations?.[0]?.approvedAmount ||
      projectFinancials?.allQuotations?.[0]?.finalAmount ||
      projectFinancials?.allQuotations?.[0]?.totalAmount || 
      "0"
    ));
    const contractAmt = parseFloat(String(
      contractDetails?.contract?.contractAmount || 
      (projectContracts?.contracts?.[0] as any)?.contractAmount || 
      "0"
    ));
    const projectBudgetAmt = parseFloat(String((projectDetails as any)?.budget || (projectDetails as any)?.actualCost || "0"));

    const calculatedAmount = reportBudget > 0
      ? reportBudget
      : (paymentAmt > 0 ? paymentAmt : (contractAmt > 0 ? contractAmt : (quotationAmt > 0 ? quotationAmt : projectBudgetAmt)));

    if (calculatedAmount > 0) {
      setSuppliers(prev => {
        if (prev.length > 0 && prev[0].amount !== calculatedAmount) {
          const updated = [...prev];
          const secondPartyName = contractDetails?.contract?.secondPartyName || (projectContracts?.contracts?.[0] as any)?.secondPartyName || "مورد المشروع";
          const secondPartyIban = contractDetails?.contract?.secondPartyIban || (projectContracts?.contracts?.[0] as any)?.secondPartyIban || "";
          const secondPartyBank = contractDetails?.contract?.secondPartyBankName || (projectContracts?.contracts?.[0] as any)?.secondPartyBankName || "";
          const targetWork = selectedReport?.title || contractDetails?.contract?.contractTitle || "أعمال منفذة حسب تقرير الإنجاز";
          
          updated[0] = {
            ...updated[0],
            amount: calculatedAmount,
            agreedAmount: updated[0].agreedAmount > 0 ? updated[0].agreedAmount : calculatedAmount,
            name: updated[0].name || secondPartyName,
            iban: updated[0].iban || secondPartyIban,
            bank: updated[0].bank || secondPartyBank,
            work: updated[0].work || targetWork,
          };
          return updated;
        }
        return prev;
      });
    }
  }, [selectedReport, paymentInfo, contractDetails, projectContracts, projectFinancials, projectDetails]);

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
  
  // حساب الإجمالي من قائمة الموردين
  const rawSuppliersAmount = suppliers.reduce((sum, s) => sum + (s.amount || 0), 0);
  const totalAmount = rawSuppliersAmount;
  
  // حساب قيمة طلب الصرف المتوقع من التقرير، الدفعة المرتبطة، العقد، ميزانية المشروع، أو العرض المعتمد
  const rawReportAmount = parseFloat(String(selectedReport?.budgetSpent || "0"));
  const rawPaymentAmount = parseFloat(String(paymentInfo?.amount || "0"));
  const rawQuotation = projectFinancials?.approvedQuotation;
  const rawQuotationAmount = parseFloat(String(
    rawQuotation?.approvedAmount || 
    rawQuotation?.finalAmount || 
    rawQuotation?.totalAmount || 
    projectFinancials?.allQuotations?.[0]?.approvedAmount ||
    projectFinancials?.allQuotations?.[0]?.finalAmount ||
    projectFinancials?.allQuotations?.[0]?.totalAmount || 
    "0"
  ));
  const rawContractAmount = parseFloat(String(contractDetails?.contract?.contractAmount || "0"));
  const rawProjectContractAmount = parseFloat(String((projectContracts?.contracts?.[0] as any)?.contractAmount || "0"));
  const rawProjectBudget = parseFloat(String((projectDetails as any)?.budget || (projectDetails as any)?.actualCost || "0"));

  const currentDisbursementAmount = 
    rawSuppliersAmount > 0 
      ? rawSuppliersAmount 
      : (
          rawReportAmount > 0 ? rawReportAmount :
          rawPaymentAmount > 0 ? rawPaymentAmount :
          rawQuotationAmount > 0 ? rawQuotationAmount :
          rawContractAmount > 0 ? rawContractAmount :
          rawProjectContractAmount > 0 ? rawProjectContractAmount :
          rawProjectBudget > 0 ? rawProjectBudget :
          formData.amount || 0
        );
  
  // حساب عجز مدفوعات الداعم مقارنة بالمبلغ المطلوب صرفه
  const funderDeficit = Math.max(0, currentDisbursementAmount - totalSupporterPayments);
  const hasFunderPaymentDeficit = (formData.projectId > 0 || selectedReportId !== null) && currentDisbursementAmount > 0 && (funderDeficit > 0.01 || totalSupporterPayments === 0);

  // حساب المتبقي للصرف (بدون خصم المبلغ الحالي - نحسب المتاح قبل هذا الطلب)
  const totalPaymentsSum = projectDetails?.payments
    ?.filter((p: any) => p.status !== "rejected" && p.status !== "cancelled")
    ?.reduce((sum: number, p: any) => sum + parseFloat(p.amount || "0"), 0) || 0;
  const totalContractsSum = projectDetails?.contracts?.reduce((sum: number, c: any) => sum + parseFloat(c.amount || "0"), 0) || 0;
  const contractAmount = parseFloat(contractDetails?.contract?.contractAmount || "0") || totalContractsSum;
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
  
  // دالة التحقق من تعطيل زر الانتقال من الخطوة 2 إلى الخطوة 3
  const isStep2NextDisabled = () => {
    const isFundingRequired = requestType === "supplier_one_time" || requestType === "sadad_invoice" || requestType === "misc_expenses";
    if ((isFundingRequired && !formData.fundingSupport) || !formData.mainProjectName) return true;

    if (requestType === "project_linked") {
      if (formData.projectId > 0 && supportSources.length === 0) {
        return true;
      }
      if (formData.projectId > 0 && supportSources.length > 1 && !formData.fundingSourceName) {
        return true;
      }
      return !selectedReportId || (selectedReport && isReportLinked(selectedReport));
    }
    
    if (isDonationLinked && !formData.donationOpportunityId) {
      return true;
    }
    
    if (requestType === "supplier_one_time" || requestType === "misc_expenses") {
      return (
        !formData.customProjectName ||
        !formData.projectCity ||
        (formData.projectCity === "other" && !formData.customCity) ||
        !formData.requiredWorksDesc ||
        !formData.beneficiaryName ||
        !formData.bankAccountName ||
        !formData.bankName ||
        !formData.iban ||
        !formData.dateMiladi ||
        formData.amount <= 0 ||
        formData.adminFees < 0 ||
        (isTamamLinked && (formData.actualProjectValue === undefined || formData.actualProjectValue <= 0 || formData.amountsSpent === undefined || formData.amountsSpent < 0))
      );
    }
    
    if (requestType === "sadad_invoice") {
      return (
        !formData.customProjectName ||
        !formData.projectCity ||
        (formData.projectCity === "other" && !formData.customCity) ||
        !formData.requiredWorksDesc ||
        !formData.billerName ||
        !formData.sadadNumber ||
        !formData.billerCode ||
        !formData.dateMiladi ||
        formData.amount <= 0 ||
        formData.adminFees < 0
      );
    }
    
    return false;
  };

  const isNextDisabled = isStep2NextDisabled;

  // معالجة النقر على زر "التالي" بالخطوة الثانية
  const handleStep2Next = () => {
    if (formData.projectId > 0 && supportSources.length === 0) {
      toast.error("عذراً، هذا المشروع لا يمتلك أي جهة دعم مسجلة. يرجى إكمال باقي البيانات في صفحة المشروع أولاً.");
      return;
    }
    if (formData.projectId > 0 && supportSources.length > 1 && !formData.fundingSourceName) {
      toast.error("يرجى تحديد جهة الدعم المصروف منها لكون المشروع مسجلاً بأكثر من داعم");
      return;
    }
    if (hasFunderPaymentDeficit && !disburseFromGeneralAccount) {
      setShowSupporterDeficitDialog(true);
      return;
    }
    setStep(3);
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
    if (formData.projectId > 0 && supportSources.length > 1 && !formData.fundingSourceName) {
      toast.error("يرجى تحديد جهة الدعم المصروف منها لكون المشروع مسجلاً بأكثر من داعم");
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
    if (formData.adminFees < 0) {
      toast.error("الأجور الإدارية لا يمكن أن تكون سالبة");
      return;
    }
    if (isTamamLinked) {
      if (formData.actualProjectValue === undefined || formData.actualProjectValue <= 0) {
        toast.error("يرجى إدخال قيمة المشروع الفعلية");
        return;
      }
      if (formData.amountsSpent === undefined || formData.amountsSpent < 0) {
        toast.error("يرجى إدخال المبالغ التي صرفت");
        return;
      }
    }
    if (isCustom && (requestType === "supplier_one_time" || requestType === "sadad_invoice" || requestType === "misc_expenses")) {
      if (!formData.projectCity) {
        toast.error("يرجى اختيار عنوان المشروع");
        return;
      }
      if (formData.projectCity === "other" && !formData.customCity) {
        toast.error("يرجى كتابة عنوان المشروع البديل");
        return;
      }
      if (!formData.requiredWorksDesc) {
        toast.error("يرجى إدخال وصف الأعمال المطلوبة");
        return;
      }
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
    if (!isCustom && contractAmount > 0) {
      if (totalAmount > contractAmount) {
        toast.error(`المبلغ لا يمكن أن يتجاوز قيمة العقد (${contractAmount.toLocaleString()} ريال)`);
        return;
      }

      if (totalAmount > remainingForDisbursement || remainingForDisbursement <= 0) {
        toast.error(
          remainingForDisbursement <= 0
            ? "تم الوصول للحد الأقصى لقيمة العقد ولا يمكن إضافة دفعات جديدة"
            : `المبلغ لا يمكن أن يتجاوز الإجمالي المتبقي للصرف (${Math.max(0, remainingForDisbursement).toLocaleString()} ريال)`
        );
        return;
      }
    }

    // 1. التحقق الذكي من رصيد مدفوعات الداعم الفعلية (سندات القبض)
    if (hasFunderPaymentDeficit && !disburseFromGeneralAccount) {
      setShowSupporterDeficitDialog(true);
      return;
    }
    
    executeDisbursementSubmit(disburseFromGeneralAccount);
  };

  const executeDisbursementSubmit = (useGeneralAccount: boolean) => {
    const isManual = paymentIdRaw.startsWith("manual-");
    const resolvedCity = formData.projectCity === "other" ? formData.customCity : formData.projectCity;
    
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
        requiredWorksDesc: formData.requiredWorksDesc || "",
        billerName: formData.billerName || "",
        sadadNumber: formData.sadadNumber || "",
        billerCode: formData.billerCode || "",
        donationOpportunityId: isDonationLinked ? formData.donationOpportunityId : undefined,
        mosqueRequestId: isDonationLinked ? formData.mosqueRequestId : undefined,
        adminFees: formData.adminFees || 0,
        projectCity: resolvedCity || "",
        isTamamLinked: isTamamLinked,
        actualProjectValue: isTamamLinked ? formData.actualProjectValue : undefined,
        amountsSpent: isTamamLinked ? formData.amountsSpent : undefined,
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
    
    const generalAccountNote = useGeneralAccount
      ? `\n[تنبيه مالـي: تم التوجيه بالصرف من الحساب العام للجمعية لتغطية العجز البالغ (${funderDeficit.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ريال) عن مدفوعات الداعم الفعلية المقبوضة]`
      : "";

    const generalAccountMetadata = useGeneralAccount
      ? [{
          name: "general_account_coverage",
          url: JSON.stringify({
            funderDeficit,
            totalSupporterPayments,
            currentDisbursementAmount,
            disburseFromGeneralAccount: true,
          }),
          type: "metadata"
        }]
      : [];

    const baseAttachments = isCustom 
      ? customSupplierMetadata 
      : (linkedMetadata.length > 0 ? linkedMetadata : []);

    const finalAttachments = [...baseAttachments, ...generalAccountMetadata];

    createMutation.mutate({
      projectId: formData.projectId && formData.projectId > 0 ? formData.projectId : null,
      contractId: isCustom ? undefined : (formData.contractId || undefined),
      contractPaymentId: isCustom ? undefined : (isManual ? undefined : (formData.contractPaymentId || undefined)),
      paymentId: isCustom ? undefined : (isManual ? formData.contractPaymentId : undefined),
      title: formData.title,
      description: formData.description + generalAccountNote,
      amount: totalAmount,
      adminFees: (requestType === "supplier_one_time" || requestType === "sadad_invoice" || requestType === "misc_expenses") ? formData.adminFees : undefined,
      paymentType: "progress",
      dateMiladi: formData.dateMiladi,
      completionPercentage: formData.completionPercentage,
      fundingSourceName: formData.fundingSourceName || (supportSources.length === 1 ? supportSources[0].entity : undefined),
      attachments: finalAttachments.length > 0 ? finalAttachments : undefined,
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
                  إنشاء طلب صرف مالي جديد
                </h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground text-right font-medium mt-0.5 hidden sm:block">
                  إنشاء طلب صرف مرتبط بتقرير إنجاز معتمد أو طلب صرف مخصص لمورد أو فاتورة أو مصروفات منوعة 
                </p>
              </div>
            </div>
          </div>

          {/* 3-Step Timeline Header */}
          <div className="max-w-xl mx-auto w-full px-2 sm:px-4 py-2" dir="rtl">
            <div className="relative flex items-center justify-between">
              {/* Connecting Line background */}
              <div className="absolute right-0 left-0 top-1/2 -translate-y-1/2 h-0.5 bg-border rounded-full z-0" />
              {/* Connecting Active Line progress */}
              <div 
                className="absolute right-0 top-1/2 -translate-y-1/2 h-0.5 bg-primary rounded-full z-0 transition-all duration-500"
                style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}
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
                  نوع مسار الصرف
                </span>
              </div>

              {/* Step 2 Node */}
              <div className="flex flex-col items-center gap-1.5 z-10">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 border ${
                    step >= 2 
                      ? 'bg-primary border-primary text-primary-foreground shadow-sm' 
                      : 'bg-background border-border text-muted-foreground'
                  }`}
                >
                  {step > 2 ? <Check className="w-4 h-4" /> : "٢"}
                </div>
                <span className={`text-xs font-semibold ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
                  المشروع والتقرير
                </span>
              </div>

              {/* Step 3 Node */}
              <div className="flex flex-col items-center gap-1.5 z-10">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 border ${
                    step === 3 
                      ? 'bg-primary border-primary text-primary-foreground shadow-sm' 
                      : 'bg-background border-border text-muted-foreground'
                  }`}
                >
                  ٣
                </div>
                <span className={`text-xs font-semibold ${step === 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                  المطابقة والبيانات المالية
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {step === 1 ? (
          /* الخطوة الأولى: اختيار نوع ومسار طلب الصرف */
          <div className="space-y-6">
            <Card className="border-border/60 shadow-sm rounded-xl overflow-hidden bg-white dark:bg-slate-900">
              <CardHeader className="bg-muted/30 border-b border-border/40 py-4 text-right">
                <CardTitle className="flex items-center gap-2 text-foreground text-base font-bold">
                  <Layers className="h-4.5 w-4.5 text-primary" />
                  الخطوة 1: اختيار نوع ومسار طلب الصرف
                </CardTitle>
                <CardDescription className="text-right text-xs text-muted-foreground">حدد مسار طلب الصرف المناسب للمتابعة إلى اختيار المشروع والتقرير</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6 text-right">
                <div className="space-y-3 pb-2 border-b border-border/40">
                  <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-primary" />
                    نوع طلب الصرف *
                  </Label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* 1. طلب صرف مرتبط بتقرير انجاز معتمد */}
                    {canCreateStandard && (
                      <button
                        type="button"
                        onClick={() => handleCategoryChange("approved_report")}
                        className={`flex items-start gap-3 p-3.5 rounded-xl border text-right transition-all duration-200 cursor-pointer relative overflow-hidden group ${
                          activeCategory === "approved_report"
                            ? "bg-teal-50/80 dark:bg-teal-950/30 border-teal-500/80 dark:border-teal-500/60 shadow-xs ring-2 ring-teal-500/20"
                            : "bg-background border-border hover:border-teal-300 dark:hover:border-teal-800 hover:bg-slate-50/60 dark:hover:bg-slate-900/60"
                        }`}
                      >
                        <div className={`p-2.5 rounded-lg shrink-0 transition-colors ${
                          activeCategory === "approved_report"
                            ? "bg-teal-600 text-white"
                            : "bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-400 group-hover:bg-teal-200"
                        }`}>
                          <FileCheck className="w-5 h-5" />
                        </div>
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className={`text-xs sm:text-sm font-bold block ${activeCategory === "approved_report" ? "text-teal-900 dark:text-teal-200" : "text-foreground"}`}>
                              طلب صرف مرتبط بتقرير انجاز معتمد
                            </span>
                            {activeCategory === "approved_report" && (
                              <span className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse shrink-0" />
                            )}
                          </div>
                          <p className={`text-[11px] leading-relaxed ${activeCategory === "approved_report" ? "text-teal-750 dark:text-teal-300" : "text-muted-foreground"}`}>
                            ربط طلب الصرف بتقرير إنجاز مشروع معتمد ودفعات العقد
                          </p>
                        </div>
                      </button>
                    )}

                    {/* 2. المشروع المرتبط (فرصة التبرع) */}
                    {canCreateDonationDisbursement && (
                      <button
                        type="button"
                        onClick={() => handleCategoryChange("donation_opportunity")}
                        className={`flex items-start gap-3 p-3.5 rounded-xl border text-right transition-all duration-200 cursor-pointer relative overflow-hidden group ${
                          activeCategory === "donation_opportunity"
                            ? "bg-pink-50/80 dark:bg-pink-950/30 border-pink-500/80 dark:border-pink-500/60 shadow-xs ring-2 ring-pink-500/20"
                            : "bg-background border-border hover:border-pink-300 dark:hover:border-pink-800 hover:bg-slate-50/60 dark:hover:bg-slate-900/60"
                        }`}
                      >
                        <div className={`p-2.5 rounded-lg shrink-0 transition-colors ${
                          activeCategory === "donation_opportunity"
                            ? "bg-pink-600 text-white"
                            : "bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-400 group-hover:bg-pink-200"
                        }`}>
                          <HeartHandshake className="w-5 h-5" />
                        </div>
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className={`text-xs sm:text-sm font-bold block ${activeCategory === "donation_opportunity" ? "text-pink-900 dark:text-pink-200" : "text-foreground"}`}>
                              المشروع المرتبط (فرصة التبرع)
                            </span>
                            {activeCategory === "donation_opportunity" && (
                              <span className="w-2.5 h-2.5 rounded-full bg-pink-600 animate-pulse shrink-0" />
                            )}
                          </div>
                          <p className={`text-[11px] leading-relaxed ${activeCategory === "donation_opportunity" ? "text-pink-750 dark:text-pink-300" : "text-muted-foreground"}`}>
                            ربط طلب الصرف بفرصة تبرع معتمدة ومسجلة
                          </p>
                        </div>
                      </button>
                    )}

                    {/* 3. مرتبط بالمنصة السابقة */}
                    <button
                      type="button"
                      onClick={() => handleCategoryChange("tamam_platform")}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border text-right transition-all duration-200 cursor-pointer relative overflow-hidden group ${
                        activeCategory === "tamam_platform"
                          ? "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-500/80 dark:border-emerald-500/60 shadow-xs ring-2 ring-emerald-500/20"
                          : "bg-background border-border hover:border-emerald-300 dark:hover:border-emerald-800 hover:bg-slate-50/60 dark:hover:bg-slate-900/60"
                      }`}
                    >
                      <div className={`p-2.5 rounded-lg shrink-0 transition-colors ${
                        activeCategory === "tamam_platform"
                          ? "bg-emerald-600 text-white"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 group-hover:bg-emerald-200"
                      }`}>
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs sm:text-sm font-bold block ${activeCategory === "tamam_platform" ? "text-emerald-900 dark:text-emerald-200" : "text-foreground"}`}>
                            مرتبط بالمنصة السابقة
                          </span>
                          {activeCategory === "tamam_platform" && (
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse shrink-0" />
                          )}
                        </div>
                        <p className={`text-[11px] leading-relaxed ${activeCategory === "tamam_platform" ? "text-emerald-750 dark:text-emerald-300" : "text-muted-foreground"}`}>
                          طلب صرف مرتبط بسجلات المنصة السابقة
                        </p>
                      </div>
                    </button>

                    {/* 4. طلب صرف مخصص */}
                    {canCreateCustom && (
                      <button
                        type="button"
                        onClick={() => handleCategoryChange("custom")}
                        className={`flex items-start gap-3 p-3.5 rounded-xl border text-right transition-all duration-200 cursor-pointer relative overflow-hidden group ${
                          activeCategory === "custom"
                            ? "bg-indigo-50/80 dark:bg-indigo-950/30 border-indigo-500/80 dark:border-indigo-500/60 shadow-xs ring-2 ring-indigo-500/20"
                            : "bg-background border-border hover:border-indigo-300 dark:hover:border-indigo-800 hover:bg-slate-50/60 dark:hover:bg-slate-900/60"
                        }`}
                      >
                        <div className={`p-2.5 rounded-lg shrink-0 transition-colors ${
                          activeCategory === "custom"
                            ? "bg-indigo-600 text-white"
                            : "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 group-hover:bg-indigo-200"
                        }`}>
                          <Receipt className="w-5 h-5" />
                        </div>
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className={`text-xs sm:text-sm font-bold block ${activeCategory === "custom" ? "text-indigo-900 dark:text-indigo-200" : "text-foreground"}`}>
                              طلب صرف مخصص
                            </span>
                            {activeCategory === "custom" && (
                              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse shrink-0" />
                            )}
                          </div>
                          <p className={`text-[11px] leading-relaxed ${activeCategory === "custom" ? "text-indigo-750 dark:text-indigo-300" : "text-muted-foreground"}`}>
                            سداد مورد لمرة واحدة، فواتير سداد، أو مصروفات منوعة
                          </p>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t border-border/40 pt-4 flex justify-end gap-2">
                <Button
                  onClick={() => setStep(2)}
                  className="gradient-primary text-white font-bold px-6 h-11 rounded-xl shadow-sm flex items-center gap-2"
                >
                  <span>التالي</span>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </div>
        ) : step === 2 ? (
          /* الخطوة الثانية: اختيار المشروع وتقرير الإنجاز */
          <div className="space-y-6">
            <Card className="border-border/60 shadow-sm rounded-xl overflow-hidden bg-white dark:bg-slate-900">
              <CardHeader className="bg-muted/30 border-b border-border/40 py-4 text-right">
                <CardTitle className="flex items-center gap-2 text-foreground text-base font-bold">
                  <FileText className="h-4.5 w-4.5 text-primary" />
                  الخطوة 2: اختيار المشروع والتقرير المرتبط
                </CardTitle>
                <CardDescription className="text-right text-xs text-muted-foreground">تحديد المشروع الرئيسي والتمويل والمشروع المخصص أو تقارير الإنجاز المرتبطة</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6 text-right">

                {/* 1. نوع طلب الصرف المخصص (إذا كان المسار هو طلب صرف مخصص) */}
                {activeCategory === "custom" && (
                  <div className="space-y-2 text-right pb-4 border-b border-border/40 animate-in slide-in-from-top-2 duration-200">
                    <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">نوع طلب الصرف المخصص *</Label>
                    <Select
                      value={requestType}
                      onValueChange={handleRequestTypeChange}
                    >
                      <SelectTrigger className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background w-full" dir="rtl">
                        <SelectValue placeholder="اختر نوع طلب الصرف المخصص" />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        <SelectItem value="supplier_one_time" className="text-right">سداد مورد لمرة واحدة بفاتورة</SelectItem>
                        <SelectItem value="sadad_invoice" className="text-right">فواتير نظام سداد</SelectItem>
                        <SelectItem value="misc_expenses" className="text-right">مصروفات منوعة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* 2. فرصة التبرع (إذا كان المسار هو فرصة التبرع) */}
                {activeCategory === "donation_opportunity" && (
                  <div className="space-y-2 text-right pb-4 border-b border-border/40 animate-in slide-in-from-top-2 duration-200">
                    <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">المشروع المرتبط (فرصة التبرع) *</Label>
                    <Select
                      value={formData.donationOpportunityId.toString()}
                      onValueChange={(value) => {
                        const oppId = parseInt(value);
                        const selectedOpp = donationOpportunities?.find((o: any) => o.id === oppId);
                        const parsedAmount = selectedOpp ? parseFloat(selectedOpp.targetAmount) : 0;
                        setFormData({ 
                          ...formData, 
                          donationOpportunityId: oppId,
                          mosqueRequestId: selectedOpp ? (selectedOpp.requestId ?? 0) : 0,
                          projectId: 0,
                          contractId: 0,
                          amount: parsedAmount || formData.amount,
                          customProjectName: selectedOpp ? selectedOpp.title : formData.customProjectName
                        });
                        setSelectedReportId(null);
                      }}
                    >
                      <SelectTrigger className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background w-full text-xs sm:text-sm" dir="rtl">
                        <SelectValue placeholder="اختر فرصة التبرع للربط بها" />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        {donationOpportunities?.map((opp: any) => (
                          <SelectItem key={opp.id} value={opp.id.toString()} className="text-right">
                            {opp.title} - {opp.requestNumber}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

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
                        setFormData({ ...formData, projectId: parseInt(value), contractId: 0, fundingSourceName: "" });
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

                {/* اختيار جهة الدعم المصروف منها أو تنبيه منع الإكمال عند عدم وجود داعم */}
                {formData.projectId > 0 && (
                  <div className="space-y-3 text-right animate-in fade-in duration-200">
                    {supportSources.length > 0 ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">
                            جهة الدعم المصروف منها *
                          </Label>
                          {supportSources.length > 1 && (
                            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 font-bold">
                              {supportSources.length} داعمين للمشروع (يلزم التحديد)
                            </Badge>
                          )}
                        </div>
                        <Select
                          value={formData.fundingSourceName || ""}
                          onValueChange={(value) => setFormData({ ...formData, fundingSourceName: value })}
                        >
                          <SelectTrigger className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background w-full font-medium" dir="rtl">
                            <SelectValue placeholder="اختر جهة الدعم المصروف منها..." />
                          </SelectTrigger>
                          <SelectContent dir="rtl">
                            {supportSources.map((src, idx) => (
                              <SelectItem key={idx} value={src.entity} className="text-right font-medium">
                                {src.entity}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {supportSources.length > 1 && (
                          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                            <div>
                              <p className="font-bold">تنبيه: هذا المشروع يمتلك أكثر من جهة دعم ({supportSources.length} داعمين)</p>
                              <p className="mt-0.5 text-[11px] text-amber-700 dark:text-amber-400">يجب تحديد جهة الدعم المحددة المراد خصم مبلغ طلب الصرف من حسابها/ميزانيتها.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* تنبيه لطيف وهادئ الألوان يوضح عدم وجود أي داعم مسجل للمشروع */
                      <div className="p-4 rounded-xl border border-rose-200/80 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20 text-right space-y-3 shadow-2xs animate-in fade-in duration-200">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-rose-100/60 dark:bg-rose-950/50 border border-rose-200/60 dark:border-rose-800/40 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-4.5 h-4.5 text-rose-600 dark:text-rose-400" />
                          </div>
                          <div className="space-y-1 text-right">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                              لا يمكن إكمال طلب الصرف لهذا المشروع
                            </h4>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                              عذراً، هذا المشروع لا يمتلك أي جهة دعم مسجلة في بياناته المالية. يرجى إكمال باقي البيانات المالية وجهات الدعم في صفحة المشروع أولاً حتى تتمكن من إنشاء طلب الصرف.
                            </p>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-rose-200/60 dark:border-rose-900/30 flex justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => navigate(`/projects/${formData.projectId}`)}
                            className="border-rose-300 text-rose-700 bg-white hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:bg-slate-900 dark:hover:bg-rose-950/40 font-bold text-xs h-9 px-4 rounded-xl shadow-2xs flex items-center gap-1.5"
                          >
                            <Building2 className="w-3.5 h-3.5" />
                            الانتقال لصفحة المشروع لإكمال البيانات
                          </Button>
                        </div>
                      </div>
                    )}
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
                          <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">عنوان المشروع *</Label>
                          <Select
                            value={formData.projectCity}
                            onValueChange={(value) => setFormData({ ...formData, projectCity: value, customCity: value === "other" ? "" : value })}
                          >
                            <SelectTrigger className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background w-full" dir="rtl">
                              <SelectValue placeholder="اختر عنوان المشروع (المدينة)" />
                            </SelectTrigger>
                            <SelectContent dir="rtl">
                              {citiesData?.values?.map((city: any) => (
                                <SelectItem key={city.id} value={city.valueAr} className="text-right">
                                  {city.valueAr}
                                </SelectItem>
                              ))}
                              <SelectItem value="other" className="text-right text-primary font-bold">أخرى (إدخال يدوي)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {formData.projectCity === "other" && (
                          <div className="space-y-2 text-right animate-in slide-in-from-top-2 duration-200">
                            <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">عنوان المشروع (كتابة يدوي) *</Label>
                            <Input
                              value={formData.customCity}
                              onChange={(e) => setFormData({ ...formData, customCity: e.target.value })}
                              placeholder="أدخل اسم المدينة"
                              required
                              className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background"
                            />
                          </div>
                        )}

                        <div className="space-y-2 text-right">
                          <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">وصف الأعمال المطلوبة *</Label>
                          <Textarea
                            value={formData.requiredWorksDesc}
                            onChange={(e) => setFormData({ ...formData, requiredWorksDesc: e.target.value })}
                            placeholder="أدخل وصف الأعمال المطلوبة"
                            rows={3}
                            required
                            className="text-right border-border focus:ring-primary rounded-xl text-xs leading-relaxed bg-background"
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

                        {isTamamLinked ? (
                          <>
                            <div className="space-y-2 text-right">
                              <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">قيمة المشروع الفعلية *</Label>
                              <Input
                                type="number"
                                value={formData.actualProjectValue || ""}
                                onChange={(e) => setFormData({ ...formData, actualProjectValue: parseFloat(e.target.value) || 0 })}
                                placeholder="0.00"
                                required
                                className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background"
                              />
                            </div>

                            <div className="space-y-2 text-right">
                              <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">قيمة الأجور الإدارية *</Label>
                              <Input
                                type="number"
                                value={formData.adminFees || ""}
                                onChange={(e) => setFormData({ ...formData, adminFees: parseFloat(e.target.value) || 0 })}
                                placeholder="0.00"
                                required
                                className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background"
                              />
                            </div>

                            <div className="space-y-2 text-right">
                              <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">المبالغ التي صرفت *</Label>
                              <Input
                                type="number"
                                value={formData.amountsSpent || ""}
                                onChange={(e) => setFormData({ ...formData, amountsSpent: parseFloat(e.target.value) || 0 })}
                                placeholder="0.00"
                                required
                                className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background"
                              />
                            </div>

                            <div className="space-y-2 text-right">
                              <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">المبلغ المطلوب صرفه *</Label>
                              <Input
                                type="number"
                                value={formData.amount || ""}
                                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                                placeholder="0.00"
                                required
                                className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background font-bold text-primary"
                              />
                            </div>
                          </>
                        ) : (
                          <>
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

                            <div className="space-y-2 text-right">
                              <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">الأجور الإدارية *</Label>
                              <Input
                                type="number"
                                value={formData.adminFees || ""}
                                onChange={(e) => setFormData({ ...formData, adminFees: parseFloat(e.target.value) || 0 })}
                                placeholder="0.00"
                                required
                                className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background"
                              />
                            </div>
                          </>
                        )}
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
                          <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">عنوان المشروع *</Label>
                          <Select
                            value={formData.projectCity}
                            onValueChange={(value) => setFormData({ ...formData, projectCity: value, customCity: value === "other" ? "" : value })}
                          >
                            <SelectTrigger className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background w-full" dir="rtl">
                              <SelectValue placeholder="اختر عنوان المشروع (المدينة)" />
                            </SelectTrigger>
                            <SelectContent dir="rtl">
                              {citiesData?.values?.map((city: any) => (
                                <SelectItem key={city.id} value={city.valueAr} className="text-right">
                                  {city.valueAr}
                                </SelectItem>
                              ))}
                              <SelectItem value="other" className="text-right text-primary font-bold">أخرى (إدخال يدوي)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {formData.projectCity === "other" && (
                          <div className="space-y-2 text-right animate-in slide-in-from-top-2 duration-200">
                            <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">عنوان المشروع (كتابة يدوي) *</Label>
                            <Input
                              value={formData.customCity}
                              onChange={(e) => setFormData({ ...formData, customCity: e.target.value })}
                              placeholder="أدخل اسم المدينة"
                              required
                              className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background"
                            />
                          </div>
                        )}

                        <div className="space-y-2 text-right">
                          <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">وصف الأعمال المطلوبة *</Label>
                          <Textarea
                            value={formData.requiredWorksDesc}
                            onChange={(e) => setFormData({ ...formData, requiredWorksDesc: e.target.value })}
                            placeholder="أدخل وصف الأعمال المطلوبة"
                            rows={3}
                            required
                            className="text-right border-border focus:ring-primary rounded-xl text-xs leading-relaxed bg-background"
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

                        <div className="space-y-2 text-right">
                          <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">الأجور الإدارية *</Label>
                          <Input
                            type="number"
                            value={formData.adminFees || ""}
                            onChange={(e) => setFormData({ ...formData, adminFees: parseFloat(e.target.value) || 0 })}
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
              <CardFooter className="border-t border-border/40 pt-4 flex justify-between items-center">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="font-bold px-5 h-11 rounded-xl flex items-center gap-2"
                >
                  <ArrowRight className="h-4 w-4" />
                  <span>السابق</span>
                </Button>
                <Button
                  onClick={handleStep2Next}
                  disabled={isStep2NextDisabled()}
                  className="gradient-primary text-white font-bold px-6 h-11 rounded-xl shadow-sm flex items-center gap-2"
                >
                  <span>التالي</span>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </div>
        ) : (
          /* الخطوة الثالثة: البيانات المالية وتحديد مبالغ الموردين */
          <div className="space-y-6">
            {/* البيانات المالية الأساسية */}
            <Card className="border-border/60 shadow-sm rounded-xl overflow-hidden bg-white dark:bg-slate-900">
              <CardHeader className="bg-muted/30 border-b border-border/40 py-4 text-right">
                <CardTitle className="flex items-center gap-2 text-foreground text-base font-bold">
                  <Coins className="h-4.5 w-4.5 text-primary" />
                  الخطوة 3: المطابقة والبيانات المالية
                </CardTitle>
                <CardDescription className="text-right text-xs">راجع تفاصيل المبالغ المحددة وحدد الدفعة الفعلية ومطابقة الموردين</CardDescription>
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

                {formData.fundingSourceName && (
                  <div className="space-y-2 text-right">
                    <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">جهة الدعم المصروف منها *</Label>
                    <Input
                      value={formData.fundingSourceName}
                      readOnly
                      required
                      className="text-right border-border focus:ring-0 rounded-xl h-10 font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50/30 dark:bg-emerald-950/20 cursor-default"
                    />
                  </div>
                )}
                
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

                <div className="p-3 sm:p-4 rounded-xl bg-primary/[0.03] border border-primary/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] text-primary block font-black">إجمالي الدفعة الفعلية التي سوف تصرف</span>
                    <span className="text-xl sm:text-2xl font-black text-primary">
                      {totalAmount.toLocaleString()} <span className="text-xs font-semibold">ريال سعودي</span>
                    </span>
                  </div>
                  
                  {formData.adminFees > 0 && (
                    <div className="text-xs text-left">
                      <span className="text-muted-foreground block text-[9px]">الأجور الإدارية</span>
                      <span className="font-bold text-foreground">{(formData.adminFees || 0).toLocaleString()} ريال</span>
                    </div>
                  )}

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
                onClick={() => setStep(2)}
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



      {/* Modal التحقق والتنبيه الذكي عند عدم كفاية مدفوعات الداعم المقبوضة فعلياً */}
      <Dialog open={showSupporterDeficitDialog} onOpenChange={setShowSupporterDeficitDialog}>
        <DialogContent className="dir-rtl text-right max-w-lg rounded-2xl p-6 overflow-hidden border border-amber-200/80 dark:border-amber-900/60 shadow-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" dir="rtl">
          {/* Header Title */}
          <div className="flex items-start gap-3.5 pb-4 border-b border-slate-100 dark:border-slate-800 pr-1 pl-8">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center shrink-0 mt-0.5">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="space-y-1 text-right">
              <DialogTitle className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
                المبلغ المراد صرفه غير متوافق مع المدفوعات المتاحة من الداعم
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                تبيّن من التدقيق المالي أن إجمالي المقبوض فعلياً من الداعم <span className="font-bold text-emerald-700 dark:text-emerald-300">({formData.fundingSourceName || supportSources[0]?.entity || "جهة الدعم المعتمدة"})</span> أقل من المبلغ المطلوب صرفه حالياً.
              </DialogDescription>
            </div>
          </div>

          <div className="space-y-4 py-4 text-xs text-right">
            {/* Financial Breakdown Card */}
            <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200/60 dark:border-amber-900/40 space-y-2.5">
              <div className="flex justify-between items-center text-xs sm:text-sm font-semibold border-b border-amber-200/50 dark:border-amber-900/40 pb-2">
                <span className="text-slate-700 dark:text-slate-300">جهة الدعم المصروف منها:</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400 text-xs sm:text-sm">
                  {formData.fundingSourceName || supportSources[0]?.entity || (projectDetails as any)?.supportingEntity || "غير محدد"}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs sm:text-sm font-semibold border-b border-amber-200/50 dark:border-amber-900/40 pb-2">
                <span className="text-slate-700 dark:text-slate-300">المبلغ المراد صرفه:</span>
                <span className="font-bold text-blue-800 dark:text-blue-400 text-sm sm:text-base">
                  {currentDisbursementAmount.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ريال
                </span>
              </div>

              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-slate-600 dark:text-slate-400">إجمالي ما دفعه الداعم فعلياً (سندات القبض):</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                  {totalSupporterPayments.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ريال
                </span>
              </div>

              <div className="flex justify-between items-center border-t border-amber-200/50 dark:border-amber-900/40 pt-2 font-bold text-xs sm:text-sm">
                <span className="text-amber-950 dark:text-amber-300">مبلغ العجز المطلوب تغطيته:</span>
                <span className="font-black text-rose-700 dark:text-rose-400 text-sm sm:text-base">
                  {funderDeficit.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ريال
                </span>
              </div>
            </div>

            {/* Amber Warning Box (مربع التنبيه الأصلي ذو الإطار البرتقالي) */}
            <div className="p-4 bg-amber-50/90 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/80 rounded-xl space-y-1.5 text-right shadow-xs">
              <p className="font-bold text-amber-950 dark:text-amber-300 text-xs flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                تنبيه مالي: المبلغ المراد صرفه ({currentDisbursementAmount.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ريال) أكبر من إجمالي ما دفعه الداعم فعلياً ({totalSupporterPayments.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ريال)
              </p>
              <p className="text-[11px] text-amber-900 dark:text-amber-200/90 leading-relaxed font-normal pt-0.5">
                المبلغ المراد صرفه غير متوافق مع المدفوعات المتاحة من الداعم لهذا المشروع (عجز بمقدار {funderDeficit.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ريال). عند الإرسال، يمكنك تغطية المتبقي والصرف من الحساب العام للجمعية أو التراجع عن الطلب.
              </p>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row-reverse items-center justify-between gap-2.5">
            <Button
              type="button"
              onClick={() => {
                setDisburseFromGeneralAccount(true);
                setShowSupporterDeficitDialog(false);
                if (step === 2) {
                  setStep(3);
                } else {
                  executeDisbursementSubmit(true);
                }
              }}
              className="w-full sm:w-auto font-bold text-xs bg-amber-600 hover:bg-amber-700 text-white gap-2 h-10 px-4 rounded-xl shadow-xs"
            >
              <Coins className="h-4 w-4" />
              الاستمرار والصرف من الحساب العام للجمعية
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowSupporterDeficitDialog(false)}
              className="w-full sm:w-auto text-xs font-semibold h-10 rounded-xl border-slate-200 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              التراجع عن الطلب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
