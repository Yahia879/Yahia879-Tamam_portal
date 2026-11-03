import { useState } from "react";
import { Link } from "wouter";
import { Plus, Trash2, Loader2, FilePlus2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { usePermission } from "@/hooks/usePermission";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SaudiRiyal } from "@/components/SaudiRiyal";
import {
  changeOrderPercentage,
  createChangeOrderSchema,
  priceChangeOrderItems,
} from "@shared/projectChangeOrders";

const format = (value: number) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const blankItem = () => ({
  name: "",
  unit: "بند",
  quantity: "1",
  unitPrice: "",
});
const statuses: Record<string, string> = {
  draft: "مسودة",
  pending: "بانتظار اعتماد مُعد الطلب",
  pending_executive: "بانتظار اعتماد المدير التنفيذي",
  approved: "معتمد للصرف",
  rejected: "مرفوض",
  paid: "مصروف",
};

export default function ProjectChangeOrdersTab({
  projectId,
  closed = false,
}: {
  projectId: number;
  closed?: boolean;
}) {
  const utils = trpc.useUtils();
  const canCreate = usePermission("disbursements.create_from_fund");
  const { data, isLoading, error, refetch } =
    trpc.projectChangeOrders.list.useQuery({ projectId });
  const [editing, setEditing] = useState(false);
  const [submissionKey, setSubmissionKey] = useState("");
  const [title, setTitle] = useState("");
  const [reason, setReason] = useState("");
  const [beneficiaryName, setBeneficiaryName] = useState("");
  const [beneficiaryBank, setBeneficiaryBank] = useState("");
  const [beneficiaryIban, setBeneficiaryIban] = useState("");
  const [items, setItems] = useState([blankItem()]);
  const priced = priceChangeOrderItems(
    items.map(item => ({
      ...item,
      quantity: Number(item.quantity) || 0,
      unitPrice: Number(item.unitPrice) || 0,
    }))
  );
  const originalCost =
    data?.funding?.originalProjectCost ||
    Number(data?.orders.at(-1)?.originalProjectCost || 0);
  const available = data?.funding?.available || 0;
  const exceedsSurplus =
    Math.round(priced.total * 100) > Math.round(available * 100);
  const create = trpc.projectChangeOrders.create.useMutation({
    onSuccess: result => {
      toast.success(
        `تم إنشاء أمر التغيير ${result.orderNumber} وربطه بطلب صرف من الفائض`
      );
      setEditing(false);
      void utils.projectChangeOrders.list.invalidate({ projectId });
      void utils.fund.invalidate();
      void utils.projects.getFinancialData.invalidate({ projectId });
      void utils.disbursements.invalidate();
    },
    onError: err => {
      toast.error(err.message);
      void refetch();
    },
  });

  function startOrder() {
    setSubmissionKey(crypto.randomUUID());
    setTitle("");
    setReason("");
    setBeneficiaryName("");
    setBeneficiaryBank("");
    setBeneficiaryIban("");
    setItems([blankItem()]);
    setEditing(true);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = createChangeOrderSchema.safeParse({
      projectId,
      submissionKey,
      title,
      reason,
      beneficiaryName,
      beneficiaryBank,
      beneficiaryIban,
      items: items.map(item => ({
        ...item,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
      })),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (exceedsSurplus) {
      toast.error("قيمة أمر التغيير تتجاوز الفائض المتاح");
      return;
    }
    create.mutate(parsed.data);
  }

  return (
    <div className="space-y-4 text-right" dir="rtl">
      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <FilePlus2 className="h-5 w-5 text-primary" />
              أوامر التغيير
            </CardTitle>
            <CardDescription>
              إضافة بنود للمشروع وتمويلها من فائضه، مع احتساب نسبتها من قيمة
              المشروع الأصلية.
            </CardDescription>
          </div>
          {canCreate && !closed && (
            <Button
              onClick={startOrder}
              disabled={editing || !data?.funding || available <= 0}
              className="shrink-0 gap-2"
            >
              <Plus className="h-4 w-4" />
              أمر تغيير جديد
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p role="status" className="text-sm text-muted-foreground">
              جارٍ تحميل أوامر التغيير…
            </p>
          ) : error ? (
            <div role="alert" className="space-y-2 text-sm text-destructive">
              <p>{error.message}</p>
              <Button variant="outline" onClick={() => void refetch()}>
                إعادة المحاولة
              </Button>
            </div>
          ) : (
            <>
              {data?.fundingError && (
                <p
                  role="alert"
                  className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900"
                >
                  {data.fundingError}
                </p>
              )}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ["قيمة المشروع الأصلية", originalCost],
                  ["فائض المشروع المتاح", data?.funding?.projectSurplus || 0],
                  ["الفائض المتاح في الصندوق", data?.funding?.fundSurplus || 0],
                  ["المتاح لأمر تغيير جديد", available],
                ].map(([label, amount]) => (
                  <div
                    key={label}
                    className="rounded-xl border bg-muted/30 p-3"
                  >
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-2 flex items-center gap-1 font-bold">
                      {format(Number(amount))}
                      <SaudiRiyal className="h-4 w-4" />
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-sm">
                إجمالي أوامر التغيير غير المرفوضة:{" "}
                <strong>{format(data?.activeTotal || 0)} ريال</strong>، بنسبة{" "}
                <strong>{format(data?.percentage || 0)}%</strong> من قيمة
                المشروع الأصلية.
              </p>
              {originalCost > 0 && (
                <p className="text-sm">
                  قيمة المشروع شاملة أوامر التغيير غير المرفوضة:{" "}
                  <strong>
                    {format(originalCost + (data?.activeTotal || 0))} ريال
                  </strong>
                </p>
              )}
              <p className="text-xs leading-6 text-muted-foreground">
                يُحجز مبلغ الأمر من الفائض لحين استكمال الاعتماد والصرف. عند رفض
                طلب الصرف يصبح المبلغ متاحاً في رصيد المشروع بالصندوق. تستخدم
                الأوامر اللاحقة قيمة المشروع الأصلية نفسها لحساب النسبة.
              </p>
              {closed && (
                <p className="text-sm text-amber-700">
                  المشروع مغلق؛ يمكن مراجعة الأوامر السابقة.
                </p>
              )}
              {!canCreate && (
                <p className="text-xs text-muted-foreground">
                  إنشاء أمر تغيير يتطلب صلاحية إنشاء طلب صرف من الصندوق.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {editing && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">أمر تغيير جديد</CardTitle>
            <CardDescription>
              أدخل البنود الإضافية وبيانات المستفيد لإنشاء طلب الصرف المرتبط.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-5">
              <fieldset
                disabled={create.isPending}
                className="min-w-0 space-y-5"
              >
                <div className="space-y-2">
                  <Label htmlFor="change-title">عنوان أمر التغيير</Label>
                  <Input
                    id="change-title"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    required
                    maxLength={200}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="change-reason">سبب إضافة البنود</Label>
                  <Textarea
                    id="change-reason"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    required
                    maxLength={4000}
                  />
                </div>
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div
                      key={index}
                      className="grid items-end gap-3 rounded-xl border p-3 sm:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]"
                    >
                      {(
                        [
                          ["name", "اسم البند", "text"],
                          ["unit", "الوحدة", "text"],
                          ["quantity", "الكمية", "number"],
                          ["unitPrice", "سعر الوحدة (ريال)", "number"],
                        ] as const
                      ).map(([key, label, type]) => (
                        <div key={key} className="space-y-2">
                          <Label htmlFor={`change-${key}-${index}`}>
                            {label}
                          </Label>
                          <Input
                            id={`change-${key}-${index}`}
                            type={type}
                            value={item[key]}
                            required
                            min={
                              type === "number"
                                ? key === "quantity"
                                  ? "0.001"
                                  : "0.01"
                                : undefined
                            }
                            step={
                              key === "quantity"
                                ? "0.001"
                                : key === "unitPrice"
                                  ? "0.01"
                                  : undefined
                            }
                            maxLength={
                              key === "name"
                                ? 255
                                : key === "unit"
                                  ? 50
                                  : undefined
                            }
                            onChange={e =>
                              setItems(current =>
                                current.map((row, i) =>
                                  i === index
                                    ? { ...row, [key]: e.target.value }
                                    : row
                                )
                              )
                            }
                          />
                        </div>
                      ))}
                      <div>
                        <p className="text-xs text-muted-foreground">
                          إجمالي البند
                        </p>
                        <p className="py-2 font-bold">
                          {format(priced.items[index].total)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`حذف البند ${index + 1}`}
                        disabled={items.length === 1}
                        onClick={() =>
                          setItems(current =>
                            current.filter((_, i) => i !== index)
                          )
                        }
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    disabled={items.length >= 100}
                    onClick={() =>
                      setItems(current => [...current, blankItem()])
                    }
                  >
                    <Plus className="h-4 w-4" />
                    إضافة بند
                  </Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="change-beneficiary">اسم المستفيد</Label>
                    <Input
                      id="change-beneficiary"
                      value={beneficiaryName}
                      onChange={e => setBeneficiaryName(e.target.value)}
                      required
                      maxLength={255}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="change-bank">البنك (اختياري)</Label>
                    <Input
                      id="change-bank"
                      value={beneficiaryBank}
                      onChange={e => setBeneficiaryBank(e.target.value)}
                      maxLength={255}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="change-iban">الآيبان (اختياري)</Label>
                    <Input
                      id="change-iban"
                      dir="ltr"
                      value={beneficiaryIban}
                      onChange={e => setBeneficiaryIban(e.target.value)}
                      maxLength={50}
                    />
                  </div>
                </div>
                <div
                  aria-live="polite"
                  className={`rounded-xl border p-4 text-sm leading-7 ${exceedsSurplus ? "border-destructive text-destructive" : "bg-primary/5"}`}
                >
                  <p>
                    قيمة أمر التغيير:{" "}
                    <strong>{format(priced.total)} ريال</strong> — نسبته من
                    المشروع:{" "}
                    <strong>
                      {format(
                        changeOrderPercentage(priced.total, originalCost)
                      )}
                      %
                    </strong>
                  </p>
                  <p>
                    الفائض المتبقي بعد الحجز:{" "}
                    <strong>{format(available - priced.total)} ريال</strong>
                  </p>
                  {exceedsSurplus && (
                    <p role="alert">
                      قيمة البنود تتجاوز الفائض المتاح. خفّض قيمة الأمر
                      للمتابعة.
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="submit"
                    disabled={
                      create.isPending ||
                      exceedsSurplus ||
                      priced.total <= 0 ||
                      !data?.funding
                    }
                    className="gap-2"
                  >
                    {create.isPending && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    إنشاء الأمر وحجز المبلغ من الفائض
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditing(false)}
                  >
                    إلغاء
                  </Button>
                </div>
              </fieldset>
            </form>
          </CardContent>
        </Card>
      )}

      {data?.orders.length === 0 && (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          لا توجد أوامر تغيير لهذا المشروع بعد.
        </div>
      )}
      {data?.orders.map(order => (
        <Card key={order.id}>
          <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base">{order.title}</CardTitle>
              <CardDescription>
                <span dir="ltr">{order.orderNumber}</span> ·{" "}
                {new Date(order.createdAt).toLocaleDateString("ar-SA")}
              </CardDescription>
            </div>
            <Badge
              variant={
                order.status === "rejected" ? "destructive" : "secondary"
              }
            >
              {statuses[order.status || "draft"] || order.status}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="whitespace-pre-wrap break-words text-sm">
              {order.reason}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    {[
                      "البند",
                      "الوحدة",
                      "الكمية",
                      "سعر الوحدة",
                      "الإجمالي",
                    ].map(label => (
                      <th
                        key={label}
                        className="whitespace-nowrap p-2 font-medium"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, index) => (
                    <tr key={index} className="border-b">
                      <td className="min-w-40 p-2">{item.name}</td>
                      <td className="p-2">{item.unit}</td>
                      <td className="p-2">{item.quantity}</td>
                      <td className="p-2">{format(item.unitPrice)}</td>
                      <td className="p-2">{format(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <p>
                <strong>{format(Number(order.amount))} ريال</strong> ·{" "}
                {format(Number(order.percentage))}% من قيمة المشروع الأصلية (
                {format(Number(order.originalProjectCost))} ريال)
              </p>
              <Link
                href={`/disbursements/requests/${order.disbursementRequestId}`}
              >
                <Button variant="outline" size="sm">
                  طلب الصرف {order.requestNumber}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
