import { useState, useEffect } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  Search,
  MoreVertical,
  UserCheck,
  UserX,
  Edit,
  Trash2,
  UserPlus,
  Loader2,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

const ROLE_OPTIONS = [
  { value: "system_admin", label: "مدير نظام" },
  { value: "financial_manager", label: "المدير المالي" },
  { value: "projects_office", label: "مكتب المشاريع" },
  { value: "field_team", label: "فريق ميداني" },
  { value: "quick_response", label: "استجابة سريعة" },
  { value: "financial", label: "مالية" },
  { value: "project_manager", label: "مدير مشروع" },
  { value: "corporate_comm", label: "علاقات مؤسسية" },
];

export interface UsersTabProps {
  openAddModal: boolean;
  setOpenAddModal: (open: boolean) => void;
}

export default function UsersTab({ openAddModal, setOpenAddModal }: UsersTabProps) {
  const { user: currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "projects_office",
    status: "active",
    roleIds: [] as string[],
  });

  const { data: usersData, isLoading, isPlaceholderData, refetch } = trpc.users.getAll.useQuery({
    page,
    limit,
    search: searchQuery,
  }, {
    placeholderData: (previousData) => previousData,
  });

  const users = usersData?.items || [];
  const totalCount = usersData?.totalCount || 0;
  const totalPages = usersData?.totalPages || 1;

  const { data: customRoles } = trpc.permissions.getRoles.useQuery();

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const createUser = trpc.users.create.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء الحساب بنجاح");
      setOpenAddModal(false);
      resetForm();
      refetch();
    },
    onError: (error: any) => {
      let errorMessage = "فشل إنشاء الحساب";
      try {
        const parsedError = JSON.parse(error.message);
        if (Array.isArray(parsedError)) {
          errorMessage = parsedError.map((err: any) => err.message).join("، ");
        } else {
          errorMessage = error.message;
        }
      } catch (e) {
        errorMessage = error.message || "فشل إنشاء الحساب";
      }
      toast.error(errorMessage);
    },
  });

  const toggleStatus = trpc.users.toggleStatus.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث حالة المستخدم");
      refetch();
    },
    onError: (error: any) => {
      toast.error(`خطأ: ${error.message}`);
    },
  });

  const deleteUser = trpc.users.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف المستخدم");
      refetch();
    },
    onError: (error: any) => {
      toast.error(`خطأ: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      phone: "",
      role: "projects_office",
      status: "active",
      roleIds: [],
    });
    setShowPassword(false);
  };

  const handleCreateUser = () => {
    if (!formData.name || !formData.email || !formData.password) {
      toast.error("يرجى تعبئة الحقول المطلوبة (الاسم، البريد، كلمة المرور)");
      return;
    }
    createUser.mutate({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      phone: formData.phone || undefined,
      role: formData.role as any,
      status: formData.status as any,
      roleIds: formData.roleIds.length > 0 ? formData.roleIds : undefined,
    });
  };

  const handleToggleStatus = (userId: number, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    toggleStatus.mutate({ userId, status: newStatus as any });
  };

  const handleDelete = (userId: number, userName: string) => {
    if (confirm(`هل أنت متأكد من حذف المستخدم "${userName}"؟`)) {
      deleteUser.mutate({ id: userId });
    }
  };

  const toggleRoleId = (roleId: string) => {
    setFormData((prev) => {
      const newRoleIds = prev.roleIds.includes(roleId)
        ? prev.roleIds.filter((id) => id !== roleId)
        : [roleId]; // دور مخصص واحد فقط
      return {
        ...prev,
        role: newRoleIds.length > 0 ? "" : prev.role, // إلغاء الدور الأساسي عند اختيار مخصص
        roleIds: newRoleIds,
      };
    });
  };

  // تصفية الأدوار المخصصة فقط (غير النظامية)
  const filteredCustomRoles = customRoles?.filter(
    (r: any) => !r.isSystem && r.id !== 'service_requester'
  ) || [];

  const getRoleBadge = (role: string) => {
    const roleMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      super_admin: { label: "المدير العام", variant: "default" },
      system_admin: { label: "مدير نظام", variant: "default" },
      financial_manager: { label: "المدير المالي", variant: "default" },
      projects_office: { label: "مكتب المشاريع", variant: "secondary" },
      field_team: { label: "فريق ميداني", variant: "secondary" },
      quick_response: { label: "استجابة سريعة", variant: "secondary" },
      financial: { label: "مالية", variant: "secondary" },
      project_manager: { label: "مدير مشروع", variant: "secondary" },
      corporate_comm: { label: "علاقات مؤسسية", variant: "secondary" },
      service_requester: { label: "طالب خدمة", variant: "outline" },
    };
    const config = roleMap[role] || { label: role, variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      active: { label: "نشط", className: "bg-green-100 text-green-800 border-green-200" },
      pending: { label: "قيد المراجعة", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
      suspended: { label: "موقوف", className: "bg-red-100 text-red-800 border-red-200" },
      blocked: { label: "محظور", className: "bg-gray-100 text-gray-800 border-gray-200" },
    };
    const config = statusMap[status] || { label: status, className: "" };
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  };



  if (isLoading && !isPlaceholderData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">جاري تحميل قائمة الموظفين...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="text-2xl font-bold">{totalCount}</div>
          <div className="text-sm text-muted-foreground">إجمالي الموظفين</div>
        </Card>
        <Card className="p-6">
          <div className="text-2xl font-bold text-green-600">
            {/* ملاحظة: هذا العدد يجب أن يأتي من الخلفية أيضاً ليكون دقيقاً مع التقسيم */}
            {usersData?.activeCount ?? "..."}
          </div>
          <div className="text-sm text-muted-foreground">الحسابات النشطة</div>
        </Card>
        <Card className="p-6">
          <div className="text-2xl font-bold text-red-600">
            {usersData?.suspendedCount ?? "..."}
          </div>
          <div className="text-sm text-muted-foreground">الحسابات الموقوفة</div>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="ابحث عن مستخدم بالاسم أو البريد..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Users Table */}
      <Card className="relative overflow-hidden">
        {isLoading && isPlaceholderData && (
          <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">الاسم</TableHead>
              <TableHead className="text-right">البريد الإلكتروني</TableHead>
              <TableHead className="text-right">الدور</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
              <TableHead className="text-right">تاريخ الإنشاء</TableHead>
              <TableHead className="text-left">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  {searchQuery ? "لا توجد نتائج للبحث" : "لا يوجد موظفون مسجلون بعد"}
                </TableCell>
              </TableRow>
            ) : (
              users.map((user: any) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <Link href={`/users/${user.id}`} className="hover:text-primary hover:underline cursor-pointer">
                      {user.name}
                    </Link>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>{getStatusBadge(user.status)}</TableCell>
                  <TableCell>
                    {new Date(user.createdAt).toLocaleDateString("ar-SA")}
                  </TableCell>
                  <TableCell className="text-left">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/users/${user.id}/edit`}>
                            <Edit className="ml-2 h-4 w-4" />
                            تعديل البيانات
                          </Link>
                        </DropdownMenuItem>
                        {user.id !== currentUser?.id && (
                          <DropdownMenuItem onClick={() => handleToggleStatus(user.id, user.status)}>
                            {user.status === "active" ? (
                              <><UserX className="ml-2 h-4 w-4" />إيقاف الحساب</>
                            ) : (
                              <><UserCheck className="ml-2 h-4 w-4" />تنشيط الحساب</>
                            )}
                          </DropdownMenuItem>
                        )}
                        {user.id !== currentUser?.id && (
                          <DropdownMenuItem
                            onClick={() => handleDelete(user.id, user.name)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="ml-2 h-4 w-4" />
                            حذف
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination UI */}
        {totalPages > 1 && (
          <div className="py-4 border-t">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="gap-1"
                  >
                    <ChevronRight className="h-4 w-4" />
                    السابق
                  </Button>
                </PaginationItem>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                  // إظهار الصفحات القريبة من الصفحة الحالية فقط إذا كان العدد كبيراً
                  if (totalPages > 7) {
                    if (p !== 1 && p !== totalPages && Math.abs(p - page) > 1) {
                      if (p === 2 || p === totalPages - 1) return <PaginationItem key={p}><PaginationEllipsis /></PaginationItem>;
                      return null;
                    }
                  }
                  
                  return (
                    <PaginationItem key={p}>
                      <PaginationLink
                        onClick={() => setPage(p)}
                        isActive={page === p}
                        className="cursor-pointer"
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}

                <PaginationItem>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="gap-1"
                  >
                    التالي
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </Card>

      {/* Add User Dialog */}
      <Dialog
        open={openAddModal}
        onOpenChange={(open) => {
          setOpenAddModal(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              إضافة مستخدم جديد
            </DialogTitle>
            <DialogDescription>
              أدخل بيانات الموظف الجديد وحدد صلاحياته
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Basic Info */}
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
                البيانات الأساسية والصلاحيات
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="new-name">
                    الاسم الكامل <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="new-name"
                    placeholder="أدخل الاسم الكامل"
                    value={formData.name}
                    onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-email">
                    البريد الإلكتروني <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="new-email"
                    type="email"
                    placeholder="example@domain.com"
                    dir="ltr"
                    value={formData.email}
                    onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-password">
                    كلمة المرور <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="6 أحرف على الأقل"
                      dir="ltr"
                      value={formData.password}
                      onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-phone">رقم الجوال</Label>
                  <Input
                    id="new-phone"
                    placeholder="05xxxxxxxx"
                    dir="ltr"
                    value={formData.phone}
                    onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>الدور الوظيفي</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(v) => setFormData((p) => ({ ...p, role: v, roleIds: [] }))}
                    disabled={formData.roleIds.length > 0}
                  >
                    <SelectTrigger className={formData.roleIds.length > 0 ? "opacity-40" : ""}>
                      <SelectValue placeholder="اختر الدور" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.roleIds.length > 0 && (
                    <p className="text-xs text-amber-600">تم تعطيل هذا الحقل لأنه تم اختيار دور مخصص</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>حالة الحساب</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(v) => setFormData((p) => ({ ...p, status: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الحالة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">نشط</SelectItem>
                      <SelectItem value="suspended">موقوف</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Custom Roles */}
            {filteredCustomRoles.length > 0 && (
              <div className={formData.role ? "opacity-50" : ""}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    أو اختر دوراً مخصصاً
                  </h3>
                  {formData.role && (
                    <p className="text-xs text-amber-600">أزِل الدور الأساسي أولاً لتفعيل هذا القسم</p>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 border rounded-lg p-3 bg-muted/30">
                  {filteredCustomRoles.map((role: any) => (
                    <label
                      key={role.id}
                      htmlFor={`custom-role-${role.id}`}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all select-none ${
                        formData.roleIds.includes(role.id)
                          ? "bg-primary/5 border-primary/30"
                          : "bg-background hover:bg-muted/50 border-transparent"
                      } ${formData.role ? "pointer-events-none" : ""}`}
                    >
                      <Checkbox
                        id={`custom-role-${role.id}`}
                        checked={formData.roleIds.includes(role.id)}
                        onCheckedChange={() => toggleRoleId(role.id)}
                        disabled={!!formData.role}
                        className="pointer-events-none"
                      />
                      <span className="text-sm font-medium truncate">{role.nameAr}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 flex-row-reverse">
            <Button
              onClick={handleCreateUser}
              disabled={createUser.isPending}
              className="gradient-primary text-white"
            >
              {createUser.isPending ? (
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4 ml-2" />
              )}
              إنشاء الحساب
            </Button>
            <Button
              variant="outline"
              onClick={() => { setOpenAddModal(false); resetForm(); }}
              disabled={createUser.isPending}
            >
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
