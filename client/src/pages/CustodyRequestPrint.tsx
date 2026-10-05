import { useState, useMemo } from "react";
import { useParams, useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SaudiRiyal } from "@/components/SaudiRiyal";
import { numberToArabicText } from "@shared/tafqeet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ArrowRight,
  Printer,
  CheckCircle,
  XCircle,
  Clock,
  ShieldCheck,
  Building2,
  Landmark,
  CreditCard,
  User,
  Calendar,
  Wallet,
  ArrowUpRight,
  Loader2,
  FileCheck2,
} from "lucide-react";
import { toast } from "sonner";

function toHijriDate(date: Date): string {
  let formatted = "";
  try {
    formatted = new Intl.DateTimeFormat("ar-SA-u-ca-islamic", {
      day: "numeric",
      month: "numeric",
      year: "numeric"
    }).format(date);
  } catch (e) {
    const gregorianYear = date.getFullYear();
    const hijriYear = Math.floor((gregorianYear - 622) * (33 / 32));
    formatted = `${date.getDate()}/${date.getMonth() + 1}/${hijriYear}`;
  }
  formatted = formatted.replace(/هـ/g, "").replace(/ه/g, "").trim();
  formatted = formatted.replace(/[\s\u200e\u200f]+$/, "");
  return `${formatted} هـ`;
}

