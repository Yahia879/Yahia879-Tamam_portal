import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import EnhancedPagination from "@/components/EnhancedPagination";
import {
  Send,
  Users,
  Shield,
  HeartHandshake,
  Search,
  Bell,
  MessageSquare,
  Mail,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  User,
  X,
  RefreshCw,
  Eye,
  Info,
  Check
} from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface RecipientItem {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  category: "beneficiary" | "staff";
  roleTitle?: string;
  extraInfo?: string;
}

export default function DirectNotificationTab({
  dbRoles
}: {
  dbRoles?: Array<{ id: string; nameAr: string; isSystem?: boolean }>;
}) {
  // فئة المستقبل: المستفيدين أو المسؤولين
  const [activeCategory, setActiveCategory] = useState<"beneficiary" | "staff">("beneficiary");

  // المستقبل المحدد
  const [selectedRecipient, setSelectedRecipient] = useState<RecipientItem | null>(null);

  // البحث والصفحات
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const itemsPerPage = 6;

  // قنوات الإرسال الأربعة
  const [channels, setChannels] = useState({
    in_app: true,
    whatsapp: true,
    email: false,
    sms: false
  });

  // الحقول المخصصة للرسالة
  const [title, setTitle] = useState("إشعار إداري من إدارة البوابة");
  const [message, setMessage] = useState("");

  // جلب بيانات المستفيدين
  const {
    data: beneficiaries,
    isLoading: isLoadingBeneficiaries,
    refetch: refetchBeneficiaries
  } = trpc.notifications.getBeneficiaryRecipients.useQuery();

  // جلب بيانات المسؤولين والموظفين
  const {
    data: staffUsers,
    isLoading: isLoadingStaff,
    refetch: refetchStaff
  } = trpc.users.getStaffUsers.useQuery();

  // طفرة إرسال الإشعار
  const sendMutation = trpc.notifications.sendCustomNotification.useMutation({
    onSuccess: (res) => {
      const sentList: string[] = [];
      if (res.sentChannels.in_app) sentList.push("إشعار الموقع");
      if (res.sentChannels.whatsapp) sentList.push("واتساب");
      if (res.sentChannels.email) sentList.push("البريد الإلكتروني");
      if (res.sentChannels.sms) sentList.push("SMS");

      toast.success(
        `تم إرسال الإشعار بنجاح إلى ${res.recipientName} عبر (${sentList.join("، ")})`
      );

      if (res.warnings && res.warnings.length > 0) {
        res.warnings.forEach((w: string) => {
          toast.warning(w, { duration: 6000 });
        });
      }

      // إعادة ضبط الحقول جزئياً مع بقاء المستقبل لتسهيل التجربة أو التعيين
      setMessage("");
    },
    onError: (err) => {
      const msg = err.message || "";
      toast.error(
        /unexpect|<|token|json/i.test(msg)
          ? "حدث خطأ أثناء إرسال الإشعار"
          : msg || "حدث خطأ أثناء إرسال الإشعار"
      );
    }
  });

  // تحويل المستفيدين إلى صيغة موحدة
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
        extraInfo: b.city ? `المدينة: ${b.city}` : undefined
      };
    });
  }, [beneficiaries]);

  // تحويل المسؤولين إلى صيغة موحدة
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
        extraInfo: s.status === "active" ? "حساب نشط" : undefined
      };
    });
  }, [staffUsers, dbRoles]);

  // القائمة الحالية بناءً على التبويب المختار مع التصفية بالبحث
  const currentList = activeCategory === "beneficiary" ? formattedBeneficiaries : formattedStaff;

  const filteredRecipients = useMemo(() => {
    if (!searchTerm.trim()) return currentList;
    const term = searchTerm.toLowerCase().trim();
    return currentList.filter((item) => {
      return (
        item.name.toLowerCase().includes(term) ||
        (item.email && item.email.toLowerCase().includes(term)) ||
        (item.phone && item.phone.includes(term)) ||
        (item.roleTitle && item.roleTitle.toLowerCase().includes(term)) ||
        (item.extraInfo && item.extraInfo.toLowerCase().includes(term))
      );
    });
  }, [currentList, searchTerm]);

  // التقسيم والصفحات
  const totalPages = Math.ceil(filteredRecipients.length / itemsPerPage);
  const paginatedRecipients = useMemo(() => {
    return filteredRecipients.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  }, [filteredRecipients, page, itemsPerPage]);

  // تغيير الفئة وإعادة ضبط الصفحة
  const handleCategoryChange = (cat: "beneficiary" | "staff") => {
    setActiveCategory(cat);
    setSearchTerm("");
    setPage(1);
  };

  // تبديل اختيار المستقبل
  const handleSelectRecipient = (recipient: RecipientItem) => {
    if (selectedRecipient?.id === recipient.id) {
      setSelectedRecipient(null);
    } else {
      setSelectedRecipient(recipient);
    }
  };

  // قوالب الرسائل السريعة
  const quickTemplates = [
    {
      title: "تذكير بمتابعة الطلب",
      text: "مرحباً {اسم_الشخص}، نود تذكيرك بالاطلاع على آخر التحديثات المسجلة على طلبك والمتابعة مع الإدارة عبر البوابة."
    },
    {
      title: "طلب استكمال مستندات",
      text: "السلام عليكم {اسم_الشخص}، نرجو التكرم بالدخول لحسابك واستكمال المستندات والنواقص المطلوبة لمواصلة الإجراءات."
    },
    {
      title: "تنبيه إداري عام",
      text: "نود إفادتكم {اسم_الشخص} بوجود تحديث إداري جديد يخص المعاملات الخاصة بكم، يرجى مراجعة التفاصيل في النظام."
    }
  ];

  // تطبيق قالب سريع
  const applyQuickTemplate = (tpl: { title: string; text: string }) => {
    setTitle(tpl.title);
    setMessage(tpl.text);
  };

  // إدراج وسم اسم المستقبل
  const insertNameTag = () => {
    setMessage((prev) => prev + " {اسم_الشخص}");
  };

  // معالجة نص الرسالة الحقيقي للإرسال أو للمعاينة
  const resolvedMessage = useMemo(() => {
    if (!message) return "";
    const namePlaceholder = selectedRecipient ? selectedRecipient.name : "المستفيد / المسؤول";
    return message.replace(/\{اسم_الشخص\}/g, namePlaceholder);
  }, [message, selectedRecipient]);

  // التحقق من صلاحية الإرسال
  const hasAtLeastOneChannel = channels.in_app || channels.whatsapp || channels.email || channels.sms;
  const isFormValid = selectedRecipient !== null && title.trim().length > 0 && message.trim().length > 0 && hasAtLeastOneChannel;

  // تنفيذ الإرسال
  const handleSendNotification = () => {
    if (!selectedRecipient) {
      toast.error("يرجى تحديد المستقبل أولاً من القائمة");
      return;
    }
    if (!title.trim()) {
      toast.error("يرجى كتابة عنوان للإشعار");
      return;
    }
    if (!message.trim()) {
      toast.error("يرجى كتابة نص الرسالة");
      return;
    }
    if (!hasAtLeastOneChannel) {
      toast.error("يرجى تحديد قناة إرسال واحدة على الأقل من القنوات الأربعة");
      return;
    }

    sendMutation.mutate({
      recipientId: selectedRecipient.id,
      title: title.trim(),
      message: resolvedMessage,
      channels: {
        in_app: channels.in_app,
        whatsapp: channels.whatsapp,
        email: channels.email,
        sms: channels.sms
      }
    });
  };

  const isLoadingData = activeCategory === "beneficiary" ? isLoadingBeneficiaries : isLoadingStaff;

  return (
    <div className="space-y-6" dir="rtl">
      {/* بطاقة الترويسة الرئيسية */}
      <Card className="border border-border/60 bg-gradient-to-br from-slate-50 via-white to-teal-50/20 dark:from-slate-900/60 dark:via-slate-900/40 dark:to-teal-950/20 shadow-sm overflow-hidden rounded-2xl">
        <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-border/40">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 shadow-xs">
                <Send className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg md:text-xl font-bold text-foreground">
                  إرسال إشعار مباشر ومخصص
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  أرسل رسالة مخصصة لشخص محدد (مستفيد أو مسؤول) مع تحديد قنوات الإرسال المرغوبة من القنوات الأربعة المعتمدة
                </CardDescription>
              </div>
            </div>

            {/* مؤشر المستقبل المحدد */}
            {selectedRecipient ? (
              <div className="inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 px-3 py-1.5 rounded-xl text-xs sm:text-sm">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                  المستقبل: <strong className="text-foreground">{selectedRecipient.name}</strong>
                </span>
                <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-white dark:bg-slate-900 border-emerald-300">
                  {selectedRecipient.category === "beneficiary" ? "مستفيد" : "مسؤول"}
                </Badge>
                <button
                  onClick={() => setSelectedRecipient(null)}
                  className="p-1 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                  title="إلغاء التحديد"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <Badge variant="secondary" className="text-[11px] sm:text-xs py-1 px-3 self-start sm:self-auto rounded-lg font-medium text-amber-700 bg-amber-500/10 border-amber-500/20">
                <AlertTriangle className="w-3.5 h-3.5 ml-1 inline text-amber-600" />
                لم يتم تحديد مستقبل بعد
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* الخطوة 1: فئات المستقبلين واختيار الشخص */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-600 text-white text-xs font-bold shadow-xs">
              1
            </span>
            <h3 className="text-sm sm:text-base font-bold text-foreground">
              تحديد المستقبل: اختر الفئة ثم حدد شخصاً واحداً
            </h3>
          </div>
          <span className="text-xs text-muted-foreground">
            {activeCategory === "beneficiary" ? "المستفيدين وطالبي الخدمة" : "المسؤولين وفريق العمل"}
          </span>
        </div>

        {/* كروت اختيار الفئتين المنفصلتين */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* فئة المستفيدين */}
          <button
            type="button"
            onClick={() => handleCategoryChange("beneficiary")}
            className={`text-right p-4 rounded-2xl border transition-all duration-200 relative overflow-hidden group active:scale-[0.99] ${
              activeCategory === "beneficiary"
                ? "bg-teal-50/80 dark:bg-teal-950/20 border-teal-500 ring-2 ring-teal-500/20 shadow-md"
                : "bg-card hover:bg-slate-50 dark:hover:bg-slate-900/50 border-border/70 hover:border-border"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`p-3 rounded-xl transition-colors ${
                    activeCategory === "beneficiary"
                      ? "bg-teal-600 text-white shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-muted-foreground group-hover:text-teal-600"
                  }`}
                >
                  <HeartHandshake className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm sm:text-base text-foreground flex items-center gap-2">
                    فئة المستفيدين
                    {activeCategory === "beneficiary" && (
                      <Badge className="bg-teal-600 text-white text-[10px] py-0 px-1.5">مفعلة</Badge>
                    )}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    طالبي الخدمة وأئمة ومؤذني ومسؤولي المساجد المسجلين
                  </p>
                </div>
              </div>

              <div className="text-left">
                <span className="text-xs font-bold text-teal-600 dark:text-teal-400 bg-teal-500/10 px-2.5 py-1 rounded-lg border border-teal-500/20 inline-block">
                  {formattedBeneficiaries.length} مستفيد
                </span>
              </div>
            </div>

            {activeCategory === "beneficiary" && (
              <div className="absolute top-2 left-2 text-teal-600 dark:text-teal-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            )}
          </button>

          {/* فئة المسؤولين */}
          <button
            type="button"
            onClick={() => handleCategoryChange("staff")}
            className={`text-right p-4 rounded-2xl border transition-all duration-200 relative overflow-hidden group active:scale-[0.99] ${
              activeCategory === "staff"
                ? "bg-blue-50/80 dark:bg-blue-950/20 border-blue-500 ring-2 ring-blue-500/20 shadow-md"
                : "bg-card hover:bg-slate-50 dark:hover:bg-slate-900/50 border-border/70 hover:border-border"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`p-3 rounded-xl transition-colors ${
                    activeCategory === "staff"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-muted-foreground group-hover:text-blue-600"
                  }`}
                >
                  <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm sm:text-base text-foreground flex items-center gap-2">
                    فئة المسؤولين
                    {activeCategory === "staff" && (
                      <Badge className="bg-blue-600 text-white text-[10px] py-0 px-1.5">مفعلة</Badge>
                    )}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    الإدارة العامة، مدراء المشاريع، والفرق الميدانية والاستجابة
                  </p>
                </div>
              </div>

              <div className="text-left">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20 inline-block">
                  {formattedStaff.length} مسؤول
                </span>
              </div>
            </div>

            {activeCategory === "staff" && (
              <div className="absolute top-2 left-2 text-blue-600 dark:text-blue-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            )}
          </button>
        </div>

        {/* بطاقة قائمة الأشخاص مع شريط البحث */}
        <Card className="border border-border/60 shadow-xs overflow-hidden rounded-2xl">
          <CardHeader className="bg-slate-50/60 dark:bg-slate-900/30 p-4 border-b border-border/40">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={
                    activeCategory === "beneficiary"
                      ? "ابحث باسم المستفيد، رقم الجوال، أو البريد..."
                      : "ابحث باسم المسؤول، المسمى الوظيفي، أو البريد..."
                  }
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  className="pr-9 pl-3 text-xs sm:text-sm bg-background border-border/70 rounded-xl focus-visible:ring-teal-500/20"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>
                  إجمالي النتائج: <strong className="text-foreground">{filteredRecipients.length}</strong>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (activeCategory === "beneficiary") refetchBeneficiaries();
                    else refetchStaff();
                  }}
                  className="h-8 px-2 text-muted-foreground hover:text-foreground"
                  title="تحديث القائمة"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-3 sm:p-4">
            {isLoadingData ? (
              <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                <span className="text-xs sm:text-sm">جاري تحميل قائمة الأشخاص...</span>
              </div>
            ) : filteredRecipients.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs sm:text-sm bg-muted/20 rounded-xl border border-dashed border-border/60">
                {searchTerm ? "لا توجد نتائج مطابقة لبحثك." : "لا يوجد أشخاص مسجلين في هذه الفئة حالياً."}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
                {paginatedRecipients.map((person) => {
                  const isSelected = selectedRecipient?.id === person.id;
                  const hasPhone = Boolean(person.phone);
                  const hasEmail = Boolean(person.email);

                  return (
                    <div
                      key={person.id}
                      onClick={() => handleSelectRecipient(person)}
                      className={`cursor-pointer p-3 sm:p-3.5 rounded-xl border transition-all duration-200 select-none text-right relative ${
                        isSelected
                          ? "bg-teal-50/90 dark:bg-teal-950/30 border-teal-500 ring-2 ring-teal-500/20 shadow-sm"
                          : "bg-card hover:bg-slate-50 dark:hover:bg-slate-900/40 border-border/70 hover:border-teal-500/40"
                      }`}
                    >
                      {/* رأس كرت الشخص: الاسم وراديو الاختيار */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* صورة / رمز الأفاتار */}
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                              isSelected
                                ? "bg-teal-600 text-white shadow-xs"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {person.name ? person.name.slice(0, 2) : <User className="w-4 h-4" />}
                          </div>

                          <div className="min-w-0">
                            <h5 className="font-bold text-xs sm:text-sm text-foreground truncate" title={person.name}>
                              {person.name}
                            </h5>
                            <span className="text-[11px] text-muted-foreground block truncate">
                              {person.roleTitle}
                            </span>
                          </div>
                        </div>

                        {/* مؤشر الراديو / التحديد الفردي */}
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                            isSelected
                              ? "border-teal-600 bg-teal-600 text-white shadow-xs"
                              : "border-muted-foreground/40 bg-background"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>

                      {/* شريط معلومات الاتصال والجاهزية */}
                      <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between text-[11px] gap-2">
                        <div className="flex items-center gap-1.5 truncate">
                          {hasPhone ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded text-[10px] font-mono" dir="ltr">
                              <MessageSquare className="w-2.5 h-2.5 text-emerald-600" />
                              {person.phone}
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">
                              لا يوجد هاتف
                            </span>
                          )}

                          {hasEmail ? (
                            <span className="inline-flex items-center gap-1 text-blue-700 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded text-[10px]" title={person.email || ""}>
                              <Mail className="w-2.5 h-2.5 text-blue-600" />
                              بريد متوفر
                            </span>
                          ) : null}
                        </div>

                        {person.extraInfo && (
                          <span className="text-[10px] text-muted-foreground truncate shrink-0">
                            {person.extraInfo}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ترقيم الصفحات */}
            {totalPages > 1 && (
              <div className="mt-4 pt-2">
                <EnhancedPagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  itemName="شخص"
                  itemNamePlural="أشخاص"
                  className="border-t border-border/40 bg-slate-50/30 dark:bg-slate-900/10 px-4 py-2.5 rounded-xl"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* الخطوة 2: تحديد طرق ووسائل الإرسال */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-600 text-white text-xs font-bold shadow-xs">
              2
            </span>
            <h3 className="text-sm sm:text-base font-bold text-foreground">
              طرق ووسائل الإرسال (حدد القنوات المطلوبة من بين الطرق الأربعة)
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setChannels({ in_app: true, whatsapp: true, email: true, sms: true })}
              className="text-[11px] font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400 hover:underline"
            >
              تحديد الكل
            </button>
            <span className="text-muted-foreground text-xs">•</span>
            <button
              type="button"
              onClick={() => setChannels({ in_app: true, whatsapp: false, email: false, sms: false })}
              className="text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:underline"
            >
              المنصة فقط
            </button>
          </div>
        </div>

        {/* الكروت الأربعة لطرق الإرسال */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. إشعارات الموقع */}
          <div
            onClick={() => setChannels((p) => ({ ...p, in_app: !p.in_app }))}
            className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer select-none text-right flex flex-col justify-between ${
              channels.in_app
                ? "bg-teal-50/80 dark:bg-teal-950/20 border-teal-500 shadow-xs"
                : "bg-card border-border/70 hover:bg-slate-50 dark:hover:bg-slate-900/30 opacity-75"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                  <Bell className="w-4.5 h-4.5" />
                </div>
                <Switch
                  checked={channels.in_app}
                  onCheckedChange={(val) => setChannels((p) => ({ ...p, in_app: val }))}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <h4 className="font-bold text-xs sm:text-sm text-foreground">إشعارات الموقع (In-App)</h4>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                إشعار فوري داخل جرس إشعارات النظام في البوابة.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-border/40 text-[10px] text-teal-700 dark:text-teal-400 font-medium">
              ✓ متاح لجميع الحسابات تلقائياً
            </div>
          </div>

          {/* 2. رسائل الواتساب */}
          <div
            onClick={() => setChannels((p) => ({ ...p, whatsapp: !p.whatsapp }))}
            className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer select-none text-right flex flex-col justify-between ${
              channels.whatsapp
                ? "bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-500 shadow-xs"
                : "bg-card border-border/70 hover:bg-slate-50 dark:hover:bg-slate-900/30 opacity-75"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <MessageSquare className="w-4.5 h-4.5" />
                </div>
                <Switch
                  checked={channels.whatsapp}
                  onCheckedChange={(val) => setChannels((p) => ({ ...p, whatsapp: val }))}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <h4 className="font-bold text-xs sm:text-sm text-foreground">رسائل واتساب (WhatsApp)</h4>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                إرسال رسالة مباشرة للمستقبل عبر خدمة الواتساب المعتمدة.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-border/40 text-[10px]">
              {selectedRecipient?.phone ? (
                <span className="text-emerald-700 dark:text-emerald-400 font-medium truncate block">
                  ✓ رقم الجوال متوفر: {selectedRecipient.phone}
                </span>
              ) : selectedRecipient ? (
                <span className="text-amber-600 font-medium block">
                  ⚠ لا يتوفر رقم جوال للشخص المحدد
                </span>
              ) : (
                <span className="text-muted-foreground block">يتطلب وجود رقم جوال</span>
              )}
            </div>
          </div>

          {/* 3. البريد الإلكتروني */}
          <div
            onClick={() => setChannels((p) => ({ ...p, email: !p.email }))}
            className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer select-none text-right flex flex-col justify-between ${
              channels.email
                ? "bg-blue-50/80 dark:bg-blue-950/20 border-blue-500 shadow-xs"
                : "bg-card border-border/70 hover:bg-slate-50 dark:hover:bg-slate-900/30 opacity-75"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Mail className="w-4.5 h-4.5" />
                </div>
                <Switch
                  checked={channels.email}
                  onCheckedChange={(val) => setChannels((p) => ({ ...p, email: val }))}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <h4 className="font-bold text-xs sm:text-sm text-foreground">البريد الإلكتروني (Email)</h4>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                إرسال رسالة رسمية منسقة إلى البريد الإلكتروني.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-border/40 text-[10px]">
              {selectedRecipient?.email ? (
                <span className="text-blue-700 dark:text-blue-400 font-medium truncate block" title={selectedRecipient.email}>
                  ✓ البريد متوفر: {selectedRecipient.email}
                </span>
              ) : selectedRecipient ? (
                <span className="text-amber-600 font-medium block">
                  ⚠ لا يتوفر بريد للشخص المحدد
                </span>
              ) : (
                <span className="text-muted-foreground block">يتطلب وجود بريد إلكتروني</span>
              )}
            </div>
          </div>

          {/* 4. الرسائل النصية SMS */}
          <div
            onClick={() => setChannels((p) => ({ ...p, sms: !p.sms }))}
            className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer select-none text-right flex flex-col justify-between ${
              channels.sms
                ? "bg-amber-50/80 dark:bg-amber-950/20 border-amber-500 shadow-xs"
                : "bg-card border-border/70 hover:bg-slate-50 dark:hover:bg-slate-900/30 opacity-75"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Smartphone className="w-4.5 h-4.5" />
                </div>
                <Switch
                  checked={channels.sms}
                  onCheckedChange={(val) => setChannels((p) => ({ ...p, sms: val }))}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <h4 className="font-bold text-xs sm:text-sm text-foreground">الرسائل النصية (SMS)</h4>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                إرسال رسالة SMS نصية قصيرة فورية عبر بوابة الرسائل.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-border/40 text-[10px]">
              {selectedRecipient?.phone ? (
                <span className="text-amber-700 dark:text-amber-400 font-medium truncate block">
                  ✓ رقم الجوال متوفر: {selectedRecipient.phone}
                </span>
              ) : selectedRecipient ? (
                <span className="text-amber-600 font-medium block">
                  ⚠ لا يتوفر رقم جوال للشخص المحدد
                </span>
              ) : (
                <span className="text-muted-foreground block">يتطلب وجود رقم جوال</span>
              )}
            </div>
          </div>
        </div>

        {!hasAtLeastOneChannel && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>تنبيه: يجب تحديد وسيلة إرسال واحدة على الأقل من القنوات الأربعة أعلاه لإرسال الإشعار.</span>
          </div>
        )}
      </div>

      {/* الخطوة 3 و 4: كتابة الرسالة والمعاينة الحية */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-600 text-white text-xs font-bold shadow-xs">
            3
          </span>
          <h3 className="text-sm sm:text-base font-bold text-foreground">
            كتابة الرسالة المخصصة والمعاينة المباشرة
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* محرر الرسالة (الجهة اليمنى / 7 أعمدة) */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="border border-border/60 shadow-xs rounded-2xl">
              <CardContent className="p-4 sm:p-5 space-y-4 text-right">
                {/* حقل عنوان الإشعار */}
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-bold text-foreground flex items-center justify-between">
                    <span>عنوان الإشعار (موضوع الرسالة):</span>
                    <span className="text-[11px] text-muted-foreground font-normal">إلزامي</span>
                  </label>
                  <Input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثال: تنبيه هام من إدارة البوابة، تذكير بمتابعة الطلب..."
                    className="text-xs sm:text-sm rounded-xl border-border/70 bg-background focus-visible:ring-teal-500/20"
                  />
                  {/* أزرار عناوين سريعة */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[10px] text-muted-foreground self-center ml-1">اقتراحات:</span>
                    {["تنبيه إداري", "تذكير بمتابعة الطلب", "استكمال المستندات", "إشعار عام"].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setTitle(s)}
                        className="text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-teal-500/10 hover:text-teal-600 px-2 py-0.5 rounded-md border border-border/40 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* حقل نص الرسالة المخصصة */}
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
                    placeholder="اكتب نص الرسالة هنا بكل دقة ووضوح... يمكنك استخدام المتغير {اسم_الشخص} ليتم استبداله تلقائياً باسم المستقبل."
                    rows={6}
                    className="text-xs sm:text-sm rounded-xl border-border/70 bg-background focus-visible:ring-teal-500/20 leading-relaxed resize-y min-h-[140px]"
                  />

                  {/* المتغيرات الديناميكية المساعدة */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={insertNameTag}
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-teal-600 dark:text-teal-400 bg-teal-500/10 hover:bg-teal-500/20 px-2.5 py-1 rounded-lg border border-teal-500/20 transition-all active:scale-95"
                      title="إدراج اسم المستقبل في نص الرسالة"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>إدراج {'{اسم_الشخص}'}</span>
                    </button>

                    <span className="text-[10px] text-muted-foreground">
                      سيتم استبدال الوسم باسم المستقبل تلقائياً
                    </span>
                  </div>
                </div>

                {/* نماذج وقوالب جاهزة سريعة */}
                <div className="pt-2 border-t border-border/40 space-y-2">
                  <span className="text-xs font-bold text-muted-foreground block">
                    نماذج رسائل جاهزة سريعة:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {quickTemplates.map((tpl, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => applyQuickTemplate(tpl)}
                        className="text-right p-2 rounded-xl bg-slate-50 dark:bg-slate-900/40 hover:bg-teal-50 dark:hover:bg-teal-950/20 border border-border/50 hover:border-teal-500/30 transition-all text-xs active:scale-[0.98]"
                      >
                        <span className="font-bold text-foreground block text-[11px]">{tpl.title}</span>
                        <span className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{tpl.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* المعاينة الحية وزر الإرسال (الجهة اليسرى / 5 أعمدة) */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="border border-border/60 shadow-xs rounded-2xl bg-gradient-to-br from-slate-50/70 to-card dark:from-slate-900/40 dark:to-card">
              <CardHeader className="p-4 pb-3 border-b border-border/40">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <Eye className="w-4 h-4 text-teal-600" />
                  <span>معاينة حية للإشعار (كما سيظهر للمستقبل)</span>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4 text-right">
                {/* بطاقة الإشعار الافتراضية كما تظهر في المنصة والجوال */}
                <div className="bg-background rounded-xl p-4 border border-border/80 shadow-xs space-y-3 relative overflow-hidden">
                  <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-500" />

                  {/* ترويسة الإشعار */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
                        <Bell className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 block">
                          بوابة تمام
                        </span>
                        <span className="text-[10px] text-muted-foreground block">
                          إشعار رسمي من الإدارة
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      الآن
                    </span>
                  </div>

                  {/* عنوان الرسالة */}
                  <h4 className="font-bold text-xs sm:text-sm text-foreground">
                    {title || "عنوان الإشعار..."}
                  </h4>

                  {/* نص الرسالة المحلول */}
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap min-h-[60px]">
                    {resolvedMessage || "نص الرسالة المخصصة سيظهر هنا في المعاينة..."}
                  </p>

                  {/* المستقبل وقنوات الإرسال المحددة */}
                  <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>
                      إلى: <strong className="text-foreground">{selectedRecipient?.name || "لم يُحدد بعد"}</strong>
                    </span>

                    <div className="flex items-center gap-1.5">
                      {channels.in_app && <span title="إشعار الموقع"><Bell className="w-3.5 h-3.5 text-teal-600" /></span>}
                      {channels.whatsapp && <span title="واتساب"><MessageSquare className="w-3.5 h-3.5 text-emerald-600" /></span>}
                      {channels.email && <span title="البريد"><Mail className="w-3.5 h-3.5 text-blue-600" /></span>}
                      {channels.sms && <span title="SMS"><Smartphone className="w-3.5 h-3.5 text-amber-600" /></span>}
                    </div>
                  </div>
                </div>

                {/* ملخص الإرسال قبل التأكيد */}
                <div className="space-y-1.5 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-border/40 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">المستقبل:</span>
                    <span className="font-bold text-foreground">
                      {selectedRecipient ? `${selectedRecipient.name} (${selectedRecipient.category === "beneficiary" ? "مستفيد" : "مسؤول"})` : "لم يُحدد بعد"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">القنوات المفعلة:</span>
                    <span className="font-semibold text-teal-600 dark:text-teal-400">
                      {[
                        channels.in_app ? "إشعار الموقع" : null,
                        channels.whatsapp ? "واتساب" : null,
                        channels.email ? "البريد الإلكتروني" : null,
                        channels.sms ? "SMS" : null
                      ]
                        .filter(Boolean)
                        .join(" + ") || "لا توجد قناة محددة"}
                    </span>
                  </div>
                </div>

                {/* زر الإرسال الرئيسي */}
                <Button
                  onClick={handleSendNotification}
                  disabled={!isFormValid || sendMutation.isPending}
                  className="w-full bg-teal-600 hover:bg-teal-700 dark:bg-teal-700 dark:hover:bg-teal-600 text-white font-bold py-3 text-xs sm:text-sm rounded-xl shadow-md transition-all active:scale-[0.98] gap-2 h-auto"
                >
                  {sendMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      <span>جاري إرسال الإشعار...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>إرسال الإشعار الآن</span>
                    </>
                  )}
                </Button>

                {!selectedRecipient && (
                  <p className="text-[10px] text-center text-amber-600 dark:text-amber-400 font-medium">
                    * يرجى اختيار المستقبل أولاً من الخطوة 1 لتفعيل زر الإرسال
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
