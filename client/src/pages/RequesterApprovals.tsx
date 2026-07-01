import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { usePermission } from "@/hooks/usePermission";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckSquare,
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Eye,
  FileText,
  MapPin,
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  X,
  Download,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

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

export default function RequesterApprovals() {
  const { user: currentUser } = useAuth();
  const [, navigate] = useLocation();
  const hasApprovePermission = usePermission("requesters.approve");
  const hasViewPermission = usePermission("requesters.view");
  const canApprove = hasApprovePermission;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [confirmAction, setConfirmAction] = useState<{
    userId: number;
    name: string;
    action: "active" | "suspended";
  } | null>(null);

  const [activeTab, setActiveTab] = useState<'requests' | 'exceptions'>('requests');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { data: exceptionRequests = [], refetch: refetchExceptions } = trpc.requests.getExceptionRequests.useQuery(undefined, {
    enabled: hasViewPermission || hasApprovePermission
  });

  const reviewExceptionMutation = trpc.requests.reviewException.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث حالة طلب الاستثناء بنجاح");
      refetchExceptions();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء مراجعة طلب الاستثناء");
    }
  });

  const pendingExceptionsCount = exceptionRequests.filter(e => e.exception.status === "pending").length;

  const { data: usersResponse, isLoading, refetch } = trpc.users.getAll.useQuery({
    role: "service_requester",
    limit: 100, // جلب كمية كافية للمراجعة
  });
  const toggleStatus = trpc.users.toggleStatus.useMutation({
    onSuccess: () => {
      toast.success(
        confirmAction?.action === "active"
          ? "تم اعتماد الحساب بنجاح"
          : "تم إيقاف الحساب بنجاح"
      );
      refetch();
      setConfirmAction(null);
    },
    onError: () => {
      toast.error("حدث خطأ أثناء تحديث الحساب");
    },
  });

  // فلترة طالبي الخدمة فقط من النتائج
  const requesters = usersResponse?.items || [];

  // تطبيق الفلاتر المحلية (للبحث والحالة)
  const filtered = requesters.filter(u => {
    const matchSearch =
      !search ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.phone?.includes(search);
    const matchStatus = statusFilter === "all" || u.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // إحصائيات
  const stats = {
    total: requesters.length,
    pending: requesters.filter(u => u.status === "pending").length,
    active: requesters.filter(u => u.status === "active").length,
    suspended: requesters.filter(u => u.status === "suspended").length,
  };

  const handleAction = (userId: number, name: string, action: "active" | "suspended") => {
    setConfirmAction({ userId, name, action });
  };

  const confirmToggle = () => {
    if (!confirmAction) return;
    toggleStatus.mutate({ userId: confirmAction.userId, status: confirmAction.action });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl px-4 sm:px-0">
        {/* رأس الصفحة */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <CheckSquare className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">حسابات طالبي الخدمة</h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
              إدارة حسابات طالبي الخدمة ومراجعتها
            </p>
          </div>
        </div>

        {/* بطاقات الإحصائيات */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Card className="border-0 shadow-sm transition-all hover:shadow-md">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col xs:flex-row items-start xs:items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">الإجمالي</p>
                  <p className="text-lg sm:text-xl font-bold text-foreground leading-tight">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm transition-all hover:shadow-md">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col xs:flex-row items-start xs:items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">قيد المراجعة</p>
                  <p className="text-lg sm:text-xl font-bold text-amber-600 leading-tight">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm transition-all hover:shadow-md">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col xs:flex-row items-start xs:items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">معتمد</p>
                  <p className="text-lg sm:text-xl font-bold text-green-600 leading-tight">{stats.active}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm transition-all hover:shadow-md">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col xs:flex-row items-start xs:items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                  <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">موقوف</p>
                  <p className="text-lg sm:text-xl font-bold text-red-600 leading-tight">{stats.suspended}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* التبويبات */}
        <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} dir="rtl" className="w-full">
          <div className="flex justify-center w-full mb-6">
            <TabsList className="bg-muted/60 p-1.5 inline-flex w-fit h-auto border shadow-sm whitespace-nowrap">
              <TabsTrigger 
                value="requests" 
                className="gap-2 px-4 sm:px-8 py-3 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-md transition-all rounded-md flex-shrink-0 focus:outline-none"
              >
                <CheckSquare className="h-4 w-4" />
                طلبات تسجيل الحسابات
              </TabsTrigger>
              <TabsTrigger 
                value="exceptions" 
                className="gap-2 px-4 sm:px-8 py-3 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-md transition-all rounded-md flex-shrink-0 focus:outline-none"
              >
                <FileText className="h-4 w-4" />
                <span>طلبات الاستثناء</span>
                {pendingExceptionsCount > 0 && (
                  <span className="bg-red-500 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                    {pendingExceptionsCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>
        </Tabs>

        {activeTab === 'requests' ? (
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader className="p-4 sm:p-6 pb-4">
              <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
                <div>
                  <CardTitle className="text-base sm:text-lg">قائمة الحسابات</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    {filtered.length} حساب {statusFilter !== "all" ? `(${statusConfig[statusFilter]?.label ?? statusFilter})` : ""}
                  </CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                  <div className="relative flex-1 lg:w-72">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="بحث بالاسم أو البريد أو الهاتف..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="pr-9 text-xs sm:text-sm h-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-40 text-xs sm:text-sm h-10">
                      <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4" />
                        <SelectValue placeholder="الحالة" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الحالات</SelectItem>
                      <SelectItem value="pending">قيد المراجعة</SelectItem>
                      <SelectItem value="active">معتمد</SelectItem>
                      <SelectItem value="suspended">موقوف</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                  <p className="text-muted-foreground text-sm animate-pulse">جاري تحميل البيانات...</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 sm:py-24 gap-4 px-6 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                    <Users className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">لا توجد حسابات مطابقة</p>
                    <p className="text-muted-foreground text-sm">حاول تغيير معايير البحث أو الفلترة</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Desktop View */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-right">الاسم</TableHead>
                          <TableHead className="text-right">البريد الإلكتروني</TableHead>
                          <TableHead className="text-right">الهاتف</TableHead>
                          <TableHead className="text-right whitespace-nowrap">تاريخ التسجيل</TableHead>
                          <TableHead className="text-right">الحالة</TableHead>
                          <TableHead className="text-left">الإجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map(user => {
                          const statusInfo = statusConfig[user.status ?? "pending"];
                          const StatusIcon = statusInfo?.icon ?? Clock;
                          return (
                            <TableRow key={user.id} className="hover:bg-muted/20 transition-colors">
                              <TableCell className="font-medium">{user.name ?? "—"}</TableCell>
                              <TableCell className="text-muted-foreground text-sm">{user.email ?? "—"}</TableCell>
                              <TableCell className="text-muted-foreground text-sm">{user.phone ?? "—"}</TableCell>
                              <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString("ar-SA") : "—"}
                              </TableCell>
                              <TableCell>
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${statusInfo?.color ?? ""}`}>
                                  <StatusIcon className="w-3 h-3" />
                                  {statusInfo?.label ?? user.status}
                                </span>
                              </TableCell>
                              <TableCell className="text-left">
                                <div className="flex gap-2 justify-end">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs font-bold gap-1"
                                    onClick={() => navigate("/requester-approvals/" + user.id)}
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    التفاصيل
                                  </Button>
                                  {canApprove && (
                                    <>
                                      {user.status !== "active" && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-8 text-xs text-green-600 border-green-200 hover:bg-green-50 dark:hover:bg-green-950/30 font-bold"
                                          onClick={() => handleAction(user.id, user.name ?? "المستخدم", "active")}
                                        >
                                          <CheckCircle2 className="w-3.5 h-3.5 ml-1" />
                                          اعتماد
                                        </Button>
                                      )}
                                      {user.status === "active" && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/30 font-bold"
                                          onClick={() => handleAction(user.id, user.name ?? "المستخدم", "suspended")}
                                        >
                                          <XCircle className="w-3.5 h-3.5 ml-1" />
                                          إيقاف
                                        </Button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
  
                  {/* Mobile View */}
                  <div className="md:hidden divide-y">
                    {filtered.map(user => {
                      const statusInfo = statusConfig[user.status ?? "pending"];
                      const StatusIcon = statusInfo?.icon ?? Clock;
                      return (
                        <div key={user.id} className="p-4 space-y-3">
                          <div className="flex justify-between items-start gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-foreground truncate">{user.name ?? "—"}</p>
                              <p className="text-xs text-muted-foreground truncate">{user.email ?? "—"}</p>
                            </div>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${statusInfo?.color ?? ""}`}>
                              <StatusIcon className="w-2.5 h-2.5" />
                              {statusInfo?.label ?? user.status}
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground py-2 border-y border-dashed">
                            <div className="flex items-center gap-1.5">
                              <Users className="w-3 h-3" />
                              <span>{user.phone ?? "—"}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3 h-3" />
                              <span>{user.createdAt ? new Date(user.createdAt).toLocaleDateString("ar-SA") : "—"}</span>
                            </div>
                          </div>
  
                          <div className="pt-1 flex flex-col sm:flex-row gap-2">
                            <Button
                              variant="outline"
                              className="w-full h-9 font-bold gap-2 rounded-lg transition-all"
                              onClick={() => navigate("/requester-approvals/" + user.id)}
                            >
                              <Eye className="w-4 h-4" />
                              عرض التفاصيل
                            </Button>
                            {canApprove && (
                              <>
                                {user.status !== "active" && (
                                  <Button
                                    className="w-full h-9 bg-green-600 hover:bg-green-700 text-white font-bold gap-2 rounded-lg transition-all"
                                    onClick={() => handleAction(user.id, user.name ?? "المستخدم", "active")}
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                    اعتماد الحساب
                                  </Button>
                                )}
                                {user.status === "active" && (
                                  <Button
                                    variant="outline"
                                    className="w-full h-9 text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/30 font-bold gap-2 rounded-lg transition-all"
                                    onClick={() => handleAction(user.id, user.name ?? "المستخدم", "suspended")}
                                  >
                                    <XCircle className="w-4 h-4" />
                                    إيقاف الحساب
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-sm overflow-hidden animate-in fade-in-50 duration-200">
            <CardHeader className="p-4 sm:p-6 pb-4">
              <div>
                <CardTitle className="text-base sm:text-lg">طلبات الاستثناء المرفوعة</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  مراجعة طلبات استثناء الأئمة لتقديم طلبات جديدة بالرغم من وجود طلبات سابقة معلقة.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="text-right">اسم الإمام</TableHead>
                      <TableHead className="text-right">التاريخ</TableHead>
                      <TableHead className="text-right">سبب الاستثناء</TableHead>
                      <TableHead className="text-right">المرفق</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-left pl-6">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exceptionRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-16 text-muted-foreground text-xs sm:text-sm">
                          لا توجد طلبات استثناء مرفوعة حالياً.
                        </TableCell>
                      </TableRow>
                    ) : (
                      exceptionRequests.map(({ exception, userName, userEmail, userPhone }) => {
                        const isPending = exception.status === "pending";
                        const attachmentUrl = exception.attachment 
                          ? (exception.attachment.startsWith("http") ? exception.attachment : `${window.location.origin}${exception.attachment}`) 
                          : "";

                        return (
                          <TableRow key={exception.id} className="hover:bg-muted/15 transition-colors">
                            <TableCell className="py-4 pr-6">
                              <div className="flex flex-col gap-1 text-right">
                                <span className="font-extrabold text-sm sm:text-base text-slate-800 dark:text-slate-200">
                                  {userName}
                                </span>
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                                  <span className="inline-flex items-center gap-1">
                                    <Phone className="w-3.5 h-3.5 text-primary/70" />
                                    <span className="font-semibold">{userPhone || "—"}</span>
                                  </span>
                                  <span className="text-slate-300 dark:text-slate-700">|</span>
                                  <span className="inline-flex items-center gap-1">
                                    <Mail className="w-3.5 h-3.5 text-primary/70" />
                                    <span>{userEmail || "—"}</span>
                                  </span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm whitespace-nowrap text-right py-4">
                              {exception.createdAt ? new Date(exception.createdAt).toLocaleDateString("ar-SA") : "—"}
                            </TableCell>
                            <TableCell className="py-4 text-right max-w-xs">
                              <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-355 whitespace-pre-wrap leading-relaxed">
                                {exception.reason}
                              </p>
                            </TableCell>
                            <TableCell className="py-4">
                              {exception.attachment ? (
                                <button 
                                  onClick={() => setPreviewUrl(attachmentUrl)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary transition-all text-xs font-bold w-fit cursor-pointer"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>عرض المرفق</span>
                                </button>
                              ) : (
                                <span className="text-muted-foreground text-xs">لا يوجد مرفق</span>
                              )}
                            </TableCell>
                            <TableCell className="py-4">
                              {exception.status === "pending" && (
                                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-0 font-bold px-2.5 py-1">قيد الانتظار</Badge>
                              )}
                              {exception.status === "approved" && (
                                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-0 font-bold px-2.5 py-1">مقبول</Badge>
                              )}
                              {exception.status === "rejected" && (
                                <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-0 font-bold px-2.5 py-1">مرفوض</Badge>
                              )}
                            </TableCell>
                            <TableCell className="py-4 pl-6 text-left">
                              {canApprove ? (
                                isPending ? (
                                  <div className="flex gap-2 justify-end">
                                    <Button 
                                      size="sm" 
                                      className="bg-green-600 hover:bg-green-700 text-white font-bold h-8.5 rounded-lg text-xs px-3.5"
                                      onClick={() => reviewExceptionMutation.mutate({ id: exception.id, status: 'approved' })}
                                      disabled={reviewExceptionMutation.isPending}
                                    >
                                      قبول
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="destructive"
                                      className="font-bold h-8.5 rounded-lg text-xs px-3.5"
                                      onClick={() => reviewExceptionMutation.mutate({ id: exception.id, status: 'rejected' })}
                                      disabled={reviewExceptionMutation.isPending}
                                    >
                                      رفض
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-xs font-semibold">تمت المراجعة</span>
                                )
                              ) : (
                                <span className="text-muted-foreground text-xs font-semibold">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>



      {/* نافذة تأكيد الإجراء */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent className="w-[90vw] max-w-md rounded-2xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right text-lg">
              {confirmAction?.action === "active" ? "تأكيد اعتماد الحساب" : "تأكيد إيقاف الحساب"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-right text-sm">
              {confirmAction?.action === "active"
                ? `هل تريد اعتماد حساب "${confirmAction?.name}"؟ سيتمكن من الدخول للبوابة وتقديم الطلبات.`
                : `هل تريد إيقاف حساب "${confirmAction?.name}"؟ لن يتمكن من الدخول للبوابة.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col-reverse sm:flex-row-reverse gap-2 mt-6">
            <AlertDialogAction
              onClick={confirmToggle}
              className={`w-full sm:w-auto font-bold ${confirmAction?.action === "active" ? "bg-green-600 hover:bg-green-700 text-white" : "bg-red-600 hover:bg-red-700 text-white"}`}
            >
              {confirmAction?.action === "active" ? "نعم، اعتماد" : "نعم، إيقاف"}
            </AlertDialogAction>
            <AlertDialogCancel className="w-full sm:w-auto mt-0 font-medium">إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* نافذة معاينة الصور الفاخرة (Lightbox Modal) */}
      {previewUrl && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewUrl(null)}
        >
          <div 
            className="relative max-w-5xl w-full h-[90vh] flex flex-col items-center bg-slate-900/95 border border-slate-800 rounded-2xl p-2 sm:p-4 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button 
              onClick={() => setPreviewUrl(null)}
              className="absolute top-4 right-4 bg-slate-800/85 hover:bg-red-600/85 text-white rounded-full p-2.5 transition-all z-10 shadow-lg cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Download button */}
            <button 
              onClick={() => {
                if (!previewUrl) return;
                const link = document.createElement("a");
                link.href = previewUrl;
                link.download = previewUrl.split("/").pop() || "attachment";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="absolute top-4 left-4 bg-slate-800/85 hover:bg-primary/85 text-white rounded-full p-2.5 transition-all flex items-center gap-1.5 px-4 z-10 shadow-lg cursor-pointer"
              title="تحميل"
            >
              <Download className="w-4 h-4" />
              <span className="text-xs font-bold hidden sm:inline">تحميل</span>
            </button>

            {/* Document/Image container */}
            <div className="w-full flex-1 flex items-center justify-center p-2 overflow-hidden mt-12 mb-2 min-h-[50vh]">
              {/\.(pdf)$/i.test(previewUrl) ? (
                <iframe 
                  src={previewUrl} 
                  title="معاينة المستند" 
                  className="w-full h-full border border-slate-800 rounded-lg bg-white shadow-lg"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center overflow-auto">
                  <img 
                    src={previewUrl} 
                    alt="معاينة المرفق" 
                    className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-md border border-slate-800 bg-white"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
