import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import EnhancedPagination from "@/components/EnhancedPagination";
import {
  History,
  Search,
  Bell,
  Mail,
  Smartphone,
  MessageSquare,
  CheckCircle2,
  Clock,
  Eye,
  X,
  Filter,
  Check,
  RotateCcw,
  Send,
  Layers,
  Copy
} from "lucide-react";
import { toast } from "sonner";

export default function NotificationLogsTab({
  dbRoles
}: {
  dbRoles?: Array<{ id: string; nameAr: string; isSystem?: boolean }>;
}) {
  const [page, setPage] = useState(1);
  const itemsPerPage = 15;

  // الفلاتر
  const [channelFilter, setChannelFilter] = useState<"all" | "in_app" | "email" | "sms" | "whatsapp">("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "direct" | "system">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "read" | "unread">("all");
  const [searchTerm, setSearchTerm] = useState("");

  // مودال عرض تفاصيل الإشعار
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  // استعلام جلب السجلات
  const { data, isLoading, refetch, isRefetching } = trpc.notifications.getNotificationDispatchLogs.useQuery({
    page,
    limit: itemsPerPage,
    channel: channelFilter,
    sourceType: sourceFilter,
    status: statusFilter,
    search: searchTerm || undefined,
  });

  const logs = data?.items || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;
  const stats = data?.stats || { total: 0, inApp: 0, email: 0, sms: 0, whatsapp: 0, direct: 0 };

  const handleResetFilters = () => {
    setChannelFilter("all");
    setSourceFilter("all");
    setStatusFilter("all");
    setSearchTerm("");
    setPage(1);
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("تم نسخ النص إلى الحافظة");
  };

  const getRoleTitle = (roleId?: string | null) => {
    if (!roleId) return "مستخدم";
    const match = dbRoles?.find((r) => r.id === roleId);
    if (match) return match.nameAr;
    if (roleId === "service_requester") return "طالب خدمة / مستفيد";
    if (roleId === "super_admin") return "مدير عام النظام";
    if (roleId === "system_admin") return "مدير النظام";
    return roleId;
  };

  const formatDate = (dateVal: any) => {
    if (!dateVal) return "—";
    try {
      const d = new Date(dateVal);
      return d.toLocaleDateString("ar-SA", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return String(dateVal);
    }
  };

  const renderChannelBadge = (channel: string) => {
    switch (channel) {
      case "email":
        return (
          <Badge
            variant="outline"
            className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 text-[11px] gap-1.5 py-0.5 px-2 font-bold shrink-0"
          >
            <Mail className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>البريد الإلكتروني</span>
          </Badge>
        );
      case "sms":
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-[11px] gap-1.5 py-0.5 px-2 font-bold shrink-0"
          >
            <Smartphone className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>رسالة SMS</span>
          </Badge>
        );
      case "whatsapp":
        return (
          <Badge
            variant="outline"
            className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[11px] gap-1.5 py-0.5 px-2 font-bold shrink-0"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>واتساب</span>
          </Badge>
        );
      case "in_app":
      default:
        return (
          <Badge
            variant="outline"
            className="bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800 text-[11px] gap-1.5 py-0.5 px-2 font-bold shrink-0"
          >
            <Bell className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>إشعار الموقع</span>
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* 1. بطاقات الإحصائيات السريعة */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* إجمالي الإشعارات */}
        <Card className="border border-border/50 shadow-2xs rounded-xl bg-card">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold mb-1">
              <span>إجمالي السجلات</span>
              <Layers className="w-3.5 h-3.5 text-primary" />
            </div>
            <p className="text-xl font-black text-foreground font-mono">{stats.total.toLocaleString("ar-SA")}</p>
            <span className="text-[10px] text-muted-foreground">كافة القنوات السابقة والجديدة</span>
          </CardContent>
        </Card>

        {/* إشعارات الموقع */}
        <Card className="border border-sky-200/60 dark:border-sky-900/60 shadow-2xs rounded-xl bg-sky-50/30 dark:bg-sky-950/10">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-sky-700 dark:text-sky-400 text-xs font-semibold mb-1">
              <span>إشعارات الموقع</span>
              <Bell className="w-3.5 h-3.5" />
            </div>
            <p className="text-xl font-black text-sky-800 dark:text-sky-200 font-mono">{stats.inApp.toLocaleString("ar-SA")}</p>
            <span className="text-[10px] text-muted-foreground">إشعارات المنصة والجرس</span>
          </CardContent>
        </Card>

        {/* رسائل SMS */}
        <Card className="border border-amber-200/60 dark:border-amber-900/60 shadow-2xs rounded-xl bg-amber-50/30 dark:bg-amber-950/10">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 text-xs font-semibold mb-1">
              <span>رسائل SMS</span>
              <Smartphone className="w-3.5 h-3.5" />
            </div>
            <p className="text-xl font-black text-amber-800 dark:text-amber-200 font-mono">{stats.sms.toLocaleString("ar-SA")}</p>
            <span className="text-[10px] text-muted-foreground">بوابة الرسائل النصية</span>
          </CardContent>
        </Card>

        {/* البريد الإلكتروني */}
        <Card className="border border-indigo-200/60 dark:border-indigo-900/60 shadow-2xs rounded-xl bg-indigo-50/30 dark:bg-indigo-950/10">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-indigo-700 dark:text-indigo-400 text-xs font-semibold mb-1">
              <span>البريد الإلكتروني</span>
              <Mail className="w-3.5 h-3.5" />
            </div>
            <p className="text-xl font-black text-indigo-800 dark:text-indigo-200 font-mono">{stats.email.toLocaleString("ar-SA")}</p>
            <span className="text-[10px] text-muted-foreground">خادم البريد SMTP</span>
          </CardContent>
        </Card>

        {/* واتساب */}
        <Card className="border border-emerald-200/60 dark:border-emerald-900/60 shadow-2xs rounded-xl bg-emerald-50/30 dark:bg-emerald-950/10">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 text-xs font-semibold mb-1">
              <span>رسائل واتساب</span>
              <MessageSquare className="w-3.5 h-3.5" />
            </div>
            <p className="text-xl font-black text-emerald-800 dark:text-emerald-200 font-mono">{stats.whatsapp.toLocaleString("ar-SA")}</p>
            <span className="text-[10px] text-muted-foreground">بوابة الواتساب</span>
          </CardContent>
        </Card>

        {/* الإرسال المباشر */}
        <Card className="border border-teal-200/60 dark:border-teal-900/60 shadow-2xs rounded-xl bg-teal-50/30 dark:bg-teal-950/10">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-teal-700 dark:text-teal-400 text-xs font-semibold mb-1">
              <span>إرسال يدوي مباشر</span>
              <Send className="w-3.5 h-3.5" />
            </div>
            <p className="text-xl font-black text-teal-800 dark:text-teal-200 font-mono">{stats.direct.toLocaleString("ar-SA")}</p>
            <span className="text-[10px] text-muted-foreground">مرسلة بواسطة المشرفين</span>
          </CardContent>
        </Card>
      </div>

      {/* 2. جدول السجلات وفلاتر البحث */}
      <Card className="border border-border/50 shadow-sm overflow-hidden rounded-xl">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/10 border-b border-border/50 p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm sm:text-base md:text-lg font-bold text-foreground flex items-center gap-2">
                <History className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600 dark:text-teal-400" />
                <span>سجل الإرسال والإشعارات السابق والجديد</span>
              </CardTitle>
              <CardDescription className="text-[11px] sm:text-xs md:text-sm mt-1 leading-relaxed">
                استعرض تفاصيل وقنوات جميع الإشعارات المرسلة مع إمكانية الفلترة الدقيقة حسب القناة والمستقبل.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading || isRefetching}
                className="h-9 text-xs rounded-xl gap-1.5 cursor-pointer font-bold"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isRefetching ? "animate-spin" : ""}`} />
                <span>تحديث السجل</span>
              </Button>
            </div>
          </div>

          {/* شريط الفلاتر والبحث */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-2">
            {/* شريط البحث */}
            <div className="relative sm:col-span-2">
              <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم، الجوال، البريد أو نص الرسالة..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="pr-8 text-xs h-9 rounded-xl border-border/70"
              />
            </div>

            {/* فلتر القناة */}
            <div>
              <Select
                value={channelFilter}
                onValueChange={(val: any) => {
                  setChannelFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="text-xs h-9 rounded-xl border-border/70">
                  <SelectValue placeholder="قناة الإرسال" />
                </SelectTrigger>
                <SelectContent dir="rtl" className="text-xs">
                  <SelectItem value="all">جميع القنوات</SelectItem>
                  <SelectItem value="in_app">إشعار الموقع (In-App)</SelectItem>
                  <SelectItem value="sms">رسائل SMS</SelectItem>
                  <SelectItem value="email">البريد الإلكتروني (Email)</SelectItem>
                  <SelectItem value="whatsapp">واتساب (WhatsApp)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* فلتر المصدر */}
            <div>
              <Select
                value={sourceFilter}
                onValueChange={(val: any) => {
                  setSourceFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="text-xs h-9 rounded-xl border-border/70">
                  <SelectValue placeholder="نوع الإرسال" />
                </SelectTrigger>
                <SelectContent dir="rtl" className="text-xs">
                  <SelectItem value="all">جميع المصادر</SelectItem>
                  <SelectItem value="direct">إرسال يدوي مباشر</SelectItem>
                  <SelectItem value="system">تنبيه آلي من النظام</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* زر تفريغ الفلاتر */}
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="w-full h-9 text-xs text-muted-foreground hover:text-foreground rounded-xl cursor-pointer"
              >
                <X className="w-3.5 h-3.5 ml-1" />
                <span>إعادة ضبط الفلاتر</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              <span className="text-xs sm:text-sm font-semibold">جاري تحميل سجلات الإرسال...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-xs sm:text-sm">
              لا توجد سجلات إرسال مطابقة للبحث أو الفلاتر المحددة.
            </div>
          ) : (
            <>
              <div className="w-full overflow-x-auto scrollbar-thin">
                <Table className="min-w-[750px]">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent bg-slate-50/40 dark:bg-slate-950/20 border-b border-border/40 text-foreground font-bold">
                      <TableHead className="w-14 text-center py-3 px-3 text-xs">#</TableHead>
                      <TableHead className="text-right py-3 px-3 text-xs w-36">قناة الإرسال</TableHead>
                      <TableHead className="text-right py-3 px-3 text-xs min-w-[170px]">المستقبل</TableHead>
                      <TableHead className="text-right py-3 px-3 text-xs min-w-[280px]">نص الرسالة</TableHead>
                      <TableHead className="text-right py-3 px-3 text-xs w-36">تاريخ الإرسال</TableHead>
                      <TableHead className="text-center py-3 px-3 text-xs w-16">معاينة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border/40">
                    {logs.map((item: any, idx: number) => {
                      const rowNum = (page - 1) * itemsPerPage + idx + 1;

                      return (
                        <TableRow
                          key={item.id}
                          className="hover:bg-muted/30 transition-colors cursor-pointer text-xs"
                          onClick={() => setSelectedLog(item)}
                        >
                          {/* الرقم التسلسلي */}
                          <TableCell className="text-center py-3 px-3 font-mono text-muted-foreground">
                            {rowNum}
                          </TableCell>

                          {/* قناة الإرسال */}
                          <TableCell className="py-3 px-3">
                            {renderChannelBadge(item.channel)}
                          </TableCell>

                          {/* المستقبل */}
                          <TableCell className="py-3 px-3">
                            <div className="font-bold text-foreground truncate max-w-[200px]" title={item.recipientName || "—"}>
                              {item.recipientName || "مستخدم غير محدد"}
                            </div>
                          </TableCell>

                          {/* نص الرسالة */}
                          <TableCell className="py-3 px-3">
                            <p className="text-foreground/90 font-medium line-clamp-2 leading-relaxed" title={item.message}>
                              {item.message}
                            </p>
                          </TableCell>

                          {/* تاريخ الإرسال */}
                          <TableCell className="py-3 px-3 text-muted-foreground whitespace-nowrap text-[11px]">
                            {formatDate(item.createdAt)}
                          </TableCell>

                          {/* زر المعاينة */}
                          <TableCell className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedLog(item)}
                              className="w-7 h-7 text-muted-foreground hover:text-teal-600 cursor-pointer"
                              title="عرض تفاصيل الإشعار"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>


              {totalPages > 1 && (
                <EnhancedPagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  itemName="إشعار"
                  itemNamePlural="إشعارات"
                  className="border-t border-border/40 bg-slate-50/30 dark:bg-slate-900/10 px-4 py-3 sm:px-6"
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* مودال عرض تفاصيل الإشعار المسجل */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-xl text-right" dir="rtl" showCloseButton={false}>
          <DialogClose className="absolute top-4 sm:top-5 left-4 sm:left-5 text-muted-foreground hover:text-foreground opacity-75 hover:opacity-100 transition-all rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent hover:border-border/40 focus:outline-none select-none active:scale-95 shadow-xs cursor-pointer">
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="sr-only">إغلاق</span>
          </DialogClose>

          <DialogHeader className="text-right">
            <div className="flex items-center gap-2 mb-1">
              {selectedLog && renderChannelBadge(selectedLog.channel)}
              <Badge variant="outline" className="text-[10px] py-0 px-2">
                سجل #{selectedLog?.id}
              </Badge>
            </div>
            <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
              {selectedLog?.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              تاريخ الإرسال: {formatDate(selectedLog?.createdAt)}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4 my-2 text-right">
              {/* بيانات المستقبل */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-border/50 space-y-1.5 text-xs">
                <span className="font-bold text-foreground block">بيانات المستقبل:</span>
                <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                  <div>
                    <span className="font-medium text-foreground ml-1">الاسم:</span>
                    <span>{selectedLog.recipientName || "—"}</span>
                  </div>
                  <div>
                    <span className="font-medium text-foreground ml-1">الدور:</span>
                    <span>{getRoleTitle(selectedLog.recipientRole)}</span>
                  </div>
                  {selectedLog.recipientPhone && (
                    <div>
                      <span className="font-medium text-foreground ml-1">الجوال:</span>
                      <span dir="ltr" className="font-mono">{selectedLog.recipientPhone}</span>
                    </div>
                  )}
                  {selectedLog.recipientEmail && (
                    <div>
                      <span className="font-medium text-foreground ml-1">البريد:</span>
                      <span dir="ltr" className="font-mono">{selectedLog.recipientEmail}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* نص الرسالة */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground block">
                    نص الإشعار المرسل:
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => copyText(selectedLog.message)}
                    className="h-6 text-[11px] px-2 gap-1 text-teal-600 hover:text-teal-700 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>نسخ النص</span>
                  </Button>
                </div>
                <div className="p-3.5 bg-background rounded-xl border border-border text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-wrap select-text text-foreground">
                  {selectedLog.message}
                </div>
              </div>

              {/* معلومات القراءة والتسليم */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-muted/30 rounded-xl text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold">حالة التفاعل:</span>
                  <span>
                    {selectedLog.channel === "in_app"
                      ? selectedLog.isRead
                        ? `مقروء من قِبل المستخدم (${formatDate(selectedLog.readAt)})`
                        : "لم يُقرأ بعد"
                      : "تم الإرسال بنجاح عبر البوابة"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
