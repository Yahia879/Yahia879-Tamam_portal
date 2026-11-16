import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  changeOrderPercentage,
  priceChangeOrderItems,
} from "@shared/projectChangeOrders";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SaudiRiyal } from "@/components/SaudiRiyal";
import BoqFormDialog from "./BoqFormDialog";
import {
  FileDiff,
  Loader2,
  Plus,
  Trash2,
  Edit,
  ExternalLink,
  CheckCircle2,
  Calculator,
  Clock,
  FileText,
  Lock,
  AlertTriangle,
  CreditCard,
  ArrowRightLeft,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

type DraftBoqItem = {
  id: string;
  mosqueId?: number;
  category: string;
  itemName: string;
  itemDescription: string;
  unit: string;
  quantity: number;
  unitPrice: number;
};

const formatMoney = (value: unknown) =>
  Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatPercent = (value: unknown) =>
  `${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;

const statusLabels: Record<
  string,
  { label: string; className: string; icon: any }
> = {
  pending_boq: {
    label: "معتمد في جدول الكميات",
    className: "bg-blue-50 text-blue-800 border-blue-300",
    icon: Calculator,
  },
  boq_approved: {
    label: "معتمد",
    className: "bg-blue-50 text-blue-800 border-blue-300",
    icon: Calculator,
  },
  linked_to_payment: {
    label: "مرتبط بدفعة جديدة للمشروع",
    className: "bg-sky-50 text-sky-800 border-sky-300",
    icon: CreditCard,
  },
  disbursement_created: {
    label: "تم إنشاء طلب صرف من الصندوق",
    className: "bg-indigo-50 text-indigo-800 border-indigo-300",
    icon: FileText,
  },
  approved: {
    label: "معتمد مالياً",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
  paid: {
    label: "تم الصرف",
    className: "bg-teal-50 text-teal-800 border-teal-300",
    icon: CheckCircle2,
  },
  rejected: {
    label: "مرفوض",
    className: "bg-rose-50 text-rose-700 border-rose-200",
    icon: Trash2,
  },
};

export function ProjectChangeOrdersTab({
  projectId,
  closed = false,
  onNavigateToBoq,
  onNavigateToPayments,
}: {
  projectId: number;
  closed?: boolean;
  onNavigateToBoq?: () => void;
  onNavigateToPayments?: () => void;
}) {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  // حالة نموذج إنشاء أمر التغيير
  const [submissionKey, setSubmissionKey] = useState(() => crypto.randomUUID());
  const [title, setTitle] = useState("");
  const [reason, setReason] = useState("");
  const [items, setItems] = useState<DraftBoqItem[]>([]);
  const [beneficiaryName, setBeneficiaryName] = useState("");
  const [beneficiaryBank, setBeneficiaryBank] = useState("");
  const [beneficiaryIban, setBeneficiaryIban] = useState("");

  // حالة نافذة إضافة/تعديل بند جدول الكميات (نفس واجهة جدول الكميات تماماً)
  const [boqDialogOpen, setBoqDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DraftBoqItem | null>(null);

  const { data, isLoading } = trpc.projectChangeOrders.list.useQuery(
    { projectId },
    { enabled: projectId > 0 }
  );

  useEffect(() => {
    if (data?.contract) {
      if (!beneficiaryName && data.contract.supplierName) {
        setBeneficiaryName(data.contract.supplierName);
      }
      if (!beneficiaryBank && data.contract.supplierBank) {
        setBeneficiaryBank(data.contract.supplierBank);
      }
      if (!beneficiaryIban && data.contract.supplierIban) {
        setBeneficiaryIban(data.contract.supplierIban);
      }
    }
  }, [data?.contract]);

  const { data: allCategories = [] } =
    trpc.categories.getAllCategories.useQuery();
  const categoriesMap = useMemo(() => {
    const map: Record<string, string> = {
      construction: "أعمال إنشائية",
      electrical: "أعمال كهربائية",
      plumbing: "أعمال سباكة",
      hvac: "تكييف وتبريد",
      finishing: "تشطيبات",
      carpentry: "نجارة",
      painting: "دهانات",
      flooring: "أرضيات",
      other: "أخرى",
    };
    for (const cat of allCategories as any[]) {
      if (cat?.name) map[cat.name] = cat.nameAr || cat.name;
    }
    return map;
  }, [allCategories]);

  // حساب إجمالي البنود المضافة
  const pricedDraft = useMemo(() => {
    return priceChangeOrderItems(
      items.map(item => ({
        name: item.itemName,
        description: item.itemDescription || undefined,
        unit: item.unit,
        quantity: item.quantity > 0 ? item.quantity : 1,
        unitPrice: item.unitPrice > 0 ? item.unitPrice : 0.01,
        category: item.category || undefined,
        mosqueId: item.mosqueId,
      }))
    );
  }, [items]);

  const originalCost = Number(data?.funding?.originalProjectCost || 0);
  const currentActiveTotal = Number(data?.activeTotal || 0);
  const totalProjectValue = originalCost + currentActiveTotal;
  const surplusAvailable = Number(data?.funding?.surplusAvailable || 0);
  const creationLocked = closed;
  const canCreateOrder = !creationLocked && pricedDraft.total > 0;

  const createMutation = trpc.projectChangeOrders.create.useMutation({
    onSuccess: async result => {
      if (result.hasSurplus) {
        toast.success(
          `تم اعتماد أمر التغيير (${result.orderNumber}) وتحويل مبلغه من فائض المشروع إلى الصندوق وإنشاء طلب صرف بنجاح`
        );
      } else {
        toast.success(
          `تم اعتماد أمر التغيير (${result.orderNumber}) وزيادة التكلفة الفعلية للمشروع بنجاح، ويمكنك الآن إضافة دفعة بمبلغ أمر التغيير من قسم الدفعات`
        );
      }
      setSubmissionKey(crypto.randomUUID());
      setTitle("");
      setReason("");
      setItems([]);
      await Promise.all([
        utils.projectChangeOrders.list.invalidate({ projectId }),
        utils.projects.getById.invalidate({ id: projectId }),
        utils.projects.getBOQ.invalidate(),
        utils.projects.getAll.invalidate(),
        utils.fund.transferableProjects.invalidate(),
        utils.fund.projectAvailability.invalidate({ projectId }),
      ]);
      // تحويل المسؤول تلقائياً لقسم جدول الكميات لرؤية البنود المضافة
      if (onNavigateToBoq) {
        onNavigateToBoq();
      }
    },
    onError: error => toast.error(error.message),
  });

  const linkToPaymentMutation =
    trpc.projectChangeOrders.linkToPayment.useMutation({
      onSuccess: () => {
        toast.success("تم ربط أمر التغيير بدفعة جديدة للمشروع بنجاح");
        utils.projectChangeOrders.list.invalidate({ projectId });
        utils.projects.getById.invalidate({ id: projectId });
      },
      onError: error => toast.error(error.message),
    });

  const handleOpenAddItem = () => {
    setEditingItem(null);
    setBoqDialogOpen(true);
  };

  const handleOpenEditItem = (item: DraftBoqItem) => {
    setEditingItem(item);
    setBoqDialogOpen(true);
  };

  const handleSaveBoqItem = (itemData: {
    mosqueId?: number;
    category: string;
    itemName: string;
    itemDescription: string;
    unit: string;
    quantity: number;
    unitPrice: number;
  }) => {
    const nextItems = editingItem
      ? items.map(it =>
          it.id === editingItem.id ? { ...it, ...itemData } : it
        )
      : [...items, { id: crypto.randomUUID(), ...itemData }];

    setItems(nextItems);
    toast.success(
      editingItem
        ? "تم تحديث البند قبل الاعتماد"
        : "تم إرفاق البند بأمر التغيير"
    );
    setEditingItem(null);
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(it => it.id !== id));
  };

  const submitCreate = () => {
    if (!canCreateOrder) return;
    if (title.trim().length < 3) {
      toast.error("أدخل عنواناً واضحاً لأمر التغيير");
      return;
    }
    if (reason.trim().length < 3) {
      toast.error("أدخل مبررات وأسباب أمر التغيير");
      return;
    }
    if (items.length === 0) {
      toast.error("يرجى إضافة بند واحد على الأقل لجدول الكميات");
      return;
    }
    if (pricedDraft.total <= 0) {
      toast.error("يجب أن تكون قيمة أمر التغيير أكبر من صفر");
      return;
    }

    createMutation.mutate({
      projectId,
      submissionKey,
      title: title.trim(),
      reason: reason.trim(),
      beneficiaryName: beneficiaryName.trim() || undefined,
      beneficiaryBank: beneficiaryBank.trim() || undefined,
      beneficiaryIban: beneficiaryIban.trim() || undefined,
      items: items.map(item => ({
        name: item.itemName.trim(),
        description: item.itemDescription?.trim() || undefined,
        unit: item.unit.trim(),
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        category: item.category || "بنود أوامر التغيير",
        mosqueId: item.mosqueId || null,
      })),
    });
  };

  return (
    <div dir="rtl" className="space-y-6 text-right">
      {/* 1. بطاقات الملخص المالي لأوامر التغيير */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-4">
            <span className="text-xs font-bold text-slate-600">
              قيمة المشروع الأصلية
            </span>
            <p className="mt-1 font-sans text-xl font-black text-slate-900">
              {formatMoney(originalCost)}{" "}
              <SaudiRiyal className="inline h-3.5 w-3.5" />
            </p>
            <span className="text-[11px] text-muted-foreground">
              القيمة الأساسية قبل أوامر التغيير
            </span>
          </CardContent>
        </Card>

        <Card className="border-indigo-200 bg-indigo-50/40 shadow-xs">
          <CardContent className="p-4">
            <span className="text-xs font-bold text-indigo-900">
              إجمالي أوامر التغيير المعتمدة
            </span>
            <p className="mt-1 font-sans text-xl font-black text-indigo-950">
              {formatMoney(currentActiveTotal)}{" "}
              <SaudiRiyal className="inline h-3.5 w-3.5" />
            </p>
            <span className="text-[11px] text-indigo-700">
              بنود مضافة ومعتمدة في جدول الكميات
            </span>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/40 shadow-xs">
          <CardContent className="p-4">
            <span className="text-xs font-bold text-emerald-900">
              قيمة المشروع بعد أوامر التغيير
            </span>
            <p className="mt-1 font-sans text-xl font-black text-emerald-950">
              {formatMoney(totalProjectValue)}{" "}
              <SaudiRiyal className="inline h-3.5 w-3.5" />
            </p>
            <span className="text-[11px] text-emerald-700">
              القيمة الإجمالية المحدثة للمشروع
            </span>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/40 shadow-xs">
          <CardContent className="p-4">
            <span className="text-xs font-bold text-amber-900">
              نسبة التغيير من قيمة المشروع
            </span>
            <p className="mt-1 font-sans text-xl font-black text-amber-950">
              {formatPercent(
                changeOrderPercentage(currentActiveTotal, originalCost)
              )}
            </p>
            <span className="text-[11px] text-amber-800">
              تحتسب على التكلفة الأصلية
            </span>
          </CardContent>
        </Card>
      </div>

      {data?.fundingError && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs font-semibold text-amber-900 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" />
          <span>{data.fundingError}</span>
        </div>
      )}

      {creationLocked && (
        <div
          className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950"
          role="status"
        >
          <Lock className="h-5 w-5 shrink-0" />
          <p className="text-sm font-bold">
            {closed
              ? "أوامر التغيير مغلقة لأن المشروع مغلق أو مكتمل"
              : "أوامر التغيير مغلقة"}
          </p>
        </div>
      )}
      {/* 2. نموذج إضافة أمر تغيير جديد */}
      {!creationLocked && !isLoading && (
        <Card className="border-teal-200 shadow-xs">
          <CardHeader className="border-b bg-teal-50/40">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Plus className="h-5 w-5 text-teal-600" />
              إضافة أمر تغيير جديد (يزيد على قيمة وتكلفة المشروع)
            </CardTitle>
            <CardDescription className="text-xs text-slate-600">
              يمكنك إضافة أمر التغيير حتى في حال عدم توفر فائض مالي كافٍ؛ سيتم
              اعتماد البنود وإدراجها في جدول الكميات وزيادة قيمة المشروع
              تلقائياً.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="co-title">عنوان أمر التغيير *</Label>
                <Input
                  id="co-title"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="مثال: أعمال إضافية في التكييف والكهرباء"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="co-reason">مبررات وسبب أمر التغيير *</Label>
                <Textarea
                  id="co-reason"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="اشرح الحاجة الفنية لبنود أمر التغيير..."
                  rows={3}
                />
              </div>
            </div>

            {/* قسم بنود جدول الكميات المضافة لأمر التغيير */}
            <div className="space-y-3 rounded-xl border border-teal-200/80 bg-teal-50/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-teal-600" />
                    بنود جدول الكميات الخاصة بأمر التغيير ({items.length})
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    اضغط على &quot;إضافة بند لجدول الكميات&quot; لفتح واجهة
                    إضافة البند المعتمدة في جدول الكميات
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={handleOpenAddItem}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold gap-1.5"
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                  إضافة بند لجدول الكميات
                </Button>
              </div>

              {items.length === 0 ? (
                <div className="rounded-xl border border-dashed border-teal-300 bg-white/80 py-8 text-center space-y-2">
                  <Calculator className="mx-auto h-10 w-10 text-teal-600/50" />
                  <p className="text-sm font-bold text-slate-700">
                    لم يتم إضافة بنود لأمر التغيير بعد
                  </p>
                  <p className="text-xs text-muted-foreground">
                    اضغط على زر &quot;إضافة بند لجدول الكميات&quot; لإضافة
                    البنود المطلوبة
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border bg-white overflow-hidden shadow-2xs">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="text-right text-xs font-bold">
                          التصنيف
                        </TableHead>
                        <TableHead className="text-right text-xs font-bold">
                          اسم البند
                        </TableHead>
                        <TableHead className="text-right text-xs font-bold">
                          الوحدة
                        </TableHead>
                        <TableHead className="text-right text-xs font-bold">
                          الكمية
                        </TableHead>
                        <TableHead className="text-right text-xs font-bold">
                          سعر الوحدة
                        </TableHead>
                        <TableHead className="text-right text-xs font-bold">
                          الإجمالي
                        </TableHead>
                        <TableHead className="text-center text-xs font-bold">
                          إجراء قبل الاعتماد
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map(item => {
                        const rowTotal =
                          (Number(item.quantity) || 0) *
                          (Number(item.unitPrice) || 0);
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="text-xs">
                              <Badge
                                variant="outline"
                                className="bg-teal-50 text-teal-700 border-teal-200 text-xs"
                              >
                                {categoriesMap[item.category] ||
                                  item.category ||
                                  "أخرى"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs font-medium">
                              <div>
                                <span className="font-bold">
                                  {item.itemName}
                                </span>
                                {item.itemDescription && (
                                  <p className="text-[11px] text-muted-foreground mt-0.5">
                                    {item.itemDescription}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">
                              {item.unit}
                            </TableCell>
                            <TableCell className="text-xs font-bold font-mono">
                              {item.quantity}
                            </TableCell>
                            <TableCell className="text-xs font-mono">
                              <span className="inline-flex items-center gap-1">
                                {formatMoney(item.unitPrice)}{" "}
                                <SaudiRiyal className="h-3 w-3 inline" />
                              </span>
                            </TableCell>
                            <TableCell className="text-xs font-bold font-mono text-teal-700">
                              <span className="inline-flex items-center gap-1">
                                {formatMoney(rowTotal)}{" "}
                                <SaudiRiyal className="h-3 w-3 inline" />
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-muted"
                                  onClick={() => handleOpenEditItem(item)}
                                >
                                  <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-rose-600 hover:bg-rose-50"
                                  onClick={() => handleRemoveItem(item.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  <div className="flex flex-wrap items-center justify-between gap-2 bg-teal-50/70 px-4 py-2.5 border-t text-xs">
                    <span className="font-bold text-teal-900">
                      إجمالي البنود المضافة في أمر التغيير:
                    </span>
                    <div className="flex items-center gap-4">
                      <span className="text-slate-600">
                        قيمة المشروع الإجمالية المتوقعة بعد الإضافة:{" "}
                        <strong className="font-sans text-emerald-800">
                          {formatMoney(totalProjectValue + pricedDraft.total)}{" "}
                          ر.س
                        </strong>
                      </span>
                      <span className="font-sans text-base font-black text-teal-700 inline-flex items-center gap-1">
                        {formatMoney(pricedDraft.total)}{" "}
                        <SaudiRiyal className="h-3.5 w-3.5 inline" />
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* إشعار التوجيه المالي لأمر التغيير (فائض أو زيادة تكلفة فعلية للمشروع) */}
            {pricedDraft.total > 0 && (
              <div
                className={`p-4 rounded-xl border space-y-3 ${
                  surplusAvailable >= pricedDraft.total
                    ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                    : "bg-sky-50/70 border-sky-200 text-sky-950"
                }`}
              >
                <div className="flex items-start gap-3">
                  {surplusAvailable >= pricedDraft.total ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <TrendingUp className="h-5 w-5 text-sky-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-sm">
                      {surplusAvailable >= pricedDraft.total
                        ? "سيتم تحويل مبلغ أمر التغيير من فائض المشروع إلى الصندوق وإنشاء طلب صرف"
                        : "سيتم زيادة التكلفة الفعلية للمشروع بقيمة أمر التغيير"}
                    </p>
                    <p className="leading-relaxed text-slate-700">
                      {surplusAvailable >= pricedDraft.total
                        ? `يتوفر في المشروع فائض مالي بقيمة ${formatMoney(surplusAvailable)} ر.س كافٍ لتغطية أمر التغيير (${formatMoney(pricedDraft.total)} ر.س). سيتم تحويل المبلغ إلى الصندوق تلقائياً وإنشاء طلب صرف بموجبه فور الاعتماد.`
                        : `لا يوجد فائض كافٍ في المشروع حالياً (${formatMoney(surplusAvailable)} ر.س). سيتم اعتماد أمر التغيير وزيادة التكلفة الفعلية والميزانية للمشروع بقيمة (${formatMoney(pricedDraft.total)} ر.س)، وبالتالي يمكنك إضافة دفعة مالية جديدة بالمبلغ من قسم الدفعات.`}
                    </p>
                  </div>
                </div>

                {surplusAvailable >= pricedDraft.total && (
                  <div className="pt-2 border-t border-emerald-200/60">
                    <p className="text-[11px] font-bold text-emerald-800 mb-2">
                      بيانات المستفيد لطلب الصرف (اختياري - افتراضياً سيتم استخدام بيانات مورد العقد):
                    </p>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <Label className="text-[11px] text-emerald-900">اسم المستفيد</Label>
                        <Input
                          value={beneficiaryName}
                          onChange={e => setBeneficiaryName(e.target.value)}
                          placeholder="اسم المورد / المقاول"
                          className="h-8 text-xs bg-white border-emerald-200"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] text-emerald-900">البنك</Label>
                        <Input
                          value={beneficiaryBank}
                          onChange={e => setBeneficiaryBank(e.target.value)}
                          placeholder="اسم البنك"
                          className="h-8 text-xs bg-white border-emerald-200"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] text-emerald-900">رقم الآيبان (IBAN)</Label>
                        <Input
                          value={beneficiaryIban}
                          onChange={e => setBeneficiaryIban(e.target.value)}
                          placeholder="SA..."
                          className="h-8 text-xs bg-white border-emerald-200 font-mono text-left"
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                onClick={submitCreate}
                disabled={
                  createMutation.isPending ||
                  items.length === 0 ||
                  !canCreateOrder
                }
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold gap-2 px-6"
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                اعتماد أمر التغيير للمشروع وزيادة قيمته والانتقال لقسم جدول
                الكميات
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. سجل أوامر التغيير القائمة (نهائية غير قابلة للتعديل بعد الإضافة) */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="border-b bg-slate-50/70">
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <FileDiff className="h-5 w-5 text-indigo-700" />
            سجل أوامر التغيير وبنود جدول الكميات الإضافية
          </CardTitle>
          <CardDescription className="text-xs">
            أوامر التغيير المضافة نهائية ولا يمكن تعديلها بعد إضافتها، ويتم
            تحويل قيمتها إلى الصندوق من صفحة الصندوق لإنشاء طلب صرف من الصندوق.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              جاري تحميل أوامر التغيير...
            </div>
          ) : !data?.orders.length ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              لا توجد أوامر تغيير مسجلة لهذا المشروع حتى الآن.
            </p>
          ) : (
            <div className="space-y-4">
              {data.orders.map(order => {
                const statusInfo =
                  statusLabels[order.status] || statusLabels.boq_approved;
                const StatusIcon = statusInfo.icon;
                const orderAmount = Number(order.amount || 0);

                return (
                  <div
                    key={order.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 space-y-4 shadow-2xs transition-all hover:border-slate-300"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b border-slate-100 pb-3">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-base text-slate-900">
                            {order.title}
                          </span>
                          <Badge
                            variant="outline"
                            className="font-mono text-xs bg-slate-50"
                          >
                            {order.orderNumber}
                          </Badge>
                          {!["boq_approved", "pending_boq"].includes(
                            order.status
                          ) && (
                            <Badge
                              variant="outline"
                              className={`flex items-center gap-1 text-xs font-semibold ${statusInfo.className}`}
                            >
                              <StatusIcon className="h-3 w-3" />
                              {statusInfo.label}
                            </Badge>
                          )}
                          {orderAmount > 0 && (
                            <Badge
                              variant="outline"
                              className="border-amber-300 bg-amber-50 text-amber-900 font-bold"
                            >
                              {formatPercent(order.percentage)} من المشروع
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          <span className="font-semibold text-slate-800">
                            سبب أمر التغيير:
                          </span>{" "}
                          {order.reason}
                        </p>
                      </div>

                      <div className="text-left sm:text-right shrink-0 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                        <span className="text-[10px] text-muted-foreground block">
                          إجمالي بنود أمر التغيير
                        </span>
                        <p className="font-sans text-lg font-black text-indigo-950">
                          {formatMoney(orderAmount)}{" "}
                          <SaudiRiyal className="inline h-3.5 w-3.5" />
                        </p>
                      </div>
                    </div>

                    {/* عرض البنود المرتبطة بأمر التغيير (للقراءة فقط) */}
                    {order.items && order.items.length > 0 && (
                      <div className="rounded-lg border border-slate-100 overflow-hidden">
                        <Table>
                          <TableHeader className="bg-slate-50/80">
                            <TableRow>
                              <TableHead className="text-right text-xs font-bold">
                                التصنيف
                              </TableHead>
                              <TableHead className="text-right text-xs font-bold">
                                اسم البند
                              </TableHead>
                              <TableHead className="text-right text-xs font-bold">
                                الوحدة
                              </TableHead>
                              <TableHead className="text-right text-xs font-bold">
                                الكمية
                              </TableHead>
                              <TableHead className="text-right text-xs font-bold">
                                سعر الوحدة
                              </TableHead>
                              <TableHead className="text-right text-xs font-bold">
                                الإجمالي
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {order.items.map((item: any, idx: number) => (
                              <TableRow key={idx}>
                                <TableCell className="text-xs">
                                  <Badge
                                    variant="outline"
                                    className="text-[11px]"
                                  >
                                    {categoriesMap[item.category] ||
                                      item.category ||
                                      "بنود أوامر التغيير"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs font-semibold">
                                  <div>
                                    <span>{item.name}</span>
                                    {item.description && (
                                      <p className="text-[11px] text-muted-foreground font-normal mt-0.5">
                                        {item.description}
                                      </p>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs">
                                  {item.unit}
                                </TableCell>
                                <TableCell className="text-xs font-mono">
                                  {item.quantity}
                                </TableCell>
                                <TableCell className="text-xs font-mono">
                                  {formatMoney(item.unitPrice)} ر.س
                                </TableCell>
                                <TableCell className="text-xs font-mono font-bold text-teal-700">
                                  {formatMoney(item.total)} ر.س
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {order.disbursementRequestId && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-emerald-700 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100 font-bold"
                          onClick={() =>
                            navigate(
                              `/disbursements/${order.disbursementRequestId}`
                            )
                          }
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span>
                            طلب صرف من الفائض{" "}
                            {order.requestNumber ||
                              `#${order.disbursementRequestId}`}
                          </span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      {order.paymentId && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-sky-700 border-sky-200 bg-sky-50/50 hover:bg-sky-100 font-bold"
                          onClick={() => {
                            if (onNavigateToPayments) {
                              onNavigateToPayments();
                            }
                          }}
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          <span>
                            الدفعة المرتبطة: {order.paymentNumber || `#${order.paymentId}`}
                          </span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      {!order.disbursementRequestId && !order.paymentId && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-blue-700 border-blue-200 bg-blue-50/50 hover:bg-blue-100 font-bold"
                          onClick={() => {
                            if (onNavigateToPayments) {
                              onNavigateToPayments();
                            }
                          }}
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          <span>الانتقال لقسم الدفعات لإضافة دفعة</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* نافذة إضافة / تعديل بند جدول الكميات (نفس واجهة جدول الكميات المعتمدة) */}
      {boqDialogOpen && !creationLocked && (
        <BoqFormDialog
          projectId={projectId}
          open={boqDialogOpen}
          onClose={() => {
            setBoqDialogOpen(false);
            setEditingItem(null);
          }}
          item={editingItem}
          requireUnitPrice={true}
          onSaveItem={handleSaveBoqItem}
        />
      )}
    </div>
  );
}
export default ProjectChangeOrdersTab;
