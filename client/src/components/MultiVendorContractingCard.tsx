import React, { useState, useMemo } from "react";
import { 
  FileSignature, 
  Plus, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  Printer, 
  Eye, 
  Edit, 
  Building2, 
  Clock, 
  Receipt,
  FileText,
  AlertCircle
} from "lucide-react";
import { SaudiRiyal } from "@/components/SaudiRiyal";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

interface MultiVendorContractingCardProps {
  requestId: number;
  projectId?: number;
  isSedanaProgram?: boolean;
  boqItems?: any[];
  allQuotations?: any[];
  hasAcceptedQuotation?: boolean;
  userRole?: string;
  onRefresh?: () => void;
}

export function MultiVendorContractingCard({
  requestId,
  projectId,
  isSedanaProgram = false,
  boqItems = [],
  allQuotations = [],
  hasAcceptedQuotation = false,
  userRole,
  onRefresh
}: MultiVendorContractingCardProps) {
  const [, setLocation] = useLocation();
  const [activeContractIndex, setActiveContractIndex] = useState<number>(0);
  const [showSupplierModal, setShowSupplierModal] = useState<boolean>(false);

  // جلب العقود المسجلة لهذا الطلب
  const { data: contractsList = [], isLoading: isLoadingContracts } = trpc.contracts.getAllByRequestId.useQuery(
    { requestId },
    { enabled: !!requestId }
  );

  // استخراج الموردين الفائزين بالبنود المعتمدة
  const awardedSuppliers = useMemo(() => {
    if (!allQuotations || allQuotations.length === 0) return [];

    const supplierMap = new Map<string, {
      supplierId?: number;
      supplierName: string;
      items: any[];
      totalAmount: number;
      quotationId?: number;
    }>();

    const acceptedQuotations = allQuotations.filter((q: any) => 
      q.status === "accepted" || q.status === "approved"
    );

    acceptedQuotations.forEach((quotation: any) => {
      const sName = quotation.supplierName || `مورد رقم ${quotation.supplierId || quotation.id}`;
      const sId = quotation.supplierId;
      const key = String(sId || sName).trim();

      let itemsList: any[] = [];
      if (Array.isArray(quotation.items)) {
        itemsList = quotation.items;
      } else if (typeof quotation.items === "string") {
        try {
          itemsList = JSON.parse(quotation.items);
        } catch (e) {
          itemsList = [];
        }
      }

      let itemsTotal = 0;
      const formattedItems = itemsList.map((it: any) => {
        const q = parseFloat(it.quantity || "1");
        const p = parseFloat(it.unitPrice || it.unit_price || it.price || "0");
        const tot = parseFloat(it.totalPrice || it.total_price || (q * p) || "0");
        itemsTotal += tot;
        return {
          name: it.itemName || it.item_name || it.name || "بند",
          quantity: q,
          unit: it.unit || "وحدة",
          unitPrice: p,
          totalPrice: tot
        };
      });

      const qTotal = parseFloat(quotation.approvedAmount || quotation.finalAmount || quotation.totalAmount || itemsTotal || 0);

      if (supplierMap.has(key)) {
        const existing = supplierMap.get(key)!;
        existing.items.push(...formattedItems);
        existing.totalAmount += qTotal;
      } else {
        supplierMap.set(key, {
          supplierId: sId,
          supplierName: sName,
          items: formattedItems.length > 0 ? formattedItems : [{ name: "بنود عرض السعر المعتمد", quantity: 1, unit: "مقطوعية", unitPrice: qTotal, totalPrice: qTotal }],
          totalAmount: qTotal,
          quotationId: quotation.id
        });
      }
    });

    return Array.from(supplierMap.values()).map(supp => {
      const existingContract = contractsList.find((c: any) => 
        (supp.supplierId && c.supplierId === supp.supplierId) ||
        (c.secondPartyName && c.secondPartyName.trim().toLowerCase() === supp.supplierName.trim().toLowerCase())
      );
      return {
        ...supp,
        contract: existingContract || null
      };
    });
  }, [allQuotations, contractsList]);

  // العقد النشط المعروض حالياً في قسم العرض التنقلي
  const activeContract = contractsList[activeContractIndex] || null;

  // الانقال لصفحة إنشاء عقد لمورد محدد
  const handleSelectSupplierForContract = (supplierData: any) => {
    setShowSupplierModal(false);
    const params = new URLSearchParams();
    if (requestId) params.set("requestId", String(requestId));
    if (projectId) params.set("projectId", String(projectId));
    if (supplierData.supplierId) params.set("supplierId", String(supplierData.supplierId));
    if (supplierData.supplierName) params.set("supplierName", supplierData.supplierName);
    if (supplierData.totalAmount) params.set("amount", String(supplierData.totalAmount));

    setLocation(`/contracts/new?${params.toString()}`);
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* شريط الإجراءات لمرحلة التعاقد وزر تأمين الطلب والتعاقد */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-border shadow-xs">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg ${isSedanaProgram ? 'bg-sky-600' : 'bg-emerald-600'} text-white flex items-center justify-center shadow-xs`}>
            <FileSignature className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              {isSedanaProgram ? "مرحلة تأمين الطلب والتعاقد" : "مرحلة التعاقد"}
              <Badge variant="outline" className={`${isSedanaProgram ? 'bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border-sky-200' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300'} font-bold text-[11px]`}>
                {contractsList.length} عقود صادرة
              </Badge>
            </h3>
            <p className="text-xs text-muted-foreground">
              {isSedanaProgram ? "تأمين الاحتياج عبر 3 مسارات: عقد توريد، أمر شراء داخلي، أو خطاب مسؤولية مجتمعية" : "إنشاء وإدارة عقود الموردين المعتمدين للطلب"}
            </p>
          </div>
        </div>

        <Button
          onClick={() => {
            if (isSedanaProgram) {
              setLocation(`/requests/${requestId}/procurement`);
            } else {
              setShowSupplierModal(true);
            }
          }}
          className={`${isSedanaProgram ? 'bg-sky-600 hover:bg-sky-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white font-bold text-xs h-9 px-4 gap-1.5 shadow-sm`}
        >
          {isSedanaProgram ? (
            <>
              <FileSignature className="w-4 h-4" />
              تأمين الطلب والتعاقد
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              إنشاء عقد جديد
            </>
          )}
        </Button>
      </div>

      {/* النافذة المنبثقة لاختيار المورد المراد إنشاء عقد له عند الضغط على إنشاء عقد جديد */}
      <Dialog open={showSupplierModal} onOpenChange={setShowSupplierModal}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader className="text-right sm:text-right pb-2 border-b">
            <DialogTitle className="text-lg font-bold flex items-center gap-2 justify-start">
              <Building2 className="w-5 h-5 text-emerald-600" />
              اختر المورد المراد إنشاء عقد له
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground text-right sm:text-right">
              اختر المورد الفائز المعتمد لإعداد وتوليد العقد الخاص به
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            {awardedSuppliers.length > 0 ? (
              awardedSuppliers.map((supp, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    if (supp.contract) {
                      setLocation(`/contracts/${supp.contract.id}/edit`);
                      setShowSupplierModal(false);
                    } else {
                      handleSelectSupplierForContract(supp);
                    }
                  }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-200 flex items-center justify-between gap-3 hover:border-emerald-500 hover:shadow-sm ${
                    supp.contract
                      ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"
                      : "bg-background border-border"
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground truncate">
                        {supp.supplierName}
                      </span>
                      {supp.contract ? (
                        <Badge className="bg-emerald-600 text-white text-[10px] py-0">
                          عقد جاهز ({supp.contract.contractNumber})
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-[10px] py-0">
                          بانتظار العقد
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      مجموع الترسية: <strong className="text-emerald-700 dark:text-emerald-400 font-extrabold">{supp.totalAmount.toLocaleString("ar-SA")} ريال</strong> ({supp.items.length} بنود)
                    </p>
                  </div>

                  <Button
                    size="sm"
                    variant={supp.contract ? "outline" : "default"}
                    className={supp.contract ? "text-xs h-8 border-emerald-300 text-emerald-800" : "bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"}
                  >
                    {supp.contract ? "تعديل العقد" : "اختر المورد"}
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-6 bg-muted/20 rounded-xl border border-dashed text-xs text-muted-foreground">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                لم يتم اعتماد أي عروض أسعار أو ترسية بنود على موردين بعد.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* كارد العقود المجمعة والتنقل بينها (Slider / Carousel View) */}
      {contractsList.length > 0 && (
        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-card overflow-hidden">
          <CardHeader className="bg-slate-100/70 dark:bg-slate-900/60 py-3 px-4 border-b border-border">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <CardTitle className="text-sm font-bold text-foreground">
                    عقود المشروع المعتمدة ({contractsList.length} عقود)
                  </CardTitle>
                  <CardDescription className="text-[11px] mt-0.5">
                    استعرض وقم بالتنقل بين جميع العقود المعتمدة للموردين
                  </CardDescription>
                </div>
              </div>

              {/* أزرار الأسهم للتنقل بين العقود */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-bold px-1">
                  عقد {activeContractIndex + 1} من {contractsList.length}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={activeContractIndex === 0}
                  onClick={() => setActiveContractIndex(prev => Math.max(0, prev - 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={activeContractIndex >= contractsList.length - 1}
                  onClick={() => setActiveContractIndex(prev => Math.min(contractsList.length - 1, prev + 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* ألسنة التبويب لكل عقد من العقود المجمعة */}
            <div className="flex items-center gap-2 overflow-x-auto pt-2.5 pb-0.5 no-scrollbar">
              {contractsList.map((c: any, index: number) => (
                <button
                  key={c.id}
                  onClick={() => setActiveContractIndex(index)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                    index === activeContractIndex
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-background text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 border border-border"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{c.secondPartyName || `عقد ${c.contractNumber}`}</span>
                  <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-white/20 text-current">
                    {c.contractNumber}
                  </Badge>
                </button>
              ))}
            </div>
          </CardHeader>

          {/* تفاصيل العقد النشط المعروض */}
          {activeContract && (
            <CardContent className="p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-muted/30 rounded-xl border border-border/70">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-sm text-foreground">
                      {activeContract.contractTitle || `عقد توريد وتنفيذ (${activeContract.secondPartyName})`}
                    </h3>
                    <Badge className="bg-emerald-600 text-white font-bold text-xs">
                      {activeContract.contractNumber}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>الطرف الثاني: <strong className="text-foreground">{activeContract.secondPartyName}</strong></span>
                    {activeContract.secondPartyPhone && <span>• جوال: {activeContract.secondPartyPhone}</span>}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[11px] text-muted-foreground block">إجمالي قيمة العقد:</span>
                    <span className="text-base font-black text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1">
                      {parseFloat(activeContract.contractAmount || "0").toLocaleString("ar-SA")} <SaudiRiyal className="w-3.5 h-3.5 inline" />
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2.5 gap-1.5 text-xs font-bold"
                      onClick={() => setLocation(`/contracts/${activeContract.id}/preview`)}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      معاينة
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2.5 gap-1.5 text-xs font-bold text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                      onClick={() => setLocation(`/contracts/${activeContract.id}/print`)}
                    >
                      <Printer className="w-3.5 h-3.5" />
                      طباعة
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 px-2.5 gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => setLocation(`/contracts/${activeContract.id}/edit`)}
                    >
                      <Edit className="w-3.5 h-3.5" />
                      تعديل
                    </Button>
                  </div>
                </div>
              </div>

              {/* تفاصيل إضافية للعقد */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 bg-background rounded-lg border border-border">
                  <span className="text-muted-foreground block mb-0.5">تاريخ العقد:</span>
                  <span className="font-bold text-foreground">
                    {activeContract.contractDate ? new Date(activeContract.contractDate).toLocaleDateString("ar-SA") : "غير محدد"}
                  </span>
                </div>
                <div className="p-2.5 bg-background rounded-lg border border-border">
                  <span className="text-muted-foreground block mb-0.5">المدة الزمانية:</span>
                  <span className="font-bold text-foreground">
                    {activeContract.duration} {activeContract.durationUnit === "days" ? "أيام" : activeContract.durationUnit === "weeks" ? "أسابيع" : "أشهر"}
                  </span>
                </div>
                <div className="p-2.5 bg-background rounded-lg border border-border">
                  <span className="text-muted-foreground block mb-0.5">حالة العقد:</span>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold">
                    {activeContract.status === "approved" ? "معتمد" : activeContract.status === "active" ? "نشط" : "مسودة العقد"}
                  </Badge>
                </div>
                <div className="p-2.5 bg-background rounded-lg border border-border">
                  <span className="text-muted-foreground block mb-0.5">الحساب البنكي / الآيبان:</span>
                  <span className="font-bold text-foreground dir-ltr block truncate">
                    {activeContract.secondPartyIban || "غير مسجل"}
                  </span>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
