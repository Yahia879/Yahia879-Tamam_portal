import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import EnhancedPagination from "@/components/EnhancedPagination";
import {
  Send,
  Shield,
  HeartHandshake,
  Search,
  Bell,
  Mail,
  Smartphone,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
  Users,
  CheckSquare,
  Square,
  Loader2
} from "lucide-react";
import { toast } from "sonner";

interface RecipientItem {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  category: "beneficiary" | "staff";
  roleTitle: string;
  roleBadgeColor?: string;
  city?: string | null;
  status: string;
}

export default function DirectNotificationTab({
  dbRoles
}: {
  dbRoles?: Array<{ id: string; nameAr: string; isSystem?: boolean }>;
}) {
  // فئة المستقبل (المستفيدين أو المسؤولين)
  const [activeCategory, setActiveCategory] = useState<"beneficiary" | "staff">("beneficiary");

  // المستقبلون المحددون (خريطة id -> RecipientItem) لتحديد شخص أو أكثر
  const [selectedRecipients, setSelectedRecipients] = useState<Map<number, RecipientItem>>(new Map());

  // معرّف مهمة الإرسال الجارية في الخلفية لمتابعتها لحظياً
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  // استعلام تتبع حالة مهمة الخلفية لحظياً
  const { data: jobStatus } = trpc.notifications.getNotificationJobStatus.useQuery(
    { jobId: activeJobId || "" },
    {
      enabled: !!activeJobId,
      refetchInterval: (query) => {
        const s = query.state.data?.status;
        if (s === "completed" || s === "failed") {
          return false;
        }
        return 1200; // تحديث سريع لمتابعة التقدم
      },
    }
  );

  // البحث والصفحات
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;

  // طريقة الإرسال المحددة (منصة واحدة فقط)
  const [selectedChannel, setSelectedChannel] = useState<"in_app" | "email" | "sms">("in_app");

  // حقول الرسالة
  const [title, setTitle] = useState("إشعار من إدارة البوابة");
  const [message, setMessage] = useState("");

  // جلب بيانات المستفيدين
  const {
    data: beneficiaries,
    isLoading: isLoadingBeneficiaries
  } = trpc.notifications.getBeneficiaryRecipients.useQuery();

  // جلب بيانات الموظفين والمسؤولين
  const {
    data: staffUsers,
    isLoading: isLoadingStaff
  } = trpc.users.getStaffUsers.useQuery();

  // إجراء إرسال الإشعار
  const sendMutation = trpc.notifications.sendCustomNotification.useMutation({
    onSuccess: (res) => {
      setActiveJobId(res.jobId);

      const sentChannelsList: string[] = [];
      if (res.sentChannels.in_app) sentChannelsList.push("الموقع");
      if (res.sentChannels.email) sentChannelsList.push("البريد");
      if (res.sentChannels.sms) sentChannelsList.push("SMS");

      toast.success(
        `تم بدء إرسال الإشعار إلى ${res.totalRecipients} شخص في الخلفية بنجاح عبر: ${sentChannelsList.join("، ")}`,
        {
          description: "العملية تعمل في الخلفية على السيرفر بأمان؛ لن تنقطع حتى لو أغلقت الصفحة الآن.",
          duration: 7000,
        }
      );

      setMessage("");
    },
    onError: (err) => {
      const msg = err.message || "";
      toast.error(
        /unexpect|<|token|json/i.test(msg)
          ? "حدث خطأ أثناء الإرسال"
          : msg || "حدث خطأ أثناء إرسال الإشعار"
      );
    }
  });

  // قائمة المستفيدين
  const formattedBeneficiaries: RecipientItem[] = useMemo(() => {
    if (!beneficiaries) return [];
    return beneficiaries.map((b) => {
      let roleTitle = "طالب خدمة";
      if (b.requesterType === "imam") roleTitle = "إمام مسجد";
      else if (b.requesterType === "muezzin") roleTitle = "مؤذن";
      else if (b.requesterType === "board_member") roleTitle = "عضو مجلس إدارة";
      else if (b.requesterType) roleTitle = b.requesterType;

      return {
        id: b.id,
        name: b.name,
        email: b.email,
        phone: b.phone,
        category: "beneficiary",
        roleTitle,
        roleBadgeColor: "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20",
        city: b.city,
        status: b.status || "active"
      };
    });
  }, [beneficiaries]);

  // قائمة المسؤولين
  const formattedStaff: RecipientItem[] = useMemo(() => {
    if (!staffUsers) return [];
    return staffUsers.map((s) => {
      const roleObj = dbRoles?.find((r) => r.id === s.role);
      const roleTitle = roleObj?.nameAr || s.role;
      return {
        id: s.id,
        name: s.name,
        email: s.email,
        phone: (s as any).phone || null,
        category: "staff",
        roleTitle,
        roleBadgeColor: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
        status: s.status || "active"
      };
    });
  }, [staffUsers, dbRoles]);

  // تصفية القائمة الحالية بناءً على البحث
  const activeList = activeCategory === "beneficiary" ? formattedBeneficiaries : formattedStaff;

  const filteredRecipients = useMemo(() => {
    if (!searchTerm.trim()) return activeList;
    const term = searchTerm.toLowerCase().trim();
    return activeList.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        (item.email && item.email.toLowerCase().includes(term)) ||
        (item.phone && item.phone.includes(term)) ||
        item.roleTitle.toLowerCase().includes(term)
    );
  }, [activeList, searchTerm]);

  // الترقيم
  const totalPages = Math.ceil(filteredRecipients.length / itemsPerPage);
  const paginatedRecipients = useMemo(() => {
    return filteredRecipients.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  }, [filteredRecipients, page, itemsPerPage]);

  const handleCategorySwitch = (cat: "beneficiary" | "staff") => {
    setActiveCategory(cat);
    setSearchTerm("");
    setPage(1);
  };

  // اختيار أو إلغاء اختيار شخص واحد
  const handleToggleRecipient = (recipient: RecipientItem) => {
    setSelectedRecipients((prev) => {
      const next = new Map(prev);
      if (next.has(recipient.id)) {
        next.delete(recipient.id);
      } else {
        next.set(recipient.id, recipient);
      }
      return next;
    });
  };

  // هل جميع عناصر الصفحة الحالية محددة؟
  const isPageAllSelected =
    paginatedRecipients.length > 0 &&
    paginatedRecipients.every((r) => selectedRecipients.has(r.id));

  // تحديد / إلغاء تحديد الكل في الصفحة الحالية
  const handleToggleSelectPage = () => {
    setSelectedRecipients((prev) => {
      const next = new Map(prev);
      if (isPageAllSelected) {
        paginatedRecipients.forEach((r) => next.delete(r.id));
      } else {
        paginatedRecipients.forEach((r) => next.set(r.id, r));
      }
      return next;
    });
  };

  // هل جميع نتائج البحث محددة؟
  const isFilteredAllSelected =
    filteredRecipients.length > 0 &&
    filteredRecipients.every((r) => selectedRecipients.has(r.id));

  // تحديد / إلغاء تحديد كل نتائج البحث
  const handleToggleSelectAllFiltered = () => {
    setSelectedRecipients((prev) => {
      const next = new Map(prev);
      if (isFilteredAllSelected) {
        filteredRecipients.forEach((r) => next.delete(r.id));
      } else {
        filteredRecipients.forEach((r) => next.set(r.id, r));
      }
      return next;
    });
  };

  // إلغاء تحديد الكل بالكامل
  const handleClearSelection = () => {
    setSelectedRecipients(new Map());
  };

  // إخفاء حقل العنوان عند اختيار الإرسال عبر SMS
  const requiresTitle = selectedChannel !== "sms";

  const isFormValid =
    selectedRecipients.size > 0 &&
    message.trim().length > 0 &&
    (!requiresTitle || title.trim().length > 0);

  const handleSend = () => {
    if (selectedRecipients.size === 0) {
      toast.error("يرجى تحديد شخص واحد على الأقل من الجدول أعلاه");
      return;
    }
    if (requiresTitle && !title.trim()) {
      toast.error("يرجى إدخال عنوان الإشعار");
      return;
    }
    if (!message.trim()) {
      toast.error("يرجى كتابة نص الرسالة");
      return;
    }

    sendMutation.mutate({
      recipientIds: Array.from(selectedRecipients.keys()),
      title: requiresTitle ? title.trim() : "إشعار من إدارة البوابة",
      message: message.trim(),
      channels: {
        in_app: selectedChannel === "in_app",
        whatsapp: false,
        email: selectedChannel === "email",
        sms: selectedChannel === "sms"
      }
    });
  };

  const isLoading = activeCategory === "beneficiary" ? isLoadingBeneficiaries : isLoadingStaff;

  return (
    <div className="space-y-6" dir="rtl">
      {/* بطاقة متابعة مهمة الإرسال في الخلفية عند انطلاقها */}
      {activeJobId && jobStatus && (
        <Card className="border border-teal-500/40 bg-teal-50/70 dark:bg-teal-950/30 shadow-sm rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
          <CardContent className="p-4 sm:p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                {jobStatus.status === "processing" || jobStatus.status === "pending" ? (
                  <Loader2 className="w-5 h-5 text-teal-600 dark:text-teal-400 animate-spin shrink-0" />
                ) : jobStatus.status === "completed" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">
                      {jobStatus.status === "processing" || jobStatus.status === "pending"
                        ? "جاري إرسال الإشعارات في الخلفية..."
                        : jobStatus.status === "completed"
                        ? "اكتمل إرسال الإشعارات بنجاح!"
                        : "اكتملت المهمة مع وجود تنبيهات"}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[11px] font-bold ${
                        jobStatus.status === "completed"
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                          : "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30"
                      }`}
                    >
                      {jobStatus.processedCount} من {jobStatus.totalRecipients} شخص
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground hidden md:inline">
                  تعمل في خلفية السيرفر (Background Worker)
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveJobId(null)}
                  className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-3.5 h-3.5 ml-1" />
                  إغلاق التنبيه
                </Button>
              </div>
            </div>

            {/* شريط التقدم */}
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  jobStatus.status === "completed"
                    ? "bg-emerald-500"
                    : "bg-teal-600 animate-pulse"
                }`}
                style={{
                  width: `${Math.min(
                    100,
                    Math.round((jobStatus.processedCount / Math.max(1, jobStatus.totalRecipients)) * 100)
                  )}%`,
                }}
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground gap-1.5">
              <span className="font-medium">
                💡 <strong className="text-foreground">آمنة تماماً:</strong> العملية تعمل في خلفية الخادم بشكل مستقل، حتى إذا أغلقت هذه الصفحة أو المتصفح الآن ستستمر عمليات الإرسال دون أن تفشل.
              </span>
              <span className="font-mono font-bold text-teal-700 dark:text-teal-400 shrink-0">
                {Math.round((jobStatus.processedCount / Math.max(1, jobStatus.totalRecipients)) * 100)}%
              </span>
            </div>

            {jobStatus.warnings && jobStatus.warnings.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg text-xs text-amber-800 dark:text-amber-300 space-y-1">
                <span className="font-bold block">ملاحظات الإرسال:</span>
                {jobStatus.warnings.map((w, i) => (
                  <p key={i}>• {w}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 1. جدول عرض وتحديد المستقبلين (دعم التحديد الفردي والمتعدد) */}
      <Card className="border border-border/50 shadow-sm overflow-hidden rounded-xl">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/10 border-b border-border/50 p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm sm:text-base md:text-lg font-bold text-foreground">
                  تحديد المستقبلين (المستفيدين والمسؤولين)
                </CardTitle>
                {selectedRecipients.size > 0 && (
                  <Badge variant="outline" className="bg-teal-500/15 text-teal-800 dark:text-teal-300 border-teal-500/30 text-xs font-bold px-2 py-0.5">
                    تم تحديد {selectedRecipients.size} شخص
                  </Badge>
                )}
              </div>
              <CardDescription className="text-[11px] sm:text-xs md:text-sm mt-1 leading-relaxed">
                اختر الفئة، ثم حدد شخصاً واحداً أو أكثر من الجدول لإرسال الإشعار المخصص لهم دفعة واحدة.
              </CardDescription>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {/* تبديل الفئتين */}
              <div className="flex p-1 bg-muted/80 dark:bg-slate-800/80 rounded-xl border border-border/60">
                <button
                  type="button"
                  onClick={() => handleCategorySwitch("beneficiary")}
                  className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeCategory === "beneficiary"
                      ? "bg-white dark:bg-slate-950 text-teal-600 dark:text-teal-400 shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <HeartHandshake className="w-3.5 h-3.5" />
                  <span>المستفيدين ({formattedBeneficiaries.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCategorySwitch("staff")}
                  className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeCategory === "staff"
                      ? "bg-white dark:bg-slate-950 text-teal-600 dark:text-teal-400 shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>المسؤولين ({formattedStaff.length})</span>
                </button>
              </div>

              {/* شريط البحث */}
              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="بحث بالاسم أو الهاتف..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  className="pr-8 text-xs h-9 rounded-xl border-border/70"
                />
              </div>
            </div>
          </div>

          {/* شريط أدوات التحديد السريع */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 mt-3 border-t border-border/40 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleToggleSelectPage}
                className="h-7 text-xs rounded-lg gap-1.5 font-bold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {isPageAllSelected ? (
                  <>
                    <Square className="w-3.5 h-3.5 text-teal-600" />
                    <span>إلغاء تحديد هذه الصفحة ({paginatedRecipients.length})</span>
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-3.5 h-3.5 text-teal-600" />
                    <span>تحديد الصفحة الحالية ({paginatedRecipients.length})</span>
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleToggleSelectAllFiltered}
                className="h-7 text-xs rounded-lg gap-1.5 font-bold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {isFilteredAllSelected ? (
                  <span>إلغاء تحديد كل النتائج</span>
                ) : (
                  <span>تحديد كل نتائج البحث ({filteredRecipients.length})</span>
                )}
              </Button>

              {selectedRecipients.size > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearSelection}
                  className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg gap-1 cursor-pointer font-bold"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>إلغاء التحديد ({selectedRecipients.size})</span>
                </Button>
              )}
            </div>

            <span className="text-[11px] text-muted-foreground">
              يمكنك النقر على أي صف لاختياره أو إلغاء اختياره
            </span>
          </div>

          {/* قائمة الأشخاص المحددين حالياً لمعاينتهم بسهولة */}
          {selectedRecipients.size > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 p-2.5 bg-teal-500/10 dark:bg-teal-950/20 rounded-xl border border-teal-500/20 text-xs mt-2">
              <span className="font-bold text-teal-800 dark:text-teal-300 ml-1 flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                المحددون ({selectedRecipients.size}):
              </span>
              {Array.from(selectedRecipients.values())
                .slice(0, 10)
                .map((r) => (
                  <Badge
                    key={r.id}
                    variant="secondary"
                    className="gap-1 bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-700 text-foreground py-0.5 px-2 font-medium"
                  >
                    <span>{r.name}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleRecipient(r);
                      }}
                      className="text-muted-foreground hover:text-red-500 p-0.5 rounded cursor-pointer transition-colors"
                      title="إزالة"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              {selectedRecipients.size > 10 && (
                <span className="text-muted-foreground text-[11px] font-semibold">
                  +{selectedRecipients.size - 10} آخرين
                </span>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              <span className="text-xs sm:text-sm">جاري تحميل القائمة...</span>
            </div>
          ) : filteredRecipients.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-xs sm:text-sm">
              {searchTerm ? "لا توجد نتائج مطابقة للبحث." : "لا توجد بيانات متاحة."}
            </div>
          ) : (
            <>
              <div className="w-full overflow-x-auto scrollbar-thin">
                <Table className="min-w-[700px]">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent bg-slate-50/30 dark:bg-slate-950/10 border-b border-border/40">
                      <TableHead className="w-14 text-center py-3 px-3">
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={isPageAllSelected}
                            onChange={handleToggleSelectPage}
                            className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer accent-teal-600"
                            title="تحديد أو إلغاء تحديد الصفحة كاملة"
                          />
                        </div>
                      </TableHead>
                      <TableHead className="text-right font-bold py-3 px-4 text-xs sm:text-sm text-foreground">
                        الاسم
                      </TableHead>
                      <TableHead className="text-right font-bold py-3 px-4 text-xs sm:text-sm text-foreground">
                        {activeCategory === "beneficiary" ? "الصفة / الحساب" : "الدور الوظيفي"}
                      </TableHead>
                      <TableHead className="text-right font-bold py-3 px-5 text-xs sm:text-sm text-foreground min-w-[140px]">
                        رقم الجوال
                      </TableHead>
                      <TableHead className="text-right font-bold py-3 px-5 text-xs sm:text-sm text-foreground min-w-[220px]">
                        البريد الإلكتروني
                      </TableHead>
                      <TableHead className="text-center font-bold py-3 px-4 text-xs sm:text-sm text-foreground w-20">
                        الحالة
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border/40">
                    {paginatedRecipients.map((recipient) => {
                      const isSelected = selectedRecipients.has(recipient.id);

                      return (
                        <TableRow
                          key={recipient.id}
                          onClick={() => handleToggleRecipient(recipient)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-teal-50/90 dark:bg-teal-950/30 font-medium border-r-4 border-r-teal-600"
                              : "hover:bg-muted/20"
                          }`}
                        >
                          {/* خانة التحديد المربع (Checkbox) */}
                          <TableCell className="text-center py-3 px-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleRecipient(recipient)}
                                className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer accent-teal-600"
                              />
                            </div>
                          </TableCell>

                          {/* الاسم */}
                          <TableCell className="py-3 px-4 text-xs sm:text-sm font-semibold text-foreground">
                            {recipient.name}
                            {recipient.city && (
                              <span className="text-[10px] text-muted-foreground mr-1.5 font-normal">
                                ({recipient.city})
                              </span>
                            )}
                          </TableCell>

                          {/* الدور أو الصفة */}
                          <TableCell className="py-3 px-4 text-xs sm:text-sm">
                            <Badge
                              variant="outline"
                              className={`text-[10px] py-0.5 px-2 rounded-full border font-bold ${recipient.roleBadgeColor}`}
                            >
                              {recipient.roleTitle}
                            </Badge>
                          </TableCell>

                          {/* رقم الجوال */}
                          <TableCell className="py-3 px-5 text-xs sm:text-sm text-muted-foreground text-right">
                            <span dir="ltr" className="font-mono inline-block">
                              {recipient.phone || "—"}
                            </span>
                          </TableCell>

                          {/* البريد الإلكتروني */}
                          <TableCell className="py-3 px-5 text-xs sm:text-sm text-muted-foreground text-right">
                            <span dir="ltr" className="inline-block truncate max-w-[220px]" title={recipient.email || undefined}>
                              {recipient.email || "—"}
                            </span>
                          </TableCell>

                          {/* الحالة */}
                          <TableCell className="text-center py-3 px-4">
                            <Badge
                              variant="secondary"
                              className="text-[10px] py-0.5 px-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold"
                            >
                              نشط
                            </Badge>
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
                  itemName="شخص"
                  itemNamePlural="أشخاص"
                  className="border-t border-border/40 bg-slate-50/30 dark:bg-slate-900/10 px-4 py-3 sm:px-6"
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 2. كتابة الرسالة وتحديد طرق الإرسال */}
      <Card className="border border-border/50 shadow-sm overflow-hidden rounded-xl">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/10 border-b border-border/50 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm sm:text-base md:text-lg font-bold text-foreground">
                كتابة الرسالة وتحديد منصة الإرسال
              </CardTitle>
              <CardDescription className="text-[11px] sm:text-xs md:text-sm mt-1 leading-relaxed">
                اختر منصة الإرسال، ثم اكتب نص الرسالة لإرسالها لجميع الأشخاص المحددين في الخلفية.
              </CardDescription>
            </div>

            {/* شارة عدد المستقبلين المحددين */}
            {selectedRecipients.size > 0 ? (
              <div className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/30 px-3 py-1.5 rounded-xl text-xs font-bold">
                <Users className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span className="text-muted-foreground">المستقبلون:</span>
                <span className="text-teal-700 dark:text-teal-300">
                  {selectedRecipients.size} شخص محدد
                </span>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="text-muted-foreground hover:text-red-500 mr-1 p-0.5 rounded transition-colors cursor-pointer"
                  title="إلغاء التحديد بالكامل"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <Badge variant="outline" className="text-amber-600 bg-amber-500/10 border-amber-500/30 text-xs py-1 px-3 self-start sm:self-auto font-bold">
                <AlertCircle className="w-3.5 h-3.5 ml-1 inline text-amber-600" />
                لم تحدد أي شخص بعد (حدد شخصاً أو أكثر من الجدول أعلاه)
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-5">
          {/* منصة الإرسال (منصة واحدة فقط) */}
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-bold text-foreground block">
              منصة الإرسال (حدد منصة واحدة فقط):
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* 1. الموقع */}
              <button
                type="button"
                onClick={() => setSelectedChannel("in_app")}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all active:scale-[0.98] cursor-pointer ${
                  selectedChannel === "in_app"
                    ? "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/50 ring-2 ring-teal-500/20 shadow-xs"
                    : "bg-muted/30 text-muted-foreground border-border/40 hover:bg-muted/70 hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>إشعار الموقع (In-App)</span>
                </div>
                <span className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                  selectedChannel === "in_app" ? "border-teal-600 bg-teal-600" : "border-muted-foreground/40 bg-transparent"
                }`}>
                  {selectedChannel === "in_app" && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </span>
              </button>

              {/* 2. البريد الإلكتروني */}
              <button
                type="button"
                onClick={() => setSelectedChannel("email")}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all active:scale-[0.98] cursor-pointer ${
                  selectedChannel === "email"
                    ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/50 ring-2 ring-blue-500/20 shadow-xs"
                    : "bg-muted/30 text-muted-foreground border-border/40 hover:bg-muted/70 hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>البريد الإلكتروني (Email)</span>
                </div>
                <span className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                  selectedChannel === "email" ? "border-blue-600 bg-blue-600" : "border-muted-foreground/40 bg-transparent"
                }`}>
                  {selectedChannel === "email" && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </span>
              </button>

              {/* 3. الرسائل النصية */}
              <button
                type="button"
                onClick={() => setSelectedChannel("sms")}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all active:scale-[0.98] cursor-pointer ${
                  selectedChannel === "sms"
                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/50 ring-2 ring-amber-500/20 shadow-xs"
                    : "bg-muted/30 text-muted-foreground border-border/40 hover:bg-muted/70 hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>الرسائل النصية (SMS)</span>
                </div>
                <span className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                  selectedChannel === "sms" ? "border-amber-600 bg-amber-600" : "border-muted-foreground/40 bg-transparent"
                }`}>
                  {selectedChannel === "sms" && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </span>
              </button>
            </div>
          </div>

          {/* عنوان الإشعار - يظهر فقط إذا تم تحديد قنوات تحتاج عنواناً مثل إشعار الموقع أو البريد، ويختفي تلقائياً عند تحديد SMS فقط */}
          {requiresTitle && (
            <div className="space-y-1.5 transition-all animate-in fade-in duration-200">
              <label className="text-xs sm:text-sm font-bold text-foreground block">
                عنوان الإشعار:
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: تنبيه إداري، تذكير بمتابعة الطلب..."
                className="text-xs sm:text-sm rounded-xl border-border/70 bg-background"
              />
            </div>
          )}

          {/* نص الرسالة المخصصة */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-bold text-foreground">
                نص الرسالة المخصصة:
              </label>
              <span className="text-[11px] text-muted-foreground font-mono">
                {message.length} حرف
              </span>
            </div>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="اكتب نص الرسالة هنا..."
              rows={4}
              className="text-xs sm:text-sm rounded-xl border-border/70 bg-background leading-relaxed"
            />
          </div>

          {/* زر الإرسال */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-border/40">
            <span className="text-xs text-muted-foreground">
              {selectedRecipients.size > 0
                ? `سيتم إرسال نفس الإشعار في الخلفية إلى (${selectedRecipients.size}) شخص.`
                : "يرجى تحديد شخص واحد أو أكثر من الجدول لتفعيل الإرسال."}
            </span>

            <Button
              onClick={handleSend}
              disabled={!isFormValid || sendMutation.isPending}
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs sm:text-sm gap-2 shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {sendMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري إطلاق المهمة في الخلفية...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>
                    إرسال الإشعار {selectedRecipients.size > 0 ? `إلى (${selectedRecipients.size}) شخص` : ""}
                  </span>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
