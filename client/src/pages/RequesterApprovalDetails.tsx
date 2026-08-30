import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { usePermission } from "@/hooks/usePermission";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useLocation } from "wouter";
import {
  User,
  Mail,
  Phone,
  Shield,
  MapPin,
  Calendar,
  ArrowRight,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Maximize2,
  Minimize2,
  Edit,
  Loader2,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

// ترجمة صفة طالب الخدمة
const getRequesterTypeLabel = (type: string | null | undefined) => {
  if (!type) return "غير محدد";
  const types: Record<string, string> = {
    imam: "إمام",
    muezzin: "مؤذن",
    donor: "متبرع",
    other: "أخرى",
  };
  return types[type] || type;
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: "قيد المراجعة", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400", icon: Clock },
  active: { label: "مُعتمد", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle2 },
  suspended: { label: "موقوف", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", icon: XCircle },
  blocked: { label: "محظور", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400", icon: XCircle },
};

const formatDateEnglish = (dateStr: string | Date | null | undefined) => {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}/${month}/${day}`;
  } catch {
    return "—";
  }
};

const getDelayDaysText = (createdAt: string | Date | null | undefined): string => {
  if (!createdAt) return "";
  const date = new Date(createdAt);
  if (isNaN(date.getTime())) return "";
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInDays <= 0) return "اليوم";
  if (diffInDays === 1) return "متأخر يوم واحد";
  if (diffInDays === 2) return "متأخر يومين";
  if (diffInDays >= 3 && diffInDays <= 10) return `متأخر ${diffInDays} أيام`;
  return `متأخر ${diffInDays} يوماً`;
};

interface RequesterApprovalDetailsProps {
  params: {
    id: string;
  };
}

export default function RequesterApprovalDetails({ params }: RequesterApprovalDetailsProps) {
  const userId = parseInt(params.id);
  const [, navigate] = useLocation();
  const { user: currentUser } = useAuth();
  const hasApprovePermission = usePermission("requesters.approve");
  const canApprove = hasApprovePermission;
  const hasEditPermission = usePermission("users.edit");
  const canEdit = hasEditPermission || ["super_admin", "system_admin"].includes(currentUser?.role || "");

  const [fullscreenUrl, setFullscreenUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [notesRequiredType, setNotesRequiredType] = useState("file");
  const [showNotesForm, setShowNotesForm] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);

  // States for user information editing
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editNationalId, setEditNationalId] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editRequesterType, setEditRequesterType] = useState("");
  const [editCustomRequesterType, setEditCustomRequesterType] = useState("");
  const [editCreatedAt, setEditCreatedAt] = useState("");

  const { data: user, isLoading, refetch } = trpc.users.getById.useQuery(
    { id: userId },
    { enabled: !isNaN(userId) }
  );

  // Fetch categories for cities list
  const { data: allCategories = [] } = trpc.categories.getAllCategories.useQuery();
  const cities = useMemo(() => {
    return allCategories
      .filter((cat: any) => (cat.type === "city" || cat.type === "cities") && cat.isActive !== false)
      .sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [allCategories]);

  const formatDateForInput = (dateVal: string | Date | null | undefined) => {
    if (!dateVal) return "";
    const date = new Date(dateVal);
    if (isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    if (user) {
      setNotes(user.adminNotes || "");
      setNotesRequiredType(user.notesRequiredType || "file");
      setEditName(user.name || "");
      setEditEmail(user.email || "");
      setEditPhone(user.phone || "");
      setEditNationalId(user.nationalId || "");
      setEditCity(user.city || "");
      
      const reqType = user.requesterType || "";
      if (["imam", "muezzin", "donor"].includes(reqType)) {
        setEditRequesterType(reqType);
        setEditCustomRequesterType("");
      } else if (reqType) {
        setEditRequesterType("other");
        setEditCustomRequesterType(reqType);
      } else {
        setEditRequesterType("");
        setEditCustomRequesterType("");
      }
      
      setEditCreatedAt(formatDateForInput(user.createdAt));
    }
  }, [user]);

  const utils = trpc.useUtils();

  const toggleStatus = trpc.users.toggleStatus.useMutation({
    onSuccess: async (_, variables) => {
      toast.success(
        variables.status === "active"
          ? "تم اعتماد الحساب بنجاح"
          : "تم رفض/إيقاف الحساب بنجاح"
      );
      await Promise.all([
        utils.users.getById.invalidate({ id: userId }),
        utils.users.getAll.invalidate(),
        refetch(),
      ]);
    },
    onError: (err: any) => {
      toast.error(err.message || "حدث خطأ أثناء تحديث الحساب");
    },
  });

  const updateNotes = trpc.users.updateAdminNotes.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ الملاحظات بنجاح");
      refetch();
    },
    onError: () => {
      toast.error("حدث خطأ أثناء حفظ الملاحظات");
    },
  });

  const updateUserMutation = trpc.users.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث بيانات طالب الخدمة بنجاح");
      setIsEditing(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء تحديث البيانات");
    },
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          <p className="text-muted-foreground text-sm animate-pulse">جاري تحميل تفاصيل الحساب...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!user || user.role !== "service_requester") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 gap-4 px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-950/30 flex items-center justify-center">
            <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-foreground text-lg">المستخدم غير موجود</p>
            <p className="text-muted-foreground text-sm">عذراً، لم يتم العثور على طالب الخدمة المطلوب.</p>
          </div>
          <Button onClick={() => navigate("/requester-approvals")} variant="outline" className="mt-2 font-bold gap-2">
            <ArrowRight className="w-4 h-4" />
            العودة للقائمة
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const statusInfo = statusConfig[user.status ?? "pending"];
  const StatusIcon = statusInfo?.icon ?? Clock;

  const isImageFile = user.proofDocument ? /\.(jpg|jpeg|png|webp)$/i.test(user.proofDocument) : false;
  const isRemarksImage = user.remarksDocument ? /\.(jpg|jpeg|png|webp)$/i.test(user.remarksDocument) : false;
  const isResponseFileType = !!(user.remarksDocument && 
    (user.remarksDocument.startsWith("http") || user.remarksDocument.startsWith("/uploads") || user.remarksDocument.startsWith("/")));
  const isRejectionResponseFileType = !!(user.rejectionResponse && 
    (user.rejectionResponse.startsWith("http") || user.rejectionResponse.startsWith("/uploads") || user.rejectionResponse.startsWith("/")));
  const isRejectionResponseImage = user.rejectionResponse ? /\.(jpg|jpeg|png|webp)$/i.test(user.rejectionResponse) : false;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl px-4 sm:px-0" dir="rtl">
        {/* رأس الصفحة مع زر العودة */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4 text-right min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/requester-approvals")}
              className="rounded-full hover:bg-slate-100 transition-colors shrink-0 h-9 w-9 sm:h-10 sm:w-10"
            >
              <ArrowRight className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
                <User className="w-5.5 h-5.5 text-primary" />
                تفاصيل حساب طالب الخدمة
              </h1>
              <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
                مراجعة بيانات المستخدم والملف المرفق لإثبات الصفة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(user.status ?? "pending") === "pending" && user.createdAt && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800/80 shadow-2xs">
                <Clock className="w-3.5 h-3.5 text-red-500" />
                {getDelayDaysText(user.createdAt)}
              </span>
            )}
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${statusInfo?.color ?? ""}`}>
              <StatusIcon className="w-3.5 h-3.5" />
              {statusInfo?.label ?? user.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* معلومات طالب الخدمة */}
          <Card className="lg:col-span-2 border-slate-200/60 dark:border-slate-800 shadow-lg shadow-slate-200/20 dark:shadow-none rounded-2xl">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex flex-row items-center justify-between">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                البيانات الأساسية للمستخدم
              </CardTitle>
              {canEdit && !isEditing && (
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  size="sm"
                  className="font-bold gap-1 rounded-xl h-9"
                >
                  <Edit className="w-4 h-4" />
                  تعديل البيانات
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {isEditing ? (
                <div className="space-y-6 text-right">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                    {/* الاسم الكامل */}
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground font-medium block">الاسم الكامل *</span>
                      <div className="relative flex items-center">
                        <User className="absolute right-3.5 w-4.5 h-4.5 text-muted-foreground pointer-events-none" />
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-11 border-slate-100 dark:border-slate-800 focus:border-primary/50 bg-slate-50 dark:bg-slate-900 rounded-xl pr-10 pl-3.5 w-full text-sm font-semibold text-foreground"
                        />
                      </div>
                    </div>
                    
                    {/* البريد الإلكتروني */}
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground font-medium block">البريد الإلكتروني *</span>
                      <div className="relative flex items-center" dir="ltr">
                        <Mail className="absolute left-3.5 w-4.5 h-4.5 text-muted-foreground pointer-events-none" />
                        <Input
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="h-11 border-slate-100 dark:border-slate-800 focus:border-primary/50 bg-slate-50 dark:bg-slate-900 rounded-xl pl-10 pr-3.5 w-full text-sm font-semibold text-foreground text-right"
                        />
                      </div>
                    </div>

                    {/* رقم الجوال */}
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground font-medium block">رقم الجوال *</span>
                      <div className="relative flex items-center" dir="ltr">
                        <Phone className="absolute left-3.5 w-4.5 h-4.5 text-muted-foreground pointer-events-none" />
                        <Input
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          className="h-11 border-slate-100 dark:border-slate-800 focus:border-primary/50 bg-slate-50 dark:bg-slate-900 rounded-xl pl-10 pr-3.5 w-full text-sm font-semibold text-foreground text-right"
                        />
                      </div>
                    </div>

                    {/* رقم الهوية الوطنية */}
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground font-medium block">رقم الهوية الوطنية</span>
                      <div className="relative flex items-center">
                        <Shield className="absolute right-3.5 w-4.5 h-4.5 text-muted-foreground pointer-events-none" />
                        <Input
                          value={editNationalId}
                          onChange={(e) => setEditNationalId(e.target.value)}
                          className="h-11 border-slate-100 dark:border-slate-800 focus:border-primary/50 bg-slate-50 dark:bg-slate-900 rounded-xl pr-10 pl-3.5 w-full text-sm font-semibold text-foreground"
                        />
                      </div>
                    </div>

                    {/* المدينة */}
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground font-medium block">المدينة</span>
                      <div className="relative flex items-center">
                        <MapPin className="absolute right-3.5 w-4.5 h-4.5 text-muted-foreground pointer-events-none z-10" />
                        <Select 
                          value={editCity || "none"} 
                          onValueChange={(val) => setEditCity(val === "none" ? "" : val)}
                        >
                          <SelectTrigger dir="rtl" className="h-11 border-slate-100 dark:border-slate-800 focus:border-primary/50 bg-slate-50 dark:bg-slate-900 rounded-xl pr-10 pl-3.5 w-full text-sm font-semibold text-foreground text-right">
                            <SelectValue placeholder="غير محدد" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">غير محدد</SelectItem>
                            {cities.map((city: any) => (
                              <SelectItem key={city.id || city.name} value={city.nameAr || city.name}>
                                {city.nameAr || city.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* صفة طالب الخدمة */}
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground font-medium block">صفة طالب الخدمة</span>
                      <div className="relative flex items-center">
                        <User className="absolute right-3.5 w-4.5 h-4.5 text-muted-foreground pointer-events-none z-10" />
                        <Select 
                          value={editRequesterType || "none"} 
                          onValueChange={(val) => {
                            setEditRequesterType(val === "none" ? "" : val);
                            if (val !== "other") {
                              setEditCustomRequesterType("");
                            }
                          }}
                        >
                          <SelectTrigger dir="rtl" className="h-11 border-slate-100 dark:border-slate-800 focus:border-primary/50 bg-slate-50 dark:bg-slate-900 rounded-xl pr-10 pl-3.5 w-full text-sm font-semibold text-foreground text-right">
                            <SelectValue placeholder="غير محدد" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">غير محدد</SelectItem>
                            <SelectItem value="imam">إمام</SelectItem>
                            <SelectItem value="muezzin">مؤذن</SelectItem>
                            <SelectItem value="donor">متبرع</SelectItem>
                            <SelectItem value="other">أخرى</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* حقل مخصص لصفة طالب الخدمة عند اختيار أخرى */}
                    {editRequesterType === "other" && (
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground font-medium block">اكتب صفة طالب الخدمة الأخرى *</span>
                        <div className="relative flex items-center">
                          <User className="absolute right-3.5 w-4.5 h-4.5 text-muted-foreground pointer-events-none" />
                          <Input
                            value={editCustomRequesterType}
                            onChange={(e) => setEditCustomRequesterType(e.target.value)}
                            placeholder="أدخل الصفة الأخرى"
                            className="h-11 border-slate-100 dark:border-slate-800 focus:border-primary/50 bg-slate-50 dark:bg-slate-900 rounded-xl pr-10 pl-3.5 w-full text-sm font-semibold text-foreground"
                          />
                        </div>
                      </div>
                    )}

                    {/* تاريخ التسجيل */}
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground font-medium block">تاريخ التسجيل</span>
                      <div className="relative flex items-center">
                        <Calendar className="absolute right-3.5 w-4.5 h-4.5 text-muted-foreground pointer-events-none" />
                        <Input
                          type="date"
                          value={editCreatedAt}
                          onChange={(e) => setEditCreatedAt(e.target.value)}
                          className="h-11 border-slate-100 dark:border-slate-800 focus:border-primary/50 bg-slate-50 dark:bg-slate-900 rounded-xl pr-10 pl-3.5 w-full text-sm font-semibold text-foreground [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                    <Button
                      onClick={() => {
                        if (!editName.trim() || !editEmail.trim() || !editPhone.trim()) {
                          toast.error("يرجى ملء الحقول المطلوبة (*)");
                          return;
                        }
                        if (editRequesterType === "other" && !editCustomRequesterType.trim()) {
                          toast.error("يرجى كتابة صفة طالب الخدمة الأخرى");
                          return;
                        }
                        updateUserMutation.mutate({
                          id: user.id,
                          name: editName,
                          email: editEmail,
                          phone: editPhone,
                          nationalId: editNationalId || null,
                          city: editCity || null,
                          requesterType: editRequesterType === "other" ? editCustomRequesterType : (editRequesterType || null),
                          createdAt: editCreatedAt || undefined,
                        });
                      }}
                      disabled={updateUserMutation.isPending}
                      className="bg-primary hover:bg-primary/95 text-white font-bold px-6 h-11 rounded-xl gap-1.5"
                    >
                      {updateUserMutation.isPending ? "جاري الحفظ..." : "حفظ التعديلات"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditName(user.name || "");
                        setEditEmail(user.email || "");
                        setEditPhone(user.phone || "");
                        setEditNationalId(user.nationalId || "");
                        setEditCity(user.city || "");
                        
                        const reqType = user.requesterType || "";
                        if (["imam", "muezzin", "donor"].includes(reqType)) {
                          setEditRequesterType(reqType);
                          setEditCustomRequesterType("");
                        } else if (reqType) {
                          setEditRequesterType("other");
                          setEditCustomRequesterType(reqType);
                        } else {
                          setEditRequesterType("");
                          setEditCustomRequesterType("");
                        }
                        
                        setEditCreatedAt(formatDateForInput(user.createdAt));
                        setIsEditing(false);
                      }}
                      className="font-bold px-6 h-11 rounded-xl"
                    >
                      إلغاء
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 text-right">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium block">الاسم الكامل</span>
                  <span className="text-sm font-semibold flex items-center gap-2 text-foreground bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <User className="w-4.5 h-4.5 text-muted-foreground" />
                    {user.name}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium block">البريد الإلكتروني</span>
                  <span className="text-sm font-semibold flex items-center gap-2 text-foreground bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800" dir="ltr">
                    <Mail className="w-4.5 h-4.5 text-muted-foreground" />
                    {user.email}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium block">رقم الجوال</span>
                  <span className="text-sm font-semibold flex items-center gap-2 text-foreground bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800" dir="ltr">
                    <Phone className="w-4.5 h-4.5 text-muted-foreground" />
                    {user.phone}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium block">رقم الهوية الوطنية</span>
                  <span className="text-sm font-semibold flex items-center gap-2 text-foreground bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <Shield className="w-4.5 h-4.5 text-muted-foreground" />
                    {user.nationalId || "—"}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium block">المدينة</span>
                  <span className="text-sm font-semibold flex items-center gap-2 text-foreground bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <MapPin className="w-4.5 h-4.5 text-muted-foreground" />
                    {user.city || "—"}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium block">صفة طالب الخدمة</span>
                  <span className="text-sm font-semibold flex items-center gap-2 text-foreground bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <Badge variant="outline" className="font-bold border-primary/20 text-primary bg-primary/5 px-2.5 py-0.5">
                      {getRequesterTypeLabel(user.requesterType)}
                    </Badge>
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium block">تاريخ التسجيل</span>
                  <div className="flex items-center justify-between text-sm font-semibold text-foreground bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2" dir="ltr">
                      <Calendar className="w-4.5 h-4.5 text-muted-foreground" />
                      <span>{formatDateEnglish(user.createdAt)}</span>
                    </div>
                    {(user.status ?? "pending") === "pending" && user.createdAt && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-lg border border-red-200 dark:border-red-800">
                        <Clock className="w-3.5 h-3.5 text-red-500" />
                        {getDelayDaysText(user.createdAt)}
                      </span>
                    )}
                  </div>
                </div>
                {user.adminNotes && (
                  <div className="col-span-1 sm:col-span-2 space-y-1 bg-amber-50/50 dark:bg-amber-950/10 p-3.5 rounded-xl border border-amber-200/50 dark:border-amber-900/30">
                    <span className="text-xs text-amber-800 dark:text-amber-400 font-bold block">ملاحظات الإدارة:</span>
                    <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-semibold leading-relaxed">
                      {user.adminNotes}
                    </p>
                  </div>
                )}
              </div>

              {/* أزرار اتخاذ القرار وإدارة الملاحظات */}
              {canApprove && (
                <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800 text-right">
                  {!showNotesForm && !showRejectForm ? (
                    <div className="flex flex-wrap gap-3">
                       {/* اعتماد الحساب */}
                      {user.status !== "active" && (
                        <Button
                          onClick={() => toggleStatus.mutate({ userId: user.id, status: "active" })}
                          disabled={toggleStatus.isPending}
                          className="bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/30 font-bold gap-2 px-6 rounded-xl transition-all shadow-sm"
                        >
                          {toggleStatus.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>جاري الاعتماد...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4.5 h-4.5" />
                              <span>اعتماد الحساب</span>
                            </>
                          )}
                        </Button>
                      )}

                      {/* رفض الحساب (للحساب قيد المراجعة) */}
                      {user.status === "pending" && (
                        <Button
                          disabled={toggleStatus.isPending}
                          onClick={() => {
                            setShowRejectForm(true);
                            setNotes(user.adminNotes || "");
                          }}
                          className="bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/30 text-rose-600 dark:text-rose-455 border border-red-200/60 dark:border-red-900/30 font-bold gap-2 px-6 rounded-xl transition-all shadow-sm"
                        >
                          <XCircle className="w-4.5 h-4.5" />
                          رفض الحساب
                        </Button>
                      )}

                      {/* إيقاف الحساب (للحساب النشط) */}
                      {user.status === "active" && (
                        <Button
                          onClick={() => toggleStatus.mutate({ userId: user.id, status: "suspended" })}
                          disabled={toggleStatus.isPending}
                          className="bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/30 text-rose-600 dark:text-rose-455 border border-red-200/60 dark:border-red-900/30 font-bold gap-2 px-6 rounded-xl transition-all shadow-sm"
                        >
                          {toggleStatus.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>جاري الإيقاف...</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4.5 h-4.5" />
                              <span>إيقاف الحساب</span>
                            </>
                          )}
                        </Button>
                      )}

                      {/* ذكر ملاحظات لطالب الخدمة أو حالة الانتظار (يظهر فقط للحساب قيد المراجعة) */}
                      {user.status === "pending" && (
                        user.adminNotes ? (
                          <div className="text-xs sm:text-sm font-bold text-amber-600 bg-amber-50/70 dark:bg-amber-955/20 px-4 py-2 rounded-xl border border-amber-200/40 dark:border-amber-900/30 flex items-center gap-1.5 shrink-0">
                            <Clock className="w-4 h-4 animate-pulse" />
                            بانتظار رد طالب الخدمة على المرفق
                          </div>
                        ) : (
                          <Button
                            onClick={() => {
                              setShowNotesForm(true);
                              setNotes(user.adminNotes || "");
                            }}
                            variant="outline"
                            className="font-bold gap-2 px-5 rounded-xl border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            <FileText className="w-4.5 h-4.5" />
                            ذكر ملاحظات لطالب الخدمة
                          </Button>
                        )
                      )}
                    </div>
                  ) : showNotesForm ? (
                    /* نموذج كتابة الملاحظات */
                    <div className="space-y-4 bg-slate-50/50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800 transition-all text-right">
                      {/* اختيار نوع المرفق المطلوب */}
                      <div className="space-y-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                          طريقة الرد المطلوبة من طالب الخدمة
                        </label>
                        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-full">
                          <button
                            type="button"
                            onClick={() => setNotesRequiredType("text")}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                              notesRequiredType === "text"
                                ? "bg-primary text-white shadow-sm"
                                : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                            }`}
                          >
                            رد كتابي (نصي)
                          </button>
                          <button
                            type="button"
                            onClick={() => setNotesRequiredType("file")}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                              notesRequiredType === "file"
                                ? "bg-primary text-white shadow-sm"
                                : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                            }`}
                          >
                            مرفق ملف/صورة (PDF، صور)
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          ملاحظات طالب الخدمة
                        </label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="اكتب الملاحظات لطالب الخدمة"
                          rows={3}
                          className="w-full text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-1 focus:ring-primary focus:border-primary outline-none resize-none transition-all"
                        />
                      </div>

                      <div className="flex gap-2 border-t pt-3">
                        <Button
                          onClick={() => {
                            updateNotes.mutate(
                              { userId: user.id, notes, notesRequiredType },
                              { onSuccess: () => setShowNotesForm(false) }
                            );
                          }}
                          disabled={updateNotes.isPending}
                          className="bg-primary hover:bg-primary/95 text-white font-bold px-5 rounded-xl"
                        >
                          {updateNotes.isPending ? "جاري الإرسال..." : "الارسال لطالب الخدمة"}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setShowNotesForm(false)}
                          className="font-bold px-5 rounded-xl border border-slate-200"
                        >
                          إلغاء
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* نموذج رفض / إيقاف الحساب */
                    <div className="space-y-4 bg-slate-50/50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800 transition-all text-right">
                      {/* اختيار نوع المرفق المطلوب عند الرفض */}
                      {user.status !== "active" && (
                        <div className="space-y-2 pb-3 border-b border-red-100/20 dark:border-red-900/10">
                          <label className="text-xs font-bold text-slate-750 dark:text-slate-300 block">
                            طريقة الرد المطلوبة من المستفيد عند معالجة الرفض
                          </label>
                          <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-full">
                            <button
                              type="button"
                              onClick={() => setNotesRequiredType("text")}
                              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                                notesRequiredType === "text"
                                  ? "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-350 shadow-sm border border-rose-200/20"
                                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                              }`}
                            >
                              رد كتابي (نصي)
                            </button>
                            <button
                              type="button"
                              onClick={() => setNotesRequiredType("file")}
                              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                                notesRequiredType === "file"
                                  ? "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-350 shadow-sm border border-rose-200/20"
                                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                              }`}
                            >
                              مرفق ملف/صورة (PDF، صور)
                            </button>
                            <button
                              type="button"
                              onClick={() => setNotesRequiredType("none")}
                              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                                notesRequiredType === "none"
                                  ? "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-350 shadow-sm border border-rose-200/20"
                                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                              }`}
                            >
                              رفض نهائي (لا يتطلب رد)
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-rose-600 dark:text-rose-455">
                          {user.status === "active" ? "سبب إيقاف الحساب" : "سبب رفض الحساب (ملاحظات الرفض)"}
                        </label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder={user.status === "active" ? "يرجى كتابة سبب إيقاف الحساب بالتفصيل هنا..." : "يرجى كتابة سبب رفض الحساب بالتفصيل هنا..."}
                          rows={3}
                          className="w-full text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-1 focus:ring-rose-300/60 focus:border-rose-300 outline-none resize-none transition-all"
                        />
                      </div>

                      <div className="flex gap-2 border-t pt-3">
                        <Button
                          onClick={() => {
                            if (!notes.trim()) {
                              toast.error(user.status === "active" ? "يرجى كتابة سبب إيقاف الحساب أولاً" : "يرجى كتابة سبب الرفض أولاً");
                              return;
                            }
                            toggleStatus.mutate(
                              { userId: user.id, status: "suspended", notes, notesRequiredType },
                              { onSuccess: () => setShowRejectForm(false) }
                            );
                          }}
                          disabled={toggleStatus.isPending}
                          className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-5 rounded-xl transition-colors gap-2"
                        >
                          {toggleStatus.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>{user.status === "active" ? "جاري الإيقاف..." : "جاري الرفض..."}</span>
                            </>
                          ) : (
                            <span>{user.status === "active" ? "تأكيد إيقاف الحساب" : "تأكيد رفض الحساب"}</span>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setShowRejectForm(false)}
                          className="font-bold px-5 rounded-xl border border-slate-200"
                        >
                          إلغاء
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
                </>
              )}
            </CardContent>
          </Card>

          {/* وثيقة إثبات الصفة */}
          <Card className="border-slate-200/60 dark:border-slate-800 shadow-lg shadow-slate-200/20 dark:shadow-none rounded-2xl flex flex-col overflow-hidden">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 px-6 py-4">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                مستند إثبات الصفة
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex-1 flex flex-col justify-between space-y-4">
              {user.proofDocument ? (
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    {isImageFile ? (
                      <div className="relative border rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900 group aspect-square flex items-center justify-center p-2.5 shadow-inner transition-all hover:border-primary/40">
                        <img
                          src={user.proofDocument}
                          alt="إثبات الصفة"
                          className="max-h-full max-w-full object-contain rounded-lg transition-transform duration-300 group-hover:scale-[1.02]"
                        />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="font-bold gap-1 rounded-lg"
                            onClick={() => setFullscreenUrl(user.proofDocument)}
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                            ملء الشاشة
                          </Button>
                          <a
                            href={user.proofDocument}
                            download
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white text-slate-950 rounded-lg hover:bg-slate-100 transition-all"
                          >
                            <Download className="w-3.5 h-3.5" />
                            تنزيل
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 rounded-xl border border-dashed text-center space-y-3 bg-slate-50 dark:bg-slate-900">
                        <FileText className="w-10 h-10 text-muted-foreground/50 mx-auto" />
                        <div className="space-y-1">
                          <p className="font-semibold text-xs text-foreground">ملف غير صوري (PDF/مستند)</p>
                          <p className="text-[10px] text-muted-foreground">يمكنك تحميله واستعراضه مباشرة</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 pt-2 border-t">
                    <a
                      href={user.proofDocument}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-primary bg-primary/10 rounded-xl hover:bg-primary/20 transition-all"
                    >
                      <FileText className="w-4 h-4" />
                      عرض في نافذة جديدة
                    </a>
                    <a
                      href={user.proofDocument}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                    >
                      <Download className="w-4 h-4" />
                      تحميل الملف
                    </a>
                  </div>
                </div>
              ) : (
                <div className="p-8 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2 bg-slate-50/50 dark:bg-slate-900/10">
                  <XCircle className="w-8 h-8 text-amber-500/70 mx-auto" />
                  <p className="text-xs text-muted-foreground">لم يتم رفع وثيقة إثبات صفة بعد للمستخدم</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* الرد الكتابي للمستفيد */}
          {user.remarksDocument && !isResponseFileType && (
            <Card className="border-slate-200/60 dark:border-slate-800 shadow-lg shadow-slate-200/20 dark:shadow-none rounded-2xl flex flex-col overflow-hidden text-right">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 px-6 py-4">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  الرد الكتابي للمستفيد
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border text-sm font-semibold leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                  {user.remarksDocument}
                </div>
              </CardContent>
            </Card>
          )}

          {/* مرفقات الملاحظة */}
          {user.remarksDocument && isResponseFileType && (
            <Card className="border-slate-200/60 dark:border-slate-800 shadow-lg shadow-slate-200/20 dark:shadow-none rounded-2xl flex flex-col overflow-hidden">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 px-6 py-4">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-500" />
                  مرفقات الملاحظة
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    {isRemarksImage ? (
                      <div className="relative border rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900 group aspect-square flex items-center justify-center p-2.5 shadow-inner transition-all hover:border-amber-500/30">
                        <img
                          src={user.remarksDocument}
                          alt="مرفقات الملاحظة"
                          className="max-h-full max-w-full object-contain rounded-lg transition-transform duration-300 group-hover:scale-[1.02]"
                        />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="font-bold gap-1 rounded-lg"
                            onClick={() => setFullscreenUrl(user.remarksDocument)}
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                            ملء الشاشة
                          </Button>
                          <a
                            href={user.remarksDocument}
                            download
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white text-slate-955 rounded-lg hover:bg-slate-100 transition-all"
                          >
                            <Download className="w-3.5 h-3.5" />
                            تنزيل
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 rounded-xl border border-dashed text-center space-y-3 bg-slate-50 dark:bg-slate-900">
                        <FileText className="w-10 h-10 text-muted-foreground/50 mx-auto" />
                        <div className="space-y-1">
                          <p className="font-semibold text-xs text-foreground">ملف غير صوري (PDF/مستند)</p>
                          <p className="text-[10px] text-muted-foreground">يمكنك تحميله واستعراضه مباشرة</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 pt-2 border-t">
                    <a
                      href={user.remarksDocument}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-amber-600 bg-amber-500/10 rounded-xl hover:bg-amber-500/20 transition-all text-center"
                    >
                      <FileText className="w-4 h-4" />
                      عرض في نافذة جديدة
                    </a>
                    <a
                      href={user.remarksDocument}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-center"
                    >
                      <Download className="w-4 h-4" />
                      تحميل الملف
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* الرد الكتابي للرفض */}
          {user.rejectionResponse && !isRejectionResponseFileType && (
            <Card className="border-slate-200/60 dark:border-slate-800 shadow-lg shadow-slate-200/20 dark:shadow-none rounded-2xl flex flex-col overflow-hidden text-right">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 px-6 py-4">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-rose-500" />
                  رد المستفيد على الرفض (كتابي)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border text-sm font-semibold leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                  {user.rejectionResponse}
                </div>
              </CardContent>
            </Card>
          )}

          {/* مرفقات الرد على الرفض */}
          {user.rejectionResponse && isRejectionResponseFileType && (
            <Card className="border-slate-200/60 dark:border-slate-800 shadow-lg shadow-slate-200/20 dark:shadow-none rounded-2xl flex flex-col overflow-hidden">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 px-6 py-4">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-rose-500" />
                  مرفقات الرد على الرفض
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    {isRejectionResponseImage ? (
                      <div className="relative border rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900 group aspect-square flex items-center justify-center p-2.5 shadow-inner transition-all hover:border-rose-500/30">
                        <img
                          src={user.rejectionResponse}
                          alt="مرفقات الرد على الرفض"
                          className="max-h-full max-w-full object-contain rounded-lg transition-transform duration-300 group-hover:scale-[1.02]"
                        />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="font-bold gap-1 rounded-lg"
                            onClick={() => setFullscreenUrl(user.rejectionResponse)}
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                            ملء الشاشة
                          </Button>
                          <a
                            href={user.rejectionResponse}
                            download
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white text-slate-955 rounded-lg hover:bg-slate-100 transition-all"
                          >
                            <Download className="w-3.5 h-3.5" />
                            تنزيل
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 rounded-xl border border-dashed text-center space-y-3 bg-slate-50 dark:bg-slate-900">
                        <FileText className="w-10 h-10 text-muted-foreground/50 mx-auto" />
                        <div className="space-y-1">
                          <p className="font-semibold text-xs text-foreground">ملف غير صوري (PDF/مستند)</p>
                          <p className="text-[10px] text-muted-foreground">يمكنك تحميله واستعراضه مباشرة</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 pt-2 border-t">
                    <a
                      href={user.rejectionResponse}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-rose-600 bg-rose-500/10 rounded-xl hover:bg-rose-500/20 transition-all text-center"
                    >
                      <FileText className="w-4 h-4" />
                      عرض في نافذة جديدة
                    </a>
                    <a
                      href={user.rejectionResponse}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-center"
                    >
                      <Download className="w-4 h-4" />
                      تحميل الملف
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* مودال العرض ملء الشاشة للمستند المرفق */}
      {fullscreenUrl && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex flex-col justify-between p-4 md:p-6" dir="rtl">
          {/* شريط الأدوات العلوي */}
          <div className="flex items-center justify-between gap-4 text-white">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <span className="text-sm font-bold truncate max-w-[200px] md:max-w-md">
                معاينة المستند: {user.name} ({getRequesterTypeLabel(user.requesterType)})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={fullscreenUrl}
                download
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl text-sm font-bold bg-white/10 hover:bg-white/20 text-white transition-all"
              >
                <Download className="w-4 h-4" />
                تنزيل
              </a>
              <Button
                variant="ghost"
                className="text-white hover:bg-white/10 h-10 w-10 p-0 rounded-xl"
                onClick={() => setFullscreenUrl(null)}
              >
                <Minimize2 className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* المعاينة في المنتصف */}
          <div className="flex-1 flex items-center justify-center overflow-hidden my-4">
            <img
              src={fullscreenUrl}
              alt="المستند المرفق ملء الشاشة"
              className="max-h-full max-w-full object-contain rounded-lg select-none"
            />
          </div>

          {/* شريط الإجراءات السفلي للمشاهد ملء الشاشة */}
          <div className="flex justify-center pt-2">
            <p className="text-xs text-slate-400">
              اضغط على زر الإغلاق أو مفتاح Esc للعودة للتفاصيل
            </p>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
