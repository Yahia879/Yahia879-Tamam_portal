import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
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
import { CheckSquare, Users, Search, CheckCircle2, XCircle, Clock, Filter } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: "قيد المراجعة", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400", icon: Clock },
  active: { label: "مُعتمد", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle2 },
  suspended: { label: "موقوف", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", icon: XCircle },
  blocked: { label: "محظور", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400", icon: XCircle },
};

export default function RequesterApprovals() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [confirmAction, setConfirmAction] = useState<{
    userId: number;
    name: string;
    action: "active" | "suspended";
  } | null>(null);

  const { data: allUsers, isLoading, refetch } = trpc.users.getAll.useQuery();
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

  // فلترة طالبي الخدمة فقط
  const requesters = (allUsers ?? []).filter(u => u.role === "service_requester");

  // تطبيق الفلاتر
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
      <div className="space-y-6 max-w-6xl">
        {/* رأس الصفحة */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <CheckSquare className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">حسابات طالبي الخدمة</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              إدارة حسابات طالبي الخدمة ومراجعتها
            </p>
          </div>
        </div>

        {/* بطاقات الإحصائيات */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">الإجمالي</p>
                  <p className="text-xl font-bold text-foreground">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">قيد المراجعة</p>
                  <p className="text-xl font-bold text-amber-600">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">معتمد</p>
                  <p className="text-xl font-bold text-green-600">{stats.active}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">موقوف</p>
                  <p className="text-xl font-bold text-red-600">{stats.suspended}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* الجدول */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div>
                <CardTitle className="text-base">قائمة الحسابات</CardTitle>
                <CardDescription>
                  {filtered.length} حساب {statusFilter !== "all" ? `(${statusConfig[statusFilter]?.label ?? statusFilter})` : ""}
                </CardDescription>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث بالاسم أو البريد أو الهاتف..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pr-9 text-sm"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36 text-sm">
                    <Filter className="w-4 h-4 ml-1" />
                    <SelectValue placeholder="الحالة" />
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
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                  <Users className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm">لا توجد حسابات مطابقة</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-right">الاسم</TableHead>
                    <TableHead className="text-right">البريد الإلكتروني</TableHead>
                    <TableHead className="text-right">الهاتف</TableHead>
                    <TableHead className="text-right">تاريخ التسجيل</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(user => {
                    const statusInfo = statusConfig[user.status ?? "pending"];
                    const StatusIcon = statusInfo?.icon ?? Clock;
                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{user.email ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{user.phone ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString("ar-SA") : "—"}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo?.color ?? ""}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusInfo?.label ?? user.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {user.status !== "active" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-green-600 border-green-200 hover:bg-green-50 dark:hover:bg-green-950/30"
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
                                className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/30"
                                onClick={() => handleAction(user.id, user.name ?? "المستخدم", "suspended")}
                              >
                                <XCircle className="w-3.5 h-3.5 ml-1" />
                                إيقاف
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* نافذة تأكيد الإجراء */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.action === "active" ? "تأكيد اعتماد الحساب" : "تأكيد إيقاف الحساب"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.action === "active"
                ? `هل تريد اعتماد حساب "${confirmAction?.name}"؟ سيتمكن من الدخول للبوابة وتقديم الطلبات.`
                : `هل تريد إيقاف حساب "${confirmAction?.name}"؟ لن يتمكن من الدخول للبوابة.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmToggle}
              className={confirmAction?.action === "active" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
            >
              {confirmAction?.action === "active" ? "اعتماد" : "إيقاف"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
