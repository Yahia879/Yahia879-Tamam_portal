import { useState } from "react";
import { usePermission } from "@/hooks/usePermission";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  Users as UsersIcon, 
  Plus, 
  Search, 
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Shield,
  KeyRound,
  Eye as EyeIcon,
  EyeOff,
} from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { ROLE_LABELS } from "@shared/constants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  suspended: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const statusLabels: Record<string, string> = {
  active: "نشط",
  pending: "قيد الانتظار",
  suspended: "موقوف",
};

export default function Users() {
  const { user: currentUser } = useAuth();
  const hasApprovePermission = usePermission("requesters.approve");
  const canApprove = hasApprovePermission || ["super_admin", "system_admin"].includes(currentUser?.role ?? "");

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // حالة نافذة إعادة تعيين كلمة المرور
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { data: users, isLoading, refetch } = trpc.auth.getAllUsers.useQuery({
    role: roleFilter !== "all" ? roleFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const approveMutation = trpc.auth.approveUser.useMutation({
    onSuccess: () => {
      toast.success("تم اعتماد المستخدم بنجاح");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const suspendMutation = trpc.auth.suspendUser.useMutation({
    onSuccess: () => {
      toast.success("تم إيقاف المستخدم");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resetPasswordMutation = trpc.auth.resetUserPassword.useMutation({
    onSuccess: () => {
      toast.success("تم إعادة تعيين كلمة المرور بنجاح");
      setResetPasswordOpen(false);
      setSelectedUser(null);
      setNewPassword("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleResetPassword = () => {
    if (!selectedUser || !newPassword) return;
    if (newPassword.length < 8) {
      toast.error("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
      return;
    }
    resetPasswordMutation.mutate({
      userId: selectedUser.id,
      newPassword: newPassword,
    });
  };

  const openResetPasswordDialog = (user: any) => {
    setSelectedUser(user);
    setNewPassword("");
    setShowPassword(false);
    setResetPasswordOpen(true);
  };

  // توليد كلمة مرور عشوائية
  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(password);
    setShowPassword(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* العنوان والإجراءات */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">إدارة المستخدمين</h1>
            <p className="text-muted-foreground">إدارة حسابات المستخدمين والصلاحيات</p>
          </div>
          <Button className="gradient-primary text-white" onClick={() => toast.info("قريباً")}>
            <Plus className="w-4 h-4 ml-2" />
            إضافة مستخدم
          </Button>
        </div>

        {/* فلاتر البحث */}
        <Card className="border-0 shadow-sm bg-card">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="البحث عن مستخدم..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pr-10 bg-background text-foreground"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="الدور" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأدوار</SelectItem>
                  {Object.entries(ROLE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="pending">قيد الانتظار</SelectItem>
                  <SelectItem value="suspended">موقوف</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* جدول المستخدمين */}
        <Card className="border-0 shadow-sm bg-card">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-muted-foreground mt-4">جاري التحميل...</p>
              </div>
            ) : users && users.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="border-b border-border">
                      <TableHead className="text-right text-foreground font-semibold">المستخدم</TableHead>
                      <TableHead className="text-right text-foreground font-semibold">البريد الإلكتروني</TableHead>
                      <TableHead className="text-right text-foreground font-semibold">الدور</TableHead>
                      <TableHead className="text-right text-foreground font-semibold">الحالة</TableHead>
                      <TableHead className="text-right text-foreground font-semibold">تاريخ التسجيل</TableHead>
                      <TableHead className="text-right text-foreground font-semibold">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user: any) => (
                      <TableRow key={user.id} className="border-b border-border hover:bg-muted/50">
                        <TableCell className="text-foreground">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border">
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {user.name?.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-foreground">{user.name}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-foreground">{user.email}</TableCell>
                        <TableCell className="text-foreground">
                          <span className="flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            {ROLE_LABELS[user.role] || user.role}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`badge ${statusColors[user.status] || statusColors.pending}`}>
                            {statusLabels[user.status] || "غير محدد"}
                          </span>
                        </TableCell>
                        <TableCell className="text-foreground">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString("ar-SA") : "-"}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <Link href={`/users/${user.id}`}>
                                <DropdownMenuItem className="cursor-pointer">
                                  <Eye className="w-4 h-4 ml-2" />
                                  عرض التفاصيل
                                </DropdownMenuItem>
                              </Link>
                              <DropdownMenuItem className="cursor-pointer" onClick={() => toast.info("قريباً")}>
                                <Edit className="w-4 h-4 ml-2" />
                                تعديل
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="cursor-pointer text-blue-600"
                                onClick={() => openResetPasswordDialog(user)}
                              >
                                <KeyRound className="w-4 h-4 ml-2" />
                                إعادة تعيين كلمة المرور
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {user.status === "pending" && canApprove && (
                                <DropdownMenuItem 
                                  className="cursor-pointer text-green-600"
                                  onClick={() => approveMutation.mutate({ userId: user.id })}
                                >
                                  <CheckCircle className="w-4 h-4 ml-2" />
                                  اعتماد
                                </DropdownMenuItem>
                              )}
                              {user.status === "active" && canApprove && (
                                <DropdownMenuItem 
                                  className="cursor-pointer text-destructive"
                                  onClick={() => suspendMutation.mutate({ userId: user.id })}
                                >
                                  <XCircle className="w-4 h-4 ml-2" />
                                  إيقاف
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="p-8 text-center">
                <UsersIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">لا يوجد مستخدمون</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* نافذة إعادة تعيين كلمة المرور */}
      <Dialog open={resetPasswordOpen} onOpenChange={setResetPasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" />
              إعادة تعيين كلمة المرور
            </DialogTitle>
            <DialogDescription>
              إعادة تعيين كلمة المرور للمستخدم: <strong>{selectedUser?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور الجديدة"
                  className="pl-10"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                يجب أن تكون كلمة المرور 8 أحرف على الأقل
              </p>
            </div>
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={generateRandomPassword}
              className="w-full"
            >
              توليد كلمة مرور عشوائية
            </Button>
            {newPassword && showPassword && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">كلمة المرور الجديدة:</p>
                <p className="font-mono text-sm select-all" dir="ltr">{newPassword}</p>
                <p className="text-xs text-amber-600 mt-2">
                  تأكد من نسخ كلمة المرور وإرسالها للمستخدم بطريقة آمنة
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setResetPasswordOpen(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={handleResetPassword}
              disabled={!newPassword || newPassword.length < 8 || resetPasswordMutation.isPending}
              className="gradient-primary text-white"
            >
              {resetPasswordMutation.isPending ? "جاري الحفظ..." : "حفظ كلمة المرور"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
