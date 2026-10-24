import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Coins,
  ArrowRightLeft,
  Send,
  Wallet,
  Loader2,
  Landmark,
  Layers,
  Tag,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type Source = "surplus" | "administrative" | "operational";
type Restriction = "general" | "purpose" | "project";

const format = (value: number) =>
  value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const sourceName: Record<Source, string> = {
  surplus: "فائض المشروع",
  administrative: "الحصة الإدارية",
  operational: "الحصة التشغيلية",
};

const movementName: Record<string, string> = {
  receipt: "إيداع سند قبض",
  receipt_reversal: "عكس إيداع",
  surplus: "تحويل فائض",
  administrative: "تحويل حصة إدارية",
  operational: "تحويل حصة تشغيلية",
  disbursement: "صرف",
  disbursement_reversal: "عكس صرف",
};

export default function FundPage() {
  const [, navigate] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const [projectId, setProjectId] = useState(params.get("projectId") || "");
  const [source, setSource] = useState<Source>((params.get("source") as Source) || "surplus");
  const [destination, setDestination] = useState<Restriction>(
    params.get("source") === "surplus" ? "project" : "general"
  );
  const [purposeId, setPurposeId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [reason, setReason] = useState("");
  const [releaseRestriction, setReleaseRestriction] = useState(false);
  const [requestMode, setRequestMode] = useState<"fund" | "projectSurplus">(
    params.get("action") === "direct" ? "projectSurplus" : "fund"
  );
  const [requestBucket, setRequestBucket] = useState("");
  const [requestProjectId, setRequestProjectId] = useState(params.get("projectId") || "");
  const [requestTitle, setRequestTitle] = useState("");
  const [requestAmount, setRequestAmount] = useState("");
  const [requestDescription, setRequestDescription] = useState("");
  const [beneficiaryName, setBeneficiaryName] = useState("");
  const [beneficiaryBank, setBeneficiaryBank] = useState("");
  const [beneficiaryIban, setBeneficiaryIban] = useState("");

  const utils = trpc.useUtils();
  const { data: summary, isLoading } = trpc.fund.summary.useQuery();
  const { data: movements = [] } = trpc.fund.movements.useQuery({ limit: 100 });
  const { data: availability } = trpc.fund.projectAvailability.useQuery(
    { projectId: Number(projectId) },
    { enabled: Number(projectId) > 0 }
  );
  const { data: directAvailability } = trpc.fund.projectAvailability.useQuery(
    { projectId: Number(requestProjectId) },
    { enabled: requestMode === "projectSurplus" && Number(requestProjectId) > 0 }
  );
  const { data: projectsData } = trpc.projects.getAll.useQuery({ limit: 200 });
  const projects: any[] = Array.isArray(projectsData)
    ? projectsData
    : (projectsData as any)?.projects || [];
  const { data: purposesData } = trpc.categories.getCategoryByType.useQuery({
    type: "donation_purposes",
  });
  const purposes: any[] = purposesData?.values || [];

  const availableSource =
    source === "surplus"
      ? availability?.surplusAvailable || 0
      : source === "administrative"
      ? availability?.administrativeAvailable || 0
      : availability?.operationalAvailable || 0;

  const spendableBuckets = useMemo(
    () => (summary?.buckets || []).filter((bucket) => bucket.available > 0),
    [summary]
  );

  const generalBucket = useMemo(
    () =>
      summary?.buckets.find((b) => b.restrictionType === "general") || {
        restrictionType: "general" as const,
        posted: 0,
        reserved: 0,
        available: 0,
      },
    [summary]
  );

  const purposeBuckets = useMemo(
    () => (summary?.buckets || []).filter((b) => b.restrictionType === "purpose"),
    [summary]
  );

  const projectBuckets = useMemo(
    () => (summary?.buckets || []).filter((b) => b.restrictionType === "project"),
    [summary]
  );

  const chosenBucket = spendableBuckets.find((bucket) => {
    const key =
      bucket.restrictionType === "purpose"
        ? `purpose:${bucket.donationPurposeId}`
        : bucket.restrictionType === "project"
        ? `project:${bucket.restrictedProjectId}`
        : "general";
    return key === requestBucket;
  });

  const refresh = async () => {
    await Promise.all([
      utils.fund.summary.invalidate(),
      utils.fund.movements.invalidate(),
      utils.fund.projectAvailability.invalidate(),
      utils.projects.getFinancialData.invalidate(),
    ]);
  };

  const transferMutation = trpc.fund.transferFromProject.useMutation({
    onSuccess: (result) => {
      toast.success(`تم التحويل إلى الصندوق. المتبقي من المصدر ${format(result.remaining)} ريال`);
      setTransferAmount("");
      setReason("");
      setReleaseRestriction(false);
      refresh();
    },
    onError: (error) => toast.error(error.message),
  });

  const requestMutation = trpc.fund.createDisbursementRequest.useMutation({
    onSuccess: (result) => {
      toast.success(`تم إنشاء طلب الصرف ${result.requestNumber}`);
      setRequestTitle("");
      setRequestAmount("");
      setRequestDescription("");
      setBeneficiaryName("");
      setBeneficiaryBank("");
      setBeneficiaryIban("");
      refresh();
      navigate("/disbursements");
    },
    onError: (error) => toast.error(error.message),
  });

  const directRequestMutation = trpc.fund.createProjectSurplusRequest.useMutation({
    onSuccess: (result) => {
      toast.success(`تم إنشاء طلب صرف من فائض المشروع ${result.requestNumber}`);
      refresh();
      navigate("/disbursements");
    },
    onError: (error) => toast.error(error.message),
  });

  const transfer = () => {
    if (!projectId) return toast.error("اختر المشروع");
    const amount = Number(transferAmount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > availableSource)
      return toast.error("المبلغ يتجاوز المتاح للتحويل");
    if (destination === "purpose" && !purposeId) return toast.error("اختر مصرف التبرع");
    if (source === "surplus" && destination !== "project" && !releaseRestriction)
      return toast.error("وثّق قرار تحرير قيد الفائض أولاً");

    transferMutation.mutate({
      projectId: Number(projectId),
      source,
      amount,
      destination: {
        restrictionType: destination,
        donationPurposeId: destination === "purpose" ? Number(purposeId) : undefined,
        restrictedProjectId: destination === "project" ? Number(projectId) : undefined,
      },
      reason,
      releaseRestriction,
    });
  };

  const createRequest = () => {
    const amount = Number(requestAmount);
    if (requestMode === "projectSurplus") {
      if (!requestProjectId || !directAvailability)
        return toast.error("اختر المشروع صاحب الفائض");
      if (!Number.isFinite(amount) || amount <= 0 || amount > directAvailability.surplusAvailable)
        return toast.error("المبلغ يتجاوز فائض المشروع المتاح");

      directRequestMutation.mutate({
        projectId: Number(requestProjectId),
        title: requestTitle,
        description: requestDescription,
        amount,
        beneficiaryName,
        beneficiaryBank,
        beneficiaryIban,
      });
      return;
    }

    if (!chosenBucket) return toast.error("اختر رصيد الصندوق");
    if (!Number.isFinite(amount) || amount <= 0 || amount > chosenBucket.available)
      return toast.error("المبلغ يتجاوز الرصيد المتاح");
    if (
      chosenBucket.restrictionType === "project" &&
      Number(requestProjectId) !== chosenBucket.restrictedProjectId
    ) {
      return toast.error("اختر المشروع المرتبط بهذا الرصيد");
    }

    requestMutation.mutate({
      title: requestTitle,
      description: requestDescription,
      amount,
      beneficiaryName,
      beneficiaryBank,
      beneficiaryIban,
      projectId: requestProjectId ? Number(requestProjectId) : undefined,
      source: {
        restrictionType: chosenBucket.restrictionType,
        donationPurposeId: chosenBucket.donationPurposeId || undefined,
        restrictedProjectId: chosenBucket.restrictedProjectId || undefined,
      },
    });
  };

  return (
    <DashboardLayout>
      <div dir="rtl" className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
        {/* رأس الصفحة والمؤشرات الإجمالية */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-md shadow-emerald-700/20 shrink-0">
              <Wallet className="w-6 h-6 text-emerald-100" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">الصندوق المركزي</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                إدارة أرصدة التبرعات العامة والقيود المحاسبية حسب مصارف التبرع وفوائض المشاريع
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs py-1 px-3 border-emerald-300 bg-emerald-50 text-emerald-800 font-bold">
              إجمالي المتاح بالصندوق: {format(summary?.available || 0)} ريال
            </Badge>
          </div>
        </div>

        {/* 1. الحساب العام (الرصيد غير المقيد) - الأوضح والأبرز */}
        <div className="rounded-2xl border-2 border-emerald-500/50 bg-gradient-to-br from-emerald-50 via-teal-50/30 to-white p-5 sm:p-6 shadow-sm relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-emerald-100">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/25 shrink-0">
                <Landmark className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black text-emerald-950">
                    الحساب العام (الرصيد غير المقيد)
                  </h2>
                  <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-2.5 py-0.5 shadow-xs">
                    الحساب الرئيسي العام
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-emerald-800/80 mt-1">
                  رصيد التبرعات العامة غير المشروطة، متاح للصرف المباشر على جميع المشاريع والأنشطة الإدارية والتشغيلية.
                </p>
              </div>
            </div>

            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setRequestMode("fund");
                setRequestBucket("general");
                setRequestProjectId("");
                const el = document.getElementById("request-section");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-xs shrink-0 flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Send className="w-4 h-4" />
              <span>صرف من الحساب العام</span>
            </Button>
          </div>

          {/* تفاصيل أرقام الحساب العام */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-4">
            <div className="p-4 rounded-xl bg-white/95 border-2 border-emerald-300 shadow-xs">
              <span className="text-xs font-bold text-emerald-900 block">الرصيد المتاح الفعلي للصرف</span>
              <span className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1 block font-sans">
                {isLoading ? "..." : format(generalBucket.available)}{" "}
                <span className="text-sm font-bold font-sans">ريال</span>
              </span>
              <span className="text-[11px] text-emerald-800/70 block mt-1">متاح للصرف المباشر فوراً</span>
            </div>

            <div className="p-4 rounded-xl bg-white/80 border border-emerald-100 shadow-xs">
              <span className="text-xs font-semibold text-slate-600 block">إجمالي المقبوض المسجل</span>
              <span className="text-lg sm:text-xl font-bold text-slate-800 mt-1 block font-sans">
                {isLoading ? "..." : format(generalBucket.posted)}{" "}
                <span className="text-xs font-medium font-sans">ريال</span>
              </span>
              <span className="text-[11px] text-muted-foreground block mt-1">إجمالي الإيداعات غير المقيدة</span>
            </div>

            <div className="p-4 rounded-xl bg-white/80 border border-emerald-100 shadow-xs">
              <span className="text-xs font-semibold text-slate-600 block">المحجوز لطلبات الصرف</span>
              <span className="text-lg sm:text-xl font-bold text-amber-700 mt-1 block font-sans">
                {isLoading ? "..." : format(generalBucket.reserved)}{" "}
                <span className="text-xs font-medium font-sans">ريال</span>
              </span>
              <span className="text-[11px] text-muted-foreground block mt-1">طلبات قيد المراجعة والاعتماد</span>
            </div>
          </div>
        </div>

        {/* 2. تحته: التصنيفات والأرصدة المقيدة */}
        <Card className="shadow-xs border-slate-200">
          <CardHeader className="pb-3 border-b bg-slate-50/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg font-bold text-slate-900">
                    التصنيفات ومصارف التبرع (الأرصدة المقيدة)
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    أرصدة تبرعات مقيدة بشروط الداعمين لمصارف محددة أو فوائض مشاريع مخصصة ولا يمكن صرفها خارج قيدها
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-indigo-800 border-indigo-200 bg-indigo-50 font-bold self-start sm:self-auto text-xs py-1 px-2.5">
                {purposeBuckets.length + projectBuckets.length} تصنيف / قيد مقيد
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-5 space-y-6">
            {/* مصارف التبرع المقيدة */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-800">أرصدة مصارف التبرع المسجلة</h3>
              </div>

              {purposeBuckets.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-dashed text-center text-xs text-muted-foreground">
                  لا توجد أرصدة مقيدة بمصارف تبرع حالياً (جميع التبرعات مقبوضة في الحساب العام أو المشاريع مباشرة).
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {purposeBuckets.map((bucket, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-indigo-100 bg-indigo-50/20 p-4 hover:border-indigo-300 transition-all shadow-2xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 pb-2 border-b border-indigo-100/60">
                          <span className="font-bold text-sm text-indigo-950 flex items-center gap-1.5 truncate">
                            <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0"></span>
                            <span className="truncate">{bucket.donationPurposeName || "مصرف تبرع"}</span>
                          </span>
                          <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100 border-indigo-200 text-[10px] font-bold shrink-0">
                            مقيد بمصرف
                          </Badge>
                        </div>

                        <div className="mt-3 space-y-1.5">
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs text-muted-foreground">الرصيد المتاح:</span>
                            <span className="text-lg font-black text-indigo-950 font-sans">
                              {format(bucket.available)}{" "}
                              <span className="text-xs font-normal">ريال</span>
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-indigo-50">
                            <span>الإجمالي: {format(bucket.posted)} ريال</span>
                            <span>المحجوز: {format(bucket.reserved)} ريال</span>
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={bucket.available <= 0}
                        onClick={() => {
                          setRequestMode("fund");
                          setRequestBucket(`purpose:${bucket.donationPurposeId}`);
                          setRequestProjectId("");
                          const el = document.getElementById("request-section");
                          if (el) el.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="w-full mt-3 text-xs text-indigo-700 hover:text-indigo-900 hover:bg-indigo-100 font-bold h-7 gap-1"
                      >
                        <Send className="w-3 h-3" />
                        <span>صرف من هذا المصرف</span>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* فوائض المشاريع المقيدة بالصندوق */}
            {projectBuckets.length > 0 && (
              <div className="pt-4 border-t">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="w-4 h-4 text-purple-600" />
                  <h3 className="text-sm font-bold text-slate-800">فوائض المشاريع المقيدة بالصندوق</h3>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {projectBuckets.map((bucket, index) => {
                    const proj = projects.find((p) => p.id === bucket.restrictedProjectId);
                    return (
                      <div
                        key={index}
                        className="rounded-xl border border-purple-100 bg-purple-50/20 p-4 hover:border-purple-300 transition-all shadow-2xs flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 pb-2 border-b border-purple-100/60">
                            <span className="font-bold text-sm text-purple-950 truncate">
                              {proj
                                ? `${proj.projectNumber} - ${proj.name}`
                                : `مشروع #${bucket.restrictedProjectId}`}
                            </span>
                            <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-200 text-[10px] font-bold shrink-0">
                              مقيد بالمشروع
                            </Badge>
                          </div>

                          <div className="mt-3 space-y-1.5">
                            <div className="flex items-baseline justify-between">
                              <span className="text-xs text-muted-foreground">الرصيد المتاح:</span>
                              <span className="text-lg font-black text-purple-950 font-sans">
                                {format(bucket.available)}{" "}
                                <span className="text-xs font-normal">ريال</span>
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-purple-50">
                              <span>الإجمالي: {format(bucket.posted)} ريال</span>
                              <span>المحجوز: {format(bucket.reserved)} ريال</span>
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={bucket.available <= 0}
                          onClick={() => {
                            setRequestMode("fund");
                            setRequestBucket(`project:${bucket.restrictedProjectId}`);
                            setRequestProjectId(String(bucket.restrictedProjectId));
                            const el = document.getElementById("request-section");
                            if (el) el.scrollIntoView({ behavior: "smooth" });
                          }}
                          className="w-full mt-3 text-xs text-purple-700 hover:text-purple-900 hover:bg-purple-100 font-bold h-7 gap-1"
                        >
                          <Send className="w-3 h-3" />
                          <span>صرف من رصيد المشروع</span>
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3. النماذج المالية: التحويل والصرف */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* تحويل من مشروع إلى الصندوق */}
          <Card className="shadow-xs border-slate-200">
            <CardHeader className="pb-3 border-b bg-slate-50/50">
              <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                <ArrowRightLeft className="w-5 h-5 text-indigo-700" />
                تحويل من مشروع إلى الصندوق
              </CardTitle>
              <CardDescription className="text-xs">
                تحويل الفائض المالي أو الحصة الإدارية والتشغيلية من مشاريع الجمعية إلى أرصدة الصندوق
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-3.5">
              <div>
                <Label>المشروع</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="اختر المشروع" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={String(project.id)}>
                        {project.projectNumber} — {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>مصدر المبلغ</Label>
                <Select
                  value={source}
                  onValueChange={(value) => {
                    setSource(value as Source);
                    setDestination(value === "surplus" ? "project" : "general");
                    setReleaseRestriction(false);
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(sourceName) as Source[]).map((item) => (
                      <SelectItem key={item} value={item}>
                        {sourceName[item]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border text-xs">
                المتاح للتحويل من هذا المصدر:{" "}
                <b className="text-indigo-900 font-bold">{format(availableSource)} ريال</b>
              </div>

              <div>
                <Label>وجهة الرصيد في الصندوق</Label>
                <Select
                  value={destination}
                  onValueChange={(value) => setDestination(value as Restriction)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">الحساب العام (رصيد عام غير مقيد)</SelectItem>
                    <SelectItem value="purpose">مقيد بمصرف تبرع محدد</SelectItem>
                    <SelectItem value="project">مقيد بالمشروع نفسه</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {destination === "purpose" && (
                <div>
                  <Label>مصرف التبرع المستهدف</Label>
                  <Select value={purposeId} onValueChange={setPurposeId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="اختر المصرف" />
                    </SelectTrigger>
                    <SelectContent>
                      {purposes.map((purpose) => (
                        <SelectItem key={purpose.id} value={String(purpose.id)}>
                          {purpose.valueAr || purpose.value || purpose.nameAr}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {source === "surplus" && destination !== "project" && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
                  <label className="flex items-start gap-2.5 text-xs text-amber-950 font-medium cursor-pointer">
                    <Checkbox
                      checked={releaseRestriction}
                      onCheckedChange={(checked) => setReleaseRestriction(checked === true)}
                      className="mt-0.5"
                    />
                    <span>
                      أعتمد تحرير قيد فائض المشروع إلى الوجهة المختارة (الحساب العام/المصرف)، مع توثيق السبب والقرار الإداري.
                    </span>
                  </label>
                </div>
              )}

              <div>
                <Label>المبلغ المراد تحويله</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  className="mt-1"
                  value={transferAmount}
                  onChange={(event) => setTransferAmount(event.target.value)}
                />
              </div>

              <div>
                <Label>سبب التحويل وقرار القيد</Label>
                <Textarea
                  placeholder="اكتب تفاصيل سبب التحويل ورقم القرار إن وجد..."
                  className="mt-1 min-h-[70px]"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              </div>

              <Button
                onClick={transfer}
                disabled={transferMutation.isPending || !availability || !reason.trim()}
                className="w-full bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs h-9"
              >
                {transferMutation.isPending && <Loader2 className="w-4 h-4 animate-spin ml-1.5" />}
                <span>تحويل إلى الصندوق</span>
              </Button>
            </CardContent>
          </Card>

          {/* طلب صرف من الصندوق */}
          <Card id="request-section" className="shadow-xs border-slate-200">
            <CardHeader className="pb-3 border-b bg-slate-50/50">
              <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                <Send className="w-5 h-5 text-emerald-700" />
                طلب صرف من الصندوق أو فائض المشروع
              </CardTitle>
              <CardDescription className="text-xs">
                إنشاء طلب صرف مخصص من أرصدة الصندوق المتاحة وتوجيهه عبر دورة الصرف المالي
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-3.5">
              <div>
                <Label>مصدر طلب الصرف</Label>
                <Select
                  value={requestMode}
                  onValueChange={(value) => setRequestMode(value as "fund" | "projectSurplus")}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fund">رصيد الصندوق (العام أو المقيد)</SelectItem>
                    <SelectItem value="projectSurplus">فائض المشروع مباشرة</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {requestMode === "fund" && (
                <div>
                  <Label>الرصيد / الحساب الذي سيُصرف منه</Label>
                  <Select value={requestBucket} onValueChange={setRequestBucket}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="اختر الرصيد أو الحساب" />
                    </SelectTrigger>
                    <SelectContent>
                      {spendableBuckets.map((bucket) => {
                        const key =
                          bucket.restrictionType === "purpose"
                            ? `purpose:${bucket.donationPurposeId}`
                            : bucket.restrictionType === "project"
                            ? `project:${bucket.restrictedProjectId}`
                            : "general";
                        return (
                          <SelectItem key={key} value={key}>
                            {bucket.restrictionType === "general"
                              ? "الحساب العام (غير مقيد)"
                              : bucket.restrictionType === "purpose"
                              ? `مصرف: ${bucket.donationPurposeName}`
                              : `فائض مشروع #${bucket.restrictedProjectId}`}{" "}
                            — متاح: {format(bucket.available)} ريال
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label>المشروع المستفيد (إن وجد)</Label>
                <Select
                  value={requestProjectId || "none"}
                  onValueChange={(value) => setRequestProjectId(value === "none" ? "" : value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون مشروع (صرف عام)</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={String(project.id)}>
                        {project.projectNumber} — {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {requestMode === "projectSurplus" && (
                <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-100 text-xs text-purple-950">
                  فائض المشروع المتاح:{" "}
                  <b>{format(directAvailability?.surplusAvailable || 0)} ريال</b>. يُخصص للمشروع نفسه
                  ويُنشأ طلب الصرف بحركة واحدة.
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>عنوان الطلب</Label>
                  <Input
                    placeholder="مثال: شراء تجهيزات، صيانة عاجلة..."
                    className="mt-1"
                    value={requestTitle}
                    onChange={(event) => setRequestTitle(event.target.value)}
                  />
                </div>
                <div>
                  <Label>المبلغ المراد صرفه</Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    className="mt-1"
                    value={requestAmount}
                    onChange={(event) => setRequestAmount(event.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label>اسم المستفيد</Label>
                  <Input
                    placeholder="الاسم الثلاثي أو الشركة"
                    className="mt-1"
                    value={beneficiaryName}
                    onChange={(event) => setBeneficiaryName(event.target.value)}
                  />
                </div>
                <div>
                  <Label>بنك المستفيد</Label>
                  <Input
                    placeholder="اسم البنك"
                    className="mt-1"
                    value={beneficiaryBank}
                    onChange={(event) => setBeneficiaryBank(event.target.value)}
                  />
                </div>
                <div>
                  <Label>آيبان المستفيد</Label>
                  <Input
                    placeholder="SA..."
                    className="mt-1 font-mono text-xs"
                    value={beneficiaryIban}
                    onChange={(event) => setBeneficiaryIban(event.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label>البيان والتفاصيل</Label>
                <Textarea
                  placeholder="بيان تفصيلي لسبب الصرف والمبررات..."
                  className="mt-1 min-h-[70px]"
                  value={requestDescription}
                  onChange={(event) => setRequestDescription(event.target.value)}
                />
              </div>

              <Button
                onClick={createRequest}
                disabled={
                  requestMutation.isPending ||
                  directRequestMutation.isPending ||
                  !requestTitle.trim() ||
                  !beneficiaryName.trim()
                }
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs h-9"
              >
                {(requestMutation.isPending || directRequestMutation.isPending) && (
                  <Loader2 className="w-4 h-4 animate-spin ml-1.5" />
                )}
                <span>إنشاء طلب صرف</span>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 4. سجل الحركات التراكمي */}
        <Card className="shadow-xs border-slate-200">
          <CardHeader className="pb-3 border-b bg-slate-50/50">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Coins className="w-5 h-5 text-amber-700" />
              سجل حركات الصندوق التراكمي
            </CardTitle>
            <CardDescription className="text-xs">
              سجل توثيقي لكافة عمليات الإيداع والصرف والتحويل المحاسبي في الصندوق
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-3">
            {movements.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                لا توجد حركات مسجلة في الصندوق حتى الآن.
              </div>
            ) : (
              <div className="divide-y">
                {movements.map((movement) => (
                  <div
                    key={movement.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900">
                          {movementName[movement.movementType] || movement.movementType}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold ${
                            movement.restrictionType === "general"
                              ? "border-emerald-200 text-emerald-800 bg-emerald-50"
                              : movement.restrictionType === "purpose"
                              ? "border-indigo-200 text-indigo-800 bg-indigo-50"
                              : "border-purple-200 text-purple-800 bg-purple-50"
                          }`}
                        >
                          {movement.restrictionType === "general"
                            ? "الحساب العام"
                            : movement.restrictionType === "purpose"
                            ? movement.donationPurposeName || "مصرف تبرع"
                            : `مشروع #${movement.restrictedProjectId}`}
                        </Badge>
                      </div>

                      {movement.notes && (
                        <p className="text-xs text-muted-foreground mt-0.5">{movement.notes}</p>
                      )}

                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
                        <span>{new Date(movement.createdAt).toLocaleString("ar-SA")}</span>
                        {movement.voucherId ? (
                          <>
                            <span>•</span>
                            <Button
                              variant="link"
                              className="p-0 h-auto text-xs text-primary font-bold cursor-pointer"
                              onClick={() => navigate(`/receipt-vouchers/${movement.voucherId}`)}
                            >
                              سند القبض #{movement.voucherId}
                            </Button>
                          </>
                        ) : movement.disbursementOrderId ? (
                          <>
                            <span>•</span>
                            <Button
                              variant="link"
                              className="p-0 h-auto text-xs text-primary font-bold cursor-pointer"
                              onClick={() =>
                                navigate(`/disbursement-orders/${movement.disbursementOrderId}`)
                              }
                            >
                              أمر الصرف #{movement.disbursementOrderId}
                            </Button>
                          </>
                        ) : movement.projectId ? (
                          <>
                            <span>•</span>
                            <Button
                              variant="link"
                              className="p-0 h-auto text-xs text-primary font-bold cursor-pointer"
                              onClick={() => navigate(`/projects/${movement.projectId}`)}
                            >
                              المشروع #{movement.projectId}
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </div>

                    <div className="text-left sm:text-right shrink-0">
                      <span
                        className={`text-base font-black font-sans ${
                          Number(movement.amount) < 0 ? "text-rose-700" : "text-emerald-700"
                        }`}
                      >
                        {Number(movement.amount) > 0 ? "+" : ""}
                        {format(Number(movement.amount))}{" "}
                        <span className="text-xs font-bold font-sans">ريال</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
