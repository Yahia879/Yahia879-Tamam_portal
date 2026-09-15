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
  Sparkles, 
  Clock, 
  ExternalLink,
  Receipt,
  FileText,
  AlertCircle,
  Loader2
} from "lucide-react";
import { SaudiRiyal } from "@/components/SaudiRiyal";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSupplierForContract, setSelectedSupplierForContract] = useState<any>(null);

  // جلب العقود المسجلة لهذا الطلب
  const { data: contractsList = [], isLoading: isLoadingContracts, refetch: refetchContracts } = trpc.contracts.getAllByRequestId.useQuery(
    { requestId },
    { enabled: !!requestId }
  );

  // جلب قائمة الموردين النشطين
  const { data: activeSuppliers = [] } = trpc.contracts.getSuppliers.useQuery();

  // استخراج الموردين الفائزين بالبنود المعتمدة
  const awardedSuppliers = useMemo(() => {
    if (!allQuotations || allQuotations.length === 0) return [];

    // تجميع البنود المعتمدة حسب كل مورد
    const supplierMap = new Map<string, {
      supplierId?: number;
      supplierName: string;
      items: any[];
      totalAmount: number;
      quotationId?: number;
    }>();

    // عروض الأسعار المقبولة/المعتمدة
    const acceptedQuotations = allQuotations.filter((q: any) => q.status === "accepted" || q.status === "approved" || hasAcceptedQuotation);

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

      // إذا كانت مصفوفة البنود موجودة
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

    // تحويل المخطط إلى مصفوفة وإسناد العقد المرتبط إن وجد
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
  }, [allQuotations, hasAcceptedQuotation, contractsList]);

  // العقد النشط المعروض حالياً في قسم العرض التنقلي
  const activeContract = contractsList[activeContractIndex] || null;

  // فتح صفحة/نموذج إنشاء عقد جديد لمورد محدد
  const handleStartContractForSupplier = (supplierData: any) => {
    setSelectedSupplierForContract(supplierData);
    // التنقل إلى صفحة إنشاء العقد مع التمرير التلقائي لبيانات المورد والطلب
    const params = new URLSearchParams();
    if (requestId) params.set("requestId", String(requestId));
    if (projectId) params.set("projectId", String(projectId));
    if (supplierData.supplierId) params.set("supplierId", String(supplierData.supplierId));
    if (supplierData.supplierName) params.set("supplierName", supplierData.supplierName);
    if (supplierData.totalAmount) params.set("amount", String(supplierData.totalAmount));

    setLocation(`/contracts/new/request/${requestId}?${params.toString()}`);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* بطاقة الرأس الرئيسية لمرحلة التعاقد */}
      <Card className="border border-emerald-500/30 dark:border-emerald-500/20 bg-gradient-to-r from-emerald-50/50 via-background to-teal-50/30 dark:from-emerald-950/20 dark:to-teal-950/10 shadow-sm overflow-hidden">
        <CardHeader className="py-4 px-5 border-b border-emerald-100 dark:border-emerald-900/30">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <FileSignature className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg font-bold text-foreground">
                    مرحلة التعاقد وإصدار العقود للموردين المعتمدين
                  </CardTitle>
                  <Badge variant="outline" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 font-bold text-xs">
                    مرحلة التعاقد
                  </Badge>
                </div>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  توليد وإدارة العقود المنفصلة لجميع الموردين الفائزين بعروض الأسعار المعتمدة للطلب
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation(`/contracts/new/request/${requestId}`)}
                className="text-xs font-bold gap-1.5 border-emerald-600/40 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
              >
                <Plus className="w-4 h-4" />
                إنشاء عقد جديد يدوي
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-6">
          {/* قسم 1: بطاقات الموردين المعتمدين وتوليد العقود */}
          <div>
            <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-600" />
              الموردون المعتمدون المطلوبة لهم عقود ({awardedSuppliers.length})
            </h4>

            {awardedSuppliers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {awardedSuppliers.map((supp, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between gap-3 ${
                      supp.contract
                        ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60 shadow-xs"
                        : "bg-card border-border hover:border-emerald-300 shadow-xs"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-bold text-sm text-foreground truncate flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          {supp.supplierName}
                        </span>
                        {supp.contract ? (
                          <Badge className="bg-emerald-600 text-white text-[10px] gap-1 py-0.5">
                            <CheckCircle2 className="w-3 h-3" />
                            تم إنشاء العقد
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-[10px] gap-1 py-0.5">
                            <Clock className="w-3 h-3" />
                            بانتظار العقد
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-border/60 text-xs">
                        <div className="flex justify-between items-center text-muted-foreground">
                          <span>البنود المعتمدة:</span>
                          <span className="font-bold text-foreground">{supp.items.length} بنود</span>
                        </div>
                        <div className="flex justify-between items-center text-muted-foreground">
                          <span>قيمة الترسية:</span>
                          <span className="font-extrabold text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1 text-sm">
                            {supp.totalAmount.toLocaleString("ar-SA")} <SaudiRiyal className="w-3 h-3" />
                          </span>
                        </div>
                      </div>

                      {/* قائمة البنود المعتمدة للمورد */}
                      <div className="mt-3 bg-background/80 p-2.5 rounded-lg border border-border/60 space-y-1 max-h-28 overflow-y-auto">
                        {supp.items.map((it: any, i: number) => (
                          <div key={i} className="flex justify-between items-center text-[11px] text-muted-foreground">
                            <span className="truncate max-w-[170px]">• {it.name}</span>
                            <span className="font-semibold text-foreground shrink-0">{it.totalPrice.toLocaleString("ar-SA")} ريال</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border/40">
                      {supp.contract ? (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="w-full text-xs font-bold gap-1.5 h-8 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                            onClick={() => setLocation(`/contracts/${supp.contract?.id}/edit`)}
                          >
                            <Edit className="w-3.5 h-3.5" />
                            تعديل العقد ({supp.contract?.contractNumber})
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          className="w-full text-xs font-bold gap-1.5 h-8 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                          onClick={() => handleStartContractForSupplier(supp)}
                        >
                          <FileSignature className="w-3.5 h-3.5" />
                          إصدار عقد للمورد
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 bg-muted/20 rounded-xl border border-dashed text-muted-foreground text-xs">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-500/80" />
                لم يتم رصد موردين معتمدين بعد لهذا الطلب. يرجى اعتماد عرض السعر أولاً.
              </div>
            )}
          </div>

          {/* قسم 2: كارد العقود المجمعة والتنقل بينها (Carousel / Slider View) */}
          {contractsList.length > 0 && (
            <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-card overflow-hidden mt-6">
              <CardHeader className="bg-slate-100/70 dark:bg-slate-900/60 py-3.5 px-4 border-b border-border">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2.5">
                    <Receipt className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <div>
                      <CardTitle className="text-sm font-bold text-foreground">
                        كارد عقود الموردين الصادرة للمشروع ({contractsList.length} عقود)
                      </CardTitle>
                      <CardDescription className="text-[11px] mt-0.5">
                        استعرض وقم بالتنقل بين العقود المعتمدة للموردين بكل سهولة
                      </CardDescription>
                    </div>
                  </div>

                  {/* أزرار التنقل بين العقود */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-bold px-2">
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

                {/* ألسنة التبويب لكل عقد */}
                <div className="flex items-center gap-2 overflow-x-auto pt-3 pb-1 no-scrollbar">
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

              {/* تفاصيل العقد المعروض حالياً */}
              {activeContract && (
                <CardContent className="p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-muted/30 rounded-xl border border-border/70">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-base text-foreground">
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
                        <span className="text-lg font-black text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1">
                          {parseFloat(activeContract.contractAmount || "0").toLocaleString("ar-SA")} <SaudiRiyal className="w-4 h-4 inline" />
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 px-3 gap-1.5 text-xs font-bold"
                          onClick={() => setLocation(`/contracts/${activeContract.id}/preview`)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          معاينة العقد
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 px-3 gap-1.5 text-xs font-bold text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                          onClick={() => setLocation(`/contracts/${activeContract.id}/print`)}
                        >
                          <Printer className="w-3.5 h-3.5" />
                          طباعة
                        </Button>
                        <Button
                          size="sm"
                          className="h-9 px-3 gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => setLocation(`/contracts/${activeContract.id}/edit`)}
                        >
                          <Edit className="w-3.5 h-3.5" />
                          تعديل العقد
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* تفاصيل إضافية عن العقد */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-background rounded-lg border border-border">
                      <span className="text-muted-foreground block mb-1">تاريخ العقد:</span>
                      <span className="font-bold text-foreground">
                        {activeContract.contractDate ? new Date(activeContract.contractDate).toLocaleDateString("ar-SA") : "غير محدد"}
                      </span>
                    </div>
                    <div className="p-3 bg-background rounded-lg border border-border">
                      <span className="text-muted-foreground block mb-1">المدة الزمانية:</span>
                      <span className="font-bold text-foreground">
                        {activeContract.duration} {activeContract.durationUnit === "days" ? "أيام" : activeContract.durationUnit === "weeks" ? "أسابيع" : "أشهر"}
                      </span>
                    </div>
                    <div className="p-3 bg-background rounded-lg border border-border">
                      <span className="text-muted-foreground block mb-1">حالة العقد:</span>
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold">
                        {activeContract.status === "approved" ? "معتمد" : activeContract.status === "active" ? "نشط" : "مسودة العقد"}
                      </Badge>
                    </div>
                    <div className="p-3 bg-background rounded-lg border border-border">
                      <span className="text-muted-foreground block mb-1">الحساب البنكي / الآيبان:</span>
                      <span className="font-bold text-foreground dir-ltr block truncate">
                        {activeContract.secondPartyIban || "غير مسجل"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
