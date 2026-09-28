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
  MessageSquare,
  Mail,
  Smartphone,
  Check,
  X,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

  // المستقبل المحدد (شخص واحد فقط)
  const [selectedRecipient, setSelectedRecipient] = useState<RecipientItem | null>(null);

  // البحث والصفحات
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;

  // القنوات الأربعة
  const [channels, setChannels] = useState({
    in_app: true,
    whatsapp: true,
    email: false,
    sms: false
  });

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
      const sentChannelsList: string[] = [];
      if (res.sentChannels.in_app) sentChannelsList.push("الموقع");
      if (res.sentChannels.whatsapp) sentChannelsList.push("واتساب");
      if (res.sentChannels.email) sentChannelsList.push("البريد");
      if (res.sentChannels.sms) sentChannelsList.push("SMS");

      toast.success(
        `تم إرسال الإشعار بنجاح إلى "${res.recipientName}" عبر: ${sentChannelsList.join("، ")}`
      );

      if (res.warnings && res.warnings.length > 0) {
        res.warnings.forEach((warn) => toast.warning(warn, { duration: 5000 }));
      }

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

  const handleSelectRecipient = (recipient: RecipientItem) => {
    if (selectedRecipient?.id === recipient.id) {
      setSelectedRecipient(null);
    } else {
      setSelectedRecipient(recipient);
    }
  };

  const hasChannel = channels.in_app || channels.whatsapp || channels.email || channels.sms;
  const isFormValid =
    selectedRecipient !== null &&
    title.trim().length > 0 &&
    message.trim().length > 0 &&
    hasChannel;

  const handleSend = () => {
    if (!selectedRecipient) {
      toast.error("يرجى تحديد المستقبل أولاً من الجدول أعلاه");
      return;
    }
    if (!hasChannel) {
      toast.error("يرجى اختيار طريقة إرسال واحدة على الأقل من الطرق الأربعة");
      return;
    }
    if (!title.trim()) {
      toast.error("يرجى إدخال عنوان الإشعار");
      return;
    }
    if (!message.trim()) {
      toast.error("يرجى كتابة نص الرسالة");
      return;
    }

    sendMutation.mutate({
      recipientId: selectedRecipient.id,
      title: title.trim(),
      message: message.trim(),
      channels
    });
  };

  const isLoading = activeCategory === "beneficiary" ? isLoadingBeneficiaries : isLoadingStaff;

  return (
    <div className="space-y-6" dir="rtl">
      {/* 1. جدول عرض وتحديد المستقبلين */}
      <Card className="border border-border/50 shadow-sm overflow-hidden rounded-xl">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/10 border-b border-border/50 p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-sm sm:text-base md:text-lg font-bold text-foreground">
                تحديد المستقبل (المستفيدين والمسؤولين)
              </CardTitle>
              <CardDescription className="text-[11px] sm:text-xs md:text-sm mt-1 leading-relaxed">
                اختر الفئة، ثم حدد شخصاً واحداً من الجدول أدناه لإرسال الإشعار المخصص له.
              </CardDescription>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {/* تبديل الفئتين بطريقة النظام */}
              <div className="flex p-1 bg-muted/80 dark:bg-slate-800/80 rounded-xl border border-border/60">
                <button
                  type="button"
                  onClick={() => handleCategorySwitch("beneficiary")}
                  className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
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
                  className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
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
                <Table className="min-w-[650px]">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent bg-slate-50/30 dark:bg-slate-950/10 border-b border-border/40">
                      <TableHead className="w-16 text-center py-3 text-xs sm:text-sm font-bold text-foreground">
                        تحديد
                      </TableHead>
                      <TableHead className="text-right font-bold py-3 text-xs sm:text-sm text-foreground">
                        الاسم
                      </TableHead>
                      <TableHead className="text-right font-bold py-3 text-xs sm:text-sm text-foreground">
                        {activeCategory === "beneficiary" ? "الصفة / الحساب" : "الدور الوظيفي"}
                      </TableHead>
                      <TableHead className="text-right font-bold py-3 text-xs sm:text-sm text-foreground">
                        رقم الجوال
                      </TableHead>
                      <TableHead className="text-right font-bold py-3 text-xs sm:text-sm text-foreground">
                        البريد الإلكتروني
                      </TableHead>
                      <TableHead className="text-center font-bold py-3 text-xs sm:text-sm text-foreground pl-4">
                        الحالة
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border/40">
                    {paginatedRecipients.map((recipient) => {
                      const isSelected = selectedRecipient?.id === recipient.id;

                      return (
                        <TableRow
                          key={recipient.id}
                          onClick={() => handleSelectRecipient(recipient)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-teal-50/90 dark:bg-teal-950/30 font-medium border-r-4 border-r-teal-600"
                              : "hover:bg-muted/20"
                          }`}
                        >
                          {/* مؤشر الراديو للاختيار الفردي */}
                          <TableCell className="text-center py-3">
                            <div
                              className={`w-4 h-4 mx-auto rounded-full border-2 flex items-center justify-center transition-all ${
                                isSelected
                                  ? "border-teal-600 bg-teal-600 text-white"
                                  : "border-muted-foreground/40 bg-background"
                              }`}
                            >
                              {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </div>
                          </TableCell>

                          {/* الاسم */}
                          <TableCell className="py-3 text-xs sm:text-sm font-semibold text-foreground">
                            {recipient.name}
                            {recipient.city && (
                              <span className="text-[10px] text-muted-foreground mr-1.5 font-normal">
                                ({recipient.city})
                              </span>
                            )}
                          </TableCell>

                          {/* الدور أو الصفة */}
                          <TableCell className="py-3 text-xs sm:text-sm">
                            <Badge
                              variant="outline"
                              className={`text-[10px] py-0.5 px-2 rounded-full border font-bold ${recipient.roleBadgeColor}`}
                            >
                              {recipient.roleTitle}
                            </Badge>
                          </TableCell>

                          {/* رقم الجوال */}
                          <TableCell className="py-3 text-xs sm:text-sm text-muted-foreground font-mono" dir="ltr">
                            {recipient.phone || "—"}
                          </TableCell>

                          {/* البريد الإلكتروني */}
                          <TableCell className="py-3 text-xs sm:text-sm text-muted-foreground">
                            {recipient.email || "—"}
                          </TableCell>

                          {/* الحالة */}
                          <TableCell className="text-center py-3 pl-4">
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
                كتابة الرسالة وطرق الإرسال
              </CardTitle>
              <CardDescription className="text-[11px] sm:text-xs md:text-sm mt-1 leading-relaxed">
                اختر طرق الإرسال المناسبة من بين الطرق الأربعة، ثم اكتب عنوان ونص الرسالة للإرسال.
              </CardDescription>
            </div>

            {/* شارة الشخص المحدد */}
            {selectedRecipient ? (
              <div className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/30 px-3 py-1.5 rounded-xl text-xs">
                <span className="text-muted-foreground">المستقبل المحدد:</span>
                <span className="font-bold text-teal-700 dark:text-teal-400">{selectedRecipient.name}</span>
                <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                  {selectedRecipient.roleTitle}
                </Badge>
                <button
                  type="button"
                  onClick={() => setSelectedRecipient(null)}
                  className="text-muted-foreground hover:text-red-500 mr-1 p-0.5 rounded transition-colors"
                  title="إلغاء التحديد"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <Badge variant="outline" className="text-amber-600 bg-amber-500/10 border-amber-500/30 text-xs py-1 px-3 self-start sm:self-auto">
                <AlertCircle className="w-3.5 h-3.5 ml-1 inline text-amber-600" />
                لم تحدد أي شخص بعد (انقر على أي سطر في الجدول أعلاه)
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-5">
          {/* طرق الإرسال الأربعة */}
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-bold text-foreground block">
              طرق الإرسال (حدد طريقة واحدة أو أكثر):
            </label>

            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              {/* 1. الموقع */}
              <button
                type="button"
                onClick={() => setChannels((c) => ({ ...c, in_app: !c.in_app }))}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all active:scale-95 ${
                  channels.in_app
                    ? "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30 shadow-xs"
                    : "bg-muted/40 text-muted-foreground border-border/40 hover:bg-muted"
                }`}
              >
                <Bell className="w-4 h-4" />
                <span>إشعار الموقع (In-App)</span>
                {channels.in_app && <Check className="w-3 h-3 text-teal-600 dark:text-teal-400" />}
              </button>

              {/* 2. واتساب */}
              <button
                type="button"
                onClick={() => setChannels((c) => ({ ...c, whatsapp: !c.whatsapp }))}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all active:scale-95 ${
                  channels.whatsapp
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-xs"
                    : "bg-muted/40 text-muted-foreground border-border/40 hover:bg-muted"
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>رسائل واتساب (WhatsApp)</span>
                {channels.whatsapp && <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
              </button>

              {/* 3. البريد الإلكتروني */}
              <button
                type="button"
                onClick={() => setChannels((c) => ({ ...c, email: !c.email }))}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all active:scale-95 ${
                  channels.email
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 shadow-xs"
                    : "bg-muted/40 text-muted-foreground border-border/40 hover:bg-muted"
                }`}
              >
                <Mail className="w-4 h-4" />
                <span>البريد الإلكتروني (Email)</span>
                {channels.email && <Check className="w-3 h-3 text-blue-600 dark:text-blue-400" />}
              </button>

              {/* 4. الرسائل النصية */}
              <button
                type="button"
                onClick={() => setChannels((c) => ({ ...c, sms: !c.sms }))}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all active:scale-95 ${
                  channels.sms
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 shadow-xs"
                    : "bg-muted/40 text-muted-foreground border-border/40 hover:bg-muted"
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>الرسائل النصية (SMS)</span>
                {channels.sms && <Check className="w-3 h-3 text-amber-600 dark:text-amber-400" />}
              </button>
            </div>

            {!hasChannel && (
              <p className="text-[11px] text-red-500 font-semibold mt-1">
                * يجب تحديد وسيلة إرسال واحدة على الأقل من الطرق الأربعة.
              </p>
            )}
          </div>

          {/* عنوان الإشعار */}
          <div className="space-y-1.5">
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
          <div className="flex items-center justify-between pt-2 border-t border-border/40">
            <span className="text-xs text-muted-foreground">
              {selectedRecipient
                ? `سيتم الإرسال إلى: ${selectedRecipient.name}`
                : "يرجى اختيار شخص من الجدول لتفعيل الإرسال"}
            </span>

            <Button
              onClick={handleSend}
              disabled={!isFormValid || sendMutation.isPending}
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs sm:text-sm gap-2 shadow-xs transition-all active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>{sendMutation.isPending ? "جاري الإرسال..." : "إرسال الإشعار"}</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
