import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { numberToArabicText as baseNumberToArabicText } from "@shared/tafqeet";
import {
  Coins,
  Receipt,
  FolderKanban,
  Check,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Building2,
  Layers,
  FileCheck,
  Loader2,
  AlertCircle,
  FileText,
  Calendar,
  CreditCard,
  UserCheck,
  Sparkles,
  Info,
  DollarSign,
  Briefcase,
  PenLine,
  HeartHandshake,
} from "lucide-react";
import { toast } from "sonner";

function numberToArabicText(num: number): string {
  return baseNumberToArabicText(num, { prefix: "", suffix: " فقط لا غير", currency: "ريال سعودي" });
}

export default function NewReceiptVoucherPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const userPermissions: string[] = (user as any)?.permissions ?? [];
  const isAdmin = ["super_admin", "system_admin"].includes(user?.role || "") || userPermissions.includes("*");
  const canCreate = isAdmin || userPermissions.includes("receipt_vouchers.edit") || userPermissions.includes("receipt_vouchers");

  // Step state
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [category, setCategory] = useState<"project_linked" | "restricted" | "unrestricted">("project_linked");

  // Form Fields
  const urlParams = new URLSearchParams(window.location.search);
  const initialProjectId = urlParams.get("projectId") || "";
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId);
  const [honorificTitle, setHonorificTitle] = useState<string>("السادة");
  const [payerName, setPayerName] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [receiptDate, setReceiptDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState<string>("");
  const [bankName, setBankName] = useState<string>("مصرف الراجحي");

  // Restricted donation purpose (مصارف التبرعات)
  const [donationPurpose, setDonationPurpose] = useState<string>("");

  // Unrestricted / Restricted custom payer helpers
  const [unrestrictedPayerSelect, setUnrestrictedPayerSelect] = useState<string>("__custom__");
  const [unrestrictedCustomPayer, setUnrestrictedCustomPayer] = useState<string>("");

  // Projects list
  const { data: rawProjectsData, isLoading: isLoadingProjects } = trpc.projects.getAll.useQuery({
    limit: 200,
  });
  const projectsList: any[] = Array.isArray(rawProjectsData) ? rawProjectsData : (rawProjectsData as any)?.projects || [];

  // Categories for Funding / Support (التمويل / الدعم) from /categories
  const { data: fundingSupportData } = trpc.categories.getCategoryByType.useQuery({ type: "funding_support" });
  const fundingSupportCategories: string[] = (fundingSupportData?.values || []).map((v: any) => v.valueAr || v.value).filter(Boolean);

  // Categories for Donation Purposes (مصارف التبرعات) from /categories
  const { data: donationPurposesData } = trpc.categories.getCategoryByType.useQuery({ type: "donation_purposes" });
  const donationPurposes: string[] = useMemo(() => {
    return (donationPurposesData?.values || []).map((v: any) => v.valueAr || v.value).filter(Boolean);
  }, [donationPurposesData]);

  // Set default donation purpose when categories load
  useEffect(() => {
    if (donationPurposes.length > 0) {
      if (!donationPurpose || !donationPurposes.includes(donationPurpose)) {
        setDonationPurpose(donationPurposes[0]);
      }
    } else {
      setDonationPurpose("");
    }
  }, [donationPurposes]);

  // Project financial details
  const activeProjectId = parseInt(selectedProjectId) || 0;
  const { data: projectFinancialData } = trpc.projects.getFinancialData.useQuery(
    { projectId: activeProjectId },
    { enabled: activeProjectId > 0 }
  );

  // Extract supporters for project_linked
  const supporterDetailsList: Array<{ name: string; amount: number }> = [];
  const projectSupporters: string[] = [];

  if (projectFinancialData?.financialDetail) {
    if (projectFinancialData.financialDetail.supportSourcesJson) {
      try {
        const parsed = JSON.parse(projectFinancialData.financialDetail.supportSourcesJson);
        if (Array.isArray(parsed)) {
          parsed.forEach((item: any) => {
            let name = item.entity === "اخرى" ? item.customEntity : item.entity;
            if (name && name.trim()) {
              name = name.replace(/^(السيد|السيدة|السادة)\s*\/\s*/, "").trim();
              const isGenAcc = name.includes("الحساب العام");
              const supAmount = parseFloat((item.amount || "0").toString());
              if (name && !isGenAcc && !projectSupporters.includes(name)) {
                projectSupporters.push(name);
                supporterDetailsList.push({ name, amount: supAmount });
              }
            }
          });
        }
      } catch (e) {
        // ignore
      }
    }
    if (projectSupporters.length === 0 && projectFinancialData.financialDetail.supportEntity) {
      const cleanEntity = projectFinancialData.financialDetail.supportEntity.replace(/^(السيد|السيدة|السادة)\s*\/\s*/, "").trim();
      const isGenAcc = cleanEntity.includes("الحساب العام");
      const supAmount = parseFloat((projectFinancialData.financialDetail.supportAmount || "0").toString());
      if (cleanEntity && !isGenAcc) {
        projectSupporters.push(cleanEntity);
        supporterDetailsList.push({ name: cleanEntity, amount: supAmount });
      }
    }
  }

  // Selected supporter & financial stats
  const selectedSupporterCleanName = payerName.replace(/^(السيد|السيدة|السادة)\s*\/\s*/, "").trim();
  const matchedSupporterItem = supporterDetailsList.find(s => s.name === selectedSupporterCleanName);
  const finDetail = (projectFinancialData as any)?.financialDetail;
  const projectApprovedBudget = parseFloat(((finDetail?.supportAmount || finDetail?.approvedCost || finDetail?.estimatedCost) || "0").toString());

  const supporterCommittedAmount = matchedSupporterItem 
    ? matchedSupporterItem.amount 
    : (supporterDetailsList.length === 1 ? supporterDetailsList[0].amount : projectApprovedBudget);

  const projectVouchersList: any[] = (projectFinancialData as any)?.receiptVouchers || (projectFinancialData as any)?.vouchers || [];
  const validProjectVouchers = projectVouchersList.filter((v: any) => v.status === "approved" || v.status === "pending_approval");

  const previouslyPaidBySupporter = validProjectVouchers
    .filter((v: any) => {
      if (!selectedSupporterCleanName) return true;
      const cleanPayerInVoucher = (v.payerName || "").replace(/^(السيد|السيدة|السادة)\s*\/\s*/, "").trim();
      return cleanPayerInVoucher.includes(selectedSupporterCleanName) || selectedSupporterCleanName.includes(cleanPayerInVoucher);
    })
    .reduce((sum: number, v: any) => sum + parseFloat((v.amount || "0").toString()), 0);

  const remainingUnpaidForSupporter = Math.max(0, supporterCommittedAmount - previouslyPaidBySupporter);

  // Auto-select first supporter when project changes in project_linked mode
  useEffect(() => {
    if (category === "project_linked") {
      if (projectSupporters.length > 0) {
        if (!payerName || !projectSupporters.includes(payerName)) {
          setPayerName(projectSupporters[0]);
        }
      } else {
        setPayerName("");
      }
    } else if (category === "unrestricted" || category === "restricted") {
      if (!["السادة", "السيد", "السيدة"].includes(honorificTitle)) {
        setHonorificTitle("السادة");
      }
    }
  }, [selectedProjectId, projectSupporters.length, category]);

  // Selected project object
  const selectedProject = projectsList.find(p => p.id.toString() === selectedProjectId);

  // Create mutation
  const utils = trpc.useUtils();
  const createVoucherMutation = trpc.projects.createReceiptVoucher.useMutation({
    onSuccess: () => {
      toast.success("تم تسجيل سند القبض بنجاح وتوجيهه للاعتماد المالي");
      utils.projects.getAllReceiptVouchers.invalidate();
      navigate("/receipt-vouchers");
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء تسجيل سند القبض");
    },
  });

  const handleStep1Next = () => {
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStep2Next = () => {
    if (category === "project_linked") {
      if (!selectedProjectId) {
        toast.error("يرجى اختيار المشروع أولاً");
        return;
      }
      if (projectSupporters.length === 0) {
        toast.error("لم يتم العثور على جهات داعمة مسجلة في البيانات المالية للمشروع المختار");
        return;
      }
      if (!payerName.trim()) {
        toast.error("يرجى تحديد اسم الجهة الداعمة / المسدد");
        return;
      }
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        toast.error("يرجى إدخال مبلغ صحيح أكبر من 0");
        return;
      }
      if (remainingUnpaidForSupporter > 0 && numAmount > remainingUnpaidForSupporter) {
        toast.error(`المبلغ المدخل (${numAmount.toLocaleString()} ريال) يتجاوز المتبقي غير المسدد للداعم (${remainingUnpaidForSupporter.toLocaleString()} ريال)`);
        return;
      }
      if (!receiptDate) {
        toast.error("يرجى تحديد تاريخ القبض");
        return;
      }
      if (!notes.trim()) {
        toast.error("يرجى إدخال البيان أو سبب القبض");
        return;
      }
    } else if (category === "restricted" || category === "unrestricted") {
      if (category === "restricted" && !donationPurpose) {
        toast.error("يرجى تحديد مصرف التبرع");
        return;
      }
      const currentPayer = (unrestrictedPayerSelect === "__custom__" ? unrestrictedCustomPayer : unrestrictedPayerSelect).trim();
      if (!currentPayer) {
        toast.error("يرجى تحديد أو كتابة اسم الجهة الداعمة / المسدد");
        return;
      }
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        toast.error("يرجى إدخال مبلغ صحيح أكبر من 0");
        return;
      }
      if (!receiptDate) {
        toast.error("يرجى تحديد تاريخ القبض");
        return;
      }
      if (!notes.trim()) {
        toast.error("يرجى إدخال البيان أو سبب القبض");
        return;
      }
    }
    setStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFinalSubmit = () => {
    const finalPayerName = (category === "unrestricted" || category === "restricted") && unrestrictedPayerSelect === "__custom__"
      ? unrestrictedCustomPayer.trim()
      : payerName.trim();

    const fullPayerName = honorificTitle ? `${honorificTitle} / ${finalPayerName}` : finalPayerName;
    
    const finalNotes = category === "restricted"
      ? (notes.trim().startsWith("مصرف التبرع:") ? notes.trim() : `مصرف التبرع: ${donationPurpose} | ${notes.trim()}`)
      : notes.trim();

    createVoucherMutation.mutate({
      projectId: category === "project_linked" ? activeProjectId : null,
      amount: parseFloat(amount),
      receiptDate: receiptDate,
      payerName: fullPayerName,
      paymentMethod: "bank_transfer",
      bankName: bankName.trim(),
      notes: finalNotes,
    });
  };

  if (!canCreate) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 space-y-4 font-sans" dir="rtl">
          <div className="p-4 rounded-full bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-950/30 dark:border-rose-900">
            <AlertCircle className="h-10 w-10 text-rose-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">عذراً، ليس لديك صلاحية لتسجيل سند قبض جديد</h2>
          <p className="text-xs text-muted-foreground max-w-md">يرجى التواصل مع مسؤول النظام لمنحك صلاحية تسجيل وتعديل سندات القبض.</p>
          <Button onClick={() => navigate("/receipt-vouchers")} className="mt-2 gradient-primary text-white font-bold text-xs">
            العودة لسندات القبض
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 animate-fade-in pb-20 px-3 sm:px-4 md:px-0 font-sans" dir="rtl">
        {/* Header and Visual Step Timeline */}
        <div className="flex flex-col gap-6 border-b border-border/40 pb-6">
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => {
                  if (step > 1) {
                    setStep((prev) => (prev - 1) as any);
                  } else if (window.history.length > 1) {
                    window.history.back();
                  } else {
                    navigate("/receipt-vouchers");
                  }
                }} 
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-muted text-muted-foreground shrink-0"
              >
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <div className="text-right">
                <h1 className="text-lg sm:text-2xl font-bold text-foreground font-display">
                  تسجيل سند قبض جديد
                </h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground text-right font-medium mt-0.5 hidden sm:block">
                  توثيق وتسجيل سند قبض مالي للدفعات المقبوضة فعلياً من الجهات الداعمة للمشاريع
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
                style={{ width: step === 1 ? "0%" : step === 2 ? "50%" : "100%" }}
              />

              {/* Step 1 Node */}
              <div className="flex flex-col items-center gap-1.5 z-10">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 border ${
                    step >= 1 
                      ? "bg-primary border-primary text-primary-foreground shadow-sm" 
                      : "bg-background border-border text-muted-foreground"
                  }`}
                >
                  {step > 1 ? <Check className="w-4 h-4" /> : "١"}
                </div>
                <span className={`text-xs font-semibold ${step >= 1 ? "text-primary" : "text-muted-foreground"}`}>
                  نوع سند القبض
                </span>
              </div>

              {/* Step 2 Node */}
              <div className="flex flex-col items-center gap-1.5 z-10">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 border ${
                    step >= 2 
                      ? "bg-primary border-primary text-primary-foreground shadow-sm" 
                      : "bg-background border-border text-muted-foreground"
                  }`}
                >
                  {step > 2 ? <Check className="w-4 h-4" /> : "٢"}
                </div>
                <span className={`text-xs font-semibold ${step >= 2 ? "text-primary" : "text-muted-foreground"}`}>
                  بيانات السند والمشروع
                </span>
              </div>

              {/* Step 3 Node */}
              <div className="flex flex-col items-center gap-1.5 z-10">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 border ${
                    step === 3 
                      ? "bg-primary border-primary text-primary-foreground shadow-sm" 
                      : "bg-background border-border text-muted-foreground"
                  }`}
                >
                  ٣
                </div>
                <span className={`text-xs font-semibold ${step === 3 ? "text-primary" : "text-muted-foreground"}`}>
                  المطابقة والبيانات المالية
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── الخطوة 1: اختيار نوع وتصنيف سند القبض ── */}
        {step === 1 && (
          <div className="space-y-6">
            <Card className="border-border/60 shadow-sm rounded-xl overflow-hidden bg-white dark:bg-slate-900">
              <CardHeader className="bg-muted/30 border-b border-border/40 py-4 text-right">
                <CardTitle className="flex items-center gap-2 text-foreground text-base font-bold">
                  <Layers className="h-4.5 w-4.5 text-primary" />
                  الخطوة 1: اختيار نوع وتصنيف سند القبض
                </CardTitle>
                <CardDescription className="text-right text-xs text-muted-foreground">
                  حدد تصنيف سند القبض المناسب للمتابعة إلى إدخال البيانات المالية وتحديد الداعم
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6 text-right">
                <div className="space-y-3 pb-2 border-b border-border/40">
                  <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-primary" />
                    نوع سند القبض *
                  </Label>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    {/* 1. سند قبض مرتبط بمشروع موجود */}
                    <button
                      type="button"
                      onClick={() => setCategory("project_linked")}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border text-right transition-all duration-200 cursor-pointer relative overflow-hidden group ${
                        category === "project_linked"
                          ? "bg-teal-50/80 dark:bg-teal-950/30 border-teal-500/80 dark:border-teal-500/60 shadow-xs ring-2 ring-teal-500/20"
                          : "bg-background border-border hover:border-teal-300 dark:hover:border-teal-800 hover:bg-slate-50/60 dark:hover:bg-slate-900/60"
                      }`}
                    >
                      <div className={`p-2.5 rounded-lg shrink-0 transition-colors ${
                        category === "project_linked"
                          ? "bg-teal-600 text-white"
                          : "bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-400 group-hover:bg-teal-200"
                      }`}>
                        <FolderKanban className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1 flex items-center justify-between">
                        <span className={`text-xs sm:text-sm font-bold block ${category === "project_linked" ? "text-teal-900 dark:text-teal-200" : "text-foreground"}`}>
                          سند قبض مرتبط بمشروع موجود
                        </span>
                        {category === "project_linked" && (
                          <span className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse shrink-0 mr-2" />
                        )}
                      </div>
                    </button>

                    {/* 2. سند قبض مقيد */}
                    <button
                      type="button"
                      onClick={() => setCategory("restricted")}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border text-right transition-all duration-200 cursor-pointer relative overflow-hidden group ${
                        category === "restricted"
                          ? "bg-blue-50/80 dark:bg-blue-950/30 border-blue-500/80 dark:border-blue-500/60 shadow-xs ring-2 ring-blue-500/20"
                          : "bg-background border-border hover:border-blue-300 dark:hover:border-blue-800 hover:bg-slate-50/60 dark:hover:bg-slate-900/60"
                      }`}
                    >
                      <div className={`p-2.5 rounded-lg shrink-0 transition-colors ${
                        category === "restricted"
                          ? "bg-blue-600 text-white"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 group-hover:bg-blue-200"
                      }`}>
                        <FileCheck className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1 flex items-center justify-between">
                        <span className={`text-xs sm:text-sm font-bold block ${category === "restricted" ? "text-blue-900 dark:text-blue-200" : "text-foreground"}`}>
                          سند قبض مقيد
                        </span>
                        {category === "restricted" && (
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse shrink-0 mr-2" />
                        )}
                      </div>
                    </button>

                    {/* 3. سند قبض غير مقيد */}
                    <button
                      type="button"
                      onClick={() => setCategory("unrestricted")}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border text-right transition-all duration-200 cursor-pointer relative overflow-hidden group ${
                        category === "unrestricted"
                          ? "bg-amber-50/80 dark:bg-amber-950/30 border-amber-500/80 dark:border-amber-500/60 shadow-xs ring-2 ring-amber-500/20"
                          : "bg-background border-border hover:border-amber-300 dark:hover:border-amber-800 hover:bg-slate-50/60 dark:hover:bg-slate-900/60"
                      }`}
                    >
                      <div className={`p-2.5 rounded-lg shrink-0 transition-colors ${
                        category === "unrestricted"
                          ? "bg-amber-600 text-white"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 group-hover:bg-amber-200"
                      }`}>
                        <Coins className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1 flex items-center justify-between">
                        <span className={`text-xs sm:text-sm font-bold block ${category === "unrestricted" ? "text-amber-900 dark:text-amber-200" : "text-foreground"}`}>
                          سند قبض غير مقيد
                        </span>
                        {category === "unrestricted" && (
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-600 animate-pulse shrink-0 mr-2" />
                        )}
                      </div>
                    </button>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t border-border/40 pt-4 flex justify-end gap-2">
                <Button
                  onClick={handleStep1Next}
                  className="gradient-primary text-white font-bold px-6 h-11 rounded-xl shadow-sm flex items-center gap-2"
                >
                  <span>التالي</span>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}

        {/* ── الخطوة 2: بيانات سند القبض والمشروع ── */}
        {step === 2 && (
          <div className="space-y-6">
            {/* 1. في حال اختيار سند قبض مرتبط بمشروع */}
            {category === "project_linked" && (
              <Card className="border-border/60 shadow-sm rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                <CardHeader className="bg-muted/30 border-b border-border/40 py-4 text-right">
                  <CardTitle className="flex items-center gap-2 text-foreground text-base font-bold">
                    <FileText className="h-4.5 w-4.5 text-primary" />
                    الخطوة 2: بيانات سند القبض والمشروع المرتبط
                  </CardTitle>
                  <CardDescription className="text-right text-xs text-muted-foreground">
                    تحديد المشروع المسجل والداعم والمبالغ والبيانات المالية للسند
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6 text-right">
                  
                  {/* اختيار المشروع */}
                  <div className="space-y-2 text-right">
                    <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <FolderKanban className="w-4 h-4 text-primary" />
                      المشروع المرتبط بالسند *
                    </Label>
                    <Select
                      value={selectedProjectId}
                      onValueChange={(val) => {
                        setSelectedProjectId(val);
                        setAmount("");
                      }}
                    >
                      <SelectTrigger className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background w-full" dir="rtl">
                        <SelectValue placeholder="اختر المشروع المعتمد لجلب بياناته..." />
                      </SelectTrigger>
                      <SelectContent dir="rtl" className="max-h-72">
                        {projectsList.map((p) => (
                          <SelectItem key={p.id} value={p.id.toString()} className="text-right">
                            <span className="font-bold">{p.projectNumber || `#${p.id}`}</span> - {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground">اختر المشروع لجلب الموقف المالي والجهات الداعمة المسجلة تلقائياً</p>
                  </div>

                  {/* اختيار اللقب والجهة الداعمة / المسدد */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-border/40 pt-4">
                    <div className="col-span-1 space-y-2 text-right">
                      <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">اللقب / الصفة *</Label>
                      <Select value={honorificTitle} onValueChange={setHonorificTitle}>
                        <SelectTrigger className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background" dir="rtl">
                          <SelectValue placeholder="اللقب..." />
                        </SelectTrigger>
                        <SelectContent dir="rtl">
                          <SelectItem value="السادة" className="text-right">السادة</SelectItem>
                          <SelectItem value="السيد" className="text-right">السيد</SelectItem>
                          <SelectItem value="السيدة" className="text-right">السيدة</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-2 space-y-2 text-right">
                      <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">الجهة الداعمة / المسدد *</Label>
                      <Select
                        value={payerName}
                        onValueChange={(val) => setPayerName(val)}
                        disabled={projectSupporters.length === 0}
                      >
                        <SelectTrigger className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background w-full" dir="rtl">
                          <SelectValue placeholder={projectSupporters.length > 0 ? "اختر الداعم المسجل..." : "لا يوجد داعمين مسجلين للمشروع"} />
                        </SelectTrigger>
                        <SelectContent dir="rtl" className="max-h-60">
                          {projectSupporters.map((sup, idx) => (
                            <SelectItem key={idx} value={sup} className="text-right">
                              {sup}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* تنبيه عدم وجود داعمين مسجلين للمشروع */}
                  {activeProjectId > 0 && projectSupporters.length === 0 && (
                    <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-xl text-amber-900 flex items-start gap-3 shadow-2xs">
                      <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-1 text-right">
                        <p className="text-xs font-bold text-amber-900">
                          تنبيه: يجب تحديد الداعمين ومبلغ الدعم للمشروع أولاً لتتمكن من تسجيل سند القبض.
                        </p>
                        <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                          لم يتم تسجيل أي جهة داعمة لهذا المشروع في تفاصيله المالية. يرجى الانتقال إلى التفاصيل المالية الخاصة بالمشروع وتحديد الجهات الداعمة ومبالغ الدعم المخصصة أولاً.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 2. بطاقة الموقف المالي للداعم والمشروع */}
                  {activeProjectId > 0 && projectSupporters.length > 0 && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Coins className="h-4 w-4 text-emerald-600" />
                          <span>الموقف المالي للداعم والمشروع</span>
                        </span>
                        {selectedSupporterCleanName && (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold text-[11px]">
                            الداعم: {selectedSupporterCleanName}
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* المبلغ الملتزم به للداعم */}
                        <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                          <span className="text-[11px] text-muted-foreground font-semibold block">المبلغ الملتزم به للداعم</span>
                          <span className="text-base font-extrabold text-slate-900 dark:text-slate-100 block mt-0.5">
                            {supporterCommittedAmount.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}
                            <span className="text-[10px] font-normal text-muted-foreground mr-1">ريال</span>
                          </span>
                        </div>

                        {/* المبلغ الذي سدده الداعم سابقاً */}
                        <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-lg border border-emerald-200/80 dark:border-emerald-800 shadow-2xs">
                          <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold block">سدده الداعم سابقاً</span>
                          <span className="text-base font-extrabold text-emerald-700 dark:text-emerald-400 block mt-0.5">
                            {previouslyPaidBySupporter.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}
                            <span className="text-[10px] font-normal text-emerald-600 mr-1">ريال</span>
                          </span>
                        </div>

                        {/* المتبقي غير المسدد علي الداعم */}
                        <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 rounded-lg border border-amber-200/80 dark:border-amber-800 shadow-2xs">
                          <span className="text-[11px] text-amber-800 dark:text-amber-300 font-semibold block">المتبقي غير المسدد</span>
                          <span className={`text-base font-extrabold block mt-0.5 ${remainingUnpaidForSupporter <= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>
                            {remainingUnpaidForSupporter.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}
                            <span className="text-[10px] font-normal text-muted-foreground mr-1">ريال</span>
                          </span>
                        </div>
                      </div>

                      {/* تنبيه اكتمال السداد */}
                      {remainingUnpaidForSupporter <= 0 && supporterCommittedAmount > 0 && (
                        <div className="p-3 bg-emerald-50/90 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-900 dark:text-emerald-200 flex items-center gap-2 text-xs font-bold mt-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span>تم سداد كامل المبلغ الملتزم به من قبل هذا الداعم بنجاح ({supporterCommittedAmount.toLocaleString()} ريال).</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3. تفاصيل سند القبض: المبلغ والتاريخ والبيان */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border/40 pt-4">
                    {/* مبلغ الدفعة المقبوضة */}
                    <div className="space-y-2 text-right">
                      <div className="flex items-center justify-between">
                        <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">مبلغ الدفعة المقبوضة (ريال) *</Label>
                        {remainingUnpaidForSupporter > 0 && (
                          <button
                            type="button"
                            onClick={() => setAmount(remainingUnpaidForSupporter.toString())}
                            className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                          >
                            تعبئة المتبقي ({remainingUnpaidForSupporter.toLocaleString()} ريال)
                          </button>
                        )}
                      </div>
                      <Input
                        type="number"
                        min={0.01}
                        step={0.01}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="مثال: 50000"
                        disabled={remainingUnpaidForSupporter <= 0 && supporterCommittedAmount > 0}
                        className="text-left [direction:ltr] border-border focus:ring-primary rounded-xl h-11 font-bold text-emerald-800 dark:text-emerald-300 bg-background"
                      />
                    </div>

                    {/* تاريخ القبض */}
                    <div className="space-y-2 text-right">
                      <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">تاريخ القبض *</Label>
                      <Input
                        type="date"
                        value={receiptDate}
                        onChange={(e) => setReceiptDate(e.target.value)}
                        className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background"
                      />
                    </div>
                  </div>

                  {/* البيان / الملاحظات */}
                  <div className="space-y-2 text-right">
                    <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">وذلك مقابل (سبب المقبوض / البيان) *</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="أدخل البيان أو سبب القبض (مثال: دفعة دعم مشروع صيانة المسجد...)"
                      rows={3}
                      className="text-right border-border focus:ring-primary rounded-xl text-xs leading-relaxed bg-background"
                    />
                  </div>

                  {/* تفاصيل طريقة القبض والحساب البنكي */}
                  <div className="space-y-2 text-right">
                    <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">تفاصيل طريقة القبض والحساب البنكي</Label>
                    <Input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="مثال: مصرف الراجحي"
                      className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background font-medium"
                    />
                  </div>

                </CardContent>
                <CardFooter className="border-t border-border/40 pt-4 flex justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="border-border text-foreground font-bold px-6 h-11 rounded-xl shadow-xs flex items-center gap-2"
                  >
                    <ArrowRight className="h-4 w-4" />
                    <span>السابق</span>
                  </Button>
                  <Button
                    onClick={handleStep2Next}
                    disabled={!selectedProjectId || projectSupporters.length === 0 || !amount || parseFloat(amount) <= 0}
                    className="gradient-primary text-white font-bold px-6 h-11 rounded-xl shadow-sm flex items-center gap-2"
                  >
                    <span>التالي</span>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            )}

            {/* 2. في حال اختيار سند قبض مقيد */}
            {category === "restricted" && (
              <Card className="border-border/60 shadow-sm rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                <CardHeader className="bg-muted/30 border-b border-border/40 py-4 text-right">
                  <CardTitle className="flex items-center gap-2 text-foreground text-base font-bold">
                    <FileCheck className="h-4.5 w-4.5 text-blue-600" />
                    الخطوة 2: بيانات سند القبض المقيد
                  </CardTitle>
                  <CardDescription className="text-right text-xs text-muted-foreground">
                    تحديد مصرف التبرع والجهة الداعمة والمبالغ والبيانات المالية لسند القبض المقيد
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6 text-right">
                  
                  {/* 1. مصرف التبرع في البداية */}
                  <div className="space-y-2 text-right">
                    <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-primary" />
                      مصارف التبرعات *
                    </Label>
                    <Select 
                      value={donationPurpose} 
                      onValueChange={setDonationPurpose}
                      disabled={donationPurposes.length === 0}
                    >
                      <SelectTrigger className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background w-full" dir="rtl">
                        <SelectValue placeholder={donationPurposes.length > 0 ? "اختر مصرف التبرع..." : "لا توجد مصارف تبرعات مسجلة في التصنيفات"} />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        {donationPurposes.map((p, idx) => (
                          <SelectItem key={idx} value={p} className="text-right">
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 2. اختيار اللقب والجهة الداعمة / المسدد مع إمكانية كتابة جهة أخرى */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-border/40 pt-4">
                    <div className="col-span-1 space-y-2 text-right">
                      <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">اللقب / الصفة *</Label>
                      <Select value={honorificTitle} onValueChange={setHonorificTitle}>
                        <SelectTrigger className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background" dir="rtl">
                          <SelectValue placeholder="اللقب..." />
                        </SelectTrigger>
                        <SelectContent dir="rtl">
                          <SelectItem value="السادة" className="text-right">السادة</SelectItem>
                          <SelectItem value="السيد" className="text-right">السيد</SelectItem>
                          <SelectItem value="السيدة" className="text-right">السيدة</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-2 space-y-2 text-right">
                      <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">الجهة الداعمة / المسدد *</Label>
                      <Select
                        value={unrestrictedPayerSelect}
                        onValueChange={(val) => {
                          setUnrestrictedPayerSelect(val);
                          if (val !== "__custom__") {
                            setPayerName(val);
                          } else {
                            setPayerName(unrestrictedCustomPayer);
                          }
                        }}
                      >
                        <SelectTrigger className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background w-full" dir="rtl">
                          <SelectValue placeholder="اختر من تصنيفات التمويل والدعم أو أضف جهة أخرى..." />
                        </SelectTrigger>
                        <SelectContent dir="rtl" className="max-h-60">
                          <SelectItem value="__custom__" className="text-right font-bold text-primary">
                            ✍️ إضافة جهة أخرى / إدخال يدوي
                          </SelectItem>
                          {fundingSupportCategories.map((sup, idx) => (
                            <SelectItem key={idx} value={sup} className="text-right">
                              {sup}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* حقل إدخال اسم الجهة يدوياً عند اختيار أخرى */}
                  {unrestrictedPayerSelect === "__custom__" && (
                    <div className="space-y-2 text-right animate-in fade-in duration-200">
                      <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <PenLine className="w-4 h-4 text-primary" />
                        اسم الجهة الداعمة أو المتبرع *
                      </Label>
                      <Input
                        type="text"
                        value={unrestrictedCustomPayer}
                        onChange={(e) => {
                          setUnrestrictedCustomPayer(e.target.value);
                          setPayerName(e.target.value);
                        }}
                        placeholder="أدخل اسم الجهة الداعمة أو المتبرع..."
                        className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background font-medium"
                      />
                    </div>
                  )}

                  {/* تفاصيل سند القبض: المبلغ والتاريخ */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border/40 pt-4">
                    {/* مبلغ الدفعة المقبوضة */}
                    <div className="space-y-2 text-right">
                      <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">مبلغ الدفعة المقبوضة (ريال) *</Label>
                      <Input
                        type="number"
                        min={0.01}
                        step={0.01}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="مثال: 50000"
                        className="text-left [direction:ltr] border-border focus:ring-primary rounded-xl h-11 font-bold text-emerald-800 dark:text-emerald-300 bg-background"
                      />
                    </div>

                    {/* تاريخ القبض */}
                    <div className="space-y-2 text-right">
                      <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">تاريخ القبض *</Label>
                      <Input
                        type="date"
                        value={receiptDate}
                        onChange={(e) => setReceiptDate(e.target.value)}
                        className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background"
                      />
                    </div>
                  </div>

                  {/* البيان / الملاحظات */}
                  <div className="space-y-2 text-right">
                    <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">وذلك مقابل (سبب المقبوض / البيان) *</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={donationPurpose ? `أدخل البيان أو سبب القبض (مثال: تبرع مقيد لمصرف ${donationPurpose}...)` : "أدخل البيان أو سبب القبض..."}
                      rows={3}
                      className="text-right border-border focus:ring-primary rounded-xl text-xs leading-relaxed bg-background"
                    />
                  </div>

                  {/* تفاصيل طريقة القبض والحساب البنكي */}
                  <div className="space-y-2 text-right">
                    <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">تفاصيل طريقة القبض والحساب البنكي</Label>
                    <Input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="مثال: مصرف الراجحي"
                      className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background font-medium"
                    />
                  </div>

                </CardContent>
                <CardFooter className="border-t border-border/40 pt-4 flex justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="border-border text-foreground font-bold px-6 h-11 rounded-xl shadow-xs flex items-center gap-2"
                  >
                    <ArrowRight className="h-4 w-4" />
                    <span>السابق</span>
                  </Button>
                  <Button
                    onClick={handleStep2Next}
                    disabled={
                      (unrestrictedPayerSelect === "__custom__" ? !unrestrictedCustomPayer.trim() : !unrestrictedPayerSelect.trim()) ||
                      !donationPurpose ||
                      !amount ||
                      parseFloat(amount) <= 0
                    }
                    className="gradient-primary text-white font-bold px-6 h-11 rounded-xl shadow-sm flex items-center gap-2"
                  >
                    <span>التالي</span>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            )}

            {/* 3. في حال اختيار سند قبض غير مقيد */}
            {category === "unrestricted" && (
              <Card className="border-border/60 shadow-sm rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                <CardHeader className="bg-muted/30 border-b border-border/40 py-4 text-right">
                  <CardTitle className="flex items-center gap-2 text-foreground text-base font-bold">
                    <Coins className="h-4.5 w-4.5 text-amber-600" />
                    الخطوة 2: بيانات سند القبض غير المقيد
                  </CardTitle>
                  <CardDescription className="text-right text-xs text-muted-foreground">
                    تحديد الجهة الداعمة والمبالغ والبيانات المالية لسند القبض العام (غير المرتبط بمشروع محدد)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6 text-right">
                  
                  {/* اختيار اللقب والجهة الداعمة / المسدد مع إمكانية كتابة جهة أخرى */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="col-span-1 space-y-2 text-right">
                      <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">اللقب / الصفة *</Label>
                      <Select value={honorificTitle} onValueChange={setHonorificTitle}>
                        <SelectTrigger className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background" dir="rtl">
                          <SelectValue placeholder="اللقب..." />
                        </SelectTrigger>
                        <SelectContent dir="rtl">
                          <SelectItem value="السادة" className="text-right">السادة</SelectItem>
                          <SelectItem value="السيد" className="text-right">السيد</SelectItem>
                          <SelectItem value="السيدة" className="text-right">السيدة</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-2 space-y-2 text-right">
                      <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">الجهة الداعمة / المسدد *</Label>
                      <Select
                        value={unrestrictedPayerSelect}
                        onValueChange={(val) => {
                          setUnrestrictedPayerSelect(val);
                          if (val !== "__custom__") {
                            setPayerName(val);
                          } else {
                            setPayerName(unrestrictedCustomPayer);
                          }
                        }}
                      >
                        <SelectTrigger className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background w-full" dir="rtl">
                          <SelectValue placeholder="اختر من تصنيفات التمويل والدعم أو أضف جهة أخرى..." />
                        </SelectTrigger>
                        <SelectContent dir="rtl" className="max-h-60">
                          <SelectItem value="__custom__" className="text-right font-bold text-primary">
                            ✍️ إضافة جهة أخرى / إدخال يدوي
                          </SelectItem>
                          {fundingSupportCategories.map((sup, idx) => (
                            <SelectItem key={idx} value={sup} className="text-right">
                              {sup}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* حقل إدخال اسم الجهة يدوياً عند اختيار أخرى */}
                  {unrestrictedPayerSelect === "__custom__" && (
                    <div className="space-y-2 text-right animate-in fade-in duration-200">
                      <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <PenLine className="w-4 h-4 text-primary" />
                        اسم الجهة الداعمة أو المتبرع *
                      </Label>
                      <Input
                        type="text"
                        value={unrestrictedCustomPayer}
                        onChange={(e) => {
                          setUnrestrictedCustomPayer(e.target.value);
                          setPayerName(e.target.value);
                        }}
                        placeholder="أدخل اسم الجهة الداعمة أو المتبرع..."
                        className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background font-medium"
                      />
                    </div>
                  )}

                  {/* تفاصيل سند القبض: المبلغ والتاريخ */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border/40 pt-4">
                    {/* مبلغ الدفعة المقبوضة */}
                    <div className="space-y-2 text-right">
                      <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">مبلغ الدفعة المقبوضة (ريال) *</Label>
                      <Input
                        type="number"
                        min={0.01}
                        step={0.01}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="مثال: 50000"
                        className="text-left [direction:ltr] border-border focus:ring-primary rounded-xl h-11 font-bold text-emerald-800 dark:text-emerald-300 bg-background"
                      />
                    </div>

                    {/* تاريخ القبض */}
                    <div className="space-y-2 text-right">
                      <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">تاريخ القبض *</Label>
                      <Input
                        type="date"
                        value={receiptDate}
                        onChange={(e) => setReceiptDate(e.target.value)}
                        className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background"
                      />
                    </div>
                  </div>

                  {/* البيان / الملاحظات */}
                  <div className="space-y-2 text-right">
                    <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">وذلك مقابل (سبب المقبوض / البيان) *</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="أدخل البيان أو سبب القبض (مثال: تبرع عام للجمعية / إيرادات عامة...)"
                      rows={3}
                      className="text-right border-border focus:ring-primary rounded-xl text-xs leading-relaxed bg-background"
                    />
                  </div>

                  {/* تفاصيل طريقة القبض والحساب البنكي */}
                  <div className="space-y-2 text-right">
                    <Label className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">تفاصيل طريقة القبض والحساب البنكي</Label>
                    <Input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="مثال: مصرف الراجحي"
                      className="text-right border-border focus:ring-primary rounded-xl h-11 bg-background font-medium"
                    />
                  </div>

                </CardContent>
                <CardFooter className="border-t border-border/40 pt-4 flex justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="border-border text-foreground font-bold px-6 h-11 rounded-xl shadow-xs flex items-center gap-2"
                  >
                    <ArrowRight className="h-4 w-4" />
                    <span>السابق</span>
                  </Button>
                  <Button
                    onClick={handleStep2Next}
                    disabled={
                      (unrestrictedPayerSelect === "__custom__" ? !unrestrictedCustomPayer.trim() : !unrestrictedPayerSelect.trim()) ||
                      !amount ||
                      parseFloat(amount) <= 0
                    }
                    className="gradient-primary text-white font-bold px-6 h-11 rounded-xl shadow-sm flex items-center gap-2"
                  >
                    <span>التالي</span>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            )}
          </div>
        )}

        {/* ── الخطوة 3: المطابقة والبيانات المالية والمراجعة ── */}
        {step === 3 && (
          <div className="space-y-6">
            <Card className="border-border/60 shadow-sm rounded-xl overflow-hidden bg-white dark:bg-slate-900">
              <CardHeader className="bg-muted/30 border-b border-border/40 py-4 text-right">
                <CardTitle className="flex items-center gap-2 text-foreground text-base font-bold">
                  <FileCheck className="h-4.5 w-4.5 text-primary" />
                  الخطوة 3: المطابقة والبيانات المالية ومراجعة السند
                </CardTitle>
                <CardDescription className="text-right text-xs text-muted-foreground">
                  مراجعة تفاصيل سند القبض والموقف المالي قبل التأكيد والتسجيل النهائي
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6 text-right">
                
                {/* بطاقة ملخص السند */}
                <div className="p-5 bg-slate-50/80 dark:bg-slate-900/50 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-slate-800 pb-3">
                    <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <Receipt className="w-4 h-4" />
                      ملخص سند القبض المالي
                    </span>
                    <Badge className={
                      category === "project_linked" 
                        ? "bg-teal-50 text-teal-800 border-teal-200 font-bold text-xs" 
                        : category === "restricted"
                        ? "bg-blue-50 text-blue-800 border-blue-200 font-bold text-xs"
                        : "bg-amber-50 text-amber-800 border-amber-200 font-bold text-xs"
                    }>
                      {category === "project_linked" ? "سند قبض مرتبط بمشروع" : category === "restricted" ? `سند قبض مقيد (${donationPurpose})` : "سند قبض غير مقيد"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="text-muted-foreground font-medium block">
                        {category === "project_linked" ? "المشروع المرتبط:" : category === "restricted" ? "مصرف التبرع (مقيد):" : "نوع وتصنيف السند:"}
                      </span>
                      <p className="font-bold text-foreground text-sm">
                        {category === "project_linked"
                          ? (selectedProject ? `${selectedProject.projectNumber || ""} - ${selectedProject.name}` : `#${selectedProjectId}`)
                          : category === "restricted"
                          ? `سند قبض مقيد - مصرف ${donationPurpose}`
                          : "سند قبض غير مقيد (غير مرتبط بمشروع محدد)"
                        }
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-muted-foreground font-medium block">الجهة الداعمة / المسدد:</span>
                      <p className="font-bold text-foreground text-sm">
                        {honorificTitle} / {(category === "unrestricted" || category === "restricted") && unrestrictedPayerSelect === "__custom__" ? unrestrictedCustomPayer : payerName}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-muted-foreground font-medium block">تاريخ القبض:</span>
                      <p className="font-bold text-foreground">
                        {receiptDate}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-muted-foreground font-medium block">طريقة القبض / الحساب:</span>
                      <p className="font-bold text-foreground">
                        {bankName || "حوالة بنكية"}
                      </p>
                    </div>
                  </div>

                  {/* تفاصيل المبلغ والتفقيط */}
                  <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/80 dark:border-emerald-800 space-y-1.5">
                    <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-bold block">مبلغ سند القبض:</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                        {parseFloat(amount || "0").toLocaleString("ar-SA", { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">ريال سعودي</span>
                    </div>
                    <p className="text-xs text-emerald-900 dark:text-emerald-200 font-medium pt-1 border-t border-emerald-200/50">
                      فقط: <span className="font-bold">{numberToArabicText(parseFloat(amount || "0"))}</span>
                    </p>
                  </div>

                  {/* البيان */}
                  <div className="space-y-1 pt-1">
                    <span className="text-muted-foreground font-medium block text-xs">وذلك مقابل (البيان):</span>
                    <p className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                      {category === "restricted" && !notes.startsWith("مصرف التبرع:")
                        ? `مصرف التبرع: ${donationPurpose} | ${notes}`
                        : notes
                      }
                    </p>
                  </div>
                </div>

              </CardContent>
              <CardFooter className="border-t border-border/40 pt-4 flex justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="border-border text-foreground font-bold px-6 h-11 rounded-xl shadow-xs flex items-center gap-2"
                >
                  <ArrowRight className="h-4 w-4" />
                  <span>السابق</span>
                </Button>
                <Button
                  onClick={handleFinalSubmit}
                  disabled={createVoucherMutation.isPending}
                  className="gradient-primary text-white font-bold px-8 h-11 rounded-xl shadow-sm flex items-center gap-2"
                >
                  {createVoucherMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>تأكيد وتسجيل سند القبض</span>
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