function formatGregorianDate(date: Date): string {
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} م`;
}

export default function CustodyRequestPrint() {
  const params = useParams<{ id: string }>();
  const requestId = parseInt(params.id || "0", 10);
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: request, isLoading } = trpc.custody.getById.useQuery(
    { id: requestId },
    { enabled: requestId > 0 }
  );

  const { data: orgSettings } = trpc.organization.getSettings.useQuery();

  const canApprove = useMemo(() => {
    if (!user) return false;
    return [
      "super_admin",
      "system_admin",
      "board_chairman",
      "general_manager",
      "executive_director",
    ].includes(user.role);
  }, [user]);

  const approveMutation = trpc.custody.approve.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setApproveDialogOpen(false);
      setApprovalNotes("");
      utils.custody.getById.invalidate({ id: requestId });
      utils.custody.getAll.invalidate();
      utils.custody.getStats.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء اعتماد الطلب");
    },
  });

  const rejectMutation = trpc.custody.reject.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setRejectDialogOpen(false);
      setRejectionReason("");
      utils.custody.getById.invalidate({ id: requestId });
      utils.custody.getAll.invalidate();
      utils.custody.getStats.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء رفض الطلب");
    },
  });

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20">
        <div className="text-center space-y-2">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-xs text-muted-foreground font-semibold">جاري تحميل تقرير طلب العهدة...</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20" dir="rtl">
        <div className="text-center space-y-3 p-6 bg-card rounded-2xl border border-border/70 max-w-md">
          <Wallet className="w-12 h-12 text-muted-foreground mx-auto" />
          <h2 className="text-base font-bold text-foreground">طلب العهدة غير موجود</h2>
          <p className="text-xs text-muted-foreground">قد يكون تم حذف الطلب أو ليس لديك صلاحية للوصول إليه.</p>
          <Button onClick={() => setLocation("/custody-requests")} className="rounded-xl text-xs font-bold">
            العودة لقائمة العهد المالية
          </Button>
        </div>
      </div>
    );
  }

  const numAmount = parseFloat(request.amount) || 0;
  const tafqeet = numberToArabicText(numAmount);
  const reqDate = request.createdAt ? new Date(request.createdAt) : new Date();

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 py-6 sm:py-8 print:bg-white print:p-0" dir="rtl">
      {/* Top Action Bar (Hidden during printing) */}
      <div className="max-w-[210mm] mx-auto mb-5 px-4 print:hidden flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href="/custody-requests">
            <Button variant="outline" size="sm" className="rounded-xl h-9 text-xs gap-1.5 font-bold cursor-pointer">
              <ArrowRight className="w-4 h-4" />
              <span>العودة للعهد المالية</span>
            </Button>
          </Link>
          <span className="font-mono text-xs font-bold text-muted-foreground">
            {request.requestNumber}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {canApprove && request.status === "pending_executive" && (
            <>
              <Button
                onClick={() => setApproveDialogOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold h-9 gap-1.5 shadow-xs cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                <span>اعتماد وتحويل لأمر صرف</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => setRejectDialogOpen(true)}
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 border-rose-200 rounded-xl text-xs font-bold h-9 gap-1.5 cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                <span>رفض الطلب</span>
              </Button>
            </>
          )}

          {request.disbursementOrderId && (
            <Link href={`/disbursements/orders/${request.disbursementOrderId}/print`}>
              <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold h-9 gap-1 text-emerald-700 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40">
                <span>عرض أمر الصرف</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          )}

          <Button
            onClick={handlePrint}
            className="gradient-primary text-white rounded-xl text-xs font-bold h-9 gap-1.5 shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة التقرير</span>
          </Button>
        </div>
      </div>

      {/* Official A4 Sheet */}
      <div className="max-w-[210mm] mx-auto bg-white text-slate-900 border border-slate-200 rounded-2xl shadow-sm print:border-none print:shadow-none print:rounded-none overflow-hidden print:w-full">
        {/* Top Header Banner */}
        <div className="p-6 sm:p-8 border-b-2 border-slate-800">
          <div className="flex items-center justify-between gap-4">
            {/* Right: Org details */}
            <div className="space-y-1 text-right">
              <h2 className="text-base font-black text-slate-900">
                {(orgSettings as any)?.nameAr || "جمعية عمارة وتطوير المساجد (تمام)"}
              </h2>
              <p className="text-xs text-slate-600 font-medium">
                {(orgSettings as any)?.licenseNumber ? `ترخيص رقم: ${(orgSettings as any)?.licenseNumber}` : "المركز الوطني لتنمية القطاع غير الربحي"}
              </p>
              <p className="text-xs text-slate-500">الإدارة التنفيذية - الإدارة المالية</p>
            </div>

            {/* Center: Title & Badge */}
            <div className="text-center space-y-1">
              <div className="inline-block px-4 py-1.5 bg-slate-900 text-white rounded-lg font-black text-sm tracking-wide">
                طلب صرف عهدة مالية
              </div>
              <p className="font-mono text-xs font-bold text-slate-700 block">
                {request.requestNumber}
              </p>
            </div>

            {/* Left: Logo or Header details */}
            <div className="text-left space-y-1 text-xs text-slate-600">
              <p>التاريخ: <span className="font-bold text-slate-900">{formatGregorianDate(reqDate)}</span></p>
              <p>الموافق: <span className="font-bold text-slate-900">{toHijriDate(reqDate)}</span></p>
              {request.disbursementOrderNumber && (
                <p className="text-emerald-700 font-bold font-mono">
                  أمر الصرف: {request.disbursementOrderNumber}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-5 text-xs">
          {/* حالة الاعتماد الحالية */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <span className="font-bold text-slate-700">حالة الطلب النظامية:</span>
            {request.status === "converted_to_order" ? (
              <span className="text-emerald-700 font-black flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                معتمد ومحوّل لأمر صرف برقم ({request.disbursementOrderNumber})
              </span>
            ) : request.status === "approved" ? (
              <span className="text-blue-700 font-black flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                معتمد من المدير التنفيذي
              </span>
            ) : request.status === "rejected" ? (
              <span className="text-rose-700 font-black flex items-center gap-1">
                <XCircle className="w-4 h-4 text-rose-600" />
                مرفوض ({request.rejectionReason})
              </span>
            ) : (
              <span className="text-amber-700 font-black flex items-center gap-1">
                <Clock className="w-4 h-4 text-amber-600" />
                بانتظار اعتماد وتوقيع المدير التنفيذي
              </span>
            )}
          </div>

          {/* 1. بيانات الموظف طالب العهدة */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white">
            <h3 className="font-black text-slate-900 mb-3 pb-1 border-b border-slate-100 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-700" />
              أولاً: بيانات الموظف طالب العهدة
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-800">
              <div>
                <span className="text-slate-500 block text-[10px]">اسم الموظف</span>
                <span className="font-bold">{request.applicantName || "الموظف مقدم الطلب"}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">المسمى / الإدارة</span>
                <span className="font-bold">{request.applicantSignatureDepartment || "العاملين بالجمعية"}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">رقم الجوال</span>
                <span className="font-bold font-mono" dir="ltr">{request.applicantPhone || "-"}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">البريد الإلكتروني</span>
                <span className="font-bold font-mono">{request.applicantEmail || "-"}</span>
              </div>
            </div>
          </div>

          {/* 2. تفاصيل العهدة والغرض منها */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white">
            <h3 className="font-black text-slate-900 mb-3 pb-1 border-b border-slate-100 flex items-center gap-1.5">
              <FileCheck2 className="w-3.5 h-3.5 text-slate-700" />
              ثانياً: موضوع وبيان العهدة المالية
            </h3>
            <div className="space-y-2 text-slate-800">
              <div>
                <span className="text-slate-500 text-[10px] block">موضوع العهدة / الغرض</span>
                <p className="font-bold text-sm text-slate-900">{request.title}</p>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">البيان التفصيلي لأوجه الصرف</span>
                <p className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">
                  {request.description}
                </p>
              </div>
            </div>
          </div>

          {/* 3. المبلغ المالي المطلوب */}
          <div className="border-2 border-slate-800 rounded-xl p-4 bg-slate-50/50">
            <h3 className="font-black text-slate-900 mb-2 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-slate-800" />
              ثالثاً: المبلغ المالي المطلوب صرفه
            </h3>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-white border border-slate-200 rounded-lg">
              <div>
                <span className="text-slate-500 text-[10px] block">المبلغ كتابةً (تفقيط)</span>
                <span className="font-black text-slate-900 text-xs sm:text-sm">
                  فقط {tafqeet} لا غير.
                </span>
              </div>
              <div className="text-left sm:border-r-2 sm:border-slate-300 sm:pr-4">
                <span className="text-slate-500 text-[10px] block">المبلغ بالأرقام</span>
                <span className="text-lg font-black text-slate-900 font-mono">
                  {numAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                </span>
              </div>
            </div>
          </div>

          {/* 4. الحساب البنكي المعتمد للصرف */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white">
            <h3 className="font-black text-slate-900 mb-3 pb-1 border-b border-slate-100 flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-slate-700" />
              رابعاً: بيانات الحساب المصرفي المعتمد للتحويل
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 block text-[10px]">اسم المصرف / البنك</span>
                <span className="font-bold text-slate-900">{request.bankName}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 block text-[10px]">اسم صاحب الحساب المعتمد</span>
                <span className="font-bold text-slate-900">{request.bankAccountName}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 block text-[10px]">رقم الآيبان (IBAN)</span>
                <span className="font-bold font-mono tracking-wider text-slate-900" dir="ltr">{request.bankIban}</span>
              </div>
            </div>
          </div>

          {/* 5. سلسلة الاعتماد والتواقيع */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t-2 border-slate-200 mt-6">
            {/* خانة الموظف طالب العهدة */}
            <div className="border border-slate-200 rounded-xl p-3.5 text-center bg-slate-50/30 flex flex-col justify-between min-h-[170px]">
              <div>
                <p className="font-bold text-slate-800 text-[11px]">الموظف طالب العهدة</p>
                <p className="text-[10px] text-slate-500">إقرار بصحة البيان واستلام العهدة وفق اللائحة</p>
              </div>

              <div className="my-2 flex items-center justify-center">
                {request.applicantSignatureUrl ? (
                  <img
                    src={request.applicantSignatureUrl}
                    alt="توقيع الموظف"
                    className="h-16 max-w-[140px] object-contain mx-auto"
                  />
                ) : (
                  <div className="text-[11px] text-slate-400 font-mono py-4">
                    [توقيع رقمي موثق بالنظام]
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200 pt-1.5 text-[10px] text-slate-700">
                <p className="font-bold">{request.applicantSignatureName || request.applicantName}</p>
                <p className="text-slate-500 font-mono">{formatGregorianDate(reqDate)}</p>
              </div>
            </div>

            {/* خانة المدير التنفيذي */}
            <div className="border-2 border-slate-800 rounded-xl p-3.5 text-center bg-white flex flex-col justify-between min-h-[170px]">
              <div>
                <p className="font-black text-slate-900 text-xs">اعتماد المدير التنفيذي</p>
                <p className="text-[10px] text-slate-500">موافقة على صرف العهدة وتحويلها للإدارة المالية</p>
              </div>

              <div className="my-2 flex items-center justify-center">
                {request.executiveSignatureUrl ? (
                  <img
                    src={request.executiveSignatureUrl}
                    alt="توقيع المدير التنفيذي"
                    className="h-16 max-w-[140px] object-contain mx-auto"
                  />
                ) : request.executiveApprovedAt ? (
                  <div className="text-emerald-700 font-bold text-xs py-3 flex items-center justify-center gap-1">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <span>معتمد رسمياً بنظام تمام</span>
                  </div>
                ) : (
                  <div className="text-[11px] text-amber-700 font-bold py-4">
                    بانتظار توقيع واعتماد المدير التنفيذي
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200 pt-1.5 text-[10px] text-slate-700">
                <p className="font-black text-slate-900">
                  {request.executiveSignatureName || (request.executiveApprovedAt ? "المدير التنفيذي" : "........................")}
                </p>
                <p className="text-slate-500 font-mono">
                  {request.executiveApprovedAt ? formatGregorianDate(new Date(request.executiveApprovedAt)) : "التاريخ: ...... / ...... / 2026 م"}
                </p>
              </div>
            </div>
          </div>

          {/* تذييل توجيه الإدارة المالية عند الاعتماد */}
          {request.disbursementOrderNumber && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-[11px] leading-relaxed">
              <p className="font-bold flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                توجيه الإدارة المالية:
              </p>
              <p className="mt-0.5">
                تم اعتماد هذا الطلب نظامياً، وأُحيل إلى الإدارة المالية بموجب أمر الصرف المالي رقم 
                <span className="font-bold font-mono px-1">({request.disbursementOrderNumber})</span>
                لتنفيذ التحويل البنكي لحساب المستفيد الموضح أعلاه وفق الإجراءات المعتمدة.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 text-center text-[10px] text-slate-400 bg-slate-50/50">
          تم استخراج هذا التقرير آلياً عبر بوابة تمام لإدارة مشاريع وعمليات المساجد • {formatGregorianDate(new Date())}
        </div>
      </div>

      {/* حوار الاعتماد للمدير التنفيذي */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl" dir="rtl">
          <DialogHeader>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 mx-auto flex items-center justify-center mb-2">
              <CheckCircle className="w-6 h-6" />
            </div>
            <DialogTitle className="text-center text-lg font-black text-foreground">
              اعتماد طلب العهدة المالية
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground">
              سيتم توقيع واعتماد الطلب وتحويله تلقائياً لأمر صرف مالي وتوجيهه للإدارة المالية.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="p-3 bg-muted/40 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">المبلغ:</span>
                <span className="font-bold text-emerald-600 font-mono">{numAmount.toLocaleString()} ر.س</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">المستفيد:</span>
                <span className="font-bold">{request.bankAccountName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">البنك:</span>
                <span className="font-bold">{request.bankName}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">ملاحظات الاعتماد (اختياري)</Label>
              <Textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="أدخل أي ملاحظات للإدارة المالية..."
                className="text-xs min-h-[70px] rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setApproveDialogOpen(false)}
              className="rounded-xl text-xs h-9 font-semibold"
            >
              إلغاء
            </Button>
            <Button
              onClick={() => approveMutation.mutate({ id: request.id, notes: approvalNotes.trim() || undefined })}
              disabled={approveMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs h-9 font-bold gap-1.5"
            >
              {approveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>تأكيد الاعتماد والتحويل</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* حوار رفض الطلب */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl" dir="rtl">
          <DialogHeader>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 mx-auto flex items-center justify-center mb-2">
              <XCircle className="w-6 h-6" />
            </div>
            <DialogTitle className="text-center text-lg font-black text-foreground">
              رفض طلب العهدة المالية
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground">
              يرجى توضيح سبب الرفض ليتم إشعار الموظف به.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label className="text-xs font-semibold">سبب الرفض *</Label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="اكتب أسباب عدم الموافقة على طلب العهدة..."
              className="text-xs min-h-[90px] rounded-xl"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              className="rounded-xl text-xs h-9 font-semibold"
            >
              إلغاء
            </Button>
            <Button
              onClick={() => {
                if (!rejectionReason.trim()) {
                  toast.error("يرجى كتابة سبب الرفض");
                  return;
                }
                rejectMutation.mutate({ id: request.id, reason: rejectionReason.trim() });
              }}
              disabled={rejectMutation.isPending || !rejectionReason.trim()}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs h-9 font-bold gap-1.5"
            >
              {rejectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              <span>تأكيد الرفض</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
