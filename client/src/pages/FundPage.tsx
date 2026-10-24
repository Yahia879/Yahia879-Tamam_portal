import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Coins, ArrowRightLeft, Send, Wallet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type Source = "surplus" | "administrative" | "operational";
type Restriction = "general" | "purpose" | "project";

const format = (value: number) => value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const sourceName: Record<Source, string> = {
  surplus: "فائض المشروع", administrative: "الحصة الإدارية", operational: "الحصة التشغيلية",
};
const movementName: Record<string, string> = {
  receipt: "إيداع سند قبض", receipt_reversal: "عكس إيداع", surplus: "تحويل فائض",
  administrative: "تحويل حصة إدارية", operational: "تحويل حصة تشغيلية",
  disbursement: "صرف", disbursement_reversal: "عكس صرف",
};

export default function FundPage() {
  const [, navigate] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const [projectId, setProjectId] = useState(params.get("projectId") || "");
  const [source, setSource] = useState<Source>((params.get("source") as Source) || "surplus");
  const [destination, setDestination] = useState<Restriction>(params.get("source") === "surplus" ? "project" : "general");
  const [purposeId, setPurposeId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [reason, setReason] = useState("");
  const [releaseRestriction, setReleaseRestriction] = useState(false);
  const [requestMode, setRequestMode] = useState<"fund" | "projectSurplus">(params.get("action") === "direct" ? "projectSurplus" : "fund");
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
    { projectId: Number(projectId) }, { enabled: Number(projectId) > 0 },
  );
  const { data: directAvailability } = trpc.fund.projectAvailability.useQuery(
    { projectId: Number(requestProjectId) }, { enabled: requestMode === "projectSurplus" && Number(requestProjectId) > 0 },
  );
  const { data: projectsData } = trpc.projects.getAll.useQuery({ limit: 200 });
  const projects: any[] = Array.isArray(projectsData) ? projectsData : (projectsData as any)?.projects || [];
  const { data: purposesData } = trpc.categories.getCategoryByType.useQuery({ type: "donation_purposes" });
  const purposes: any[] = purposesData?.values || [];
  const availableSource = source === "surplus" ? availability?.surplusAvailable || 0
    : source === "administrative" ? availability?.administrativeAvailable || 0
    : availability?.operationalAvailable || 0;
  const spendableBuckets = useMemo(() => (summary?.buckets || []).filter((bucket) => bucket.available > 0), [summary]);
  const chosenBucket = spendableBuckets.find((bucket) => {
    const key = bucket.restrictionType === "purpose" ? `purpose:${bucket.donationPurposeId}`
      : bucket.restrictionType === "project" ? `project:${bucket.restrictedProjectId}` : "general";
    return key === requestBucket;
  });

  const refresh = async () => {
    await Promise.all([
      utils.fund.summary.invalidate(), utils.fund.movements.invalidate(),
      utils.fund.projectAvailability.invalidate(), utils.projects.getFinancialData.invalidate(),
    ]);
  };
  const transferMutation = trpc.fund.transferFromProject.useMutation({
    onSuccess: (result) => {
      toast.success(`تم التحويل إلى الصندوق. المتبقي من المصدر ${format(result.remaining)} ريال`);
      setTransferAmount(""); setReason(""); setReleaseRestriction(false); refresh();
    },
    onError: (error) => toast.error(error.message),
  });
  const requestMutation = trpc.fund.createDisbursementRequest.useMutation({
    onSuccess: (result) => {
      toast.success(`تم إنشاء طلب الصرف ${result.requestNumber}`);
      setRequestTitle(""); setRequestAmount(""); setRequestDescription(""); setBeneficiaryName(""); setBeneficiaryBank(""); setBeneficiaryIban(""); refresh();
      navigate("/disbursements");
    },
    onError: (error) => toast.error(error.message),
  });
  const directRequestMutation = trpc.fund.createProjectSurplusRequest.useMutation({
    onSuccess: (result) => {
      toast.success(`تم إنشاء طلب صرف من فائض المشروع ${result.requestNumber}`);
      refresh(); navigate("/disbursements");
    },
    onError: (error) => toast.error(error.message),
  });

  const transfer = () => {
    if (!projectId) return toast.error("اختر المشروع");
    const amount = Number(transferAmount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > availableSource) return toast.error("المبلغ يتجاوز المتاح للتحويل");
    if (destination === "purpose" && !purposeId) return toast.error("اختر مصرف التبرع");
    if (source === "surplus" && destination !== "project" && !releaseRestriction) return toast.error("وثّق قرار تحرير قيد الفائض أولاً");
    transferMutation.mutate({
      projectId: Number(projectId), source, amount,
      destination: {
        restrictionType: destination,
        donationPurposeId: destination === "purpose" ? Number(purposeId) : undefined,
        restrictedProjectId: destination === "project" ? Number(projectId) : undefined,
      },
      reason, releaseRestriction,
    });
  };
  const createRequest = () => {
    const amount = Number(requestAmount);
    if (requestMode === "projectSurplus") {
      if (!requestProjectId || !directAvailability) return toast.error("اختر المشروع صاحب الفائض");
      if (!Number.isFinite(amount) || amount <= 0 || amount > directAvailability.surplusAvailable) return toast.error("المبلغ يتجاوز فائض المشروع المتاح");
      directRequestMutation.mutate({
        projectId: Number(requestProjectId), title: requestTitle, description: requestDescription,
        amount, beneficiaryName, beneficiaryBank, beneficiaryIban,
      });
      return;
    }
    if (!chosenBucket) return toast.error("اختر رصيد الصندوق");
    if (!Number.isFinite(amount) || amount <= 0 || amount > chosenBucket.available) return toast.error("المبلغ يتجاوز الرصيد المتاح");
    if (chosenBucket.restrictionType === "project" && Number(requestProjectId) !== chosenBucket.restrictedProjectId) {
      return toast.error("اختر المشروع المرتبط بهذا الرصيد");
    }
    requestMutation.mutate({
      title: requestTitle, description: requestDescription, amount,
      beneficiaryName, beneficiaryBank, beneficiaryIban,
      projectId: requestProjectId ? Number(requestProjectId) : undefined,
      source: {
        restrictionType: chosenBucket.restrictionType,
        donationPurposeId: chosenBucket.donationPurposeId || undefined,
        restrictedProjectId: chosenBucket.restrictedProjectId || undefined,
      },
    });
  };

  return <DashboardLayout><div dir="rtl" className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
    <div className="flex items-center gap-3"><Wallet className="w-7 h-7 text-emerald-700" />
      <div><h1 className="text-2xl font-bold">الصندوق</h1><p className="text-sm text-muted-foreground">أرصدة التبرعات وحركات التحويل والصرف حسب القيد</p></div>
    </div>
    <div className="grid gap-3 sm:grid-cols-3">
      <Card><CardContent className="pt-5"><p className="text-sm text-muted-foreground">إجمالي الرصيد</p><p className="text-2xl font-bold">{isLoading ? "..." : format(summary?.total || 0)} ريال</p></CardContent></Card>
      <Card><CardContent className="pt-5"><p className="text-sm text-muted-foreground">المتاح بعد طلبات الصرف</p><p className="text-2xl font-bold text-emerald-700">{format(summary?.available || 0)} ريال</p></CardContent></Card>
      <Card><CardContent className="pt-5"><p className="text-sm text-muted-foreground">الأرصدة المقيدة</p><p className="text-2xl font-bold">{(summary?.buckets || []).filter((b) => b.restrictionType !== "general").length}</p></CardContent></Card>
    </div>
    <Card><CardHeader><CardTitle>تفصيل الأرصدة</CardTitle></CardHeader><CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {(summary?.buckets || []).map((bucket, index) => <div key={index} className="rounded-lg border p-3">
        <div className="flex justify-between gap-2"><b>{bucket.restrictionType === "general" ? "الرصيد العام" : bucket.restrictionType === "purpose" ? bucket.donationPurposeName : `مشروع #${bucket.restrictedProjectId}`}</b>
          <Badge variant="outline">{bucket.restrictionType === "general" ? "غير مقيد" : "مقيد"}</Badge></div>
        <p className="text-lg font-bold mt-2">{format(bucket.posted)} ريال</p>
        <p className="text-xs text-muted-foreground">المحجوز لطلبات الصرف: {format(bucket.reserved)} · المتاح: {format(bucket.available)}</p>
      </div>)}
    </CardContent></Card>
    <div className="grid lg:grid-cols-2 gap-4">
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><ArrowRightLeft className="w-5 h-5" /> تحويل من مشروع إلى الصندوق</CardTitle></CardHeader><CardContent className="space-y-3">
        <div><Label>المشروع</Label><Select value={projectId} onValueChange={setProjectId}><SelectTrigger><SelectValue placeholder="اختر المشروع" /></SelectTrigger><SelectContent>{projects.map((project) => <SelectItem key={project.id} value={String(project.id)}>{project.projectNumber} — {project.name}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>مصدر المبلغ</Label><Select value={source} onValueChange={(value) => { setSource(value as Source); setDestination(value === "surplus" ? "project" : "general"); setReleaseRestriction(false); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{(Object.keys(sourceName) as Source[]).map((item) => <SelectItem key={item} value={item}>{sourceName[item]}</SelectItem>)}</SelectContent></Select></div>
        <p className="text-sm">المتاح من هذا المصدر: <b>{format(availableSource)} ريال</b></p>
        <div><Label>وجهة الرصيد</Label><Select value={destination} onValueChange={(value) => setDestination(value as Restriction)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="project">مقيد بالمشروع نفسه</SelectItem><SelectItem value="purpose">مقيد بمصرف تبرع</SelectItem><SelectItem value="general">رصيد عام غير مقيد</SelectItem></SelectContent></Select></div>
        {destination === "purpose" && <div><Label>مصرف التبرع</Label><Select value={purposeId} onValueChange={setPurposeId}><SelectTrigger><SelectValue placeholder="اختر المصرف" /></SelectTrigger><SelectContent>{purposes.map((purpose) => <SelectItem key={purpose.id} value={String(purpose.id)}>{purpose.valueAr || purpose.value}</SelectItem>)}</SelectContent></Select></div>}
        {source === "surplus" && destination !== "project" && <label className="flex items-center gap-2 text-sm"><Checkbox checked={releaseRestriction} onCheckedChange={(checked) => setReleaseRestriction(checked === true)} /> أعتمد تحرير قيد فائض المشروع إلى الوجهة المختارة، مع توثيق السبب</label>}
        <div><Label>المبلغ</Label><Input type="number" min="0.01" step="0.01" value={transferAmount} onChange={(event) => setTransferAmount(event.target.value)} /></div>
        <div><Label>سبب التحويل وقرار القيد</Label><Textarea value={reason} onChange={(event) => setReason(event.target.value)} /></div>
        <Button onClick={transfer} disabled={transferMutation.isPending || !availability || !reason.trim()}>{transferMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />} تحويل إلى الصندوق</Button>
      </CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Send className="w-5 h-5" /> طلب صرف من الصندوق أو فائض المشروع</CardTitle></CardHeader><CardContent className="space-y-3">
        <div><Label>مصدر طلب الصرف</Label><Select value={requestMode} onValueChange={(value) => setRequestMode(value as "fund" | "projectSurplus")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="fund">رصيد الصندوق</SelectItem><SelectItem value="projectSurplus">فائض المشروع مباشرة</SelectItem></SelectContent></Select></div>
        {requestMode === "fund" && <div><Label>الرصيد الذي سيُصرف منه</Label><Select value={requestBucket} onValueChange={setRequestBucket}><SelectTrigger><SelectValue placeholder="اختر الرصيد" /></SelectTrigger><SelectContent>{spendableBuckets.map((bucket) => {
          const key = bucket.restrictionType === "purpose" ? `purpose:${bucket.donationPurposeId}` : bucket.restrictionType === "project" ? `project:${bucket.restrictedProjectId}` : "general";
          return <SelectItem key={key} value={key}>{bucket.restrictionType === "general" ? "الرصيد العام" : bucket.restrictionType === "purpose" ? bucket.donationPurposeName : `مشروع #${bucket.restrictedProjectId}`} — {format(bucket.available)} ريال</SelectItem>;
        })}</SelectContent></Select></div>}
        <div><Label>المشروع المستفيد، إن وجد</Label><Select value={requestProjectId || "none"} onValueChange={(value) => setRequestProjectId(value === "none" ? "" : value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">بدون مشروع</SelectItem>{projects.map((project) => <SelectItem key={project.id} value={String(project.id)}>{project.projectNumber} — {project.name}</SelectItem>)}</SelectContent></Select></div>
        {requestMode === "projectSurplus" && <p className="text-sm">فائض المشروع المتاح: <b>{format(directAvailability?.surplusAvailable || 0)} ريال</b>. يُخصص للمشروع نفسه ويُنشأ طلب الصرف في حركة واحدة.</p>}
        <div><Label>عنوان الطلب</Label><Input value={requestTitle} onChange={(event) => setRequestTitle(event.target.value)} /></div>
        <div><Label>اسم المستفيد</Label><Input value={beneficiaryName} onChange={(event) => setBeneficiaryName(event.target.value)} /></div>
        <div><Label>بنك المستفيد</Label><Input value={beneficiaryBank} onChange={(event) => setBeneficiaryBank(event.target.value)} /></div>
        <div><Label>آيبان المستفيد</Label><Input value={beneficiaryIban} onChange={(event) => setBeneficiaryIban(event.target.value)} /></div>
        <div><Label>المبلغ</Label><Input type="number" min="0.01" step="0.01" value={requestAmount} onChange={(event) => setRequestAmount(event.target.value)} /></div>
        <div><Label>البيان</Label><Textarea value={requestDescription} onChange={(event) => setRequestDescription(event.target.value)} /></div>
        <Button onClick={createRequest} disabled={requestMutation.isPending || directRequestMutation.isPending || !requestTitle.trim() || !beneficiaryName.trim()}>{(requestMutation.isPending || directRequestMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin" />} إنشاء طلب صرف</Button>
      </CardContent></Card>
    </div>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Coins className="w-5 h-5" /> سجل الحركات</CardTitle></CardHeader><CardContent className="space-y-2">
      {movements.map((movement) => <div key={movement.id} className="border-b py-2 flex justify-between gap-4 text-sm">
        <div><b>{movementName[movement.movementType] || movement.movementType}</b><p className="text-muted-foreground">{movement.notes || ""}</p>
          <p className="text-xs text-muted-foreground">{new Date(movement.createdAt).toLocaleString("ar-SA")}</p>
          {movement.voucherId ? <Button variant="link" className="p-0 h-auto" onClick={() => navigate(`/receipt-vouchers/${movement.voucherId}`)}>سند القبض #{movement.voucherId}</Button>
            : movement.disbursementOrderId ? <Button variant="link" className="p-0 h-auto" onClick={() => navigate(`/disbursement-orders/${movement.disbursementOrderId}`)}>أمر الصرف #{movement.disbursementOrderId}</Button>
            : movement.projectId ? <Button variant="link" className="p-0 h-auto" onClick={() => navigate(`/projects/${movement.projectId}`)}>المشروع #{movement.projectId}</Button> : null}
        </div>
        <b className={Number(movement.amount) < 0 ? "text-red-700 whitespace-nowrap" : "text-emerald-700 whitespace-nowrap"}>{Number(movement.amount) > 0 ? "+" : ""}{format(Number(movement.amount))} ريال</b>
      </div>)}
    </CardContent></Card>
  </div></DashboardLayout>;
}
