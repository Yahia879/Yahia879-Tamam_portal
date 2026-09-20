import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShoppingCart,
  ArrowRight,
  Building2,
  Package,
  CheckCircle,
  Clock,
  Phone,
  FileText,
  CreditCard,
  Calendar,
  User,
  Check,
  Loader2,
  AlertCircle,
  Store,
} from "lucide-react";
import { toast } from "sonner";
import { useDocumentTitle } from "@/contexts/DocumentTitleContext";

export default function CreatePurchaseOrderPage() {
  useDocumentTitle("إنشاء أمر شراء معتمد - سدانة");
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams<{ id?: string }>();
  const initialRequestId = params.id ? parseInt(params.id, 10) : null;

  // جلب طلبات سدانة التي تحوي موردين معتمدين لأوامر الشراء
  const {
    data: sedanaRequests = [],
    isLoading: isLoadingRequests,
  } = trpc.procurement.getAvailableRequestsForPO.useQuery();

  // الحالة للطلب المختار والمورد المختار
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(initialRequestId);
  const [selectedSupplierKey, setSelectedSupplierKey] = useState<string>("");

  // تفاصيل أمر الشراء
  const [orderNumber, setOrderNumber] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split("T")[0]);
  const [directedTo, setDirectedTo] = useState("");
  const [requesterName, setRequesterName] = useState(user?.name || "طالب الشراء");
  const [requesterRole, setRequesterRole] = useState("طالب الشراء / إدارة المشاريع");
  const [approverName, setApproverName] = useState("المدير التنفيذي");
  const [approverRole, setApproverRole] = useState("المدير التنفيذي");
  const [notes, setNotes] = useState("");

  // الكميات والبنود المحددة
  const [itemsQuantities, setItemsQuantities] = useState<Record<string, number>>({});
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  // استخراج الطلب المحدد
  const currentRequest = useMemo(() => {
    return sedanaRequests.find((r) => r.id === selectedRequestId) || null;
  }, [sedanaRequests, selectedRequestId]);

  // قائمة الموردين المعتمدين للطلب المختار
  const availableSuppliers = useMemo(() => {
    return currentRequest?.suppliers || [];
  }, [currentRequest]);

  // استخراج المورد المختار
  const currentSupplier = useMemo(() => {
    if (!availableSuppliers.length) return null;
    if (selectedSupplierKey) {
      return availableSuppliers.find((s: any) => String(s.id) === selectedSupplierKey || s.supplierName === selectedSupplierKey) || availableSuppliers[0];
    }
    return availableSuppliers[0];
  }, [availableSuppliers, selectedSupplierKey]);

  // عند تحميل الطلبات لأول مرة أو تغيير initialRequestId
  useEffect(() => {
    if (!selectedRequestId && sedanaRequests.length > 0) {
      if (initialRequestId && sedanaRequests.some((r) => r.id === initialRequestId)) {
        handleSelectRequest(initialRequestId);
      } else {
        handleSelectRequest(sedanaRequests[0].id);
      }
    }
  }, [sedanaRequests, initialRequestId]);

  // التعامل مع اختيار الطلب
  const handleSelectRequest = (reqId: number) => {
    setSelectedRequestId(reqId);
    const req = sedanaRequests.find((r) => r.id === reqId);
    if (!req) return;

    const firstSupplier = req.suppliers[0];
    if (firstSupplier) {
      handleSelectSupplier(firstSupplier, req);
    } else {
      setSelectedSupplierKey("");
      setSelectedItemIds([]);
      setItemsQuantities({});
    }
  };

  // التعامل مع اختيار المورد
  const handleSelectSupplier = (supplier: any, req?: any) => {
    const parentReq = req || currentRequest;
    setSelectedSupplierKey(String(supplier.id || supplier.supplierName));
    setDirectedTo(`إلى إدارة المشتريات (${supplier.supplierName})`);

    const year = new Date().getFullYear();
    const poNum = parentReq?.activePO?.orderNumber || `PO-${parentReq?.id || 1}-${year}`;
    setOrderNumber(poNum);

    // تهيئة البنود والكميات الخاصة بهذا المورد
    const initialQtys: Record<string, number> = {};
    const itemIds: string[] = [];

    (supplier.items || []).forEach((it: any) => {
      itemIds.push(it.id);
      initialQtys[it.id] = Number(it.quantity || 1);
    });

    setItemsQuantities(initialQtys);
    setSelectedItemIds(itemIds);
  };

  // Mutation: إنشاء أو اعتماد أمر الشراء
  const utils = trpc.useUtils();
  const createOrderMutation = trpc.procurement.createOrUpdatePurchaseOrder.useMutation({
    onSuccess: (res, vars) => {
      toast.success(res.message || "تم حفظ أمر الشراء بنجاح");
      utils.procurement.listPurchaseOrders.invalidate();
      utils.procurement.getAvailableRequestsForPO.invalidate();
      utils.sedanaExecution.getVirtualInventory.invalidate({ requestId: vars.requestId });

      // الانتقال لمعاينة أمر الشراء
      navigate(`/requests/${vars.requestId}/purchase-order`);
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء حفظ أمر الشراء");
    },
  });

  const handleSubmit = (status: "approved" | "draft") => {
    if (!selectedRequestId || !currentRequest) {
      toast.error("يرجى اختيار طلب سدانة أولاً");
      return;
    }

    if (!currentSupplier) {
      toast.error("يرجى اختيار المورد المعتمد");
      return;
    }

    const itemsToSubmit = (currentSupplier.items || [])
      .filter((it: any) => selectedItemIds.includes(it.id))
      .map((it: any) => ({
        id: it.id,
        itemName: it.itemName,
        description: it.description || "",
        quantity: itemsQuantities[it.id] ?? it.quantity ?? 1,
        unit: it.unit || "وحدة",
        unitPrice: it.unitPrice || 0,
        totalPrice: (itemsQuantities[it.id] ?? it.quantity ?? 1) * (it.unitPrice || 0),
      }));

    if (itemsToSubmit.length === 0) {
      toast.error("يرجى تضمين بند واحد على الأقل وتحديد كميته");
      return;
    }

    createOrderMutation.mutate({
      requestId: selectedRequestId,
      supplierName: currentSupplier.supplierName,
      supplierId: currentSupplier.supplierId || null,
      supplierPhone: currentSupplier.phone || "",
      supplierCommercialRegister: currentSupplier.commercialRegister || "",
      orderNumber: orderNumber || `PO-${selectedRequestId}-${new Date().getFullYear()}`,
      orderDate,
      directedTo: directedTo || `إلى إدارة المشتريات (${currentSupplier.supplierName})`,
      requesterName,
      requesterRole,
      approverName,
      approverRole,
      notes,
      status,
      items: itemsToSubmit,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 text-right font-sans" dir="rtl">
        {/* الترويسة وأزرار التنقل */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/purchase-orders")}
                className="h-8 px-2 text-xs font-semibold gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
                <span>العودة لأوامر الشراء</span>
              </Button>
              <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                إصدار وتوثيق أمر شراء داخلي
              </h1>
              <Badge variant="outline" className="text-sky-700 bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800 text-xs">
                برنامج سدانة
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              اختر طلب سدانة، ثم اختر المورد المعتمد وحدد كميات بنوده المطلوبة مع إمكانية الاعتماد الفوري
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/purchase-orders")}
              className="text-xs font-semibold cursor-pointer"
            >
              إلغاء
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={createOrderMutation.isPending || !currentSupplier}
              onClick={() => handleSubmit("draft")}
              className="text-xs font-bold cursor-pointer"
            >
              {createOrderMutation.isPending ? "جاري الحفظ..." : "حفظ كمسودة"}
            </Button>
            <Button
              size="sm"
              disabled={createOrderMutation.isPending || !currentSupplier}
              onClick={() => handleSubmit("approved")}
              className="text-xs font-bold gap-1 bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer shadow-xs"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{createOrderMutation.isPending ? "جاري الاعتماد..." : "إنشاء واعتماد أمر الشراء"}</span>
            </Button>
          </div>
        </div>

        {/* فحص حالة التحميل */}
        {isLoadingRequests ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
            <p className="text-xs text-muted-foreground">جاري جلب طلبات سدانة والموردين المعتمدين...</p>
          </div>
        ) : sedanaRequests.length === 0 ? (
          <Card className="border-dashed p-10 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
            <h3 className="text-base font-bold text-foreground">لا توجد طلبات سدانة بانتظار أوامر شراء</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
              تظهر هنا فقط طلبات برنامج سدانة التي تم اعتماد موردين لها على مسار "أمر شراء داخلي".
              يمكنك اعتماد الموردين وتوزيع البنود من صفحة تأمين الطلب والتعاقد.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/requests")}
              className="text-xs font-bold"
            >
              الذهاب إلى قائمة الطلبات
            </Button>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* الخطوة 1: اختيار طلب سدانة المعتمد */}
            <Card className="border border-border/80 shadow-2xs">
              <CardHeader className="p-4 border-b">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 flex items-center justify-center text-xs font-bold">1</span>
                  <span>اختر طلب سدانة:</span>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  يتم عرض طلبات برنامج سدانة التي تحتوي على موردين معتمدين لأوامر الشراء
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {sedanaRequests.map((req) => {
                    const isSelected = req.id === selectedRequestId;
                    return (
                      <div
                        key={req.id}
                        onClick={() => handleSelectRequest(req.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer text-xs space-y-2 ${
                          isSelected
                            ? "border-sky-600 bg-sky-50/50 dark:bg-sky-950/30 ring-2 ring-sky-500/20"
                            : "border-border hover:border-sky-300 hover:bg-muted/30"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-foreground bg-background px-2 py-0.5 rounded border">
                            #{req.requestNumber}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {req.suppliers.length} موردين معتمدين
                          </Badge>
                        </div>
                        <div>
                          <p className="font-bold text-foreground truncate">{req.mosqueName}</p>
                          <p className="text-[11px] text-muted-foreground">{req.mosqueCity} {req.mosqueDistrict ? `• ${req.mosqueDistrict}` : ""}</p>
                        </div>
                        {req.descriptiveName && (
                          <p className="text-[11px] text-muted-foreground truncate border-t pt-1.5">
                            {req.descriptiveName}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* الخطوة 2: اختيار المورد في حال تعدد الموردين */}
            {currentRequest && (
              <Card className="border border-border/80 shadow-2xs">
                <CardHeader className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 flex items-center justify-center text-xs font-bold">2</span>
                        <span>اختيار المورد المعتمد لأمر الشراء:</span>
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        {availableSuppliers.length > 1
                          ? `يوجد ${availableSuppliers.length} موردين معتمدين على أمر الشراء لهذا الطلب. اختر المورد لإصدار أمر الشراء الخاص به.`
                          : "تم تحديد المورد المعتمد الوحيد لهذا الطلب تلقائياً."}
                      </CardDescription>
                    </div>
                    {availableSuppliers.length > 1 && (
                      <Badge variant="secondary" className="text-xs font-bold">
                        تعدد الموردين ({availableSuppliers.length})
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {availableSuppliers.map((supp: any) => {
                      const isSelected = currentSupplier?.supplierName === supp.supplierName;
                      return (
                        <div
                          key={supp.id || supp.supplierName}
                          onClick={() => handleSelectSupplier(supp)}
                          className={`p-4 rounded-xl border transition-all cursor-pointer text-xs space-y-2.5 ${
                            isSelected
                              ? "border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20"
                              : "border-border hover:border-emerald-300 hover:bg-muted/30"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                <Store className="w-4 h-4" />
                              </div>
                              <span className="font-bold text-foreground text-sm">{supp.supplierName}</span>
                            </div>
                            {isSelected && (
                              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                            )}
                          </div>

                          <div className="space-y-1 text-muted-foreground text-[11px] border-t pt-2">
                            {supp.commercialRegister && (
                              <p>السجل التجاري: <strong className="text-foreground font-mono">{supp.commercialRegister}</strong></p>
                            )}
                            {supp.phone && (
                              <p>الجوال: <strong className="text-foreground font-mono">{supp.phone}</strong></p>
                            )}
                            <p>البنود المخصصة: <strong className="text-foreground">{supp.itemsCount} أصناف</strong></p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* الخطوة 3: معلومات المورد المعتمد */}
            {currentSupplier && (
              <Card className="border border-border/80 shadow-2xs bg-muted/10">
                <CardHeader className="p-4 border-b">
                  <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-xs font-bold">3</span>
                    <span>معلومات المورد المعتمد (بيانات التعميد):</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="text-muted-foreground">اسم المورد / الشركة:</span>
                      <p className="font-bold text-foreground text-sm">{currentSupplier.supplierName}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted-foreground">رقم السجل التجاري:</span>
                      <p className="font-bold font-mono text-foreground">{currentSupplier.commercialRegister || "مسجل بالنظام"}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted-foreground">رقم التواصل / الجوال:</span>
                      <p className="font-bold font-mono text-foreground">{currentSupplier.phone || "-"}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted-foreground">المدينة / المقر:</span>
                      <p className="font-bold text-foreground">{currentSupplier.city || currentRequest?.mosqueCity || "-"}</p>
                    </div>
                    {currentSupplier.bankName && (
                      <div className="space-y-1">
                        <span className="text-muted-foreground">البنك المعتمد:</span>
                        <p className="font-bold text-foreground">{currentSupplier.bankName}</p>
                      </div>
                    )}
                    {currentSupplier.iban && (
                      <div className="space-y-1 sm:col-span-2">
                        <span className="text-muted-foreground">رقم الآيبان (IBAN):</span>
                        <p className="font-bold font-mono text-foreground">{currentSupplier.iban}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* الخطوة 4: جدول بنود المورد وتحديد الكميات */}
            {currentSupplier && (
              <Card className="border border-border/80 shadow-2xs">
                <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 flex items-center justify-center text-xs font-bold">4</span>
                      <span>أصناف وبنود المورد وتحديد الكمية لكل بند:</span>
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      حدد الأصناف والكمية المطلوبة بدقة لإصدار أمر الشراء بها لهذا المورد
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedItemIds((currentSupplier.items || []).map((it: any) => it.id))}
                      className="h-7 text-xs text-sky-700 hover:bg-sky-50 px-2 cursor-pointer"
                    >
                      تحديد الكل
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedItemIds([])}
                      className="h-7 text-xs text-muted-foreground hover:bg-muted px-2 cursor-pointer"
                    >
                      إلغاء التحديد
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-right border-collapse">
                      <thead className="bg-muted/40 font-bold border-b border-border">
                        <tr>
                          <th className="p-3 w-12 text-center">تضمين</th>
                          <th className="p-3 w-10 text-center font-mono">#</th>
                          <th className="p-3">الصنف والبيان</th>
                          <th className="p-3">المواصفات والوصف</th>
                          <th className="p-3 text-center w-36">الكمية بأمر الشراء</th>
                          <th className="p-3 text-center w-24">الوحدة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {(currentSupplier.items || []).map((it: any, idx: number) => {
                          const isChecked = selectedItemIds.includes(it.id);
                          return (
                            <tr
                              key={it.id}
                              className={`transition-colors ${
                                isChecked ? "bg-sky-50/30 dark:bg-sky-950/20" : "opacity-50 bg-muted/10"
                              }`}
                            >
                              <td className="p-3 text-center">
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedItemIds((prev) => [...prev, it.id]);
                                    } else {
                                      setSelectedItemIds((prev) => prev.filter((id) => id !== it.id));
                                    }
                                  }}
                                />
                              </td>
                              <td className="p-3 text-center font-mono text-muted-foreground">{idx + 1}</td>
                              <td className="p-3 font-bold text-foreground">
                                <div>{it.itemName}</div>
                              </td>
                              <td className="p-3 text-muted-foreground max-w-xs">
                                {it.description || "-"}
                              </td>
                              <td className="p-3 text-center">
                                <Input
                                  type="number"
                                  min="0.01"
                                  step="any"
                                  disabled={!isChecked}
                                  value={itemsQuantities[it.id] ?? it.quantity ?? 1}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setItemsQuantities((prev) => ({
                                      ...prev,
                                      [it.id]: val,
                                    }));
                                  }}
                                  className="h-8 text-xs text-center font-mono w-28 mx-auto font-bold"
                                />
                              </td>
                              <td className="p-3 text-center font-mono text-muted-foreground">
                                {it.unit || "وحدة"}
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

            {/* الخطوة 5: بيانات وتوجيه أمر الشراء */}
            {currentSupplier && (
              <Card className="border border-border/80 shadow-2xs">
                <CardHeader className="p-4 border-b">
                  <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 flex items-center justify-center text-xs font-bold">5</span>
                    <span>بيانات وتوجيه أمر الشراء والاعتماد:</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <Label className="text-xs font-semibold text-muted-foreground">رقم أمر الشراء</Label>
                      <Input
                        value={orderNumber}
                        onChange={(e) => setOrderNumber(e.target.value)}
                        className="h-8 text-xs font-mono mt-1 font-bold"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-muted-foreground">تاريخ أمر الشراء</Label>
                      <Input
                        type="date"
                        value={orderDate}
                        onChange={(e) => setOrderDate(e.target.value)}
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-muted-foreground">الموجه إليه في الأمر</Label>
                      <Input
                        value={directedTo}
                        onChange={(e) => setDirectedTo(e.target.value)}
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-muted-foreground">طالب الشراء</Label>
                      <Input
                        value={requesterName}
                        onChange={(e) => setRequesterName(e.target.value)}
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-muted-foreground">صفة طالب الشراء</Label>
                      <Input
                        value={requesterRole}
                        onChange={(e) => setRequesterRole(e.target.value)}
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-muted-foreground">اسم المعتمِد</Label>
                      <Input
                        value={approverName}
                        onChange={(e) => setApproverName(e.target.value)}
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <Label className="text-xs font-semibold text-muted-foreground">ملاحظات وشروط التوريد</Label>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="أي شروط خاصة بالتوريد أو موقع التسليم..."
                        className="text-xs mt-1"
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* شريط الإجراءات والاعتماد */}
                  <div className="pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span>عند اختيار "إنشاء واعتماد"، يتم اعتماد أمر الشراء فورياً ونقل الطلب لمرحلة التشغيل والتنفيذ.</span>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={createOrderMutation.isPending}
                        onClick={() => handleSubmit("draft")}
                        className="text-xs font-bold flex-1 sm:flex-none cursor-pointer"
                      >
                        {createOrderMutation.isPending ? "جاري الحفظ..." : "حفظ كمسودة"}
                      </Button>
                      <Button
                        type="button"
                        disabled={createOrderMutation.isPending}
                        onClick={() => handleSubmit("approved")}
                        className="text-xs font-bold gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white flex-1 sm:flex-none cursor-pointer shadow-xs"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>{createOrderMutation.isPending ? "جاري الاعتماد..." : "إنشاء واعتماد أمر الشراء الآن"}</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
