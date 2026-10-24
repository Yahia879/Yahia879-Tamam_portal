import { useState } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRightLeft, ArrowRight, Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type Source = "surplus" | "administrative" | "operational";

const sourceName: Record<Source, string> = {
  surplus: "فائض المشروع",
  administrative: "الحصة الإدارية",
  operational: "الحصة التشغيلية",
};

const format = (value: number) =>
  value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function NewFundTransferPage() {
  const [, navigate] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const initialSource = params.get("source");
  const [projectId, setProjectId] = useState(params.get("projectId") || "");
  const source: Source = initialSource === "administrative" || initialSource === "operational"
    ? initialSource : "surplus";
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const utils = trpc.useUtils();
  const { data: projects = [], isLoading: isLoadingProjects } = trpc.fund.transferableProjects.useQuery({ source });
  const selectedProject = projects.find((project) => String(project.id) === projectId);
  const availableSource = selectedProject?.available || 0;
  const numericAmount = Number(amount);
  const isAmountValid = Number.isFinite(numericAmount) && numericAmount > 0 && numericAmount <= availableSource;

  const transferMutation = trpc.fund.transferFromProject.useMutation({
    onSuccess: async (result) => {
      toast.success(`تم التحويل إلى الصندوق. المتبقي من المصدر ${format(result.remaining)} ريال`);
      await Promise.all([
        utils.fund.summary.invalidate(),
        utils.fund.movements.invalidate(),
        utils.fund.projectAvailability.invalidate(),
        utils.fund.transferableProjects.invalidate(),
        utils.projects.getFinancialData.invalidate(),
      ]);
      navigate("/fund");
    },
    onError: (error) => toast.error(error.message),
  });

  const transfer = () => {
    if (!selectedProject) return toast.error("اختر مشروعاً لديه رصيد متاح للتحويل");
    if (!Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > availableSource)
      return toast.error("المبلغ يتجاوز المتاح للتحويل");

    transferMutation.mutate({
      projectId: Number(projectId),
      source,
      amount: numericAmount,
      destination: {
        restrictionType: source === "surplus" ? "project" : "general",
        restrictedProjectId: source === "surplus" ? Number(projectId) : undefined,
      },
      reason: reason.trim() || undefined,
    });
  };

  return (
    <DashboardLayout>
      <div dir="rtl" className="mx-auto max-w-5xl space-y-6 px-4 py-6 font-sans sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-700 text-white shadow-md shadow-indigo-700/20">
              <ArrowRightLeft className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">تحويل من مشروع إلى الصندوق</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                تحويل الفائض المالي أو الحصة الإدارية والتشغيلية من مشاريع الجمعية إلى أرصدة الصندوق
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate("/fund")} className="gap-2 self-start sm:self-auto">
            <ArrowRight className="h-4 w-4" />
            العودة إلى الصندوق
          </Button>
        </div>

        <Card className="overflow-hidden rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="border-b bg-slate-50/80 px-5 py-4 sm:px-7">
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <ArrowRightLeft className="h-5 w-5 text-indigo-700" />
              بيانات التحويل
            </CardTitle>
            <CardDescription>اختر مشروعاً لديه {sourceName[source]} متاح، وحدد المبلغ المطلوب تحويله.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 p-5 sm:p-7">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label htmlFor="transfer-project">المشروع</Label>
                <Select value={selectedProject ? projectId : ""} onValueChange={setProjectId} disabled={isLoadingProjects || projects.length === 0}>
                  <SelectTrigger id="transfer-project" className="mt-2 h-11">
                    <SelectValue placeholder={isLoadingProjects ? "جارٍ تحميل المشاريع..." : "اختر المشروع"} />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={String(project.id)}>
                        {project.projectNumber} — {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!isLoadingProjects && projects.length === 0 && (
                  <p className="mt-2 text-sm text-muted-foreground">لا توجد مشاريع لديها {sourceName[source]} متاح للتحويل حالياً.</p>
                )}
              </div>

              <div className="rounded-xl border border-indigo-100 bg-gradient-to-l from-indigo-50/80 to-white p-4 md:col-span-2 sm:p-5">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-indigo-950">
                  <Wallet className="h-4 w-4 text-indigo-700" />
                  رصيد {sourceName[source]} المتاح
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <strong className="block font-sans text-2xl font-black text-indigo-900 sm:text-3xl">
                      {isLoadingProjects ? "..." : `${format(availableSource)} ريال`}
                    </strong>
                    {selectedProject && <span className="mt-1 block text-xs text-muted-foreground">{selectedProject.projectNumber} — {selectedProject.name}</span>}
                  </div>
                  {selectedProject && (
                    <Button type="button" variant="outline" size="sm" onClick={() => setAmount(availableSource.toFixed(2))} disabled={availableSource <= 0}>
                      استخدام كامل المتاح
                    </Button>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="transfer-amount">المبلغ المراد تحويله</Label>
                <Input
                  id="transfer-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  className={`mt-2 h-11 font-sans ${amount && !isAmountValid ? "border-rose-300 focus-visible:ring-rose-300" : ""}`}
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  max={availableSource}
                />
                {amount && !isAmountValid && <p className="mt-1.5 text-xs text-rose-700">أدخل مبلغاً أكبر من صفر ولا يتجاوز الرصيد المتاح.</p>}
              </div>

              <div>
                <Label htmlFor="transfer-reason">سبب التحويل (اختياري)</Label>
                <Textarea
                  id="transfer-reason"
                  placeholder="اكتب تفاصيل سبب التحويل ورقم القرار إن وجد..."
                  className="mt-2 min-h-24"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border bg-slate-50 px-4 py-3 text-sm">
              <span className="text-muted-foreground">{isAmountValid ? "المتبقي بعد التحويل" : "الرصيد المتاح للتحويل"}</span>
              <strong className="font-sans text-slate-900">
                {isAmountValid ? `${format(availableSource - numericAmount)} ريال` : `${format(availableSource)} ريال`}
              </strong>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => navigate("/fund")} disabled={transferMutation.isPending}>
                إلغاء
              </Button>
              <Button
                onClick={transfer}
                disabled={transferMutation.isPending || !selectedProject || !isAmountValid}
                className="bg-indigo-700 font-bold text-white shadow-sm hover:bg-indigo-800 sm:min-w-48"
              >
                {transferMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                تحويل إلى الصندوق
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
